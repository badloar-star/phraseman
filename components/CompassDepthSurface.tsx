import React from 'react';
import { StyleSheet, View } from 'react-native';
import CompassBevel from './CompassBevel';
import { LinearGradient } from './SafeLinearGradient';
import { COMPASS_GRADIENTS, COMPASS_SURFACE_LOCATIONS } from '../constants/compassTheme';

type CompassDepthSurfaceProps = {
  radius: number;
  selected?: boolean;
  quiet?: boolean;
  cream?: boolean;
};

export default function CompassDepthSurface({
  radius,
  selected = false,
  quiet = false,
  cream = false,
}: CompassDepthSurfaceProps) {
  const baseColors = cream
    ? COMPASS_GRADIENTS.primaryButton
    : selected
      ? COMPASS_GRADIENTS.selectedTile
      : quiet
        ? COMPASS_GRADIENTS.recessedPanel
        : COMPASS_GRADIENTS.raisedTile;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: radius, overflow: 'hidden' }]}>
      <LinearGradient
        colors={baseColors}
        locations={COMPASS_SURFACE_LOCATIONS}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={cream
          ? ['rgba(255,255,255,0.42)', 'rgba(255,230,181,0.12)', 'rgba(255,255,255,0)']
          : ['rgba(255,245,222,0.34)', 'rgba(255,230,181,0.10)', 'rgba(255,255,255,0)']}
        locations={[0, 0.34, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.topShelf, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]}
      />
      <View style={[styles.leftRail, { backgroundColor: cream ? 'rgba(255,255,255,0.28)' : 'rgba(255,230,181,0.22)' }]} />
      <View style={[styles.rightRail, { backgroundColor: cream ? 'rgba(111,63,37,0.34)' : 'rgba(0,0,0,0.50)' }]} />
      <LinearGradient
        colors={cream
          ? ['rgba(111,63,37,0.04)', 'rgba(111,63,37,0.50)']
          : ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.62)']}
        locations={[0, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.bottomShelf, { borderBottomLeftRadius: radius, borderBottomRightRadius: radius }]}
      />
      <CompassBevel radius={radius} intensity={selected || cream ? 'strong' : quiet ? 'quiet' : 'normal'} />
    </View>
  );
}

const styles = StyleSheet.create({
  topShelf: {
    position: 'absolute',
    left: 2,
    right: 2,
    top: 2,
    height: 12,
  },
  bottomShelf: {
    position: 'absolute',
    left: 2,
    right: 2,
    bottom: 2,
    height: 14,
  },
  leftRail: {
    position: 'absolute',
    left: 1,
    top: 5,
    bottom: 8,
    width: 2,
  },
  rightRail: {
    position: 'absolute',
    right: 1,
    top: 6,
    bottom: 4,
    width: 2,
  },
});
