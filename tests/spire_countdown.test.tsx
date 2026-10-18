/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { act, render } from '@testing-library/react-native';

// зачем (прямая просьба владельца через координатора 18.10): в «Пике» после «Подняться» — отсчёт 3 → 2 → 1; таймер, энергия и первое задание стартуют ТОЛЬКО после «1»;
// фон и шторка выхода ставят отсчёт на паузу (раунд в фоне не стартует), возврат начинает с 3; один экземпляр на ступень — двойное «Подняться» не даёт два отсчёта.
jest.mock('react-native', () => {
  const handlers: Array<(state: string) => void> = [];
  const AppState = {
    currentState: 'active',
    addEventListener: (_event: string, handler: (state: string) => void) => { handlers.push(handler); return { remove: () => { const i = handlers.indexOf(handler); if (i >= 0) handlers.splice(i, 1); } }; },
    __emit: (state: string) => { AppState.currentState = state; [...handlers].forEach((h) => h(state)); },
    __count: () => handlers.length,
  };
  return Object.setPrototypeOf({ AppState }, jest.requireActual('react-native'));
});
const mockHaptic = jest.fn(() => Promise.resolve());
const mockSound = jest.fn().mockReturnValue(true);
jest.mock('../modules/sound_v2/legacy_bridge', () => ({ tryPlayV2Event: (...args: unknown[]) => mockSound(...args) }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: () => mockHaptic() }));

import { SPIRE_COUNTDOWN_FROM, SPIRE_COUNTDOWN_STEP_MS, useSpireCountdown } from '../app/spire/use_spire_countdown';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const emitApp = (state: string) => (require('react-native').AppState as { __emit: (s: string) => void }).__emit(state);
const handlerCount = () => (require('react-native').AppState as { __count: () => number }).__count();

type Out = { digit: number | null };
function Probe({ paused, onDone, out }: Readonly<{ paused: boolean; onDone: () => void; out: Out }>) {
  out.digit = useSpireCountdown({ paused, onDone });
  return null;
}
const advance = async (ms: number) => { await act(async () => { jest.advanceTimersByTime(ms); }); };

