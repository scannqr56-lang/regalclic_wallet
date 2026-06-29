import { assertEquals } from 'jsr:@std/assert';
import { sanitizeSuggestionText, sanitizeWalletMessage } from './sanitize-text.ts';

Deno.test('sanitizeSuggestionText — neutralise garantie', () => {
  const result = sanitizeSuggestionText('Marge garantie sur les desserts');
  assertEquals(result.includes('garantie'), false);
  assertEquals(result.includes('peut aider'), true);
});

Deno.test('sanitizeSuggestionText — ajoute disclaimer marge', () => {
  const result = sanitizeSuggestionText('Bonne marge sur les boissons');
  assertEquals(result.includes('valider'), true);
});

Deno.test('sanitizeWalletMessage — tronque à la longueur max', () => {
  const long = 'A'.repeat(150);
  const result = sanitizeWalletMessage(long, 40);
  assertEquals(result.length <= 40, true);
  assertEquals(result.endsWith('…'), true);
});

Deno.test('sanitizeSuggestionText — fallback si vide', () => {
  assertEquals(sanitizeSuggestionText('', 'défaut'), 'défaut');
});
