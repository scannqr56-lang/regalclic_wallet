/** Préparation sécurisée du contexte envoyé aux prompts (taille, PII). */

const MAX_MENU_ITEMS = 80;
const PII_KEYS = new Set([
  "email",
  "phone",
  "contact_email",
  "contact_phone",
  "owner_email",
  "owner_phone",
]);

export function stripPiiFromProfile<T extends Record<string, unknown>>(profile: T): T {
  const copy = { ...profile };
  for (const key of Object.keys(copy)) {
    if (PII_KEYS.has(key.toLowerCase())) {
      delete copy[key];
    }
  }
  return copy;
}

export function prepareMenuJsonForPrompt(menuJson: unknown): unknown {
  if (!menuJson || typeof menuJson !== "object") return menuJson;

  const source = menuJson as Record<string, unknown>;
  const categories = Array.isArray(source.categories) ? [...source.categories] : [];
  const menus = Array.isArray(source.menus) ? source.menus : [];

  let itemCount = 0;
  const trimmedCategories = [];

  for (const category of categories) {
    if (!category || typeof category !== "object") continue;
    const cat = { ...(category as Record<string, unknown>) };
    const items = Array.isArray(cat.items) ? [...cat.items] : [];
    const keptItems = [];

    for (const item of items) {
      if (itemCount >= MAX_MENU_ITEMS) break;
      keptItems.push(item);
      itemCount += 1;
    }

    cat.items = keptItems;
    trimmedCategories.push(cat);
    if (itemCount >= MAX_MENU_ITEMS) break;
  }

  const notes = Array.isArray(source.notes) ? source.notes : [];
  const result: Record<string, unknown> = {
    ...source,
    categories: trimmedCategories,
    menus,
  };

  if (itemCount >= MAX_MENU_ITEMS) {
    result.notes = [
      ...notes.map(String),
      `Menu tronqué à ${MAX_MENU_ITEMS} produits pour l'analyse IA.`,
    ];
  }

  return result;
}
