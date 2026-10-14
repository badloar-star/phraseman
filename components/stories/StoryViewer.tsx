// ═══════════════════════════════════════════════════════════════════════════
// StoryViewer.tsx — полноэкранный просмотр сторис по аватару (D192): полосы прогресса, 2,4 с на событие, тапы, пауза, свайп вниз.
//
// зачем (владелец 14.10: «как история в Instagram»; образец docs/design/v2-app/stories-avatar.html, s2): тап по аватару раскрывает просмотр из аватара за 380 мс (кривая .32,.72,0,1),
// сверху полосы по числу событий (3 dp, каждая заполняется 2,4 с линейно), шапка «монета 32 · Твои события · когда · ✕», тап слева 32 % — назад, справа — дальше, удержание — пауза,
// свайп вниз или ✕ — закрыть (уезжает вниз и гаснет, 320 мс), после последнего закрывается сам. Звуки V2: `story` на каждом кадре, `sheet_close` на закрытии. Монета — только аватар ранга.
// Всё движение на UI-треде (Reanimated + Gesture Handler): таймер полосы — withTiming, а не setTimeout. Список событий замораживается в момент открытия: пока человек смотрит, кольцо
// на Главной уже может погаснуть (markSeen по мере показа), а очередь просмотра не должна меняться под пальцем. Просмотренным событие считается, когда его кадр показан.
// Пауза также при фоне приложения/уходе экрана из фокуса. Экранный диктор: автопереход выключен (читать успеть нельзя), листание — тапом «дальше». reduceMotion — без раскрытия и улёта.
// Логи: [STORY-VIEWER] (открытие, кадр, пауза/возобновление, закрытие с причиной).
// ═══════════════════════════════════════════════════════════════════════════
import { tryPlayV2Event } from '../../modules/sound_v2/legacy_bridge';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, cancelAnimation, interpolate, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import type { Lang } from '../../constants/i18n';
import { DebugLogger } from '../../app/debug-logger';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { hapticTap } from '../../hooks/use-haptics';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { playEvent } from '../../modules/sound_v2/sound_bank';
import type { StoryEventList } from '../../modules/story_events/story_events_core';
import { LinearGradient } from '../SafeLinearGradient';
import { SheetSwipeRoot } from '../modal_fx/SheetSwipeClose';
import SpireRankCoin from '../spire/SpireRankCoin';
import { useSpirePalette } from '../spire/useSpirePalette';
import StorySlide from './StorySlides';
import { storyText, storyWhenLabel } from './story_strings';

const LOG = '[STORY-VIEWER]';
/** Длительность одного события, мс (образец: 2,4 с). */
export const STORY_SLIDE_MS = 2400;
/** Раскрытие из аватара, мс (образец `storyIn`: 380 мс, cubic-bezier(.32,.72,0,1)). */
export const STORY_ENTER_MS = 380;
/** Закрытие: уезжает вниз и гаснет, мс (образец `.closing`: 320 мс). */
export const STORY_CLOSE_MS = 320;
/** Левая зона «назад»: 32 % ширины (образец `.stap.l`). */
export const STORY_PREV_ZONE = 0.32;
/** Удержание дольше этого — пауза, мс. */
export const STORY_HOLD_MS = 220;
const HEADER_H = 110;
const CLOSE_DRAG_PX = 90;
const CLOSE_DRAG_VELOCITY = 800;
const EASE_ENTER = Easing.bezier(0.32, 0.72, 0, 1);
const EASE_LINEAR = Easing.linear;

export type StoryOrigin = Readonly<{ x: number; y: number }>;

export type StoryViewerProps = Readonly<{
  lang: Lang;
  /** Очередь просмотра (непросмотренные от старого к новому) — замораживается при открытии. */
  events: StoryEventList;
  /** Ранг монеты человека 0…19 (для шапки и маркера на башне); null — базовая. */
  coinRank: number | null;
  /** Центр аватара в окне — откуда раскрывается просмотр. */
  origin: StoryOrigin | null;
  /** Кадр показан → событие просмотрено (мгновенно в памяти, диск догоняет фоном). */
  onSeen: (id: string) => void;
  onClose: () => void;
  testID?: string;
}>;

