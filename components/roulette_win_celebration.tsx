/**
 * Отдельная праздничная вспышка выигрыша.
 *
 * Это бывший Kimi-паттерн конфетти из RouletteWinModal, вынесенный из модалки:
 * пользователь сначала спокойно видит награду, а celebration запускается после
 * нажатия «Готово». Частицы детерминированы и не блокируют касания экрана.
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from './ThemeContext';

const CONFETTI_COUNT = 24;
const CONFETTI_COLORS = ['#FFFFFF', '#FFC800'];

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
      (finished) => {
        'worklet';
        if (finished) runOnJS(onDone)();
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
  const doneCount = React.useRef(0);
  const colors = useMemo(() => [t.accent, t.gold, ...CONFETTI_COLORS], [t.accent, t.gold]);

  useEffect(() => {
    if (visible) doneCount.current = 0;
  }, [visible]);

  if (!visible) return null;
  return (
    <View pointerEvents="none" style={styles.layer}>
      {Array.from({ length: CONFETTI_COUNT }).map((_, index) => (
        <ConfettiPiece
          key={index}
          index={index}
          colors={colors}
          onDone={() => {
            doneCount.current += 1;
            if (doneCount.current >= CONFETTI_COUNT) onComplete();
          }}
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
