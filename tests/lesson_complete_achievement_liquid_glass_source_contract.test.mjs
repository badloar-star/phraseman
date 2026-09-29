import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../app/lesson_complete.tsx', import.meta.url), 'utf8');

test('achievement notification is a glass surface without changing its real actions', () => {
  assert.match(source, /function AchievementNotifModal/);
  // зачем: 2026-09-29 окно перенесено на токены Liquid Glass (непрозрачная основа темы вместо glassFill).
  assert.match(source, /transform: \[\{ translateY \}\],[\s\S]{0,120}backgroundColor: glass\.opaqueSheet/);
  assert.match(source, /name="share-outline"[\s\S]{0,1200}onPress=\{\(\) => \{ hapticTap\(\); dismiss\(\); \}\}/);
  assert.match(source, /await Share\.share\(\{ message: shareMessage\(\) \}\)/);
});
