/**
 * Отдельная праздничная вспышка выигрыша.
 *
 * Это бывший Kimi-паттерн конфетти из RouletteWinModal, вынесенный из модалки:
 * пользователь сначала спокойно видит награду, а celebration запускается после
 * нажатия «Готово». Частицы детерминированы и не блокируют касания экрана.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from './ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';

// зачем (overlays-more OM-ROULETTE-CELEBRATION, kit `om-burst`): шесть нейтральных лепестков 7×13,
// фиксированные траектории из макета, 1150 мс cubic-bezier(.15,.75,.25,1), чётные — с задержкой 80 мс.
const CONFETTI_PATHS = [
  { dx: -132, dy: -122, rot: 210 },
  { dx: -82, dy: 138, rot: -250 },
  { dx: -24, dy: -172, rot: 340 },
  { dx: 44, dy: 155, rot: -300 },
  { dx: 98, dy: -134, rot: 260 },
  { dx: 148, dy: 72, rot: -220 },
] as const;
const CONFETTI_COUNT = CONFETTI_PATHS.length;
const BURST_MS = 1150;
const EVEN_DELAY_MS = 80;
const BURST_EASING = Easing.bezier(0.15, 0.75, 0.25, 1);
/** Самая долгая частица: 1150 + 80 = 1230 мс. */
const LONGEST_PIECE_MS = BURST_MS + EVEN_DELAY_MS;
/**
 * Страховка: слой обязан сняться, даже если ни один колбэк не дошёл.
 * зачем: колбэк withTiming приходит с finished=false, когда анимацию прервали
 * (сворачивание приложения, смена темы → пересоздание colors). Прежний код в
 * этом случае не звал onDone вовсе, счётчик не добирал до 24, и слой конфетти
 * оставался в дереве навсегда — 24 живые Reanimated-ноды до ухода с экрана.
 */
const SAFETY_TIMEOUT_MS = LONGEST_PIECE_MS + 600;

type ConfettiPieceProps = {
  index: number;
  colors: string[];
  onDone: () => void;
};

function ConfettiPiece({ index, colors, onDone }: ConfettiPieceProps) {
  const progress = useSharedValue(0);
  const params = useMemo(() => {
    const path = CONFETTI_PATHS[index % CONFETTI_COUNT]!;
    // `:nth-child(2n)` — второй, четвёртый, шестой (index 1, 3, 5): серый тон и задержка.
    const even = index % 2 === 1;
    return {
      ...path,
      color: even ? colors[1]! : colors[0]!,
      delay: even ? EVEN_DELAY_MS : 0,
    };
  }, [colors, index]);

  useEffect(() => {
    progress.value = withDelay(params.delay, withTiming(
      1,
      { duration: BURST_MS, easing: BURST_EASING },
      () => {
        'worklet';
        // зачем: отчитываемся ВСЕГДА, а не только при finished===true. Прерванная
        // анимация — это тоже «частица отлетала»: слой должен уметь сняться.
        // Прежнее `if (finished)` навсегда подвешивало конфетти на экране.
        runOnJS(onDone)();
      },
    ));
  }, [onDone, params.delay, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [0, params.dx]) },
      { translateY: interpolate(progress.value, [0, 1], [0, params.dy]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, params.rot])}deg` },
    ],
    opacity: interpolate(progress.value, [0, 0.72, 1], [1, 1, 0]),
  }));

  return <Animated.View style={[styles.piece, style, { backgroundColor: params.color }]} />;
}

type Props = {
  visible: boolean;
  onComplete: () => void;
};

export default function RouletteWinCelebration({ visible, onComplete }: Props) {
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const doneCount = useRef(0);
  const completedRef = useRef(false);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colors = useMemo(() => [glass.text, glass.mutedText], [glass.text, glass.mutedText]);
  // Системное «Уменьшение движения»: разлетающиеся частицы — чистое движение,
  // ради которого правило и существует. Празднование не отменяем — награду
  // по-прежнему показывает модалка, но конфетти не рисуем вовсе.
  const reduceMotion = useReducedMotion();

  // Ключ поколения: при каждом новом показе частицы пересоздаются, поэтому
  // «хвостовые» колбэки прошлого залпа физически не могут попасть в новый
  // счётчик. Раньше сброс жил в useEffect (то есть ПОСЛЕ рендера) — при быстром
  // повторном выигрыше опоздавшие колбэки досрочно добивали счётчик и
  // обрывали свежие конфетти на середине.
  const runIdRef = useRef(0);
  const prevVisible = useRef(false);
  if (visible && !prevVisible.current) {
    runIdRef.current += 1;
    doneCount.current = 0;
    completedRef.current = false;
  }
  prevVisible.current = visible;

  // Завершаем ровно один раз за показ: и таймер, и последняя частица зовут
  // одно и то же, кто первый — тот и снимает слой.
  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!visible) return undefined;
    if (reduceMotion) {
      // Частиц нет — снимаем слой сразу, иначе visible залипнет навсегда.
      finish();
      return undefined;
    }
    safetyTimer.current = setTimeout(finish, SAFETY_TIMEOUT_MS);
    return () => {
      if (safetyTimer.current) {
        clearTimeout(safetyTimer.current);
        safetyTimer.current = null;
      }
    };
  }, [visible, reduceMotion, finish]);

  const handlePieceDone = useCallback(() => {
    doneCount.current += 1;
    if (doneCount.current >= CONFETTI_COUNT) finish();
  }, [finish]);

  if (!visible || reduceMotion) return null;
  return (
    <View pointerEvents="none" style={styles.layer}>
      {Array.from({ length: CONFETTI_COUNT }).map((_, index) => (
        <ConfettiPiece
          key={`${runIdRef.current}_${index}`}
          index={index}
          colors={colors}
          onDone={handlePieceDone}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  piece: {
    position: 'absolute',
    left: '50%',
    top: '33%',
    width: 7,
    height: 13,
    marginLeft: -3.5,
    borderRadius: 3,
  },
});
