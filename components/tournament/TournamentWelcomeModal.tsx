// ═══════════════════════════════════════════════════════════════════════════
// TournamentWelcomeModal.tsx — приветственный модал раздела «Турниры».
//
// зачем 2026-08-04 (владелец: «первый раз открыл раздел турниры — красивый
// анимированный модал с объяснением, что это и что за это дают, один раз
// после онбординга и больше никогда, у старых игроков тоже»): показывается
// РОВНО один раз на устройство (флаг в tournament_welcome_seen.ts), поверх
// уже открытого хаба турниров — второй Modal поверх первого, без навигации.
//
// Анимация входа собственная (spring scale + пара звёзд по дуге), а не через
// общий TournamentFxHost — тот висит постоянным absolute-слоем поверх экрана
// и заводить его ради одного одноразового показа не имеет смысла.
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { FlowText } from '../text-integrity';
import { StarGlyph } from './TournamentFx';
import { V2Cta } from './tournament_v2_ui';
import { METAL, radius, useTournamentPalette } from './tournament_theme';
import { noAndroidOutline } from '../../constants/androidGlow';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/** Одна декоративная звезда, влетающая по дуге с задержкой и лёгким дрожанием. */
const DriftStar = memo(function DriftStar({
  delay, dx, size, color, reduceMotion,
}: { delay: number; dx: number; size: number; color: string; reduceMotion: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) { progress.value = 1; return; }
    progress.value = withDelay(delay, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [progress, delay, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    // зачем 2026-08-04 (аудит): progress идёт 0→1 через withTiming и никогда не
    // превышает 1 — ветка «затухания» ниже была мёртвой (1 - (p - 1) при p<=1
    // всегда >= 1, то есть просто клампилась бы визуально в непрозрачность).
    // Звёзды остаются полностью видимыми после влёта — это и есть задуманное
    // поведение (декор рядом со значком, не разовая вспышка).
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * 26 },
      { translateX: dx * (1 - progress.value) },
      { scale: 0.6 + progress.value * 0.4 },
      { rotate: `${(1 - progress.value) * -40}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.driftStar, style]} pointerEvents="none">
      <StarGlyph size={size} color={color} />
    </Animated.View>
  );
});

/**
 * Приветственный модал раздела «Турниры».
 *
 * зачем: заголовок и подача текста утверждены владельцем в живом обсуждении —
 * не парафраз механики, а живой рассказ, сверенный с фактами (16 игроков в
 * комнате, 4 раунда, банк недели делят призовые места, пропуск сезона растёт
 * от участия). Цифры не хардкодить заново без сверки с tournament_client.ts /
 * season_pass_model.ts, если владелец попросит поменять текст.
 */
export const TournamentWelcomeModal = memo(function TournamentWelcomeModal({ visible, onClose }: Props) {
  const P = useTournamentPalette();
  const reduceMotion = useReducedMotion();
  const cardScale = useSharedValue(reduceMotion ? 1 : 0.86);
  const cardOpacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (!visible) return;
    if (reduceMotion) {
      cardScale.value = 1;
      cardOpacity.value = 1;
      return;
    }
    cardOpacity.value = withTiming(1, { duration: 220 });
    cardScale.value = withSequence(
      withTiming(1.03, { duration: 260, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 14, stiffness: 220 }),
    );
  }, [visible, reduceMotion, cardScale, cardOpacity]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Закрыть" />
        <Animated.View style={[styles.card, cardStyle]}>
          <LinearGradient
            colors={[P.surfaceGradA, P.surfaceGradB]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.topHi, { backgroundColor: P.chipHi }]} pointerEvents="none" />

          <View style={styles.badgeRow}>
            <LinearGradient colors={METAL.gold} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={styles.badge}>
              <StarGlyph size={26} color={METAL.ink} />
            </LinearGradient>
            <DriftStar delay={80} dx={-34} size={14} color={P.gold} reduceMotion={reduceMotion} />
            <DriftStar delay={180} dx={30} size={11} color={P.accent} reduceMotion={reduceMotion} />
          </View>

          <FlowText
            testID="tournament-welcome-title"
            provenance="authored"
            style={[styles.title, { color: P.text }]}
          >
            Турниры
          </FlowText>

          {/* зачем 2026-08-04 (аудит): был обычный Text — text-integrity гвард
              покрывал только короткий заголовок и пропускал самый длинный и
              самый уязвимый к обрезке текст в модале. FlowText переносит
              вместо обрезки на крупных системных шрифтах. */}
          <FlowText
            testID="tournament-welcome-body"
            provenance="authored"
            style={[styles.body, { color: P.muted }]}
          >
            Добро пожаловать туда, где не только вы стараетесь. 16 игроков, 4 раунда, и никто не будет ждать, пока вы вспомните нужное слово — соперники отвечают прямо сейчас. Звучит жёстко, но на деле это самый живой способ проверить себя.
            {'\n\n'}
            Призовое место в соревновании приносит жемчужины. А само участие — очки в пропуск сезона, отдельную дорожку с 60 подарками, которая копится тихонько, пока вы просто соревнуетесь время от времени.
          </FlowText>

          <View style={styles.actions}>
            <V2Cta tone="gold" onPress={onClose}>Понятно, погнали</V2Cta>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3,6,4,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.lg + 4,
    overflow: 'hidden',
    padding: 24,
    alignItems: 'center',
    // guard-ok: модал рендерится максимум один раз за жизнь установки
    // (флаг tournament_welcome_seen_v1) — тень не в горячем цикле, но радиус
    // всё равно снижен вдвое против типовых 26px карточек: тень статична, не
    // выигрывает от лишних пикселей размытия, а на Android дешевле считается.
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    ...noAndroidOutline,
  },
  topHi: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  badgeRow: {
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driftStar: {
    position: 'absolute',
  },
  title: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.2,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 14.5,
    fontWeight: '600',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 22,
  },
  actions: {
    alignSelf: 'stretch',
  },
});
