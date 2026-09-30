import assert from 'node:assert/strict';
import {
  LEARNING_LANGUAGE_CONTOURS,
  resolveLearningLanguageContour,
} from '../app/learning_language_contour';

// зачем D130: итальянский — пятый язык обучения (владелец 2026-09-30).
assert.deepEqual(Object.keys(LEARNING_LANGUAGE_CONTOURS), ['en', 'es', 'fr', 'de', 'it']);
assert.equal(resolveLearningLanguageContour('DE')?.speechLocale, 'de-DE');
assert.equal(resolveLearningLanguageContour('IT')?.speechLocale, 'it-IT');
assert.equal(resolveLearningLanguageContour('pt'), null);

process.stdout.write('LEARNING LANGUAGE CONTOUR: PASS\n');
