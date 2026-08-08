// ═══════════════════════════════════════════════════════════════════════════
// TournamentFx.tsx — слой полётов наград турнира (звёзды, конфетти, волна).
//
// зачем: владелец утвердил анимации ТОЧНО как в эталоне Learning V2
// (docs/v2/mockups/02-phrase-builder.html): звезда с трейлом летит по дуге
// 700 мс в счётчик (scale 1.25 в апексе → 0.4 на посадке), конфетти 16 штук
// на вехах серии, золотая волна через экран, «+N» от пилюли серии.
//
// Устройство: FxHost — absolute-слой поверх экрана; экран получает
// императивный api через ref. Координаты — в системе окна (measureInWindow),
// хост переводит их в свои. Только transform/opacity — всё на UI-треде.
// Reduced motion: полёты заменяются мгновенным onLand.
// ═══════════════════════════════════════════════════════════════════════════

import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { FlowText } from '../text-integrity/FlowText';
import { v2motion } from './tournament_theme';

// Глифы V2 (SVG-символы эталона; эмодзи запрещены правилом владельца в
// НАГРАДНЫХ эффектах — звёзды, конфетти, волна рисуются векторами).
// Исключение 2026-07-27: реакции игроков это и есть эмодзи по прямому
// требованию владельца («эмодзи отправляются, улетают вверх, все их видят»),
// поэтому ReactionFlight рисует символ, а не глиф.
const STAR_PATH = 'M12 2.6l2.9 5.9 6.5 0.9-4.7 4.6 1.1 6.4L12 17.4l-5.8 3 1.1-6.4L2.6 9.4l6.5-0.9L12 2.6z';
const SPARK_PATH = 'M12 2.8c0.9 4.4 2.2 6.8 4.4 8 1.6 0.9 3.1 1.1 4.8 1.2-1.7 0.1-3.2 0.3-4.8 1.2-2.2 1.2-3.5 3.6-4.4 8-0.9-4.4-2.2-6.8-4.4-8-1.6-0.9-3.1-1.1-4.8-1.2 1.7-0.1 3.2-0.3 4.8-1.2 2.2-1.2 3.5-3.6 4.4-8z';

export function StarGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={STAR_PATH} fill={color} />
    </Svg>
  );
}

export function SparkGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={SPARK_PATH} fill={color} />
    </Svg>
  );
}

export type FxPoint = { x: number; y: number };

export type TournamentFxApi = {
  /** Полёт звезды с 3 трейл-копиями: from/to в координатах ОКНА. */
  flyStar: (from: FxPoint, to: FxPoint, color: string, onLand?: () => void) => void;
  /** Разлёт 16 конфетто из точки (координаты окна). */
  confetti: (origin: FxPoint, colors: string[]) => void;
  /** Золотой перелив через весь экран (веха серии). */
  goldWave: (color: string) => void;
  /** «+N» всплывает от точки (пилюля серии). */
  floatLabel: (text: string, at: FxPoint, color: string) => void;
  /**
   * Реакция-эмодзи улетает вверх.
   *
   * зачем 2026-07-27 (владелец: «чтобы они отправлялись, улетали вверх и все
   * их видели»): реакцию шлёт один игрок, а полёт видят ВСЕ участники —
   * поэтому эффект живёт в общем слое, а не внутри кнопки отправителя.
   * lane разводит одновременные реакции по горизонтали, чтобы эмодзи разных
   * игроков не наложились друг на друга.
   */
  flyReaction: (emoji: string, lane: number) => void;
};

type Effect =
  | { kind: 'star'; id: number; from: FxPoint; to: FxPoint; color: string; trail: number; onLand?: () => void }
  | { kind: 'confetto'; id: number; origin: FxPoint; color: string; angle: number; velocity: number; rotate: number; duration: number }
  | { kind: 'wave'; id: number; color: string }
  | { kind: 'label'; id: number; text: string; at: FxPoint; color: string }
  | { kind: 'reaction'; id: number; emoji: string; lane: number };

