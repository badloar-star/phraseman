import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// зачем: корень «Настройки» переносится 1 в 1 по макету profile.html#PRF-01 (Liquid Glass).
// 04.10: эталон сменён — redesign-round-1 вариант A «Группы одним блоком» (владелец), лишние рабочие
// функции разложены по разделам макета (решение (б), координатор).
// Контракт держит геометрию и тексты макета, порядок секций/строк и то, что рабочие функции
// (Plus, промокод, размер шрифта, отклик, кеш, оценка, реферальный shield) не потеряны.
const source = fs.readFileSync(path.resolve('app/(tabs)/settings.tsx'), 'utf8');
const rows = fs.readFileSync(path.resolve('components/settings/SettingsGlassRows.tsx'), 'utf8');
const bodyStart = source.indexOf('<Reanimated.ScrollView');
const bodyEnd = source.indexOf('</Reanimated.ScrollView>');
const body = source.slice(bodyStart, bodyEnd);
const LOCALES = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

const indexOfOrThrow = (haystack, needle, from = 0) => {
  const at = haystack.indexOf(needle, from);
  assert.ok(at >= 0, `missing: ${needle}`);
  return at;
};

test('root settings use the Liquid Glass tokens and the approved scroll shell with all four safe edges', () => {
  assert.ok(bodyStart > 0 && bodyEnd > bodyStart);
  assert.match(source, /import \{ liquidGlassTokens \} from '\.\.\/\.\.\/constants\/liquidGlassThemePalette';/);
  assert.match(source, /const glass = liquidGlassTokens\(liquidGlassThemeId\);/);
  // 11.10 (паритет profile.html, макет A): верхний inset даёт обёртка вкладок ((tabs)/_layout.tsx, paddingTop: insets.top) —
  // свой paddingTop опускал заголовок «Настройки» на ≈55px; поля экрана 20.
  assert.doesNotMatch(body, /contentContainerStyle=\{\{[^}]*paddingTop:\s*insets\.top/);
  assert.match(body, /paddingLeft:\s*20 \+ insets\.left/);
  assert.match(body, /paddingRight:\s*20 \+ insets\.right/);
  assert.match(body, /paddingBottom:\s*tabContentBottomPad/);
  assert.match(body, /onScroll=\{handleSettingsScroll\}/);
  assert.match(source, /settingsScrollYRef\.current/);
  assert.doesNotMatch(source, /SETTINGS_SURFACES|SettingsGroup'|SettingsSectionTitle|SettingsCustomRow|SettingsIconTile/);
});

test('header, profile card and section titles follow the round-1 A geometry', () => {
  assert.match(body, /fontSize:\s*40,\s*lineHeight:\s*46,\s*fontWeight:\s*'700',\s*letterSpacing:\s*-0\.6/);
  assert.doesNotMatch(source, /'Профиль и приложение'/); // в макете A подзаголовка нет
  assert.match(source, /style=\{\{ width: size, height: size \}\} contentFit="contain"/);
  assert.match(body, /renderRankCoin\('settings-header-coin', 44\)/);
  assert.match(body, /testID="settings-profile-card"[\s\S]*?renderRankCoin\('settings-profile-coin', 52\)/);
  assert.match(body, /testID="settings-profile-sign-in"[\s\S]*?onPress=\{\(\) => setAuthPromptVisible\(true\)\}/);
  // зачем (Макеты 18.10, font13): «Войти» справа при обычном шрифте, под подписью — при крупном; условие показа прежнее (authReady && !linkedAuth)
  assert.match(body, /authReady && !linkedAuth && !profileStacked \? \(/);
  assert.match(body, /authReady && !linkedAuth && profileStacked \? \(/);
  assert.match(source, /const myCoinRank = useMyCoinRank\(\);/);
  assert.match(source, /coinRankRowForDisplay\(myCoinRank\)/);
  // 01.10 (PM-128): звание на языке интерфейса — на pt-BR раньше стояло «Агент».
  assert.match(source, /\[myCoinRankRow \? coinRankTitle\(myCoinRankRow\.rank, lang\) : undefined, accountLinkedSub\]\.filter\(Boolean\)\.join\(' · '\)/);
  assert.match(rows, /letterSpacing: wide \? 3 : 1\.7, marginTop: wide \? 26 : 24, marginHorizontal: 4, marginBottom: 10/);
  assert.match(body, /<SettingsGlassEyebrow wide glass=\{glass\}/);
  assert.match(rows, /gap:\s*10,\s*marginTop/);
});

test('glass rows keep the approved row, tile, text and switch metrics without heavy borders', () => {
  assert.match(rows, /minHeight:\s*SETTINGS_GLASS_ROW_MIN_HEIGHT/);
  assert.match(rows, /SETTINGS_GLASS_ROW_MIN_HEIGHT = 64/);
  assert.match(rows, /borderRadius:\s*14,\s*paddingVertical:\s*10,\s*paddingHorizontal:\s*14,\s*gap:\s*14/);
  // зачем (стиль «Тень», владелец 12.10): плашка — заливка плашки и plateBoxShadow, без кромки и клипа; прежний diagonal-sheen selected→transparent убран.
  assert.match(rows, /backgroundColor:\s*glass\.plateFillFrom/);
  assert.match(rows, /boxShadow:\s*plateBoxShadow\(glass\)/);
  assert.doesNotMatch(rows, /glassEdge: |borderColor: glass\.glassEdge|inset: true/);
  assert.match(rows, /width:\s*41,\s*height:\s*41,\s*borderRadius:\s*10/);
  assert.match(rows, /fontSize: 16, lineHeight: grouped \? 22 : 21, fontWeight: grouped \? '600' : '700'/);
  // Группа макета A: одна карточка, пункты через тонкий разделитель, строки внутри плоские 60 / 9·16.
  assert.match(rows, /export function SettingsGlassGroup/);
  // зачем (владелец 12.10, стиль «Тень»): разделитель строк — линия-View (RowDivider) в тоне dividerTone, а не borderTop.
  assert.match(rows, /<RowDivider color=\{glass\.dividerTone\} \/>/);
  assert.doesNotMatch(rows, /borderTopWidth/);
  assert.match(rows, /minHeight: 60,\s*paddingVertical: 9,\s*paddingHorizontal: 16/);
  assert.match(rows, /fontSize:\s*13,\s*lineHeight:\s*18,\s*marginTop:\s*3/);
  assert.match(rows, /name="chevron-forward"\s+size=\{18\}/);
  assert.match(rows, /accessibilityRole="switch"[\s\S]*accessibilityState=\{\{ checked: value \}\}/);
  assert.match(rows, /width:\s*48,\s*minWidth:\s*48,\s*minHeight:\s*48/);
  assert.match(rows, /translateX: value \? 19 : 0/);
  for (const text of [rows, body]) {
    // зачем (координатор 13.10, коммит 687205b5b): кап шрифта 1,15 допустим только на заголовке экрана; сжатие и любой другой кап запрещены
    assert.doesNotMatch(text, /adjustsFontSizeToFit|maxFontSizeMultiplier(?!={1.15})/);
    assert.doesNotMatch(text, /borderWidth:\s*(?!1\b|0\b)\d/);
    assert.doesNotMatch(text, /#34C759/);
  }
  // зачем: старый зелёный CustomSwitch остаётся только в скрытом (флаг false) блоке «Звук» — его держит контракт звука.
  const outsideSound = body.slice(0, body.indexOf('sound-settings-start')) + body.slice(body.indexOf('sound-settings-end'));
  assert.doesNotMatch(outsideSound, /<CustomSwitch/);
});

test('sections and rows keep the macet order', () => {
  const order = [
    // Сверка С8 (18.10): надзаголовок под карточкой профиля — «ОСНОВНОЕ», а не второй «ПРОФИЛЬ»
    'settings-profile-card', "'ОСНОВНОЕ'", 'settings-account-row', 'settings-language-row', 'settings-study-language-row',
    "'ОБУЧЕНИЕ'", 'settings-edu-row', 'settings-notifications-row', 'settings-themes-row', 'settings-tap-haptics-row', 'settings-font-size-row',
    '"PHRASEMAN PLUS"', 'settings-plus-row', 'settings-promo-code-row', 'settings-invite-banner',
    "'ПОМОЩЬ'", 'settings-support-report-row', 'settings-privacy-row', 'settings-clear-cache-row', 'settings-rate-app-row',
  ];
  let cursor = 0;
  for (const marker of order) cursor = indexOfOrThrow(body, marker, cursor) + marker.length;
});

test('macet texts exist for all nine locales', () => {
  const required = {
    eyebrowGeneral: ["L('ОСНОВНОЕ', 'ОСНОВНЕ', 'GENERAL', 'GENERAL', 'GERAL', 'CHUNG', 'UMUM', 'GENEL', 'OGÓLNE')"],
    eyebrowLearning: ["'ОБУЧЕНИЕ'", "'НАВЧАННЯ'", "'LEARNING'", "'APRENDIZAJE'", "'APRENDIZADO'", "'HỌC TẬP'", "'PEMBELAJARAN'", "'ÖĞRENME'", "'NAUKA'"],
    eyebrowHelp: ["L('ПОМОЩЬ', 'ДОПОМОГА', 'HELP', 'AYUDA', 'AJUDA', 'TRỢ GIÚP', 'BANTUAN', 'YARDIM', 'POMOC')"],
    signIn: ["L('Войти', 'Увійти', 'Sign in', 'Iniciar sesión', 'Entrar', 'Đăng nhập', 'Masuk', 'Giriş yap', 'Zaloguj się')"],
    linked: ["'аккаунт привязан'", "'акаунт прив’язано'", "'account linked'", "'cuenta vinculada'", "'conta vinculada'", "'đã liên kết tài khoản'", "'akun tertaut'", "'hesap bağlı'", "'konto połączone'"],
    studyTitle: ["'Язык изучения'", "'Мова навчання'", "'Learning language'", "'Idioma de estudio'", "'Idioma de estudo'", "'Ngôn ngữ học'", "'Bahasa belajar'", "'Öğrenilen dil'", "'Język nauki'"],
  };
  for (const [name, needles] of Object.entries(required)) {
    assert.ok(needles.length >= 1, `${name} sanity`);
    for (const needle of needles) assert.ok(source.includes(needle), `${name}: ${needle}`);
  }
  // В макете A строки без подписей: прежние расшифровки под названиями убраны.
  for (const gone of ["'Данные, вход и удаление'", "'Прогресс хранится отдельно'", "'Проверка, ввод и озвучка'", "'Напоминания и итоги'", "'Только тёмные варианты'", "'ВНЕШНИЙ ВИД И ПОМОЩЬ'"]) {
    assert.ok(!source.includes(gone), `removed sub/eyebrow: ${gone}`);
  }
  assert.equal(LOCALES.length, 9);
  assert.match(source, /en: 'English',/);
});

test('rows, values and handlers of the old screen are preserved', () => {
  assert.match(body, /router\.push\('\/account_details' as never\)/);
  assert.match(body, /router\.push\('\/settings_language' as any\)/);
  assert.match(body, /router\.push\('\/settings_edu'\)/);
  assert.match(body, /router\.push\('\/settings_notifications'\)/);
  assert.match(body, /router\.push\('\/settings_themes' as any\)/);
  assert.match(body, /router\.push\('\/privacy_settings' as never\)/);
  assert.match(body, /router\.push\('\/support_report' as never\)/);
  assert.match(body, /value=\{currentThemeLabel\}/);
  assert.match(body, /value=\{LANG_NATIVE\[lang\]\}/);
  assert.match(body, /value=\{accountProviderValue\}/);
  assert.match(source, /linkedAuth\.provider === 'apple' \? 'Apple' : 'Google'/);
  assert.match(body, /testID="settings-plus-row"[\s\S]*?onPress=\{plusRowPress\}/);
  assert.match(body, /testID="settings-promo-code-row"[\s\S]*?pathname: '\/promo_code_entry', params: \{ source: 'settings' \}/);
  assert.match(source, /pathname: '\/manage_subscription'/);
  assert.match(body, /testID="settings-plus-access-details"|premiumDetails/);
  assert.ok(indexOfOrThrow(body, 'settings-message-slot-top') > indexOfOrThrow(body, 'settings-study-language-row'));
  assert.ok(indexOfOrThrow(body, 'settings-message-slot-bottom') > indexOfOrThrow(body, 'settings-rate-app-row'));
  assert.ok(indexOfOrThrow(body, 'settings-message-slot-bottom') < indexOfOrThrow(body, 'settings-dev-hub-button'));
  // 12.10: недостижимый экземпляр удаления аккаунта убран (аудит COVERAGE_AUDIT_R1 §C) — удаление живёт в app/account_details.tsx.
  assert.doesNotMatch(source, /<DeleteAccountConfirmModal/);
  assert.match(source, /signOutAndWipeForAccountSwitch/);
});

test('functions absent from the macet stay reachable as glass rows and are not silent', () => {
  assert.match(body, /testID="settings-font-size-row"/);
  assert.match(body, /\(\['small', 'medium', 'large'\] as const\)/);
  assert.match(body, /onPress=\{\(\) => \{ setFontSize\(sz\); \}\}/);
  assert.match(body, /accessibilityState=\{\{ selected: fontSize === sz \}\}/);
  assert.match(body, /minHeight:\s*56/);
  assert.match(body, /<SettingsGlassSwitch[\s\S]*?value=\{hapticTap\}[\s\S]*?onValueChange=\{toggleTapHaptics\}/);
  assert.match(source, /setHapticCacheEnabled\(val\);/);
  assert.match(source, /AsyncStorage\.setItem\('haptics_tap', String\(val\)\)\.catch\(\(error(?:: unknown)?\) => \{\s*DebugLogger\.error\('settings\.tsx:toggleTapHaptics:storage'/); // зачем (аудит Optimistic UI «Настроек» 12.10): тип ошибки стал явным (`: unknown`) — смысл прежний, запись на диск фоном, сбой логируется и откатывается
  assert.match(body, /testID="settings-clear-cache-row"[\s\S]*?onPress=\{confirmClearCache\}/);
  assert.match(body, /testID="settings-rate-app-row"[\s\S]*?openStoreReviewPage\(\)/);
  assert.match(body, /testID="settings-invite-banner"[\s\S]*?pathname: '\/referrals', params: \{ source: 'settings' \}/);
  assert.match(body, /\{false \? \(\s*<SettingsGlassList marginTop=\{12\}>[\s\S]*?params: \{ enter: '1', source: 'settings' \}/);
  assert.match(source, /const SHOW_SOUND_SETTINGS = false;/);
  assert.match(body, /sound-settings-start[\s\S]*settings-ui-sounds-switch[\s\S]*settings-voice-out-switch[\s\S]*sound-settings-end/);
});

test('study language row opens the study-language sheet: globe, name, chevron (Сверка profile-001, владелец 11.10)', () => {
  const start = indexOfOrThrow(body, 'testID="settings-study-language-row"');
  const end = indexOfOrThrow(body, '/>', indexOfOrThrow(body, 'value={studyTargetName}', start));
  const row = body.slice(start, end);
  assert.match(row, /onPress=\{\(\) => setStudySheetVisible\(true\)\}/);
  assert.match(source, /<StudyLanguageSheet[\s\S]{0,400}logTag="\[SETTINGS-STUDY-LANG\]"/);
  assert.match(row, /icon="globe-outline"/); // макет A: значок-глобус
  assert.match(source, /language_flags\/language_en\.webp/);
  assert.doesNotMatch(source, /<StudyLanguagePicker|Изучаемый язык|Выбранный язык применяется ко всем учебным разделам/);
  assert.match(rows, /\{onPress \? <Ionicons name="chevron-forward"/);
});

test('rows are accessible, at least 44 dp, and the switch does not swallow its own focus', () => {
  assert.match(rows, /accessibilityLabel=\{label\}/);
  assert.match(rows, /accessible=\{!right\}/);
  assert.match(rows, /accessibilityRole="header"/);
  assert.match(rows, /variant="card"/);
  assert.match(rows, /withSound=\{false\}/);
  assert.match(body, /minHeight:\s*44/);
  assert.match(body, /accessibilityRole="header"/);
});

// зачем: PM-197-A2 — Настройки 2.0 не возвращают снесённые/законсервированные разделы.
// Арена и Лиги удалены (D83/D74), раздел MAX запломбирован (2026-09-04), спины и
// подарки уровней живут в своих местах, а не в корне Настроек. Паттерны намеренно
// узкие (пути, импорты, имена модулей): реферальная рулетка и строка «Подарок за
// приглашения» — рабочая функция Настроек и под запрет НЕ попадает.
test('root settings do not revive retired sections: MAX voice/tutor, spins, level gifts, arena, leagues', () => {
  const retired = {
    'MAX voice / tutor': /max_voice|voice_minutes|max_subscription|voiceMinute|voice_tutor|ai_voice_call|gate_ai_voice_call/i,
    'level spins': /level_spin|lesson_spin|spin_gift|spin_credit|spin_chance/i,
    'level gifts': /level_gift|daily_journey_gift|gift_access|energy_gift|theme_gift_pool/i,
    arena: /modules\/arena|from\s+['"][^'"]*arena|pathname:\s*['"]\/arena|push\(['"]\/arena/i,
    leagues: /from\s+['"][^'"]*league|pathname:\s*['"]\/leagues?\b|push\(['"]\/leagues?\b|league_/i,
  };
  for (const [name, pattern] of Object.entries(retired)) {
    assert.doesNotMatch(source, pattern, `settings.tsx revived retired section: ${name}`);
    assert.doesNotMatch(rows, pattern, `SettingsGlassRows.tsx revived retired section: ${name}`);
  }
});
