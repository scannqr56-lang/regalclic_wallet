import { callOpenAiChat } from "./ai-openai.ts";
import { sumOpenAiUsage, type OpenAiUsage } from "./ai-usage-log.ts";

export type OpenAiJsonResult<T> = {
  parsed: T;
  content: string;
  model: string;
  usage: OpenAiUsage;
  attempts: number;
};

export type OpenAiProviderCall = {
  model: string;
  usage: OpenAiUsage;
  durationMs: number;
};

/**
 * Appel OpenAI en mode JSON avec 1 retry si parsing/validation échoue.
 * Chaque appel provider peut être journalisé via onProviderCall.
 */
export async function runOpenAiJsonWithRetry<T>(params: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  parse: (content: string) => T;
  timeoutMs?: number;
  maxAttempts?: number;
  onProviderCall?: (call: OpenAiProviderCall) => void | Promise<void>;
}): Promise<OpenAiJsonResult<T>> {
  const maxAttempts = params.maxAttempts ?? 2;
  let lastError: Error | null = null;
  let repairSuffix = "";
  const usages: OpenAiUsage[] = [];
  let lastModel = params.model;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const userContent = repairSuffix
        ? `${params.userPrompt}\n\n${repairSuffix}`
        : params.userPrompt;

      const callStarted = Date.now();
      const result = await callOpenAiChat({
        model: params.model,
        jsonMode: true,
        timeoutMs: params.timeoutMs ?? 120_000,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: userContent },
        ],
      });
      const durationMs = Date.now() - callStarted;

      usages.push(result.usage);
      lastModel = result.model;

      if (params.onProviderCall) {
        await params.onProviderCall({
          model: result.model,
          usage: result.usage,
          durationMs,
        });
      }

      const parsed = params.parse(result.content);

      return {
        parsed,
        content: result.content,
        model: result.model,
        usage: sumOpenAiUsage(usages),
        attempts: usages.length,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      repairSuffix = [
        "CORRECTION REQUISE : la réponse précédente n'était pas un JSON valide conforme au schéma.",
        `Erreur : ${lastError.message}`,
        "Réponds UNIQUEMENT avec un objet JSON valide, sans markdown ni texte autour.",
      ].join(" ");
    }
  }

  throw lastError ?? new Error("Génération impossible");
}
