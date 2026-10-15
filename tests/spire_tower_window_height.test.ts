// зачем (координатор 13.10, строка 25 R1_BACKLOG; кадры spirecheck-001…004): кнопка «Играть» закрывала низ окна башни, когда «Комната недели» переехала наверх. Окно башни — ровно до дока.
// зачем (координатор 15.10, 🔴 кадр Pixel 8, шрифт 1.0): бюджет считался по модели ДО загрузки подиума; с подиумом окно 116 dp и карточка «Этаж 1» под «Играть». Ступени ужатия по порядку координатора:
// компактный подиум (−40) → карточка этажа одной строкой (−32) → режим прокрутки страницы; решение — по rawFit с гистерезисом.
import fs from 'node:fs';
import path from 'node:path';
import { PODIUM_SIZES } from '../components/spire/spire_podium_sizes';
import {
  SPIRE_COMPACT_FLOOR_INFO_ENABLED, SPIRE_FLOOR_INFO_COMPACT_H, SPIRE_FLOOR_INFO_FULL_H, SPIRE_LEVEL_CARD_BELOW, SPIRE_LEVEL_HYSTERESIS, SPIRE_LEVEL_PODIUM_BELOW,
  SPIRE_LEVEL_SCROLL_BELOW, SPIRE_PODIUM_COMPACT_SAVE, SPIRE_WINDOW_MAX, SPIRE_WINDOW_MIN, SPIRE_WINDOW_MIN_FIT,
  spireCardCompact, spireLayoutLevel, spirePodiumCompact, spireScrollMode, spireTowerRawFit, spireTowerWindowHeight, type SpireLayoutLevel,
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

  it('места много — окно по макету 400; мало — не ниже 120 (всё на первом экране); режим прокрутки страницы — не ниже 220', () => {
    expect(spireTowerWindowHeight(200, 900, 16)).toBe(SPIRE_WINDOW_MAX);
    expect(spireTowerWindowHeight(600, 734, 16)).toBe(SPIRE_WINDOW_MIN_FIT);
    expect(spireTowerWindowHeight(600, 734, 16, true)).toBe(SPIRE_WINDOW_MIN);
    // окно между 180 и 220 не раздувается до 220 за счёт карточки под доком (прежняя нижняя граница 220 давала налезание при rawFit 180…219)
    expect(spireTowerWindowHeight(500, 716, 16, false)).toBe(200);
    expect(SPIRE_WINDOW_MIN_FIT).toBe(120);
    expect(SPIRE_WINDOW_MIN).toBe(220);
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
    expect(home).toContain('compact={budget.cardCompact}');
    expect(home).toContain('compact={budget.podiumCompact}');
    const hook = read('components/spire/use_spire_tower_budget.ts');
    expect(hook).toContain('spireTowerWindowHeight(tower.y, dockTop, gap + infoH, spireScrollMode(level))');
    expect(hook).toContain('spireLayoutLevel(rawFit, levelRef.current)');
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
    expect(tower).not.toMatch(/if \(scale <= 0 \|\| !placedRef\.current \|\| myFloor === null\) return;/);
  });
});

