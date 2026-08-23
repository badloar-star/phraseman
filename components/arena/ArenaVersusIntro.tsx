import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import AvatarView from '../AvatarView';
import { useTournamentPalette } from '../ui/v2_theme';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { hapticMediumImpact, hapticHeavyImpact } from '../../hooks/use-haptics';
import type { ArenaPlayer } from '../../modules/arena/contract';
import { useArenaSound } from '../../hooks/use_arena_sound';

/**
 * Сцена «соперник найден → 3-2-1 → старт».
 *
 * Владелец (2026-08-12): анимация отсчёта обязательна, планка — «уровень
 * Duolingo и лучше». Здесь три такта:
 *   1. аватары вылетают с двух сторон навстречу, между ними падает VS;
 *   2. отсчёт 3-2-1 — каждая цифра прилетает с масштабом, пульсирует и гаснет,
 *      на каждой цифре средний хаптик;
 *   3. старт: тяжёлый хаптик и вызов onDone. Вспышки акцентом на весь экран
 *      здесь нет — владелец убрал её 2026-08-23 как раздражающее моргание.
 *
 * Всё движение живёт на UI-потоке. При Reduce Motion сцена проигрывается теми
 * же тактами по времени, но без единого движения — только смена цифры.
 */

const SPRING = { damping: 14, stiffness: 200, mass: 0.8 } as const;
const ENTER_MS = 620;
const DIGIT_MS = 700;

function ArenaVersusIntroBase({
  you,
  opponent,
  goLabel,
  ready = true,
  onDone,
}: {
  you?: ArenaPlayer;
  opponent?: ArenaPlayer;
  goLabel: string;
  /** Финальный кадр остаётся на экране, пока план матча ещё загружается. */
  ready?: boolean;
  onDone: () => void;
}) {
  const P = useTournamentPalette();
  const reduceMotion = useReduceMotion();
  const playSound = useArenaSound();
  const { width } = useWindowDimensions();
  const [digit, setDigit] = useState<number | null>(null);
  const [go, setGo] = useState(false);
  const [sequenceDone, setSequenceDone] = useState(false);
  const doneRef = useRef(false);

  const left = useSharedValue(0);
  const right = useSharedValue(0);
  const vs = useSharedValue(0);
  const digitScale = useSharedValue(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (reduceMotion) {
      left.value = 1; right.value = 1; vs.value = 1;
    } else {
      left.value = withSpring(1, SPRING);
      right.value = withDelay(70, withSpring(1, SPRING));
      vs.value = withDelay(260, withSequence(
        withSpring(1.18, { damping: 9, stiffness: 260 }),
        withSpring(1, SPRING),
      ));
    }

    // Такт 2: три цифры по 700 мс.
    [3, 2, 1].forEach((value, index) => {
      timers.push(setTimeout(() => {
        setDigit(value);
        // Тик на каждую цифру. Кулдаун события короче секунды намеренно:
        // более длинный глотал бы каждый второй тик, и вместо «3, 2, 1»
        // игрок слышал бы «3…1».
        playSound('countdownTick');
        void hapticMediumImpact();
        if (reduceMotion) { digitScale.value = 1; return; }
        digitScale.value = 0.4;
        digitScale.value = withSequence(
          withSpring(1.1, { damping: 10, stiffness: 240 }),
          withTiming(0.86, { duration: DIGIT_MS - 260, easing: Easing.in(Easing.quad) }),
        );
      }, ENTER_MS + index * DIGIT_MS));
    });

    // Такт 3: старт.
    timers.push(setTimeout(() => {
      setDigit(null);
      setGo(true);
      playSound('countdownGo');
      void hapticHeavyImpact();
    }, ENTER_MS + 3 * DIGIT_MS));

    timers.push(setTimeout(() => {
      setSequenceDone(true);
    }, ENTER_MS + 3 * DIGIT_MS + 380));

    return () => { timers.forEach(clearTimeout); };
  }, [digitScale, left, playSound, reduceMotion, right, vs]);

  useEffect(() => {
    if (!ready || !sequenceDone || doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone, ready, sequenceDone]);

  // Узкий экран (320 pt) не вмещает две колонки по 108 pt плюс плашку VS:
  // ряд не переносится и не сжимается, крайние аватары просто уезжали за
  // край. Поэтому колонки тянутся, а аватар уменьшается вместе с ними.
  const narrow = width < 350;
  const avatarSize = narrow ? 62 : 78;
  const travel = Math.min(190, width * 0.45);
  const leftStyle = useAnimatedStyle(() => ({
    opacity: left.value,
    transform: [{ translateX: (1 - left.value) * -travel }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    opacity: right.value,
    transform: [{ translateX: (1 - right.value) * travel }],
  }));
  const vsStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, vs.value),
    transform: [{ scale: vs.value }],
  }));
  const digitStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, digitScale.value * 1.6),
    transform: [{ scale: digitScale.value }],
  }));

  return (
    <View style={styles.root} accessibilityLiveRegion="polite">
      <View style={styles.players}>
        <Animated.View style={[styles.player, leftStyle]}>
          <AvatarView avatar={you?.avatar} auraId={you?.aura} size={avatarSize} animateAura={false} ownerActive />
          <Text maxFontSizeMultiplier={1.4} style={[styles.name, { color: P.text }]}>{you?.name ?? '—'}</Text>
        </Animated.View>

        <Animated.View style={[styles.vsPlate, vsStyle, { backgroundColor: P.accent }]}>
          <Text style={[styles.vsText, { color: P.accentText }]}>VS</Text>
        </Animated.View>

        <Animated.View style={[styles.player, rightStyle]}>
          <AvatarView avatar={opponent?.avatar} auraId={opponent?.aura} size={avatarSize} animateAura={false} ownerActive />
          <Text maxFontSizeMultiplier={1.4} style={[styles.name, { color: P.text }]}>{opponent?.name ?? '—'}</Text>
        </Animated.View>
      </View>

      <View style={styles.stage}>
        {digit !== null ? (
          <Animated.Text style={[styles.digit, digitStyle, { color: P.text }]}>{digit}</Animated.Text>
        ) : null}
        {go ? <Text style={[styles.go, { color: P.accent }]}>{goLabel}</Text> : null}
      </View>
    </View>
  );
}

export const ArenaVersusIntro = memo(ArenaVersusIntroBase);

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 30 },
  players: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, alignSelf: 'stretch', paddingHorizontal: 12 },
  player: { alignItems: 'center', gap: 8, flex: 1, maxWidth: 108 },
  name: { fontSize: 14, fontWeight: '800', textAlign: 'center', flexShrink: 1 },
  vsPlate: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  vsText: { fontSize: 15, fontWeight: '900' },
  stage: { minHeight: 130, alignItems: 'center', justifyContent: 'center' },
  digit: { fontSize: 108, fontWeight: '900', fontVariant: ['tabular-nums'] },
  go: { fontSize: 44, fontWeight: '900', letterSpacing: 1 },
});
