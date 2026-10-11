import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../components/NoEnergyModal.tsx', import.meta.url), 'utf8');

// зачем: окно «Нет энергии» переносится на Liquid Glass 1 в 1 с макета dialogs.html B5 —
// нейтральные токены темы вместо зелёных/золотых палитр по режимам.
test('NoEnergyModal takes every surface from the active Liquid Glass tokens', () => {
  assert.ok(source.includes('liquidGlassTokens(liquidGlassThemeId)'), 'active 13-theme token registry');
  assert.ok(source.includes('glass.opaqueSheet'), 'opaque base, no see-through hole');
  // зачем (владелец 12.10, стиль «Тень»): окно и кнопка «Позже» без обводок — тон и малая тень вместо кромки.
  assert.ok(!source.includes('glass.glassEdge'), 'no outline: стиль «Тень»');
  assert.ok(source.includes('plateBoxShadow(glass)') && source.includes('nestedBoxShadow(glass)'), 'shadow instead of border');
  assert.ok(source.includes('glass.accent') && source.includes('glass.accentInk'), 'Plus CTA uses the pale CTA token pair');
  assert.ok(source.includes('glass.text') && source.includes('glass.secondary'), 'text tokens');
  assert.ok(!source.includes('NO_ENERGY_MODAL_CHROME'), 'per-mode green/gold palettes are gone');
});

test('NoEnergyModal has no legacy palette values, thick borders or font shrinking', () => {
  for (const legacy of ['#63E894', '#63D98F', '#F4D986', '#D4AF37', '#F59E0B']) {
    assert.ok(!source.includes(legacy), `legacy color ${legacy} removed`);
  }
  assert.ok(!/rgba\(\s*24\s*,\s*36\s*,\s*26/.test(source), 'green brand surface removed');
  assert.ok(!source.includes('PremiumGoldButton'), 'gold shine button replaced by the glass CTA');
  assert.ok(!source.includes('adjustsFontSizeToFit'), 'no font shrinking');
  for (const match of source.matchAll(/borderWidth:\s*(\d+(?:\.\d+)?)/g)) {
    assert.ok(Number(match[1]) <= 1, `borderWidth ${match[1]} must be a hairline`);
  }
});

test('NoEnergyModal keeps its public props, both variants and every behavior', () => {
  for (const prop of ['visible', 'onClose', 'onGotIt', 'onBackHome', 'minRequired', 'activity', 'paywallContext',
    'onBeforeOpenPremium', 'qaForceShardCta', 'qaIgnorePremiumAccess', 'motionVariant']) {
    assert.ok(source.includes(`  ${prop}`) || source.includes(`${prop}?:`) || source.includes(`${prop}:`), `prop ${prop} remains`);
  }
  assert.ok(source.includes('export default memo(NoEnergyModal)'));
  assert.ok(source.includes('HybridAlertShell'), 'hybrid variant remains');
  assert.ok(source.includes('<Modal'), 'classic variant remains');
  assert.ok(source.includes("soundDirector.request('pm.energy.empty'"), 'empty cue remains');
  assert.ok(source.includes("scope: 'no-energy-modal'"));
  assert.ok(source.includes('useEnergyCountdown'), 'recovery countdown remains');
  // зачем (решение A1, 2026-09-30): жемчуг выведен из интерфейса — кнопки «за жемчужины» нет,
  // окно = «Позже» + «Получить Plus». Ядро energy_shard_refill.ts не тронуто.
  assert.ok(!source.includes('no-energy-buy-with-shards'), 'pearl refill control is gone');
  assert.ok(!source.includes('refillEnergyWithShards'), 'modal no longer spends pearls');
  assert.ok(source.includes('no-energy-modal-later') && source.includes('no-energy-modal-plus'), 'Later + Plus remain');
  assert.ok(source.includes('openPremiumAfterClose'), 'Plus flow remains');
  assert.ok(source.includes('useStableSafeAreaInsets'), 'classic branch respects safe area');
  assert.ok(source.includes('minHeight: 48'), 'touch targets are at least 44dp');
});
