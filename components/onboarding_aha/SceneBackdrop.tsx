// Кинематографичный фон АХ-сцены: фоновая иллюстрация + виньетка + Ken Burns.
// Контракт: components/onboarding_aha/aha_types.ts
// Дизайн: docs/ONBOARDING_AHA_DESIGN_2026-07-02.md (бит 1 — «сцена въезжает»).

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AHA_BACKGROUNDS } from './aha_assets';
import { AHA_THEME } from './aha_theme';
import type { AhaScenarioId } from './aha_types';

interface SceneBackdropProps {
  scenarioId: AhaScenarioId;
  active: boolean;
}

const KEN_BURNS_MS = 24000;
const FADE_IN_MS = 600;

/** Фон сцены: картинка + виньетка для читаемости текста + однократный Ken Burns. */
export default function SceneBackdrop({ scenarioId, active }: SceneBackdropProps) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const kenBurnsAnim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: FADE_IN_MS,
      useNativeDriver: true,
    }).start();
  }, [fadeIn]);

  useEffect(() => {
    if (!active) {
      kenBurnsAnim.current?.stop();
      return undefined;
    }

    const anim = Animated.parallel([
      Animated.timing(scale, {
        toValue: 1.06,
        duration: KEN_BURNS_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(drift, {
        toValue: -10,
        duration: KEN_BURNS_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    kenBurnsAnim.current = anim;
    anim.start();

    return () => {
      anim.stop();
    };
  }, [active, scale, drift]);

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fadeIn }]}>
      <Animated.Image
        source={AHA_BACKGROUNDS[scenarioId]}
        resizeMode="cover"
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ scale }, { translateY: drift }] },
        ]}
      />

      <LinearGradient
        colors={[AHA_THEME.vignetteTop, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.vignetteTop}
      />
      <LinearGradient
        colors={['transparent', AHA_THEME.vignetteMid, AHA_THEME.vignetteBottom]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.vignetteBottom}
      />

      <View style={[styles.liquidBlob, styles.liquidBlobOne]} />
      <View style={[styles.liquidBlob, styles.liquidBlobTwo]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '38%',
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  liquidBlob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.38,
  },
  liquidBlobOne: {
    width: 260,
    height: 260,
    top: -72,
    left: -72,
    backgroundColor: AHA_THEME.blobBlue,
  },
  liquidBlobTwo: {
    width: 300,
    height: 300,
    right: -130,
    bottom: 80,
    backgroundColor: AHA_THEME.blobViolet,
  },
});
