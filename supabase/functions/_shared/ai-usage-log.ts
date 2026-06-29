import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { estimateOpenAiCostUsd } from "./ai-openai.ts";

export type AiUsageAction =
  | "upload_menu"
  | "extract_menu"
  | "generate_batch"
  | "apply_suggestion";

export type OpenAiUsage = {
  prompt_tokens: number;
  completion_tokens: number;
};

export type AiUsageLogInput = {
  business_id: string;
  user_id: string | null;
  action: AiUsageAction;
  batch_id?: string | null;
  tokens_input: number;
  tokens_output: number;
  model_used: string;
  duration_ms: number;
};

/** Insère une ligne de log — n'interrompt jamais le flux principal. */
export async function logAiUsage(
  admin: SupabaseClient,
  input: AiUsageLogInput,
): Promise<void> {
  const usage: OpenAiUsage = {
    prompt_tokens: input.tokens_input,
    completion_tokens: input.tokens_output,
  };

  const { error } = await admin.from("ai_usage_logs").insert({
    business_id: input.business_id,
    user_id: input.user_id,
    action: input.action,
    batch_id: input.batch_id ?? null,
    tokens_input: input.tokens_input,
    tokens_output: input.tokens_output,
    cost_estimate: estimateOpenAiCostUsd(input.model_used, usage),
    model_used: input.model_used,
    duration_ms: input.duration_ms,
  });

  if (error) {
    console.error("[ai_usage_logs] insert failed:", error.message);
  }
}

export function sumOpenAiUsage(usages: OpenAiUsage[]): OpenAiUsage {
  return usages.reduce(
    (acc, usage) => ({
      prompt_tokens: acc.prompt_tokens + usage.prompt_tokens,
      completion_tokens: acc.completion_tokens + usage.completion_tokens,
    }),
    { prompt_tokens: 0, completion_tokens: 0 },
  );
}

export function createAiUsageLogger(
  admin: SupabaseClient,
  base: Omit<
    AiUsageLogInput,
    "tokens_input" | "tokens_output" | "model_used" | "duration_ms"
  >,
) {
  return async (call: {
    model: string;
    usage: OpenAiUsage;
    durationMs: number;
  }) => {
    await logAiUsage(admin, {
      ...base,
      tokens_input: call.usage.prompt_tokens,
      tokens_output: call.usage.completion_tokens,
      model_used: call.model,
      duration_ms: call.durationMs,
    });
  };
}
