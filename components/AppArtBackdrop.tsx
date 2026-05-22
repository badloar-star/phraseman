import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  useWindowDimensions,
  type EmitterSubscription,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname } from 'expo-router';
import { useTheme } from './ThemeContext';
import type { ThemeMode } from '../constants/theme';
import {
  backgroundTransitionKey,
  usePersistentBackgroundLayers,
} from './backgroundTransition';
import {
  getAppArtBackdropSource,
  resolveAppArtBackdropName,
  type AppArtBackdropName,
} from './appArtBackdropRegistry';

type BackdropConfig = {
  imageOpacity: number;
  imageTranslateX: number;
  scaleStart: number;
  scaleEnd: number;
  motionMs: number;
  verticalScrim: [string, string, string];
  edgeScrim: [string, string, string, string];
};

type ActiveBackdrop = BackdropConfig & {
  key: string;
  source: ReturnType<typeof getAppArtBackdropSource>;
};

const DEFAULT_MOTION_MS = 18000;
const DEFAULT_SCALE_START = 1.18;
const DEFAULT_SCALE_END = 1.14;
const ART_VISIBILITY_BOOST = 1.22;
let lastAppArtBackdrop: ActiveBackdrop | null = null;

function boostedOpacity(opacity: number, name: AppArtBackdropName): number {
  const cap =
    name === 'lessonIntro' ? 0.48 :
    name === 'arenaReady' ? 0.44 :
    name === 'settings' || name === 'friends' || name === 'levelGifts' ? 0.42 :
    0.40;

  return Math.min(cap, opacity * ART_VISIBILITY_BOOST);
}

function softenScrimColor(color: string, factor: number): string {
  return color.replace(/rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/, (_match, r, g, b, a) => {
    const alpha = Math.max(0, Math.min(1, Number.parseFloat(a) * factor));
    return `rgba(${r.trim()},${g.trim()},${b.trim()},${Number(alpha.toFixed(3))})`;
  });
}

function softenScrims<T extends readonly string[]>(colors: T, factor: number): T {
  return colors.map(color => softenScrimColor(color, factor)) as unknown as T;
}

function scrimSofteningFactor(themeMode: ThemeMode, name: AppArtBackdropName): number {
  if (name === 'lessonPractice') return 0.94;
  if (themeMode === 'minimalLight') return 0.90;
  if (name === 'arenaMatch') return 0.88;
  if (name === 'exam' || name === 'diagnosticTest' || name === 'quizzes') return 0.86;
  return 0.84;
}

