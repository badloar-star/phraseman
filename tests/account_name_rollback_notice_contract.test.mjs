// зачем: откат имени не должен быть молчаливым — плашка с причиной + «Прежнее имя восстановлено.» по макету OR-NAME-*,
// и причина отката всегда пишется в [NAME-CHANGE].
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const account = fs.readFileSync(new URL('../app/account_details.tsx', import.meta.url), 'utf8');
const modal = fs.readFileSync(new URL('../components/account/NicknameEditModal.tsx', import.meta.url), 'utf8');

test('плашка отката показывает причину и строку «Прежнее имя восстановлено.»', () => {
  assert.ok(account.includes('testID="account-nickname-inline-notice"'));
  assert.ok(account.includes('{nameNotice}'));
  assert.ok(account.includes("'Прежнее имя восстановлено.'"));
  assert.ok(account.includes('testID="account-nickname-restored"'));
});

test('вид плашки по overlay-runtime.css: радиус 16, поля 13/14, текст 13/19, итог 13/17 (шкала 16/13 главнее макета — владелец 04.10)', () => {
  const block = account.slice(account.indexOf('testID="account-nickname-inline-notice"'));
  assert.ok(block.includes('borderRadius: 16') && block.includes('paddingVertical: 13') && block.includes('paddingHorizontal: 14'));
  // 10.10: шкала 16/13 главнее макета (PORT_READY_GATE.md, владелец 04.10) — итог 13 вместо макетных 12.
  assert.ok(block.includes('fontSize: 13, lineHeight: 19') && block.includes('fontSize: 13, lineHeight: 17'));
});

test('каждый откат пишет [NAME-CHANGE] с причиной, три причины переданы', () => {
  // 18.10 (владелец: «убери правило 14 дней», имя применяется сразу при вводе): откат только на «занято»/старый ответ кулдауна,
  // сбой сети/входа — имя остаётся на телефоне (досылка nickname_guard), причина каждого исхода в журнале.
  assert.ok(modal.includes('[NAME-CHANGE] rollback reason=${reservation.status}'));
  assert.ok(modal.includes('[NICK-SAVE] apply:kept_local'));
  assert.ok(!modal.includes('14 дней'));
  assert.ok(!modal.includes('Проверим при сохранении'));
});
