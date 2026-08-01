import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname } from 'expo-router';
import { useTheme } from './ThemeContext';
import type { ThemeMode } from '../constants/theme';
import {
  resolveAppArtBackdropName,
  type AppArtBackdropName,
} from './appArtBackdropRegistry';

type ThreeStop = [string, string, string];
type FourStop = [string, string, string, string];

const VERTICAL_SCRIMS: Record<ThemeMode, ThreeStop> = {
  dark: ['rgba(0,0,0,0.36)', 'rgba(0,0,0,0.20)', 'rgba(0,0,0,0.68)'],
  gold: ['rgba(0,0,0,0.46)', 'rgba(0,0,0,0.30)', 'rgba(0,0,0,0.78)'],
  coral: ['rgba(0,0,0,0.38)', 'rgba(0,0,0,0.24)', 'rgba(0,0,0,0.68)'],
  minimalDark: ['rgba(8,10,14,0.30)', 'rgba(12,14,20,0.16)', 'rgba(6,7,10,0.56)'],
  business: ['rgba(0,0,0,0.34)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.60)'],
  businessLight: ['rgba(255,255,255,0.42)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.66)'],
  sagePorcelain: ['rgba(252,253,249,0.50)', 'rgba(240,241,236,0.26)', 'rgba(252,253,249,0.72)'],
  midnight: ['rgba(1,1,2,0.40)', 'rgba(1,1,2,0.22)', 'rgba(1,1,2,0.66)'],
  ember: ['rgba(1,1,1,0.40)', 'rgba(1,1,1,0.22)', 'rgba(1,1,1,0.66)'],
  aurora: ['rgba(1,2,1,0.40)', 'rgba(1,2,1,0.22)', 'rgba(1,2,1,0.66)'],
  volt: ['rgba(1,2,0,0.40)', 'rgba(1,2,0,0.22)', 'rgba(1,2,0,0.66)'],
  candyBlue: ['rgba(2,6,8,0.40)', 'rgba(2,6,8,0.22)', 'rgba(2,6,8,0.66)'],
  indigo: ['rgba(3,3,6,0.40)', 'rgba(3,3,6,0.22)', 'rgba(3,3,6,0.66)'],
};

const EDGE_SCRIMS: Record<ThemeMode, FourStop> = {
  dark: ['rgba(0,0,0,0.36)', 'rgba(0,0,0,0.10)', 'rgba(0,0,0,0.10)', 'rgba(0,0,0,0.30)'],
  gold: ['rgba(0,0,0,0.50)', 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0.42)'],
  coral: ['rgba(0,0,0,0.40)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.34)'],
  minimalDark: ['rgba(8,10,14,0.36)', 'rgba(110,168,255,0.04)', 'rgba(110,168,255,0.03)', 'rgba(6,7,10,0.34)'],
  business: ['rgba(0,0,0,0.40)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.36)'],
  businessLight: ['rgba(255,255,255,0.46)', 'rgba(0,0,0,0.03)', 'rgba(0,0,0,0.02)', 'rgba(255,255,255,0.40)'],
  sagePorcelain: ['rgba(252,253,249,0.52)', 'rgba(49,95,80,0.03)', 'rgba(49,95,80,0.02)', 'rgba(252,253,249,0.46)'],
  midnight: ['rgba(1,1,2,0.46)', 'rgba(1,1,2,0.10)', 'rgba(1,1,2,0.08)', 'rgba(1,1,2,0.42)'],
  ember: ['rgba(1,1,1,0.46)', 'rgba(1,1,1,0.10)', 'rgba(1,1,1,0.08)', 'rgba(1,1,1,0.42)'],
  aurora: ['rgba(1,2,1,0.46)', 'rgba(1,2,1,0.10)', 'rgba(1,2,1,0.08)', 'rgba(1,2,1,0.42)'],
  volt: ['rgba(1,2,0,0.46)', 'rgba(1,2,0,0.10)', 'rgba(1,2,0,0.08)', 'rgba(1,2,0,0.42)'],
  candyBlue: ['rgba(2,6,8,0.46)', 'rgba(178,213,229,0.04)', 'rgba(178,213,229,0.03)', 'rgba(2,6,8,0.42)'],
  indigo: ['rgba(3,3,6,0.46)', 'rgba(200,195,255,0.04)', 'rgba(200,195,255,0.03)', 'rgba(3,3,6,0.42)'],
};

function AppArtBackdrop({ name }: { name: AppArtBackdropName }) {
  const { themeMode } = useTheme();
  void name;

  return (
    <View pointerEvents="none" style={styles.root}>
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
});
