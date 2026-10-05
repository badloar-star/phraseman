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

test('вид плашки по overlay-runtime.css: радиус 16, поля 13/14, текст 13/19, итог 12/17 (макеты главнее D145 — владелец 05.10 11:10)', () => {
  const block = account.slice(account.indexOf('testID="account-nickname-inline-notice"'));
  assert.ok(block.includes('borderRadius: 16') && block.includes('paddingVertical: 13') && block.includes('paddingHorizontal: 14'));
  assert.ok(block.includes('fontSize: 13, lineHeight: 19') && block.includes('fontSize: 12, lineHeight: 17'));
});

test('каждый откат пишет [NAME-CHANGE] с причиной, три причины переданы', () => {
  assert.ok(modal.includes('[NAME-CHANGE] rollback reason='));
  assert.ok(modal.includes("rollbackToOldName('taken')"));
  assert.ok(modal.includes("rollbackToOldName('cooldown_14d')"));
  assert.ok(modal.includes('rollbackToOldName(`reserve_${reservation.status}`)'));
  assert.ok(!modal.includes('rollbackToOldName()'));
});
