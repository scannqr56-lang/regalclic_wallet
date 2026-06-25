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
  if (typeof window !== 'undefined') {
    const origin = window.location.origin.replace(/\/$/, '');
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

    // En prod (Vercel, domaine custom) : toujours l'URL actuelle du navigateur
    if (!isLocal) return origin;

    // En dev local : permet de pointer vers la prod via .env
    const fromEnv = import.meta.env.VITE_PUBLIC_APP_URL;
    if (fromEnv) return String(fromEnv).replace(/\/$/, '');
    return origin;
  }

  const fromEnv = import.meta.env.VITE_PUBLIC_APP_URL;
  return fromEnv ? String(fromEnv).replace(/\/$/, '') : '';
}

export function getJoinUrl(slug) {
  return `${getAppBaseUrl()}/join/${slug}`;
}
