// зачем (PM-044, решение координатора 01.10): огонь серии «заполняется до 10 дней»
// (A1) и статичен — без вечной анимации и без чтений сервера (A2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const source = normalizeEol(readFileSync(new URL('../components/streak/StreakFlameFill.tsx', import.meta.url), 'utf8'));
const start = source.indexOf('export const STREAK_FLAME_FULL_DAYS');
const end = source.indexOf('type Props = ');
const compiled = ts.transpileModule(source.slice(start, end), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = { exports: {} };
Function('module', 'exports', compiled)(mod, mod.exports);
const { streakFlameFillRatio, streakFlameHeat, mixThemeColors, streakFlameCoreOpacity, streakFlameOuterMix } = mod.exports;

test('A1: the flame outline fills in ten steps and stays full after day 10', () => {
  assert.equal(streakFlameFillRatio(0), 0);
  assert.equal(streakFlameFillRatio(-3), 0);
  assert.equal(streakFlameFillRatio(Number.NaN), 0);
  assert.equal(streakFlameFillRatio(1), 0.1);
  assert.equal(streakFlameFillRatio(5), 0.5);
  assert.equal(streakFlameFillRatio(10), 1);
  assert.equal(streakFlameFillRatio(250), 1);
  assert.equal(streakFlameHeat(10), 0);
  assert.equal(streakFlameHeat(20), 0.5);
  assert.equal(streakFlameHeat(30), 1);
  assert.equal(streakFlameHeat(400), 1);
});

// зачем (владелец 04.10): мягкий разгор после 10 дней и в «Спокойно» — ядро от центра растёт 10→15→30,
// а внешний огонь в «Спокойно» не доходит до чистого белого, чтобы ядро было видно.
test('after day 10 the flame glows from the centre, visibly growing to day 30 (calm theme too)', () => {
  assert.equal(streakFlameCoreOpacity(9), 0);
  assert.equal(streakFlameCoreOpacity(10), 0);
  assert.ok(streakFlameCoreOpacity(15) > 0 && streakFlameCoreOpacity(15) < streakFlameCoreOpacity(30));
  assert.equal(streakFlameCoreOpacity(30), 1);
  assert.ok(streakFlameOuterMix(30, true) < 1, 'calm outer flame stays below pure white so the core reads');
  assert.ok(streakFlameOuterMix(30, true) > streakFlameOuterMix(10, true));
});

test('colors come from theme tokens and never invent a value', () => {
  assert.equal(mixThemeColors('#000000', '#FFFFFF', 0.5), '#808080');
  assert.equal(mixThemeColors('bad', '#112233', 0.3), '#112233');
});

test('A2: static — no infinite animation, no network, no new image assets', () => {
  assert.doesNotMatch(source, /withRepeat|Animated\.loop|setInterval/);
  assert.doesNotMatch(source, /firestore|fetch\(|httpsCallable/i);
  assert.doesNotMatch(source, /require\(['"][^'"]+\.(png|webp|jpg)['"]\)/);
  assert.match(source, /liquidGlassTokens\(liquidGlassThemeId\)/);
});

test('streak screen shows the flame instead of the feather (freeze keeps its own icon)', () => {
  const stats = normalizeEol(readFileSync(new URL('../app/streak_stats.tsx', import.meta.url), 'utf8'));
  // зачем (координатор 05.10, Сверка results-007): в плитке «Серия и результаты» — контурный огонь макета results.html.
  assert.match(stats, /<Ionicons name="flame-outline" size=\{28\}/);
  assert.match(stats, /freezeActive\s*\n?\s*\? <StreakChainIcon themeMode=\{themeMode\} frozen/);
});
