import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { AI_MENU_BUCKET } from "./ai-menu-constants.ts";
import {
  buildExtractMenuUserPrompt,
  EXTRACT_MENU_SYSTEM_PROMPT,
} from "./ai-prompts/v1/extract-menu.ts";
import {
  bytesToBase64,
  callOpenAiChat,
  estimateOpenAiCostUsd,
} from "./ai-openai.ts";
import {
  normalizeExtractedMenuJson,
  parseExtractedMenuResponse,
  summarizeExtractedMenu,
  validateExtractedMenuJson,
  type ExtractedMenuJson,
} from "./ai-menu-schema.ts";

const EXTRACT_MODEL = Deno.env.get("AI_MODEL_MENU_EXTRACTION") || "gpt-4o";

type MenuUploadRow = {
  id: string;
  business_id: string;
  storage_path: string;
  file_name: string;
  file_type: string;
  status: string;
};

function isAssistantEnabled(): boolean {
  const flag = (Deno.env.get("AI_ASSISTANT_ENABLED") || "true").toLowerCase();
  return flag !== "false" && flag !== "0";
}

function buildUserContent(
  fileName: string,
  mimeType: string,
  fileBytes: Uint8Array,
) {
  const base64 = bytesToBase64(fileBytes);
  const prompt = buildExtractMenuUserPrompt(fileName);

  if (mimeType === "application/pdf") {
    return [
      { type: "text" as const, text: prompt },
      {
        type: "file" as const,
        file: {
          filename: fileName.endsWith(".pdf") ? fileName : "menu.pdf",
          file_data: `data:application/pdf;base64,${base64}`,
        },
      },
    ];
  }

  return [
    { type: "text" as const, text: prompt },
    {
      type: "image_url" as const,
      image_url: {
        url: `data:${mimeType};base64,${base64}`,
        detail: "high" as const,
      },
    },
  ];
}

async function runOpenAiExtraction(
  upload: MenuUploadRow,
  fileBytes: Uint8Array,
): Promise<{ extracted: ExtractedMenuJson; summary: string; model: string; usage: { prompt_tokens: number; completion_tokens: number }; durationMs: number }> {
  const started = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await callOpenAiChat({
        model: EXTRACT_MODEL,
        jsonMode: true,
        timeoutMs: 90_000,
        messages: [
          { role: "system", content: EXTRACT_MENU_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildUserContent(upload.file_name, upload.file_type, fileBytes),
          },
        ],
      });

      const extracted = parseExtractedMenuResponse(result.content);
      return {
        extracted,
        summary: summarizeExtractedMenu(extracted),
        model: result.model,
        usage: result.usage,
        durationMs: Date.now() - started,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error("Extraction impossible");
}

export async function extractMenuUpload(
  admin: SupabaseClient,
  userClient: SupabaseClient,
  menuUploadId: string,
  userId: string,
): Promise<{ upload: Record<string, unknown>; extracted: ExtractedMenuJson }> {
  if (!isAssistantEnabled()) {
    throw new Error("Assistant IA temporairement indisponible");
  }

  const { data: upload, error: fetchError } = await userClient
    .from("ai_menu_uploads")
    .select("id, business_id, storage_path, file_name, file_type, status")
    .eq("id", menuUploadId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!upload) throw new Error("Menu introuvable ou accès refusé");

  if (upload.status === "extracting") {
    throw new Error("Une extraction est déjà en cours");
  }

  const { error: statusError } = await userClient
    .from("ai_menu_uploads")
    .update({
      status: "extracting",
      error_message: null,
    })
    .eq("id", menuUploadId);

  if (statusError) throw new Error(statusError.message);

  try {
    const { data: fileData, error: downloadError } = await admin.storage
      .from(AI_MENU_BUCKET)
      .download(upload.storage_path);

    if (downloadError || !fileData) {
      throw new Error(downloadError?.message || "Fichier menu introuvable");
    }

    const fileBytes = new Uint8Array(await fileData.arrayBuffer());
    const { extracted, summary, model, usage, durationMs } = await runOpenAiExtraction(
      upload,
      fileBytes,
    );

    const { data: updated, error: updateError } = await userClient
      .from("ai_menu_uploads")
      .update({
        status: "extracted",
        extracted_json: extracted,
        extracted_text: summary,
        error_message: null,
      })
      .eq("id", menuUploadId)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);

    await admin.from("ai_usage_logs").insert({
      business_id: upload.business_id,
      user_id: userId,
      action: "extract_menu",
      batch_id: null,
      tokens_input: usage.prompt_tokens,
      tokens_output: usage.completion_tokens,
      cost_estimate: estimateOpenAiCostUsd(model, usage),
      model_used: model,
      duration_ms: durationMs,
    });

    return { upload: updated, extracted };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction échouée";

    await userClient
      .from("ai_menu_uploads")
      .update({
        status: "failed",
        error_message: message,
      })
      .eq("id", menuUploadId);

    throw new Error(message);
  }
}

export async function saveManualMenuExtraction(
  userClient: SupabaseClient,
  menuUploadId: string,
  rawJson: unknown,
): Promise<{ upload: Record<string, unknown>; extracted: ExtractedMenuJson }> {
  const extracted = normalizeExtractedMenuJson(rawJson);
  const validationError = validateExtractedMenuJson(extracted);
  if (validationError) throw new Error(validationError);

  const { data: updated, error } = await userClient
    .from("ai_menu_uploads")
    .update({
      status: "extracted",
      extracted_json: extracted,
      extracted_text: summarizeExtractedMenu(extracted),
      error_message: null,
    })
    .eq("id", menuUploadId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { upload: updated, extracted };
}
