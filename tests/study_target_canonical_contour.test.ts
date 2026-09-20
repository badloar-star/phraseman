import assert from 'node:assert/strict';
import {
  isProductionStudyTarget,
  isStudyTarget,
  STUDY_TARGETS,
  studyTargetsForSourceLocale,
  ttsLocaleForProductionStudyTarget,
} from '../app/study_target';

assert.deepEqual(STUDY_TARGETS, ['en', 'es', 'fr', 'de']);
assert.equal(isStudyTarget('es'), true);
assert.equal(isStudyTarget('de'), true);
assert.equal(isProductionStudyTarget('es'), true);
assert.deepEqual(studyTargetsForSourceLocale('ru'), ['en', 'es', 'fr', 'de']);
assert.equal(ttsLocaleForProductionStudyTarget('de'), 'de-DE');

process.stdout.write('STUDY TARGET CANONICAL CONTOUR: PASS\n');
