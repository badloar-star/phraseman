// Координатор 29.10 (разбор JS-стопа на «Пике», улика Сайта): монтаж башни (~500 узлов SVG) в кадре появления экрана давал всплеск сборок мусора
// (кадр peak: 61 за тик, у соседей 35–45). Башня «Итога недели», тура и кадра «peak» теперь встаёт следующим кадром (SpireTowerDeferred), до этого — рамка
// ТОГО ЖЕ размера, чтобы раскладка не прыгала. Сторож проверяет: размер рамки = размеру Svg (3 случая), порядок «рамка → башня», отмену при размонтаже,
// что все места монтажа идут через обёртку, и что патч для файла Codex лежит и применим.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;
jest.mock('react-native-svg', () => ({ __esModule: true, default: () => null, Circle: () => null, Ellipse: () => null, Path: () => null, Polygon: () => null, Rect: () => null, G: () => null, Defs: () => null, LinearGradient: () => null, RadialGradient: () => null, Stop: () => null, Line: () => null, Text: () => null, ClipPath: () => null, Mask: () => null }));
jest.mock('react-native', () => ({
  View: 'View',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
}));
jest.mock('../components/spire/SpireTowerSvg', () => {
  const actual = jest.requireActual('../components/spire/SpireTowerSvg');
  const ReactActual = jest.requireActual('react');
  return { ...actual, __esModule: true, default: () => ReactActual.createElement('View', { testID: 'spire-tower-real' }) };
});

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { act, render } from '@testing-library/react-native';
import SpireTowerDeferred from '../components/spire/SpireTowerDeferred';
import { spireTowerSvgHeight } from '../components/spire/SpireTowerSvg';
import { SPIRE_DEFAULT_SKIN } from '../modules/spire/tower_skins';
import { SPIRE_FLOOR_COUNT, SPIRE_TOWER_GEOM, SPIRE_TW } from '../components/spire/spire_tower_model';
import { spireWeekTopViewBox } from '../components/spire/spire_tower_bounds';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const noop = (): void => undefined;

describe('башня встаёт следующим кадром', () => {
  let logSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    logSpy.mockRestore();
  });

  it('высота рамки = высота Svg: целая башня, срезанная тур-башня, верхушка «Итога недели» (обычная и вершина)', () => {
    const w = 240;
    expect(spireTowerSvgHeight({ width: w, myFloor: null })).toBeCloseTo(SPIRE_TOWER_GEOM.height * (w / SPIRE_TW), 6);
    const crop = 340 / (w / SPIRE_TW);
    expect(spireTowerSvgHeight({ width: w, myFloor: null, cropHeight: crop })).toBeCloseTo(340, 6);
    expect(spireTowerSvgHeight({ width: w, myFloor: null, cropHeight: 99999 })).toBeCloseTo(SPIRE_TOWER_GEOM.height * (w / SPIRE_TW), 6);
    for (const myFloor of [1, SPIRE_FLOOR_COUNT]) {
      const vb = spireWeekTopViewBox(SPIRE_DEFAULT_SKIN, myFloor === SPIRE_FLOOR_COUNT);
      expect(spireTowerSvgHeight({ width: 120, myFloor, variant: 'weekTop' })).toBeCloseTo((120 * vb.h) / vb.w, 6);
    }
  });

  it('в первом кадре — пустая рамка того же размера без касаний и без диктора; башни ещё нет', async () => {
    const view = await render(<SpireTowerDeferred source="test" lang="ru" myFloor={null} selected={0} onSelect={noop} width={240} />);
    const frame = view.getByTestId('spire-tower-placeholder', { includeHiddenElements: true });
    expect(view.queryByTestId('spire-tower-real')).toBeNull();
    const flat = Object.assign({}, ...(Array.isArray(frame.props.style) ? frame.props.style : [frame.props.style]));
    expect(flat.width).toBe(240);
    expect(flat.height).toBeCloseTo(spireTowerSvgHeight({ width: 240, myFloor: null }), 6);
    expect(frame.props.pointerEvents).toBe('none');
    expect(frame.props.accessibilityElementsHidden).toBe(true);
  });

  it('после двух кадров рамку заменяет башня; в журнал уходит метка и задержка', async () => {
    const view = await render(<SpireTowerDeferred source="test_src" lang="ru" myFloor={null} selected={0} onSelect={noop} width={240} />);
    await act(async () => { jest.advanceTimersByTime(16); });
    expect(view.queryByTestId('spire-tower-real')).toBeNull(); // один кадр ещё мало
    await act(async () => { jest.advanceTimersByTime(40); });
    expect(view.queryByTestId('spire-tower-real')).not.toBeNull();
    expect(view.queryByTestId('spire-tower-placeholder', { includeHiddenElements: true })).toBeNull();
    const logged = logSpy.mock.calls.map((c) => c.join(' ')).filter((l) => l.includes('[SPIRE-TOWER-DEFER]'));
    expect(logged).toHaveLength(1);
    expect(logged[0]).toContain('test_src');
  });

  it('размонтирование до второго кадра отменяет монтаж (нет setState после ухода и нет лишнего лога)', async () => {
    const view = await render(<SpireTowerDeferred source="test" lang="ru" myFloor={null} selected={0} onSelect={noop} width={240} />);
    await view.unmount();
    await act(async () => { jest.advanceTimersByTime(200); });
    expect(logSpy.mock.calls.some((c) => c.join(' ').includes('[SPIRE-TOWER-DEFER]'))).toBe(false);
  });

  it('места монтажа идут через обёртку, а не напрямую (тур, «Итог недели»); патч для кадра «peak» лежит и содержит замену', () => {
    for (const rel of ['components/spire/SpireTour.tsx', 'components/spire/SpireWeekResultCard.tsx']) {
      const src = read(rel);
      expect(src).toContain("import SpireTowerDeferred from './SpireTowerDeferred';");
      expect(src).toContain('<SpireTowerDeferred source=');
      expect(src).not.toContain('<SpireTowerSvg');
    }
    const patch = read('docs/work/handover/spire-tower-deferred-mount-2026-10-29.patch');
    expect(patch).toContain('+import SpireTowerDeferred');
    expect(patch).toContain('+              <SpireTowerDeferred source="announcement_peak"');
    // башня-«окна», уже собранные заранее, остаются как были (повторная отсрочка ничего не даёт)
    expect(read('components/spire/moments/MomentPromotion.tsx')).toContain('<SpireTowerSvg');
    expect(read('components/spire/moments/SpireFloorMoment.tsx')).toContain('{towerReady ? <SpireTowerSvg');
  });
});
