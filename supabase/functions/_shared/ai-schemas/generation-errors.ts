/** Messages utilisateur pour échecs de génération IA. */

export function toUserGenerationError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("OPENAI_API_KEY")) {
    return "Service IA non configuré — contactez le support RegalClic.";
  }
  if (message.includes("indisponible")) {
    return message;
  }
  if (message.includes("Quota") || message.includes("essai")) {
    return message;
  }
  if (
    message.includes("Délai")
    || message.includes("timeout")
    || message.includes("AbortError")
  ) {
    return "Délai dépassé — réessayez dans un instant.";
  }
  if (
    message.includes("JSON")
    || message.includes("Réponse IA")
    || message.includes("Pas assez")
    || message.includes("invalide")
  ) {
    return "La génération a échoué — réessayez ou contactez le support.";
  }

  return message.length > 160
    ? "La génération a échoué — réessayez ou contactez le support."
    : message;
}
