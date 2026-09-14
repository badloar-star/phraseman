import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

execFileSync(process.execPath, ['scripts/build_shard_survey_admin_release_artifact.mjs'], {
  cwd: new URL('..', import.meta.url),
  stdio: 'inherit',
});

const artifact = new URL('../.codex-tmp/shard-survey-admin-release/', import.meta.url);
const releaseAdmin = readFileSync(new URL('public/legacy.html', artifact), 'utf8');
const currentAdmin = readFileSync(new URL('../admin/v2/legacy.html', import.meta.url), 'utf8');
const headAdmin = execFileSync('git', ['show', 'HEAD:admin/v2/legacy.html'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const config = JSON.parse(readFileSync(new URL('firebase.json', artifact), 'utf8'));
const projectConfig = JSON.parse(readFileSync(new URL('.firebaserc', artifact), 'utf8'));

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `missing section ${startMarker}`);
  return source.slice(start, end);
}

const markupStart = '<div id="tab-surveys"';
const markupEnd = '<!-- ══ Paywall A/B эксперимент';
const scriptStart = '// Опросы за осколки (shard-survey)';
const scriptEnd = 'const REWARD_TYPES';
assert.equal(section(releaseAdmin, markupStart, markupEnd), section(currentAdmin, markupStart, markupEnd));
assert.equal(section(releaseAdmin, scriptStart, scriptEnd), section(currentAdmin, scriptStart, scriptEnd));
assert.equal(releaseAdmin.slice(0, releaseAdmin.indexOf(markupStart)), headAdmin.slice(0, headAdmin.indexOf(markupStart)));
assert.match(releaseAdmin, /Библиотека 63 опросов/);
assert.match(releaseAdmin, /id="ss-cycle-list"/);
assert.match(releaseAdmin, /Комментарии и ответы/);
assert.match(releaseAdmin, /window\.ssScrollToResults/);
assert.match(releaseAdmin, /window\.ssSelectSurveyRow/);
assert.match(releaseAdmin, /function ssScheduledSurveyRows\(\)/);
assert.match(releaseAdmin, /const SS_ROTATION_ANCHOR_UTC_DAY = '2026-09-12'/);
assert.match(releaseAdmin, /label:'Идёт сегодня'/);
assert.match(releaseAdmin, /label:'В ротации'/);
assert.match(releaseAdmin, /Управляется UTC-ротацией/);
assert.match(releaseAdmin, /за все появления опроса/);
assert.equal(config.hosting.target, 'admin');
assert.equal(config.hosting.public, 'public');
assert.equal('functions' in config, false);
assert.equal(projectConfig.targets['phraseman-ea0b3'].hosting.admin[0], 'phraseman-ea0b3');

console.log('PASS isolated shard-survey admin hosting artifact');
