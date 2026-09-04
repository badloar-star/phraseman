import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { arenaText } from '../../modules/arena/copy';
import {
  arenaFinalScore,
  arenaFinalScoreBeatValues,
} from '../../modules/arena/final_score_count';
import { useCountUp } from '../league/leagueStatusShared';
import { useLang } from '../LangContext';
import { useTournamentPalette } from '../ui/v2_theme';

/**
 * зачем (D-85, владелец 2026-09-03 «очки заменить на руны и ассет»): здесь
 * считаются РУНЫ матча, поэтому рядом с числом стоит образ руны из общего
 * валютного UI — тот же ассет, что в счётчике тренировок (PracticeRuneCounter).
 * Звезда ранга отсюда убрана: она обозначает совсем другую сущность (деления
 * тира) и путала две валюты на одном экране.
 */
const RUNE_ASSET = require('../../assets/images/level-spin-rewards/stars_10.webp');

export function ArenaFinalScoreCount({
  score,
  reduceMotion,
  onBeat,
}: Readonly<{
  score: number;
  reduceMotion: boolean;
  onBeat(): void;
}>) {
  const P = useTournamentPalette();
  const { lang } = useLang();
  const target = arenaFinalScore(score);
  const shown = useCountUp(target, reduceMotion);
  const beats = useMemo(() => arenaFinalScoreBeatValues(target), [target]);
  const beatIndexRef = useRef(0);

  useEffect(() => {
    // Reduced Motion reaches the final number in one render. One landing keeps
    // feedback intact without firing the whole six-beat cadence at once.
    if (reduceMotion) {
      if (target > 0 && beatIndexRef.current === 0) {
        beatIndexRef.current = beats.length;
        onBeat();
      }
      return;
    }
    while (beatIndexRef.current < beats.length
      && shown >= (beats[beatIndexRef.current] ?? Number.POSITIVE_INFINITY)) {
      beatIndexRef.current += 1;
      onBeat();
    }
  }, [beats, onBeat, reduceMotion, shown, target]);

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(220)}
      style={[styles.root, { backgroundColor: P.elev }]}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${arenaText(lang, 'matchScoreCounting')}: ${target}. ${arenaText(lang, 'matchResultChecking')}`}
    >
      <Text style={[styles.label, { color: P.muted }]}>
        {arenaText(lang, 'matchScoreCounting')}
      </Text>
      <Animated.View
        entering={reduceMotion ? undefined : ZoomIn.springify().damping(16)}
        style={styles.scoreRow}
      >
        {/* Ассет декоративен: число и статус уже озвучены живой строкой выше. */}
        <Image
          source={RUNE_ASSET}
          style={styles.rune}
          contentFit="contain"
          accessible={false} /* guard-ok: декоративный ассет, смысл несёт число и живая строка родителя */
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text accessibilityElementsHidden style={[styles.score, { color: P.text }]}>
          {shown}
        </Text>
      </Animated.View>
      <Text accessibilityElementsHidden style={[styles.status, { color: P.accent }]}>
        {arenaText(lang, 'matchResultChecking')}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 300,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  scoreRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  rune: { width: 40, height: 40 },
  score: {
    minWidth: 72,
    fontSize: 68,
    lineHeight: 74,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  status: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
});
