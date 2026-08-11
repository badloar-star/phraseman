import React, { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import {
  advanceEqualizer,
  equalizerBarHeights,
  EQ_BAR_COUNT,
  EQ_INITIAL_STATE,
  type EqualizerState,
} from './voice_equalizer_model';

export type VoiceEqualizerRef = {
  /** Push a raw volumechange sample without causing a React re-render. */
  setSample: (value: number) => void;
};

type VoiceEqualizerProps = {
  /** True while the microphone is actively recording. */
  active: boolean;
  /** Bar colour while recording. */
  color: string;
  /** Bar colour at rest / when inactive. */
  idleColor: string;
  /**
   * Raw native `volumechange` value (~ -2..10) for the latest frame. When
   * supplied, the equalizer reacts to the real voice — loudness sets bar
   * energy, the tone tilt reshapes the silhouette (see voice_equalizer_model).
   * Omit it (e.g. dev preview with no mic) to get the organic idle pulse.
   */
  rawSample?: number;
  /** Bar count override (defaults to the model's EQ_BAR_COUNT). */
  barCount?: number;
  /**
   * Чей сейчас ход в дуплексном звонке MAX (turn-taking читается периферийным
   * зрением по цвету баров): 'user'/'ai' красят бары в `color` (хост подставляет
   * t.accent для юзера и тёплый тон для ИИ), 'idle' — в `idleColor` даже при
   * active=true (пауза между ходами ≠ конец записи). Влияет ТОЛЬКО на выбор
   * цвета/прозрачности; без owner поведение прежнее — обратная совместимость
   * со всеми текущими хостами (SpeakingPanel и др.).
   */
  owner?: 'user' | 'ai' | 'idle';
};

const MIN_BAR_H = 5; // resting height so the row never collapses to nothing
const MAX_BAR_H = 44; // tallest a bar can grow

/**
 * Императивный setSample-путь: без свежих сэмплов дольше этого окна эквалайзер
 * возвращается к organic idle pulse (спека §1: fallback «никогда в ноль»).
 * 1.5с — заметно длиннее тика поллинга статов (100мс), чтобы idle не мигал
 * на обычном джиттере, но короче любой человеческой паузы восприятия сцены.
 */
export const EQ_IDLE_FALLBACK_MS = 1500;
/** Шаг watchdog-проверки свежести сэмплов (дёшево: одна разность времени). */
const EQ_IDLE_WATCHDOG_MS = 500;

/**
 * Rich, tone-reactive voice equalizer shown while recording.
 *
 * Two modes:
 *  • `rawSample` supplied -> bars track real loudness AND a synthesised tone
 *    tilt, so the silhouette shifts with the character of the voice, not just
 *    its volume. This is the production path.
 *  • `rawSample` omitted  -> an organic, staggered idle pulse so the component
 *    still looks alive in previews / on devices that don't emit volume.
 *
 * The component owns its frame state (voice_equalizer_model) so hosts only have
 * to forward the raw native sample — no math, no per-bar wiring at the call site.
 */
export const VoiceEqualizer = forwardRef<VoiceEqualizerRef, VoiceEqualizerProps>(function VoiceEqualizer({
  active,
  color,
  idleColor,
  rawSample,
  barCount = EQ_BAR_COUNT,
  owner,
}, ref) {
  const count = Math.max(3, barCount);
  // scaleY покоя = MIN_BAR_H / MAX_BAR_H (бар не схлопывается в ноль).
  const bars = useRef(
    Array.from({ length: count }, () => new Animated.Value(MIN_BAR_H / MAX_BAR_H)),
  ).current;
  const stateRef = useRef<EqualizerState>(EQ_INITIAL_STATE);
  const activeRef = useRef(active);
  activeRef.current = active;
  // Prop-путь (legacy, SpeakingPanel и др.): rawSample приходит пропом, idle-луп
  // не включается никогда — поведение как раньше. Императивный путь (setSample
  // через ref, экран MAX-звонка): idle-луп живёт как fallback и уступает место
  // level-driven режиму, пока сэмплы свежие (см. EQ_IDLE_FALLBACK_MS ниже).
  const levelDriven = typeof rawSample === 'number';
  const propDrivenRef = useRef(levelDriven);
  propDrivenRef.current = levelDriven;

  // Минимальная доля высоты, до которой «сжата» полоска в покое. Бар рисуется
  // на полную MAX_BAR_H и масштабируется по Y (scaleY), поэтому анимация идёт
  // на НАТИВНОМ драйвере (transform), а не через layout-height на JS-потоке —
  // это убирает лаги: 13 баров двигаются вне JS-потока, без ре-лэйаута.
  const MIN_SCALE = MIN_BAR_H / MAX_BAR_H;
  const scaleFor = (v: number) => MIN_SCALE + (1 - MIN_SCALE) * Math.max(0, Math.min(1, v));

  // Last scaleY pushed to each bar, so we can skip native commands when a bar's
  // target barely moved — cuts the per-sample work (13 bars × ~4/sec) to only
  // the bars that actually changed, which is the bulk of the lag on quiet/steady
  // stretches.
  const lastScaleRef = useRef<number[]>(Array.from({ length: count }, () => MIN_BAR_H / MAX_BAR_H));
  const SKIP_DELTA = 0.03; // ignore sub-3% moves (invisible, not worth a frame)

  // --- Idle-луп как управляемый ресурс (ref + функции, ноль setState/рендеров).
  // Зачем: в императивном setSample-пути idle-fallback должен включаться и
  // выключаться от СВЕЖЕСТИ сэмплов, а не от рендер-пропов — пауза статов
  // (реконнект, тишина getStats) не имеет права оставить эквалайзер мёртвым.
  const lastSampleAtRef = useRef(0);
  const idleLoopsRef = useRef<Animated.CompositeAnimation[] | null>(null);

  const startIdle = useRef(() => {
    if (idleLoopsRef.current) return; // уже пульсируем
    const centre = (count - 1) / 2;
    const loops = bars.map((bar, i) => {
      const dist = Math.abs(i - centre) / Math.max(1, centre);
      const peak = 0.45 + 0.55 * (1 - dist); // taller toward the centre
      return Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: scaleFor(peak),
            duration: 340 + (i % 4) * 70,
            delay: (i % 5) * 45,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: scaleFor(peak * 0.3),
            duration: 320 + (i % 3) * 80,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
    });
    idleLoopsRef.current = loops;
    loops.forEach((loop) => loop.start());
  }).current;

  const stopIdle = useRef(() => {
    const loops = idleLoopsRef.current;
    if (!loops) return;
    idleLoopsRef.current = null;
    loops.forEach((loop) => loop.stop());
    // Idle-луп двигал бары мимо skip-кэша — сбрасываем, чтобы первый же
    // level-driven сэмпл гарантированно долетел до каждого бара.
    for (let i = 0; i < lastScaleRef.current.length; i += 1) lastScaleRef.current[i] = -1;
  }).current;

  const applyRawSample = useRef((value: number) => {
    if (!activeRef.current) return;
    // Свежий сэмпл в императивном пути вытесняет idle-fallback; вернётся он
    // через watchdog, когда сэмплы протухнут (>EQ_IDLE_FALLBACK_MS).
    lastSampleAtRef.current = Date.now();
    if (!propDrivenRef.current) stopIdle();
    stateRef.current = advanceEqualizer(stateRef.current, value);
    const heights = equalizerBarHeights(stateRef.current);
    for (let i = 0; i < bars.length; i += 1) {
      const h = heights[i % heights.length] ?? 0;
      const target = scaleFor(h);
      if (Math.abs(target - (lastScaleRef.current[i] ?? 0)) < SKIP_DELTA) continue;
      lastScaleRef.current[i] = target;
      Animated.timing(bars[i]!, {
        toValue: target,
        duration: 110,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }).current;

  // Expose imperative handle so callers can push samples without setState.
  useImperativeHandle(ref, () => ({
    setSample: applyRawSample,
  }), [applyRawSample]);

  // Collapse the bars smoothly whenever recording stops (either mode).
  useEffect(() => {
    if (active) return;
    stateRef.current = EQ_INITIAL_STATE;
    bars.forEach((bar, i) => {
      lastScaleRef.current[i] = MIN_SCALE; // keep skip-cache in sync with reality
      Animated.timing(bar, {
        toValue: MIN_SCALE,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  }, [active, bars, MIN_SCALE]);

  // Level-driven mode via prop (legacy path — still works, used by SpeakingPanel).
  useEffect(() => {
    if (!levelDriven || !active) return;
    applyRawSample(rawSample as number);
  }, [levelDriven, active, rawSample, applyRawSample]);

  // Императивный путь (rawSample-проп не задан): organic idle pulse — базовый
  // режим, level-driven — пока setSample кормит свежие сэмплы. Watchdog раз в
  // 500мс возвращает idle, если сэмплы протухли (>1.5с тишины статов) — иначе
  // после первого setSample idle-луп был бы убит навсегда и эквалайзер
  // замирал бы «в ноль» при любой паузе данных. Всё на ref'ах и таймере,
  // ни одного setState — рендеров этот механизм не порождает.
  useEffect(() => {
    if (levelDriven || !active) return; // prop-путь: как раньше, без idle-лупа
    startIdle();
    const watchdogId = setInterval(() => {
      if (idleLoopsRef.current) return; // уже в idle
      if (Date.now() - lastSampleAtRef.current > EQ_IDLE_FALLBACK_MS) startIdle();
    }, EQ_IDLE_WATCHDOG_MS);
    return () => {
      clearInterval(watchdogId);
      stopIdle();
    };
  }, [levelDriven, active, startIdle, stopIdle]);

  // Выбор цвета: legacy-режим (owner не задан) — как раньше, от active;
  // duplex-режим — от владельца хода, чтобы смена цвета не требовала гасить
  // active (бары продолжают двигаться, меняется только «чей голос»).
  const barColor = owner === undefined ? (active ? color : idleColor) : owner === 'idle' ? idleColor : color;
  const barOpacity = owner === undefined ? (active ? 1 : 0.4) : owner === 'idle' ? 0.4 : 1;

  return (
    <View
      style={styles.row}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {bars.map((bar, i) => (
        <Animated.View
          key={`eq-bar-${i}`}
          style={[
            styles.bar,
            {
              backgroundColor: barColor,
              opacity: barOpacity,
              transform: [{ scaleY: bar }],
            },
          ]}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: MAX_BAR_H + 8,
  },
  bar: {
    width: 4,
    height: MAX_BAR_H,
    borderRadius: 2,
  },
});

// app/ file but a helper component, not a route. Expo Router still wants a
// default export for every file under app/.
export default function __RouteShim() {
  return null;
}
