import { assertEquals } from 'jsr:@std/assert';
import { toUserGenerationError } from './generation-errors.ts';

Deno.test('toUserGenerationError — clé OpenAI manquante', () => {
  assertEquals(
    toUserGenerationError(new Error('OPENAI_API_KEY manquante')),
    'Service IA non configuré — contactez le support RegalClic.',
  );
});

Deno.test('toUserGenerationError — quota', () => {
  assertEquals(
    toUserGenerationError(new Error('Quota de génération atteint')),
    'Quota de génération atteint',
  );
});

Deno.test('toUserGenerationError — JSON invalide', () => {
  assertEquals(
    toUserGenerationError(new Error('Réponse IA non JSON')),
    'La génération a échoué — réessayez ou contactez le support.',
  );
});

Deno.test('toUserGenerationError — timeout', () => {
  assertEquals(
    toUserGenerationError(new Error('Délai dépassé')),
    'Délai dépassé — réessayez dans un instant.',
  );
});

Deno.test('toUserGenerationError — message long tronqué', () => {
  const long = 'x'.repeat(200);
  assertEquals(
    toUserGenerationError(new Error(long)),
    'La génération a échoué — réessayez ou contactez le support.',
  );
});
