import assert from 'node:assert/strict';
import {
  learningLanguageSurfaceAvailability,
  languageRemainsSelectable,
} from '../app/learning_language_surface_availability';

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
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
}

if (typeof test === "function") {
  test("learning_language_surface_availability", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
