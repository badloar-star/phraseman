import React from 'react';
import { StyleSheet, View } from 'react-native';
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
  if (!cream) {
    return null;
  }

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
        colors={['rgba(255,255,255,0.18)', 'rgba(255,230,181,0.05)', 'rgba(255,255,255,0)']}
        locations={[0, 0.34, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.topShelf, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]}
      />
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
});
