// PM-220: команда navpaint — разбор [NAV-PAINT] по группам и честное «нет бюджета» до baseline устройств.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { evaluateNavPaint, loadBudgets, parseNavPaint } from '../scripts/pm220_perf_gates.mjs';

const log = [
  'W ReactNativeJS: [NAV-PAINT] group=training route=/lesson1 ms=120',
  'W ReactNativeJS: [NAV-PAINT] group=training route=/flashcards_blitz_session ms=180',
  'W ReactNativeJS: [NAV-PAINT] group=tab route=/home ms=40',
  'unrelated line',
].join('\n');

test('parses values per group', () => {
  assert.deepEqual(parseNavPaint(log), { training: [120, 180], tab: [40] });
});

test('null budgets are reported as missing, never as OK', () => {
  const budget = { minSamples: 1, groups: { training: { maxMedianMs: null, maxP90Ms: null } } };
  const r = evaluateNavPaint(parseNavPaint(log), budget);
  assert.equal(r.ok, false);
  assert.deepEqual(r.missingBudget, ['training']);
});

test('a slower median than the budget is a regression', () => {
  const budget = { minSamples: 2, groups: { training: { maxMedianMs: 100, maxP90Ms: 400 } } };
  const r = evaluateNavPaint(parseNavPaint(log), budget);
  assert.equal(r.ok, false);
  assert.match(r.problems.join('\n'), /training: медиана 120 мс > 100 мс/);
});

test('config has the navPaint section with all three groups', () => {
  const b = loadBudgets();
  assert.deepEqual(Object.keys(b.navPaint.groups).sort(), ['screen', 'tab', 'training']);
});

test('the marker is wired in the root layout', () => {
  const layout = fs.readFileSync('app/_layout.tsx', 'utf8');
  assert.match(layout, /noteNavRoute\(pathname\);/);
});
