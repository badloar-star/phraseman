/**
 * Lesson-only combo lightning overlay.
 *
 * strike(false) renders one close bolt for x5. strike(true) renders two distinct
 * channels for x10. Every animation is finite, is cancelled before replay, and
 * is cleared on blur/unmount. The host owns combo thresholds and sound playback.
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { useIsScreenFocused } from '../../hooks/use_is_screen_focused';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

export interface LightningOverlayHandle {
  /** big=true is the double x10 strike; false is the single x5 strike. */
  strike(big: boolean): void;
}

interface LightningColors {
  core: string;
  flash: string;
  mid: string;
  wide: string;
}

export interface LightningOverlayProps {
  level?: number;
  colors?: LightningColors;
}

interface SparkPoint {
  radius: number;
  x: number;
  y: number;
}

const DEFAULT_COLORS: LightningColors = {
  wide: 'rgba(65, 201, 242, 0.42)',
  mid: 'rgba(168, 244, 255, 0.94)',
  core: '#F4FDFF',
  flash: 'rgba(72, 190, 226, 0.28)',
};

function rand(seed: number): number {
  const x = Math.sin(seed * 91.7 + 13.13) * 43758.5453;
  return x - Math.floor(x);
}

function buildMainChannel(width: number, height: number, seedBase: number): string {
  const segments = 20;
  const startX = width * (0.28 + rand(seedBase) * 0.44);
  const targetX = width * (0.42 + rand(seedBase + 7) * 0.16);
  const points: string[] = [];

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const y = height * progress;
    const baseX = startX + (targetX - startX) * progress;
    const jitter = (rand(seedBase + index * 2.13) - 0.5)
      * width
      * 0.22
      * (1 - progress * 0.5);
    points.push(`${(baseX + jitter).toFixed(1)},${y.toFixed(1)}`);
  }

  return points.join(' ');
}

