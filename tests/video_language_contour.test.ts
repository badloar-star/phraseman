import assert from 'node:assert/strict';
import { resolveVideoChannelForStudyTarget } from '../app/video_language_contour';

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
const channels = [
  { id: 'english', languageTags: ['en'], order: 1 },
  { id: 'spanish', languageTags: ['es-ES'], order: 2 },
  { id: 'german-late', languageTags: ['de-DE'], order: 9 },
  { id: 'german-first', languageTags: ['de'], order: 3 },
];

assert.equal(resolveVideoChannelForStudyTarget(channels, 'es')?.id, 'spanish');
assert.equal(resolveVideoChannelForStudyTarget(channels, 'de')?.id, 'german-first');
assert.equal(resolveVideoChannelForStudyTarget(channels, 'fr'), null);
assert.notEqual(resolveVideoChannelForStudyTarget(channels, 'fr')?.id, 'english');

console.log('VIDEO LANGUAGE CONTOUR: PASS');
}

if (typeof test === "function") {
  test("video_language_contour", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
