import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import { COMPASS_RICH } from '../constants/compassTheme';

type CompassBevelProps = {
  radius: number;
  intensity?: 'quiet' | 'normal' | 'strong';
};

const INTENSITY = {
  quiet: { top: 0.18, side: 0.14, bottom: 0.34, shade: 0.26, wash: 0.035, glint: 0.07, lip: 0.30 },
  normal: { top: 0.30, side: 0.22, bottom: 0.50, shade: 0.38, wash: 0.055, glint: 0.12, lip: 0.44 },
  strong: { top: 0.44, side: 0.32, bottom: 0.68, shade: 0.52, wash: 0.08, glint: 0.18, lip: 0.58 },
} as const;

export default function CompassBevel({ radius, intensity = 'normal' }: CompassBevelProps) {
  const v = INTENSITY[intensity];
  const innerRadius = Math.max(0, radius - 2);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: radius, overflow: 'hidden' }]}>
      <LinearGradient
        colors={[
          `rgba(255,239,201,${v.top})`,
          `rgba(255,230,181,${v.top * 0.70})`,
          `rgba(244,185,120,${v.top * 0.44})`,
          `rgba(180,119,78,${v.top * 0.16})`,
          'rgba(0,0,0,0)',
        ]}
        locations={[0, 0.12, 0.28, 0.50, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.86, y: 0.78 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0)', `rgba(0,0,0,${v.shade * 0.40})`, `rgba(0,0,0,${v.bottom})`]}
        locations={[0, 0.58, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={[`rgba(255,245,222,${v.glint})`, `rgba(255,230,181,${v.glint * 0.52})`, 'rgba(255,255,255,0)']}
        locations={[0, 0.36, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cornerGlintTop, { borderTopLeftRadius: radius }]}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0)', `rgba(0,0,0,${v.bottom * 0.88})`]}
        locations={[0, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cornerShadeBottom, { borderBottomRightRadius: radius }]}
      />
      <LinearGradient
        colors={[`rgba(255,239,201,${v.top + 0.20})`, `rgba(244,185,120,${v.top * 0.20})`, 'rgba(255,255,255,0)']}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.topPlate, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]}
      />
      <LinearGradient
        colors={[`rgba(0,0,0,${v.lip * 0.15})`, `rgba(0,0,0,${v.lip})`]}
        locations={[0, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.bottomLip, { borderBottomLeftRadius: radius, borderBottomRightRadius: radius }]}
      />
      <View style={[styles.topEdge, { backgroundColor: `rgba(255,239,201,${Math.min(v.top + 0.22, 0.82)})` }]} />
      <View style={[styles.leftEdge, { backgroundColor: `rgba(255,230,181,${v.side})` }]} />
      <View style={[styles.rightEdge, { backgroundColor: `rgba(0,0,0,${v.shade})` }]} />
      <View style={[styles.bottomEdge, { backgroundColor: `rgba(0,0,0,${v.bottom})` }]} />
      <View style={[StyleSheet.absoluteFillObject, { borderRadius: radius, borderWidth: 1, borderColor: COMPASS_RICH.edgeLight }]} />
      <View style={[StyleSheet.absoluteFillObject, { margin: 1.5, borderRadius: innerRadius, borderWidth: StyleSheet.hairlineWidth, borderColor: COMPASS_RICH.mist }]} />
      <View style={[StyleSheet.absoluteFillObject, { margin: 3, borderRadius: Math.max(0, radius - 4), borderWidth: StyleSheet.hairlineWidth, borderColor: `rgba(0,0,0,${v.shade * 0.36})` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  topEdge: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 0,
    height: StyleSheet.hairlineWidth,
  },
  leftEdge: {
    position: 'absolute',
    left: 0,
    top: 1,
    bottom: 1,
    width: StyleSheet.hairlineWidth,
  },
  rightEdge: {
    position: 'absolute',
    right: 0,
    top: 1,
    bottom: 1,
    width: StyleSheet.hairlineWidth,
  },
  bottomEdge: {
    position: 'absolute',
    left: 1,
    right: 1,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
  cornerGlintTop: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '46%',
    height: '42%',
  },
  cornerShadeBottom: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '58%',
    height: '58%',
  },
  topPlate: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    height: 8,
  },
  bottomLip: {
    position: 'absolute',
    left: 1,
    right: 1,
    bottom: 1,
    height: 10,
  },
});
