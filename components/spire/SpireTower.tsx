// ═══════════════════════════════════════════════════════════════════════════
// SpireTower.tsx — окно с башней: прокрутка к своему этажу, маркер игрока, доступность.
//
// зачем: макет держит башню в окне .tview 400px и выносит маркер вправо от своего
// этажа. Маркер здесь — обычный RN-слой поверх SVG (монета ранга — настоящая картинка
// аватара), его перелёт на этаж выше идёт на нативном драйвере, без покадровых setState.
// Если локальной недели нет, маркера нет вовсе — не выдумываем этаж.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from '../SafeLinearGradient';
import { colorWithAlpha } from '../v2/plateAlpha';
import AvatarView from '../AvatarView';
import type { Lang } from '../../constants/i18n';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useSpirePalette } from './useSpirePalette';
import { PlateFill, plateBoxShadow, useShadowGlass } from '../v2/ShadowSurface';
import SpireTowerSvg from './SpireTowerSvg';
import { SPIRE_SCENE_TOWER, useSpireScene } from './useSpireScene';
import { spireSceneHiddenRows, spireSceneRivalsFit, spireSceneRowHalf } from './scene/spire_scene_layout';
import { spireSkinForTier } from '../../modules/spire/tower_skins';
import { getDevSpireScrollOverride, getDevSpireTierOverride } from '../../app/dev_spire_tier';
import SpireRankCoin from './SpireRankCoin';
import { useIsPlus } from '../plus/use_is_plus';
import { spireText } from './spire_strings';
import { logSpireLayout, roundLayout } from './spire_layout_log';
import { SPIRE_WINDOW_MAX } from './spire_tower_window';
import { SPIRE_CROWN_RISE, spireCrownTopY, spireWindowScrollY } from './spire_tower_crown';
import { spireTowerFitScale, spireTowerHeadroom, spireTowerNeedUnits } from './spire_tower_bounds';
import { SPIRE_FLOOR_COUNT, SPIRE_TOWER_GEOM, SPIRE_TW, spireMarkerXY, type SpireRival } from './spire_tower_model';

const WINDOW_HEIGHT = SPIRE_WINDOW_MAX;
const MARKER_SIZE = 40;
/** Высота мягкого затухания у верхнего края окна, dp, и порог смещения, с которого выше окна есть этажи. */
const TOP_FADE_H = 36;
const TOP_FADE_THRESHOLD = 4;
/** Доля полосы затухания у кромки окна, где фон непрозрачен (14 из 36 dp). */
const TOP_FADE_SOLID = 0.4;

type Props = Readonly<{
  lang: Lang;
  myFloor: number | null;
  selected: number;
  onSelect: (floor: number) => void;
  /** Ранг монеты игрока (0..19) из useMyCoinRank; null = нейтральный кружок. */
  myCoinRank: number | null;
  /** Соперники по этажам из кэша комнаты недели; нет комнаты — пусто. */
  rivalsByFloor?: ReadonlyMap<number, readonly SpireRival[]>;
  /** Нет сети — чужие цифры приглушены (макет §11). */
  dimRivals?: boolean;
  /** Лига игрока (tier 0..11): выбирает наряд башни. null/нет = Оникс без деталей. */
  tier?: number | null;
  /** Высота окна, dp (по умолчанию 400 по макету): экран сужает её, если низ окна иначе уходит под кнопку «Играть». */
  windowHeight?: number;
  /** Палец в окне башни (true) / отпущен (false): экран на это время не отдаёт жест странице и обновлению потягиванием. */
  onTouchActive?: (active: boolean) => void;
  /**
   * зачем (Пик v2, владелец 22.10; эталон peak-scene-v2.html): 'scene' — башня герой «Сцены»: без плиты окна, тени, скругления и затухания
   * у верха, подписи этажей светлые (сцена всегда тёмная). По умолчанию — прежнее окно.
   */
  variant?: 'window' | 'scene';
  /** Только «Сцена»: ряды соперников с центром ниже этой высоты над низом окна прячутся (там монеты пьедестала), dp. */
  sceneRowsClearBottom?: number;
}>;

