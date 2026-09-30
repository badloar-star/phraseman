import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// зачем: владелец 2026-09-30 — разделы D, F, G, H, I, J, K, L и «Смешать темы»
// макета learn.html переносим на Liquid Glass. Контракт охраняет: токены стекла в
// каждом файле, нет нативного Alert.alert в выходе из экзамена, нет сжатия шрифта,
// нет показа XP, нет толстых обводок.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const FILES = [
  'app/lesson1.tsx',
  'app/lesson_words.tsx',
  'components/theory/TheoryLessonView.tsx',
  'app/lesson_help.tsx',
  'app/lesson_irregular_verbs.tsx',
  'app/preposition_drill.tsx',
  'app/combined_lesson_pick.tsx',
  'app/diagnostic_test.tsx',
  'app/level_exam.tsx',
  'components/level-exam/LevelExamV2.tsx',
  'app/exam.tsx',
];

for (const file of FILES) {
  test(`${file}: Liquid Glass и запреты владельца`, () => {
    const s = read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.ok(/liquidGlassTokens\(|useV2GlassStyle|PracticeChrome|PracticeStates|LearnGlass/.test(s), 'токены стекла');
    assert.ok(!s.includes('adjustsFontSizeToFit'), 'нет сжатия шрифта');
    assert.ok(!/borderWidth:\s*(?:[2-9]|\d{2,})/.test(s), 'нет толстых обводок');
    assert.ok(!/['"`]\+\$\{[^}]*\}\s*XP|\+\d+\s*XP/.test(s), 'XP не показывается');
  });
}

test('exam.tsx: выход из экзамена — стеклянное подтверждение, не Alert.alert', () => {
  const s = read('app/exam.tsx');
  assert.ok(!/Alert\.alert\(/.test(s), 'нет Alert.alert');
  assert.ok(/ThemedConfirmModal|HybridAlertShell/.test(s), 'стеклянное подтверждение');
});
