// зачем (координатор 13.10, строка 25 R1_BACKLOG; кадры spirecheck-001…004): кнопка «Играть» закрывала низ окна башни, когда «Комната недели» переехала наверх. Окно башни — ровно до дока.
// зачем (координатор 15.10, 🔴 кадр Pixel 8, шрифт 1.0): бюджет считался по модели ДО загрузки подиума; с подиумом окно 116 dp и карточка «Этаж 1» под «Играть». Три режима: обычный / компактная карточка / прокрутка страницы.
import fs from 'node:fs';
import path from 'node:path';
import {
  SPIRE_COMPACT_FLOOR_INFO_ENABLED, SPIRE_COMPACT_MIN_RAW_FIT, SPIRE_COMPACT_MIN_RAW_FIT_HOLD, SPIRE_COMPACT_WINDOW_H, SPIRE_COMPACT_WINDOW_H_OFF,
  SPIRE_FLOOR_INFO_COMPACT_H, SPIRE_FLOOR_INFO_FULL_H, SPIRE_WINDOW_MAX, SPIRE_WINDOW_MIN, SPIRE_WINDOW_MIN_COMPACT,
  spireFloorInfoCompact, spireTowerRawFit, spireTowerWindowHeight,
} from '../components/spire/spire_tower_window';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('высота окна башни до дока', () => {
  it('не измерено (0) — прежние 400 по макету', () => {
    expect(spireTowerWindowHeight(0, 734, 16)).toBe(SPIRE_WINDOW_MAX);
    expect(spireTowerWindowHeight(442, 0, 16)).toBe(SPIRE_WINDOW_MAX);
    expect(spireTowerWindowHeight(Number.NaN, 734, 16)).toBe(SPIRE_WINDOW_MAX);
  });

  it('кадр spirecheck: окно сверху 442, док 734, зазор 16 → 276 (нижние этажи выше кнопки)', () => {
    expect(spireTowerWindowHeight(442, 734, 16)).toBe(276);
  });

  it('места много — окно по макету 400; мало — не ниже 220 (режим прокрутки страницы); компактный режим — не ниже 120', () => {
    expect(spireTowerWindowHeight(200, 900, 16)).toBe(SPIRE_WINDOW_MAX);
    expect(spireTowerWindowHeight(600, 734, 16)).toBe(SPIRE_WINDOW_MIN);
    expect(spireTowerWindowHeight(600, 734, 16, true)).toBe(SPIRE_WINDOW_MIN_COMPACT);
    expect(SPIRE_WINDOW_MIN).toBe(220);
    expect(SPIRE_WINDOW_MIN_COMPACT).toBe(120);
    expect(SPIRE_WINDOW_MAX).toBe(400);
  });

  it('экран передаёт измерения башне через бюджет, башня берёт высоту из пропа и повторно центрует этаж', () => {
    const home = read('components/spire/SpireHomeScreen.tsx');
    expect(home).toContain('const budget = useSpireTowerBudget(DOCK_GAP);');
    expect(home).toContain('const towerWindowH = budget.windowH;');
    expect(home).toContain('windowHeight={towerWindowH}');
    expect(home).toContain('budget.onDockTop(Math.round(e.nativeEvent.layout.y))');
    expect(home).toContain('budget.onTowerTop(Math.round(e.nativeEvent.layout.y))');
    expect(home).toContain('budget.onInfoHeight(Math.round(e.nativeEvent.layout.height))');
    expect(home).toContain('compact={budget.compact}');
    const hook = read('components/spire/use_spire_tower_budget.ts');
    expect(hook).toContain('spireTowerWindowHeight(towerTop, dockTop, gap + infoH, compact)');
    expect(hook).toContain('spireFloorInfoCompact(rawFit, wasCompactRef.current)');
    expect(hook).toContain('[SPIRE-BUDGET]');
    const tower = read('components/spire/SpireTower.tsx');
    expect(tower).toContain('windowHeight?: number;');
    expect(tower).toContain('{ height: windowHeight, backgroundColor: g.plateFillFrom }');
    expect(tower).toContain("scrollToFloor(myFloor, false, 'окно-изменило-высоту')");
    expect(tower).not.toMatch(/WINDOW_HEIGHT \/ 2/); // центр считается по актуальной высоте окна (windowHeightRef), а не по константе
  });

  it('🔴 Pixel 8: без своего этажа (нет недели) окно после сжатия 400 → ~120 тоже пересчитывает смещение — не остаётся на старом (этажи 5 и 4 вместо 1)', () => {
    const tower = read('components/spire/SpireTower.tsx');
    expect(tower).toMatch(/if \(myFloor === null\) \{ scrollToFloor\(null, false, 'окно-изменило-высоту'\); return; \}/);
    // ранний выход «нет своего этажа» стоял в условии вместе с placedRef — именно он пропускал этот случай
    expect(tower).not.toMatch(/if \(scale <= 0 \|\| !placedRef\.current \|\| myFloor === null\) return;/);
  });
});

