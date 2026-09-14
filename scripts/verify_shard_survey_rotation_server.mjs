import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../functions/src/shard_survey.ts', import.meta.url), 'utf8');
const clientController = readFileSync(new URL('../app/survey_flow_controller.ts', import.meta.url), 'utf8');

assert.match(source, /const occurrence = shardSurveyRotationOccurrenceAt\(nowMs\)/);
assert.match(source, /surveyId: occurrence \? occurrence\.occurrenceId : config\.surveyId/);
assert.match(source, /canonicalSurveyId: config\.surveyId/);
assert.match(source, /doc\(occurrence\.surveyId\)\.get\(\)/);
assert.match(source, /isShardSurveyRotationConfigForOccurrence\(rotationConfig, occurrence\)/);
assert.match(source, /shardSurveyResponseDocId\(occurrence\.occurrenceId, stableUid\)/);
assert.match(source, /shardSurveyRewardClaimId\(occurrenceId\)/);
assert.match(source, /eventId: occurrenceId/);
assert.match(source, /payload: \{ surveyId: canonicalSurveyId, occurrenceId, occurrenceDay \}/);
assert.match(source, /const statsRef = db\.collection\(STATS\)\.doc\(canonicalSurveyId\)/);
assert.ok(source.includes('survey: responseSnap.exists ? null : presentSurvey(rotationConfig, lang, occurrence),'));
assert.ok(source.includes('completion: responseSnap.exists ? completion : null,'));
assert.match(source, /requestedSurveyId === occurrence\.occurrenceId/);
assert.match(clientController, /eventId: survey\.surveyId/);
assert.doesNotMatch(clientController, /eventId: response\.eventId/);

const replayBranch = source.indexOf('if (claimSnap.exists || responseSnap.exists)');
const rateLimitBranch = source.indexOf('const rateDecision = evaluateSubmitRateLimit', replayBranch);
const statsIncrement = source.indexOf('const nextStats: SurveyStats = incrementStats', replayBranch);
assert.ok(replayBranch >= 0, 'idempotent replay branch missing');
assert.ok(rateLimitBranch > replayBranch, 'same-occurrence replay must bypass rate limiting');
assert.ok(statsIncrement > rateLimitBranch, 'aggregate increment must happen only for a new occurrence');
const replayEnd = source.indexOf('// Rate-limit применяется только', replayBranch);
assert.doesNotMatch(source.slice(replayBranch, replayEnd), /tx\.set\(responseRef/);

const adminWriteStart = source.indexOf('// rotation — server-owned publication metadata');
const adminWriteEnd = source.indexOf("return { ok: true, surveyId: parsed.surveyId }", adminWriteStart);
assert.ok(adminWriteStart >= 0 && adminWriteEnd > adminWriteStart, 'admin write block missing');
assert.doesNotMatch(
  source.slice(adminWriteStart, adminWriteEnd),
  /\n\s*rotation\s*:/,
  'admin payload must not overwrite server-owned rotation metadata',
);

console.log('PASS shard survey rotation server contract');
