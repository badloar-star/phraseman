// ═══════════════════════════════════════════════════════════════════════════
// SpireTower.tsx — окно с башней: прокрутка к своему этажу, маркер игрока, доступность.
//
// зачем: макет держит башню в окне .tview 400px и выносит маркер вправо от своего
// этажа. Маркер здесь — обычный RN-слой поверх SVG (монета ранга — настоящая картинка
// аватара), его перелёт на этаж выше идёт на нативном драйвере, без покадровых setState.
// Если локальной недели нет, маркера нет вовсе — не выдумываем этаж.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import AvatarView from '../AvatarView';
import type { Lang } from '../../constants/i18n';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useSpirePalette } from './useSpirePalette';
import { PlateFill, plateBoxShadow, useShadowGlass } from '../v2/ShadowSurface';
import SpireTowerSvg from './SpireTowerSvg';
import { useSpireScene } from './useSpireScene';
import { spireSkinForTier } from '../../modules/spire/tower_skins';
import { getDevSpireTierOverride } from '../../app/dev_spire_tier';
import SpireRankCoin from './SpireRankCoin';
import { spireText } from './spire_strings';
import { logSpireLayout, roundLayout } from './spire_layout_log';
import { SPIRE_FLOOR_COUNT, SPIRE_TOWER_GEOM, SPIRE_TW, spireMarkerXY, type SpireRival } from './spire_tower_model';

const WINDOW_HEIGHT = 400;
const MARKER_SIZE = 40;

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
}>;

const RIVAL = 22;
const RIVAL_STEP = 13;
const RIVAL_SHOWN = 2;

/**
 * Соперники слева от этажа (floorSvg макета): до двух кружков внахлёст и «+N».
 * зачем: монета ранга участника (владелец 13.10), неизвестный ранг — базовая монета, не буква. Слой RN поверх SVG, без касаний (тап по этажу проходит насквозь).
 */
