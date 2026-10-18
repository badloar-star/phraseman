import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// зачем: владелец 2026-09-29 — окна аккаунта (смена имени, удаление, выход,
// «реферальный доступ закончился») переносим на Liquid Glass по макетам
// profile.html PRF-19/20/21 и overlays-more.html OM-REFERRAL-ACCESS-ENDED.
// Контракт охраняет: активные токены 13 тем, нейтральный CTA (без зелёного),
// запреты владельца (толстые обводки, сжатие шрифта) и сохранность логики.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const nickname = read('components/account/NicknameEditModal.tsx');
const del = read('components/DeleteAccountConfirmModal.tsx');
const logout = read('components/account/AccountLogoutFlow.tsx');
const referral = read('app/referral_access_ended_modal.tsx');

const ALL = { nickname, del, logout, referral };

for (const [name, source] of Object.entries(ALL)) {
  test(`${name}: берёт материал из активной темы Liquid Glass и не нарушает запреты владельца`, () => {
    assert.ok(source.includes('liquidGlassTokens('), 'токены 13 тем');
    assert.ok(source.includes('glass.accent') || name === 'referral' || name === 'del', 'нейтральный CTA темы');
    assert.ok(!/\bt\.correct\b/.test(source), 'зелёная поверхность/текст убраны');
    assert.ok(!/borderWidth:\s*(?:[2-9]|\d{2,})/.test(source), 'нет толстых обводок');
    assert.ok(!/borderTopWidth|borderBottomWidth:\s*[2-9]/.test(source), 'нет разделителей-обводок');
    assert.ok(!source.includes('adjustsFontSizeToFit'), 'нет сжатия шрифта');
    assert.ok(!/color:\s*'#(?:fff|000)/i.test(source), 'нет жёстких белых/чёрных цветов текста');
  });
}

test('NicknameEditModal: шторка Liquid Glass, вся логика смены имени на месте', () => {
  assert.ok(nickname.includes('placement="bottom"'), 'макет PRF-19 — нижняя шторка');
  assert.ok(nickname.includes('glass.opaqueSheet'), 'непрозрачная основа');
  assert.ok(nickname.includes('glass.accentInk'), 'текст CTA — чернила темы');
  // 18.10 (владелец): имя применяется само по мере ввода — одна кнопка «Готово», без «Отмены».
  for (const id of ['nickname-input', 'nickname-save', 'nickname-save-label', 'nickname-availability']) {
    assert.ok(nickname.includes(`"${id}"`), `testID ${id}`);
  }
  for (const token of ['onOptimisticApply(name)', 'onRollback(previous)', 'onNotice(null)', "reserveNameDetailed(name, previous, { source: 'settings' })",
    'appliedNameRef', 'queuedNameRef', 'NAME_APPLY_DEBOUNCE_MS = 400', "availabilityStatus === 'taken'", 'motionVariant']) {
    assert.ok(nickname.includes(token), token);
  }
  assert.ok(nickname.includes('t.wrong'), 'занятое имя — семантический цвет ошибки');
  assert.ok(nickname.includes('accessibilityLabel'), 'доступность');
  assert.ok(/minHeight:\s*(?:4[4-9]|[5-9]\d)/.test(nickname), 'область нажатия >= 44dp');
});

test('DeleteAccountConfirmModal: слово-подтверждение, деструктив только семантикой ошибки, логика удаления цела', () => {
  assert.ok(del.includes('glass.opaqueSheet'), 'непрозрачная основа');
  assert.ok(del.includes('t.wrongBg') && del.includes('t.wrong'), 'деструктивное действие — цвет ошибки');
  // 12.10: плашки об удалении нет (правило владельца 22.09 «уведомлений об удалении не показывать никогда»).
  assert.ok(!del.includes('markAccountDeletedNoticePending()'), 'уведомление об удалении не ставится');
  for (const token of ['beginAccountDeletion()', 'deleteConfirmMatches', 'deleteInFlightRef',
    "emitAppEvent('account_deleted')", 'showInfoAlert(', 'runDangerShake', 'scrollContent={false}', 'avoidKeyboard',
    'keyboardShouldPersistTaps="handled"']) {
    assert.ok(del.includes(token), token);
  }
  for (const id of ['delete-account-confirm-input', 'delete-account-cancel', 'delete-account-confirm', 'delete-account-modal-hybrid']) {
    assert.ok(del.includes(`"${id}"`), `testID ${id}`);
  }
  assert.ok(!del.includes('DuoPressable') && !del.includes('PressableHybrid'), 'объёмные кнопки заменены стеклянными');
  assert.ok(/minHeight:\s*(?:4[4-9]|[5-9]\d)/.test(del), 'область нажатия >= 44dp');
});

test('AccountLogoutFlow: один нативный Modal на три стадии, выход и отказ работают как раньше', () => {
  assert.ok(logout.includes('glass.opaqueSheet'), 'непрозрачная основа');
  assert.ok((logout.match(/^\s*<Modal$/gm) ?? []).length === 1, 'ровно один нативный Modal');
  // 12.10 (вариант Б мгновенного выхода): первая попытка — с потолком синхронизации LOGOUT_SYNC_DEADLINE_MS.
  for (const token of ['signOutAndWipeForAccountSwitch({ syncDeadlineMs: LOGOUT_SYNC_DEADLINE_MS, allowWipeWithoutSync: true })', 'allowWipeWithoutSync: true', "onStageChange('wiping')",
    "onStageChange('failed')", "onStageChange('idle')", 'onSignedOut({ synced', 'setFailureText(', 'logoutStartedRef']) {
    assert.ok(logout.includes(token), token);
  }
  for (const id of ['account-logout-confirm', 'account-logout-failed-close']) {
    assert.ok(logout.includes(`"${id}"`), `testID ${id}`);
  }
  // 30.09 (макет overlays-runtime.html OR-ACCOUNT-SWITCH-*): отказ — нейтральный замок, два исхода.
  assert.ok(logout.includes('name="lock-closed"'), 'отказ — значок замка из макета');
  assert.ok(logout.includes('"account-logout-failed-retry"'), 'повтор только до маркера');
  assert.ok(logout.includes("forced.reason === 'recovery_required'"), 'после маркера — без слепого повтора');
  assert.ok(/minHeight:\s*(?:4[4-9]|[5-9]\d)/.test(logout), 'область нажатия >= 44dp');
});

test('ReferralAccessEndedModal: уведомление-совместимость без обещаний наград, пропсы на месте', () => {
  assert.ok(referral.includes('glass.opaqueSheet'), 'непрозрачная основа');
  assert.ok(referral.includes('glass.accent') && referral.includes('glass.accentInk'), 'нейтральный CTA');
  for (const token of ['onInviteFriend', 'onOpenFullAccess', 'onClose', 'accessibilityLabel={closeLabel}', 'onRequestClose={onClose}',
    'ResponsiveModalScrollView']) {
    assert.ok(referral.includes(token), token);
  }
  // 04.10: рулетка вернулась (D99), кадр OM-REFERRAL-ACCESS-ENDED снова зовёт друга —
  // но только если вызов передал onInviteFriend (раздел включён). Без пропса — один путь.
  assert.ok(referral.includes('onPress={onInviteFriend ?? onOpenFullAccess}'), 'приглашение главное, полный доступ — запасной путь');
  assert.ok(referral.includes("'Пригласить друга'") && referral.includes("'Доступ можно открыть снова'"), 'тексты кадра');
});
