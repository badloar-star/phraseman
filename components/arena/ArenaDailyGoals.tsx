import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { useLang } from '../LangContext';
import { V2Card } from '../tournament/tournament_v2_ui';
import { useTournamentPalette } from '../tournament/tournament_theme';
import { arenaText } from '../../modules/arena/copy';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useArenaSound } from '../../hooks/use_arena_sound';
import {
  ARENA_GOAL_ORDER,
  ARENA_GOAL_TARGETS,
  type ArenaDailyGoals as ArenaDailyGoalsModel,
  type ArenaGoalKey,
} from '../../modules/arena/daily_goals';

/**
 * Три цели дня.
 *
 * Владелец (D-31): главный экран должен быть живым и информативным, а не
 * списком ссылок. Цели — это то, ради чего игрок открывает Арену сегодня, а не
 * вообще.
 *
 * Считает всё `modules/arena/daily_goals.ts`; здесь только отрисовка.
 */

const GOAL_COPY: Readonly<Record<ArenaGoalKey, 'goalPlay' | 'goalSpeed' | 'goalAccuracy'>> = {
  play: 'goalPlay',
  speed: 'goalSpeed',
  accuracy: 'goalAccuracy',
};

const GOAL_ICON: Readonly<Record<ArenaGoalKey, React.ComponentProps<typeof Ionicons>['name']>> = {
  play: 'flash',
  speed: 'timer',
  accuracy: 'trophy',
};

function GoalBar({ progress, complete, reduceMotion }: {
  progress: number;
  complete: boolean;
  reduceMotion: boolean;
}) {
  const P = useTournamentPalette();
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = reduceMotion
      ? progress
      : withDelay(140, withSpring(progress, { damping: 18, stiffness: 130 }));
  }, [progress, reduceMotion, width]);
  const style = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, width.value)) * 100}%`,
  }));
  return (
    <View style={[styles.track, { backgroundColor: P.elev2 }]}>
      <Animated.View style={[styles.fill, { backgroundColor: complete ? P.accent : P.gold }, style]} />
    </View>
  );
}

export function ArenaDailyGoals({ model }: { model: ArenaDailyGoalsModel | null }) {
  const { lang } = useLang();
  const P = useTournamentPalette();
  const reduceMotion = useReduceMotion();
  const playSound = useArenaSound();

  /**
   * Звук на ЗАКРЫТИЕ цели, а не на её наличие.
   *
   * Первый показ экрана с уже выполненными целями звучать не должен: игрок
   * закрыл их раньше и услышал бы поздравление ни за что. Поэтому первый кадр
   * только запоминает число, а звучат только переходы вверх.
   */
  const seenRef = useRef<number | null>(null);
  useEffect(() => {
    if (model === null) {
      seenRef.current = null;
      return;
    }
    const done = model.completedCount;
    if (seenRef.current === null) { seenRef.current = done; return; }
    if (done > seenRef.current) playSound('goalComplete');
    seenRef.current = done;
  }, [model, playSound]);

  const goals = model?.goals ?? ARENA_GOAL_ORDER.map((key) => ({
    key,
    done: 0,
    target: ARENA_GOAL_TARGETS[key],
    progress: 0,
    complete: false,
  }));
  const allComplete = model?.allComplete ?? false;

  return (
    <Animated.View entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.duration(280)}>
      <V2Card pad={16} style={styles.card}>
        <View style={styles.head}>
          <Text numberOfLines={1} style={[styles.title, { color: P.text }]}>{arenaText(lang, 'goalsTitle')}</Text>
          <Text
            numberOfLines={1}
            accessibilityLabel={model === null ? arenaText(lang, 'valueUnknown') : undefined}
            style={[styles.counter, { color: allComplete ? P.accent : P.muted }]}
          >
            {model === null ? '—' : model.completedCount} / {goals.length}
          </Text>
        </View>

        {goals.map((goal, index) => (
          <Animated.View
            key={goal.key}
            entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.delay(index * 60).duration(240)}
            style={styles.goal}
          >
            <View style={styles.goalHead}>
              <Ionicons
                name={goal.complete ? 'checkmark-circle' : GOAL_ICON[goal.key]}
                size={18}
                color={goal.complete ? P.accent : P.muted}
              />
              <Text style={[styles.goalName, { color: goal.complete ? P.accent : P.text }]}>
                {arenaText(lang, GOAL_COPY[goal.key])}
              </Text>
              <Text style={[styles.goalCount, { color: P.muted }]}>
                {model === null ? '—' : goal.done}/{goal.target}
              </Text>
            </View>
            <GoalBar progress={goal.progress} complete={goal.complete} reduceMotion={reduceMotion} />
          </Animated.View>
        ))}

        {allComplete ? (
          <Text accessibilityLiveRegion="polite" style={[styles.done, { color: P.accent }]}>
            {arenaText(lang, 'goalsAllDone')}
          </Text>
        ) : null}
      </V2Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  // Заголовок уступает счётчику: «2 / 3» — это ответ на вопрос, ради которого
  // на карточку и смотрят, а заголовок и так понятен по содержимому.
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { fontSize: 18, fontWeight: '900', flexShrink: 1 },
  counter: { fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'], flexShrink: 0 },
  goal: { gap: 6 },
  goalHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalName: { flex: 1, fontSize: 14, fontWeight: '800' },
  goalCount: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  done: { fontSize: 14, fontWeight: '900', textAlign: 'center' },
});
