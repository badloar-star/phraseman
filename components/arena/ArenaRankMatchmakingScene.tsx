import React, { memo, useEffect, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  arenaEligibleRankIndices,
  arenaViewerRankIndex,
} from '../../modules/arena/rank_matchmaking_visual';
import { arenaRankShieldAssetForRankIndex } from './arena_rank_shield_assets';

const REEL_ITEM_SIZE = 96;

type ArenaRankMatchmakingSceneProps = {
  viewerStars: number | null;
  active: boolean;
  reduceMotion: boolean;
};

function ArenaRankMatchmakingSceneComponent({
  viewerStars,
  active,
  reduceMotion,
}: ArenaRankMatchmakingSceneProps) {
  const viewerRankIndex = arenaViewerRankIndex(viewerStars);
  const eligibleRankIndices = useMemo(() => arenaEligibleRankIndices(viewerStars), [viewerStars]);
  const reelRankIndices = useMemo(
    () => eligibleRankIndices.length > 0 ? [...eligibleRankIndices, ...eligibleRankIndices] : [],
    [eligibleRankIndices],
  );
  const viewerAsset = viewerRankIndex === null
    ? null
    : arenaRankShieldAssetForRankIndex(viewerRankIndex);

  const entrance = useSharedValue(1);
  const float = useSharedValue(0);
  const reelOffset = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(entrance);
    cancelAnimation(float);
    cancelAnimation(reelOffset);
    entrance.value = 1;
    float.value = 0;
    reelOffset.value = 0;

    if (!active || reduceMotion) return undefined;

    entrance.value = 0;
    entrance.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
    float.value = withDelay(420, withRepeat(
      withSequence(
        withTiming(1, { duration: 1_800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1_800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    ));
    if (eligibleRankIndices.length > 0) {
      reelOffset.value = withRepeat(
        withTiming(-REEL_ITEM_SIZE * eligibleRankIndices.length, {
          duration: 1_650,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
    }

    return () => {
      cancelAnimation(entrance);
      cancelAnimation(float);
      cancelAnimation(reelOffset);
    };
  }, [active, eligibleRankIndices.length, entrance, float, reduceMotion, reelOffset]);

  const viewerStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [
      { translateX: -22 * (1 - entrance.value) },
      { translateY: -6 * float.value },
      { scale: 0.94 + 0.06 * entrance.value },
    ],
  }));
  const reelStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [
      { translateX: 22 * (1 - entrance.value) },
      { translateY: reelOffset.value },
    ],
  }));

  return (
    <View
      pointerEvents="none"
      accessible={false}
      testID="arena-rank-matchmaking-scene"
      style={styles.scene}
    >
      <Animated.View style={[styles.side, viewerStyle]}>
        {viewerAsset ? (
          <Image source={viewerAsset} resizeMode="contain" style={styles.viewerShield} />
        ) : (
          <View testID="arena-rank-viewer-neutral" style={styles.neutralShield} />
        )}
      </Animated.View>

      <View style={styles.reelViewport}>
        {reelRankIndices.length > 0 ? (
          <Animated.View style={[styles.reelTrack, reelStyle]}>
            {reelRankIndices.map((rankIndex, index) => {
              const source = arenaRankShieldAssetForRankIndex(rankIndex);
              return source ? (
                <View key={`${rankIndex}:${index}`} style={styles.reelItem}>
                  <Image source={source} resizeMode="contain" style={styles.reelShield} />
                </View>
              ) : null;
            })}
          </Animated.View>
        ) : (
          <View testID="arena-rank-reel-neutral" style={styles.neutralShield} />
        )}
      </View>
    </View>
  );
}

export const ArenaRankMatchmakingScene = memo(ArenaRankMatchmakingSceneComponent);

const styles = StyleSheet.create({
  scene: {
    width: '100%',
    height: 150,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
  },
  side: {
    width: 120,
    height: 136,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerShield: { width: 132, height: 132 },
  reelViewport: {
    width: 116,
    height: REEL_ITEM_SIZE,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  reelTrack: { alignItems: 'center' },
  reelItem: {
    width: REEL_ITEM_SIZE,
    height: REEL_ITEM_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reelShield: { width: 92, height: 92 },
  neutralShield: {
    width: 76,
    height: 88,
    borderWidth: 2,
    borderColor: 'rgba(126, 140, 132, 0.28)',
    backgroundColor: 'rgba(126, 140, 132, 0.06)',
    borderRadius: 24,
  },
});
