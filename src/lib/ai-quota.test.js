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

  it('quota génération atteint', () => {
    const msg = getQuotaBlockMessage({
      assistant_enabled: true,
      generation: { allowed: false, reason: 'Quota atteint ce mois' },
      upload: { allowed: true },
    });
    expect(msg).toBe('Quota atteint ce mois');
  });
});

describe('formatGenerationQuotaLine', () => {
  it('affiche plan et usage', () => {
    const line = formatGenerationQuotaLine({
      plan_label: 'Pro IA',
      generation: { monthly_used: 2, monthly_limit: 5, trial_available: false },
    });
    expect(line).toContain('Pro IA');
    expect(line).toContain('2 / 5');
  });
});

describe('formatUploadQuotaLine', () => {
  it('affiche uploads du mois', () => {
    const line = formatUploadQuotaLine({
      plan_label: 'Business',
      upload: { monthly_used: 1, monthly_limit: 10, trial_available: false },
    });
    expect(line).toContain('1 / 10');
  });
});
