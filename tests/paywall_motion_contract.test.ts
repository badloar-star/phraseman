// ════════════════════════════════════════════════════════════════════════════
// paywall_motion_contract.test.ts — контракт премиальной моушн-обвязки пейволов.
//
// Фиксирует: components/paywall/PaywallMotion.tsx существует и экспортирует все
// четыре куска (Entrance/IdleFloat/CtaShine/BadgePop); бесконечные лупы гейтятся
// фокусом экрана + AppState, reduce-motion выключает вход и лупы. Экраны A–G,
// CTA-блок и карточки тарифов удалены 2026-09-30 (единственный пейвол Plus). Только source-grep, в стиле соседних
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

describe('shared paywall chrome keeps the glyph float', () => {
  it('glyph capsule floats (paywallShared)', () => {
    const shared = read('components/paywall/paywallShared.tsx');
    expect(shared).toContain("import { PaywallIdleFloat } from './PaywallMotion';");
    expect(shared).toContain('<PaywallIdleFloat');
  });
});