function opacityFor(themeMode: ThemeMode, name: AppArtBackdropName): number {
  if (name === 'lessonPractice') {
    return themeMode === 'gold' ? 0.10 : themeMode === 'minimalLight' ? 0.075 : 0.085;
  }

  if (name === 'lessonIntro') {
    return themeMode === 'gold' ? 0.42 :
      themeMode === 'minimalLight' ? 0.30 :
      themeMode === 'neon' ? 0.34 :
      themeMode === 'coral' ? 0.36 :
      0.34;
  }

  if (name === 'arenaReady') {
    return themeMode === 'minimalLight' ? 0.24 :
      themeMode === 'minimalDark' ? 0.28 :
      themeMode === 'neon' ? 0.34 :
      themeMode === 'gold' ? 0.38 :
      themeMode === 'coral' ? 0.34 :
      0.32;
  }

  if (name === 'arenaMatch') {
    return themeMode === 'minimalLight' ? 0.17 :
      themeMode === 'minimalDark' ? 0.17 :
      themeMode === 'neon' ? 0.21 :
      themeMode === 'gold' ? 0.27 :
      themeMode === 'coral' ? 0.22 :
      0.20;
  }

  if (name === 'statistics') {
    return themeMode === 'minimalLight' ? 0.18 :
      themeMode === 'minimalDark' ? 0.18 :
      themeMode === 'neon' ? 0.22 :
      themeMode === 'gold' ? 0.30 :
      themeMode === 'coral' ? 0.26 :
      0.20;
  }

  if (name === 'levelGifts') {
    return themeMode === 'minimalLight' ? 0.18 :
      themeMode === 'minimalDark' ? 0.22 :
      themeMode === 'neon' ? 0.27 :
      themeMode === 'gold' ? 0.34 :
      themeMode === 'coral' ? 0.28 :
      0.26;
  }

  if (name === 'home') {
    return themeMode === 'minimalLight' ? 0.16 :
      themeMode === 'minimalDark' ? 0.18 :
      themeMode === 'neon' ? 0.20 :
      themeMode === 'gold' ? 0.30 :
      themeMode === 'coral' ? 0.22 :
      0.24;
  }

  if (name === 'lessons') {
    return themeMode === 'minimalLight' ? 0.17 :
      themeMode === 'minimalDark' ? 0.22 :
      themeMode === 'neon' ? 0.24 :
      themeMode === 'gold' ? 0.34 :
      themeMode === 'coral' ? 0.26 :
      0.28;
  }

  if (name === 'friends') {
    return themeMode === 'minimalLight' ? 0.18 :
      themeMode === 'minimalDark' ? 0.24 :
      themeMode === 'neon' ? 0.26 :
      themeMode === 'gold' ? 0.34 :
      themeMode === 'coral' ? 0.28 :
      0.32;
  }

  if (name === 'settings') {
    return themeMode === 'minimalLight' ? 0.20 :
      themeMode === 'minimalDark' ? 0.24 :
      themeMode === 'neon' ? 0.26 :
      themeMode === 'gold' ? 0.36 :
      themeMode === 'coral' ? 0.30 :
      0.32;
  }

  if (name === 'arena') {
    return themeMode === 'minimalLight' ? 0.16 :
      themeMode === 'gold' ? 0.10 :
      themeMode === 'neon' ? 0.08 :
      0.11;
  }

  const baseOpacity =
    themeMode === 'minimalLight' ? 0.19 :
    themeMode === 'minimalDark' ? 0.18 :
    themeMode === 'neon' ? 0.21 :
    themeMode === 'gold' ? 0.28 :
    themeMode === 'coral' ? 0.23 :
    0.20;

  const multiplier =
    name === 'achievements' ? 1.08 :
    name === 'progressMap' ? 0.96 :
    name === 'quizzes' || name === 'diagnosticTest' || name === 'exam' || name === 'shardsShop' ? 0.78 :
    1;

  return Math.min(0.34, baseOpacity * multiplier);
}

