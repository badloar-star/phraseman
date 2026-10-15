// зачем (координатор 15.10, «перерисовки Главной»): счётчик [HOME-RENDERS] называет ПРИЧИНУ каждого рендера (какое из перечисленных значений изменилось),
// открывает новое окно при возврате на вкладку и печатает сводку в конце 10-секундного окна. Значения в журнал не попадают — только имена ключей.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

import { act, renderHook } from '@testing-library/react-native';

jest.mock('../app/config', () => ({ IS_STORE_RELEASE: false }));

import { RENDER_CAUSE_UNLISTED, RENDER_CAUSE_WINDOW_MS, diffRenderCause, useRenderCause } from '../app/render_cause_probe';

const lines = (spy: jest.SpyInstance): Array<Record<string, unknown>> =>
  spy.mock.calls.filter((call) => call[0] === '[HOME-RENDERS]').map((call) => JSON.parse(String(call[1])) as Record<string, unknown>);

describe('diffRenderCause', () => {
  it('первый снимок — mount; изменившиеся ключи по Object.is; ничего не изменилось — parent_or_unlisted', () => {
    expect(diffRenderCause(null, { a: 1 })).toEqual(['mount']);
    expect(diffRenderCause({ a: 1, b: 2 }, { a: 1, b: 3 })).toEqual(['b']);
    expect(diffRenderCause({ a: 1 }, { a: 1 })).toEqual([RENDER_CAUSE_UNLISTED]);
    expect(diffRenderCause({ a: 1, gone: 1 }, { a: 1, fresh: 1 })).toEqual(['fresh', 'gone']);
    const same = {};
    expect(diffRenderCause({ o: same }, { o: same })).toEqual([RENDER_CAUSE_UNLISTED]);
    expect(diffRenderCause({ o: {} }, { o: {} })).toEqual(['o']);
  });
});

describe('useRenderCause', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

  it('рендер с изменением значения называет ключ, рендер без изменений — parent_or_unlisted; сводка в конце окна', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const { rerender } = await renderHook(({ value, other }: { value: number; other: number }) =>
      useRenderCause('t', () => ({ value, other }), true), { initialProps: { value: 1, other: 1 } });
    await rerender({ value: 2, other: 1 });
    await rerender({ value: 2, other: 1 });
    const perRender = lines(log).filter((l) => l.stage === undefined);
    expect(perRender.map((l) => l.changed)).toEqual([['mount'], ['value'], [RENDER_CAUSE_UNLISTED]]);
    await act(async () => { jest.advanceTimersByTime(RENDER_CAUSE_WINDOW_MS + 5); });
    const summary = lines(log).find((l) => l.stage === 'renders_window');
    expect(summary).toMatchObject({ tag: 't', window: 'cold', count: 3, byCause: { mount: 1, value: 1, [RENDER_CAUSE_UNLISTED]: 1 } });
  });

  it('смена windowKey (возврат на вкладку) закрывает прежнее окно и открывает refocus#1', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const { rerender } = await renderHook(({ active }: { active: boolean }) =>
      useRenderCause('t', () => ({ active }), active), { initialProps: { active: true } });
    await rerender({ active: false });
    await rerender({ active: true });
    const windows = lines(log).filter((l) => l.stage === undefined).map((l) => l.window);
    expect(windows).toEqual(['cold', 'refocus#1', 'refocus#2']);
    expect(lines(log).filter((l) => l.stage === 'renders_window').map((l) => l.window)).toEqual(['cold', 'refocus#1']);
  });

  it('значения в журнал не попадают, только имена ключей', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    await renderHook(() => useRenderCause('t', () => ({ secret: 'user@example.com' }), true));
    expect(JSON.stringify(log.mock.calls)).not.toContain('user@example.com');
  });
});

describe('проводка [HOME-RENDERS] (источники)', () => {
  const fs = require('node:fs') as typeof import('node:fs');
  const path = require('node:path') as typeof import('node:path');
  const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

  it('корень Главной публикует эпоху окон по homeRuntimeActive, дети берут её', () => {
    expect(read('app/(tabs)/home.tsx')).toMatch(/useRenderCause\('home', \(\) => \(\{[\s\S]*?\}\), homeRuntimeActive, true\);/);
    for (const [file, tag] of [
      ['HomeV2ContinueCard', 'continue'], ['HomeV2FeatureTiles', 'tiles'], ['HomeV2Header', 'header'], ['HomeV2TodayCard', 'today'], ['HomeV2VideoRail', 'video_rail'],
    ]) {
      expect(read(`components/home/v2/${file}.tsx`)).toContain(`useRenderCause('home:${tag}', () => ({`);
      expect(read(`components/home/v2/${file}.tsx`)).toContain('renderWindowEpoch()');
    }
  });
});

describe('по замеру coldstart_1315_r2: результат хука «Достаточно монет» не создаётся заново на каждый рендер', () => {
  const fs = require('node:fs') as typeof import('node:fs');
  const path = require('node:path') as typeof import('node:path');
  const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

  it('useMemo по полям; в снимке корня Главной — поля rankEnough, а не сам объект', () => {
    expect(read('app/use_coin_rank_enough_moment.ts')).toContain('return useMemo(() => ({ visible: visible && offer !== null, offer, close }), [visible, offer, close]);');
    const home = read('app/(tabs)/home.tsx');
    expect(home).toContain('rankEnoughVisible: rankEnough.visible, rankEnoughOffer: rankEnough.offer, rankEnoughClose: rankEnough.close');
    expect(home).toContain('goToTab, activeIdx, runtimeOwnerId, focusTick, spireTabEnabled, homeSurvey, weekMoment, welcomeBack, appSnapshot');
  });
});
