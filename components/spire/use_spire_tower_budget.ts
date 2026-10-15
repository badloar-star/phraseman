// ═══════════════════════════════════════════════════════════════════════════
// use_spire_tower_budget.ts — бюджет высоты экрана Пика: окно башни, компактность карточки «Этаж N».
//
// зачем (координатор 15.10, 🔴 по кадру Pixel 8, шрифт 1.0): после загрузки «Комнаты недели» подиум отъел высоту, окно башни сжалось до ~116 dp, а карточка «Этаж N» ушла под «Играть».
// Бюджет считается из РЕАЛЬНЫХ измерений (onLayout: верх башни, верх дока, высота карточки), а не из модели; решение «карточка компактная» принимается от места при ПОЛНОЙ карточке
// (spireTowerRawFit), поэтому компактность не зависит от собственной высоты и не качает раскладку. Хук вынесен из SpireHomeScreen (тот держится в пределах 400 строк).
// СПЕРВА ЛОГИ: [SPIRE-BUDGET] — все слагаемые и принятое решение, одна строка на смену.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from 'react';
import { SPIRE_COMPACT_MIN_RAW_FIT, SPIRE_COMPACT_WINDOW_H, SPIRE_FLOOR_INFO_FULL_H, spireFloorInfoCompact, spireTowerRawFit, spireTowerWindowHeight } from './spire_tower_window';

export type SpireTowerBudget = Readonly<{
  /** Высота окна башни, dp. */
  windowH: number;
  /** Карточка «Этаж N» — одна строка. */
  compact: boolean;
  onTowerTop: (y: number) => void;
  onDockTop: (y: number) => void;
  /** Высота обёртки карточки этажа (вместе с отступом сверху). */
  onInfoHeight: (h: number) => void;
}>;

export function useSpireTowerBudget(gap: number): SpireTowerBudget {
  const [towerTop, setTowerTop] = useState(0);
  const [dockTop, setDockTop] = useState(0);
  const [infoH, setInfoH] = useState(0);
  const fullInfoHRef = useRef(SPIRE_FLOOR_INFO_FULL_H);
  const wasCompactRef = useRef(false);
  const rawFit = spireTowerRawFit(towerTop, dockTop, gap, fullInfoHRef.current);
  const compact = spireFloorInfoCompact(rawFit, wasCompactRef.current);
  wasCompactRef.current = compact; // зачем: гистерезис — выключаем только при rawFit > 196; запись идемпотентна для одних и тех же входов
  const windowH = spireTowerWindowHeight(towerTop, dockTop, gap + infoH, compact);

  const onTowerTop = useCallback((y: number) => setTowerTop((prev) => (prev === y ? prev : y)), []);
  const onDockTop = useCallback((y: number) => setDockTop((prev) => (prev === y ? prev : y)), []);
  const onInfoHeight = useCallback((h: number) => {
    if (!wasCompactRef.current && h > 0) fullInfoHRef.current = h; // полная высота карточки — только из замера полной карточки (компактная её не подменяет)
    setInfoH((prev) => (prev === h ? prev : h));
  }, []);

  useEffect(() => {
    if (towerTop > 0 && dockTop > 0) console.log('[SPIRE-BUDGET]', JSON.stringify({ towerTop, dockTop, gap, infoH, fullInfoH: fullInfoHRef.current, rawFit, compact, windowH, mode: compact ? 'компактная карточка' : rawFit < SPIRE_COMPACT_MIN_RAW_FIT ? 'места нет — окно 220, прокрутка страницы' : 'обычный', why: `rawFit ${rawFit} (компактная при ${SPIRE_COMPACT_MIN_RAW_FIT}…${SPIRE_COMPACT_WINDOW_H - 1})` })); // guard-ok: слагаемые бюджета и решение, одна строка на смену
  }, [towerTop, dockTop, gap, infoH, rawFit, compact, windowH]);

  return { windowH, compact, onTowerTop, onDockTop, onInfoHeight };
}
