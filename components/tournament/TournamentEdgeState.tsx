// ═══════════════════════════════════════════════════════════════════════════
// TournamentEdgeState.tsx — краевые состояния режима (макеты 45-48, 24).
//
// зачем: один компонент на все «плохие» ситуации — нет сети, загрузка,
// межсезонье, отмена турнира, «вы уже в лобби». Иначе шесть экранов начнут
// расходиться по формулировкам и отступам, а пользователь в самый неприятный
// момент увидит разнобой.
//
// Скелетон здесь НЕ спиннер на весь экран: он повторяет геометрию будущего
// контента, чтобы первый кадр совпал с финальным (Performance Bible).
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Cta } from './tournament_ui';
import { T, radius, type, useTournamentPalette, type TournamentPalette} from './tournament_theme';
import { TournamentBackdrop } from './TournamentBackdrop';

export type EdgeKind = 'offline' | 'preseason' | 'cancelled' | 'alreadyIn' | 'emptyPool';

type Props = {
  kind: EdgeKind;
  /** Подробность, которая меняется в рантайме (сколько вернули, когда старт). */
  detail?: string;
  onRetry?: () => void;
  onSecondary?: () => void;
};

const COPY: Record<EdgeKind, { icon: string; title: string; body: string; action?: string; secondary?: string }> = {
  offline: {
    icon: '📡',
    title: 'Нет соединения',
    body: 'Проверь интернет — турнир начнётся без тебя',
    action: 'Повторить',
  },
  preseason: {
    icon: '🌱',
    title: 'Скоро первый турнир',
    body: 'Режим готовится к запуску. Загляни позже — стартуем совсем скоро',
  },
  cancelled: {
    icon: '🫱',
    title: 'Турнир отменён',
    // зачем: 💎 — запрещённая эмодзи-валюта (правило владельца). Текстом
    // «монеты», как в tournament_results.tsx / tournament_tickets.tsx.
    body: 'Не набралось игроков. Билет вернулся, плюс 3 жемчужины за ожидание',
    action: 'На главную',
  },
  alreadyIn: {
    icon: '✅',
    title: 'Вы уже в лобби',
    body: 'Возвращаемся к текущему турниру',
    action: 'В лобби',
  },
  emptyPool: {
    icon: '🧩',
    title: 'Турнир пока недоступен',
    body: 'Готовим задания. Загляни позже',
  },
};

export const TournamentEdgeState = memo(function TournamentEdgeState({
  kind, detail, onRetry, onSecondary,
}: Props) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const copy = COPY[kind];

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.root}>
      <TournamentBackdrop variant="edge" />
      <Text style={styles.icon}>{copy.icon}</Text>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>

      {copy.action && onRetry ? (
        <View style={styles.action}>
          <Cta onPress={onRetry}>{copy.action}</Cta>
        </View>
      ) : null}

      {copy.secondary && onSecondary ? (
        <View style={styles.secondary}>
          <Cta ghost onPress={onSecondary}>{copy.secondary}</Cta>
        </View>
      ) : null}

      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </Animated.View>
  );
});

// ── Скелетон ────────────────────────────────────────────────────────────────

/**
 * Скелетон главной: повторяет геометрию hero-карточки, банка и сезона.
 * Так экран не «схлопывается» в спиннер и не прыгает при появлении данных.
 */
export const TournamentSkeleton = memo(function TournamentSkeleton() {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  return (
    <View style={styles.skeleton}>
      <View style={[styles.skeletonBlock, { height: 300 }]} />
      <View style={[styles.skeletonBlock, { height: 104 }]} />
      <View style={[styles.skeletonBlock, { height: 74 }]} />
    </View>
  );
});

const makeStyles = (P: TournamentPalette) => StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: { fontSize: 56, marginBottom: 20 },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: P.text,
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  body: {
    ...type.body,
    color: P.muted,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  action: { alignSelf: 'stretch', marginTop: 28 },
  secondary: { alignSelf: 'stretch', marginTop: 10 },
  detail: { ...type.label, fontWeight: '600', color: P.ghost, marginTop: 18 },

  skeleton: { paddingHorizontal: 16, gap: 14 },
  skeletonBlock: {
    borderRadius: radius.lg,
    backgroundColor: P.card,
    opacity: 0.5,
  },
});
