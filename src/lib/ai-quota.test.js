import { describe, expect, it } from 'vitest';
import {
  formatGenerationQuotaLine,
  formatUploadQuotaLine,
  getQuotaBlockMessage,
} from './ai-quota.js';

describe('getQuotaBlockMessage', () => {
  it('kill switch assistant', () => {
    const msg = getQuotaBlockMessage({ assistant_enabled: false });
    expect(msg).toMatch(/indisponible/i);
  });

  it('limite génération atteinte', () => {
    const msg = getQuotaBlockMessage({
      assistant_enabled: true,
      generation: { allowed: false, reason: 'Quota atteint ce mois' },
      upload: { allowed: true },
    });
    expect(msg).toBe('limite atteint ce mois');
  });
});

describe('formatGenerationQuotaLine', () => {
  it('affiche les utilisations restantes', () => {
    const line = formatGenerationQuotaLine({
      generation: { monthly_used: 2, monthly_limit: 5, trial_available: false },
    });
    expect(line).toContain('Utilisations restantes');
    expect(line).toContain('3');
  });
});

describe('formatUploadQuotaLine', () => {
  it('affiche les menus restants', () => {
    const line = formatUploadQuotaLine({
      upload: { monthly_used: 1, monthly_limit: 10, trial_available: false },
    });
    expect(line).toContain('Menus restants');
    expect(line).toContain('9');
  });
});
