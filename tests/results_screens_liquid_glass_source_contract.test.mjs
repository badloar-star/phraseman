import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const glassKit = read('components/results/ResultsGlass.tsx');
const achievements = read('app/achievements_screen.tsx');
const lesson = read('app/lesson_complete.tsx');
const exam = read('components/level-exam/LevelExamResult.tsx');
const sequence = read('components/feedback/ResultsSequence.tsx');

test('results glass kit keeps 44dp targets, 61 tile and no thick borders', () => {
  assert.match(glassKit, /minWidth: 44,/);
  assert.match(glassKit, /minHeight: 44,/);
  assert.match(glassKit, /borderRadius: 16,/);
  assert.match(glassKit, /size = 61/);
  assert.doesNotMatch(glassKit, /borderWidth: [2-9]/);
  assert.doesNotMatch(glassKit, /adjustsFontSizeToFit/);
  assert.doesNotMatch(glassKit, /#[0-9a-f]{3,8}\b/i);
  assert.ok(glassKit.split('\n').length <= 400);
});

test('achievements shelf header/empty state follow results.html RES-ACH', () => {
  // 22.10 (закон владельца «назад везде в одном месте»): «назад» — общая ScreenBackButton, свой ResultsGlassBackButton снят
  assert.match(achievements, /<ScreenBackButton screen="achievements"/);
  assert.match(achievements, /ResultsGlassCountPill/);
  assert.match(achievements, /ResultsGlassEmptyState/);
  assert.match(achievements, /testID="achievements-back"/);
  // подпись-расшифровка под названием экрана убрана (правило владельца)
  assert.doesNotMatch(achievements, /<Text numberOfLines=\{1\} style=\{\{ color: t\.textMuted, fontSize: f\.sub \}\}>\s*\{visibleCountLabel\}/);
  assert.match(achievements, /Полка пока пуста/);
});

test('lesson completion uses glass back button and glass feedback card', () => {
  // 22.10: «назад» итога — общая ScreenBackButton (заставка сохранения и основной экран)
  assert.match(lesson, /<ScreenBackButton screen="lesson_complete"/);
  assert.match(lesson, /<ScreenBackButton screen="lesson_complete_loading"/);
  assert.match(lesson, /presentation="liquid-glass-rate"/);
  assert.match(lesson, /<ResultsSequence/);
});

test('exam result and shared sequence get the pill CTA and tile hero without touching rewards', () => {
  assert.match(exam, /ResultsGlassTile|borderRadius: 16/);
  assert.match(exam, /borderRadius: 24/);
  assert.match(sequence, /glassDefaultTitle/);
  assert.match(sequence, /glassDefaultCta/);
});
