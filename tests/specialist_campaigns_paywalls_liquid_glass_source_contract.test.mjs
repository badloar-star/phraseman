import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// зачем: перенос состояний overlays-specialist / overlays-campaigns / paywalls на Liquid Glass (30.09.2026).
// Только внешний вид: тест сторожит токены стекла и запреты владельца, логику не проверяет.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const glassFiles = {
  vipSurvey: 'components/VipSurveyModal.tsx',
  vipReview: 'components/VipSurveyReviewPromptModal.tsx',
  quest: 'components/QuestSheetModal.tsx',
  promoEntry: 'app/promo_code_entry.tsx',
  referral: 'components/referral_code_sheet.tsx',
  featureIntro: 'components/FeatureIntroModal.tsx',
  introStage: 'components/feature_intro/FeatureIntroStage.tsx',
  introComic: 'components/feature_intro/DialogueComicStage.tsx',
  introReplay: 'components/feature_intro/DialogueConsentChatReplay.tsx',
  promoBanner: 'components/paywall/PaywallPromoBanner.tsx',
};
const src = Object.fromEntries(Object.entries(glassFiles).map(([k, p]) => [k, read(p)]));

test('every migrated surface reads liquidGlassTokens and has no legacy palette or forbidden styling', () => {
  for (const [name, s] of Object.entries(src)) {
    assert.ok(s.includes('liquidGlassTokens'), `${name}: liquidGlassTokens`);
    assert.doesNotMatch(s, /adjustsFontSizeToFit/, `${name}: no font shrinking`);
    assert.doesNotMatch(s, /borderWidth:\s*([2-9]|\d{2,})/, `${name}: no thick borders`);
  }
});

test('surveys, quest sheet and code screens no longer use the old theme roles', () => {
  for (const name of ['vipSurvey', 'vipReview', 'quest', 'promoEntry', 'referral']) {
    assert.doesNotMatch(src[name], /\bt\.(accent|bgCard|bgSurface2?|textPrimary|textSecond|textMuted|correctText|correct|wrong|border)\b/, `${name}: legacy theme roles`);
  }
  assert.doesNotMatch(src.vipSurvey, /#(131A24|1D2633|182131|0F172A|64748B|475569|EF4444)/i, 'vip survey slate palette');
  assert.doesNotMatch(src.vipReview, /#(16A34A|22C55E|0F7A32)/i, 'vip review green palette');
});

test('quest sheet does not truncate reward names', () => {
  assert.doesNotMatch(src.quest, /numberOfLines/);
});

test('tap targets are at least 44dp on the migrated close/back buttons', () => {
  assert.match(src.vipSurvey, /roundButton:\s*\{[^}]*width:\s*44,\s*height:\s*44/);
  assert.match(src.vipReview, /closeButton:\s*\{[\s\S]*?width:\s*44,\s*height:\s*44/);
});

test('feature intro uses the opaque glass sheet and keeps copy/logic props untouched', () => {
  assert.match(src.featureIntro, /material="liquid-glass-opaque"/);
  for (const prop of ['onDone', 'onLater', 'onSecondary', 'onDismissed', 'ctaLabel', 'laterLabel']) {
    assert.ok(src.featureIntro.includes(prop), `feature intro prop ${prop}`);
  }
});

test('promo results are shown as a glass plate with an icon, not coloured text', () => {
  for (const name of ['promoEntry', 'referral']) {
    assert.match(src[name], /checkmark-circle-outline/);
    assert.match(src[name], /close-circle-outline/);
    assert.match(src[name], /accessibilityRole="alert"/);
  }
});

test('store promo banner takes glass tokens from the A/D paywall and keeps the onboarding look without them', () => {
  assert.match(src.promoBanner, /glass\?: PromoGlassTokens/);
  assert.match(src.promoBanner, /glass\.card/);
  assert.match(src.promoBanner, /glass\.glassEdge/);
  assert.match(read('components/paywall/PaywallLiquidGlass.tsx'), /<PaywallPromoBanner[^>]*glass=\{g\}/);
  // честность цены: третья строка «далее …» и обе цены остаются
  for (const id of ['paywall-promo-price', 'paywall-promo-standard', 'paywall-promo-after']) {
    assert.ok(src.promoBanner.includes(id), id);
  }
});

test('paywalls B, C, E, F, G render through the same Liquid Glass surface as A and D', () => {
  for (const v of ['b', 'c', 'd', 'e', 'f', 'g']) {
    const s = read(`app/paywall_${v}.tsx`);
    assert.match(s, /<PaywallLiquidGlass[\s\S]*?variant=\{VARIANT\}|<PaywallLiquidGlass/, `paywall_${v}`);
  }
  assert.match(read('components/paywall/PaywallLiquidGlass.tsx'), /ACTIVE_LAYOUT/);
});
