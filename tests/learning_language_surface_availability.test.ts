import assert from 'node:assert/strict';
import {
  learningLanguageSurfaceAvailability,
  languageRemainsSelectable,
} from '../app/learning_language_surface_availability';

const unavailable = learningLanguageSurfaceAvailability('es', 'learning_v2', 'preparing');
assert.equal(unavailable.target, 'es');
assert.equal(unavailable.surface, 'learning_v2');
assert.equal(unavailable.status, 'preparing');
assert.equal(unavailable.fallbackTarget, null);
assert.equal(languageRemainsSelectable('es'), true);

const available = learningLanguageSurfaceAvailability('de', 'videos', 'ready');
assert.equal(available.target, 'de');
assert.equal(available.status, 'ready');
assert.equal(available.fallbackTarget, null);

console.log('LEARNING LANGUAGE SURFACE AVAILABILITY: PASS');