function scrimsFor(themeMode: ThemeMode, name: AppArtBackdropName): Pick<BackdropConfig, 'verticalScrim' | 'edgeScrim'> {
  const isPractice = name === 'lessonPractice';
  const isLessonIntro = name === 'lessonIntro';
  const isArenaReady = name === 'arenaReady';
  const isArenaMatch = name === 'arenaMatch';

  if (themeMode === 'minimalLight') {
    if (isLessonIntro) {
      return {
        verticalScrim: ['rgba(255,252,246,0.24)', 'rgba(255,252,246,0.04)', 'rgba(255,252,246,0.42)'],
        edgeScrim: ['rgba(255,252,246,0.22)', 'rgba(255,252,246,0)', 'rgba(255,252,246,0)', 'rgba(255,252,246,0.18)'],
      };
    }

    if (isPractice) {
      return {
        verticalScrim: ['rgba(255,252,246,0.18)', 'rgba(255,252,246,0.06)', 'rgba(255,252,246,0.24)'],
        edgeScrim: ['rgba(255,252,246,0.18)', 'rgba(255,252,246,0)', 'rgba(255,252,246,0)', 'rgba(255,252,246,0.12)'],
      };
    }

    if (isArenaReady) {
      return {
        verticalScrim: ['rgba(255,252,246,0.34)', 'rgba(255,252,246,0.10)', 'rgba(255,252,246,0.52)'],
        edgeScrim: ['rgba(255,252,246,0.38)', 'rgba(255,252,246,0)', 'rgba(255,252,246,0)', 'rgba(255,252,246,0.30)'],
      };
    }

    if (isArenaMatch) {
      return {
        verticalScrim: ['rgba(255,252,246,0.46)', 'rgba(255,252,246,0.18)', 'rgba(255,252,246,0.62)'],
        edgeScrim: ['rgba(255,252,246,0.46)', 'rgba(255,252,246,0)', 'rgba(255,252,246,0)', 'rgba(255,252,246,0.34)'],
      };
    }

    return {
      verticalScrim: ['rgba(255,252,246,0.40)', 'rgba(255,252,246,0.14)', 'rgba(255,252,246,0.58)'],
      edgeScrim: ['rgba(255,252,246,0.42)', 'rgba(255,252,246,0)', 'rgba(255,252,246,0)', 'rgba(255,252,246,0.30)'],
    };
  }

  if (themeMode === 'gold') {
    if (isLessonIntro) {
      return {
        verticalScrim: ['rgba(0,0,0,0.34)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.60)'],
        edgeScrim: ['rgba(0,0,0,0.24)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.18)'],
      };
    }

    if (isPractice) {
      return {
        verticalScrim: ['rgba(0,0,0,0.18)', 'rgba(0,0,0,0.10)', 'rgba(0,0,0,0.30)'],
        edgeScrim: ['rgba(0,0,0,0.16)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.10)'],
      };
    }

    if (isArenaReady) {
      return {
        verticalScrim: ['rgba(0,0,0,0.48)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.78)'],
        edgeScrim: ['rgba(0,0,0,0.38)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.30)'],
      };
    }

    if (isArenaMatch) {
      return {
        verticalScrim: ['rgba(0,0,0,0.68)', 'rgba(0,0,0,0.54)', 'rgba(0,0,0,0.90)'],
        edgeScrim: ['rgba(0,0,0,0.48)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.38)'],
      };
    }

    return {
      verticalScrim: ['rgba(0,0,0,0.58)', 'rgba(0,0,0,0.40)', 'rgba(0,0,0,0.86)'],
      edgeScrim: ['rgba(0,0,0,0.42)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.30)'],
    };
  }

  if (isLessonIntro) {
    return {
      verticalScrim: ['rgba(0,0,0,0.28)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.48)'],
      edgeScrim: ['rgba(0,0,0,0.20)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.14)'],
    };
  }

  if (isPractice) {
    return {
      verticalScrim: ['rgba(0,0,0,0.14)', 'rgba(0,0,0,0.06)', 'rgba(0,0,0,0.26)'],
      edgeScrim: ['rgba(0,0,0,0.12)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.08)'],
    };
  }

  if (isArenaReady) {
    return {
      verticalScrim: ['rgba(0,0,0,0.42)', 'rgba(0,0,0,0.20)', 'rgba(0,0,0,0.70)'],
      edgeScrim: ['rgba(0,0,0,0.32)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.24)'],
    };
  }

  if (isArenaMatch) {
    return {
      verticalScrim: ['rgba(0,0,0,0.62)', 'rgba(0,0,0,0.46)', 'rgba(0,0,0,0.84)'],
      edgeScrim: ['rgba(0,0,0,0.42)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.32)'],
    };
  }

  return {
    verticalScrim: ['rgba(0,0,0,0.50)', 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.78)'],
    edgeScrim: ['rgba(0,0,0,0.34)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.22)'],
  };
}

function configFor(themeMode: ThemeMode, name: AppArtBackdropName, viewportW: number): BackdropConfig {
  const imageTranslateX =
    name === 'home' ? -Math.round(Math.min(30, Math.max(16, viewportW * 0.052))) :
    name === 'friends' ? -Math.round(Math.min(22, Math.max(10, viewportW * 0.034))) :
    name === 'settings' ? -Math.round(Math.min(16, Math.max(8, viewportW * 0.024))) :
    0;

  const scaleStart = name === 'lessonPractice' ? 1.20 : DEFAULT_SCALE_START;
  const scaleEnd = name === 'lessonPractice' ? 1.16 : DEFAULT_SCALE_END;

  return {
    imageOpacity: boostedOpacity(opacityFor(themeMode, name), name),
    imageTranslateX,
    scaleStart,
    scaleEnd,
    motionMs: name === 'statistics' ? 20000 : DEFAULT_MOTION_MS,
    ...(() => {
      const scrims = scrimsFor(themeMode, name);
      const factor = scrimSofteningFactor(themeMode, name);
      return {
        verticalScrim: softenScrims(scrims.verticalScrim, factor),
        edgeScrim: softenScrims(scrims.edgeScrim, factor),
      };
    })(),
  };
}

