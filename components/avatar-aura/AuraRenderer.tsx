import React, { useEffect, useId, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { AuraScene } from './AuraScenes';
import type { AuraRendererProps, AuraSvgIds } from './types';

export function AuraRenderer(props: AuraRendererProps) {
  const { detail = 'hero', motion = 'ambient' } = props;
  const isStatic = motion === 'static';
  const isThumbnail = detail === 'thumbnail';
  if (isStatic || isThumbnail) return <StaticAuraRenderer {...props} />;
  return <AnimatedAuraRenderer {...props} />;
}

function StaticAuraRenderer({ preset, size, detail = 'hero', children }: AuraRendererProps) {
  const ids = useAuraSvgIds();
  const canvasSize = canvasSizeFor(size, detail);
  return <AuraSlot size={size} canvasSize={canvasSize}>
    <View pointerEvents="none" style={[styles.halo, { width: canvasSize, height: canvasSize, borderRadius: canvasSize / 2, backgroundColor: preset.colors[1] }]} />
    <View pointerEvents="none" style={styles.canvas}>
      <AuraScene preset={preset} size={canvasSize} ids={ids} detail={detail} />
    </View>
    <View pointerEvents="none" style={styles.center}>{children}</View>
  </AuraSlot>;
}

function AnimatedAuraRenderer({ preset, size, detail = 'hero', ownerVisible = true, children }: AuraRendererProps) {
  const reduceMotion = useReduceMotion();
  const runtimeActive = useRuntimeActive(ownerVisible);
  const phase = useSharedValue(0);
  const staticPhase = preset.staticPhase;
  const ids = useAuraSvgIds();
  const canvasSize = canvasSizeFor(size, detail);

  useEffect(() => {
    const ambientActive = runtimeActive && !reduceMotion;
    if (!ambientActive) {
      cancelAnimation(phase);
      phase.value = staticPhase;
      return () => cancelAnimation(phase);
    }
    phase.value = 0;
    phase.value = withRepeat(
      withTiming(1, { duration: preset.durationMs, easing: Easing.inOut(Easing.sin) }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(phase);
      phase.value = staticPhase;
    };
  }, [phase, preset.durationMs, reduceMotion, runtimeActive, staticPhase]);

  const outerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(phase.value, [0, 0.25, 0.5, 0.75, 1], [0.76, 1, 0.82, 1, 0.76]),
    transform: [
      { rotate: `${interpolate(phase.value, [0, 1], [0, preset.motion.outerDegrees])}deg` },
      { scale: interpolate(phase.value, [0, 0.25, 0.5, 0.75, 1], [1, preset.motion.outerScale, 1, preset.motion.outerScale, 1]) },
    ],
  }));
  const innerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(phase.value, [0, 0.25, 0.5, 0.75, 1], [0.16, 0.42, 0.22, 0.42, 0.16]),
    transform: [
      { rotate: `${interpolate(phase.value, [0, 1], [0, preset.motion.innerDegrees])}deg` },
      { scale: interpolate(phase.value, [0, 0.25, 0.5, 0.75, 1], [0.82, 0.94, 0.86, 0.94, 0.82]) },
    ],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(phase.value, [0, 0.3, 0.56, 0.8, 1], [0.12, 0.32, 0.17, 0.3, 0.12]),
    transform: [{ scale: interpolate(phase.value, [0, 0.3, 0.56, 0.8, 1], [0.9, 1.04, 0.94, 1.03, 0.9]) }],
  }));

  return <AuraSlot size={size} canvasSize={canvasSize}>
    <Animated.View pointerEvents="none" style={[styles.halo, { width: canvasSize, height: canvasSize, borderRadius: canvasSize / 2, backgroundColor: preset.colors[1] }, haloStyle]} />
    <Animated.View pointerEvents="none" style={[styles.canvas, outerStyle]}>
      <AuraScene preset={preset} size={canvasSize} ids={ids} detail={detail} />
    </Animated.View>
    <Animated.View pointerEvents="none" style={[styles.canvas, innerStyle]}>
      <AuraScene preset={preset} size={canvasSize} ids={{ spectral: `${ids.spectral}-glint`, core: `${ids.core}-glint`, edge: `${ids.edge}-glint` }} detail={detail} />
    </Animated.View>
    <View pointerEvents="none" style={styles.center}>{children}</View>
  </AuraSlot>;
}

function AuraSlot({ size, canvasSize, children }: { size: number; canvasSize: number; children: React.ReactNode }) {
  return <View pointerEvents="none" style={[styles.slot, { width: size, height: size }]}>
    <View pointerEvents="none" style={[styles.canvasFrame, { width: canvasSize, height: canvasSize, left: (size - canvasSize) / 2, top: (size - canvasSize) / 2 }]}>{children}</View>
  </View>;
}

function useAuraSvgIds(): AuraSvgIds {
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '-');
  return useMemo(() => ({
    spectral: `aura-${instanceId}-spectral`,
    core: `aura-${instanceId}-core`,
    edge: `aura-${instanceId}-edge`,
  }), [instanceId]);
}

function canvasSizeFor(size: number, detail: 'hero' | 'thumbnail') {
  return Math.round(size * (detail === 'hero' ? 1.42 : 1.22));
}

const styles = StyleSheet.create({
  slot: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  canvasFrame: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  canvas: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  halo: { position: 'absolute' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
