import fs from 'node:fs';
import path from 'node:path';

import {
  initialSettleState,
  isRuntimeSettled,
  nextSettleState,
  RUNTIME_ACTIVE_SETTLE_FALLBACK_MS,
} from '../app/runtime_active_settle';

// зачем (R137, координатор 18.10): активация Главной после возврата с экрана стека ждёт конца перехода (focusTick), чтобы рендеры не шли внутри анимации «назад».
describe('активация экрана после возврата ждёт конца перехода', () => {
  it('в фокусе с самого монтирования — активен сразу, ждать нечего', () => {
    const state = initialSettleState(true);
    expect(isRuntimeSettled(state, 0, false)).toBe(true);
    expect(isRuntimeSettled(state, 7, false)).toBe(true);
  });

  it('не в фокусе — не активен', () => {
    expect(isRuntimeSettled(initialSettleState(false), 3, false)).toBe(false);
    expect(isRuntimeSettled(initialSettleState(false), 3, true)).toBe(false);
  });

  it('вернулся фокус: до смены focusTick — не активен, после — активен (два рендера сливаются в один)', () => {
    let state = initialSettleState(false);
    state = nextSettleState(state, true, 4); // фокус вернулся при focusTick=4
    expect(state).toEqual({ focused: true, tickAtFocus: 4 });
    expect(isRuntimeSettled(state, 4, false)).toBe(false);
    expect(isRuntimeSettled(state, 5, false)).toBe(true);
  });

  it('страховка: focusTick не сменился — через RUNTIME_ACTIVE_SETTLE_FALLBACK_MS активация идёт без него', () => {
    const state = nextSettleState(initialSettleState(false), true, 9);
    expect(isRuntimeSettled(state, 9, false)).toBe(false);
    expect(isRuntimeSettled(state, 9, true)).toBe(true);
    expect(RUNTIME_ACTIVE_SETTLE_FALLBACK_MS).toBeGreaterThan(450); // дольше анимации возврата стека
  });

  it('потеря фокуса сбрасывает ожидание, следующий возврат снова ждёт свой focusTick', () => {
    let state = nextSettleState(initialSettleState(false), true, 1);
    expect(isRuntimeSettled(state, 2, false)).toBe(true);
    state = nextSettleState(state, false, 2);
    expect(state).toEqual({ focused: false, tickAtFocus: null });
    expect(isRuntimeSettled(state, 2, false)).toBe(false);
    state = nextSettleState(state, true, 2);
    expect(isRuntimeSettled(state, 2, false)).toBe(false);
    expect(isRuntimeSettled(state, 3, false)).toBe(true);
  });

  it('то же наблюдение возвращает прежнее состояние (ни лишних объектов, ни лишних рендеров)', () => {
    const state = initialSettleState(true);
    expect(nextSettleState(state, true, 5)).toBe(state);
  });
});

describe('Главная подключена к отсрочке активации', () => {
  const root = path.resolve(__dirname, '..');
  const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');

  it('home.tsx берёт активность из useRuntimeActiveSettled с прежним условием владения', () => {
    const home = read('app/(tabs)/home.tsx');
    expect(home).toContain("import { useRuntimeActiveSettled } from '../../hooks/use_runtime_active_settled';");
    expect(home).toContain('const homeRuntimeActive = useRuntimeActiveSettled(isHomeOwner && homeOnboardingDone);');
    expect(home).not.toMatch(/\buseRuntimeActive\(/);
  });

  it('хук: те же три источника, что у useRuntimeActive, плюс фокусный тик, страховочный таймер и шаги журнала возврата', () => {
    const hook = read('hooks/use_runtime_active_settled.ts');
    expect(hook).toContain('return screenFocused && appActive && ownerVisible && settled;');
    expect(hook).toContain('useTabFocusTick()');
    expect(hook).toContain('setTimeout(');
    expect(hook).toContain('clearTimeout(timer)');
    // каждый отложенный возврат кончается записью исхода в журнал: settled (via=focus_tick | fallback) или cancelled_blur; пишет и [HOME-ACTIVE-SETTLE], и шаг возврата
    for (const event of ['deferred', 'settled', 'cancelled_blur']) expect(hook).toContain(`diag('${event}'`);
    expect(hook).toContain("via: fallbackElapsed ? 'fallback' : 'focus_tick'");
    expect(hook).toContain('noteBackStep(`home_active_${event}`, detail)');
    expect(hook).toContain("import { DIAG_ENABLED } from '../app/dev_diag_gate';");
    const base = read('hooks/use_runtime_active.ts');
    expect(base).toContain('return screenFocused && appActive && ownerVisible;');
  });
});
