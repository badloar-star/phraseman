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
  useReducedMotion,
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
import {
  claimSpokenAudio,
  type SpokenAudioClaim,
  whenSpokenAudioReady,
} from '../../modules/audio/audio_runtime_arbiter';
import { useTournamentPalette, v2motion } from '../ui/v2_theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PULSE_CYCLE_MS = 1100;
const BUTTON_INSET = 10;

type Props = {
  /** Ссылка на озвучку. Пусто — кнопка неактивна. */
  audioUri: string;
  /** Явно запрошенный legacy-автозапуск; в макетных режимах по умолчанию выключен. */
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
  audioUri, autoPlay = false, onPlayed, size = 108,
}: Props) {
  const P = useTournamentPalette();
  const player = useAudioPlayer(audioUri ? { uri: audioUri } : null);
  const status = useAudioPlayerStatus(player);
  const [playCount, setPlayCount] = useState(0);
  const autoPlayedRef = useRef(false);
  const spokenClaimRef = useRef<SpokenAudioClaim | null>(null);

  const pulse = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  const progress = useSharedValue(0);
  const iconProgress = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  // зачем: бесконечный пульс обязан замирать вне фокуса экрана И при сворачи-
  // вании приложения (Performance Bible: guarded loops) — иначе анимация
  // крутится в фоне и греет телефон. useRuntimeActive закрывает оба случая.
  const isFocused = useRuntimeActive();
  const isPlaying = status?.playing === true && isFocused;
  const duration = Math.max(0, Number(status?.duration ?? 0));
  const currentTime = Math.max(0, Number(status?.currentTime ?? 0));
  // The ring follows the player, not a guessed timer. This stays correct after
  // buffering, rate changes, interruptions, and a manual seek.
  const audioProgress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  // Кольцо заполняется по реальной позиции трека, а не по таймеру: короткое
  // слово и длинная фраза звучат разное время.
  useEffect(() => {
    progress.value = reducedMotion
      ? audioProgress
      : withTiming(audioProgress, { duration: v2motion.normal, easing: Easing.linear });
  }, [audioProgress, progress, reducedMotion]);

  useEffect(() => {
    spokenClaimRef.current?.release();
    spokenClaimRef.current = null;
    try { player.pause(); } catch { /* source was replaced */ }
    autoPlayedRef.current = false;
    setPlayCount(0);
    progress.value = 0;
  }, [audioUri, player, progress]);

  // Both glyphs remain mounted in the same centre point, so the play triangle
  // never shifts the visual centre when it crossfades to the sound icon.
  useEffect(() => {
    iconProgress.value = reducedMotion
      ? (isPlaying ? 1 : 0)
      : withTiming(isPlaying ? 1 : 0, { duration: v2motion.fast, easing: Easing.out(Easing.quad) });
  }, [iconProgress, isPlaying, reducedMotion]);

  // Пульс, пока звучит — видно, что идёт воспроизведение, без спиннера.
  useEffect(() => {
    if (!isPlaying || reducedMotion) {
      // Уход с экрана глушит и звук: услышать задание из другого экрана нельзя.
      pulse.value = withTiming(1, { duration: v2motion.fast });
      pulseOpacity.value = reducedMotion ? 0 : withTiming(0, { duration: v2motion.fast });
      return;
    }
    pulseOpacity.value = withTiming(0.16, { duration: v2motion.fast });
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: PULSE_CYCLE_MS / 2, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: PULSE_CYCLE_MS / 2, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => { pulse.value = 1; };
  }, [isPlaying, pulse, pulseOpacity, reducedMotion]);

  useEffect(() => {
    if (isFocused) return;
    try { player.pause(); } catch { /* плеер мог быть уже освобождён */ }
    spokenClaimRef.current?.release();
    spokenClaimRef.current = null;
  }, [isFocused, player]);

  useEffect(() => {
    if (!status?.didJustFinish) return;
    spokenClaimRef.current?.release();
    spokenClaimRef.current = null;
  }, [status?.didJustFinish]);

  useEffect(() => () => {
    spokenClaimRef.current?.release();
    spokenClaimRef.current = null;
  }, []);

  const play = useCallback(() => {
    if (!audioUri) return;
    // Хаптик: это управляющая кнопка (правило владельца).
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let claim: SpokenAudioClaim | null = null;
    claim = claimSpokenAudio(() => {
      try { player.pause(); } catch { /* released player */ }
      if (spokenClaimRef.current === claim) spokenClaimRef.current = null;
    });
    if (!claim) return;
    spokenClaimRef.current = claim;
    progress.value = 0;
    void whenSpokenAudioReady(claim).then(async (audioReady) => {
      if (!audioReady || !claim?.isCurrent()) {
        claim?.release();
        if (spokenClaimRef.current === claim) spokenClaimRef.current = null;
        return;
      }
      try {
        await player.seekTo(0);
        if (!claim.isCurrent()) return;
        player.play();
      } catch {
        claim.release();
        if (spokenClaimRef.current === claim) spokenClaimRef.current = null;
        // Проигрывание может упасть на битой ссылке — задание тогда решается
        // по вариантам, экран не должен падать вместе со звуком.
      }
    });
    setPlayCount((count) => {
      const next = count + 1;
      onPlayed?.(next);
      return next;
    });
  }, [audioUri, onPlayed, player, progress]);

  // Автозапуск оставлен только для явного legacy-вызова. Экранные макеты 03–05
  // начинают звук исключительно по тапу, поэтому default выше — false.
  useEffect(() => {
    if (!autoPlay || autoPlayedRef.current || !audioUri) return;
    autoPlayedRef.current = true;
    const timer = setTimeout(play, 320);
    return () => clearTimeout(timer);
  }, [autoPlay, audioUri, play]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulse.value }],
  }));
  const playIconStyle = useAnimatedStyle(() => ({ opacity: 1 - iconProgress.value }));
  const soundIconStyle = useAnimatedStyle(() => ({ opacity: iconProgress.value }));

  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={styles.wrap}>
      <View style={[styles.ringWrap, { width: size, height: size }]}>
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
        <Animated.View
          pointerEvents="none"
          style={[styles.pulseHalo, { borderRadius: size / 2, backgroundColor: P.accent }, pulseStyle]}
        />
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={playCount === 0 ? 'Прослушать' : 'Прослушать ещё раз'}
          onPress={play}
          disabled={!audioUri}
          style={[
            styles.button,
            { borderRadius: (size - BUTTON_INSET * 2) / 2, backgroundColor: P.elev },
            !audioUri && styles.disabled,
          ]}
        >
          <Animated.View pointerEvents="none" style={[styles.icon, styles.playIcon, playIconStyle]}>
            <Ionicons name="play" size={size * 0.32} color={P.accent} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.icon, soundIconStyle]}>
            <Ionicons name="volume-high" size={size * 0.32} color={P.accent} />
          </Animated.View>
        </AnimatedPressable>
      </View>
      <Text style={[styles.hint, { color: P.muted }]}>
        {playCount === 0 ? 'Прослушать' : `Ещё раз · ${playCount}`}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12 },
  ringWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  button: { position: 'absolute', inset: BUTTON_INSET, alignItems: 'center', justifyContent: 'center' },
  icon: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  playIcon: { marginLeft: 3 },
  pulseHalo: StyleSheet.absoluteFillObject,
  disabled: { opacity: 0.4 },
  hint: { fontSize: 14, fontWeight: '700' },
});
