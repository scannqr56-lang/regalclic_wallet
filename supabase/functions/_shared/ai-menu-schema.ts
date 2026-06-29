import { extractJsonObject } from "./ai-schemas/json-parse.ts";

export type MenuItem = {
  name: string;
  description?: string | null;
  price?: number | null;
  price_estimated?: boolean;
};

export type MenuCategory = {
  name: string;
  items: MenuItem[];
};

export type MenuFormula = {
  name: string;
  price?: number | null;
  included_items?: string[];
};

export type ExtractedMenuJson = {
  categories: MenuCategory[];
  menus: MenuFormula[];
  detected_currency: string;
  extraction_confidence: "low" | "medium" | "high";
  notes: string[];
};

const CONFIDENCE_LEVELS = new Set(["low", "medium", "high"]);

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return fallback;
  return String(value).trim();
}

function asNullableString(value: unknown): string | null {
  const text = asString(value);
  return text || null;
}

function asPrice(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100) / 100;
  }
  const normalized = String(value)
    .replace(/€/g, "")
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

function normalizeMenuItem(raw: unknown): MenuItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const name = asString(item.name);
  if (!name) return null;

  return {
    name,
    description: asNullableString(item.description),
    price: asPrice(item.price),
    price_estimated: Boolean(item.price_estimated),
  };
}

function normalizeCategory(raw: unknown): MenuCategory | null {
  if (!raw || typeof raw !== "object") return null;
  const category = raw as Record<string, unknown>;
  const name = asString(category.name);
  if (!name) return null;

  const itemsRaw = Array.isArray(category.items) ? category.items : [];
  const items = itemsRaw
    .map(normalizeMenuItem)
    .filter((item): item is MenuItem => item !== null);

  return { name, items };
}

function normalizeMenuFormula(raw: unknown): MenuFormula | null {
  if (!raw || typeof raw !== "object") return null;
  const menu = raw as Record<string, unknown>;
  const name = asString(menu.name);
  if (!name) return null;

  const includedRaw = Array.isArray(menu.included_items) ? menu.included_items : [];
  const included_items = includedRaw
    .map((entry) => asString(entry))
    .filter(Boolean);

  return {
    name,
    price: asPrice(menu.price),
    included_items,
  };
}

export function emptyExtractedMenuJson(): ExtractedMenuJson {
  return {
    categories: [],
    menus: [],
    detected_currency: "EUR",
    extraction_confidence: "low",
    notes: [],
  };
}

export function normalizeExtractedMenuJson(raw: unknown): ExtractedMenuJson {
  const source = raw && typeof raw === "object"
    ? raw as Record<string, unknown>
    : {};

  const categoriesRaw = Array.isArray(source.categories) ? source.categories : [];
  const menusRaw = Array.isArray(source.menus) ? source.menus : [];
  const notesRaw = Array.isArray(source.notes) ? source.notes : [];

  const confidence = asString(source.extraction_confidence, "medium").toLowerCase();

  return {
    categories: categoriesRaw
      .map(normalizeCategory)
      .filter((category): category is MenuCategory => category !== null),
    menus: menusRaw
      .map(normalizeMenuFormula)
      .filter((menu): menu is MenuFormula => menu !== null),
    detected_currency: asString(source.detected_currency, "EUR") || "EUR",
    extraction_confidence: CONFIDENCE_LEVELS.has(confidence)
      ? confidence as ExtractedMenuJson["extraction_confidence"]
      : "medium",
    notes: notesRaw.map((note) => asString(note)).filter(Boolean),
  };
}

export function validateExtractedMenuJson(data: ExtractedMenuJson): string | null {
  if (!data.categories.length && !data.menus.length) {
    return "Ajoutez au moins une catégorie avec un produit ou un menu.";
  }

  for (const category of data.categories) {
    if (!category.name.trim()) return "Chaque catégorie doit avoir un nom.";
    for (const item of category.items) {
      if (!item.name.trim()) return "Chaque produit doit avoir un nom.";
    }
  }

  for (const menu of data.menus) {
    if (!menu.name.trim()) return "Chaque formule doit avoir un nom.";
  }

  return null;
}

export function summarizeExtractedMenu(data: ExtractedMenuJson): string {
  const itemCount = data.categories.reduce((sum, cat) => sum + cat.items.length, 0);
  return `${data.categories.length} catégorie(s), ${itemCount} produit(s), ${data.menus.length} formule(s) — confiance ${data.extraction_confidence}`;
}

export function parseExtractedMenuResponse(content: string): ExtractedMenuJson {
  const parsed = extractJsonObject(content);
  const normalized = normalizeExtractedMenuJson(parsed);
  const validationError = validateExtractedMenuJson(normalized);
  if (validationError) {
    throw new Error(validationError);
  }

  return normalized;
}
