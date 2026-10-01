import assert from 'node:assert/strict';
import {
  LEARNING_LANGUAGE_CONTOURS,
  resolveLearningLanguageContour,
} from '../app/learning_language_contour';

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
// зачем D130: итальянский — пятый язык обучения (владелец 2026-09-30).
assert.deepEqual(Object.keys(LEARNING_LANGUAGE_CONTOURS), ['en', 'es', 'fr', 'de', 'it']);
assert.equal(resolveLearningLanguageContour('DE')?.speechLocale, 'de-DE');
assert.equal(resolveLearningLanguageContour('IT')?.speechLocale, 'it-IT');
assert.equal(resolveLearningLanguageContour('pt'), null);

process.stdout.write('LEARNING LANGUAGE CONTOUR: PASS\n');
}

if (typeof test === "function") {
  test("learning_language_contour", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
