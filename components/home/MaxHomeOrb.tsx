import React, { memo, useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { MaxHomeOrbLayers } from '../../app/max_home_orb_assets';
import { MAX_HOME_ORB_HYBRID } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useRuntimeActive } from '../../hooks/use_runtime_active';

type Props = {
  layers: MaxHomeOrbLayers;
  size: number;
  ownerVisible?: boolean;
  style?: ViewStyle;
};

function MaxHomeOrb({ layers, size, ownerVisible = true, style }: Props) {
  const reduceMotion = useReduceMotion();
  const runtimeActive = useRuntimeActive(ownerVisible);
  const shellPhase = useSharedValue<number>(MAX_HOME_ORB_HYBRID.staticShellPhase);
  const fieldPhase = useSharedValue<number>(MAX_HOME_ORB_HYBRID.staticFieldPhase);
  const glintsPhase = useSharedValue<number>(MAX_HOME_ORB_HYBRID.staticGlintsPhase);

  useEffect(() => {
    cancelAnimation(shellPhase);
    cancelAnimation(fieldPhase);
    cancelAnimation(glintsPhase);

    if (!runtimeActive || reduceMotion) {
      shellPhase.value = MAX_HOME_ORB_HYBRID.staticShellPhase;
      fieldPhase.value = MAX_HOME_ORB_HYBRID.staticFieldPhase;
      glintsPhase.value = MAX_HOME_ORB_HYBRID.staticGlintsPhase;
      return () => {
        cancelAnimation(shellPhase);
        cancelAnimation(fieldPhase);
        cancelAnimation(glintsPhase);
      };
    }

    shellPhase.value = 0;
    fieldPhase.value = 0;
    glintsPhase.value = 0;
    shellPhase.value = withRepeat(
      withTiming(1, {
        duration: MAX_HOME_ORB_HYBRID.shellBreathMs,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
    fieldPhase.value = withRepeat(
      withTiming(1, {
        duration: MAX_HOME_ORB_HYBRID.fieldTurnMs,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    glintsPhase.value = withRepeat(
      withTiming(1, {
        duration: MAX_HOME_ORB_HYBRID.glintsDriftMs,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );

    return () => {
      cancelAnimation(shellPhase);
      cancelAnimation(fieldPhase);
      cancelAnimation(glintsPhase);
    };
  }, [fieldPhase, glintsPhase, reduceMotion, runtimeActive, shellPhase]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      shellPhase.value,
      [0, 1],
      [MAX_HOME_ORB_HYBRID.shellOpacityMin, MAX_HOME_ORB_HYBRID.shellOpacityMax],
    ),
    transform: [{
      scale: interpolate(
        shellPhase.value,
        [0, 1],
        [MAX_HOME_ORB_HYBRID.shellScaleMin, MAX_HOME_ORB_HYBRID.shellScaleMax],
      ),
    }],
  }));

  const fieldStyle = useAnimatedStyle(() => ({
    transform: [{
      rotate: `${interpolate(fieldPhase.value, [0, 1], [0, MAX_HOME_ORB_HYBRID.fieldTurnDeg])}deg`,
    }],
  }));

  const glintsStyle = useAnimatedStyle(() => {
    const travel = size * MAX_HOME_ORB_HYBRID.glintsTranslateRatio;
    return {
      opacity: interpolate(
        glintsPhase.value,
        [0, 1],
        [MAX_HOME_ORB_HYBRID.glintsOpacityMin, MAX_HOME_ORB_HYBRID.glintsOpacityMax],
      ),
      transform: [
        { rotate: `${interpolate(glintsPhase.value, [0, 1], [0, MAX_HOME_ORB_HYBRID.glintsTurnDeg])}deg` },
        { translateX: interpolate(glintsPhase.value, [0, 1], [-travel, travel]) },
        { translateY: interpolate(glintsPhase.value, [0, 1], [travel * 0.5, -travel * 0.5]) },
      ],
    };
  }, [size]);

  return (
    <View
      testID="max-home-orb"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.root, { width: size, height: size }, style]}
    >
      <Animated.View style={[styles.layer, fieldStyle]}>
        <Image source={layers.field} style={styles.image} contentFit="contain" cachePolicy="memory-disk" />
      </Animated.View>
      <Animated.View style={[styles.layer, glintsStyle]}>
        <Image source={layers.glints} style={styles.image} contentFit="contain" cachePolicy="memory-disk" />
      </Animated.View>
      <Animated.View style={[styles.layer, shellStyle]}>
        <Image source={layers.shell} style={styles.image} contentFit="contain" cachePolicy="memory-disk" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default memo(MaxHomeOrb);
