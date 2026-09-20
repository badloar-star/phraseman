import assert from 'node:assert/strict';
import { resolveVideoChannelForStudyTarget } from '../app/video_language_contour';

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
