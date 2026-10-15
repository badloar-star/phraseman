// ═══════════════════════════════════════════════════════════════════════════
// use_spire_tower_budget.ts — бюджет высоты экрана Пика: окно башни и ступени ужатия верха (компактный подиум, строка «Этаж N», режим прокрутки).
//
// зачем (координатор 15.10, 🔴 по кадру Pixel 8, шрифт 1.0): после загрузки «Комнаты недели» подиум отъел высоту, окно башни сжалось до ~116 dp, а карточка «Этаж N» ушла под «Играть».
// Бюджет считается из РЕАЛЬНЫХ измерений (onLayout: верх башни, верх дока, высота карточки), а не из модели. Ступень ужатия выбирается по rawFit — окну при ПОЛНОМ подиуме и ПОЛНОЙ карточке
// (spire_tower_window.ts), поэтому собственные скачки подиума и карточки на решение не влияют. Верх окна башни при компактном подиуме приводится к «полному» прибавкой SPIRE_PODIUM_COMPACT_SAVE,
// а режим подиума запоминается вместе с замером (в момент onLayout) — иначе замер компактного подиума ломал бы расчёт. Хук вынесен из SpireHomeScreen (тот держится в пределах 400 строк).
// СПЕРВА ЛОГИ: [SPIRE-BUDGET] — все слагаемые и принятая ступень, одна строка на смену.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  SPIRE_FLOOR_INFO_FULL_H, SPIRE_LEVEL_CARD_BELOW, SPIRE_LEVEL_PODIUM_BELOW, SPIRE_LEVEL_SCROLL_BELOW, SPIRE_PODIUM_COMPACT_SAVE,
  spireCardCompact, spireLayoutLevel, spirePodiumCompact, spireScrollMode, spireTowerRawFit, spireTowerWindowHeight, type SpireLayoutLevel,
} from './spire_tower_window';

export type SpireTowerBudget = Readonly<{
  /** Высота окна башни, dp. */
  windowH: number;
  level: SpireLayoutLevel;
  /** Подиум «Комнаты недели» компактный (монеты и плиты ниже). */
  podiumCompact: boolean;
  /** Карточка «Этаж N» — одна строка. */
  cardCompact: boolean;
  onTowerTop: (y: number) => void;
  onDockTop: (y: number) => void;
  /** Высота обёртки карточки этажа (вместе с отступом сверху). */
  onInfoHeight: (h: number) => void;
}>;

type TowerMeasure = Readonly<{ y: number; podiumCompact: boolean }>;

const LEVEL_NAME: Record<SpireLayoutLevel, string> = { 0: 'всё полное', 1: 'компактный подиум', 2: 'компактный подиум + строка этажа', 3: 'места нет — окно 220, прокрутка страницы' };

export function useSpireTowerBudget(gap: number): SpireTowerBudget {
  const [tower, setTower] = useState<TowerMeasure>({ y: 0, podiumCompact: false });
  const [dockTop, setDockTop] = useState(0);
  const [infoH, setInfoH] = useState(0);
  const fullInfoHRef = useRef(SPIRE_FLOOR_INFO_FULL_H);
  const levelRef = useRef<SpireLayoutLevel>(0); // уровень последнего ЗАФИКСИРОВАННОГО кадра: им решает гистерезис и им помечаются замеры
  const fullTowerTop = tower.y > 0 ? tower.y + (tower.podiumCompact ? SPIRE_PODIUM_COMPACT_SAVE : 0) : 0;
  const rawFit = spireTowerRawFit(fullTowerTop, dockTop, gap, fullInfoHRef.current);
  const level = spireLayoutLevel(rawFit, levelRef.current);
  // зачем (Ревизор по 9c5f781be): раньше ref писался прямо в рендере; layout-эффект срабатывает при фиксации кадра — до нативной раскладки и onLayout этого кадра, так что замеры помечаются тем режимом, в котором сняты
  useLayoutEffect(() => { levelRef.current = level; }, [level]);
  const windowH = spireTowerWindowHeight(tower.y, dockTop, gap + infoH, spireScrollMode(level));

  const onTowerTop = useCallback((y: number) => setTower((prev) => {
    const podiumCompact = spirePodiumCompact(levelRef.current);
    return prev.y === y && prev.podiumCompact === podiumCompact ? prev : { y, podiumCompact };
  }), []);
  const onDockTop = useCallback((y: number) => setDockTop((prev) => (prev === y ? prev : y)), []);
  const onInfoHeight = useCallback((h: number) => {
    if (!spireCardCompact(levelRef.current) && h > 0) fullInfoHRef.current = h; // полная высота карточки — только из замера полной карточки (компактная её не подменяет)
    setInfoH((prev) => (prev === h ? prev : h));
  }, []);

  useEffect(() => {
    if (tower.y > 0 && dockTop > 0) console.log('[SPIRE-BUDGET]', JSON.stringify({ towerTop: tower.y, towerMeasuredWithCompactPodium: tower.podiumCompact, fullTowerTop, dockTop, gap, infoH, fullInfoH: fullInfoHRef.current, rawFit, level, mode: LEVEL_NAME[level], windowH, limits: `подиум <${SPIRE_LEVEL_PODIUM_BELOW}, строка этажа <${SPIRE_LEVEL_CARD_BELOW}, прокрутка <${SPIRE_LEVEL_SCROLL_BELOW}` })); // guard-ok: слагаемые бюджета и решение, одна строка на смену
  }, [tower, fullTowerTop, dockTop, gap, infoH, rawFit, level, windowH]);

  return { windowH, level, podiumCompact: spirePodiumCompact(level), cardCompact: spireCardCompact(level), onTowerTop, onDockTop, onInfoHeight };
}
