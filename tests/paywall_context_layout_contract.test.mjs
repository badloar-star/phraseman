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
  assert.match(plus, /testID="paywall-plan-yearly"[\s\S]{0,400}outerStyle=\{S\.planCell\}/);
});

test('without prices the plans area says so, offers a retry and the button note explains itself (макет №9/№10)', () => {
  const plus = read('components', 'paywall', 'PaywallPlus.tsx');
  assert.match(plus, /COPY\.pricesFailed/);
  assert.match(plus, /COPY\.checkInternet/);
  assert.match(plus, /COPY\.retry\)/);
  assert.match(plus, /testID="paywall-prices-retry"/);
  assert.match(plus, /COPY\.fineNoPrices/, 'под кнопкой без цен — сноска, а не пустая строка');
  const screen = read('components', 'paywall', 'PaywallPlusScreen.tsx');
  assert.match(screen, /<PaywallPlusPlansUnavailable lang=\{lang\} g=\{g\} onRetry=\{retryPrices\}/);
});

test('sheet surfaces are solid so they stay visible on the light sheet (Сверка 11.10)', () => {
  const plus = read('components', 'paywall', 'PaywallPlus.tsx');
  assert.ok(!plus.includes('useV2GlassStyle') && !plus.includes('V2GlassSheen'), 'на шторке нет полупрозрачного стекла и блика');
  assert.match(plus, /backgroundColor: g\.opaqueControl/);
});

test('sheet and its tiles differ in every theme: graphite dark had opaqueSheet == opaqueControl (Сверка 11.10)', () => {
  const plus = read('components', 'paywall', 'PaywallPlus.tsx');
  assert.match(plus, /export function paywallSheetBg\(g: GlassTokens\): string \{ return g\.isLight \? g\.opaqueSheet : g\.opaqueCard; \}/);
  const screen = read('components', 'paywall', 'PaywallPlusScreen.tsx');
  assert.match(screen, /backgroundColor: paywallSheetBg\(g\)/);
  assert.ok(!/backgroundColor: g\.opaqueSheet/.test(screen), 'шторка не на opaqueSheet (в графите он равен плиткам)');
});

test('the no-prices note exists in all nine languages', () => {
  const copy = read('components', 'paywall', 'PaywallPlusCopy.ts');
  const line = copy.split(String.fromCharCode(10)).find((l) => l.trim().startsWith('fineNoPrices: LP('));
  assert.ok(line, 'fineNoPrices');
  assert.equal((line.match(/'[^']*'|"[^"]*"/g) ?? []).length, 9, '9 языков');
});
