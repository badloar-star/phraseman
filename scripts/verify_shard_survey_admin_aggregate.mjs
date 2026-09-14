import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../admin/v2/legacy.html', import.meta.url), 'utf8');
const sectionStart = source.indexOf('// Опросы за осколки (shard-survey)');
const sectionEnd = source.indexOf('const REWARD_TYPES', sectionStart);
const section = source.slice(sectionStart, sectionEnd);
const markupStart = source.indexOf('<div id="tab-surveys"');
const markupEnd = source.indexOf('<!-- ══ Paywall A/B эксперимент', markupStart);
const markup = source.slice(markupStart, markupEnd);

assert.ok(sectionStart >= 0 && sectionEnd > sectionStart, 'survey script section must exist');
assert.ok(markupStart >= 0 && markupEnd > markupStart, 'survey markup must exist');
assert.match(markup, /Открыть результаты/);
assert.match(markup, /onclick="window\.ssSelectTodaySurvey && window\.ssSelectTodaySurvey\(\)"/);
assert.match(markup, /<details id="ss-feed-panel"/);
assert.match(markup, /Комментарии и ответы/);
assert.match(section, /window\.ssScrollToResults = function ssScrollToResults\(\)/);
assert.match(section, /document\.getElementById\('ss-results-panel'\)/);
assert.match(section, /await window\.ssSelectSurveyRow\(surveyId\);/);
assert.match(section, /window\.ssScrollToResults\(\);/);
assert.doesNotMatch(section, /window\.ssScrollToFeed\(\);/);

console.log('PASS shard survey admin aggregate-results contract');
