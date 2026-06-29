import { describe, expect, it } from 'vitest';
import {
  computeOnboardingStatuses,
  getChecklistStepState,
  getCurrentStepIndex,
  getNextAction,
  isOnboardingComplete,
  isProgramConfigured,
  isRestaurantConfigured,
} from './onboarding-progress.js';

const baseBusiness = {
  name: 'Chez Paul',
  slug: 'chez-paul',
  logo_url: 'https://example.com/logo.png',
};

const baseProgram = {
  id: 'prog-1',
  type: 'points',
  reward_label: 'Café offert',
  reward_threshold: 100,
};

describe('isRestaurantConfigured', () => {
  it('exige nom, slug et au moins un contact visuel', () => {
    expect(isRestaurantConfigured(baseBusiness)).toBe(true);
    expect(isRestaurantConfigured({ name: 'X', slug: 'x' })).toBe(false);
  });
});

describe('getNextAction', () => {
  it('priorise la configuration restaurant', () => {
    const action = getNextAction({ restaurant_configured: false });
    expect(action.href).toBe('/dashboard/business');
    expect(action.stepIndex).toBe(1);
  });

  it('propose le menu après le restaurant', () => {
    const action = getNextAction({
      restaurant_configured: true,
      menu_added: false,
    });
    expect(action.href).toBe('/dashboard/menu');
  });

  it('propose le QR quand le programme est prêt sans clients', () => {
    const action = getNextAction({
      restaurant_configured: true,
      menu_added: true,
      restaurant_preferences_completed: true,
      loyalty_program_exists: true,
      ideas_received: true,
      ideas_chosen: true,
      offer_activated: true,
      program_configured: true,
      qr_displayed: false,
      pendingSuggestions: 0,
    });
    expect(action.href).toBe('/dashboard/qr');
    expect(action.stepIndex).toBe(6);
  });
});

describe('checklist progression', () => {
  it('calcule l’index de l’étape courante', () => {
    const statuses = computeOnboardingStatuses({
      business: baseBusiness,
      loyaltyProgram: null,
      stats: { customers_count: 0 },
      menus: [],
      profile: null,
      suggestions: [],
      campaigns: [],
    });

    const steps = getChecklistStepState(statuses);
    expect(steps[0].done).toBe(true);
    expect(getCurrentStepIndex(steps)).toBe(1);
    expect(isOnboardingComplete(statuses)).toBe(false);
  });

  it('détecte un programme configuré', () => {
    expect(isProgramConfigured(baseProgram)).toBe(true);
    expect(isProgramConfigured({ id: '1', type: 'points' })).toBe(false);
  });
});
