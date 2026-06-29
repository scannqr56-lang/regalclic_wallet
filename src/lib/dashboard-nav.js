import {
  Bot,
  LayoutDashboard,
  Megaphone,
  QrCode,
  ScanLine,
  Sparkles,
  Store,
  UtensilsCrossed,
  Users,
} from 'lucide-react';

export const NAV_MODE_STORAGE_KEY = 'regalclic-dashboard-nav-mode';

/** Navigation guidée — max 5 entrées (§4.2). */
export const BEGINNER_NAV = [
  { id: 'home', to: '/dashboard', label: 'Accueil', icon: LayoutDashboard, end: true },
  {
    id: 'menu',
    to: '/dashboard/menu',
    label: 'Mon menu',
    icon: UtensilsCrossed,
    matchPrefixes: ['/dashboard/menu'],
  },
  {
    id: 'ideas',
    to: '/dashboard/ideas',
    label: 'Mes idées',
    icon: Bot,
    matchPrefixes: ['/dashboard/ideas', '/dashboard/ai-assistant'],
  },
  {
    id: 'program',
    to: '/dashboard/program',
    label: 'Mon programme',
    icon: Sparkles,
  },
  { id: 'qr', to: '/dashboard/qr', label: 'QR', icon: QrCode },
];

/** Entrées supplémentaires en mode avancé (§4.3). */
export const ADVANCED_NAV = [
  { id: 'offers', to: '/dashboard/offers', label: 'Offres', icon: Megaphone },
  {
    id: 'customers',
    to: '/dashboard/customers',
    label: 'Clients',
    icon: Users,
    requiresFirstCustomer: true,
  },
  { id: 'business', to: '/dashboard/business', label: 'Commerce', icon: Store },
  { id: 'scan', to: '/dashboard/scan', label: 'Scanner', icon: ScanLine },
];

export function readStoredNavMode() {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(NAV_MODE_STORAGE_KEY);
  if (value === 'advanced' || value === 'beginner') return value;
  return null;
}

export function writeStoredNavMode(mode) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(NAV_MODE_STORAGE_KEY, mode);
}

/**
 * Mode avancé si préférence utilisateur ou onboarding terminé (défaut après parcours).
 */
export function resolveAdvancedNavMode({ storedMode, onboardingComplete }) {
  if (storedMode === 'advanced') return true;
  if (storedMode === 'beginner') return false;
  return Boolean(onboardingComplete);
}

export function getVisibleNavItems({ isAdvancedMode, statuses = {} }) {
  if (!isAdvancedMode) return BEGINNER_NAV;

  const items = [...BEGINNER_NAV];
  for (const item of ADVANCED_NAV) {
    if (item.requiresFirstCustomer && !statuses.first_customer_added) continue;
    items.push(item);
  }
  return items;
}

export function isNavItemActive(item, pathname) {
  if (item.matchPrefixes?.length) {
    return item.matchPrefixes.some((prefix) => pathname.startsWith(prefix));
  }
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
