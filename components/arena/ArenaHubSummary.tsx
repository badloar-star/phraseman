import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { ArenaHubModel } from '../../modules/arena/hub_view';
import { arenaText } from '../../modules/arena/copy';
import { useLang } from '../LangContext';
import { V2Card } from '../ui/v2_ui';
import { useTournamentPalette } from '../ui/v2_theme';
import { ArenaRankStars } from './ArenaRankStars';
import { arenaRankShieldAsset } from './arena_rank_shield_assets';

const TIER_COPY = [
  'tierBronze', 'tierSilver', 'tierGold', 'tierPlatinum',
  'tierDiamond', 'tierMaster', 'tierGrandmaster', 'tierLegend',
] as const;
const ROMAN = ['', 'I', 'II', 'III'] as const;

type ArenaHubSummaryProps = Readonly<{
  model: ArenaHubModel;
  active: boolean;
  reduceMotion: boolean;
}>;

export function ArenaHubSummary({ model, active, reduceMotion }: ArenaHubSummaryProps) {
  const P = useTournamentPalette();
  const { lang } = useLang();
  const rank = model.rank;
  const shieldY = useSharedValue(0);
  const starsY = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(shieldY);
    cancelAnimation(starsY);
    shieldY.value = 0;
    starsY.value = 0;

    if (!active || reduceMotion) return undefined;

    const easing = Easing.inOut(Easing.ease);
    shieldY.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 1900, easing }),
        withTiming(0, { duration: 1900, easing }),
      ),
      -1,
      false,
    );
    starsY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 2250, easing }),
        withTiming(0, { duration: 2250, easing }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(shieldY);
      cancelAnimation(starsY);
    };
  }, [active, reduceMotion, shieldY, starsY]);

  const shieldStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: shieldY.value }],
  }));
  const starsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: starsY.value }],
  }));

  const rankLabel = rank
    ? `${arenaText(lang, TIER_COPY[rank.tierIndex])} ${ROMAN[rank.division]}`
    : '—';
  const progressLabel = rank
    ? rank.top
      ? arenaText(lang, 'rankTop')
      : `${arenaText(lang, 'rankNext')}: ${rank.winsToNextRank} ★`
    : '—';
  const accessibilityLabel = rank
    ? `${rankLabel}. ${arenaText(lang, 'rankStars')}: ${rank.starsInRank}/${rank.starsPerRank}. ${progressLabel}`
    : rankLabel;

  return (
    <V2Card pad={16} style={styles.card}>
      <View
        testID="arena-rank-hero"
        style={styles.hero}
        accessible
        accessibilityLabel={accessibilityLabel}
      >
        <Text accessible={false} style={[styles.rank, { color: P.text }]}>{rankLabel}</Text>
        <Animated.View accessible={false} style={[styles.shieldStage, shieldStyle]}>
          {rank ? (
            <Image
              source={arenaRankShieldAsset(rank.tierKey, rank.division)}
              style={styles.shield}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Ionicons name="shield-outline" size={116} color={P.muted} />
          )}
        </Animated.View>
        <Animated.View accessible={false} style={[styles.starsStage, starsStyle]}>
          {rank ? <ArenaRankStars filled={rank.starsInRank} size={38} /> : null}
        </Animated.View>
        <Text accessible={false} style={[styles.progress, { color: P.muted }]}>{progressLabel}</Text>
      </View>
    </V2Card>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'visible' },
  hero: {
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  rank: {
    maxWidth: '100%',
    textAlign: 'center',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  shieldStage: {
    width: 148,
    height: 168,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shield: { width: 148, height: 168 },
  starsStage: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  progress: {
    maxWidth: '100%',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    marginTop: 2,
  },
});
