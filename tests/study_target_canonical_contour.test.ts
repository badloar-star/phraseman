import assert from 'node:assert/strict';
import {
  isProductionStudyTarget,
  isStudyTarget,
  STUDY_TARGETS,
  studyTargetsForSourceLocale,
  ttsLocaleForProductionStudyTarget,
} from '../app/study_target';

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
// зачем (D130, владелец 2026-09-30): итальянский — пятый язык обучения.
assert.deepEqual(STUDY_TARGETS, ['en', 'es', 'fr', 'de', 'it']);
assert.equal(isStudyTarget('es'), true);
assert.equal(isStudyTarget('de'), true);
assert.equal(isProductionStudyTarget('es'), true);
assert.deepEqual(studyTargetsForSourceLocale('ru'), ['en', 'es', 'fr', 'de', 'it']);
assert.equal(isStudyTarget('it'), true);
assert.equal(ttsLocaleForProductionStudyTarget('de'), 'de-DE');

process.stdout.write('STUDY TARGET CANONICAL CONTOUR: PASS\n');
}

if (typeof test === "function") {
  test("study_target_canonical_contour", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
