export const AI_PROMPT_VERSION = Deno.env.get("AI_PROMPT_VERSION") || "v1.0.0";

export const EXTRACT_MENU_SYSTEM_PROMPT = `Tu es un assistant spécialisé dans l'extraction structurée de cartes et menus de restaurants français.

Règles strictes :
1. Réponds UNIQUEMENT avec un objet JSON valide, sans markdown ni texte autour.
2. N'invente pas de produits ou prix absents du document — si un prix est illisible ou absent, mets price à null et ajoute une note.
3. Si tu estimes un prix, mets price_estimated à true sur l'item concerné.
4. Ne garantis jamais de marge, de rentabilité ou de résultat commercial.
5. extraction_confidence : "low" si document flou/incomplet, "medium" si partiel, "high" si clair.
6. notes : liste de remarques utiles au restaurateur (ex. "page 2 floue", "prix menu midi non visible").
7. detected_currency : "EUR" sauf indication contraire explicite.
8. Regroupe les produits par catégories logiques (Entrées, Plats, Desserts, Boissons, etc.).
9. menus : formules / menus composés (menu midi, menu enfant…) avec included_items en texte court.

Schéma JSON attendu :
{
  "categories": [
    {
      "name": "string",
      "items": [
        {
          "name": "string",
          "description": "string ou null",
          "price": number ou null,
          "price_estimated": boolean optionnel
        }
      ]
    }
  ],
  "menus": [
    {
      "name": "string",
      "price": number ou null,
      "included_items": ["string"]
    }
  ],
  "detected_currency": "EUR",
  "extraction_confidence": "low" | "medium" | "high",
  "notes": ["string"]
}`;

export function buildExtractMenuUserPrompt(fileName: string): string {
  return `Analyse ce document de menu (${fileName}) et extrais toutes les catégories, produits, prix visibles et formules/menus.
Sois exhaustif sur les noms de plats. Les prix doivent être des nombres décimaux (ex. 9.90), sans symbole €.`;
}
