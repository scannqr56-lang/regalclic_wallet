export const EXTRACTION_CONFIDENCE_LABELS = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Élevée',
};

export function emptyExtractedMenuJson() {
  return {
    categories: [],
    menus: [],
    detected_currency: 'EUR',
    extraction_confidence: 'low',
    notes: [],
  };
}

function asString(value, fallback = '') {
  if (typeof value === 'string') return value.trim();
  if (value == null) return fallback;
  return String(value).trim();
}

function asPrice(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value * 100) / 100;
  }
  const normalized = String(value)
    .replace(/€/g, '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

function normalizeMenuItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = asString(raw.name);
  if (!name) return null;
  return {
    name,
    description: asString(raw.description) || null,
    price: asPrice(raw.price),
    price_estimated: Boolean(raw.price_estimated),
  };
}

function normalizeCategory(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = asString(raw.name);
  if (!name) return null;
  const items = (Array.isArray(raw.items) ? raw.items : [])
    .map(normalizeMenuItem)
    .filter(Boolean);
  return { name, items };
}

function normalizeMenuFormula(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = asString(raw.name);
  if (!name) return null;
  const included_items = (Array.isArray(raw.included_items) ? raw.included_items : [])
    .map((entry) => asString(entry))
    .filter(Boolean);
  return {
    name,
    price: asPrice(raw.price),
    included_items,
  };
}

export function normalizeExtractedMenuJson(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const confidence = asString(source.extraction_confidence, 'medium').toLowerCase();

  return {
    categories: (Array.isArray(source.categories) ? source.categories : [])
      .map(normalizeCategory)
      .filter(Boolean),
    menus: (Array.isArray(source.menus) ? source.menus : [])
      .map(normalizeMenuFormula)
      .filter(Boolean),
    detected_currency: asString(source.detected_currency, 'EUR') || 'EUR',
    extraction_confidence: ['low', 'medium', 'high'].includes(confidence)
      ? confidence
      : 'medium',
    notes: (Array.isArray(source.notes) ? source.notes : [])
      .map((note) => asString(note))
      .filter(Boolean),
  };
}

export function validateExtractedMenuJson(data) {
  if (!data.categories.length && !data.menus.length) {
    return 'Ajoutez au moins une catégorie avec un produit ou un menu.';
  }

  for (const category of data.categories) {
    if (!category.name.trim()) return 'Chaque catégorie doit avoir un nom.';
    for (const item of category.items) {
      if (!item.name.trim()) return 'Chaque produit doit avoir un nom.';
    }
  }

  for (const menu of data.menus) {
    if (!menu.name.trim()) return 'Chaque formule doit avoir un nom.';
  }

  return null;
}

export function countMenuItems(data) {
  return data.categories.reduce((sum, cat) => sum + cat.items.length, 0);
}
