// ═══════════════════════════════════════════════════════════════════════════
// TournamentAudioButton.tsx — кнопка прослушивания задания на слух.
//
// зачем: аудио-режимы турнира (макеты V2 03/04/05) неиграбельны без неё —
// услышать фразу можно только здесь. Дизайн повторяет эталон: круглая кнопка
// с кольцом прогресса воспроизведения, пульс пока звучит, «Ещё раз» после.
//
// ГЛАВНОЕ ПО ЧЕСТНОСТИ: повторы считаются и отдаются наружу. Игрок под
// таймером волен переслушать, но экран должен знать об этом — иначе нельзя
// отличить «услышал сразу» от «слушал пять раз».
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { useTournamentPalette, v2motion } from './tournament_theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  /** Ссылка на озвучку. Пусто — кнопка неактивна. */
  audioUri: string;
  /** Автоматически проиграть при появлении вопроса. */
  autoPlay?: boolean;
  /** Сколько раз игрок прослушал (для честности статистики). */
  onPlayed?: (playCount: number) => void;
  size?: number;
};

/**
 * Круглая кнопка воспроизведения с кольцом прогресса.
 * Тайминги — из v2motion, чтобы движение совпадало с остальным турниром.
 */
export const TournamentAudioButton = memo(function TournamentAudioButton({
  audioUri, autoPlay = true, onPlayed, size = 96,
}: Props) {
  const P = useTournamentPalette();
  const player = useAudioPlayer(audioUri ? { uri: audioUri } : null);
  const status = useAudioPlayerStatus(player);
  const [playCount, setPlayCount] = useState(0);
  const autoPlayedRef = useRef(false);

  const pulse = useSharedValue(1);
  const progress = useSharedValue(0);

  // зачем: бесконечный пульс обязан замирать вне фокуса экрана И при сворачи-
  // вании приложения (Performance Bible: guarded loops) — иначе анимация
  // крутится в фоне и греет телефон. useRuntimeActive закрывает оба случая.
  const isFocused = useRuntimeActive();
  const isPlaying = status?.playing === true && isFocused;
  const durationMs = Math.max(1, Number(status?.duration ?? 0) * 1000);

  // Кольцо заполняется по реальной позиции трека, а не по таймеру: короткое
  // слово и длинная фраза звучат разное время.
  useEffect(() => {
    if (!isPlaying) {
      progress.value = withTiming(0, { duration: v2motion.fast });
      return;
    }
    progress.value = withTiming(1, {
      duration: durationMs,
      easing: Easing.linear,
    });
  }, [isPlaying, durationMs, progress]);

  // Пульс, пока звучит — видно, что идёт воспроизведение, без спиннера.
  useEffect(() => {
    if (!isPlaying || !isFocused) {
      // Уход с экрана глушит и звук: услышать задание из другого экрана нельзя.
      pulse.value = withTiming(1, { duration: v2motion.fast });
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 550, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 550, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => { pulse.value = 1; };
  }, [isPlaying, isFocused, pulse]);

  useEffect(() => {
    if (isFocused) return;
    try { player.pause(); } catch { /* плеер мог быть уже освобождён */ }
  }, [isFocused, player]);

  const play = useCallback(() => {
    if (!audioUri) return;
    // Хаптик: это управляющая кнопка (правило владельца).
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // Проигрывание может упасть на битой ссылке — задание тогда решается
      // по вариантам, экран не должен падать вместе со звуком.
    }
    setPlayCount((count) => {
      const next = count + 1;
      onPlayed?.(next);
      return next;
    });
  }, [audioUri, player, onPlayed]);

  // Первое проигрывание автоматом: игрок не должен тратить секунды таймера
  // на лишний тап, чтобы только начать слушать.
  useEffect(() => {
    if (!autoPlay || autoPlayedRef.current || !audioUri) return;
    autoPlayedRef.current = true;
    const timer = setTimeout(play, 320);
    return () => clearTimeout(timer);
  }, [autoPlay, audioUri, play]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={styles.wrap}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={playCount === 0 ? 'Прослушать' : 'Прослушать ещё раз'}
        onPress={play}
        disabled={!audioUri}
        style={[
          styles.button,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: P.elev },
          pulseStyle,
        ]}
      >
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={P.elev2} strokeWidth={stroke} fill="none"
          />
          <AnimatedCircle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={P.accent} strokeWidth={stroke} fill="none" strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={ringProps}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <Ionicons
          name={isPlaying ? 'volume-high' : 'play'}
          size={size * 0.32}
          color={P.accent}
        />
      </AnimatedPressable>
      <Text style={[styles.hint, { color: P.muted }]} allowFontScaling={false}>
        {playCount === 0 ? 'Прослушать' : `Ещё раз · ${playCount}`}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12 },
  button: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  hint: { fontSize: 14, fontWeight: '700' },
});
