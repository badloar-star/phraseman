// The shared paywall keeps entry-specific copy and reuses the Plus tab comparison.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (...p) => normalizeEol(readFileSync(join(ROOT, ...p), 'utf8'));

test('the first screen offers the plans and the scroll reveals context and the full Plus comparison', () => {
  const screen = read('components', 'paywall', 'PaywallPlusScreen.tsx');
  const plus = read('components', 'paywall', 'PaywallPlus.tsx');
  const tab = read('components', 'plus-tab', 'PlusTabScreen.tsx');
  assert.match(screen, /<PaywallPlusScroll onViewportHeight=\{setViewportHeight\}/);
  assert.match(screen, /title=\{paywallChoosePlan\(lang\)\}/);
  assert.match(screen, /testID="paywall-context-title"/);
  assert.match(screen, /testID="paywall-pill"[^>]+>\{headline\.pill\}/);
  assert.match(screen, />\{mFactCaption\}<\/Text>/);
  assert.match(screen, /<PlusTabBenefits lang=\{lang\} g=\{g\} items=\{benefits\}/);
  assert.match(tab, /<PlusTabBenefits/);
  assert.match(plus, /minHeight: viewportHeight/);
  assert.match(plus, /firstScreen: \{ justifyContent: 'center'/);
});

test('paywall fills the screen with stacked plans and safe top padding', () => {
  const screen = read('components', 'paywall', 'PaywallPlusScreen.tsx');
  assert.match(screen, /testID="paywall-sheet"/);
  assert.match(screen, /paddingTop: insets\.top/);
  assert.match(screen, /screen: \{ flex: 1 \}/);
  const nav = read('app', 'section_sheet_navigation.ts');
  assert.match(nav, /PAYWALL_SHEET_STACK_OPTIONS[\s\S]{0,80}presentation: 'transparentModal'/);
  assert.match(read('app', '_layout.tsx'), /name="premium_modal" options=\{PAYWALL_SHEET_STACK_OPTIONS\}/);
  assert.match(read('components', 'paywall', 'paywallShared.tsx'), /presentation: 'transparentModal'/);
  const rows = read('components', 'paywall', 'PaywallPlanRows.tsx');
  assert.match(rows, /list: \{ gap: PLAN_ROW_GAP/);
  assert.match(rows, /row: \{ overflow: 'hidden', minHeight: PLAN_ROW_MIN_HEIGHT/);
  assert.match(rows, /testID="paywall-plan-yearly"/);
  assert.match(rows, /borderColor: on \? aura : 'transparent'/);
  assert.match(rows, /<LinearGradient[^>]+colors=\{\[\.\.\.metal\]\}/);
});

// зачем (владелец 11.10: «цены должны показываться все равно, везде»; приказ «пейволы все сделать»): блока «Цены не загрузились» с кнопкой «Ещё раз» больше нет.
// Цен нет совсем — на месте плиток тихая строка («Цена уточнится в магазине» / «Магазин недоступен на этом устройстве»), цены докачиваются тихо.
test('without any price the plans area shows a quiet note instead of the «prices did not load» block, and the button note explains itself (макет №9/№10)', () => {
  const plus = read('components', 'paywall', 'PaywallPlus.tsx');
  assert.ok(!/COPY\.pricesFailed|paywall-prices-retry|COPY\.checkInternet|PaywallPlusPlansUnavailable/.test(plus), 'блока «Цены не загрузились» и кнопки «Ещё раз» нет');
  assert.match(plus, /testID="paywall-plans-note"/);
  assert.match(plus, /storeMissing \? COPY\.storeUnavailable : COPY\.priceWillConfirm/);
  assert.match(plus, /COPY\.fineNoPrices/, 'под кнопкой без цен — сноска, а не пустая строка');
  const screen = read('components', 'paywall', 'PaywallPlusScreen.tsx');
  assert.match(screen, /<PaywallPlusPriceNote lang=\{lang\} g=\{g\} reason=\{p\.storeUnavailableReason\}/);
  assert.ok(!/PaywallPlusPlansUnavailable/.test(screen));
});

test('sheet surfaces are solid so they stay visible on the light sheet (Сверка 11.10)', () => {
  const plus = read('components', 'paywall', 'PaywallPlus.tsx');
  assert.ok(!plus.includes('useV2GlassStyle') && !plus.includes('V2GlassSheen'), 'на шторке нет полупрозрачного стекла и блика');
  assert.match(plus, /backgroundColor: paywallPlateBg\(g\)/);
});

test('C uses the plain active-theme background while plan tiles keep a distinct solid surface', () => {
  const plus = read('components', 'paywall', 'PaywallPlus.tsx');
  // Plan/radio helpers retain their solid surface roles; the selected C sheet itself is the plain active theme background.
  const surfaces = read('components', 'paywall', 'paywall_surfaces.ts');
  assert.match(surfaces, /export function paywallSheetBg\(g: GlassTokens\): string \{ return g\.opaqueSheet; \}/);
  assert.match(surfaces, /export function paywallPlateBg\(g: GlassTokens\): string \{ return g\.isLight \? g\.opaqueControl : shadowSheetPlateTokens\(g\)\.plateFillFrom; \}/);
  assert.match(plus, /export \{ paywallSheetBg, paywallPlateBg \};/);
  const screen = read('components', 'paywall', 'PaywallPlusScreen.tsx');
  assert.match(screen, /backgroundColor: g\.bg/);
  assert.ok(!/backgroundColor: paywallSheetBg\(g\)/.test(screen), 'вариант C не возвращается к старой подложке шторки');
});

test('plan tiles are never empty: shimmer skeleton, or the quiet price note that stays through silent retries (Сверка 11.10)', () => {
  const plus = read('components', 'paywall', 'PaywallPlus.tsx');
  // тест устарел структурно после 1359f5244: скелет тарифов живёт в PaywallPlanRows.tsx, PaywallPlus лишь выбирает его
  const rows = read('components', 'paywall', 'PaywallPlanRows.tsx');
  assert.match(rows, /import SkeletonBlock from '\.\.\/SkeletonShimmer';/);
  assert.match(rows, /skeletonCell: \{ flex: 1, minWidth: 0 \}/);
  assert.equal((rows.match(/<SkeletonBlock width="100%" height=\{PLAN_ROW_MIN_HEIGHT\}/g) ?? []).length, 2);
  assert.match(plus, /<PaywallPlanRowsSkeleton g=\{g\} stacked=\{stacked\} \/>/);
  const screen = read('components', 'paywall', 'PaywallPlusScreen.tsx');
  assert.match(screen, /const plansShown: PaywallPlusState = state === 'loading' && sawPricesError \? 'error' : state;/);
  assert.match(screen, /plansShown === 'loading' \? <PaywallPlusPlansSkeleton/);
  assert.match(screen, /plansShown === 'error' \? <PaywallPlusPriceNote/);
});

test('store-unavailable reason picks the text; dev price preview names its button (Ядро a56214453)', () => {
  const plus = read('components', 'paywall', 'PaywallPlus.tsx');
  assert.match(plus, /reason\?: 'billing_unavailable' \| 'network' \| null;/);
  assert.match(plus, /storeMissing \? COPY\.storeUnavailable : COPY\.priceWillConfirm/);
  const screen = read('components', 'paywall', 'PaywallPlusScreen.tsx');
  assert.match(screen, /reason=\{p\.storeUnavailableReason\}/);
  assert.match(screen, /p\.previewPrices \? pick\(lang, COPY\.pricesPreview\)/);
  const copy = read('components', 'paywall', 'PaywallPlusCopy.ts');
  for (const key of ['storeUnavailable', 'pricesPreview']) {
    const line = copy.split(String.fromCharCode(10)).find((l) => l.trim().startsWith(key + ': LP('));
    assert.ok(line, key);
    assert.equal((line.match(/'[^']*'|"[^"]*"/g) ?? []).length, 9, key + ': 9 языков');
  }
});

test('dev price preview draws the plan tiles with prices; the error block is only for previewPrices=false (координатор 11.10)', () => {
  const screen = read('components', 'paywall', 'PaywallPlusScreen.tsx');
  assert.match(screen, /const hasPrices = !!\(p\.yearlyPrice \|\| p\.monthlyPrice\) \|\| p\.previewPrices;/);
  assert.match(screen, /превью=\$\{String\(p\.previewPrices\)\} причина=\$\{p\.storeUnavailableReason \?\? '-'\} источникЦены=\$\{p\.priceSource\} dev=\$\{String\(__DEV__\)\}/, 'журнал [PAYWALL] называет причину');
});

test('the no-prices note exists in all nine languages', () => {
  const copy = read('components', 'paywall', 'PaywallPlusCopy.ts');
  const line = copy.split(String.fromCharCode(10)).find((l) => l.trim().startsWith('fineNoPrices: LP('));
  assert.ok(line, 'fineNoPrices');
  assert.equal((line.match(/'[^']*'|"[^"]*"/g) ?? []).length, 9, '9 языков');
});