function buildBranches(width: number, height: number, seedBase: number): string[] {
  const count = 4 + Math.floor(rand(seedBase + 99) * 2);
  const branches: string[] = [];

  for (let branch = 0; branch < count; branch += 1) {
    const startProgress = 0.18 + rand(seedBase + branch * 7.7) * 0.62;
    const startY = height * startProgress;
    const startX = width * (0.32 + rand(seedBase + branch * 3.3) * 0.36);
    const segmentCount = 4 + Math.floor(rand(seedBase + branch * 5.1) * 3);
    const direction = rand(seedBase + branch) > 0.5 ? 1 : -1;
    const points = [`${startX.toFixed(1)},${startY.toFixed(1)}`];
    let x = startX;
    let y = startY;

    for (let segment = 1; segment <= segmentCount; segment += 1) {
      x += direction * width * 0.065 * (0.55 + rand(seedBase + branch * 10 + segment));
      y += height * 0.048 * (0.5 + rand(seedBase + branch * 20 + segment));
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    branches.push(points.join(' '));
  }

  return branches;
}

function buildSparkPoints(width: number, height: number, seedBase: number): SparkPoint[] {
  return Array.from({ length: 7 }, (_, index) => ({
    x: width * (0.16 + rand(seedBase + index * 11.3) * 0.68),
    y: height * (0.18 + rand(seedBase + index * 17.9) * 0.64),
    radius: 2 + rand(seedBase + index * 23.7) * 2.4,
  }));
}

function BoltSvg({
  branches,
  colors,
  height,
  mainPath,
  width,
}: {
  branches: string[];
  colors: LightningColors;
  height: number;
  mainPath: string;
  width: number;
}) {
  if (!mainPath) return null;

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Polyline
        points={mainPath}
        fill="none"
        stroke={colors.wide}
        strokeWidth={18}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points={mainPath}
        fill="none"
        stroke={colors.mid}
        strokeWidth={7.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points={mainPath}
        fill="none"
        stroke={colors.core}
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {branches.map((branch, index) => (
        <React.Fragment key={`${branch}-${index}`}>
          <Polyline
            points={branch}
            fill="none"
            stroke={colors.wide}
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline
            points={branch}
            fill="none"
            stroke={colors.mid}
            strokeWidth={3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline
            points={branch}
            fill="none"
            stroke={colors.core}
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </React.Fragment>
      ))}
    </Svg>
  );
}

export const LightningOverlay = forwardRef<
  LightningOverlayHandle,
  LightningOverlayProps
>(function LightningOverlay({ level = 0, colors = DEFAULT_COLORS }, ref) {
  const { width, height } = useWindowDimensions();
  const focused = useIsScreenFocused();
  const reduceMotion = useReduceMotion();

  const [primaryPath, setPrimaryPath] = useState('');
  const [primaryBranches, setPrimaryBranches] = useState<string[]>([]);
  const [secondaryPath, setSecondaryPath] = useState('');
  const [secondaryBranches, setSecondaryBranches] = useState<string[]>([]);
  const [sparkPoints, setSparkPoints] = useState<SparkPoint[]>([]);

  const primaryOpacity = useSharedValue(0);
  const primaryScale = useSharedValue(1);
  const primaryTranslateY = useSharedValue(0);
  const secondaryOpacity = useSharedValue(0);
  const secondaryScale = useSharedValue(1);
  const secondaryTranslateY = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const edgeOpacity = useSharedValue(0);
  const sparkOpacity = useSharedValue(0);
  const sparkScale = useSharedValue(1);
  const sparkTranslateY = useSharedValue(0);

  const cancelOverlayAnimations = useCallback(() => {
    cancelAnimation(primaryOpacity);
    cancelAnimation(primaryScale);
    cancelAnimation(primaryTranslateY);
    cancelAnimation(secondaryOpacity);
    cancelAnimation(secondaryScale);
    cancelAnimation(secondaryTranslateY);
    cancelAnimation(flashOpacity);
    cancelAnimation(edgeOpacity);
    cancelAnimation(sparkOpacity);
    cancelAnimation(sparkScale);
    cancelAnimation(sparkTranslateY);

    primaryOpacity.value = 0;
    primaryScale.value = 1;
    primaryTranslateY.value = 0;
    secondaryOpacity.value = 0;
    secondaryScale.value = 1;
    secondaryTranslateY.value = 0;
    flashOpacity.value = 0;
    edgeOpacity.value = 0;
    sparkOpacity.value = 0;
    sparkScale.value = 1;
    sparkTranslateY.value = 0;
  }, [
    edgeOpacity,
    flashOpacity,
    primaryOpacity,
    primaryScale,
    primaryTranslateY,
    secondaryOpacity,
    secondaryScale,
    secondaryTranslateY,
    sparkOpacity,
    sparkScale,
    sparkTranslateY,
  ]);

  const strike = useCallback((big: boolean) => {
    if (!focused) return;
    cancelOverlayAnimations();

    const seed = Date.now() % 100000;
    setPrimaryPath(buildMainChannel(width, height, seed));
    setPrimaryBranches(buildBranches(width, height, seed));
    setSecondaryPath(big ? buildMainChannel(width, height, seed + 313) : '');
    setSecondaryBranches(big ? buildBranches(width, height, seed + 313) : []);
    setSparkPoints(buildSparkPoints(width, height, seed + 911));

    if (reduceMotion) {
      primaryOpacity.value = withSequence(
        withTiming(0.54, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 360, easing: Easing.in(Easing.quad) }),
      );
      flashOpacity.value = withSequence(
        withTiming(0.16, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 360, easing: Easing.in(Easing.quad) }),
      );
      edgeOpacity.value = withSequence(
        withTiming(0.24, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 360, easing: Easing.in(Easing.quad) }),
      );
      return;
    }

    primaryScale.value = 0.96;
    primaryTranslateY.value = -10;
    primaryOpacity.value = big
      ? withDelay(180, withSequence(
          withTiming(1, { duration: 80, easing: Easing.out(Easing.quad) }),
          withTiming(0.72, { duration: 180, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) }),
        ))
      : withSequence(
          withTiming(1, { duration: 80, easing: Easing.out(Easing.quad) }),
          withTiming(0.74, { duration: 150, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 310, easing: Easing.in(Easing.quad) }),
        );
    primaryScale.value = big
      ? withDelay(180, withSequence(
          withTiming(1.025, { duration: 100, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 580, easing: Easing.out(Easing.quad) }),
        ))
      : withSequence(
          withTiming(1.02, { duration: 100, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 440, easing: Easing.out(Easing.quad) }),
        );
    primaryTranslateY.value = big
      ? withDelay(180, withTiming(7, { duration: 680, easing: Easing.out(Easing.quad) }))
      : withTiming(6, { duration: 540, easing: Easing.out(Easing.quad) });

    if (big) {
      secondaryScale.value = 0.97;
      secondaryTranslateY.value = -8;
      secondaryOpacity.value = withSequence(
        withTiming(0.86, { duration: 70, easing: Easing.out(Easing.quad) }),
        withTiming(0.12, { duration: 130, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 110, easing: Easing.in(Easing.quad) }),
      );
      secondaryScale.value = withTiming(1.01, { duration: 280, easing: Easing.out(Easing.quad) });
      secondaryTranslateY.value = withTiming(4, { duration: 310, easing: Easing.out(Easing.quad) });
    }

    const edgePeak = level >= 3 ? 0.72 : 0.58;
    flashOpacity.value = withSequence(
      withTiming(big ? 0.32 : 0.28, { duration: big ? 180 : 90, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: big ? 620 : 360, easing: Easing.in(Easing.quad) }),
    );
    edgeOpacity.value = withSequence(
      withTiming(edgePeak, { duration: big ? 190 : 100, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: big ? 680 : 430, easing: Easing.in(Easing.quad) }),
    );
    sparkScale.value = 0.72;
    sparkTranslateY.value = -4;
    sparkOpacity.value = withDelay(big ? 180 : 34, withSequence(
      withTiming(0.92, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: big ? 570 : 370, easing: Easing.in(Easing.quad) }),
    ));
    sparkScale.value = withDelay(
      big ? 180 : 34,
      withTiming(1.18, { duration: big ? 660 : 460, easing: Easing.out(Easing.quad) }),
    );
    sparkTranslateY.value = withDelay(
      big ? 180 : 34,
      withTiming(14, { duration: big ? 660 : 460, easing: Easing.out(Easing.quad) }),
    );
  }, [
    cancelOverlayAnimations,
    edgeOpacity,
    flashOpacity,
    focused,
    height,
    level,
    primaryOpacity,
    primaryScale,
    primaryTranslateY,
    reduceMotion,
    secondaryOpacity,
    secondaryScale,
    secondaryTranslateY,
    sparkOpacity,
    sparkScale,
    sparkTranslateY,
    width,
  ]);

  useImperativeHandle(ref, () => ({ strike }), [strike]);

  useEffect(() => {
    if (!focused) cancelOverlayAnimations();
  }, [cancelOverlayAnimations, focused]);

  useEffect(() => cancelOverlayAnimations, [cancelOverlayAnimations]);

  const primaryStyle = useAnimatedStyle(() => ({
    opacity: primaryOpacity.value,
    transform: [
      { translateY: primaryTranslateY.value },
      { scale: primaryScale.value },
    ],
  }));
  const secondaryStyle = useAnimatedStyle(() => ({
    opacity: secondaryOpacity.value,
    transform: [
      { translateY: secondaryTranslateY.value },
      { scale: secondaryScale.value },
    ],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const edgeStyle = useAnimatedStyle(() => ({ opacity: edgeOpacity.value }));
  const sparkStyle = useAnimatedStyle(() => ({
    opacity: sparkOpacity.value,
    transform: [
      { translateY: sparkTranslateY.value },
      { scale: sparkScale.value },
    ],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.flash }, flashStyle]}
        pointerEvents="none"
      />
      <Animated.View
        style={[styles.edge, { borderColor: colors.mid }, edgeStyle]}
        pointerEvents="none"
      />

      <Animated.View style={[StyleSheet.absoluteFill, secondaryStyle]} pointerEvents="none">
        <BoltSvg
          branches={secondaryBranches}
          colors={colors}
          height={height}
          mainPath={secondaryPath}
          width={width}
        />
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, primaryStyle]} pointerEvents="none">
        <BoltSvg
          branches={primaryBranches}
          colors={colors}
          height={height}
          mainPath={primaryPath}
          width={width}
        />
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, sparkStyle]} pointerEvents="none">
        <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
          {sparkPoints.map((spark, index) => (
            <Circle
              key={`${spark.x}-${spark.y}-${index}`}
              cx={spark.x}
              cy={spark.y}
              r={spark.radius}
              fill={colors.core}
            />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  edge: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
  },
});

export default LightningOverlay;
