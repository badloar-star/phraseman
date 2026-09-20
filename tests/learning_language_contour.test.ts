import assert from 'node:assert/strict';
import {
  LEARNING_LANGUAGE_CONTOURS,
  resolveLearningLanguageContour,
} from '../app/learning_language_contour';

assert.deepEqual(Object.keys(LEARNING_LANGUAGE_CONTOURS), ['en', 'es', 'fr', 'de']);
assert.equal(resolveLearningLanguageContour('DE')?.speechLocale, 'de-DE');
assert.equal(resolveLearningLanguageContour('it'), null);

process.stdout.write('LEARNING LANGUAGE CONTOUR: PASS\n');
