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

/** regalclic.app sans www redirige mal sur certains navigateurs mobiles au scan QR */
export function normalizeAppBaseUrl(url) {
  const trimmed = String(url || '').replace(/\/$/, '');
  if (!trimmed) return '';

  return trimmed.replace(/^http:\/\/regalclic\.app$/i, 'https://www.regalclic.app')
    .replace(/^https:\/\/regalclic\.app$/i, 'https://www.regalclic.app');
}

export function getAppBaseUrl() {
  const fromEnv = import.meta.env.VITE_PUBLIC_APP_URL;
  if (fromEnv) return normalizeAppBaseUrl(fromEnv);

  if (typeof window !== 'undefined') {
    return normalizeAppBaseUrl(window.location.origin);
  }

  return '';
}

export function getJoinUrl(slug) {
  return `${getAppBaseUrl()}/join/${slug}`;
}
