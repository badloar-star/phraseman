import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import { GOLD_RICH } from '../constants/goldTheme';

type GoldBevelProps = {
  radius: number;
  intensity?: 'quiet' | 'normal' | 'strong';
};

const INTENSITY = {
  quiet: { top: 0.08, side: 0.08, bottom: 0.16, shade: 0.14, wash: 0.012, glint: 0.028 },
  normal: { top: 0.13, side: 0.11, bottom: 0.24, shade: 0.20, wash: 0.018, glint: 0.044 },
  strong: { top: 0.18, side: 0.15, bottom: 0.31, shade: 0.26, wash: 0.026, glint: 0.064 },
} as const;

function GoldBevel({ radius, intensity = 'normal' }: GoldBevelProps) {
  const v = INTENSITY[intensity];
  const innerRadius = Math.max(0, radius - 2);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: radius, overflow: 'hidden' }]}>
      <LinearGradient
        colors={[
          `rgba(246,227,161,${v.top})`,
          `rgba(214,179,90,${v.top * 0.30})`,
          `rgba(120,88,28,${v.top * 0.08})`,
          'rgba(0,0,0,0)',
          'rgba(0,0,0,0)',
        ]}
        locations={[0, 0.12, 0.34, 0.68, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.78, y: 0.66 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={[
          `rgba(246,227,161,${v.wash})`,
          `rgba(214,179,90,${v.wash * 0.30})`,
          'rgba(0,0,0,0)',
        ]}
        locations={[0, 0.14, 1]}
        start={{ x: 0, y: 0.32 }}
        end={{ x: 0.72, y: 0.52 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0)', `rgba(0,0,0,${v.shade * 0.38})`, `rgba(0,0,0,${v.bottom})`]}
        locations={[0, 0.76, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={[
          'rgba(255,255,255,0)',
          `rgba(246,227,161,${v.top * 0.11})`,
          `rgba(184,144,58,${v.top * 0.05})`,
          'rgba(0,0,0,0)',
        ]}
        locations={[0, 0.34, 0.62, 1]}
        start={{ x: 0.02, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0)', `rgba(0,0,0,${v.shade * 0.22})`, `rgba(0,0,0,${v.bottom * 0.54})`]}
        locations={[0, 0.84, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={[
          `rgba(255,248,220,${v.glint})`,
          `rgba(246,227,161,${v.glint * 0.28})`,
          'rgba(255,255,255,0)',
        ]}
        locations={[0, 0.42, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cornerGlintTop, { borderTopLeftRadius: radius }]}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0)', `rgba(0,0,0,${v.bottom * 0.62})`]}
        locations={[0, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cornerShadeBottom, { borderBottomRightRadius: radius }]}
      />
      <View style={[styles.topEdge, { backgroundColor: `rgba(246,227,161,${v.top + 0.06})` }]} />
      <View style={[styles.leftEdge, { backgroundColor: `rgba(246,227,161,${v.side})` }]} />
      <View style={[styles.rightEdge, { backgroundColor: `rgba(0,0,0,${v.shade})` }]} />
      <View style={[styles.bottomEdge, { backgroundColor: `rgba(0,0,0,${v.bottom})` }]} />
      <View style={[StyleSheet.absoluteFillObject, { borderRadius: radius, borderWidth: 0, borderColor: GOLD_RICH.edgeSoft }]} />
      <View style={[StyleSheet.absoluteFillObject, { margin: 1.5, borderRadius: innerRadius, borderWidth: 0, borderColor: GOLD_RICH.mist }]} />
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
    width: '24%',
    height: '26%',
  },
  cornerShadeBottom: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '46%',
    height: '46%',
  },
});

export default memo(GoldBevel);