let effectSeq = 1;

/** Детерминированный псевдослучай для разлёта: без Math.random в кадре. */
function jitter(seed: number, salt: number): number {
  const x = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const TournamentFxHost = memo(forwardRef<TournamentFxApi, { width: number; height: number }>(
  function TournamentFxHost({ width, height }, ref) {
    const [effects, setEffects] = useState<Effect[]>([]);
    const originRef = useRef<FxPoint>({ x: 0, y: 0 });
    const hostRef = useRef<View>(null);
    const reduceMotionRef = useRef(false);

    React.useEffect(() => {
      let alive = true;
      AccessibilityInfo.isReduceMotionEnabled().then((on) => { if (alive) reduceMotionRef.current = on; });
      return () => { alive = false; };
    }, []);

    const toLocal = useCallback((p: FxPoint): FxPoint => ({
      x: p.x - originRef.current.x,
      y: p.y - originRef.current.y,
    }), []);

    const remove = useCallback((id: number) => {
      setEffects((prev) => prev.filter((e) => e.id !== id));
    }, []);

    useImperativeHandle(ref, () => ({
      flyStar(from, to, color, onLand) {
        if (reduceMotionRef.current) { onLand?.(); return; }
        const f = toLocal(from); const t = toLocal(to);
        const batch: Effect[] = [];
        for (let trail = 0; trail <= 3; trail++) {
          batch.push({ kind: 'star', id: effectSeq++, from: f, to: t, color, trail, onLand: trail === 0 ? onLand : undefined });
        }
        setEffects((prev) => [...prev, ...batch]);
      },
      confetti(origin, colors) {
        if (reduceMotionRef.current) return;
        const o = toLocal(origin);
        const batch: Effect[] = [];
        for (let i = 0; i < 16; i++) {
          const id = effectSeq++;
          batch.push({
            kind: 'confetto', id, origin: o, color: colors[i % colors.length],
            angle: (Math.PI * 2 * i) / 16 + (jitter(id, 1) - 0.5) * 0.6,
            velocity: 90 + jitter(id, 2) * 130,
            rotate: (jitter(id, 3) - 0.5) * 540,
            duration: 650 + jitter(id, 4) * 350,
          });
        }
        setEffects((prev) => [...prev, ...batch]);
      },
      goldWave(color) {
        if (reduceMotionRef.current) return;
        setEffects((prev) => [...prev, { kind: 'wave', id: effectSeq++, color }]);
      },
      floatLabel(text, at, color) {
        if (reduceMotionRef.current) return;
        setEffects((prev) => [...prev, { kind: 'label', id: effectSeq++, text, at: toLocal(at), color }]);
      },
      flyReaction(emoji, lane) {
        if (reduceMotionRef.current) return;
        setEffects((prev) => [...prev, { kind: 'reaction', id: effectSeq++, emoji, lane }]);
      },
    }), [toLocal]);

    const onLayout = useCallback(() => {
      hostRef.current?.measureInWindow((x, y) => { originRef.current = { x, y }; });
    }, []);

    return (
      <View ref={hostRef} style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
        {effects.map((e) => {
          if (e.kind === 'star') return <StarFlight key={e.id} fx={e} onDone={remove} />;
          if (e.kind === 'confetto') return <Confetto key={e.id} fx={e} onDone={remove} />;
          if (e.kind === 'wave') return <GoldWave key={e.id} fx={e} onDone={remove} width={width} height={height} />;
          if (e.kind === 'reaction') {
            return <ReactionFlight key={e.id} fx={e} onDone={remove} width={width} height={height} />;
          }
          return <FloatLabel key={e.id} fx={e} onDone={remove} />;
        })}
      </View>
    );
  },
));

// ── Реакция: эмодзи поднимается от низа экрана и тает ───────────────────────

/**
 * Полёт реакции снизу вверх.
 *
 * зачем 2026-07-27 (владелец: «эмодзи отправляются, улетают вверх и все их
 * видят»): движение читается как «сообщение улетело» — старт от нижней
 * четверти, подъём на две трети высоты, лёгкий снос вбок, чтобы полёт не был
 * линейкой. Дорожка (lane) разводит одновременные реакции разных игроков.
 * Живёт ровно столько, сколько длится анимация, и сам себя убирает.
 */
const ReactionFlight = memo(function ReactionFlight({
  fx, onDone, width, height,
}: {
  fx: Extract<Effect, { kind: 'reaction' }>;
  onDone: (id: number) => void;
  width: number;
  height: number;
}) {
  const progress = useSharedValue(0);
  // Дорожки идут по нижней трети ширины, а не от края: так эмодзи не липнут
  // к рамке экрана и читаются группой.
  const laneX = width * (0.16 + 0.17 * (fx.lane % 5));
  const drift = (jitter(fx.id, 3) - 0.5) * 46;
  const startY = height * 0.78;
  const rise = height * 0.62;

  useEffect(() => {
    progress.value = withTiming(
      1,
      { duration: REACTION_FLIGHT_MS, easing: Easing.bezier(0.23, 1, 0.32, 1) },
      (finished) => { if (finished) runOnJS(onDone)(fx.id); },
    );
    return () => cancelAnimation(progress);
  }, [progress, onDone, fx.id]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [
        { translateX: laneX + drift * p },
        { translateY: startY - rise * p },
        // Подача: чуть подрастает на старте, к концу слегка уменьшается.
        { scale: 0.7 + 0.5 * Math.min(1, p * 4) - 0.2 * p },
      ],
      // Держится почти весь полёт, тает только в конце — иначе не успеваешь
      // разглядеть, кто что отправил.
      opacity: p < 0.72 ? 1 : 1 - (p - 0.72) / 0.28,
    };
  });

  return (
    <Animated.View style={[styles.abs, style]} pointerEvents="none">
      {/* зачем: text-integrity — масштабирование шрифта не отключаем; летящая
          эмодзи-реакция абсолютна и без контейнера, клипаться нечему. */}
      <FlowText testID={`tournament-fx-reaction-${fx.id}`} provenance="authored" style={styles.reaction}>{fx.emoji}</FlowText>
    </Animated.View>
  );
});

