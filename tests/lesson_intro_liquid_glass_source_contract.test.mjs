import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const intro = normalizeEol(readFileSync(new URL('../app/lesson_intro_screens.tsx', import.meta.url), 'utf8'));

test('lesson intro C1–C3 uses the active Liquid Glass material while preserving its real reveal flow', () => {
  assert.ok(intro.includes('liquidGlassTokens(liquidGlassThemeId)'), 'active 13-theme token registry');
  assert.ok(intro.includes('colors={[introGlass.bgTop, introGlass.bg, introGlass.bgBottom]}'), 'full-bleed Liquid Glass background');
  assert.ok(intro.includes('<ScreenGradient forceFullBleed>'), 'background reaches the top safe area');
  assert.ok(intro.includes('glass={introGlass}'), 'intro cards receive the active glass material');
  assert.ok(intro.includes('const cardBg = glass.card'), 'intro cards use translucent glass surfaces');
  // зачем (стиль «Тень» 12.10, координатор: красные сторожи): карточки интро отделены тенью плашки, без кромки (borderColor: glass.glassEdge снят).
  assert.ok(intro.includes('boxShadow: plateBoxShadow(glass)'), 'intro cards are separated by the plate shadow');
  assert.ok(!intro.includes('borderColor: glass.glassEdge'), 'intro cards have no glass edge');
  assert.ok(intro.includes('setRevealedCount((n) => Math.min(n + 1, totalBlocks))'), 'tap-to-reveal behavior remains real');
  assert.ok(intro.includes('onComplete();'), 'the existing start completion action remains wired');
});

test('intro derives contrast and tangible glass layers from the rendered Liquid palette', () => {
  assert.ok(intro.includes('isLiquidGlassLight(glass.bg)'), 'rich card contrast derives from its rendered Liquid Glass background');
  // зачем: шапка теперь по макету C1 (заголовок + название + энергия на плоских тонах темы), пилюли уровня с цветом и блика нет.
  assert.ok(!intro.includes('isLightThemeMode(themeMode)'), 'legacy sagePorcelain mode cannot force a light-on-dark contrast branch');
  assert.ok(intro.includes('styles.glassSheen'), 'each intro card gets a static pointer-safe glass sheen');
  // зачем (стиль «Тень» 12.10, координатор: красные сторожи): волосяных обводок у стекла больше нет.
  assert.ok(!intro.includes('borderWidth: StyleSheet.hairlineWidth'), 'glass cards have no hairline border');
  assert.ok(intro.includes('<BlurView'), 'each of the bounded intro cards gets a real blur layer');
  assert.ok(intro.includes("Platform.OS === 'android' ? 'dimezisBlurView' : 'none'"), 'Android uses the approved experimental blur implementation');
  assert.ok(intro.includes("intensity={Platform.OS === 'android' ? 8 : 12}"), 'blur intensity stays low for the three animated cards');
  assert.ok(intro.includes("const enableLiveBlur = Platform.OS !== 'android';"), 'Android: no live blur on intro cards (dimezis captured the card text and drew a glow under it, owner 18.10)');
  assert.ok(intro.includes('{enableLiveBlur ? (\n          <BlurView'), 'the bound gates the real BlurView rather than only documenting it');
  assert.ok(intro.includes('pointerEvents="none"'), 'decorative glass layers do not intercept reveal or CTA taps');
});
