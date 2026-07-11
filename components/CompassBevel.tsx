import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { COMPASS_RICH } from '../constants/compassTheme';

type CompassBevelProps = {
  radius: number;
  intensity?: 'quiet' | 'normal' | 'strong';
};

const INTENSITY = {
  quiet: { top: 0.08, bottom: 0.16, border: 0.16 },
  normal: { top: 0.10, bottom: 0.20, border: 0.20 },
  strong: { top: 0.12, bottom: 0.24, border: 0.24 },
} as const;

function CompassBevel({ radius, intensity = 'normal' }: CompassBevelProps) {
  const v = INTENSITY[intensity];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: radius, overflow: 'hidden' }]}>
      <View style={[styles.topEdge, { backgroundColor: `rgba(255,255,255,${v.top})` }]} />
      <View style={[styles.bottomEdge, { backgroundColor: `rgba(0,0,0,${v.bottom})` }]} />
      <View style={[StyleSheet.absoluteFillObject, { borderRadius: radius, borderWidth: 0, borderColor: `rgba(255,255,255,${v.border})` }]} />
      <View style={[StyleSheet.absoluteFillObject, { borderRadius: radius, borderWidth: 0, borderColor: COMPASS_RICH.hairlineQuiet }]} />
    </View>
  );
}

export default memo(CompassBevel);

const styles = StyleSheet.create({
  topEdge: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 0,
    height: StyleSheet.hairlineWidth,
  },
  bottomEdge: {
    position: 'absolute',
    left: 1,
    right: 1,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
});