const RIVAL = 22;
const RIVAL_STEP = 13;
const RIVAL_SHOWN = 2;
const RIVAL_GAP = 10;
/** Шрифт от этого множителя: у башни одна монета и «+N» — слева от этажа помещаются подпись этажа, монеты и счётчик (Макеты 15.10: «+20» заходил на кладку). */
const RIVAL_BIG_FONT = 1.15;

/**
 * Соперники слева от этажа (floorSvg макета): до двух кружков внахлёст и «+N».
 * зачем: монета ранга участника (владелец 13.10), неизвестный ранг — базовая монета, не буква. Слой RN поверх SVG, без касаний (тап по этажу проходит насквозь).
 */
const RivalsLayer = memo(function RivalsLayer({ rivals, scale, dim, renderWidth, singleCoin, extraColor, sceneFit, hiddenBelow = 0 }: Readonly<{ extraColor?: string; rivals: ReadonlyMap<number, readonly SpireRival[]>; scale: number; dim: boolean; renderWidth: number; singleCoin: boolean; sceneFit?: Readonly<{ fontScale: number; guardChars: number }>; hiddenBelow?: number }>) {
  const p = useSpirePalette();
  const rowHalf = sceneFit ? spireSceneRowHalf(scale, sceneFit.fontScale) : 0;
  const items: React.ReactNode[] = [];
  for (const fl of SPIRE_TOWER_GEOM.floors) {
    const list = rivals.get(fl.f);
    if (!list || list.length === 0) continue;
    if (fl.f <= hiddenBelow) continue; // зачем (Пик v2, координатор 22.10: «сетка без пересечений»): ряды ниже монет пьедестала не рисуются
    const shown = Math.min(list.length, singleCoin ? 1 : RIVAL_SHOWN);
    // зачем (координатор 22.10: «нижние этажи перекрыты монетами жителей»): на «Сцене» монет столько, сколько влезает между подписью и башней
    const fit = sceneFit ? spireSceneRivalsFit({ floor: fl.f, count: list.length, scale, fontScale: sceneFit.fontScale, guardChars: sceneFit.guardChars }) : null;
    const coins = fit ? fit.coins : shown;
    const extra = fit ? fit.extra : list.length - shown;
    const top = (fl.y + fl.h / 2 - RIVAL / 2) * scale;
    // зачем (Макеты 15.10, кадры v3_p8_fs10/v2_p8_fs13: «+20» заходил на тело башни): ряд (монеты + «+N») привязан ПРАВЫМ краем в 10 единицах левее тела этажа, а не левым с запасом 22 на текст, —
    // ширина «+N» берётся настоящая (и растёт со шрифтом), налезть на кладку она не может.
    items.push(
      <View key={`rivals-${fl.f}`} style={[s.rivals, { right: renderWidth - (fl.x0 - RIVAL_GAP) * scale, top, opacity: dim ? 0.55 : 1 }, fit ? { right: renderWidth - fit.rightX, top: (fl.y + fl.h / 2) * scale - rowHalf, height: rowHalf * 2 } : null]}>
        {list.slice(0, coins).map((m, k) => (
          <View key={m.uid} style={{ marginLeft: k === 0 ? 0 : (RIVAL_STEP - RIVAL) * scale }}>
            {/* зачем (эталон plus-ring-etalon.html, «Пик · жители этажей»): монеты мелкие и стопкой — плоское кольцо 3 + зазор 2, без значка */}
            <SpireRankCoin rank={m.coinRank} size={RIVAL * scale} plus={m.isPremium} plusKind="flat" />
          </View>
        ))}
        {extra > 0 ? <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[s.rivalExtra, { color: extraColor ?? p.textSecondary }, fit ? (coins > 0 ? s.rivalExtraScene : s.rivalExtraSceneSolo) : null]}>{`+${extra}`}</Text> : null}
      </View>,
    );
  }
  return <>{items}</>;
});

