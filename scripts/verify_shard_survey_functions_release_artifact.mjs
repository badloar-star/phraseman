import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

execFileSync(process.execPath, ['scripts/build_shard_survey_functions_release_artifact.mjs'], {
  cwd: new URL('..', import.meta.url),
  stdio: 'inherit',
});

const root = new URL('../.codex-tmp/shard-survey-functions-release/', import.meta.url);
const bundle = readFileSync(new URL('functions/index.js', root), 'utf8');
const metadata = JSON.parse(readFileSync(new URL('functions/build-meta.json', root), 'utf8'));
const config = JSON.parse(readFileSync(new URL('firebase.json', root), 'utf8'));
const inputs = Object.keys(metadata.inputs).join('\n');

assert.match(bundle, /getActiveShardSurvey/);
assert.match(bundle, /submitShardSurvey/);
assert.match(bundle, /adminWriteShardSurvey/);
assert.match(bundle, /action: o\.action/);
assert.match(bundle, /enforceAppCheck: ENFORCE_APP_CHECK/);
assert.doesNotMatch(inputs, /arena_v2|super_sunday|admin_alerts/);
const entry = readFileSync(new URL('functions/entry.ts', root), 'utf8');
assert.match(entry, /getActiveShardSurvey,/);
assert.match(entry, /submitShardSurvey,/);
assert.match(entry, /adminWriteShardSurvey,/);
assert.match(entry, /export \{ getActiveShardSurvey, submitShardSurvey, adminWriteShardSurvey \}/);
assert.deepEqual(config.functions, { source: 'functions', codebase: 'default', runtime: 'nodejs22', ignore: ['node_modules', '.git', 'build-meta.json', 'entry.ts'] });
assert.equal(existsSync(new URL('functions/service-account.json', root)), false);

console.log(`PASS isolated survey functions artifact (${Object.keys(metadata.inputs).length} source inputs)`);
