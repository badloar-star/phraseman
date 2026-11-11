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
  'app/pos_workout_engine.ts',
  // часть 2 (владелец 25.10 кнопками): практика ошибок, итог диалога, экзамен главы, заголовок Пика
  'app/mistake_practice_session.tsx',
  'components/DialogVerdictScreen.tsx',
  'components/spire/SpireHomeTitle.tsx',
];
const BANNED = /минут|попытк|сесси|интро|дрилл|ноль звёзд|ориентир|вручную|чтобы сдать|^бета$/i;
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

// зачем (11.11): шторка занятия удалена вместе с курсом — остаётся проверка, что список уроков не передаёт эти подписи
test('список уроков не передаёт «≈ 5 минут» и «3 попытки»', () => {
  const lessons = fs.readFileSync(path.join(ROOT, 'app/(tabs)/lessons.tsx'), 'utf8');
  assert.doesNotMatch(lessons, /durationLabel=\{/);
  assert.doesNotMatch(lessons, /attemptsLabel=\{/);
});

// зачем (владелец 11.11, пересмотр обрезанных тестов): случай был вырезан целиком вместе с курсом занятий; живая часть возвращена
test('Пик без плашки «бета»', () => {
  const title = fs.readFileSync(path.join(ROOT, 'components/spire/SpireHomeTitle.tsx'), 'utf8');
  assert.doesNotMatch(title, /spire-beta-pill|SPIRE_BETA_LANGS/);
});
