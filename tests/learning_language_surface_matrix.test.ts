import assert from 'node:assert/strict';
import {
  LEARNING_LANGUAGE_SURFACES,
  LEARNING_LANGUAGE_TARGETS,
  requiredLearningLanguageSurfaces,
} from '../app/learning_language_surface_matrix';

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
// зачем D130: итальянский добавлен владельцем 2026-09-30.
assert.deepEqual(LEARNING_LANGUAGE_TARGETS, ['en', 'es', 'fr', 'de', 'it']);
assert.deepEqual(LEARNING_LANGUAGE_SURFACES, [
  'lessons',
  'learning_v2',
  'daily_phrase',
  'dialogues',
  'arena',
  'videos',
  'flashcards',
  'diagnostic_and_exam',
  'spire',
]);
assert.deepEqual(requiredLearningLanguageSurfaces(), LEARNING_LANGUAGE_SURFACES);

process.stdout.write('LEARNING LANGUAGE SURFACE MATRIX: PASS\n');
}

if (typeof test === "function") {
  test("learning_language_surface_matrix", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