const RivalsLayer = memo(function RivalsLayer({ rivals, scale, dim }: Readonly<{ rivals: ReadonlyMap<number, readonly SpireRival[]>; scale: number; dim: boolean }>) {
  const p = useSpirePalette();
  const items: React.ReactNode[] = [];
  for (const fl of SPIRE_TOWER_GEOM.floors) {
    const list = rivals.get(fl.f);
    if (!list || list.length === 0) continue;
    const shown = Math.min(list.length, RIVAL_SHOWN);
    const extra = list.length - shown;
    const ax = fl.x0 - 10 - (RIVAL + (shown - 1) * RIVAL_STEP) - (extra ? 22 : 0);
    const top = (fl.y + fl.h / 2 - RIVAL / 2) * scale;
    items.push(
      <View key={`rivals-${fl.f}`} style={[s.rivals, { left: ax * scale, top, opacity: dim ? 0.55 : 1 }]}>
        {list.slice(0, shown).map((m, k) => (
          <View key={m.uid} style={{ marginLeft: k === 0 ? 0 : (RIVAL_STEP - RIVAL) * scale }}>
            <SpireRankCoin rank={m.coinRank} size={RIVAL * scale} />
          </View>
        ))}
        {extra > 0 ? <Text style={[s.rivalExtra, { color: p.textSecondary }]}>{`+${extra}`}</Text> : null}
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

function SpireTower({ lang, myFloor, selected, onSelect, myCoinRank, rivalsByFloor, dimRivals = false, tier = null }: Props) {
  const p = useSpirePalette();
  const g = useShadowGlass();
  const reduceMotion = useReduceMotion();
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const scale = width > 0 ? width / SPIRE_TW : 0;
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
  const draggedRef = useRef(false);
  // зачем (приоритет владельца 13.10): журнал [SPIRE-RIVALS] — сколько соперников попадает в окно башни при прокрутке (кто выше/ниже виден или нет)
  const rivalsRef = useRef<ReadonlyMap<number, readonly SpireRival[]> | undefined>(rivalsByFloor);
  rivalsRef.current = rivalsByFloor;

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
    const y = Math.max(0, cy - WINDOW_HEIGHT / 2);
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
      if (mid >= y && mid <= y + WINDOW_HEIGHT && list && list.length > 0) { inWindow += list.length; floorsInWindow += 1; }
    }
    console.log('[SPIRE-RIVALS] window', JSON.stringify({ why, floor, requestedY: roundLayout(y), rivalsInWindow: inWindow, floorsWithRivals: floorsInWindow, total: rivalsRef.current?.size ?? 0 })); // guard-ok: журнал окна башни
    echoRef.current = why;
    draggedRef.current = false; // новый запрос — прежняя ручная прокрутка не мешает
    lastReqRef.current = { y: Math.min(y, Math.max(0, needH - WINDOW_HEIGHT)), why }; // ожидаемое смещение — не дальше низа содержимого
    scrollRef.current?.scrollTo({ y, animated });
    if (!animated) verifyScroll({ scroll: scrollRef, last: lastReqRef, offset: offsetRef, dragged: draggedRef }, 0); // анимированный подъём догоняет сам; сверяем только мгновенные показы
  }, [scale, width]);

  const onContentSizeChange = useCallback((_w: number, h: number) => {
    contentHRef.current = h;
    const pending = pendingRef.current;
    console.log('[SPIRE-SCROLL] размер содержимого', JSON.stringify({ h: roundLayout(h), pending: pending ? { floor: pending.floor } : null })); // guard-ok: единичный лог на изменение размера
    if (pending) scrollToFloor(pending.floor, false, 'после-layout'); // i18n-ok: причина прокрутки для лога [SPIRE-SCROLL], не текст экрана
  }, [scrollToFloor]);

  const onScrollEcho = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    offsetRef.current = e.nativeEvent.contentOffset.y;
    const why = echoRef.current;
    if (!why) return;
    echoRef.current = null;
    console.log('[SPIRE-SCROLL] получено', JSON.stringify({ why, gotY: roundLayout(e.nativeEvent.contentOffset.y) })); // guard-ok: итог прокрутки
  }, []);

  useEffect(() => {
    if (scale <= 0) return;
    if (myFloor === null) { placedRef.current = false; scrollToFloor(null, false, 'нет-этажа'); return; } // i18n-ok: причина прокрутки для лога [SPIRE-SCROLL], не текст экрана
    const target = markerTarget(myFloor, scale);
    if (!placedRef.current || reduceMotion) {
      // Первый кадр и «уменьшить движение»: маркер сразу на месте.
      tx.setValue(target.x);
      ty.setValue(target.y);
      placedRef.current = true;
      scrollToFloor(myFloor, false, 'первый-показ'); // i18n-ok: причина прокрутки для лога [SPIRE-SCROLL], не текст экрана
      return;
    }
    // Подъём на этаж выше: перелёт на нативном драйвере, окно догоняет.
    Animated.parallel([
      Animated.timing(tx, { toValue: target.x, duration: 900, easing: Easing.bezier(0.2, 0.9, 0.2, 1), useNativeDriver: true }),
      Animated.timing(ty, { toValue: target.y, duration: 900, easing: Easing.bezier(0.2, 0.9, 0.2, 1), useNativeDriver: true }),
    ]).start();
    scrollToFloor(myFloor, true, 'смена-этажа'); // i18n-ok: причина прокрутки для лога [SPIRE-SCROLL], не текст экрана
  }, [myFloor, scale, reduceMotion, tx, ty, scrollToFloor]);

  // зачем (владелец 13.10: одна башня Оникса в 12 «нарядах»): наряд по лиге игрока, объект стабилен по ссылке — memo башни не просыпается зря
  // dev_state?spireTier=N подменяет лигу для кадров Сверки (в стор-сборке всегда null); неделя и комната не меняются
  const devTier = getDevSpireTierOverride();
  const skin = useMemo(() => spireSkinForTier(devTier ?? tier), [devTier, tier]);
  // зачем (владелец 13.10, светлая тема: «окно башни — по ТЕМЕ, а не по башне»): небо, звёзды, облака, земля и подписи — из токенов темы; башня — наряд лиги
  const scene = useSpireScene();
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
    <View style={[s.shadowWrap, { boxShadow: plateBoxShadow(g) }]}>
    <View
      style={[s.window, { backgroundColor: g.plateFillFrom }]}
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
        scrollEventThrottle={32}
      >
        {width > 0 ? (
          <View style={{ width, height: SPIRE_TOWER_GEOM.height * scale }}>
            <SpireTowerSvg lang={lang} myFloor={myFloor} selected={selected} onSelect={onSelect} width={width} skin={skin} scene={scene} />
            {rivalsByFloor && rivalsByFloor.size > 0 ? (
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <RivalsLayer rivals={rivalsByFloor} scale={scale} dim={dimRivals} />
              </View>
            ) : null}
            {myFloor !== null ? (
              <Animated.View pointerEvents="none" style={[s.marker, { transform: [{ translateX: tx }, { translateY: ty }] }]}>
                <View style={[s.markerGlow, scene.light ? { backgroundColor: scene.tone, opacity: 0.12 } : null]} />
                <View style={[s.markerRing, scene.light ? { backgroundColor: scene.numMine } : null]}>
                  <View style={s.markerInner}>
                    {myCoinRank !== null ? <AvatarView avatar="" coinRank={myCoinRank} size={MARKER_SIZE - 6} /> : null}
                  </View>
                </View>
              </Animated.View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
    </View>
  );
}

const s = StyleSheet.create({
  // Тонкая (1px) полупрозрачная кромка окна, как .tview в макете; толстых рамок нет.
  shadowWrap: { borderRadius: 22 },
  window: { height: WINDOW_HEIGHT, borderRadius: 22, overflow: 'hidden' },
  rivals: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  rivalExtra: { marginLeft: 5, fontSize: 13, fontWeight: '700' },
  marker: { position: 'absolute', left: 0, top: 0, width: MARKER_SIZE, height: MARKER_SIZE, alignItems: 'center', justifyContent: 'center' },
  markerGlow: { position: 'absolute', width: MARKER_SIZE + 24, height: MARKER_SIZE + 24, borderRadius: (MARKER_SIZE + 24) / 2, backgroundColor: 'rgba(255,255,255,0.12)' }, // theme-exempt: метка текущего этажа башни — иллюстрация Шпиля
  markerRing: { width: MARKER_SIZE, height: MARKER_SIZE, borderRadius: MARKER_SIZE / 2, backgroundColor: '#F2F1F6', alignItems: 'center', justifyContent: 'center' }, // theme-exempt: метка текущего этажа башни — иллюстрация Шпиля
  markerInner: { width: MARKER_SIZE - 4, height: MARKER_SIZE - 4, borderRadius: (MARKER_SIZE - 4) / 2, backgroundColor: '#0C0C0D', alignItems: 'center', justifyContent: 'center' }, // theme-exempt: метка текущего этажа башни — иллюстрация Шпиля
});

export default memo(SpireTower);
