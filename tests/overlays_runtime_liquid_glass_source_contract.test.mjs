import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// зачем: владелец 2026-09-30 — 17 состояний overlays-runtime («Native alerts») рисовались
// нативным Alert.alert (серое системное окно). Контракт охраняет: в переведённых файлах нет
// Alert.alert, окна идут через стеклянные компоненты/хук, токены 13 тем Liquid Glass,
// запреты владельца (сжатие шрифта, XP) и сохранность тех же обработчиков.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const files = {
  settings: read('app/(tabs)/settings.tsx'),
  nickname: read('components/account/NicknameEditModal.tsx'),
  lingman: read('app/lingman_videos.tsx'),
  paywall: read('app/paywall_purchase.ts'),
  dialogs: read('components/DialogsTabContent.tsx'),
};
const hook = read('hooks/use-glass-alert.tsx');
const inline = read('components/account/GlassInlineAlert.tsx');
const report = read('components/ReportUserModal.tsx');
const refCode = read('components/referral_code_sheet.tsx');
const refHow = read('components/referral_how_sheet.tsx');
const refShell = read('components/referral_sheet_shell.tsx');

for (const [name, source] of Object.entries(files)) {
  test(`${name}: нативного Alert.alert больше нет`, () => {
    assert.ok(!/(?<![\w.])Alert\.alert\(/.test(source.replace(/\/\/.*$/gm, '')), 'нет вызовов Alert.alert');
    assert.ok(!/\bAlert,|\bAlert }/.test(source.split('\n').slice(0, 60).join('\n')), 'нет импорта Alert из react-native');
  });
}

test('settings/lingman/dialogs: стеклянный хук и его узел отрисованы', () => {
  for (const name of ['settings', 'lingman', 'dialogs']) {
    assert.ok(files[name].includes('useGlassAlert('), `${name}: хук`);
    assert.ok(files[name].includes('{glassAlertNode}'), `${name}: узел окна в дереве`);
  }
});

test('settings: те же обработчики — очистка кеша и «Сменить без сохранения»', () => {
  assert.ok(files.settings.includes('clearAppCaches()'));
  assert.equal((files.settings.match(/onPress: runForcedAccountSwitchWithoutSaving/g) ?? []).length, 3);
  // 30.09: +2 окна отказа смены аккаунта (OR-ACCOUNT-SWITCH-PRECOMMIT-REJECTED / RECOVERY-REQUIRED).
  // 02.10 (Account V2, 8L): +1 стеклянное подтверждение «Несохранённые карточки будут удалены».
  assert.equal((files.settings.match(/delayMs: 360/g) ?? []).length, 6);
});

test('lingman: кнопка «Settings» по-прежнему открывает системные настройки уведомлений', () => {
  assert.ok(files.lingman.includes('openYoutubePremiereNotificationSettings()'));
});

test('paywall_purchase: логика покупки не тронута, окна идут через очередь стеклянных алертов', () => {
  assert.ok(files.paywall.includes("from './themed_blocking_alert_queue'"));
  assert.equal((files.paywall.match(/void enqueueThemedBlockingInfoAlert\(/g) ?? []).length, 4);
  assert.ok(files.paywall.includes('showPurchasePendingAlert(lang)'));
  assert.ok(files.paywall.includes('showUnverifiedPurchaseAlert(lang)'));
});

test('ник: ошибки валидации — стеклянный слой внутри модалки, не второй <Modal>', () => {
  assert.ok(files.nickname.includes('<GlassInlineAlert'));
  assert.ok(files.settings.includes('<GlassInlineAlert'));
  assert.ok(!/<Modal[ >]/.test(inline.replace(/\/\/.*$/gm, '')), 'слой не Modal — нет present-over-present на iOS');
  assert.ok(inline.includes('liquidGlassTokens('));
  assert.ok(inline.includes('minHeight: 48'), 'тап ≥ 44dp');
});

test('хук: сигнатура Alert.alert, подтверждение и выбор на стеклянных компонентах', () => {
  assert.ok(hook.includes('ThemedConfirmModal'));
  assert.ok(hook.includes('ThemedChoiceModal'));
  assert.ok(hook.includes("style === 'destructive'"));
  assert.ok(!/catch\s*(\([^)]*\))?\s*\{\s*\}/.test(hook), 'нет немого catch');
});

for (const [name, source] of Object.entries({ report, refCode, refHow, refShell, inline, hook })) {
  test(`${name}: запреты владельца`, () => {
    assert.ok(!source.includes('adjustsFontSizeToFit'), 'нет сжатия шрифта');
    assert.ok(!/borderWidth:\s*(?:[2-9]|\d{2,})/.test(source), 'нет толстых обводок');
    assert.ok(!/\bxp\b/i.test(source.replace(/\/\/.*$/gm, '')), 'XP не показываем');
    assert.ok(!/\bt\.correct\b/.test(source), 'зелёного нет');
  });
}

test('окно жалобы и реферальный шит берут токены стекла', () => {
  for (const source of [report, refCode, refHow, refShell]) {
    assert.ok(source.includes('liquidGlassTokens('));
    assert.ok(!/\bt\.(bgCard|bgSurface2?|bgPrimary|accent|textPrimary|textSecond|textMuted)\b/.test(source), 'старая палитра убрана');
  }
  assert.ok(!refShell.includes('TonalSurface'), 'старая тональная подложка убрана');
});
