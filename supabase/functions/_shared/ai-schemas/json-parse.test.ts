import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { extractJsonObject } from './json-parse.ts';

Deno.test('extractJsonObject — JSON brut', () => {
  assertEquals(extractJsonObject('{"ok":true}'), { ok: true });
});

Deno.test('extractJsonObject — bloc markdown', () => {
  const raw = 'Voici le menu:\n```json\n{"categories":[]}\n```';
  assertEquals(extractJsonObject(raw), { categories: [] });
});

Deno.test('extractJsonObject — texte parasite autour', () => {
  const raw = 'Réponse:\n{"menus":[]}\nFin.';
  assertEquals(extractJsonObject(raw), { menus: [] });
});

Deno.test('extractJsonObject — réponse vide', () => {
  assertThrows(() => extractJsonObject(''), Error, 'Réponse IA vide');
});

Deno.test('extractJsonObject — sans objet JSON', () => {
  assertThrows(() => extractJsonObject('pas de json ici'), Error);
});
