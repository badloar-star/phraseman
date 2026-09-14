import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../admin/v2/legacy.html', import.meta.url), 'utf8');
const markupStart = source.indexOf('<div id="tab-surveys"');
const markupEnd = source.indexOf('<!-- ══ Paywall A/B эксперимент', markupStart);
const scriptStart = source.indexOf('// Опросы за осколки (shard-survey)');
const scriptEnd = source.indexOf('const REWARD_TYPES', scriptStart);
assert.ok(markupStart >= 0 && markupEnd > markupStart, 'survey markup must exist');
assert.ok(scriptStart >= 0 && scriptEnd > scriptStart, 'survey script must exist');

const markup = source.slice(markupStart, markupEnd);
const script = source.slice(scriptStart, scriptEnd);

assert.match(script, /function ssScheduledSurveyRows\(\)/);
assert.match(script, /function ssNearestRotationDate\(survey, nowMs = Date\.now\(\)\)/);
assert.match(script, /window\.ssSelectSurveyRow = async function ssSelectSurveyRow\(surveyId\)/);
assert.match(script, /function ssMiniDistribution\(survey\)/);
assert.match(script, /schedule\.offset - b\.schedule\.offset/);
assert.match(script, /_ssCurrentId = surveyId/);
assert.match(markup, /id="ss-cycle-list"/);
assert.match(markup, /data-ss-view="today"/);
assert.match(markup, /data-ss-view="next7"/);
assert.match(script, /class="ss-cycle-row/);
assert.match(script, /aria-pressed="\$\{selected \? 'true' : 'false'\}"/);
assert.match(script, /class="ss-mini-distribution"/);
assert.match(script, /ss-schedule-relative/);
assert.match(markup, /grid-template-columns:minmax\(420px/);
assert.match(markup, /@media\(max-width:767px\)/);
assert.match(markup, /Комментарии и ответы/);
assert.doesNotMatch(script, /ssSurveyRowAction\(survey\)/);

console.log('PASS shard survey admin master-detail contract');
