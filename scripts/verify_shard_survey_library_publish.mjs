import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const publisherSource = readFileSync(new URL('./publish_shard_survey_library.mjs', import.meta.url), 'utf8');
assert.match(publisherSource, /const SURVEY_APP_ROUTES = new Set\(/);
assert.match(publisherSource, /if \(!SURVEY_APP_ROUTES\.has\(route\)\) throw new Error\('preset_action_route_invalid'\)/);
assert.match(publisherSource, /async function rollbackPublication\(/);
assert.match(publisherSource, /await rollbackPublication\(db, beforeState\)/);
assert.match(publisherSource, /checkpointPath/);
assert.match(publisherSource, /existingCreatedAtMs/);

const result = spawnSync(
  process.execPath,
  ['scripts/publish_shard_survey_library.mjs', '--dry-run', '--json'],
  { cwd: new URL('..', import.meta.url), encoding: 'utf8' },
);

assert.equal(result.status, 0, result.stderr || result.stdout);
const plan = JSON.parse(result.stdout);
assert.equal(plan.projectId, 'phraseman-ea0b3');
assert.equal(plan.total, 63);
assert.equal(plan.enabledCount, 0);
assert.equal(plan.activeSurveyId, 'survey_preset_001');
assert.equal(plan.surveys[0].surveyId, 'survey_preset_001');
assert.ok(plan.surveys.every((survey) => survey.enabled === false));
assert.equal(new Set(plan.surveys.map((survey) => survey.surveyId)).size, 63);
assert.ok(plan.surveys.every((survey) => survey.rewardShards === 1));
assert.ok(plan.surveys.every((survey) => survey.minDaysBetweenSurveys >= 1));
assert.ok(plan.surveys.every((survey) => survey.questions.length === 1));
assert.ok(plan.surveys.every((survey, order) => (
  survey.rotation?.enabled === true
  && survey.rotation.order === order
  && survey.rotation.anchorUtcDay === '2026-09-12'
  && survey.rotation.version === 'owner-selected-63-v1'
)));

console.log('PASS shard survey library publication plan');