type ScrollGuard = Readonly<{
  scroll: React.RefObject<ScrollView | null>;
  last: React.MutableRefObject<Readonly<{ y: number; why: string }> | null>;
  offset: React.MutableRefObject<number>;
  dragged: React.MutableRefObject<boolean>;
}>;

/**
 * зачем (владелец 13.10, «кто выше и ниже»; журнал Ядра: scroll-req этаж 4, requestedY 628, ready=да — а на кадре башня стоит на вершине 14–15, соседей не видно):
 * scrollTo, выданный сразу после измерения содержимого, нативная часть могла срезать до 0 или сбросить следующей раскладкой, и «первый-показ» молча терялся.
 * Через 120 мс сверяем РЕАЛЬНОЕ смещение окна с запросом; если окно не там (и человек сам не тянул) — повторяем, до 3 раз. Каждый шаг пишет [SPIRE-SCROLL].
 */
function verifyScroll(g: ScrollGuard, attempt: number): void {
  setTimeout(() => {
    const req = g.last.current;
    if (!req || g.dragged.current) return;
    const gotY = g.offset.current;
    if (Math.abs(gotY - req.y) <= 40) { console.log('[SPIRE-SCROLL] проверка ok', JSON.stringify({ why: req.why, requestedY: roundLayout(req.y), gotY: roundLayout(gotY), attempt })); return; } // guard-ok: итог проверки
    if (attempt >= 3) { console.warn('[SPIRE-SCROLL] проверка: окно не на месте после 3 повторов', JSON.stringify({ why: req.why, requestedY: roundLayout(req.y), gotY: roundLayout(gotY) })); return; } // guard-ok: отказ логируется
    console.warn('[SPIRE-SCROLL] проверка: окно не на месте — повтор', JSON.stringify({ why: req.why, requestedY: roundLayout(req.y), gotY: roundLayout(gotY), attempt: attempt + 1 })); // guard-ok: повтор логируется
    g.scroll.current?.scrollTo({ y: req.y, animated: false });
    verifyScroll(g, attempt + 1);
  }, 120);
}

function markerTarget(floor: number, scale: number): Readonly<{ x: number; y: number }> {
  const fl = SPIRE_TOWER_GEOM.floors[Math.min(Math.max(floor, 1), SPIRE_FLOOR_COUNT) - 1];
  const p = spireMarkerXY(fl);
  return { x: p.x * scale - MARKER_SIZE / 2, y: p.y * scale - MARKER_SIZE / 2 };
}

