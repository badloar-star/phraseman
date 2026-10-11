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

test('without prices the plans area says so and offers a retry (no empty skeleton cards)', () => {
  const plus = read('components', 'paywall', 'PaywallPlus.tsx');
  assert.match(plus, /COPY\.pricesUnavailable/);
  assert.match(plus, /COPY\.retryPrices/);
  assert.match(plus, /testID="paywall-prices-retry"/);
  const screen = read('components', 'paywall', 'PaywallPlusScreen.tsx');
  assert.match(screen, /<PaywallPlusPlansUnavailable lang=\{lang\} g=\{g\} onRetry=\{retryPrices\}/);
});

test('the two new texts exist in all nine languages and use the informal address', () => {
  const copy = read('components', 'paywall', 'PaywallPlusCopy.ts');
  for (const key of ['pricesUnavailable', 'retryPrices']) {
    const line = copy.split(String.fromCharCode(10)).find((l) => l.trim().startsWith(`${key}: LP(`));
    assert.ok(line, key);
    const args = line.match(/'[^']*'/g) ?? [];
    assert.equal(args.length, 9, `${key}: 9 языков`);
  }
  assert.ok(!/Ваш|Вы /.test(copy.split('pricesUnavailable')[1]?.split(String.fromCharCode(10))[0] ?? ''));
});