describe('отсчёт 3 → 2 → 1 перед ступенью Пика', () => {
  let logSpy: jest.SpyInstance;
  beforeEach(() => { jest.useFakeTimers(); mockHaptic.mockClear(); mockSound.mockClear(); logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined); emitApp('active'); });
  afterEach(() => { logSpy.mockRestore(); jest.useRealTimers(); });

  it('первый кадр уже с цифрой 3; 3 → 2 → 1 по ~0,9 с; раунд стартует ТОЛЬКО после «1», один раз', async () => {
    const onDone = jest.fn();
    const out: Out = { digit: null };
    await render(<Probe paused={false} onDone={onDone} out={out} />);
    expect(out.digit).toBe(3);
    expect(SPIRE_COUNTDOWN_STEP_MS).toBeGreaterThanOrEqual(800);
    expect(SPIRE_COUNTDOWN_STEP_MS).toBeLessThanOrEqual(1000);
    await advance(SPIRE_COUNTDOWN_STEP_MS - 1);
    expect(out.digit).toBe(3);
    await advance(1);
    expect(out.digit).toBe(2);
    await advance(SPIRE_COUNTDOWN_STEP_MS);
    expect(out.digit).toBe(1);
    expect(onDone).not.toHaveBeenCalled(); // «1» ещё на экране — время человеку не тратится, раунд не начат
    await advance(SPIRE_COUNTDOWN_STEP_MS);
    expect(out.digit).toBeNull();
    expect(onDone).toHaveBeenCalledTimes(1);
    await advance(10_000);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('вибрация и звук V2 на каждой из трёх цифр', async () => {
    await render(<Probe paused={false} onDone={jest.fn()} out={{ digit: null }} />);
    for (let i = 0; i < SPIRE_COUNTDOWN_FROM; i += 1) await advance(SPIRE_COUNTDOWN_STEP_MS); // по одной цифре, как на устройстве
    expect(mockHaptic).toHaveBeenCalledTimes(SPIRE_COUNTDOWN_FROM);
    expect(mockSound).toHaveBeenCalledTimes(SPIRE_COUNTDOWN_FROM);
    expect(mockSound).toHaveBeenCalledWith('tap', 'spire.countdown');
  });

  it('свернули приложение во время отсчёта — пауза, раунд в фоне не стартует; вернулись — заново с 3', async () => {
    const onDone = jest.fn();
    const out: Out = { digit: null };
    await render(<Probe paused={false} onDone={onDone} out={out} />);
    await advance(SPIRE_COUNTDOWN_STEP_MS + 100); // уже «2»
    expect(out.digit).toBe(2);
    await act(async () => { emitApp('background'); });
    expect(out.digit).toBeNull();
    await advance(60_000); // сколько угодно в фоне
    expect(onDone).not.toHaveBeenCalled();
    await act(async () => { emitApp('active'); });
    expect(out.digit).toBe(3);
    await advance(SPIRE_COUNTDOWN_STEP_MS * 2);
    expect(onDone).not.toHaveBeenCalled();
    await advance(SPIRE_COUNTDOWN_STEP_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('шторка выхода открыта — пауза; закрыли — отсчёт заново с 3', async () => {
    const onDone = jest.fn();
    const out: Out = { digit: null };
    const view = await render(<Probe paused={false} onDone={onDone} out={out} />);
    await advance(SPIRE_COUNTDOWN_STEP_MS * 2 + 50); // «1»
    await view.rerender(<Probe paused onDone={onDone} out={out} />);
    expect(out.digit).toBeNull();
    await advance(30_000);
    expect(onDone).not.toHaveBeenCalled();
    await view.rerender(<Probe paused={false} onDone={onDone} out={out} />);
    expect(out.digit).toBe(3);
    await advance(SPIRE_COUNTDOWN_STEP_MS * SPIRE_COUNTDOWN_FROM);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('после «1» новые смены паузы/фона отсчёт не запускают второй раз', async () => {
    const onDone = jest.fn();
    const out: Out = { digit: null };
    await render(<Probe paused={false} onDone={onDone} out={out} />);
    await advance(SPIRE_COUNTDOWN_STEP_MS * SPIRE_COUNTDOWN_FROM);
    expect(onDone).toHaveBeenCalledTimes(1);
    await act(async () => { emitApp('background'); });
    await act(async () => { emitApp('active'); });
    await advance(10_000);
    expect(out.digit).toBeNull();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('размонтирование снимает подписку на фон и таймеры', async () => {
    const onDone = jest.fn();
    const view = await render(<Probe paused={false} onDone={onDone} out={{ digit: null }} />);
    expect(handlerCount()).toBe(1);
    await view.unmount();
    expect(handlerCount()).toBe(0);
    await advance(10_000);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('журнал [SPIRE-COUNTDOWN]: старт, каждая цифра, пауза с причиной, старт раунда', async () => {
    const out: Out = { digit: null };
    const view = await render(<Probe paused={false} onDone={jest.fn()} out={out} />);
    await act(async () => { emitApp('background'); });
    await act(async () => { emitApp('active'); });
    await view.rerender(<Probe paused onDone={jest.fn()} out={out} />);
    await view.rerender(<Probe paused={false} onDone={jest.fn()} out={out} />);
    for (let i = 0; i < SPIRE_COUNTDOWN_FROM; i += 1) await advance(SPIRE_COUNTDOWN_STEP_MS);
    const written = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(written).toContain('[SPIRE-COUNTDOWN] start run=1');
    expect(written).toContain('[SPIRE-COUNTDOWN] digit=3');
    expect(written).toContain('[SPIRE-COUNTDOWN] digit=1');
    expect(written).toContain('[SPIRE-COUNTDOWN] pause reason=app_background');
    expect(written).toContain('[SPIRE-COUNTDOWN] pause reason=exit_sheet');
    expect(written).toContain('[SPIRE-COUNTDOWN] done');
  });
});

describe('подключение: раннер ждёт отсчёт, экран рисует цифры на UI-потоке', () => {
  const runner = read('app/spire/use_spire_step_runner.ts');
  const screen = read('components/spire/SpireStepScreen.tsx');
  const overlay = read('components/spire/SpireCountdownOverlay.tsx');

  it('раннер стартует в фазе countdown; энергия, таймер и первое задание — только после «1»', () => {
    expect(runner).toContain("useState<SpireRunnerPhase>('countdown')");
    expect(runner).toContain("useSpireCountdown({ paused: exitOpen, onDone: () => setPhase('charging') })");
    const charge = runner.slice(runner.indexOf('// ── 1. Списание энергии'), runner.indexOf('// ── 2. Первое задание'));
    expect(charge).toContain("if (phase !== 'charging') return;"); // до конца отсчёта ничего не списывается
    expect(charge.indexOf("if (phase !== 'charging') return;")).toBeLessThan(charge.indexOf('confirmSpendOne(intent)'));
    expect(charge.indexOf('confirmSpendOne(intent)')).toBeLessThan(charge.indexOf("setPhase('playing')"));
    // тик таймера идёт только в фазе playing — в countdown он стоит
    expect(runner).toContain("if (phase !== 'playing') return undefined;");
  });

  it('выход во время отсчёта не тратит энергию (как выход до списания)', () => {
    expect(runner).toContain("if (phase === 'charging' || phase === 'countdown') {");
  });

  it('экран передаёт цифру в вёрстку; под цифрами «Готовим ступень…» не рисуется; один экземпляр на ступень (ключ runId)', () => {
    expect(screen).toContain('countdownDigit={runner.countdownDigit}');
    expect(screen).toContain("preparing={runner.phase === 'charging' || runner.phase === 'countdown'}");
    expect(screen).toContain('<SpireCountdownOverlay digit={props.countdownDigit ?? null} />');
    expect(screen).toContain('<StepBody key={session.runId}');
  });

  it('анимация на UI-потоке (Reanimated), «уменьшить движение» — без масштаба, слой не ловит касания', () => {
    expect(overlay).toContain("from 'react-native-reanimated'");
    expect(overlay).toContain('useSharedValue');
    expect(overlay).toContain('useAnimatedStyle');
    expect(overlay).toContain('withTiming');
    expect(overlay).toContain('useReduceMotion()');
    expect(overlay).toMatch(/if \(reduceMotion\) \{[\s\S]{0,200}progress\.value = 1;/);
    expect(overlay).toContain('pointerEvents="none"');
    expect(overlay).not.toMatch(/borderWidth|borderColor|adjustsFontSizeToFit/);
    // покадрового setState нет: цифра меняется три раза за отсчёт, больше React ничего не перерисовывает
    expect(overlay).not.toMatch(/requestAnimationFrame|setInterval/);
  });
});