describe('ступени ужатия верха экрана Пика', () => {
  it('константы согласованы: подиум −40, строка этажа −32, границы 180 / 140 / 48, гистерезис 16, функция включена', () => {
    expect(SPIRE_COMPACT_FLOOR_INFO_ENABLED).toBe(true);
    expect(SPIRE_PODIUM_COMPACT_SAVE).toBe(40);
    expect(SPIRE_FLOOR_INFO_FULL_H - SPIRE_FLOOR_INFO_COMPACT_H).toBe(32);
    expect(SPIRE_LEVEL_PODIUM_BELOW).toBe(180);
    expect(SPIRE_LEVEL_CARD_BELOW).toBe(140); // окно после компактного подиума < 180
    expect(SPIRE_LEVEL_SCROLL_BELOW).toBe(48); // 120 − 40 − 32: даже все ужатия не дают окну 120
    expect(SPIRE_LEVEL_HYSTERESIS).toBe(16);
  });

  it('не измерено (NaN) — всё полное', () => {
    expect(spireLayoutLevel(spireTowerRawFit(0, 754, 16))).toBe(0);
    expect(spireLayoutLevel(Number.NaN)).toBe(0);
  });

  it('вариант 1 — компактный подиум при rawFit 140…179; подиум компактный, строка этажа полная', () => {
    for (const rawFit of [179, 160, 140]) {
      const level = spireLayoutLevel(rawFit);
      expect([rawFit, level, spirePodiumCompact(level), spireCardCompact(level), spireScrollMode(level)]).toEqual([rawFit, 1, true, false, false]);
    }
  });

  it('вариант 2 — компактный подиум и строка этажа при rawFit 48…139', () => {
    for (const rawFit of [139, 100, 48]) {
      const level = spireLayoutLevel(rawFit);
      expect([rawFit, level, spirePodiumCompact(level), spireCardCompact(level), spireScrollMode(level)]).toEqual([rawFit, 2, true, true, false]);
    }
  });

  it('вариант 3 — режим прокрутки страницы при rawFit < 48: всё полное, окно 220', () => {
    for (const rawFit of [47, 0, -110]) {
      const level = spireLayoutLevel(rawFit);
      expect([rawFit, level, spirePodiumCompact(level), spireCardCompact(level), spireScrollMode(level)]).toEqual([rawFit, 3, false, false, true]);
    }
  });

  it('rawFit ≥ 180 — всё полное, ужатия нет', () => {
    for (const rawFit of [180, 220, 400]) expect([rawFit, spireLayoutLevel(rawFit)]).toEqual([rawFit, 0]);
  });

  it('гистерезис на каждой границе: ужатый уровень держится ещё 16 dp', () => {
    expect(spireLayoutLevel(185, 0)).toBe(0); // ещё не ужато — 185 не включает
    expect(spireLayoutLevel(185, 1)).toBe(1); // уже ужато — 185 удерживает
    expect(spireLayoutLevel(195, 1)).toBe(1);
    expect(spireLayoutLevel(196, 1)).toBe(0);
    expect(spireLayoutLevel(150, 1)).toBe(1);
    expect(spireLayoutLevel(150, 2)).toBe(2);
    expect(spireLayoutLevel(155, 2)).toBe(2);
    expect(spireLayoutLevel(156, 2)).toBe(1);
    expect(spireLayoutLevel(55, 2)).toBe(2);
    expect(spireLayoutLevel(55, 3)).toBe(3);
    expect(spireLayoutLevel(63, 3)).toBe(3);
    expect(spireLayoutLevel(64, 3)).toBe(2);
  });

  it('нет качания: замкнутая модель экрана сходится за ≤ 2 шага из любого начального уровня, потому что решение считается от rawFit, а не от окна', () => {
    // истинная раскладка: верх окна башни при ПОЛНОМ подиуме = fullTop, док = dockTop; компактный подиум опускает измеренный верх на 40
    const dockTop = 754;
    for (let fullTop = 300; fullTop <= 700; fullTop += 3) {
      for (const start of [0, 1, 2, 3] as const) {
        let level: SpireLayoutLevel = start;
        const seen: SpireLayoutLevel[] = [];
        for (let step = 0; step < 6; step += 1) {
          const measuredTop = fullTop - (spirePodiumCompact(level) ? SPIRE_PODIUM_COMPACT_SAVE : 0);
          const fullTowerTop = measuredTop + (spirePodiumCompact(level) ? SPIRE_PODIUM_COMPACT_SAVE : 0); // как хук: верх приводится к «полному»
          level = spireLayoutLevel(spireTowerRawFit(fullTowerTop, dockTop, 16, SPIRE_FLOOR_INFO_FULL_H), level);
          seen.push(level);
        }
        expect([fullTop, start, seen[seen.length - 1] === seen[seen.length - 2]]).toEqual([fullTop, start, true]);
        expect([fullTop, start, seen[2] === seen[5]]).toEqual([fullTop, start, true]);
      }
    }
  });

  it('при каждой ступени, пока она включена, окно ≥ 120 и карточка с зазором 16 выше дока (кроме режима прокрутки)', () => {
    const dockTop = 754;
    for (let fullTop = 300; fullTop <= 700; fullTop += 1) {
      const rawFit = spireTowerRawFit(fullTop, dockTop, 16);
      const level = spireLayoutLevel(rawFit, 0);
      if (spireScrollMode(level)) continue;
      const top = fullTop - (spirePodiumCompact(level) ? SPIRE_PODIUM_COMPACT_SAVE : 0);
      const infoH = spireCardCompact(level) ? SPIRE_FLOOR_INFO_COMPACT_H : SPIRE_FLOOR_INFO_FULL_H;
      const windowH = spireTowerWindowHeight(top, dockTop, 16 + infoH, false);
      expect([fullTop, level, windowH >= SPIRE_WINDOW_MIN_FIT]).toEqual([fullTop, level, true]);
      expect([fullTop, level, top + windowH + infoH <= dockTop - 16]).toEqual([fullTop, level, true]);
    }
  });
});