function StoryViewer({ lang, events: eventsProp, coinRank, origin, onSeen, onClose, testID = 'story-viewer' }: StoryViewerProps) {
  const p = useSpirePalette();
  const reduceMotion = useReducedMotion();
  const insets = useStableSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const runtimeActive = useRuntimeActive(true);
  const events = useMemo(() => eventsProp, []); // eslint-disable-line react-hooks/exhaustive-deps -- зачем: очередь замораживается на открытие
  const count = events.length;
  const [index, setIndex] = useState(0);
  const [screenReader, setScreenReader] = useState(false);
  const indexRef = useRef(0);
  const closingRef = useRef(false);
  const heldRef = useRef(false);
  const runtimeRef = useRef(true);
  const pausedRef = useRef(false);
  const screenReaderRef = useRef(false);
  const nowMs = useMemo(() => Date.now(), []);

  const enter = useSharedValue(reduceMotion ? 1 : 0);
  const closeP = useSharedValue(0);
  const dragY = useSharedValue(0);
  const progress = useSharedValue(0);
  const appear = useSharedValue(1);

  const onSeenRef = useRef(onSeen);
  onSeenRef.current = onSeen;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // ── закрытие ────────────────────────────────────────────────────────────
  const finishClose = useCallback((source: string) => {
    DebugLogger.info(LOG, `закрыт source=${source} индекс=${indexRef.current}/${count}`);
    onCloseRef.current();
  }, [count]);

  const close = useCallback((source: string) => {
    if (closingRef.current) { DebugLogger.info(LOG, `close пропущен: уже закрывается source=${source}`); return; }
    closingRef.current = true;
    cancelAnimation(progress);
    playEvent('sheet_close');
    DebugLogger.info(LOG, `закрытие source=${source} reduceMotion=${String(reduceMotion)}`);
    if (reduceMotion) { finishClose(source); return; }
    closeP.value = withTiming(1, { duration: STORY_CLOSE_MS, easing: Easing.bezier(0.23, 1, 0.32, 1) }, (finished) => { if (finished) runOnJS(finishClose)(source); });
  }, [closeP, finishClose, progress, reduceMotion]);

  // ── таймер полосы ────────────────────────────────────────────────────────
  const goRef = useRef<(k: number) => void>(() => undefined);
  const advance = useCallback(() => { goRef.current(indexRef.current + 1); }, []);
  const runBar = useCallback((from: number) => {
    const left = Math.max(0, 1 - from) * STORY_SLIDE_MS;
    progress.value = withTiming(1, { duration: left, easing: EASE_LINEAR }, (finished) => { if (finished) runOnJS(advance)(); });
  }, [advance, progress]);

  const go = useCallback((target: number) => {
    if (closingRef.current) return;
    if (target >= count) { close('finished'); return; }
    const k = Math.max(0, target);
    if (k !== indexRef.current) tryPlayV2Event('story', 'story_viewer'); // зачем (координатор 14.10): звук перелистывания сторис V2; флаг выключен — тишина
    indexRef.current = k;
    setIndex(k);
    cancelAnimation(progress);
    progress.value = 0;
    appear.value = reduceMotion ? 1 : 0;
    if (!reduceMotion) appear.value = withTiming(1, { duration: 380, easing: Easing.bezier(0.23, 1, 0.32, 1) });
    const event = events[k];
    DebugLogger.info(LOG, `кадр ${k + 1}/${count} id=${event?.id ?? '—'} тип=${event?.type ?? '—'} автопереход=${String(!screenReaderRef.current)}`);
    if (event) onSeenRef.current(event.id);
    // звук листания 'story' ведёт общий мост tryPlayV2Event выше (решение координатора 14.10: звуки ведут Темы; свой playEvent убран, чтобы не звучало дважды)
    if (!screenReaderRef.current && !pausedRef.current) runBar(0);
  }, [appear, close, count, events, progress, reduceMotion, runBar]);
  goRef.current = go;

  // пауза/возобновление: палец, фон приложения, диктор — любое «держит» полосу
  const syncPause = useCallback(() => {
    if (closingRef.current) return;
    const shouldPause = heldRef.current || !runtimeRef.current || screenReaderRef.current;
    if (shouldPause && !pausedRef.current) {
      pausedRef.current = true;
      cancelAnimation(progress);
      DebugLogger.info(LOG, `пауза полоса=${progress.value.toFixed(2)} палец=${String(heldRef.current)} активно=${String(runtimeRef.current)} диктор=${String(screenReaderRef.current)}`);
    } else if (!shouldPause && pausedRef.current) {
      pausedRef.current = false;
      DebugLogger.info(LOG, `возобновление с полосы ${progress.value.toFixed(2)}`);
      runBar(progress.value);
    }
  }, [progress, runBar]);

  const setHold = useCallback((value: boolean) => { heldRef.current = value; syncPause(); }, [syncPause]);
  useEffect(() => { runtimeRef.current = runtimeActive; syncPause(); }, [runtimeActive, syncPause]);

  // старт: раскрытие из аватара и первый кадр; диктор — без автоперехода
  useEffect(() => {
    DebugLogger.info(LOG, `открыт событий=${count} origin=${origin ? `${Math.round(origin.x)},${Math.round(origin.y)}` : 'нет'} reduceMotion=${String(reduceMotion)}`);
    void hapticTap();
    if (!reduceMotion) enter.value = withTiming(1, { duration: STORY_ENTER_MS, easing: EASE_ENTER });
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled().then((on) => {
      if (!alive) return;
      screenReaderRef.current = on; setScreenReader(on);
      if (on) { syncPause(); DebugLogger.info(LOG, 'диктор включён: автопереход выключен'); }
    }).catch((e: unknown) => { DebugLogger.info(LOG, `isScreenReaderEnabled упал: ${String(e)} — автопереход оставлен`); });
    go(0);
    return () => { alive = false; cancelAnimation(progress); cancelAnimation(enter); cancelAnimation(closeP); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: открытие один раз на монтирование
  }, []);

  // ── жесты ────────────────────────────────────────────────────────────────
  const onTapAt = useCallback((x: number, y: number) => {
    if (y < HEADER_H) return; // шапка с ✕ — не зона листания
    DebugLogger.info(LOG, `тап x=${Math.round(x)} зона=${x < winW * STORY_PREV_ZONE ? 'назад' : 'дальше'}`);
    go(x < winW * STORY_PREV_ZONE ? indexRef.current - 1 : indexRef.current + 1);
  }, [go, winW]);

  const gesture = useMemo(() => {
    const tap = Gesture.Tap().maxDuration(250).onEnd((e, ok) => { if (ok) runOnJS(onTapAt)(e.x, e.y); });
    const hold = Gesture.LongPress().minDuration(STORY_HOLD_MS).maxDistance(24)
      .onStart(() => { runOnJS(setHold)(true); })
      .onFinalize(() => { runOnJS(setHold)(false); });
    const pan = Gesture.Pan().activeOffsetY(14).failOffsetX([-40, 40])
      .onStart(() => { runOnJS(setHold)(true); })
      .onUpdate((e) => { dragY.value = Math.max(0, e.translationY); })
      .onEnd((e) => {
        if (e.translationY > CLOSE_DRAG_PX || e.velocityY > CLOSE_DRAG_VELOCITY) runOnJS(close)('swipe');
        else dragY.value = withSpring(0, { damping: 22, stiffness: 260 });
      })
      .onFinalize(() => { runOnJS(setHold)(false); });
    return Gesture.Simultaneous(hold, Gesture.Exclusive(pan, tap));
  }, [close, dragY, onTapAt, setHold]);

  // ── стили ────────────────────────────────────────────────────────────────
  const dx = (origin?.x ?? winW - 40) - winW / 2;
  const dy = (origin?.y ?? 60) - winH / 2;
  const sheetStyle = useAnimatedStyle(() => {
    const e = enter.value;
    const c = closeP.value;
    const drag = Math.min(1, dragY.value / winH);
    return {
      opacity: Math.min(1, e * 3) * (1 - c),
      borderRadius: interpolate(e, [0, 1], [winH / 2, 0]) + c * 40,
      transform: [
        { translateX: (1 - e) * dx },
        { translateY: (1 - e) * dy + dragY.value + c * winH * 0.6 },
        { scale: (0.2 + 0.8 * e) * (1 - 0.1 * c) * (1 - 0.08 * drag) },
      ],
    };
  });
  const slideStyle = useAnimatedStyle(() => ({ opacity: appear.value, transform: [{ translateY: (1 - appear.value) * 12 }] }));
  const barFill = useAnimatedStyle(() => ({ width: `${Math.round(progress.value * 1000) / 10}%` }));

  const event = events[Math.min(index, count - 1)];
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => close('back')}>
      <SheetSwipeRoot>
        <GestureDetector gesture={gesture}>
          <Animated.View testID={testID} accessibilityViewIsModal style={[s.root, sheetStyle]}>
            <LinearGradient colors={[p.bgTop, p.bg]} locations={[0, 0.7]} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View style={[s.bars, { paddingTop: insets.top + 10 }]} testID={`${testID}-bars`}>
              {events.map((e, i) => (
                <View key={e.id} style={s.track}>
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: p.text, opacity: 0.22 }]} />
                  {i < index ? <View testID={`${testID}-bar-${i}-done`} style={[StyleSheet.absoluteFill, { backgroundColor: p.text }]} />
                    : i === index ? <Animated.View testID={`${testID}-bar-${i}-live`} style={[s.fill, { backgroundColor: p.text }, barFill]} /> : null}
                </View>
              ))}
            </View>
            <View style={s.header}>
              <SpireRankCoin rank={coinRank} size={32} />
              <View style={s.headerCopy}>
                <Text style={[s.name, { color: p.text }]}>{storyText(lang, 'title')}</Text>
                <Text testID={`${testID}-when`} style={[s.when, { color: p.textSecondary }]}>{event ? storyWhenLabel(lang, event.atMs, nowMs) : ''}</Text>
              </View>
              <Pressable testID={`${testID}-close`} accessibilityRole="button" accessibilityLabel={storyText(lang, 'close')} hitSlop={6} onPress={() => close('button')} style={s.closeBtn}>
                <Ionicons name="close" size={22} color={p.text} />
              </Pressable>
            </View>
            <Animated.View key={event?.id ?? 'none'} testID={`${testID}-slide`} style={[s.slide, slideStyle]} pointerEvents="none">
              {event ? <StorySlide event={event} lang={lang} coinRank={coinRank} /> : null}
            </Animated.View>
            {screenReader ? (
              <Pressable testID={`${testID}-next`} accessibilityRole="button" accessibilityLabel={storyText(lang, 'next')} onPress={() => go(indexRef.current + 1)} style={s.srNext} />
            ) : null}
          </Animated.View>
        </GestureDetector>
      </SheetSwipeRoot>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  // полосы: поля 12, зазор 4, высота 3 (образец `.sbars`)
  bars: { flexDirection: 'row', gap: 4, paddingHorizontal: 12 },
  track: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12 },
  headerCopy: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  when: { fontSize: 13, lineHeight: 17 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  // кадр: между шапкой и низом (образец `.sslide`: top 120, bottom 60, поля 28)
  slide: { position: 'absolute', left: 0, right: 0, top: 120, bottom: 60, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  srNext: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 56 },
});

export default memo(StoryViewer);
