// Ревизор 29.10 (🟡 к c2bc33c7b): высота башни считалась дважды — в spireTowerSvgHeight (по ней SpireTowerDeferred рисует рамку до башни) и отдельными копиями
// в самом рендере; поменяли бы одну — рамка разошлась бы с башней и вёрстка прыгнула. Теперь Svg в обоих вариантах берёт высоту из spireTowerSvgHeight.
// Сторож: настоящий SpireTowerSvg рисуется с перехватом свойств Svg и сверяется с НЕЗАВИСИМЫМИ формулами (целая башня, срезанная тур-башня, верхушка недели),
// а исходник не содержит прежних копий формулы внутри Svg.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

const mockSvgProps: Array<{ width: number; height: number; viewBox: string }> = [];
jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: (p: { width: number; height: number; viewBox: string }) => { mockSvgProps.push({ width: p.width, height: p.height, viewBox: p.viewBox }); return null; },
  Circle: () => null, Ellipse: () => null, Path: () => null, Polygon: () => null, Rect: () => null, G: () => null, Defs: () => null,
  LinearGradient: () => null, RadialGradient: () => null, Stop: () => null, Line: () => null, Text: () => null, ClipPath: () => null, Mask: () => null,
}));
jest.mock('react-native', () => ({
  View: 'View',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
}));

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render } from '@testing-library/react-native';
import SpireTowerSvg, { spireTowerSvgHeight } from '../components/spire/SpireTowerSvg';
import { SPIRE_DEFAULT_SKIN } from '../modules/spire/tower_skins';
import { SPIRE_FLOOR_COUNT, SPIRE_TOWER_GEOM, SPIRE_TW } from '../components/spire/spire_tower_model';
import { spireWeekTopViewBox } from '../components/spire/spire_tower_bounds';

const noop = (): void => undefined;
const lastSvg = () => mockSvgProps[mockSvgProps.length - 1]!;

describe('высота Svg башни — один источник (spireTowerSvgHeight)', () => {
  beforeEach(() => { mockSvgProps.length = 0; });

  it('целая башня: высота Svg = геометрия x ширина / SPIRE_TW = высота рамки', async () => {
    await render(<SpireTowerSvg lang="ru" myFloor={null} selected={0} onSelect={noop} width={240} />);
    expect(lastSvg().height).toBeCloseTo((SPIRE_TOWER_GEOM.height * 240) / SPIRE_TW, 6);
    expect(lastSvg().height).toBe(spireTowerSvgHeight({ width: 240, myFloor: null }));
  });

  it('тур-башня со срезом низа: высота Svg = срез x масштаб = высота рамки', async () => {
    const crop = 340 / (240 / SPIRE_TW);
    await render(<SpireTowerSvg lang="ru" myFloor={null} selected={0} onSelect={noop} width={240} cropHeight={crop} />);
    expect(lastSvg().height).toBeCloseTo(340, 6);
    expect(lastSvg().height).toBe(spireTowerSvgHeight({ width: 240, myFloor: null, cropHeight: crop }));
  });

  it.each([1, SPIRE_FLOOR_COUNT])('верхушка «Итога недели» (этаж %i): высота Svg = ширина x vb.h / vb.w = высота рамки', async (myFloor) => {
    await render(<SpireTowerSvg variant="weekTop" lang="ru" myFloor={myFloor} selected={0} onSelect={noop} width={120} />);
    const vb = spireWeekTopViewBox(SPIRE_DEFAULT_SKIN, myFloor === SPIRE_FLOOR_COUNT);
    expect(lastSvg().height).toBeCloseTo((120 * vb.h) / vb.w, 6);
    expect(lastSvg().height).toBe(spireTowerSvgHeight({ width: 120, myFloor, variant: 'weekTop' }));
  });

  it('в рендере нет прежних копий формулы: оба Svg берут height={svgH}', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components/spire/SpireTowerSvg.tsx'), 'utf8').replace(/\r\n/g, '\n');
    expect(src).toContain('const svgH = spireTowerSvgHeight({ width, myFloor, variant, cropHeight, skin });');
    expect((src.match(/<Svg width=\{width\} height=\{svgH\} viewBox=/g) ?? []).length).toBe(2);
    expect(src).not.toContain('height={(width * vb.h) / vb.w}');
    expect(src).not.toContain('height={visibleH * scale}');
  });
});
