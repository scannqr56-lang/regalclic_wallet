/** Validation couleurs hex — alignée sur wallet-branding.ts (Edge Functions) */

export const DEFAULT_PRIMARY_COLOR = '#0B1E3F';
export const DEFAULT_LABEL_COLOR = '#44C4A1';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(value) {
  return HEX_RE.test((value || '').trim());
}

export function normalizeHexColor(value, fallback = DEFAULT_PRIMARY_COLOR) {
  const trimmed = (value || '').trim();
  if (HEX_RE.test(trimmed)) return trimmed.toUpperCase();
  if (HEX_RE.test(fallback)) return fallback.toUpperCase();
  return DEFAULT_PRIMARY_COLOR;
}
