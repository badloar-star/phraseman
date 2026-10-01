import assert from 'node:assert/strict';
import {
  lessonProgressKey,
  storageStudyTarget,
  targetKey,
} from '../app/target_storage_keys';

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
assert.equal(storageStudyTarget('en'), 'en');
assert.equal(storageStudyTarget('es'), 'es');
assert.equal(storageStudyTarget('fr'), 'fr');
assert.equal(storageStudyTarget('de'), 'de');
assert.equal(lessonProgressKey(7, 'en'), 'lesson7_progress');
assert.equal(lessonProgressKey(7, 'es'), targetKey('lesson_progress', 'es', 7));
assert.equal(lessonProgressKey(7, 'de'), targetKey('lesson_progress', 'de', 7));

console.log('TARGET STORAGE ALL LANGUAGE CONTOURS: PASS');
}

if (typeof test === "function") {
  test("target_storage_all_language_contours", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
