import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../admin/v2/legacy.html', import.meta.url), 'utf8');

assert.match(source, /const SS_ROTATION_ANCHOR_UTC_DAY = '2026-09-12'/);
assert.match(source, /const SS_ROTATION_VERSION = 'owner-selected-63-v1'/);
assert.match(source, /function ssRotationOccurrence\(nowMs = Date\.now\(\)\)/);
assert.match(source, /function ssIsRotationSurvey\(survey\)/);
assert.match(source, /function ssTodayRotationSurvey\(\)/);
assert.match(source, /return \{ key:'live', label:'Идёт сегодня' \}/);
assert.match(source, /return \{ key:'rotation', label:'В ротации' \}/);
assert.match(source, /const todaySurvey = ssTodayRotationSurvey\(\)/);
assert.match(source, /set\('ss-kpi-today', todaySurvey \? '1' : '0'\)/);
assert.match(source, /ssTodayRotationSurvey\(\) \|\| _ssSurveys\.find\(\(s\) => s\.enabled\)/);
assert.match(source, /Управляется UTC-ротацией/);
assert.match(source, /за все появления опроса/);
assert.match(source, /\.ss-status-pill\.rotation/);

console.log('PASS shard survey admin UTC rotation contract');
