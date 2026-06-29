import { describe, expect, it } from 'vitest';
import {
  buildSuggestionEditForm,
  filterSuggestions,
  sortSuggestionsByMarginRisk,
} from './ai-apply-suggestion.js';

const baseSuggestion = {
  id: '1',
  created_at: '2026-01-01T00:00:00Z',
  suggestion_type: 'offer',
  status: 'pending',
  margin_risk: 'medium',
  title: 'Offre test',
  customer_message: 'Message client',
  objective: 'frequence',
};

describe('filterSuggestions', () => {
  const list = [
    { ...baseSuggestion, id: '1', suggestion_type: 'offer', status: 'pending', margin_risk: 'high' },
    { ...baseSuggestion, id: '2', suggestion_type: 'reward', status: 'applied', margin_risk: 'low' },
  ];

  it('filtre par type', () => {
    expect(filterSuggestions(list, { type: 'reward' })).toHaveLength(1);
  });

  it('filtre par statut', () => {
    expect(filterSuggestions(list, { status: 'applied' })).toHaveLength(1);
  });

  it('filtre par risque marge', () => {
    expect(filterSuggestions(list, { marginRisk: 'high' })).toHaveLength(1);
  });
});

describe('sortSuggestionsByMarginRisk', () => {
  const list = [
    { ...baseSuggestion, id: 'low', margin_risk: 'low' },
    { ...baseSuggestion, id: 'high', margin_risk: 'high' },
    { ...baseSuggestion, id: 'medium', margin_risk: 'medium' },
  ];

  it('trie high_first par défaut', () => {
    const sorted = sortSuggestionsByMarginRisk(list);
    expect(sorted.map((s) => s.id)).toEqual(['high', 'medium', 'low']);
  });

  it('trie low_first si demandé', () => {
    const sorted = sortSuggestionsByMarginRisk(list, 'low_first');
    expect(sorted.map((s) => s.id)).toEqual(['low', 'medium', 'high']);
  });
});

describe('buildSuggestionEditForm', () => {
  it('prépare le formulaire offre', () => {
    const form = buildSuggestionEditForm({
      ...baseSuggestion,
      suggestion_type: 'offer',
      customer_message: 'Profitez de -10%',
    });
    expect(form.title).toBe('Offre test');
    expect(form.message).toBeTruthy();
  });

  it('prépare le formulaire récompense', () => {
    const form = buildSuggestionEditForm({
      ...baseSuggestion,
      suggestion_type: 'reward',
      description: 'Dessert offert',
    });
    expect(form.description).toBe('Dessert offert');
  });
});
