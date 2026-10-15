// ═══════════════════════════════════════════════════════════════════════════
// use_spire_tower_budget.ts — бюджет высоты экрана Пика: окно башни и ступени ужатия верха (компактный подиум, строка «Этаж N», режим прокрутки).
//
// зачем (координатор 15.10, 🔴 по кадру Pixel 8, шрифт 1.0): после загрузки «Комнаты недели» подиум отъел высоту, окно башни сжалось до ~116 dp, а карточка «Этаж N» ушла под «Играть».
// Бюджет считается из РЕАЛЬНЫХ измерений (onLayout: верх башни, верх дока, высота карточки), а не из модели. Ступень ужатия выбирается по rawFit — окну при ПОЛНОМ подиуме и ПОЛНОЙ карточке
// (spire_tower_window.ts), поэтому собственные скачки подиума и карточки на решение не влияют. Верх окна башни приводится к «полному» прибавкой экономии применённых ступеней выше башни (тонкая шапка, компактный подиум),
// а эта прибавка запоминается вместе с замером (в момент onLayout) — иначе замер ужатой раскладки ломал бы расчёт. Хук вынесен из SpireHomeScreen (тот держится в пределах 400 строк).
// СПЕРВА ЛОГИ: [SPIRE-BUDGET] — все слагаемые и принятая ступень, одна строка на смену.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  SPIRE_FLOOR_INFO_FULL_H, spireAboveTowerSaved, spireCardCompact, spireHeaderThin, spireLayoutLevel, spireLevelLimits, spirePodiumCompact, spireScrollMode, spireSteps,
  spireTowerRawFit, spireTowerWindowHeight, type SpireLayoutLevel,
} from './spire_tower_window';

export type SpireTowerBudget = Readonly<{
  /** Высота окна башни, dp. */
  windowH: number;
  level: SpireLayoutLevel;
  /** Шапка страницы тонкая (первая ступень, выключена флагом SPIRE_THIN_HEADER_ENABLED). */
  headerThin: boolean;
  /** Подиум «Комнаты недели» компактный (монеты и плиты ниже). */
  podiumCompact: boolean;
  /** Карточка «Этаж N» — одна строка. */
  cardCompact: boolean;
  onTowerTop: (y: number) => void;
  onDockTop: (y: number) => void;
  /** Высота обёртки карточки этажа (вместе с отступом сверху). */
  onInfoHeight: (h: number) => void;
}>;

/** y — измеренный верх окна башни; saved — сколько dp сняли с него ступени выше башни В МОМЕНТ замера (шапка, подиум). */
type TowerMeasure = Readonly<{ y: number; saved: number }>;

export function useSpireTowerBudget(gap: number): SpireTowerBudget {
  const [tower, setTower] = useState<TowerMeasure>({ y: 0, saved: 0 });
  const [dockTop, setDockTop] = useState(0);
  const [infoH, setInfoH] = useState(0);
  const fullInfoHRef = useRef(SPIRE_FLOOR_INFO_FULL_H);
  const levelRef = useRef<SpireLayoutLevel>(0); // уровень последнего ЗАФИКСИРОВАННОГО кадра: им решает гистерезис и им помечаются замеры
  const steps = spireSteps();
  const fullTowerTop = tower.y > 0 ? tower.y + tower.saved : 0;
  const rawFit = spireTowerRawFit(fullTowerTop, dockTop, gap, fullInfoHRef.current);
  const level = spireLayoutLevel(rawFit, levelRef.current, steps);
  // зачем (Ревизор по 9c5f781be): раньше ref писался прямо в рендере; layout-эффект срабатывает при фиксации кадра — до нативной раскладки и onLayout этого кадра, так что замеры помечаются тем режимом, в котором сняты
  useLayoutEffect(() => { levelRef.current = level; }, [level]);
  const windowH = spireTowerWindowHeight(tower.y, dockTop, gap + infoH, spireScrollMode(level, steps));

  const onTowerTop = useCallback((y: number) => setTower((prev) => {
    const saved = spireAboveTowerSaved(levelRef.current, steps);
    return prev.y === y && prev.saved === saved ? prev : { y, saved };
  }), [steps]);
  const onDockTop = useCallback((y: number) => setDockTop((prev) => (prev === y ? prev : y)), []);
  const onInfoHeight = useCallback((h: number) => {
    if (!spireCardCompact(levelRef.current, steps) && h > 0) fullInfoHRef.current = h; // полная высота карточки — только из замера полной карточки (компактная её не подменяет)
    setInfoH((prev) => (prev === h ? prev : h));
  }, [steps]);

  useEffect(() => {
    if (tower.y > 0 && dockTop > 0) console.log('[SPIRE-BUDGET]', JSON.stringify({ towerTop: tower.y, towerSavedAtMeasure: tower.saved, fullTowerTop, dockTop, gap, infoH, fullInfoH: fullInfoHRef.current, rawFit, level, steps: steps.join('>'), applied: steps.filter((_, i) => level > i && level <= steps.length), scrollMode: spireScrollMode(level, steps), windowH, limits: spireLevelLimits(steps) })); // guard-ok: слагаемые бюджета и решение, одна строка на смену
  }, [tower, fullTowerTop, dockTop, gap, infoH, rawFit, level, windowH, steps]);

  return { windowH, level, headerThin: spireHeaderThin(level, steps), podiumCompact: spirePodiumCompact(level, steps), cardCompact: spireCardCompact(level, steps), onTowerTop, onDockTop, onInfoHeight };
}
