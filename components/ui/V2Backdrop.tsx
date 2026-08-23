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
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useIsScreenFocused } from '../../hooks/use_is_screen_focused';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { useTheme } from '../ThemeContext';
import { TABBAR_HYBRID } from '../../constants/motionHybrid';
import { getTournamentThemeAssets } from './v2_theme_assets';
import { useTournamentPalette } from './v2_theme';

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

type Props = Readonly<{
  variant: TournamentBackdropVariant;
  /**
   * Закрывать ли сейф-зону сверху сплошным цветом фона.
   *
   * В турнирах так и было задумано: статус-бар не отличается от страницы.
   * В Арене владелец (2026-08-13) увидел ровно это и назвал ошибкой: «вверху
   * где сейф-зона просто чёрная полоса, а надо как на главной». На главной
   * фон идёт под статус-бар целиком, поэтому Арена просит `false`.
   */
  capSafeTop?: boolean;
}>;

// Lobby/results may breathe while focused. The Arena hub gets a short entrance
// shimmer instead: it keeps the approved light character without a permanent
// full-screen compositor loop behind the animated hub content.
const MOTION_VARIANTS = new Set<TournamentBackdropVariant>(['lobby', 'results']);

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

export const TournamentBackdrop = memo(function TournamentBackdrop({ variant, capSafeTop = true }: Props) {
  const { themeMode } = useTheme();
  const P = useTournamentPalette();
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

  const loopingMotionCapable = MOTION_VARIANTS.has(variant) && themeMode !== 'olive';
  const entryMotionCapable = variant === 'hub' && themeMode !== 'olive';
  const motionCapable = loopingMotionCapable || entryMotionCapable;
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
    breathe.value = entryMotionCapable
      ? withSequence(
        withTiming(1, { duration: TABBAR_HYBRID.hubEntry.backdropInMs, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: TABBAR_HYBRID.hubEntry.backdropOutMs, easing: Easing.inOut(Easing.quad) }),
      )
      : withRepeat(
        withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    return () => {
      cancelAnimation(breathe);
    };
  }, [breathe, entryMotionCapable, motionEnabled]);

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
      {/* Арт и переливы: либо под сейф-зоной (турниры), либо во весь экран,
          если шапку не закрывают (Арена — как на главной). */}
      <View style={[styles.artLayer, { top: capSafeTop ? insets.top : 0 }]}>
        {/* зачем 2026-08-23 (владелец: «удали фон-ассеты арены и импорты»):
            картинка-подложка темы убрана — фон держат сплошной P.bg экрана
            и градиент поверх. Минус одна полноэкранная декодированная
            текстура на КАЖДОМ экране Арены: меньше памяти и быстрее первый
            кадр, геометрия слоя не меняется (лэйаут стабилен). */}
        <LinearGradient
          colors={quiet
            ? [P.bgGradA, `${P.bg}F2`, P.bg]
            : [`${P.bg}22`, `${P.bg}B8`, P.bg]}
          locations={[0, 0.58, 1]}
          style={StyleSheet.absoluteFill}
        />
        {motionCapable ? (
          /*
            зачем 2026-08-23 (владелец: «на арене цвет сейф-зоны вверху
            отличается от цвета экрана»): sheen начинался на 80px ВЫШЕ верха
            экрана и накрывал сейф-зону акцентным свечением. При
            capSafeTop=false (Арена) шапка от этого была другого оттенка, чем
            страница. Теперь пятно стартует ПОД сейф-зоной — верх экрана
            остаётся ровно P.bg, а свечение живёт в контенте, как и задумано.
          */
          <Animated.View style={[styles.light, { top: (capSafeTop ? 0 : insets.top) - 80, backgroundColor: P.sheen }, lightStyle]} />
        ) : null}
      </View>
      {/* Сплошная шапка ровно в цвет страницы: статус-бар не отличается от фона. */}
      {capSafeTop ? <View style={[styles.safeTopCap, { height: insets.top, backgroundColor: P.bg }]} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  // Слой арта: прижат к низу и краям, сверху отступает на высоту сейф-зоны.
  artLayer: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  safeTopCap: { position: 'absolute', top: 0, left: 0, right: 0 },
  light: {
    position: 'absolute',
    left: -40,
    right: -40,
    height: 320,
    borderBottomLeftRadius: 180,
    borderBottomRightRadius: 180,
  },
});
