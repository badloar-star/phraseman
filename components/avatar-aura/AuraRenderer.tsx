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

const AMBIENT_DURATION_MS = 6_400;

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
      withTiming(1, { duration: AMBIENT_DURATION_MS, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(phase);
      phase.value = staticPhase;
    };
  }, [phase, reduceMotion, runtimeActive, staticPhase]);

  const outerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(phase.value, [0, 0.5, 1], [0.82, 1, 0.82]),
    transform: [
      { rotate: `${interpolate(phase.value, [0, 1], [-preset.motion.outerDegrees, preset.motion.outerDegrees])}deg` },
      { scale: interpolate(phase.value, [0, 0.5, 1], [1, preset.motion.outerScale, 1]) },
    ],
  }));
  const innerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(phase.value, [0, 0.5, 1], [0.14, 0.42, 0.14]),
    transform: [
      { rotate: `${interpolate(phase.value, [0, 1], [preset.motion.innerDegrees, -preset.motion.innerDegrees])}deg` },
      { scale: interpolate(phase.value, [0, 0.5, 1], [0.78, 0.9, 0.78]) },
    ],
  }));

  return <AuraSlot size={size} canvasSize={canvasSize}>
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
  return Math.round(size * (detail === 'hero' ? 1.24 : 1.12));
}

const styles = StyleSheet.create({
  slot: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  canvasFrame: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  canvas: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
