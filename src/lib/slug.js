const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function isValidSlug(slug) {
  return SLUG_REGEX.test(slug) && slug.length >= 2;
}

export function getAppBaseUrl() {
  const fromEnv = import.meta.env.VITE_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export function getJoinUrl(slug) {
  return `${getAppBaseUrl()}/join/${slug}`;
}