/** Длительность полёта реакции. Согласована с REACTION_TTL_MS клиента. */
const REACTION_FLIGHT_MS = 2400;

// ── Звезда: дуга по квадратичной Безье, апекс на 90px выше ──────────────────

const StarFlight = memo(function StarFlight({
  fx, onDone,
}: { fx: Extract<Effect, { kind: 'star' }>; onDone: (id: number) => void }) {
  const progress = useSharedValue(0);
  const { from, to, trail } = fx;
  const apexY = Math.min(from.y, to.y) - 90;

  React.useEffect(() => {
    progress.value = withDelay(
      trail * v2motion.starTrailStepMs,
      withTiming(1, {
        duration: v2motion.starFlightMs,
        easing: Easing.bezier(...v2motion.bezierSlide),
      }, (finished) => {
        if (finished) {
          if (fx.onLand) runOnJS(fx.onLand)();
          runOnJS(onDone)(fx.id);
        }
      }),
    );
  }, [progress, trail, fx, onDone]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    // Квадратичная Безье: from → апекс(midX, apexY) → to.
    const inv = 1 - p;
    const x = inv * inv * from.x + 2 * inv * p * ((from.x + to.x) / 2) + p * p * to.x;
    const y = inv * inv * from.y + 2 * inv * p * apexY + p * p * to.y;
    const scale = interpolate(p, [0, 0.55, 1], [1, trail === 0 ? 1.25 : 1, 0.4]);
    return {
      transform: [{ translateX: x }, { translateY: y }, { scale }],
      opacity: trail === 0 ? 1 : 0.28 - trail * 0.06,
    };
  });

  const size = 26 - trail * 3;
  return (
    <Animated.View style={[styles.abs, style]}>
      <StarGlyph size={size} color={fx.color} />
    </Animated.View>
  );
});

