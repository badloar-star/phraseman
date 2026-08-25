import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { arenaText } from '../../modules/arena/copy';
import {
  arenaFinalScore,
  arenaFinalScoreBeatValues,
} from '../../modules/arena/final_score_count';
import { useCountUp } from '../league/leagueStatusShared';
import { useLang } from '../LangContext';
import { useTournamentPalette } from '../ui/v2_theme';
import { ArenaStarGlyph } from './ArenaStarGlyph';

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
      entering={FadeIn.duration(reduceMotion ? 120 : 220)}
      style={[styles.root, { backgroundColor: P.elev }]}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${arenaText(lang, 'matchScoreCounting')}: ${target}. ${arenaText(lang, 'matchResultChecking')}`}
    >
      <Text style={[styles.label, { color: P.muted }]}>
        {arenaText(lang, 'matchScoreCounting')}
      </Text>
      <Animated.View
        entering={reduceMotion ? FadeIn.duration(120) : ZoomIn.springify().damping(16)}
        style={styles.scoreRow}
      >
        <ArenaStarGlyph lit size={36} />
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
