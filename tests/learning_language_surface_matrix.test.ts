import assert from 'node:assert/strict';
import {
  LEARNING_LANGUAGE_SURFACES,
  LEARNING_LANGUAGE_TARGETS,
  requiredLearningLanguageSurfaces,
} from '../app/learning_language_surface_matrix';

assert.deepEqual(LEARNING_LANGUAGE_TARGETS, ['en', 'es', 'fr', 'de']);
assert.deepEqual(LEARNING_LANGUAGE_SURFACES, [
  'lessons',
  'learning_v2',
  'daily_phrase',
  'dialogues',
  'arena',
  'videos',
  'flashcards',
  'diagnostic_and_exam',
]);
assert.deepEqual(requiredLearningLanguageSurfaces(), LEARNING_LANGUAGE_SURFACES);

process.stdout.write('LEARNING LANGUAGE SURFACE MATRIX: PASS\n');
