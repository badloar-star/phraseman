'use strict';
const { createHash } = require('node:crypto');
const { buildBulkStagePlan, parseBulkStagePlanRequest } = require('../functions/lib/content_factory/bulk_stage_plan.js');
const { contentStageReviewFingerprint } = require('../functions/lib/content_factory/review_fingerprint.js');
const { prepareArtifactEdit } = require('../functions/lib/content_factory/artifact_edit.js');

const input = parseBulkStagePlanRequest({ requestId: 'r10a-smoke', idempotencyKey: 'bulk-smoke-1', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Smoke operator APIs', kinds: ['lesson_outline'], lessonRange: { start: 1, end: 3 }, dependencyPolicy: 'approved_only' });
const first = buildBulkStagePlan(input, []);
const replay = buildBulkStagePlan(parseBulkStagePlanRequest({ ...input, lessonRange: undefined, scopes: [...input.scopes].reverse(), kinds: [...input.kinds].reverse() }), []);
if (first.planFingerprint !== replay.planFingerprint || first.units.length !== 3) throw new Error('r10a_bulk_replay_smoke_failed');

const stage = { stageId: 'r10a-smoke:quiz_questions:topic-1:r1', requestId: 'r10a-smoke', kind: 'quiz_questions', scopeId: 'topic-1', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', count: 10, revision: 1, artifactId: 'artifact:r10a-smoke:quiz_questions:topic-1:r1', objectPath: 'base.json', objectGeneration: '1', contentHash: 'a'.repeat(64), qaReceipt: { status: 'passed' }, groundingReceipt: { hash: 'g' } };
const item = (index) => ({ id: `q${index}`, prompt: `Question ${index}?`, choices: ['A', 'B', 'C', 'D'], correctIndex: 0, optionExplanations: ['a', 'b', 'c', 'd'], difficulty: index < 4 ? 'easy' : index < 8 ? 'medium' : 'hard', skillTag: 'travel', sourcePhraseIds: ['p1'] });
const base = { stage: 'quiz_questions', items: Array.from({ length: 10 }, (_, index) => item(index)) };
const candidate = structuredClone(base); candidate.items[0].prompt = 'Corrected question?';
const edit = prepareArtifactEdit(stage, base, candidate, 'edit-smoke-1');
const beforeFingerprint = contentStageReviewFingerprint(stage.stageId, stage);
const afterFingerprint = contentStageReviewFingerprint(edit.newStageId, { ...stage, stageId: edit.newStageId, revision: edit.revision, artifactId: edit.newArtifactId, contentHash: 'b'.repeat(64), objectPath: edit.objectPath, objectGeneration: '2', baseRevisionIdentity: `${stage.stageId}:1:${stage.contentHash}` });
if (beforeFingerprint === afterFingerprint || edit.diff.totalDetails < 1) throw new Error('r10a_edit_fingerprint_smoke_failed');

const evidence = { release: 'R10A', providerCalls: 0, deployment: 'not_performed', bulk: { planned: first.units.length, fingerprint: first.planFingerprint, replayStable: true }, edit: { revision: edit.revision, changedPaths: edit.diff.details.map((detail) => detail.path), fingerprintChanged: true } };
const manifestHash = createHash('sha256').update(JSON.stringify(evidence)).digest('hex');
process.stdout.write(`${JSON.stringify({ ok: true, ...evidence, manifestHash }, null, 2)}\n`);
