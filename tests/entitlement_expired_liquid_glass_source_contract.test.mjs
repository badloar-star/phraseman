import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const src = readFileSync(new URL('../components/EntitlementExpiredHost.tsx', import.meta.url), 'utf8');

test('expired sheet uses Liquid Glass tokens on an opaque sheet, no legacy reward card/hex', () => {
  assert.ok(src.includes("from '../constants/liquidGlassThemePalette'"));
  assert.ok(src.includes('liquidGlassTokens(liquidGlassThemeId)'));
  assert.ok(src.includes('HybridSheetShell') && src.includes('material="liquid-glass-opaque"'));
  for (const token of ['glass.opaqueControl', 'glass.accent', 'glass.accentInk', 'glass.text', 'glass.secondary'])
    assert.ok(src.includes(token), `missing ${token}`);
  assert.equal(src.includes('RewardCardV2'), false);
  assert.equal(src.includes('LinearGradient'), false);
  assert.equal(/#[0-9a-fA-F]{6}\b/.test(src.replace(/rgba?\([^)]*\)/g, '')), false);
});

test('no borders, no adjustsFontSizeToFit, 44dp targets, scroll for large fonts', () => {
  assert.equal(/border(?:Top|Bottom)?(?:Width|Color):/.test(src), false);
  assert.equal(src.includes('adjustsFontSizeToFit'), false);
  assert.ok(src.includes('ScrollView'));
  // 04.10: PAY-09 `.cta` — 48 высотой (было 52).
  assert.ok(src.includes('minHeight: 48'));
});

// 04.10 (координатор: «два сторожа не должны противоречить друг другу»): в макете PAY-09 есть «Пригласить друга» —
// кнопка вернулась (как требует referral_screens_contract). Старые обещания («безлимит», AURAS) по-прежнему запрещены.
test('copy follows PAY-09: no old promises, invite button to /referrals, nine languages', () => {
  assert.ok(src.includes('Plus завершён. Прогресс сохранён. Актуальные условия доступны в предложении магазина.'));
  assert.ok(src.includes("cta: 'Продлить Plus'") && src.includes("ghost: 'Позже'"));
  assert.equal(/безлимит|безліміт|AURAS/i.test(src.replace(/^\s*\/\/.*$/gm, '')), false);
  assert.ok(src.includes("invite: 'Пригласить друга'") && src.includes("pathname: '/referrals'"));
  for (const lang of ['ru:', 'uk:', 'en:', 'es:', "'pt-BR':", 'vi:', 'id:', 'tr:', 'pl:']) assert.ok(src.includes(lang), lang);
});

test('behaviour intact: paywall route contexts, cooldown/was-active keys, arbiter slot, dismiss = later', () => {
  for (const s of ['/premium_modal', 'premium_expired', 'vip_expired', 'navigateAfterModalClose', "useOverlayVisible('entitlementExpired'", 'SHOW_COOLDOWN_MS', 'WAS_ACTIVE_KEY', 'onClose={markShownAndClose}', 'onPress={markShownAndClose}'])
    assert.ok(src.includes(s), `missing ${s}`);
});
