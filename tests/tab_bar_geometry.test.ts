import fs from 'fs';
import path from 'path';

import { TAB_BAR_PAD, TAB_BAR_SIDE_MARGIN, TAB_CAP_MAX_W, computeTabBarGeometry, tabCapLeft, tabCapMetrics, tabCapPillLeft, tabCapRightFits } from '../components/v2/tab_bar_geometry';

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

// зачем (слово владельца, фото планшета Samsung Galaxy Tab: «фон каждой вкладки на таббаре справа обрезан, слева скруглён»): плашка активной вкладки — симметричная
// «таблетка» внутри СВОЕЙ ячейки, по центру, с РАВНЫМИ отступами слева и справа при любом числе вкладок и любой ширине (телефон, планшет, поворот).
describe('active cap sits symmetric inside its own cell (tablet bug)', () => {
  const GRID_W = [360, 411, 600, 800, 1280];
  const GRID_COUNT = [3, 4, 5];
  test.each(GRID_W)('width %i dp: cap width ≤ cell width, equal insets, never leaves the cell or the capsule', (windowWidth) => {
    for (const count of GRID_COUNT) {
      const g = computeTabBarGeometry({ windowWidth, count });
      const { capW, inset } = tabCapMetrics(g.slotW);
      expect(capW).toBeLessThanOrEqual(g.slotW + 0.001);
      expect(capW).toBeLessThanOrEqual(TAB_CAP_MAX_W);
      const insetRight = g.slotW - capW - inset;
      expect(Math.abs(inset - insetRight)).toBeLessThan(0.001); // равные отступы слева и справа
      expect(inset).toBeGreaterThanOrEqual(0);
      for (let i = 0; i < count; i++) {
        const cellLeft = tabCapLeft(g.slotW, i);
        const pillLeft = tabCapPillLeft(g.slotW, i);
        expect(pillLeft).toBeGreaterThanOrEqual(cellLeft - 0.001);
        expect(pillLeft + capW).toBeLessThanOrEqual(cellLeft + g.slotW + 0.001);
        expect(pillLeft + capW).toBeLessThanOrEqual(g.width - TAB_BAR_PAD + 0.001);
        // центр плашки = центр ячейки (иконка по центру ячейки лежит под центром плашки)
        expect(pillLeft + capW / 2).toBeCloseTo(cellLeft + g.slotW / 2, 3);
        expect(tabCapRightFits(g.width, g.slotW, i)).toBe(true);
      }
    }
  });

  test('on a phone the cap still fills the whole cell (look unchanged); on a tablet it is capped and centered', () => {
    const phone = computeTabBarGeometry({ windowWidth: 411, count: 5 });
    expect(tabCapMetrics(phone.slotW).inset).toBe(0);
    const tablet = computeTabBarGeometry({ windowWidth: 1280, count: 4 });
    expect(tablet.slotW).toBeGreaterThan(TAB_CAP_MAX_W);
    expect(tabCapMetrics(tablet.slotW).capW).toBe(TAB_CAP_MAX_W);
    expect(tabCapMetrics(tablet.slotW).inset).toBeGreaterThan(0);
  });

  test('the source mirrors the fill (no fade-out on the right), centers the cap and logs [TABBAR-LAYOUT]', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'v2', 'V2TabBar.tsx'), 'utf8').replace(/\r\n/g, '\n');
    expect(src).toContain('tabCapMetrics(slotW)');
    expect(src).toContain('width: capW,');
    expect(src).toContain('<CapFill width={capW}');
    expect(src).toContain('scaleX: -1');
    expect(src).toContain("'[TABBAR-LAYOUT]'");
    expect(src).toContain('const to = PAD + activeIndex * slotW + capInset;');
    expect(src).not.toContain('<CapFill width={slotW}');
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

  // зачем (владелец 12.10, стиль «Тень» + сверка снимков 6b3890202): у таб-бара нет обводок. Прежний тест следил, чтобы ободок не бледнел справа; теперь ободка нет,
  // а заливка активной плашки по-прежнему не гаснет к правому краю («обрезано справа» было визуальным срезом).
  test('the active cap fill never fades out on the right side (owner 11.10: «обрезано справа» was a visual cut)', () => {
    const radial = src.slice(src.indexOf('id="v2TabCapFill"'), src.indexOf('</RadialGradient>'));
    const fill = [...radial.matchAll(/stopOpacity=\{([\d.]+)\}/g)].map((m) => Number(m[1]));
    expect(fill[fill.length - 1]).toBeGreaterThanOrEqual(0.1);
  });

  test('no outlines on the tab bar: no SVG rim, no second rim, no stroke around the active tab', () => {
    expect(src).not.toContain('v2TabRim');
    expect(src).not.toContain('v2TabCapRim');
    expect(src).not.toContain('const BarRim');
    expect(src).not.toContain('innerRim');
    expect(src).not.toMatch(/stroke="url\(#/);
    expect(src).not.toMatch(/borderWidth: 1, \/\/ guard-ok: D43 вторая кромка/);
  });

  test('the cap fill keeps the safe inset from the SVG canvas edge (Android rounds the canvas down)', () => {
    const fill = src.slice(src.indexOf('const CapFill'), src.indexOf('function V2TabBar'));
    expect(fill).toContain('x={CAP_EDGE_INSET} y={CAP_EDGE_INSET} width={width - CAP_EDGE_INSET * 2}');
    expect(fill).not.toContain('x={0.5} y={0.5}');
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