// зачем (координатор 15.10): компактная карточка «Этаж N» включена; решение — от rawFit (места при ПОЛНОЙ карточке), поэтому собственная высота карточки решение не качает
describe('компактная карточка этажа и режим прокрутки страницы', () => {
  it('флаг включён, константы согласованы', () => {
    expect(SPIRE_COMPACT_FLOOR_INFO_ENABLED).toBe(true);
    expect(SPIRE_FLOOR_INFO_FULL_H - SPIRE_FLOOR_INFO_COMPACT_H).toBe(32);
    expect(SPIRE_COMPACT_MIN_RAW_FIT).toBe(SPIRE_WINDOW_MIN_COMPACT - 32); // 88: компактная карточка даёт окну ≥ 120
    expect(SPIRE_COMPACT_MIN_RAW_FIT_HOLD).toBe(80);
    expect(SPIRE_COMPACT_WINDOW_H).toBe(180);
    expect(SPIRE_COMPACT_WINDOW_H_OFF).toBe(196);
  });

  it('не измерено — карточка полная', () => {
    expect(spireFloorInfoCompact(spireTowerRawFit(0, 754, 16))).toBe(false);
    expect(spireFloorInfoCompact(Number.NaN)).toBe(false);
  });

  it('шрифт не влияет: Pixel 8, шрифт 1.0 — кадр координатора (верх окна 554, док 754) → компактная карточка, окно 132, всё выше дока с зазором 16', () => {
    const rawFit = spireTowerRawFit(554, 754, 16);
    expect(rawFit).toBe(100);
    const compact = spireFloorInfoCompact(rawFit);
    expect(compact).toBe(true);
    const windowH = spireTowerWindowHeight(554, 754, 16 + SPIRE_FLOOR_INFO_COMPACT_H, compact);
    expect(windowH).toBe(132);
    expect(554 + windowH + SPIRE_FLOOR_INFO_COMPACT_H).toBeLessThanOrEqual(754 - 16); // низ карточки выше дока на зазор
  });

  it('включается при rawFit < 180 и ≥ 88; места нет (rawFit < 88) — карточка полная, окно 220, прокрутка страницы', () => {
    expect(spireFloorInfoCompact(179, false)).toBe(true);
    expect(spireFloorInfoCompact(180, false)).toBe(false);
    expect(spireFloorInfoCompact(88, false)).toBe(true);
    expect(spireFloorInfoCompact(87, false)).toBe(false);
    expect(spireFloorInfoCompact(-40, false)).toBe(false);
    expect(spireTowerWindowHeight(577, 674, 16 + SPIRE_FLOOR_INFO_FULL_H, false)).toBe(SPIRE_WINDOW_MIN);
  });

  it('гистерезис: уже компактная держится до rawFit 196 сверху и 80 снизу', () => {
    expect(spireFloorInfoCompact(185, false)).toBe(false); // ещё не включено — 185 не включает
    expect(spireFloorInfoCompact(185, true)).toBe(true); // уже компактна — 185 удерживает
    expect(spireFloorInfoCompact(196, true)).toBe(true);
    expect(spireFloorInfoCompact(197, true)).toBe(false);
    expect(spireFloorInfoCompact(80, true)).toBe(true);
    expect(spireFloorInfoCompact(79, true)).toBe(false);
  });

  it('нет качания: компактная карточка расширяет окно на 32, но решение считается от rawFit (не от окна), поэтому на границе оно не меняется от собственного эффекта', () => {
    for (const rawFit of [88, 120, 179]) {
      const first = spireFloorInfoCompact(rawFit, false);
      const again = spireFloorInfoCompact(rawFit, first);
      expect([rawFit, first, again]).toEqual([rawFit, true, true]);
    }
  });
});

// зачем (координатор 15.10, п. а): пока комната недели грузится — скелет подиума той же высоты, чтобы раскладка не прыгала; п. г: палец в окне башни не отдаёт жест странице и обновлению потягиванием
describe('скелет подиума и свайп по окну башни', () => {
  it('подиум рисует скелет только при loading и пустой комнате; экран включает его, пока комната грузится (live, roomLoad пуст)', () => {
    const podium = read('components/spire/SpirePodium.tsx');
    expect(podium).toContain('top.length === 0 && loading ? (');
    expect(podium).toContain('testID="spire-podium-skeleton"');
    expect(podium).toContain("const SKELETON_COLS = [{ place: 2, coin: 46, block: 66 }, { place: 1, coin: 56, block: 88 }, { place: 3, coin: 46, block: 50 }] as const;");
    const home = read('components/spire/SpireHomeScreen.tsx');
    expect(home).toContain('loading={members === null && game.live && game.roomLoad === null}');
  });

  it('жест окна башни: касание блокирует прокрутку страницы и RefreshControl, отпускание — возвращает', () => {
    const home = read('components/spire/SpireHomeScreen.tsx');
    expect(home).toContain('scrollEnabled={!towerTouch.locked}');
    expect(home).toContain('<RefreshControl enabled={!towerTouch.locked}');
    expect(home).toContain('onTouchActive={towerTouch.onTouchActive}');
    const tower = read('components/spire/SpireTower.tsx');
    expect(tower).toContain('onTouchStart={() => onTouchActive?.(true)}');
    expect(tower).toContain('onTouchEnd={() => onTouchActive?.(false)}');
    expect(tower).toContain('onTouchCancel={() => onTouchActive?.(false)}');
    expect(tower).toContain('onScrollEndDrag={() => onTouchActive?.(false)}');
  });

  it('экран Пика остаётся ≤ 400 строк (сторож)', () => {
    expect(read('components/spire/SpireHomeScreen.tsx').split('\n').length).toBeLessThanOrEqual(400);
  });
});
