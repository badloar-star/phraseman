import React, { useId } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Reanimated from 'react-native-reanimated';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import type { AchievementShelfMaterials } from './achievementShelfMaterials';

type Props = {
  children: React.ReactNode;
  materials: AchievementShelfMaterials;
  reflectionStyle: StyleProp<ViewStyle>;
};

export default function AchievementShelfStageArt({
  children,
  materials,
  reflectionStyle,
}: Props) {
  const idSuffix = useId().replace(/[^a-z0-9_-]/giu, '');
  const shelfTopId = `achievement-shelf-top-${idSuffix}`;
  const shelfFaceId = `achievement-shelf-face-${idSuffix}`;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
      <View
        pointerEvents="none"
        style={[styles.glassInset, { borderColor: materials.border }]}
      />

      <View style={StyleSheet.absoluteFillObject}>{children}</View>

      <View
        testID="achievement-shelf-surface"
        pointerEvents="none"
        style={styles.shelf}
      >
        <Svg width="100%" height="100%" viewBox="0 0 320 56" preserveAspectRatio="none">
          <Defs>
            <SvgLinearGradient id={shelfTopId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={materials.shelfTopStart} />
              <Stop offset="1" stopColor={materials.shelfTopEnd} />
            </SvgLinearGradient>
            <SvgLinearGradient id={shelfFaceId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={materials.shelfFaceStart} />
              <Stop offset="1" stopColor={materials.shelfFaceEnd} />
            </SvgLinearGradient>
          </Defs>
          <Path
            d="M22 34 L298 34 L286 54 L34 54 Z"
            fill={materials.shadow}
            opacity={0.62}
          />
          <Path
            d="M8 22 L312 22 L297 49 Q296 51 291 51 L29 51 Q24 51 23 49 Z"
            fill={`url(#${shelfFaceId})`}
          />
          <Path
            d="M28 6 L292 6 L312 22 L8 22 Z"
            fill={`url(#${shelfTopId})`}
            stroke={materials.shelfEdge}
            strokeWidth={0.8}
          />
          <Path
            d="M9 22 L311 22"
            stroke={materials.shelfEdge}
            strokeWidth={1}
            opacity={0.88}
          />
        </Svg>

        <View style={styles.reflectionTrack}>
          <Reanimated.View
            testID="achievement-shelf-reflection"
            style={[
              styles.reflection,
              { backgroundColor: materials.reflection },
              reflectionStyle,
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glassInset: {
    ...StyleSheet.absoluteFillObject,
    margin: 8,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.68,
  },
  shelf: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 16,
    height: 56,
  },
  reflectionTrack: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 21,
    height: 2,
    overflow: 'hidden',
  },
  reflection: {
    width: 54,
    height: 2,
  },
});
