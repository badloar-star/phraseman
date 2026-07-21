/**
 * Полноэкранная модалка выигрыша рулетки Plus.
 *
 * RN Modal (transparent): затемнение, карточка приза крупно (spring scale-in),
 * конфетти (~24 View-частицы, Reanimated translate/rotate/opacity на UI-треде,
 * само-унmount по завершении), «+N дн. Plus», строка суммирования
 * «Твой Plus теперь до {vipUntil} · +N дн.», кнопка «Забрать».
 *
 * Все цвета — токены темы; fontWeight только 400/700; тени shadowColor '#000000'.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from './ThemeContext';
import { ROULETTE_PRIZES } from '../app/roulette_prizes';

const CONFETTI_COUNT = 24;
const CONFETTI_COLORS = ['#FFFFFF', '#FFC800']; // + акцент темы добавляется в компоненте

interface ConfettiPieceProps {
  index: number;
  colors: string[];
  onDone: () => void;
}

/** Одна частица конфетти: старт из центра верхней трети, разлёт + затухание. */
function ConfettiPiece({ index, colors, onDone }: ConfettiPieceProps) {
  const progress = useSharedValue(0);
  // Детерминированный разброс по индексу (без Math.random в рендере).
  const params = useMemo(() => {
    const angle = ((index * 137.5) % 360) * (Math.PI / 180);
    const dist = 110 + ((index * 53) % 130);
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist - 90,
      rot: (index % 2 === 0 ? 1 : -1) * (180 + (index * 47) % 360),
      color: colors[index % colors.length],
      w: 6 + (index % 3) * 2,
      h: 10 + (index % 4) * 3,
      delay: (index % 6) * 40,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    progress.value = withTiming(
      1,
      { duration: 1500 + params.delay, easing: Easing.out(Easing.cubic) },
      (finished) => {
        'worklet';
        if (finished) runOnJS(onDone)();
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [0, params.dx]) },
      { translateY: interpolate(progress.value, [0, 1], [0, params.dy]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, params.rot])}deg` },
    ],
    opacity: interpolate(progress.value, [0, 0.75, 1], [1, 1, 0]),
  }));

  return (
    <Animated.View
      style={[
        confettiStyles.piece,
        style,
        { backgroundColor: params.color, width: params.w, height: params.h },
      ]}
    />
  );
}

const confettiStyles = StyleSheet.create({
  piece: {
    position: 'absolute',
    left: '50%',
    top: '32%',
    borderRadius: 2,
  },
});

export interface RouletteWinData {
  prizeIndex: number;
  prizeDays: number;
  /** vipUntil из ответа referralSpin (ms). */
  vipUntil: number;
}

interface Props {
  data: RouletteWinData | null;
  onClose: () => void;
}

export default function RouletteWinModal({ data, onClose }: Props) {
  const { theme: t, f, ds } = useTheme();
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);
  const [confettiGone, setConfettiGone] = useState(false);
  const doneCount = React.useRef(0);

  useEffect(() => {
    if (data) {
      setConfettiGone(false);
      doneCount.current = 0;
      scale.value = 0.85;
      opacity.value = 0;
      scale.value = withSpring(1, { damping: 13, stiffness: 160 });
      opacity.value = withTiming(1, { duration: 220 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!data) return null;
  const prize = ROULETTE_PRIZES[data.prizeIndex] ?? ROULETTE_PRIZES[0];
  const vipDate = data.vipUntil > 0 ? new Date(data.vipUntil).toLocaleDateString('ru-RU') : '—';
  const confettiColors = [t.accent, t.gold, ...CONFETTI_COLORS];

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        {!confettiGone &&
          Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
            <ConfettiPiece
              key={i}
              index={i}
              colors={confettiColors}
              onDone={() => {
                doneCount.current += 1;
                if (doneCount.current >= CONFETTI_COUNT) setConfettiGone(true);
              }}
            />
          ))}

        <Animated.View style={[styles.cardWrap, cardAnim]}>
          {/* outer = тень; inner = clip (UI_STANDARD: overflow:'hidden' убивает elevation) */}
          <View style={[styles.prizeCardOuter, { shadowColor: '#000000' }]}>
            <View style={[styles.prizeCardInner, { borderColor: t.accent }]}>
              <Image source={prize.image} style={styles.prizeImage} resizeMode="cover" />
            </View>
          </View>

          <Text style={[styles.winDays, { color: t.accent, fontSize: f.numLg + 2, fontFamily: ds.fontFamily }]}>
            +{prize.label} Plus
          </Text>
          <Text style={[styles.winSub, { color: t.textMuted, fontSize: f.sub, fontFamily: ds.fontFamily }]}>
            Твой Plus теперь до <Text style={{ color: t.textPrimary, fontWeight: '700' }}>{vipDate}</Text>
            {' · '}
            <Text style={{ color: t.accent, fontWeight: '700' }}>+{data.prizeDays} дн.</Text>
          </Text>

          <Pressable
            onPress={onClose}
            style={({ pressed }: { pressed: boolean }) => [
              styles.claimBtn,
              ds.shadow.medium,
              { backgroundColor: t.accent, opacity: pressed ? 0.92 : 1, height: ds.buttonHeight },
            ]}
          >
            <Text style={[styles.claimBtnText, { color: t.correctText, fontSize: f.bodyLg, fontFamily: ds.fontFamily }]}>
              Забрать
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  cardWrap: {
    alignItems: 'center',
    width: '100%',
  },
  prizeCardOuter: {
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 18,
    borderRadius: 20,
  },
  prizeCardInner: {
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 2,
  },
  prizeImage: {
    width: 240,
    aspectRatio: 3 / 2,
  },
  winDays: {
    marginTop: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  winSub: {
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },
  claimBtn: {
    marginTop: 26,
    alignSelf: 'stretch',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimBtnText: {
    fontWeight: '700',
  },
});