// ── Конфетто ────────────────────────────────────────────────────────────────

const Confetto = memo(function Confetto({
  fx, onDone,
}: { fx: Extract<Effect, { kind: 'confetto' }>; onDone: (id: number) => void }) {
  const progress = useSharedValue(0);
  const { origin, angle, velocity, rotate, duration } = fx;
  const dx = Math.cos(angle) * velocity;
  const dy = Math.sin(angle) * velocity - 60;

  React.useEffect(() => {
    progress.value = withTiming(1, {
      duration,
      easing: Easing.bezier(...v2motion.bezierOutQuint),
    }, (finished) => { if (finished) runOnJS(onDone)(fx.id); });
  }, [progress, duration, fx.id, onDone]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const x = origin.x + interpolate(p, [0, 0.55, 1], [0, dx, dx * 1.25]);
    const y = origin.y + interpolate(p, [0, 0.55, 1], [0, dy + 40, dy + 190]);
    return {
      transform: [
        { translateX: x }, { translateY: y },
        { rotate: `${interpolate(p, [0, 0.55, 1], [0, rotate * 0.6, rotate])}deg` },
        { scale: interpolate(p, [0, 0.55, 1], [1, 1, 0.72]) },
      ],
      opacity: interpolate(p, [0, 0.55, 1], [1, 1, 0]),
    };
  });

  return <Animated.View style={[styles.abs, styles.confetto, { backgroundColor: fx.color }, style]} />;
});

// ── Золотая волна: перелив через экран, не молния ───────────────────────────

const GoldWave = memo(function GoldWave({
  fx, onDone, width, height,
}: { fx: Extract<Effect, { kind: 'wave' }>; onDone: (id: number) => void; width: number; height: number }) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming(1, {
      duration: 700,
      easing: Easing.bezier(...v2motion.bezierSlide),
    }, (finished) => { if (finished) runOnJS(onDone)(fx.id); });
  }, [progress, fx.id, onDone]);

  const bandWidth = width * 0.44;
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [
        { translateX: interpolate(p, [0, 0.45, 1], [-bandWidth * 1.7, width * 0.3, width * 1.4]) },
        { skewX: '-16deg' },
      ],
      opacity: interpolate(p, [0, 0.45, 1], [0, 1, 0]),
    };
  });

  return (
    <Animated.View
      style={[styles.abs, { width: bandWidth, height: height * 1.24, top: -height * 0.12, backgroundColor: fx.color }, style]}
    />
  );
});

// ── «+N» от пилюли серии ────────────────────────────────────────────────────

const FloatLabel = memo(function FloatLabel({
  fx, onDone,
}: { fx: Extract<Effect, { kind: 'label' }>; onDone: (id: number) => void }) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming(1, { duration: 950, easing: Easing.out(Easing.quad) },
      (finished) => { if (finished) runOnJS(onDone)(fx.id); });
  }, [progress, fx.id, onDone]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [
        { translateX: fx.at.x - 8 },
        { translateY: interpolate(p, [0, 0.3, 1], [fx.at.y + 10, fx.at.y - 8, fx.at.y - 36]) },
      ],
      opacity: interpolate(p, [0, 0.3, 1], [0, 1, 0]),
    };
  });

  return (
    <Animated.View style={[styles.abs, style]}>
      <FlowText testID={`tournament-fx-label-${fx.id}`} provenance="authored" style={[styles.label, { color: fx.color }]}>{fx.text}</FlowText>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  abs: { position: 'absolute', left: 0, top: 0 },
  confetto: { width: 9, height: 9, borderRadius: 2.5 },
  label: { fontSize: 17, fontWeight: '900' },
  reaction: { fontSize: 40 },
});
