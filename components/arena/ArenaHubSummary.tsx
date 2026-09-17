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
  const rankKnown = rank !== null;
  const shieldY = useSharedValue(0);
  const starsY = useSharedValue(0);
  const progressOpacity = useSharedValue(0);
  const progressScale = useSharedValue(1);

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

  useEffect(() => {
    cancelAnimation(progressOpacity);
    cancelAnimation(progressScale);
    /**
     * зачем (жалоба Виталия 2026-09-16, 20:26: «звёзды не отображаются и
     * рейтинг не изменяется»): раньше эта строка гасла НАСОВСЕМ —
     * `withDelay(2600, withTiming(0))` уводил opacity в 0 через три секунды
     * после открытия хаба, и «До следующего ранга: N ★» физически исчезало с
     * экрана. Человек, отыгравший быстрые матчи, видел пустое место под
     * звёздами и делал единственный возможный вывод: прогресса нет вообще.
     *
     * Теперь единственный ответ на вопрос «куда я иду» виден ВСЕГДА: строка
     * стартует видимой (1, а не 0 — иначе при неизвестном ранге или на
     * неактивном экране текста снова нет) и остаётся видимой. Пульсация
     * ниже — только акцент внимания, она больше не управляет видимостью.
     */
    progressOpacity.value = 1;
    progressScale.value = 1;

    if (!active || !rankKnown) return undefined;

    if (!reduceMotion) {
      const easing = Easing.inOut(Easing.ease);
      progressScale.value = withSequence(
        withTiming(1.045, { duration: 1800, easing }),
        withTiming(1, { duration: 1800, easing }),
      );
    }

    return () => {
      cancelAnimation(progressOpacity);
      cancelAnimation(progressScale);
    };
  }, [active, progressOpacity, progressScale, rankKnown, reduceMotion]);

  const shieldStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: shieldY.value }],
  }));
  const starsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: starsY.value }],
  }));
  const progressStyle = useAnimatedStyle(() => ({
    opacity: progressOpacity.value,
    transform: [{ scale: progressScale.value }],
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
          <Ionicons name="shield-outline" size={150} color={P.muted} />
        )}
      </Animated.View>
      <Animated.View accessible={false} style={[styles.starsStage, starsStyle]}>
        <ArenaRankStars filled={rank?.starsInRank ?? 0} size={38} />
      </Animated.View>
      <Animated.View accessible={false} style={[styles.progressStage, progressStyle]}>
        <Text style={[styles.progress, { color: P.muted }]}>{progressLabel}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 342,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    overflow: 'visible',
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
    width: 210,
    height: 224,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shield: { width: 210, height: 224 },
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
  },
  progressStage: { width: '100%', alignItems: 'center', marginTop: 2 },
});
