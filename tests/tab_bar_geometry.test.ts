import fs from 'fs';
import path from 'path';

import { TAB_BAR_PAD, TAB_BAR_SIDE_MARGIN, computeTabBarGeometry, tabCapLeft, tabCapRightFits } from '../components/v2/tab_bar_geometry';

// зачем (владелец 11.10, капсом: «кнопки на таб-баре справа все обрезаны»): сумма ширин слотов не превышает внутреннюю ширину капсулы, а капсула —
// ширину окна, при любом числе вкладок, ширине окна (в том числе очень узкой) и безопасных зонах слева/справа. Плюс сторож источника: V2TabBar берёт
// отступы из этой функции и пишет журнал [TABBAR].
const WIDTHS = [280, 320, 360, 375, 393, 412, 430, 600, 768, 1024];
const COUNTS = [3, 4, 5, 6];
const INSETS: ReadonlyArray<readonly [number, number]> = [[0, 0], [0, 24], [24, 0], [48, 48], [34, 0]];

describe('tab bar geometry', () => {
  test.each(WIDTHS)('width %i dp: capsule fits the window, slots fit the capsule, last cap fits', (windowWidth) => {
    for (const count of COUNTS) {
      for (const [insetLeft, insetRight] of INSETS) {
        const g = computeTabBarGeometry({ windowWidth, insetLeft, insetRight, count });
        expect(g.left + g.width + g.right).toBeCloseTo(windowWidth, 5);
        expect(g.overflow).toBeLessThanOrEqual(0.001);
        for (let i = 0; i < count; i++) expect(tabCapRightFits(g.width, g.slotW, i)).toBe(true);
        expect(tabCapLeft(g.slotW, 0)).toBe(TAB_BAR_PAD);
      }
    }
  });

  test('side margins are equal without insets and grow with the safe areas', () => {
    const plain = computeTabBarGeometry({ windowWidth: 360, count: 5 });
    expect(plain.left).toBe(TAB_BAR_SIDE_MARGIN);
    expect(plain.right).toBe(TAB_BAR_SIDE_MARGIN);
    const cut = computeTabBarGeometry({ windowWidth: 360, insetLeft: 0, insetRight: 40, count: 5 });
    expect(cut.right).toBe(TAB_BAR_SIDE_MARGIN + 40);
    expect(cut.width).toBe(360 - TAB_BAR_SIDE_MARGIN * 2 - 40);
  });

  test('degenerate input never produces negative sizes', () => {
    const g = computeTabBarGeometry({ windowWidth: 10, insetLeft: 20, insetRight: 20, count: 0 });
    expect(g.width).toBe(0);
    expect(g.slotW).toBe(0);
  });
});

describe('V2TabBar source', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'v2', 'V2TabBar.tsx'), 'utf8').replace(/\r\n/g, '\n');
  test('takes the sides from the geometry function and logs [TABBAR]', () => {
    expect(src).toContain('computeTabBarGeometry');
    expect(src).toContain('left: geo.left, width: geo.width');
    expect(src).not.toMatch(/right: SIDE_MARGIN/);
    expect(src).toContain("DebugLogger.info('[TABBAR]'");
    expect(src).toContain('measureInWindow');
    expect(src).toContain('OVERFLOW');
  });

  test('rims and fills never fade out on the right side (owner 11.10: «обрезано справа» was a visual cut)', () => {
    const opacities = (id: string): number[] => {
      const block = src.slice(src.indexOf(`id="${id}"`), src.indexOf('</SvgLinearGradient>', src.indexOf(`id="${id}"`)) + 30);
      return [...block.matchAll(/stopOpacity=\{([\d.]+)\}/g)].map((m) => Number(m[1]));
    };
    const bar = opacities('v2TabRim');
    expect(bar[bar.length - 1]).toBeGreaterThanOrEqual(0.45);
    expect(Math.min(...bar.slice(2, 4))).toBeGreaterThanOrEqual(0.2);
    expect(Math.min(...opacities('v2TabCapRim'))).toBeGreaterThanOrEqual(0.5);
    const radial = src.slice(src.indexOf('id="v2TabCapFill"'), src.indexOf('</RadialGradient>'));
    const fill = [...radial.matchAll(/stopOpacity=\{([\d.]+)\}/g)].map((m) => Number(m[1]));
    expect(fill[fill.length - 1]).toBeGreaterThanOrEqual(0.1);
  });

  test('the capsule rim keeps the same safe inset from the SVG canvas edge as the cap (Android rounds the canvas down)', () => {
    const rim = src.slice(src.indexOf('const BarRim'), src.indexOf('const CapFill'));
    expect(rim).toContain('x={CAP_EDGE_INSET} y={CAP_EDGE_INSET} width={width - CAP_EDGE_INSET * 2}');
    expect(rim).not.toContain('x={0.5} y={0.5}');
  });

  test('the cap is placed instantly when the slot width changes, springs only between tabs (no mint tail)', () => {
    expect(src).toContain('const slotChanged = lastSlotWRef.current > 0');
    expect(src).toMatch(/capX\.stopAnimation\(\);\s*capX\.setValue\(to\);/);
    expect(src).toContain('capX.stopAnimation(); // зачем: старая пружина');
  });

  test('logs the measured cell widths next to window width, insets and tab count (one frame gives the cause)', () => {
    expect(src).toContain('cells windowW=');
    expect(src).toContain('widths=[');
    expect(src).toContain('[CELLS-OVERFLOW]');
    expect(src).toMatch(/onLayout=\{\(e\) => \{ cellsRef\.current\[i\]/);
  });
});
