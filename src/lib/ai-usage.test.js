import { describe, expect, it } from 'vitest';
import {
  formatAiActionLabel,
  formatBusinessAiActivityLine,
} from './ai-usage.js';

describe('formatAiActionLabel', () => {
  it('libellés connus', () => {
    expect(formatAiActionLabel('extract_menu')).toBe('Extraction menu');
    expect(formatAiActionLabel('generate_batch')).toBe('Génération IA');
  });
});

describe('formatBusinessAiActivityLine', () => {
  it('résumé mensuel', () => {
    const line = formatBusinessAiActivityLine({
      total_calls: 3,
      by_action: { extract_menu: 1, generate_batch: 2 },
    });
    expect(line).toContain('3 appels');
    expect(line).toContain('1 extraction');
    expect(line).toContain('2 générations');
  });

  it('vide si aucun appel', () => {
    expect(formatBusinessAiActivityLine({ total_calls: 0, by_action: {} })).toBeNull();
  });
});
