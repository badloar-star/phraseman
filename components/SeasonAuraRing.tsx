import React, { memo, useEffect, useRef } from 'react';
import { Animated, AppState, Easing, View } from 'react-native';
import type { SeasonAuraAsset } from '../app/season_pass_track_config';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { useReduceMotion } from '../hooks/use_reduce_motion';

export type SeasonAuraVisibleLayers = Readonly<{
  base?: boolean;
  flow?: boolean;
  particles?: boolean;
}>;

interface Props {
  asset: SeasonAuraAsset;
  size: number;
  active?: boolean;
  visibleLayers?: SeasonAuraVisibleLayers;
}

function rotation(value: Animated.Value, reverse: boolean) {
  return value.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ['0deg', '-360deg'] : ['0deg', '360deg'],
  });
}

function SeasonAuraRing({ asset, size, active = true, visibleLayers = {} }: Props) {
  const isFocused = useIsScreenFocused();
  const reduceMotion = useReduceMotion();
  const shouldAnimate = active && isFocused && !reduceMotion;
  const breath = useRef(new Animated.Value(0)).current;
  const baseTurn = useRef(new Animated.Value(0)).current;
  const flowTurn = useRef(new Animated.Value(0)).current;
  const particlesTurn = useRef(new Animated.Value(0)).current;
  const twinkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const values = [breath, baseTurn, flowTurn, particlesTurn, twinkle];
    if (!shouldAnimate) {
      values.forEach((value) => value.setValue(0));
      return;
    }

    let loops: Animated.CompositeAnimation[] = [];
    const makeLoop = (value: Animated.Value, duration: number, easing = Easing.linear) =>
      Animated.loop(Animated.timing(value, {
        toValue: 1,
        duration,
        easing,
        useNativeDriver: true,
      }));
    const start = () => {
      if (loops.length > 0) return;
      loops = [
        makeLoop(breath, asset.pulseMs, Easing.inOut(Easing.sin)),
        makeLoop(flowTurn, asset.flowSpinMs),
        makeLoop(particlesTurn, asset.particlesSpinMs),
        makeLoop(twinkle, Math.max(2600, Math.round(asset.pulseMs * 0.62)), Easing.inOut(Easing.sin)),
      ];
      if (asset.baseSpinMs > 0) loops.push(makeLoop(baseTurn, asset.baseSpinMs));
      loops.forEach((loop) => loop.start());
    };
    const stop = () => {
      loops.forEach((loop) => loop.stop());
      loops = [];
    };

    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      stop();
    };
  }, [asset, baseTurn, breath, flowTurn, particlesTurn, shouldAnimate, twinkle]);

  const baseScale = breath.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.98, 1.025, 0.98] });
  const baseOpacity = breath.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.82, 1, 0.82] });
  const flowScale = breath.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1.015, 0.985, 1.015] });
  const flowOpacity = breath.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.68, 1, 0.68] });
  const particlesScale = twinkle.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.96, 1.04, 0.96] });
  const particlesOpacity = twinkle.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.34, 1, 0.34] });
  const layerStyle = { position: 'absolute' as const, width: size, height: size };

  return (
    <View style={{ width: size, height: size }} accessible={false}>
      {visibleLayers.base !== false ? (
        <Animated.Image
          source={asset.baseSource}
          resizeMode="contain"
          style={[
            layerStyle,
            {
              opacity: baseOpacity,
              transform: [{ scale: baseScale }, { rotate: rotation(baseTurn, false) }],
            },
          ]}
        />
      ) : null}
      {visibleLayers.flow !== false ? (
        <Animated.Image
          source={asset.flowSource}
          resizeMode="contain"
          style={[
            layerStyle,
            {
              opacity: flowOpacity,
              transform: [{ scale: flowScale }, { rotate: rotation(flowTurn, asset.flowReverse) }],
            },
          ]}
        />
      ) : null}
      {visibleLayers.particles !== false ? (
        <Animated.Image
          source={asset.particlesSource}
          resizeMode="contain"
          style={[
            layerStyle,
            {
              opacity: particlesOpacity,
              transform: [{ scale: particlesScale }, { rotate: rotation(particlesTurn, asset.particlesReverse) }],
            },
          ]}
        />
      ) : null}
    </View>
  );
}

export default memo(SeasonAuraRing);