function SpireTower({ lang, myFloor, selected, onSelect, myCoinRank, rivalsByFloor, dimRivals = false, tier = null, windowHeight = WINDOW_HEIGHT, onTouchActive, variant = 'window', sceneRowsClearBottom }: Props) {
  const p = useSpirePalette();
  const myIsPlus = useIsPlus(); // зачем (владелец 21.10, реестр №6): мой маркер на башне — с кольцом, если у меня Plus
  const g = useShadowGlass();
  const reduceMotion = useReduceMotion();
  const fontScale = useWindowDimensions().fontScale;
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const sceneMode = variant === 'scene';
  // зачем (Пик v2, координатор 22.10: «сетка без пересечений на 360–430 dp»): ряды соперников «Сцены» — по spire_scene_layout; окно без изменений
  const guardChars = useMemo(() => spireText(lang, 'guard').toUpperCase().length, [lang]);
  const sceneFit = useMemo(() => (sceneMode ? { fontScale, guardChars } : undefined), [sceneMode, fontScale, guardChars]);
  const [rowsHidden, setRowsHidden] = useState(0);
  // зачем (владелец 13.10: одна башня Оникса в 12 «нарядах»): наряд по лиге игрока, объект стабилен по ссылке — memo башни не перерисовывается зря;
  // dev_state?spireTier=N подменяет лигу для кадров Сверки (в стор-сборке всегда null); неделя и комната не меняются.
  const devTier = getDevSpireTierOverride();
  const skin = useMemo(() => spireSkinForTier(devTier ?? tier), [devTier, tier]);
  // зачем (закон владельца 14.10, «ничем не обрезаться вообще»; координатор: при нехватке места — меньше масштаб): на 14–15 этаже башня с ореолом и свой этаж обязаны
  // уместиться в окне — масштаб = min(по ширине, высота окна / нужные единицы). Срез допустим только при ручной прокрутке. Для остальных этажей масштаб прежний.
  const nearTopFloor = myFloor !== null && myFloor >= SPIRE_FLOOR_COUNT - 1;
  const headroom = spireTowerHeadroom(skin, myFloor === SPIRE_FLOOR_COUNT);
  const ownFloor = myFloor !== null ? SPIRE_TOWER_GEOM.floors[Math.min(myFloor, SPIRE_FLOOR_COUNT) - 1] : null;
  const baseScale = width > 0 ? width / SPIRE_TW : 0;
  const scale = nearTopFloor && ownFloor && baseScale > 0
    ? spireTowerFitScale(baseScale, windowHeight, spireTowerNeedUnits(headroom, ownFloor.y + ownFloor.h - SPIRE_TOWER_GEOM.top))
    : baseScale;
  const renderWidth = SPIRE_TW * scale;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const placedRef = useRef(false);
  // зачем (Макеты spire-gap-017, «Ты спускаешься»: башня стояла на вершине при этаже 4): scrollTo до того, как содержимое измерено, молча уходит в 0.
  // Поэтому запоминаем высоту содержимого и отложенный запрос и повторяем его, когда содержимое получило размер.
  const contentHRef = useRef(0);
  const pendingRef = useRef<Readonly<{ floor: number | null }> | null>(null);
  const echoRef = useRef<string | null>(null);
  const lastReqRef = useRef<Readonly<{ y: number; why: string }> | null>(null);
  const offsetRef = useRef(0);
  // зачем (координатор 15.10, условие 1; правило владельца 14.10): выше видимой области есть этажи — верх окна затухает мягко, плоского среза нет. Состояние меняется один раз на пересечение порога, не на каждый кадр прокрутки.
  const [fadeTop, setFadeTop] = useState(false);
  const draggedRef = useRef(false);
  // зачем (приоритет владельца 13.10): журнал [SPIRE-RIVALS] — сколько соперников попадает в окно башни при прокрутке (кто выше/ниже виден или нет)
  const rivalsRef = useRef<ReadonlyMap<number, readonly SpireRival[]> | undefined>(rivalsByFloor);
  rivalsRef.current = rivalsByFloor;
  // зачем (строка 25 R1_BACKLOG): высота окна может меняться после измерения дока; прокрутка к этажу берёт актуальную из ref, не пересоздавая scrollToFloor
  const windowHeightRef = useRef(windowHeight);
  windowHeightRef.current = windowHeight;
  const rowsCutRef = useRef<Readonly<{ scale: number; clear: number }> | null>(null);
  rowsCutRef.current = sceneMode && sceneRowsClearBottom !== undefined && scale > 0 ? { scale, clear: sceneRowsClearBottom } : null;
  // зачем (закон владельца 14.10, «пик башни не обрезается, свет тоже»): запас над верхним этажом считается из границы башни ЭТОЙ лиги и состояния (ореол ×2.6 на вершине);
  // значение обновляется ниже, когда известен наряд, а прокрутка берёт актуальное из ref.
  const headroomRef = useRef<number>(SPIRE_CROWN_RISE);
  headroomRef.current = headroom;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (next > 0) setWidth((prev) => (prev === next ? prev : next));
  }, []);

  // Прокрутка к этажу: свой этаж по центру окна (как data-center в макете), иначе низ башни.
  const scrollToFloor = useCallback((floor: number | null, animated: boolean, why: string) => {
    if (scale <= 0) {
      console.log('[SPIRE-SCROLL] пропуск: scale<=0', JSON.stringify({ floor, why, width })); // guard-ok: ранний выход логируется
      return;
    }
    const fl = floor === null ? SPIRE_TOWER_GEOM.floors[0] : SPIRE_TOWER_GEOM.floors[Math.min(floor, SPIRE_FLOOR_COUNT) - 1];
    const cy = (fl.y + fl.h / 2) * scale;
    const wh = windowHeightRef.current;
    // зачем (координатор 13.10, №25б): на 14–15 этаже окно прижимается к верху башни, чтобы конус и навершие были видны (свой этаж при этом остаётся в окне)
    const crownTopY = spireCrownTopY(SPIRE_TOWER_GEOM.top, scale, headroomRef.current);
    // dev_state?spireScroll=top: к началу сцены (конус и навершие в кадре) для Сверки; в стор-сборке геттер всегда null
    const devTop = getDevSpireScrollOverride() === 'top';
    const nearTop = floor !== null && floor >= SPIRE_FLOOR_COUNT - 1;
    const contentH = SPIRE_TOWER_GEOM.height * scale;
    // зачем (вариант 2: сцена 46 %, окно ниже): на «Сцене» окно у низа башни, а метка своего этажа видна целиком; на 14–15 этаже — показ вершины
    const y = devTop ? 0 : sceneMode && !nearTop ? Math.max(0, Math.min(contentH - wh, cy - Math.max((fl.h / 2) * scale, MARKER_SIZE / 2) - 4)) : spireWindowScrollY({ cy, windowH: wh, crownTopY, floorHalf: (fl.h / 2) * scale, nearTop });
    const cut = rowsCutRef.current;
    if (cut) setRowsHidden(spireSceneHiddenRows({ offsetY: Math.min(y, Math.max(0, contentH - wh)), windowH: wh, clearBottom: cut.clear, scale }));
    console.log('[SPIRE-DOCK-INSET] top', JSON.stringify({ why, floor, windowH: roundLayout(wh), contentTop: 0, sceneTopY: roundLayout(crownTopY), requestedY: roundLayout(y), devTop, maxScroll: roundLayout(Math.max(0, contentH - wh)), topReachable: 'да (содержимое начинается с запаса над кровлей)', floor1Bottom: roundLayout(SPIRE_TOWER_GEOM.base * scale), contentH: roundLayout(contentH), floor1Reachable: SPIRE_TOWER_GEOM.base * scale <= contentH ? 'да' : 'нет' })); // guard-ok: журнал краёв окна башни
    const needH = SPIRE_TOWER_GEOM.height * scale;
    const ready = contentHRef.current >= needH - 1;
    logSpireLayout(`scroll-req#${why}`, { floor, scale: roundLayout(scale), cy: roundLayout(cy), requestedY: roundLayout(y), contentH: roundLayout(contentHRef.current), needH: roundLayout(needH), ready: ready ? 'да' : 'нет → отложено', animated: animated ? 'да' : 'нет' });
    if (!ready) { pendingRef.current = { floor }; return; }
    pendingRef.current = null;
    let inWindow = 0;
    let floorsInWindow = 0;
    for (const f of SPIRE_TOWER_GEOM.floors) {
      const mid = (f.y + f.h / 2) * scale;
      const list = rivalsRef.current?.get(f.f);
      if (mid >= y && mid <= y + wh && list && list.length > 0) { inWindow += list.length; floorsInWindow += 1; }
    }
    console.log('[SPIRE-RIVALS] window', JSON.stringify({ why, floor, requestedY: roundLayout(y), rivalsInWindow: inWindow, floorsWithRivals: floorsInWindow, total: rivalsRef.current?.size ?? 0 })); // guard-ok: журнал окна башни
    echoRef.current = devTop ? 'dev-top' : why;
    draggedRef.current = false; // новый запрос — прежняя ручная прокрутка не мешает
    lastReqRef.current = { y: Math.min(y, Math.max(0, needH - wh)), why }; // ожидаемое смещение — не дальше низа содержимого
    scrollRef.current?.scrollTo({ y, animated });
    if (!animated) verifyScroll({ scroll: scrollRef, last: lastReqRef, offset: offsetRef, dragged: draggedRef }, 0); // анимированный подъём догоняет сам; сверяем только мгновенные показы
  }, [scale, width, sceneMode]);

  const onContentSizeChange = useCallback((_w: number, h: number) => {
    contentHRef.current = h;
    const pending = pendingRef.current;
    console.log('[SPIRE-SCROLL] размер содержимого', JSON.stringify({ h: roundLayout(h), pending: pending ? { floor: pending.floor } : null })); // guard-ok: единичный лог на изменение размера
    if (pending) scrollToFloor(pending.floor, false, 'после-layout'); // i18n-ok: причина прокрутки для лога [SPIRE-SCROLL], не текст экрана // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
  }, [scrollToFloor]);

  const onScrollEcho = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    offsetRef.current = e.nativeEvent.contentOffset.y;
    const cut = rowsCutRef.current;
    if (cut) setRowsHidden(spireSceneHiddenRows({ offsetY: e.nativeEvent.contentOffset.y, windowH: windowHeightRef.current, clearBottom: cut.clear, scale: cut.scale })); // зачем: ручная прокрутка «Сцены» — обновление, только когда меняется число спрятанных рядов
    const above = e.nativeEvent.contentOffset.y > TOP_FADE_THRESHOLD;
    setFadeTop((prev) => (prev === above ? prev : above));
    const why = echoRef.current;
    if (!why) return;
    echoRef.current = null;
    console.log(why === 'dev-top' ? '[SPIRE-SCROLL] top' : '[SPIRE-SCROLL] получено', JSON.stringify({ why, gotY: roundLayout(e.nativeEvent.contentOffset.y) })); // guard-ok: итог прокрутки
  }, []);

  // зачем (Ревизор по 690a67f59, 🟡): окно башни ушло с экрана (замок языка, «Все участники», смена вкладки) с пальцем на нём — блокировка страницы и обновления потягиванием не должна остаться
  useEffect(() => () => onTouchActive?.(false), [onTouchActive]);

  // окно стало выше/ниже (измерили док) — свой этаж снова по центру нового окна, без анимации
  // зачем (координатор 15.10, 🔴 Pixel 8: «в окне этажи 5 и 4, хотя твой этаж — 1»): без своего этажа (нет недели) окно после сжатия 400 → ~120 оставалось на старом смещении — ранний выход пропускал этот случай; теперь и «низ башни» пересчитывается по новой высоте
  useEffect(() => {
    if (scale <= 0) return;
    if (myFloor === null) { scrollToFloor(null, false, 'окно-изменило-высоту'); return; } // i18n-ok: причина прокрутки для лога [SPIRE-SCROLL], не текст экрана // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
    if (!placedRef.current) return;
    scrollToFloor(myFloor, false, 'окно-изменило-высоту'); // i18n-ok: причина прокрутки для лога [SPIRE-SCROLL], не текст экрана // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowHeight]);

  useEffect(() => {
    if (scale <= 0) return;
    if (myFloor === null) { placedRef.current = false; scrollToFloor(null, false, 'нет-этажа'); return; } // i18n-ok: причина прокрутки для лога [SPIRE-SCROLL], не текст экрана // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
    const target = markerTarget(myFloor, scale);
    if (!placedRef.current || reduceMotion) {
      // Первый кадр и «уменьшить движение»: маркер сразу на месте.
      tx.setValue(target.x);
      ty.setValue(target.y);
      placedRef.current = true;
      scrollToFloor(myFloor, false, 'первый-показ'); // i18n-ok: причина прокрутки для лога [SPIRE-SCROLL], не текст экрана // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
      return;
    }
    // Подъём на этаж выше: перелёт на нативном драйвере, окно догоняет.
    Animated.parallel([
      Animated.timing(tx, { toValue: target.x, duration: 900, easing: Easing.bezier(0.2, 0.9, 0.2, 1), useNativeDriver: true }),
      Animated.timing(ty, { toValue: target.y, duration: 900, easing: Easing.bezier(0.2, 0.9, 0.2, 1), useNativeDriver: true }),
    ]).start();
    scrollToFloor(myFloor, true, 'смена-этажа'); // i18n-ok: причина прокрутки для лога [SPIRE-SCROLL], не текст экрана // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
  }, [myFloor, scale, reduceMotion, tx, ty, scrollToFloor]);

  // зачем (Ревизор 15.10, R02 п.5): тап по этажу 14–15 с нижнего этажа оставлял верх башни (шпиль, ореол) за краем окна — выбранный верхний этаж прокручивает окно к верху башни (общий расчёт spireWindowScrollY)
  useEffect(() => {
    if (scale <= 0 || !placedRef.current || selected < SPIRE_FLOOR_COUNT - 1 || selected === myFloor) return;
    scrollToFloor(selected, true, 'выбран-верхний-этаж'); // i18n-ok: причина прокрутки для лога [SPIRE-SCROLL], не текст экрана // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // зачем (владелец 13.10: одна башня Оникса в 12 «нарядах»): наряд по лиге игрока, объект стабилен по ссылке — memo башни не просыпается зря
  // dev_state?spireTier=N подменяет лигу для кадров Сверки (в стор-сборке всегда null); неделя и комната не меняются
  // зачем (владелец 13.10, светлая тема: «окно башни — по ТЕМЕ, а не по башне»): небо, звёзды, облака, земля и подписи — из токенов темы; башня — наряд лиги
  const themeScene = useSpireScene();
  const scene = sceneMode ? SPIRE_SCENE_TOWER : themeScene;
  const label = useMemo(
    () => `${spireText(lang, 'floor')} ${selected}`,
    [lang, selected],
  );

  // зачем: SVG-этажи не читаются скринридером — башня целиком одна «регулируемая» область,
  // свайп вверх/вниз меняет выбранный этаж, карточка под башней озвучивает его.
  const onA11yAction = useCallback((e: { nativeEvent: { actionName: string } }) => {
    if (e.nativeEvent.actionName === 'increment') onSelect(Math.min(SPIRE_FLOOR_COUNT, selected + 1));
    if (e.nativeEvent.actionName === 'decrement') onSelect(Math.max(1, selected - 1));
  }, [onSelect, selected]);

  return (
    // зачем (владелец 12.10, стиль «Тень»): окно башни без кромки; тень — на внешней обёртке, обрезка содержимого — на внутреннем окне.
    <View style={sceneMode ? null : [s.shadowWrap, { boxShadow: plateBoxShadow(g) }]}>
    <View
      style={[s.window, { height: windowHeight, backgroundColor: g.plateFillFrom }, sceneMode ? s.windowScene : null]}
      onLayout={onLayout}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${spireText(lang, 'title')}. ${label}`}
      accessibilityValue={{ min: 1, max: SPIRE_FLOOR_COUNT, now: selected }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onA11yAction}
      testID="spire-tower"
    >
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        bounces={false}
        decelerationRate="fast"
        onContentSizeChange={onContentSizeChange}
        onScroll={onScrollEcho}
        onScrollBeginDrag={() => { draggedRef.current = true; }}
        onTouchStart={() => onTouchActive?.(true)}
        onTouchEnd={() => onTouchActive?.(false)}
        onTouchCancel={() => onTouchActive?.(false)}
        onScrollEndDrag={() => onTouchActive?.(false)}
        scrollEventThrottle={32}
      >
        {width > 0 ? (
          <View style={{ width: renderWidth, height: SPIRE_TOWER_GEOM.height * scale, alignSelf: 'center' }}>
            <SpireTowerSvg lang={lang} myFloor={myFloor} selected={selected} onSelect={onSelect} width={renderWidth} skin={skin} scene={scene} />
            {rivalsByFloor && rivalsByFloor.size > 0 ? (
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <RivalsLayer rivals={rivalsByFloor} scale={scale} dim={dimRivals} renderWidth={renderWidth} singleCoin={fontScale >= RIVAL_BIG_FONT} extraColor={sceneMode ? SPIRE_SCENE_TOWER.num : undefined} sceneFit={sceneFit} hiddenBelow={sceneMode ? rowsHidden : 0} />
              </View>
            ) : null}
            {myFloor !== null ? (
              <Animated.View pointerEvents="none" style={[s.marker, { transform: [{ translateX: tx }, { translateY: ty }] }]}>
                <View style={[s.markerGlow, scene.light ? { backgroundColor: scene.tone, opacity: 0.12 } : null]} />
                <View style={[s.markerRing, scene.light ? { backgroundColor: scene.numMine } : null]}>
                  <View style={s.markerInner}>
                    {myCoinRank !== null ? <AvatarView avatar="" coinRank={myCoinRank} size={MARKER_SIZE - 6} plus={myIsPlus} plusKind="flat" /> : null}
                  </View>
                </View>
              </Animated.View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      {fadeTop && !sceneMode ? (
        <LinearGradient
          pointerEvents="none"
          testID="spire-tower-top-fade"
          // зачем (Макеты 15.10, срезанный кружок у верха окна; правило владельца «аватары не обрезаются»): верхние ~40 % полосы непрозрачны — всё, что пересекает самую кромку окна, скрыто целиком,
          // ниже — плавное растворение (раньше альфа росла от 0 к верху, и «обрезок» монеты оставался видимым)
          colors={[g.plateFillFrom, g.plateFillFrom, colorWithAlpha(g.plateFillFrom, 0)]}
          locations={[0, TOP_FADE_SOLID, 1]}
          style={s.topFade}
        />
      ) : null}
    </View>
    </View>
  );
}

const s = StyleSheet.create({
  // Тонкая (1px) полупрозрачная кромка окна, как .tview в макете; толстых рамок нет.
  shadowWrap: { borderRadius: 22 },
  window: { height: WINDOW_HEIGHT, borderRadius: 22, overflow: 'hidden' },
  // «Сцена»: окно без плиты и скругления — башня стоит прямо на свету сцены (перекрывает фон плиты выше)
  windowScene: { borderRadius: 0, backgroundColor: 'transparent' },
  topFade: { position: 'absolute', left: 0, right: 0, top: 0, height: TOP_FADE_H },
  rivals: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  rivalExtra: { marginLeft: 5, fontSize: 13, fontWeight: '700' },
  // «Сцена»: строка 17 — по ней считается сетка (spire_scene_layout); без монет «+N» стоит без отступа слева
  rivalExtraScene: { lineHeight: 17 },
  rivalExtraSceneSolo: { marginLeft: 0, lineHeight: 17 },
  marker: { position: 'absolute', left: 0, top: 0, width: MARKER_SIZE, height: MARKER_SIZE, alignItems: 'center', justifyContent: 'center' },
  markerGlow: { position: 'absolute', width: MARKER_SIZE + 24, height: MARKER_SIZE + 24, borderRadius: (MARKER_SIZE + 24) / 2, backgroundColor: 'rgba(255,255,255,0.12)' }, // theme-exempt: метка текущего этажа башни — иллюстрация Шпиля
  markerRing: { width: MARKER_SIZE, height: MARKER_SIZE, borderRadius: MARKER_SIZE / 2, backgroundColor: '#F2F1F6', alignItems: 'center', justifyContent: 'center' }, // theme-exempt: метка текущего этажа башни — иллюстрация Шпиля
  markerInner: { width: MARKER_SIZE - 4, height: MARKER_SIZE - 4, borderRadius: (MARKER_SIZE - 4) / 2, backgroundColor: '#0C0C0D', alignItems: 'center', justifyContent: 'center' }, // theme-exempt: метка текущего этажа башни — иллюстрация Шпиля
});

export default memo(SpireTower);
