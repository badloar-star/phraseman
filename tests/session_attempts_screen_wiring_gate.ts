import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const screens = [
  'app/lesson1.tsx',
  'app/lesson_words.tsx',
  'app/lesson_irregular_verbs.tsx',
  'app/mistake_practice_session.tsx',
  'app/flashcards_swipe.tsx',
  'app/flashcards_blitz_session.tsx',
  'app/flashcards_listening_session.tsx',
  'app/flashcards_speaking_session.tsx',
  'app/learning_v2_direct_session_player_v1.tsx',
  'app/learning-v2/session/[id].tsx',
] as const;

/**
 * Аргументы вызова useSessionAttemptAutoReset — по БАЛАНСУ скобок.
 *
 * зачем (аудит 2026-09-03): наивный `indexOf('});')` обрывался на первом же
 * вложенном вызове внутри аргументов (например `() => track({ a: 1 });`) и
 * гейт ложно ронял корректный экран, не увидев `hydrated` дальше по тексту.
 * Считаем скобки — тогда срез не зависит от того, как автор оформил колбэки.
 */
function autoResetArguments(source: string, relativeFile: string): string {
  const callStart = source.indexOf('useSessionAttemptAutoReset({');
  assert.ok(callStart >= 0, `${relativeFile}: вызов useSessionAttemptAutoReset не найден`);
  const open = source.indexOf('{', callStart);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const char = source[i];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  assert.fail(`${relativeFile}: не удалось разобрать аргументы useSessionAttemptAutoReset`);
}

for (const relativeFile of screens) {
  const source = fs.readFileSync(path.join(root, relativeFile), 'utf8');
  assert.ok(source.includes('SessionAttemptsHud'), `${relativeFile} has no attempts HUD`);
  assert.ok(source.includes('useSessionAttempts'), `${relativeFile} has no attempts controller`);
  assert.ok(source.includes('useSessionAttemptAutoReset'), `${relativeFile} has no automatic reset`);
  assert.ok(!source.includes('SessionAttemptsRecoveryModal'), `${relativeFile} must not mount recovery modal`);
  assert.ok(!source.includes('Попытка потеряна'), `${relativeFile} contains the forbidden toast`);

  /*
   * зачем (2026-09-03): гейт запрещал само ИМЯ `recoverWithGift`, а отменено
   * было не оно, а РУЧНОЕ восстановление модалкой («потратить подарок?»).
   * Автоспасение подарком живёт внутри useSessionAttemptAutoReset и модалки не
   * показывает — запрет по имени блокировал корректную связку.
   *
   * Проверяем поведение, а не слово: подарок допустим только как проп
   * автосброса, вручную по кнопке его тратить нельзя.
   */
  //
  // Ловим ЛЮБОЙ вызов подарка как функции (`recoverWithGift()`, в том числе
  // через `attempts.recoverWithGift()`), а также передачу его прямо в обработчик
  // нажатия — включая многострочную стрелку, где `onPress` и вызов на разных
  // строках. Передача подарка ПРОПОМ автосбросу (`recoverWithGift:`) остаётся
  // разрешённой: спасение автоматическое, кнопки у него нет.
  const manualGiftCall = /recoverWithGift\s*\(|onPress[\s\S]{0,120}?recoverWithGift(?!\s*:)/;
  assert.ok(!manualGiftCall.test(source), `${relativeFile} must not spend the gift manually`);

  /*
   * Главное правило этого гейта (владелец 2026-09-03: «три ошибки — экран завис
   * намертво»): экран с блокировщиком ввода ОБЯЗАН передавать `hydrated`.
   * Без него автосброс молча выходит на первой строке, попытки не
   * восстанавливаются и человек остаётся на мёртвом кадре без выхода.
   */
  assert.ok(
    /hydrated:/.test(autoResetArguments(source, relativeFile)),
    `${relativeFile}: useSessionAttemptAutoReset без hydrated — попытки не восстановятся, экран зависнет`,
  );
}

for (const relativeFile of ['app/arena.tsx', 'app/arena/index.tsx']) {
  const absoluteFile = path.join(root, relativeFile);
  if (!fs.existsSync(absoluteFile)) continue;
  const source = fs.readFileSync(absoluteFile, 'utf8');
  assert.ok(!source.includes('useSessionAttempts'), `${relativeFile} must remain excluded`);
}

console.log(`PASS session attempts screen wiring gate (${screens.length} screens, Arena excluded)`);
