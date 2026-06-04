import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { usePathname } from 'expo-router';
import { useTheme } from './ThemeContext';
import type { ThemeMode } from '../constants/theme';
import {
  getAppArtBackdropSource,
  resolveAppArtBackdropName,
  type AppArtBackdropName,
} from './appArtBackdropRegistry';

type ThreeStop = [string, string, string];
type FourStop = [string, string, string, string];

const IMAGE_OPACITY: Record<ThemeMode, number> = {
  dark: 0.48,
  neon: 0.44,
  gold: 0.46,
  coral: 0.46,
  minimalLight: 0.62,
  minimalDark: 0.52,
  compass: 0.48,
};

const VERTICAL_SCRIMS: Record<ThemeMode, ThreeStop> = {
  dark: ['rgba(0,0,0,0.36)', 'rgba(0,0,0,0.20)', 'rgba(0,0,0,0.68)'],
  neon: ['rgba(0,0,0,0.40)', 'rgba(0,0,0,0.24)', 'rgba(0,0,0,0.72)'],
  gold: ['rgba(0,0,0,0.46)', 'rgba(0,0,0,0.30)', 'rgba(0,0,0,0.78)'],
  coral: ['rgba(0,0,0,0.38)', 'rgba(0,0,0,0.24)', 'rgba(0,0,0,0.68)'],
  minimalLight: ['rgba(34,28,18,0.16)', 'rgba(34,28,18,0.06)', 'rgba(34,28,18,0.28)'],
  minimalDark: ['rgba(8,10,14,0.30)', 'rgba(12,14,20,0.16)', 'rgba(6,7,10,0.56)'],
  compass: ['rgba(2,3,4,0.42)', 'rgba(17,16,12,0.22)', 'rgba(2,3,4,0.70)'],
};

const EDGE_SCRIMS: Record<ThemeMode, FourStop> = {
  dark: ['rgba(0,0,0,0.36)', 'rgba(0,0,0,0.10)', 'rgba(0,0,0,0.10)', 'rgba(0,0,0,0.30)'],
  neon: ['rgba(0,0,0,0.42)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.36)'],
  gold: ['rgba(0,0,0,0.50)', 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0.42)'],
  coral: ['rgba(0,0,0,0.40)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.34)'],
  minimalLight: ['rgba(34,28,18,0.18)', 'rgba(34,28,18,0.04)', 'rgba(34,28,18,0.04)', 'rgba(34,28,18,0.16)'],
  minimalDark: ['rgba(8,10,14,0.36)', 'rgba(110,168,255,0.04)', 'rgba(110,168,255,0.03)', 'rgba(6,7,10,0.34)'],
  compass: ['rgba(2,3,4,0.48)', 'rgba(242,196,141,0.06)', 'rgba(242,196,141,0.025)', 'rgba(2,3,4,0.42)'],
};

function AppArtBackdrop({ name }: { name: AppArtBackdropName }) {
  const { themeMode } = useTheme();
  const source = getAppArtBackdropSource(name, themeMode);

  return (
    <View pointerEvents="none" style={styles.root}>
      <Image
        source={source}
        contentFit="cover"
        cachePolicy="memory-disk"
        style={[styles.image, { opacity: IMAGE_OPACITY[themeMode] }]}
      />
      <LinearGradient
        colors={VERTICAL_SCRIMS[themeMode]}
        locations={[0, 0.46, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.root}
      />
      <LinearGradient
        colors={EDGE_SCRIMS[themeMode]}
        locations={[0, 0.20, 0.82, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.root}
      />
    </View>
  );
}

function AppRouteArtBackdrop() {
  const pathname = usePathname();
  const name = resolveAppArtBackdropName(pathname);

  return <AppArtBackdrop name={name} />;
}

export function rememberAppArtBackdrop(
  _name: AppArtBackdropName,
  _themeMode: ThemeMode,
  _viewportW: number,
) {}

export { AppRouteArtBackdrop };
export type { AppArtBackdropName };

const MemoizedAppArtBackdrop = memo(AppArtBackdrop);
MemoizedAppArtBackdrop.displayName = 'AppArtBackdrop';
export default MemoizedAppArtBackdrop;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
});