describe('компактный подиум: размеры', () => {
  it('самая высокая колонка (1-е место) ниже ровно на 40 dp, остальные не выше неё', () => {
    const colH = (s: typeof PODIUM_SIZES.full, place: number): number => (place === 1 ? s.coinFirst : s.coinOther) + 8 + 21 + 8 + 16 + 8 + s.blocks[place - 1];
    const tallest = (s: typeof PODIUM_SIZES.full): number => Math.max(colH(s, 1), colH(s, 2), colH(s, 3));
    expect(tallest(PODIUM_SIZES.full) - tallest(PODIUM_SIZES.compact)).toBe(SPIRE_PODIUM_COMPACT_SAVE);
    expect(colH(PODIUM_SIZES.compact, 1)).toBeGreaterThanOrEqual(colH(PODIUM_SIZES.compact, 2));
  });
});

// зачем (координатор 15.10, п. а): пока комната недели грузится — скелет подиума той же высоты, чтобы раскладка не прыгала; п. г: палец в окне башни не отдаёт жест странице и обновлению потягиванием
describe('скелет подиума и свайп по окну башни', () => {
  it('подиум рисует скелет только при loading и пустой комнате; экран включает его, пока комната грузится (live, roomLoad пуст)', () => {
    const podium = read('components/spire/SpirePodium.tsx');
    expect(podium).toContain('top.length === 0 && loading ? (');
    expect(podium).toContain('testID="spire-podium-skeleton"');
    expect(podium).toContain('const SKELETON_PLACES = [2, 1, 3] as const;');
    expect(podium).toContain('const sizes = compact ? PODIUM_SIZES.compact : PODIUM_SIZES.full;');
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
    expect(tower).toContain('useEffect(() => () => onTouchActive?.(false), [onTouchActive]);'); // размонтирование окна с пальцем на нём снимает блокировку (Ревизор 15.10)
    const lock = read('components/spire/use_spire_tower_touch_lock.ts');
    expect(lock).toContain('useFocusEffect(useCallback(() => () => setLocked(false), []));'); // уход с экрана (blur) тоже снимает блокировку
  });

  it('ref уровня пишется не в рендере, а в layout-эффекте (Ревизор по 9c5f781be)', () => {
    const hook = read('components/spire/use_spire_tower_budget.ts');
    expect(hook).toContain('useLayoutEffect(() => { levelRef.current = level; }, [level]);');
    expect(hook).not.toMatch(/\n  levelRef\.current = level;/);
  });

  it('экран Пика остаётся ≤ 400 строк (сторож)', () => {
    expect(read('components/spire/SpireHomeScreen.tsx').split('\n').length).toBeLessThanOrEqual(400);
  });
});
