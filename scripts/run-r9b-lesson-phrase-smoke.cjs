'use strict';
const { createHash } = require('node:crypto');
const { acceptLessonPhraseChunk, assembleLessonPhraseCheckpoint, createLessonPhraseCheckpoint, missingLessonPhraseChunkIndexes } = require('../functions/lib/content_factory/lesson_phrase_checkpoint.js');

const grounding = { outline: { coverage: ['daily'], exclusions: [] } };
const expected = { stageId: 'smoke:lesson_phrases:lesson-20:r1', revision: 1, groundingHash: 'a'.repeat(64), cefr: 'A2', grounding, sourceLocale: 'ru', studyTarget: 'en' };
const phrase = (index) => ({ id: `p${index}`, sourceText: `Источник ${index}`, targetText: `Target ${index}`, meaningKey: `meaning-${index}`, cefr: 'A2', coverageTag: 'daily' });
const chunk = (index) => ({ stage: 'lesson_phrases', items: Array.from({ length: 10 }, (_, offset) => phrase(index * 10 + offset)), coverageReceipt: { coveredTags: ['daily'], respectedExclusions: [] } });

let checkpoint = createLessonPhraseCheckpoint(expected);
for (const index of [0, 1, 2]) checkpoint = acceptLessonPhraseChunk(checkpoint, index, chunk(index), expected);
const acceptedBeforeRetry = checkpoint.chunks.slice(0, 3).map((item) => item.contentHash);
let malformedRejected = false;
try { acceptLessonPhraseChunk(checkpoint, 3, { stage: 'lesson_phrases', items: [] }, expected); } catch { malformedRejected = true; }
for (const index of missingLessonPhraseChunkIndexes(checkpoint)) checkpoint = acceptLessonPhraseChunk(checkpoint, index, chunk(index), expected);
const finalArtifact = assembleLessonPhraseCheckpoint(checkpoint, expected);
const acceptedAfterRetry = checkpoint.chunks.slice(0, 3).map((item) => item.contentHash);
if (!malformedRejected || finalArtifact.items.length !== 50 || JSON.stringify(acceptedBeforeRetry) !== JSON.stringify(acceptedAfterRetry)) throw new Error('r9b_smoke_failed');
const manifest = { scenario: '30_of_50_malformed_refill_20', malformedRejected, finalCount: finalArtifact.items.length, acceptedChunkHashes: checkpoint.chunks.map((item) => item.contentHash), preservedInitialChunkHashes: acceptedAfterRetry };
const manifestHash = createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
console.log(JSON.stringify({ status: 'passed', ...manifest, manifestHash }));
