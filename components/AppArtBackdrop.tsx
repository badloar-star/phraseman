import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname } from 'expo-router';
import { useTheme } from './ThemeContext';
import type { ThemeMode } from '../constants/theme';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import {
  resolveAppArtBackdropName,
  type AppArtBackdropName,
} from './appArtBackdropRegistry';

type ThreeStop = [string, string, string];
type FourStop = [string, string, string, string];

const VERTICAL_SCRIMS: Record<ThemeMode, ThreeStop> = {
  dark: ['rgba(0,0,0,0.36)', 'rgba(0,0,0,0.20)', 'rgba(0,0,0,0.68)'], // theme-exempt: арт-фон приложения — иллюстрация
  gold: ['rgba(0,0,0,0.46)', 'rgba(0,0,0,0.30)', 'rgba(0,0,0,0.78)'], // theme-exempt: арт-фон приложения — иллюстрация
  olive: ['rgba(0,0,0,0.42)', 'rgba(0,0,0,0.22)', 'rgba(0,0,0,0.72)'], // theme-exempt: арт-фон приложения — иллюстрация
  sagePorcelain: ['rgba(252,253,249,0.50)', 'rgba(240,241,236,0.26)', 'rgba(252,253,249,0.72)'], // theme-exempt: арт-фон приложения — иллюстрация
  midnight: ['rgba(1,1,2,0.40)', 'rgba(1,1,2,0.22)', 'rgba(1,1,2,0.66)'], // theme-exempt: арт-фон приложения — иллюстрация
  ember: ['rgba(1,1,1,0.40)', 'rgba(1,1,1,0.22)', 'rgba(1,1,1,0.66)'], // theme-exempt: арт-фон приложения — иллюстрация
  aurora: ['rgba(1,2,1,0.40)', 'rgba(1,2,1,0.22)', 'rgba(1,2,1,0.66)'], // theme-exempt: арт-фон приложения — иллюстрация
  volt: ['rgba(1,2,0,0.40)', 'rgba(1,2,0,0.22)', 'rgba(1,2,0,0.66)'], // theme-exempt: арт-фон приложения — иллюстрация
  indigo: ['rgba(3,3,6,0.40)', 'rgba(3,3,6,0.22)', 'rgba(3,3,6,0.66)'], // theme-exempt: арт-фон приложения — иллюстрация
};

const EDGE_SCRIMS: Record<ThemeMode, FourStop> = {
  dark: ['rgba(0,0,0,0.36)', 'rgba(0,0,0,0.10)', 'rgba(0,0,0,0.10)', 'rgba(0,0,0,0.30)'], // theme-exempt: арт-фон приложения — иллюстрация
  gold: ['rgba(0,0,0,0.50)', 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0.42)'], // theme-exempt: арт-фон приложения — иллюстрация
  olive: ['rgba(0,0,0,0.46)', 'rgba(201,168,76,0.025)', 'rgba(201,168,76,0.02)', 'rgba(0,0,0,0.40)'], // theme-exempt: арт-фон приложения — иллюстрация
  sagePorcelain: ['rgba(252,253,249,0.52)', 'rgba(49,95,80,0.03)', 'rgba(49,95,80,0.02)', 'rgba(252,253,249,0.46)'], // theme-exempt: арт-фон приложения — иллюстрация
  midnight: ['rgba(1,1,2,0.46)', 'rgba(1,1,2,0.10)', 'rgba(1,1,2,0.08)', 'rgba(1,1,2,0.42)'], // theme-exempt: арт-фон приложения — иллюстрация
  ember: ['rgba(1,1,1,0.46)', 'rgba(1,1,1,0.10)', 'rgba(1,1,1,0.08)', 'rgba(1,1,1,0.42)'], // theme-exempt: арт-фон приложения — иллюстрация
  aurora: ['rgba(1,2,1,0.46)', 'rgba(1,2,1,0.10)', 'rgba(1,2,1,0.08)', 'rgba(1,2,1,0.42)'], // theme-exempt: арт-фон приложения — иллюстрация
  volt: ['rgba(1,2,0,0.46)', 'rgba(1,2,0,0.10)', 'rgba(1,2,0,0.08)', 'rgba(1,2,0,0.42)'], // theme-exempt: арт-фон приложения — иллюстрация
  indigo: ['rgba(3,3,6,0.46)', 'rgba(200,195,255,0.04)', 'rgba(200,195,255,0.03)', 'rgba(3,3,6,0.42)'], // theme-exempt: арт-фон приложения — иллюстрация
};

function AppArtBackdrop({ name }: { name: AppArtBackdropName }) {
  const { themeMode, liquidGlassThemeId } = useTheme();
  void name;
  // зачем (эмулятор 01.10): затемнения рассчитаны на тёмные темы (чёрный до 68%) — в светлом
  // оформлении 2.0 они превращали светлый фон «Твоих результатов» и экранов на ScreenGradient
  // в мутно-серый. В светлом фон даёт сама тема, затемнение не рисуем.
  if (liquidGlassTokens(liquidGlassThemeId).isLight) return null;

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
