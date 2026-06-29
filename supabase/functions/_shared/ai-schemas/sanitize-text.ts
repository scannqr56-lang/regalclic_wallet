/** Nettoyage des formulations interdites / trop assertives dans les sorties IA. */

const GUARANTEE_PATTERNS = [
  /\bgaranti(e|s|es)?\b/gi,
  /\brentabilit[ée] assur[ée]e\b/gi,
  /\bmarge garantie\b/gi,
  /\bchiffre d'affaires garanti\b/gi,
  /\bvous allez (doubler|tripler)\b/gi,
  /\b100\s*%\s*(de\s+)?(succès|réussite)\b/gi,
];

const DEFAULT_MARGIN_DISCLAIMER = "À valider selon vos coûts et votre carte.";

export function sanitizeSuggestionText(
  value: unknown,
  fallback = "",
): string {
  let text = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  if (!text) return fallback;

  for (const pattern of GUARANTEE_PATTERNS) {
    text = text.replace(pattern, "peut aider à");
  }

  text = text.replace(/\s{2,}/g, " ").trim();

  const lower = text.toLowerCase();
  if (
    !lower.includes("valider")
    && !lower.includes("selon vos")
    && (lower.includes("marge") || lower.includes("coût") || lower.includes("rentab"))
  ) {
    text = `${text} ${DEFAULT_MARGIN_DISCLAIMER}`.trim();
  }

  return text;
}

export function sanitizeWalletMessage(value: unknown, maxLength: number): string {
  const text = sanitizeSuggestionText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}
