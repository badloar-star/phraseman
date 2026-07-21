// ════════════════════════════════════════════════════════════════════════════
// paywall_motion_contract.test.ts — контракт премиальной моушн-обвязки пейволов.
//
// Фиксирует: components/paywall/PaywallMotion.tsx существует и экспортирует все
// четыре куска (Entrance/IdleFloat/CtaShine/BadgePop); бесконечные лупы гейтятся
// фокусом экрана + AppState, reduce-motion выключает вход и лупы; экраны A–G
// используют каскадный вход; общие компоненты несут float/shine/pop, чтобы
// варианты D–G наследовали их бесплатно. Только source-grep, в стиле соседних
// контрактов (paywall_tonal_container_design_contract и др.).
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('paywall motion module', () => {
  const source = read('components/paywall/PaywallMotion.tsx');

  it('exists and exports all four motion pieces', () => {
    expect(source).toContain('export function PaywallEntrance');
    expect(source).toContain('export function PaywallIdleFloat');
    expect(source).toContain('export function PaywallCtaShine');
    expect(source).toContain('export function PaywallBadgePop');
  });

  it('runs on reanimated only (no core Animated values, no timers, transform/opacity only)', () => {
    expect(source).toContain("from 'react-native-reanimated'");
    expect(source).not.toContain('new Animated.Value');
    expect(source).not.toContain('setInterval');
    expect(source).not.toContain('requestAnimationFrame');
    // Никаких layout-анимаций: только transform/opacity в animated-стилях.
    expect(source).not.toContain('LayoutAnimation');
    expect(source).not.toContain('withLayout');
  });

  it('gates every infinite loop by screen focus plus AppState (Perf Bible)', () => {
    expect(source).toContain('useIsScreenFocused');
    expect(source).toContain('AppState.currentState');
    expect(source).toContain('AppState.addEventListener');
    expect(source).toContain('cancelAnimation');
    // Лупы реально есть (idle float / shine / badge pulse) и все — reverse/sequence на reanimated.
    expect(source).toContain('withRepeat(');
    expect(source).toContain('-1');
  });

  it('disables entrance and loops under reduce motion', () => {
    expect(source).toContain('useReduceMotion');
    expect(source).toContain("from '../../hooks/use_reduce_motion'");
    // Reduce-motion: финальный кадр сразу (progress/pop = 1), лупы не стартуют.
    expect(source).toContain('progress.value = 1');
    expect(source).toContain('pop.value = 1');
    expect(source).toContain('isFocused && !reduceMotion');
  });
});

describe('paywall screens use the motion cascade', () => {
  it.each(['a', 'b', 'c', 'd', 'e', 'f', 'g'])('app/paywall_%s.tsx mounts PaywallEntrance blocks', (letter) => {
    const source = read(`app/paywall_${letter}.tsx`);
    expect(source).toContain("from '../components/paywall/PaywallMotion'");
    expect(source).toContain('<PaywallEntrance index={0}>');
    expect(source).toContain('<PaywallEntrance index={1}>');
  });

  it('A/B/C visibly cascade glyph, plans, CTA and proof content', () => {
    for (const letter of ['a', 'b', 'c']) {
      const source = read(`app/paywall_${letter}.tsx`);
      // Герой-глиф и заголовок — первые два звена каскада.
      expect(source).toMatch(/<PaywallEntrance index=\{0\}>\s*<PaywallGlyphCapsule/);
      expect(source).toMatch(/<PaywallEntrance index=\{4\}[^>]*>\s*<PaywallCtaBlock/);
    }
  });
});

describe('shared paywall components carry float, shine and badge pop (D–G inherit)', () => {
  it('glyph capsule floats (paywallShared)', () => {
    const shared = read('components/paywall/paywallShared.tsx');
    expect(shared).toContain("import { PaywallIdleFloat } from './PaywallMotion';");
    expect(shared).toContain('<PaywallIdleFloat');
  });

  it('primary CTA has the shine sweep (PaywallCtaBlock)', () => {
    const cta = read('components/paywall/PaywallCtaBlock.tsx');
    expect(cta).toContain("import { PaywallCtaShine } from './PaywallMotion';");
    expect(cta).toContain('<PaywallCtaShine />');
  });

  it('savings badges pop in plan cards and plan tiles', () => {
    const cards = read('components/paywall/PaywallPlanCards.tsx');
    expect(cards).toContain("import { PaywallBadgePop } from './PaywallMotion';");
    expect(cards).toContain('<PaywallBadgePop');
    const tiles = read('components/paywall/PaywallPlanTiles.tsx');
    expect(tiles).toContain("import { PaywallBadgePop } from './PaywallMotion';");
    expect(tiles).toContain('<PaywallBadgePop');
  });

  it('variant E offer badge pops too', () => {
    const e = read('app/paywall_e.tsx');
    expect(e).toContain('<PaywallBadgePop');
  });
});
