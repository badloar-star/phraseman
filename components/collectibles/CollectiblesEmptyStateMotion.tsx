import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { MOTION_DURATION, MOTION_EASING, MOTION_SPRING } from '../../constants/motion';
import type { Theme, ThemeMode } from '../../constants/theme';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { getVolumetricShadow, type Fonts } from '../ThemeContext';

type Props = {
  theme: Theme;
  themeMode: ThemeMode;
  fonts: Fonts;
  title: string;
  subtitle: string;
};

const ENTRANCE_TIMING = {
  duration: MOTION_DURATION.slow,
  easing: Easing.bezier(...MOTION_EASING.easeOutQuint),
} as const;

const COPY_TIMING = {
  duration: MOTION_DURATION.normal,
  easing: Easing.bezier(...MOTION_EASING.easeOutQuint),
} as const;

const DRIFT_TIMING = {
  duration: 2400,
  easing: Easing.inOut(Easing.sin),
} as const;

export default function CollectiblesEmptyStateMotion({
  theme,
  themeMode,
  fonts,
  title,
  subtitle,
}: Props) {
  const reduceMotion = useReduceMotion();
  const runtimeActive = useRuntimeActive();
  const initialProgress = reduceMotion || !runtimeActive ? 1 : 0;
  const hasEntered = useRef(false);

  const rearEntrance = useSharedValue(initialProgress);
  const middleEntrance = useSharedValue(initialProgress);
  const frontEntrance = useSharedValue(initialProgress);
  const iconEntrance = useSharedValue(initialProgress);
  const titleEntrance = useSharedValue(initialProgress);
  const subtitleEntrance = useSharedValue(initialProgress);
  const rearDrift = useSharedValue(0);
  const middleDrift = useSharedValue(0);

  useEffect(() => {
    const values = [
      rearEntrance,
      middleEntrance,
      frontEntrance,
      iconEntrance,
      titleEntrance,
      subtitleEntrance,
      rearDrift,
      middleDrift,
    ];
    const stopAnimations = () => {
      values.forEach((value) => cancelAnimation(value));
    };
    const showFinalFrame = () => {
      rearEntrance.value = 1;
      middleEntrance.value = 1;
      frontEntrance.value = 1;
      iconEntrance.value = 1;
      titleEntrance.value = 1;
      subtitleEntrance.value = 1;
      rearDrift.value = 0;
      middleDrift.value = 0;
    };

    stopAnimations();

    if (reduceMotion || !runtimeActive) {
      showFinalFrame();
      if (reduceMotion) hasEntered.current = true;
      return stopAnimations;
    }

    if (!hasEntered.current) {
      hasEntered.current = true;
      rearEntrance.value = 0;
      middleEntrance.value = 0;
      frontEntrance.value = 0;
      iconEntrance.value = 0;
      titleEntrance.value = 0;
      subtitleEntrance.value = 0;

      rearEntrance.value = withDelay(40, withSpring(1, MOTION_SPRING.ui));
      middleEntrance.value = withDelay(100, withSpring(1, MOTION_SPRING.ui));
      frontEntrance.value = withDelay(160, withSpring(1, MOTION_SPRING.ui));
      iconEntrance.value = withDelay(240, withTiming(1, ENTRANCE_TIMING));
      titleEntrance.value = withDelay(320, withTiming(1, COPY_TIMING));
      subtitleEntrance.value = withDelay(400, withTiming(1, COPY_TIMING));
    }

    rearDrift.value = withDelay(
      720,
      withRepeat(withTiming(1, DRIFT_TIMING), -1, true),
    );
    middleDrift.value = withDelay(
      1320,
      withRepeat(withTiming(1, DRIFT_TIMING), -1, true),
    );

    return stopAnimations;
  }, [
    frontEntrance,
    iconEntrance,
    middleDrift,
    middleEntrance,
    rearDrift,
    rearEntrance,
    reduceMotion,
    runtimeActive,
    subtitleEntrance,
    titleEntrance,
  ]);

  const rearStyle = useAnimatedStyle(() => {
    const entrance = rearEntrance.value;
    const drift = rearDrift.value;
    const rotation =
      interpolate(entrance, [0, 1], [-12, -7.5], Extrapolation.CLAMP) +
      interpolate(drift, [0, 1], [0, -0.6], Extrapolation.CLAMP);

    return {
      opacity: interpolate(entrance, [0, 1], [0, 0.24], Extrapolation.CLAMP),
      transform: [
        {
          translateY:
            interpolate(entrance, [0, 1], [30, 0], Extrapolation.CLAMP) +
            interpolate(drift, [0, 1], [0, -2], Extrapolation.CLAMP),
        },
        { rotate: `${rotation}deg` },
        { scale: interpolate(entrance, [0, 1], [0.94, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  const middleStyle = useAnimatedStyle(() => {
    const entrance = middleEntrance.value;
    const drift = middleDrift.value;
    const rotation =
      interpolate(entrance, [0, 1], [11, 6.5], Extrapolation.CLAMP) +
      interpolate(drift, [0, 1], [0, 0.6], Extrapolation.CLAMP);

    return {
      opacity: interpolate(entrance, [0, 1], [0, 0.34], Extrapolation.CLAMP),
      transform: [
        {
          translateY:
            interpolate(entrance, [0, 1], [26, 0], Extrapolation.CLAMP) +
            interpolate(drift, [0, 1], [0, -2], Extrapolation.CLAMP),
        },
        { rotate: `${rotation}deg` },
        { scale: interpolate(entrance, [0, 1], [0.94, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  const frontStyle = useAnimatedStyle(() => ({
    opacity: interpolate(frontEntrance.value, [0, 1], [0, 0.82], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(frontEntrance.value, [0, 1], [22, 0], Extrapolation.CLAMP),
      },
      { scale: interpolate(frontEntrance.value, [0, 1], [0.94, 1], Extrapolation.CLAMP) },
    ],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(iconEntrance.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(iconEntrance.value, [0, 1], [8, 0], Extrapolation.CLAMP),
      },
      { scale: interpolate(iconEntrance.value, [0, 1], [0.92, 1], Extrapolation.CLAMP) },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(titleEntrance.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(titleEntrance.value, [0, 1], [8, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(subtitleEntrance.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(subtitleEntrance.value, [0, 1], [8, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  const shadow = getVolumetricShadow(themeMode, theme, 1);

  return (
    <View testID="collectibles-empty-state-motion" pointerEvents="none" style={styles.root}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.visual}
      >
        <Animated.View
          style={[
            styles.cardSilhouette,
            styles.rearCard,
            { backgroundColor: theme.bgSurface2, borderColor: theme.borderLight },
            shadow,
            rearStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.cardSilhouette,
            styles.middleCard,
            { backgroundColor: theme.bgSurface, borderColor: theme.border },
            shadow,
            middleStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.cardSilhouette,
            styles.frontCard,
            { backgroundColor: theme.bgCard, borderColor: theme.border },
            shadow,
            frontStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.iconSurface,
            { backgroundColor: theme.bgSurface, borderColor: theme.border },
            shadow,
            iconStyle,
          ]}
        >
          <Ionicons name="sparkles-outline" size={38} color={theme.textMuted} />
        </Animated.View>
      </View>

      <Animated.View style={titleStyle}>
        <Text
          style={[
            styles.title,
            { color: theme.textSecond, fontSize: fonts.body },
          ]}
        >
          {title}
        </Text>
      </Animated.View>
      <Animated.View style={subtitleStyle}>
        <Text
          style={[
            styles.subtitle,
            { color: theme.textMuted, fontSize: fonts.sub },
          ]}
        >
          {subtitle}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  visual: {
    width: 210,
    height: 142,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSilhouette: {
    position: 'absolute',
    width: 162,
    height: 104,
    borderRadius: 22,
    borderWidth: 1,
  },
  rearCard: {
    zIndex: 1,
  },
  middleCard: {
    zIndex: 2,
  },
  frontCard: {
    zIndex: 3,
  },
  iconSurface: {
    position: 'absolute',
    zIndex: 4,
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    borderWidth: 1,
  },
  title: {
    maxWidth: 300,
    marginTop: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    maxWidth: 300,
    marginTop: 6,
    textAlign: 'center',
  },
});