function createActiveBackdrop(name: AppArtBackdropName, themeMode: ThemeMode, viewportW: number): ActiveBackdrop {
  const source = getAppArtBackdropSource(name, themeMode);
  const config = configFor(themeMode, name, viewportW);
  const key = `${name}:${themeMode}:${Math.round(viewportW)}:${backgroundTransitionKey(source)}`;

  return {
    key,
    source,
    ...config,
  };
}

export function rememberAppArtBackdrop(name: AppArtBackdropName, themeMode: ThemeMode, viewportW: number) {
  lastAppArtBackdrop = createActiveBackdrop(name, themeMode, viewportW);
}

function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    let sub: EmitterSubscription | undefined;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {});

    try {
      sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    } catch {}

    return () => {
      mounted = false;
      sub?.remove();
    };
  }, []);

  return reduceMotion;
}

function AppArtBackdrop({ name }: { name: AppArtBackdropName }) {
  const { themeMode } = useTheme();
  const { width: viewportW } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const targetBackdrop = useMemo(() => createActiveBackdrop(name, themeMode, viewportW), [name, themeMode, viewportW]);
  const initialBackdropRef = useRef<ActiveBackdrop | null>(null);

  if (initialBackdropRef.current === null && lastAppArtBackdrop && lastAppArtBackdrop.key !== targetBackdrop.key) {
    initialBackdropRef.current = lastAppArtBackdrop;
  }

  const { layers: backdropLayers } = usePersistentBackgroundLayers({
    value: targetBackdrop,
    transitionKey: targetBackdrop.key,
    initialValue: initialBackdropRef.current ?? undefined,
    initialTransitionKey: initialBackdropRef.current?.key,
    disabled: reduceMotion,
  });
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    lastAppArtBackdrop = targetBackdrop;
  }, [targetBackdrop]);

  useEffect(() => {
    drift.stopAnimation();
    drift.setValue(0);

    if (reduceMotion) {
      drift.setValue(1);
      return undefined;
    }

    const motion = Animated.timing(drift, {
      toValue: 1,
      duration: targetBackdrop.motionMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    motion.start();

    return () => motion.stop();
  }, [targetBackdrop.key, targetBackdrop.motionMs, drift, reduceMotion]);

  return (
    <View pointerEvents="none" style={styles.root}>
      {backdropLayers.map(layer => {
        const backdrop = layer.value;
        const layerScale = drift.interpolate({
          inputRange: [0, 1],
          outputRange: [backdrop.scaleStart, backdrop.scaleEnd],
        });
        const imageOpacity = layer.opacity.interpolate({
          inputRange: [0, 1],
          outputRange: [0, backdrop.imageOpacity],
        });

        return (
          <React.Fragment key={layer.id}>
            <Animated.Image
              source={backdrop.source as any}
              resizeMode="cover"
              fadeDuration={0}
              style={[
                styles.image,
                {
                  opacity: imageOpacity,
                  transform: [
                    { scale: layerScale },
                    { translateX: backdrop.imageTranslateX },
                  ],
                },
              ]}
            />
            <Animated.View pointerEvents="none" style={[styles.root, { opacity: layer.opacity }]}>
              <LinearGradient
                colors={backdrop.verticalScrim}
                locations={[0, 0.48, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.root}
              />
              <LinearGradient
                colors={backdrop.edgeScrim}
                locations={[0, 0.20, 0.82, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.root}
              />
            </Animated.View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

function AppRouteArtBackdrop() {
  const pathname = usePathname();
  const name = resolveAppArtBackdropName(pathname);

  return <AppArtBackdrop name={name} />;
}

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
