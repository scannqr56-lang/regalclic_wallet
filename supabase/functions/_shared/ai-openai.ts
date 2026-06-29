type OpenAiUsage = {
  prompt_tokens: number;
  completion_tokens: number;
};

type OpenAiChatResult = {
  content: string;
  usage: OpenAiUsage;
  model: string;
};

type OpenAiMessageContent =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } }
  | { type: "file"; file: { filename: string; file_data: string } };

export async function callOpenAiChat(params: {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string | OpenAiMessageContent[] }>;
  jsonMode?: boolean;
  timeoutMs?: number;
}): Promise<OpenAiChatResult> {
  const apiKey = Deno.env.get("OPENAI_API_KEY") || "";
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY manquante — configurez le secret Supabase");
  }

  const timeoutMs = params.timeoutMs ?? 90_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: 0.2,
        response_format: params.jsonMode ? { type: "json_object" } : undefined,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data?.error?.message || `OpenAI HTTP ${response.status}`;
      throw new Error(message);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("Réponse OpenAI vide");
    }

    const usage = data?.usage ?? {};
    return {
      content,
      model: String(data?.model || params.model),
      usage: {
        prompt_tokens: Number(usage.prompt_tokens || 0),
        completion_tokens: Number(usage.completion_tokens || 0),
      },
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Délai d'extraction dépassé (90 s) — réessayez ou saisissez le menu manuellement");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function estimateOpenAiCostUsd(
  model: string,
  usage: OpenAiUsage,
): number {
  // Tarifs indicatifs gpt-4o (USD / 1M tokens) — pour observabilité interne
  const isMini = model.includes("mini");
  const inputRate = isMini ? 0.15 : 2.5;
  const outputRate = isMini ? 0.6 : 10;
  return (
    (usage.prompt_tokens / 1_000_000) * inputRate +
    (usage.completion_tokens / 1_000_000) * outputRate
  );
}
