// ════════════════════════════════════════════════════════════════════════════
// paywall_v3_source_contract — единственный пейвол Plus (владелец 2026-09-30,
// макет paywall-v3.html «Честный пробный период»). Сторожит решения владельца:
//  • пейвол ОДИН: нет файлов и импортов paywall_a…g, выбора варианта и A/B;
//  • цена за ГОД крупнее «в месяц» (магазины отклоняют наоборот);
//  • пробный период — только из магазина, без захардкоженной длительности;
//  • все цвета — токены активной темы, темы не продаются как Plus;
//  • «Все N возможностей» раскрывается на месте, не окном;
//  • после покупки без разрешения на уведомления — экран «Напомнить…?».
// ════════════════════════════════════════════════════════════════════════════
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';

const root = join(import.meta.dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const code = (path) => read(path).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const SCREEN = 'components/paywall/PaywallPlusScreen.tsx';
const UI = 'components/paywall/PaywallPlus.tsx';
const COPY = 'components/paywall/PaywallPlusCopy.ts';
const CMP = 'components/paywall/PaywallBenefitComparison.tsx';
const PROMPT = 'components/paywall/PaywallTrialReminderPrompt.tsx';
const PAYWALL_FILES = [SCREEN, UI, COPY, CMP, PROMPT];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

test('the Plus paywall is the only one: A–G screens, variant picker and A/B shell are gone', () => {
  for (const letter of 'abcdefg') {
    assert.equal(existsSync(join(root, `app/paywall_${letter}.tsx`)), false, `app/paywall_${letter}.tsx must be deleted`);
  }
  for (const dead of ['app/paywall_variant.ts', 'app/direct_paywall_route.tsx', 'components/paywall/PaywallLiquidGlass.tsx']) {
    assert.equal(existsSync(join(root, dead)), false, `${dead} must be deleted`);
  }
  const offenders = [];
  for (const dir of ['app', 'components', 'hooks', 'modules']) {
    if (!existsSync(join(root, dir))) continue;
    for (const file of walk(join(root, dir))) {
      const source = readFileSync(file, 'utf8');
      if (/from ['"][^'"]*\/paywall_[a-g]['"]|from ['"][^'"]*paywall_variant['"]|PaywallLiquidGlass['"]/.test(source)) {
        offenders.push(relative(root, file));
      }
    }
  }
  assert.deepEqual(offenders, [], 'nobody imports the removed paywalls');

  const dispatcher = read('app/premium_modal.tsx');
  assert.match(dispatcher, /import PaywallPlusScreen from '\.\.\/components\/paywall\/PaywallPlusScreen';/);
  // 5400d7316 ([PAYWALL-CLOSE-JS] Profiler) и удержание кадра на время самозакрытия: экран — тот же PaywallPlusScreen, вход —
  // entryResolution.entry при решении show (иначе — уже показанный кадр до закрытия, без нового входа)
  assert.match(dispatcher, /const entryToShow = entryResolution\?\.decision === 'show'\s*\?\s*entryResolution\.entry\s*:\s*\(keepShownForSelfClose \? shownEntryRef\.current : null\);/);
  assert.match(dispatcher, /const screen = <PaywallPlusScreen entry=\{entryToShow\} \/>;/);
  const nav = read('app/paywall_navigation.ts');
  assert.match(nav, /pathname: '\/premium_modal'/);
  assert.doesNotMatch(nav, /paywall_[a-g]|resolvePaywallAbVariant/);
});

test('year price is the big one; «≈ per month» of the year plan is small', () => {
  // тест устарел структурно после 1359f5244 (тарифы переехали в PaywallPlanRows, вариант A), поведение не менялось: сумма списания —
  // самая крупная цифра строки (S.big), «≈ в месяц» — мелко под ней (S.per). Отдельного стиля «месяц крупнее/мельче года» в строках нет:
  // у года и у месяца один и тот же крупный стиль суммы.
  const ui = read('components/paywall/PaywallPlanRows.tsx');
  const size = (key) => Number(ui.match(new RegExp(`${key}: \\{[^}]*fontSize: ([\\d.]+)`))?.[1]);
  assert.ok(size('big') > size('per'), 'year total is larger than «≈ per month»');
  assert.ok(size('big') > size('strike'), 'year total is larger than the struck-through standard price');
  assert.match(ui, /testID=\{priceTestID\} style=\{\[S\.big/);
  assert.match(ui, /priceTestID="paywall-year-price"/);
  assert.match(ui, /yearPerMonthApprox\(lang, yearlyPerMonth\)/);
  assert.match(ui, /\{subPrice \? <Text style=\{\[S\.per/);
});

test('trial length comes only from the store — no hard-coded 7/12/17 day durations', () => {
  const screen = read(SCREEN);
  assert.match(screen, /pricesReady \? p\.yearlyTrialDays : null/);
  const purchase = read('app/paywall_purchase.ts');
  assert.match(purchase, /getTrialInfo\(packages\.yearly,/);
  for (const path of PAYWALL_FILES) {
    const source = code(path);
    assert.doesNotMatch(source, /\b(?:7|12|17)\s*(?:дн|days?|día|dias?|hari|gün|dni|ngày)/iu, `${path}: hard-coded trial duration`);
    assert.doesNotMatch(source, /trialDays\s*[=:]\s*(?:7|12|17)\b/, `${path}: hard-coded trialDays`);
    assert.doesNotMatch(source, /\?\?\s*(?:7|12|17)\b/, `${path}: hard-coded fallback`);
  }
  // Лента пробного — только если пробный есть И выбран год И цены пришли.
  assert.match(screen, /const showTimeline = !!yearlyTrialDays && p\.selected === 'yearly';/);
  assert.match(screen, /const pricesReady = state === 'ready' && !!p\.yearlyPrice;/);
});

test('colours come from the active theme tokens; themes are not sold as Plus', () => {
  const screen = read(SCREEN);
  assert.match(screen, /liquidGlassTokens\(liquidGlassThemeId\)/);
  for (const path of [SCREEN, UI, CMP, PROMPT]) {
    const source = code(path);
    assert.doesNotMatch(source, /#[0-9A-Fa-f]{3,8}\b/, `${path}: no own hex colours`);
    assert.doesNotMatch(source, /rgba?\(/, `${path}: no own rgba colours`);
    assert.doesNotMatch(source, /adjustsFontSizeToFit|numberOfLines/, `${path}: no shrinking or clipping`);
    assert.doesNotMatch(source, /borderWidth:\s*(?:[2-9]|\d{2,})/, `${path}: no thick borders`);
  }
  const cmp = read(CMP);
  assert.doesNotMatch(cmp, /id: 'theme'|LP\('Тем[ыа]/);
  assert.doesNotMatch(read('app/settings_themes.tsx'), /premium_modal|PlusBadge/);
  assert.match(read('components/ThemeContext.tsx'), /LIQUID_GLASS_THEME_IDS\.includes\(id\)/);
});

test('«All N features» expands in place — no modal, no sheet', () => {
  const cmp = read(CMP);
  assert.match(cmp, /const \[open, setOpen\] = useState\(false\);/);
  assert.match(cmp, /PAYWALL_COMPARISON_ROWS\.slice\(0, PAYWALL_COMPARISON_VISIBLE_ROWS\)/);
  assert.match(cmp, /accessibilityState=\{\{ expanded: open \}\}/);
  assert.match(cmp, /compareMore\(lang, PAYWALL_COMPARISON_ROWS\.length\)/);
  for (const path of PAYWALL_FILES) {
    assert.doesNotMatch(code(path), /<Modal\b|ThemedConfirmModal|BottomSheet|router\.push/, `${path}: no window inside the window`);
  }
  // Exit-оффер-окна поверх пейвола нет. D187 (df0c03d50, владелец 14.10 «Удалить код»): не выключено флагом, а удалено целиком —
  // ни флага, ни состояния, ни ключа «уже видели» ни в экране, ни в хуке покупки.
  assert.doesNotMatch(read(SCREEN), /disableExitOffer|exitOffer|ExitTrialOffer/);
  assert.doesNotMatch(read('app/paywall_purchase.ts'), /disableExitOffer|ExitTrialOfferState|setExitOffer|EXIT_TRIAL_OFFER_SEEN_KEY/);
});

test('after purchase without notification permission the reminder prompt is shown', () => {
  const purchase = read('app/paywall_purchase.ts');
  // 12.10 (0d76a9528, ревью fa6648f02 п.4): чтение разрешения — best-effort в try/catch с записью причины в журнал (раньше — одна строка без защиты)
  assert.match(purchase, /permission = await getNotificationPermissionStatus\(\);/);
  assert.match(purchase, /purchase:permission_status_failed/);
  assert.match(purchase, /setTrialReminderPrompt\(\{ days: reminderDays, priceLabel: reminderPrice, trialStartMs \}\);/);
  assert.match(purchase, /const allowTrialReminder = useCallback/);
  assert.match(purchase, /requestNotificationPermissionWithFallback\(\{ openSettingsIfBlocked: true \}\)/);
  assert.match(purchase, /const skipTrialReminder = useCallback/);
  assert.match(purchase, /\[TRIAL-REMINDER\]/);
  const screen = read(SCREEN);
  assert.match(screen, /prompt \? \(\s*<PaywallTrialReminderPrompt/);
  assert.match(screen, /onAllow=\{p\.allowTrialReminder\} onSkip=\{p\.skipTrialReminder\}/);
  const notifications = read('app/notifications.ts');
  assert.match(notifications, /trialReminderDelaySeconds\(trialStartMs, trialDays, Date\.now\(\)\)/);
  // Онбординг не трогаем: прежние дата («за сутки») и текст, новый расчёт — только Plus.
  assert.match(notifications, /timing === 'plus_two_days'[\s\S]*?: onboardingTrialReminderDelaySeconds\(trialDays\)/);
  assert.match(purchase, /onboardingTrialReminderCopy\(lang, reminderPrice\)[\s\S]*?'onboarding_day_before'\)/);
  assert.equal((purchase.match(/'plus_two_days'\)/g) ?? []).length, 2, 'both Plus paths use the N−2 timing');
  assert.ok(purchase.includes("ru: 'Триал заканчивается завтра'"), 'onboarding text unchanged');
  assert.match(notifications, /\[TRIAL-REMINDER\]/);
});

test('the fixed CTA covers trial, yearly and monthly wording; taps stay ≥ 44dp', () => {
  const copy = read(COPY);
  for (const token of ['Начать {n} {days} бесплатно', 'Оформить за {v} в год', 'Оформить за {v} в месяц', 'Затем {v} в год · Отмена в любой момент']) {
    assert.ok(copy.includes(token), `missing CTA copy «${token}»`);
  }
  const ui = read(UI);
  assert.match(ui, /cta: \{ minHeight: 58/);
  assert.match(ui, /close: \{ width: 44, height: 44/);
  assert.match(ui, /linkHit: \{ minHeight: 44/);
  // зачем (владелец 11.10, 960f2de5f): блока «Цены не загрузились» с кнопкой повтора больше нет — тихая строка про цену, поэтому стиля retry нет
  assert.match(read(SCREEN), /useStableSafeAreaInsets/);
});

// зачем (решение владельца 05.10, overlays-more.html OM-PROMO-PRESENT/ABSENT): при скидке стора над тарифами —
// плашка «Скидка действует сейчас» (−%, цена со скидкой, зачёркнутая обычная, «далее …»); нет промо — нет плашки.
test('store promo plate renders only from store promo data', () => {
  const plans = readFileSync(new URL('../components/paywall/PaywallPlus.tsx', import.meta.url), 'utf8');
  assert.match(plans, /\{promo \? \(\s*<View testID="paywall-promo-plate"/);
  assert.ok(plans.includes('promo.discountPercent') && plans.includes('promo.promoPriceString') && plans.includes('promo.standardPriceString'));
  assert.ok(!/paywall-promo-plate[\s\S]{0,600}\d+\s*%[^`]/.test(plans.replace(/−\$\{promo\.discountPercent\}%/g, '')), 'no hard-coded discount');
});
