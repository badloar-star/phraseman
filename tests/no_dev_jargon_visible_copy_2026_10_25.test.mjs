// зачем (владелец 25.10 через координатора, жалоба на тест: «это черновик разраба или приложение?!»): ЗАМОК — в видимых текстах занятия
// нет механики, времени и жаргона разработчика: «≈ 5 минут», «3 попытки», «Сессия», «интро», «slot-дриллы», «ноль звёзд».
// Проверяются русские строки (ru: '…') перечисленных файлов; комментарии не считаются. Исключение — разработческий переключатель
// «Разблокировать все сессии для тестирования» (`__DEV__ && ENABLE_DEV_TOOLS`, ученик его не видит).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = [
  'app/(tabs)/lessons.tsx',
  'app/learning_v2_session_intro_check.tsx',
  'app/learning_v2_session_intro.tsx',
  'app/pos_workout_engine.ts',
];
const BANNED = /минут|попытк|сесси|интро|дрилл|ноль звёзд/i;
const DEV_ONLY = new Set(['Разблокировать все сессии для тестирования']);

function ruStrings(src) {
  const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const noLine = noBlock.split('\n').map((l) => l.replace(/^\s*\/\/.*$/, '')).join('\n');
  const out = [];
  const re = /\bru:\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g;
  let m;
  while ((m = re.exec(noLine)) !== null) out.push(m[2]);
  return out;
}

test('видимые ru-строки занятия без механики, времени и жаргона разработчика', () => {
  const bad = [];
  for (const rel of FILES) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const s of ruStrings(src)) {
      if (DEV_ONLY.has(s)) continue;
      if (BANNED.test(s)) bad.push(`${rel}: ${s}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('шторка занятия не передаёт «≈ 5 минут» и «3 попытки», пустые плитки фактов не рисуются', () => {
  const lessons = fs.readFileSync(path.join(ROOT, 'app/(tabs)/lessons.tsx'), 'utf8');
  assert.doesNotMatch(lessons, /durationLabel=\{/);
  assert.doesNotMatch(lessons, /attemptsLabel=\{/);
  const sheet = fs.readFileSync(path.join(ROOT, 'components/LearningV2SessionOutcomeSheet.tsx'), 'utf8');
  assert.match(sheet, /\.filter\(\(stat\) => typeof stat\.value === "string" && stat\.value\.trim\(\)\.length > 0\)/);
  assert.match(sheet, /locked \|\| stats\.length === 0 \? null/);
});

test('проверка интро: нет строки «3 вопроса · до 9 звёзд», «Попытка N» и подсказки «ноль звёзд»', () => {
  const check = fs.readFileSync(path.join(ROOT, 'app/learning_v2_session_intro_check.tsx'), 'utf8');
  assert.doesNotMatch(check, /eyebrowDetail/);
  assert.doesNotMatch(check, /t\.attempt\(/);
  assert.doesNotMatch(check, /skipHint/);
});
