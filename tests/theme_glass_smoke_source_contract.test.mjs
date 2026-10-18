// зачем (владелец 2026-09-30, темы 2.0): «Максимум» — цветная дымка ВНУТРИ стеклянных карточек,
// стекло остаётся непрозрачным; в «Спокойно» и «Акценте» дымки нет вовсе.
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const smoke = fs.readFileSync('components/v2/ThemeGlassSmoke.tsx', 'utf8');

test('smoke renders only for the max level and never paints an opaque layer', () => {
  assert.match(smoke, /if \(glass\.level !== 'max' \|\| !glass\.cardSmoke\) return null;/);
  assert.match(smoke, /pointerEvents="none"/);
  assert.doesNotMatch(smoke, /backgroundColor/);
});

test('glass kits and the Themes list carry the smoke layer', () => {
  for (const file of [
    'components/settings/SettingsGlassRows.tsx',
    'components/friends/FriendsGlassKit.tsx',
    'components/lessons/LessonMenuGlass.tsx',
    'app/settings_themes.tsx',
  ]) {
    // зачем (владелец 18.10 «острые углы на плашках»): слой обязан знать скругление карточки
    assert.match(fs.readFileSync(file, 'utf8'), /<ThemeGlassSmoke glass=\{glass\} radius=\{\w+\} \/>/, file);
  }
});

test('smoke clips itself to the card radius — no square corners behind rounded cards', () => {
  assert.match(smoke, /style=\{\[StyleSheet\.absoluteFill, \{ borderRadius: radius, overflow: 'hidden' \}\]\}/);
  assert.match(smoke, /radius: number;/);
});
