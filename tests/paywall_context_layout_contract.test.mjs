// зачем (владелец 11.10: «все пейволы должны быть контекстными всегда»; журнал 10–11): окно Plus показывает контекст места входа
// (заголовок, подзаголовок, подсвеченная первая выгода со значком контекста), а на месте цен без загрузки — «Цены сейчас недоступны» + «Повторить»,
// а не пустые плашки. Сторож смотрит на разметку и тексты (9 языков), чтобы это не откатилось.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (...p) => normalizeEol(readFileSync(join(ROOT, ...p), 'utf8'));

test('plus window header and benefits are contextual', () => {
  const screen = read('components', 'paywall', 'PaywallPlusScreen.tsx');
  assert.match(screen, /contextTitle=\{contextual \? headline\.title : undefined\}/);
  assert.match(screen, /leadBenefit=\{contextual && headline\.firstBenefit/);
  assert.match(screen, /<PaywallContextIcon ctx=\{ctx\}/);
  const plus = read('components', 'paywall', 'PaywallPlus.tsx');
  assert.match(plus, /testID="paywall-lead-benefit"/);
  assert.match(plus, /testID="paywall-context-icon"/);
});

test('plus window is a sheet over the previous screen with plans side by side (владелец 11.10, вариант 1 «Шторка»)', () => {
  const screen = read('components', 'paywall', 'PaywallPlusScreen.tsx');
  assert.match(screen, /testID="paywall-sheet"/);
  assert.match(screen, /<PaywallScrim onPress=\{closeWindow\} \/>/);
  assert.match(read('components', 'paywall', 'paywallShared.tsx'), /testID="paywall-scrim"/);
  assert.match(screen, /borderTopLeftRadius: 30/);
  const nav = read('app', 'section_sheet_navigation.ts');
  assert.match(nav, /PAYWALL_SHEET_STACK_OPTIONS[\s\S]{0,80}presentation: 'transparentModal'/);
  assert.match(read('app', '_layout.tsx'), /name="premium_modal" options=\{PAYWALL_SHEET_STACK_OPTIONS\}/);
  assert.match(read('components', 'paywall', 'paywallShared.tsx'), /presentation: 'transparentModal'/);
  const plus = read('components', 'paywall', 'PaywallPlus.tsx');
  assert.match(plus, /planRow: \{ flexDirection: 'row'/);
  // зачем (владелец 12.10, стиль «Тень»): выбранный тариф приподнят сдвигом на внешней обёртке (tileOuter), а не кольцом.
  assert.match(plus, /testID="paywall-plan-yearly"[\s\S]{0,400}outerStyle=\{tileOuter\(yearOn\)\}/);
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

test('sheet and its tiles differ in every theme: graphite dark had opaqueSheet == opaqueControl (Сверка 11.10)', () => {
  const plus = read('components', 'paywall', 'PaywallPlus.tsx');
  // зачем (координатор 13.10, paywall-gap-001): в тёмном лист и плашки — нейтраль «Тени» (paywall_surfaces.ts), светлое прежнее; PaywallPlus реэкспортирует paywallSheetBg
  const surfaces = read('components', 'paywall', 'paywall_surfaces.ts');
  // зачем (владелец 13.10, №35): лист пейвола — opaqueSheet текущей темы в обоих оформлениях (нейтральная тёмная шторка отменена)
  assert.match(surfaces, /export function paywallSheetBg\(g: GlassTokens\): string \{ return g\.opaqueSheet; \}/);
  assert.match(surfaces, /export function paywallPlateBg\(g: GlassTokens\): string \{ return g\.isLight \? g\.opaqueControl : shadowSheetPlateTokens\(g\)\.plateFillFrom; \}/);
  assert.match(plus, /export \{ paywallSheetBg, paywallPlateBg \};/);
  const screen = read('components', 'paywall', 'PaywallPlusScreen.tsx');
  assert.match(screen, /backgroundColor: paywallSheetBg\(g\)/);
  assert.ok(!/backgroundColor: g\.opaqueSheet/.test(screen), 'шторка не на opaqueSheet (в графите он равен плиткам)');
});

test('plan tiles are never empty: shimmer skeleton, or the quiet price note that stays through silent retries (Сверка 11.10)', () => {
  const plus = read('components', 'paywall', 'PaywallPlus.tsx');
  assert.match(plus, /import SkeletonBlock from '\.\.\/SkeletonShimmer';/);
  assert.match(plus, /<SkeletonBlock width="100%" height=\{PLAN_CARD_HEIGHT\}/);
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
