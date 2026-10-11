import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// зачем (владелец 2026-09-29): экраны профиля переносятся 1 в 1 по макету profile.html (Liquid Glass).
// Контракт держит: токены стекла вместо старых палитр, отсутствие XP/жемчуга и запрещённых приёмов
// (adjustsFontSizeToFit, numberOfLines, толстые рамки) на перенесённых экранах — «Аккаунт» (PRF-02)
// и «Темы» (PRF-06). Остальные экраны профиля (язык, обучение, уведомления, приватность, поддержка,
// юридические документы, смена имени) перенесены раньше и проверяются здесь только на токены.
const read = (file) => fs.readFileSync(path.resolve(file), 'utf8');
// Комментарии (история решений) не считаются UI: их вырезаем перед проверкой запретных слов.
const code = (file) => read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const account = read('app/account_details.tsx');
const themes = read('app/settings_themes.tsx');
const LOCALES = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

const TRANSFERRED = [
  ['account', 'app/account_details.tsx'],
  ['themes', 'app/settings_themes.tsx'],
  ['language', 'app/settings_language.tsx'],
  ['education', 'app/settings_edu.tsx'],
  ['notifications', 'app/settings_notifications.tsx'],
  ['privacy', 'app/privacy_settings.tsx'],
  ['support', 'app/support_report.tsx'],
  ['legal sheet', 'components/legal/LegalDocumentSheet.tsx'],
  ['nickname sheet', 'components/account/NicknameEditModal.tsx'],
];

for (const [name, file] of TRANSFERRED) {
  test(`${name}: uses Liquid Glass tokens, no forbidden text/border tricks`, () => {
    const src = read(file);
    assert.match(src, /liquidGlassTokens|makeLiquidGlassTheme/, `${file} must read glass tokens`);
    assert.doesNotMatch(src, /adjustsFontSizeToFit/);
    assert.doesNotMatch(src, /borderWidth:\s*[2-9]/, 'no thick borders');
  });
}

test('account: glass shell, coin hero and sections follow PRF-02', () => {
  assert.match(account, /liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.match(account, /useStableSafeAreaInsets/);
  assert.match(account, /fontSize: 34, lineHeight: 40, fontWeight: '700'/);
  assert.match(account, /useMyCoinRank/);
  assert.match(account, /testID="account-hero"/);
  assert.match(account, /SettingsGlassEyebrow/);
  // строки данных: имя, email + «Скопировать», способ входа, «С нами с»; действия: выход и удаление
  for (const id of ['account-name-row', 'account-email-row', 'account-email-copy', 'account-logout-button', 'account-delete-button']) {
    assert.ok(account.includes(`testID="${id}"`), `missing ${id}`);
  }
  assert.doesNotMatch(account, /SETTINGS_SURFACES|SettingsGroup|SectionSheetHeader|TouchableOpacity/);
});

test('account: functional logic of the old screen is preserved', () => {
  // 12.10 (координатор, аудит COVERAGE_AUDIT_R1 §C): перед выходом — окно «Выйти из аккаунта?», выход стартует из него.
  assert.match(account, /setLogoutStage\('confirm'\)/);
  assert.match(account, /setDeleteVisible\(true\)/);
  assert.match(account, /Clipboard\.setStringAsync\(email\)/);
  assert.match(account, /<NicknameEditModal/);
  assert.match(account, /<AccountLogoutFlow/);
  assert.match(account, /<DeleteAccountConfirmModal/);
  assert.match(account, /<RegistrationPromptModal/);
  assert.match(account, /peekLinkedAuthFromCurrentUser\(\)/);
  assert.doesNotMatch(account, /catch\s*\{\s*\}/, 'no silent catch');
});

test('account: new copy exists in all nine locales', () => {
  for (const marker of ['ДАННЫЕ', 'Скопировать', 'Показывается друзьям', 'Требует отдельного подтверждения']) {
    const at = account.indexOf(marker);
    assert.ok(at >= 0, `missing ${marker}`);
    const call = account.slice(at, at + 900);
    // девять аргументов L(...) — девять строк в кавычках до закрывающей скобки
    const args = call.slice(0, call.indexOf(')')).split("', '").length;
    assert.ok(args >= LOCALES.length - 1, `${marker} must carry 9 locales`);
  }
});

test('themes: 13 glass rows + gradient rows, instant apply, intensity slider + appearance controls, no paywall', () => {
  assert.match(themes, /liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.match(themes, /settingsGlassCardStyle/);
  assert.match(themes, /accessibilityRole="radio"/);
  assert.equal(themes.match(/\{ mode: '/g).length, 13);
  // 2026-10-04 (владелец): 10 градиентных тем добавлены к 13 — из одного списка-конфига.
  assert.match(themes, /LIQUID_GLASS_GRADIENT_THEME_IDS\.map\(mode => \(\{ mode \}\)\)/);
  // 2026-09-30 (темы 2.0, макет themes-v2-proposals): тап по теме применяет её сразу —
  // примерки и кнопки «Применить» нет; сверху луна/солнце.
  assert.match(themes, /setLiquidGlassThemeId\(mode\)/);
  assert.match(themes, /testID=\{`theme-appearance-\$\{opt\.key\}`\}/);
  // 2026-10-04 (владелец): «Спокойно / Акцент / Максимум» заменены ОДНИМ ползунком —
  // превью при перетаскивании, запись при отпускании; сегмент не возвращается.
  assert.match(themes, /<ThemeIntensitySlider/);
  assert.match(themes, /onPreview=\{setPreviewLiquidGlassIntensity\}/);
  assert.match(themes, /onCommit=\{setLiquidGlassIntensity\}/);
  assert.doesNotMatch(themes, /theme-level-|LIQUID_GLASS_COLOR_LEVELS|LevelSegment/);
  // 2026-09-30: темы бесплатны — экран тем больше не ведёт на пейвол.
  assert.doesNotMatch(themes, /premium_modal/);
  assert.match(themes, /profile_theme_set/);
  assert.doesNotMatch(themes, /TapScale|SectionSheetHeader|GRID_SCREEN_PAD|useWindowDimensions/);
});

test('none of the transferred profile screens show XP or pearls', () => {
  for (const [, file] of TRANSFERRED) {
    const src = code(file);
    assert.doesNotMatch(src, /pearl|жемчуг|\bXP\b|\bxp\b|experience/i, `${file} must not mention XP/pearls in the UI`);
  }
});

test('no numberOfLines truncation on the two new screens', () => {
  assert.doesNotMatch(code('app/account_details.tsx'), /numberOfLines/);
  assert.doesNotMatch(code('app/settings_themes.tsx'), /numberOfLines/);
});
