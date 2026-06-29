import { describe, expect, it } from 'vitest';
import {
  countMenuItems,
  emptyExtractedMenuJson,
  normalizeExtractedMenuJson,
  validateExtractedMenuJson,
} from './ai-menu-extraction.js';

describe('normalizeExtractedMenuJson', () => {
  it('normalise prix avec virgule et symbole €', () => {
    const data = normalizeExtractedMenuJson({
      categories: [{
        name: 'Entrées',
        items: [{ name: 'Soupe', price: '12,50 €' }],
      }],
    });
    expect(data.categories[0].items[0].price).toBe(12.5);
  });

  it('ignore les catégories sans nom', () => {
    const data = normalizeExtractedMenuJson({
      categories: [{ name: '', items: [{ name: 'Test' }] }],
    });
    expect(data.categories).toHaveLength(0);
  });

  it('force une confiance valide', () => {
    const data = normalizeExtractedMenuJson({ extraction_confidence: 'invalid' });
    expect(data.extraction_confidence).toBe('medium');
  });
});

describe('validateExtractedMenuJson', () => {
  it('rejette un menu vide', () => {
    const data = emptyExtractedMenuJson();
    expect(validateExtractedMenuJson(data)).toMatch(/au moins une catégorie/);
  });

  it('accepte une catégorie avec produit', () => {
    const data = normalizeExtractedMenuJson({
      categories: [{ name: 'Plats', items: [{ name: 'Pizza' }] }],
    });
    expect(validateExtractedMenuJson(data)).toBeNull();
  });

  it('accepte une formule sans catégorie', () => {
    const data = normalizeExtractedMenuJson({
      menus: [{ name: 'Menu midi', price: 18 }],
    });
    expect(validateExtractedMenuJson(data)).toBeNull();
  });
});

describe('countMenuItems', () => {
  it('compte les produits toutes catégories', () => {
    const data = normalizeExtractedMenuJson({
      categories: [
        { name: 'A', items: [{ name: '1' }, { name: '2' }] },
        { name: 'B', items: [{ name: '3' }] },
      ],
    });
    expect(countMenuItems(data)).toBe(3);
  });
});
