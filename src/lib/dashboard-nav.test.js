import { describe, expect, it } from 'vitest';
import {
  ADVANCED_NAV,
  BEGINNER_NAV,
  getVisibleNavItems,
  resolveAdvancedNavMode,
} from './dashboard-nav.js';

describe('resolveAdvancedNavMode', () => {
  it('respecte la préférence utilisateur', () => {
    expect(resolveAdvancedNavMode({ storedMode: 'beginner', onboardingComplete: true })).toBe(false);
    expect(resolveAdvancedNavMode({ storedMode: 'advanced', onboardingComplete: false })).toBe(true);
  });

  it('passe en avancé par défaut après onboarding', () => {
    expect(resolveAdvancedNavMode({ storedMode: null, onboardingComplete: true })).toBe(true);
    expect(resolveAdvancedNavMode({ storedMode: null, onboardingComplete: false })).toBe(false);
  });
});

describe('getVisibleNavItems', () => {
  it('limite à 5 entrées en mode débutant', () => {
    const items = getVisibleNavItems({ isAdvancedMode: false });
    expect(items).toHaveLength(5);
    expect(items.map((i) => i.id)).toEqual(BEGINNER_NAV.map((i) => i.id));
  });

  it('ajoute les entrées avancées sans clients avant le 1er scan', () => {
    const items = getVisibleNavItems({
      isAdvancedMode: true,
      statuses: { first_customer_added: false },
    });
    expect(items.length).toBe(BEGINNER_NAV.length + ADVANCED_NAV.length - 1);
    expect(items.some((i) => i.id === 'customers')).toBe(false);
    expect(items.some((i) => i.id === 'offers')).toBe(true);
  });

  it('affiche Clients après le premier client', () => {
    const items = getVisibleNavItems({
      isAdvancedMode: true,
      statuses: { first_customer_added: true },
    });
    expect(items.some((i) => i.id === 'customers')).toBe(true);
  });
});
