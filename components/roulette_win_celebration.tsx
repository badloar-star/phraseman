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
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from './ThemeContext';

const CONFETTI_COUNT = 24;
const CONFETTI_COLORS = ['#FFFFFF', '#FFC800'];
/** Самая долгая частица: 1500 + max(delay) = 1500 + 5*40 = 1700мс. */
const LONGEST_PIECE_MS = 1500 + 5 * 40;
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
    const angle = ((index * 137.5) % 360) * (Math.PI / 180);
    const dist = 110 + ((index * 53) % 130);
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist - 90,
      rot: (index % 2 === 0 ? 1 : -1) * (180 + (index * 47) % 360),
      color: colors[index % colors.length],
      width: 6 + (index % 3) * 2,
      height: 10 + (index % 4) * 3,
      delay: (index % 6) * 40,
    };
  }, [colors, index]);

  useEffect(() => {
    progress.value = withTiming(
      1,
      { duration: 1500 + params.delay, easing: Easing.out(Easing.cubic) },
      () => {
        'worklet';
        // зачем: отчитываемся ВСЕГДА, а не только при finished===true. Прерванная
        // анимация — это тоже «частица отлетала»: слой должен уметь сняться.
        // Прежнее `if (finished)` навсегда подвешивало конфетти на экране.
        runOnJS(onDone)();
      },
    );
  }, [onDone, params.delay, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [0, params.dx]) },
      { translateY: interpolate(progress.value, [0, 1], [0, params.dy]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, params.rot])}deg` },
    ],
    opacity: interpolate(progress.value, [0, 0.75, 1], [1, 1, 0]),
  }));

  return <Animated.View style={[styles.piece, style, { backgroundColor: params.color, width: params.width, height: params.height }]} />;
}

type Props = {
  visible: boolean;
  onComplete: () => void;
};

export default function RouletteWinCelebration({ visible, onComplete }: Props) {
  const { theme: t } = useTheme();
  const doneCount = useRef(0);
  const completedRef = useRef(false);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colors = useMemo(() => [t.accent, t.gold, ...CONFETTI_COLORS], [t.accent, t.gold]);
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
    top: '32%',
    borderRadius: 2,
  },
});
