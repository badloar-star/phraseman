import assert from 'node:assert/strict';
import {
  lessonProgressKey,
  storageStudyTarget,
  targetKey,
} from '../app/target_storage_keys';

assert.equal(storageStudyTarget('en'), 'en');
assert.equal(storageStudyTarget('es'), 'es');
assert.equal(storageStudyTarget('fr'), 'fr');
assert.equal(storageStudyTarget('de'), 'de');
assert.equal(lessonProgressKey(7, 'en'), 'lesson7_progress');
assert.equal(lessonProgressKey(7, 'es'), targetKey('lesson_progress', 'es', 7));
assert.equal(lessonProgressKey(7, 'de'), targetKey('lesson_progress', 'de', 7));

console.log('TARGET STORAGE ALL LANGUAGE CONTOURS: PASS');
