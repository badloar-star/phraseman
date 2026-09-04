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
  const manualGiftCall = /onPress[^\n]*recoverWithGift|recoverWithGift\(\)/;
  assert.ok(!manualGiftCall.test(source), `${relativeFile} must not spend the gift manually`);

  /*
   * Главное правило этого гейта (владелец 2026-09-03: «три ошибки — экран завис
   * намертво»): экран с блокировщиком ввода ОБЯЗАН передавать `hydrated`.
   * Без него автосброс молча выходит на первой строке, попытки не
   * восстанавливаются и человек остаётся на мёртвом кадре без выхода.
   */
  const autoResetCall = source.slice(source.indexOf('useSessionAttemptAutoReset({'));
  const autoResetArgs = autoResetCall.slice(0, autoResetCall.indexOf('});') + 3);
  assert.ok(
    /hydrated:/.test(autoResetArgs),
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
