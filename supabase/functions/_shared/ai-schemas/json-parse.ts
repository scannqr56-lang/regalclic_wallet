/** Extraction JSON robuste depuis une réponse modèle (markdown, texte parasite). */

export function extractJsonObject(content: string): unknown {
  const trimmed = String(content || "").trim();
  if (!trimmed) throw new Error("Réponse IA vide");

  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }

    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Réponse IA non JSON");
    return JSON.parse(match[0]);
  }
}

export function parseJsonResponse<T>(
  content: string,
  validate: (parsed: unknown) => T,
): T {
  const parsed = extractJsonObject(content);
  return validate(parsed);
}
