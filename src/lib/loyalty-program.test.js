import { describe, expect, it } from 'vitest';
import {
  buildProgramFormFromData,
  getProgramRuleSummary,
  getProgramStatusBadge,
} from './loyalty-program.js';

describe('buildProgramFormFromData', () => {
  it('reprend les valeurs sauvegardées', () => {
    const form = buildProgramFormFromData({
      id: '1',
      type: 'points',
      name: 'Fidélité midi',
      points_per_euro: 2,
      reward_threshold: 150,
      reward_label: 'Café offert',
    }, { description: 'Un café au choix' });

    expect(form.name).toBe('Fidélité midi');
    expect(form.points_per_euro).toBe(2);
    expect(form.reward_threshold).toBe(150);
    expect(form.reward_label).toBe('Café offert');
    expect(form.reward_description).toBe('Un café au choix');
  });
});

describe('getProgramRuleSummary', () => {
  it('résume un programme points', () => {
    expect(getProgramRuleSummary({ type: 'points', points_per_euro: 1 })).toBe('1 € dépensé = 1 point');
  });
});

describe('getProgramStatusBadge', () => {
  it('indique actif quand configuré', () => {
    const badge = getProgramStatusBadge({
      id: '1',
      type: 'points',
      reward_label: 'Dessert',
      reward_threshold: 100,
      is_active: true,
    });
    expect(badge.label).toBe('Actif');
  });
});
