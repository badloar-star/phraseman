import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Image,
  StyleSheet,
  View,
  type AppStateStatus,
  type ImageStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useIsScreenFocused } from '../../hooks/use_is_screen_focused';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { useTheme } from '../ThemeContext';
import { getTournamentThemeAssets } from './tournament_theme_assets';
import { useTournamentPalette } from './tournament_theme';

export type TournamentBackdropVariant =
  | 'hub'
  | 'lobby'
  | 'play'
  | 'table'
  | 'results'
  | 'review'
  | 'season'
  | 'tickets'
  | 'edge';

type Props = Readonly<{ variant: TournamentBackdropVariant }>;

const MOTION_VARIANTS = new Set<TournamentBackdropVariant>(['hub', 'lobby', 'results']);

/** The only content-owned tournament art: the results podium. */
export const TournamentPodiumArt = memo(function TournamentPodiumArt({ style }: { style?: ImageStyle }) {
  const { themeMode } = useTheme();
  const assets = useMemo(() => getTournamentThemeAssets(themeMode), [themeMode]);
  return (
    // зачем 2026-08-03: pointerEvents не является пропом RN Image (он есть
    // только у View) — из-за него ВЕСЬ проект не компилировался и приложение
    // нельзя было запустить даже для проверки. Отключение тапов переехало на
    // обёртку, где оно и должно быть.
    <View pointerEvents="none" style={style}>
      <Image
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        accessible={false} // guard-ok: декоративный арт подиума, смысл несут очки и места рядом
        source={assets.podium}
        resizeMode="contain"
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
});

export const TournamentBackdrop = memo(function TournamentBackdrop({ variant }: Props) {
  const { themeMode } = useTheme();
  const P = useTournamentPalette();
  const assets = useMemo(() => getTournamentThemeAssets(themeMode), [themeMode]);
  const focused = useIsScreenFocused();
  // зачем 2026-08-04 (владелец: «в турнире верхняя сейф-зона другого цвета —
  // убрать, чтобы совпадала с фоном страницы темы»): арт-бэкдроп и sheen
  // раньше шли от самого верха экрана, а градиент выходил на чистый P.bg
  // только к низу — из-за этого полоса статус-бара всегда была светлее/
  // цветнее фона темы. Теперь сейф-зона закрыта сплошным P.bg, а арт
  // начинается ПОД ней, поэтому верх любого экрана турнира = bgPrimary темы.
  const insets = useStableSafeAreaInsets();
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const breathe = useSharedValue(0);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const reduceSubscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      reduceSubscription.remove();
    };
  }, []);

  const motionCapable = MOTION_VARIANTS.has(variant);
  const mayAnimate = motionCapable && focused && reduceMotion === false;

  useEffect(() => {
    if (!mayAnimate) return undefined;
    setAppState(AppState.currentState);
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, [mayAnimate]);

  const motionEnabled = mayAnimate
    && appState === 'active'
    && motionCapable;

  useEffect(() => {
    cancelAnimation(breathe);
    if (!motionEnabled) {
      breathe.value = 0;
      return undefined;
    }
    breathe.value = withRepeat(
      withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(breathe);
    };
  }, [breathe, motionEnabled]);

  const lightStyle = useAnimatedStyle(() => ({
    opacity: 0.08 + breathe.value * 0.1,
  }));
  const quiet = variant === 'play' || variant === 'review';

  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={StyleSheet.absoluteFill}
    >
      {/* Арт и все переливы живут ПОД сейф-зоной — верх остаётся чистым фоном темы. */}
      <View style={[styles.artLayer, { top: insets.top }]}>
        <Image
          accessible={false} // guard-ok: декоративный фон режима, смысл несёт контент поверх
          source={assets.backdrop}
          resizeMode="cover"
          style={[styles.backdrop, quiet && styles.quietBackdrop]}
        />
        <LinearGradient
          colors={quiet
            ? [P.bgGradA, `${P.bg}F2`, P.bg]
            : [`${P.bg}22`, `${P.bg}B8`, P.bg]}
          locations={[0, 0.58, 1]}
          style={StyleSheet.absoluteFill}
        />
        {motionCapable ? (
          <Animated.View style={[styles.light, { backgroundColor: P.sheen }, lightStyle]} />
        ) : null}
      </View>
      {/* Сплошная шапка ровно в цвет страницы: статус-бар не отличается от фона. */}
      <View style={[styles.safeTopCap, { height: insets.top, backgroundColor: P.bg }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  // Слой арта: прижат к низу и краям, сверху отступает на высоту сейф-зоны.
  artLayer: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  safeTopCap: { position: 'absolute', top: 0, left: 0, right: 0 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
    opacity: 0.9,
  },
  quietBackdrop: { opacity: 0.46 },
  light: {
    position: 'absolute',
    top: -80,
    left: -40,
    right: -40,
    height: 320,
    borderBottomLeftRadius: 180,
    borderBottomRightRadius: 180,
  },
});
