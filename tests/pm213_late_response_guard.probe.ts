// PM-213 — «поздний ответ не пишет в чужой аккаунт».
//
// зачем: после смены аккаунта запоздавший сетевой ответ / таймер / очередь не
// имеет права записать данные старого аккаунта в локальное состояние нового.
// В проекте для этого есть поколение аккаунта (app/account_generation.ts):
// isCurrentAccountGeneration(token, stableId) и производные (assertCurrentOwner
// в store, isCapturedAccountGenerationToken). Проба перечисляет ключевые пути
// асинхронной записи и проверяет, что в каждом такой вызов есть.
// Исключения — только с причиной; если исключению появилась защита, проба
// роняется (список может только сжиматься).
//
// Запуск: npx tsx tests/pm213_late_response_guard.probe.ts
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const GUARD = /\b(?:isCurrentAccountGeneration|isCapturedAccountGenerationToken|assertCurrentOwner)\b/;

/** Ключевые пути записи: файл -> что он пишет. Обязаны содержать проверку поколения. */
const GUARDED: Record<string, string> = {
  'app/cloud_sync.ts': 'облачная синхронизация прогресса (локально <-> Firestore)',
  'app/mistake_practice_store.ts': 'журнал «Мои ошибки» (события, страницы манифеста)',
  'app/coin_rank_upgrade_v1.ts': 'повышение ранга монеты + публичный снимок профиля',
  'app/ai_dialog_hint_economy.ts': 'диалоги: экономика подсказок',
  'app/ai_dialog_ownership.ts': 'диалоги: владелец сессии',
  'app/youtube_channel_preference.ts': 'видео: выбранный канал',
  'app/dialogs_progress.ts': 'диалоги: отметка «Пройдено» (markDialogCompleted, PM-200)',
};

/** Исключения: файл -> причина. Только сокращать. */
const EXCEPTIONS: Record<string, string> = {
  'app/ai_dialog_client.ts':
    'только сетевые вызовы premiumDialog* (ответ сервера возвращается вызывающему); локальной записи нет — защиту держат экраны-вызывающие и ai_dialog_ownership',
  'app/dialogue_v2_completion_client.ts':
    'сетевой клиент без локальной записи; результат применяет экран через ownership-проверки',
  'app/mistake_practice_capture.ts':
    'адаптер над mistake_practice_store: запись идёт через appendMistakeEvent, где assertCurrentOwner уже стоит',
};

const read = (rel: string): string => {
  const full = path.join(root, rel);
  assert.ok(existsSync(full), `PM-213: файл из списка не найден: ${rel}`);
  return readFileSync(full, 'utf8');
};

// зачем: Q9 — видео не источник монет (список D104/D105/D109). Клиент
// начисления рун за просмотр удалён; его возврат — регрессия, а не новая запись.
assert.ok(
  !existsSync(path.join(root, 'app/video_watch_runes_client.ts')),
  'PM-213: app/video_watch_runes_client.ts вернулся — видео не источник монет (Q9)',
);

const missing: string[] = [];
for (const [rel, what] of Object.entries(GUARDED)) {
  if (!GUARD.test(read(rel))) missing.push(`${rel} (${what})`);
}
assert.deepEqual(
  missing,
  [],
  `PM-213: нет проверки поколения аккаунта перед записью в:\n${missing.join('\n')}\nДобавь isCurrentAccountGeneration перед записью либо внеси файл в EXCEPTIONS с причиной.`,
);

const stale: string[] = [];
for (const [rel, reason] of Object.entries(EXCEPTIONS)) {
  assert.ok(reason.trim().length > 20, `PM-213: у исключения ${rel} нет причины`);
  if (GUARD.test(read(rel))) stale.push(rel);
}
assert.deepEqual(
  stale,
  [],
  `PM-213: у исключений теперь есть защита — удали их из EXCEPTIONS (список только сокращается):\n${stale.join('\n')}`,
);

console.log(
  '[PM-213] OK: guarded=' + Object.keys(GUARDED).length + ' exceptions=' + Object.keys(EXCEPTIONS).length,
);
