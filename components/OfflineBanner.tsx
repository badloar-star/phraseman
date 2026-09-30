// Глобальный баннер «Нет соединения» — тонкая плашка под статус-баром.
// Приложение раньше НИКАК не показывало офлайн: экраны молча отдавали
// устаревший кэш, а действия падали с генерик-«попробуй ещё раз».
// Баннер появляется через пару секунд офлайна (probe в net_status).
//
// Поведение (по просьбе пользователя):
//  - короткий текст «Нет соединения» (без «прогресс сохраняется…»);
//  - его можно смахнуть вверх, чтобы скрыть;
//  - он сам исчезает через 10 секунд.
// Смахивание/авто-скрытие держатся до возврата сети: при повторном офлайне
// (online→offline) баннер показывается заново.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
// зачем: сырой useSafeAreaInsets отдаёт 0 до прихода нативных метрик и плашка
// прыгала бы вниз; стабильная обёртка знает top-инсет синхронно с первого кадра.
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { subscribeNetStatus } from '../app/net_status';
import { useTheme } from './ThemeContext';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LUM, TOAST } from '../constants/motionHybrid';

import { noAndroidOutline } from '../constants/androidGlow';
import { triLang, type Lang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { LinearGradient } from './SafeLinearGradient';
const AUTO_HIDE_MS = 10_000;

// зачем: единый переводчик проекта (учитывает включённые языки), а не свой
// мини-словарь; проп lang приходит строкой из старого контракта — приводим.
const L = (lang: string, map: Record<string, string>): string =>
  triLang(lang as Lang, map as unknown as Record<Lang, string>);

/**
 * зачем: гибрид «Световод» (макет .motion-mockups/phraseman-hybrid.html,
 * сцена T3 «Оффлайн-баннер»). Персистентный статус: вход из света (y -12→0,
 * LUM.settle, без отскока), затем еле заметное дыхание (opacity 1↔0.82,
 * 1400мс) — ЕДИНСТВЕННЫЙ цикл, гардим useRuntimeActive, чтобы не крутился в
 * фоне (runtime_lifecycle_ratchet). При возврате сети баннер исчезает;
 * отдельного видимого online-состояния у production-вызова нет.
 */
function OfflineBannerSurface({
  offlineText,
  cardBg,
  textColor,
  edge,
  tint,
}: {
  offlineText: string;
  cardBg: string;
  textColor: string;
  edge: string;
  tint: string;
}) {
  return (
    <View style={[styles.surface, { backgroundColor: cardBg }]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <BlurView intensity={Platform.OS === 'android' ? 10 : 14} blurReductionFactor={3}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'}
          tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: cardBg }]} />
        <LinearGradient colors={[tint, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={[styles.surfaceSheen, { backgroundColor: edge }]} />
      </View>
      <View style={styles.surfaceRow}>
        <Ionicons name="wifi-off" size={18} color={textColor} />
        <Text style={[styles.surfaceText, { color: textColor }]}>{offlineText}</Text>
      </View>
    </View>
  );
}

function OfflineBannerHybridCard({
  offlineText,
  cardBg,
  textColor,
  edge,
  tint,
  runtimeActive,
}: {
  offlineText: string;
  cardBg: string;
  textColor: string;
  edge: string;
  tint: string;
  runtimeActive: boolean;
}) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(0);
  const y = useSharedValue(-12);
  const breathe = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      y.value = 0;
      return;
    }
    opacity.value = withTiming(1, { duration: TOAST.enterMs, easing: Easing.out(Easing.cubic) });
    y.value = withSpring(0, LUM.settle);
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(y);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  // Дыхание — единственный цикл этого компонента, крутится только пока
  // экран в фокусе и приложение активно (закон Performance Bible).
  useEffect(() => {
    if (reduceMotion) {
      breathe.value = 1;
      return;
    }
    if (!runtimeActive) {
      breathe.value = withTiming(1, { duration: TOAST.feedbackMs, easing: Easing.out(Easing.cubic) });
      return;
    }
    breathe.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(0.82, { duration: TOAST.idleBreathMs, easing: Easing.inOut(Easing.cubic) }),
          withTiming(1, { duration: TOAST.idleBreathMs, easing: Easing.inOut(Easing.cubic) }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(breathe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, runtimeActive]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * breathe.value,
    transform: [{ translateY: y.value }],
  }));
  return (
    <Reanimated.View style={[styles.hybridCard, cardStyle]}>
      <OfflineBannerSurface offlineText={offlineText} cardBg={cardBg} textColor={textColor} edge={edge} tint={tint} />
    </Reanimated.View>
  );
}

interface OfflineBannerProps {
  lang: string;
  /** Production default — hybrid; explicit `classic` is the rollback/QA path. */
  motionVariant?: 'classic' | 'hybrid';
}

// lang приходит пропом (не из LangContext): баннер монтируется в _layout,
// где язык уже есть, — так он не зависит от места в дереве провайдеров.
export default function OfflineBanner({ lang, motionVariant = 'hybrid' }: OfflineBannerProps) {
  const insets = useStableSafeAreaInsets();
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const isHybrid = motionVariant === 'hybrid';
  const reduceMotion = useReduceMotion();
  const runtimeActive = useRuntimeActive();
  const [offline, setOffline] = useState(false);
  // Локально скрыт (смахнули или прошло 10с). Сбрасывается при возврате сети.
  const [dismissed, setDismissed] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visible = offline && !dismissed;

  useEffect(() => {
    const unsubscribe = subscribeNetStatus((online) => {
      setOffline(!online);
      // Вернулась сеть — сбрасываем «скрытость», чтобы следующий офлайн показался.
      if (online) setDismissed(false);
    });
    return unsubscribe;
  }, []);

  // Плавно смахнуть/скрыть баннер.
  const hide = useCallback(() => {
    if (isHybrid && reduceMotion) {
      setDismissed(true);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -80, duration: 180, useNativeDriver: true }),
    ]).start(() => setDismissed(true));
  }, [isHybrid, opacity, reduceMotion, translateY]);

  // Жест «смахнуть вверх» для закрытия. В гибриде своя карточка на Reanimated —
  // classic-жест (Animated.Value) ей не подходит, смахивание остаётся дефолтным.
  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => {
        // Тянем только вверх (dy < 0), вниз не уводим.
        translateY.setValue(Math.min(0, g.dy));
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy < -24) {
          hide();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
    [hide, translateY],
  );

  useEffect(() => {
    // Гибрид анимирует вход/дыхание сам на Reanimated — classic Animated.Value
    // не участвует, чтобы не задваивать анимацию (тот же приём, что ActionToast).
    if (isHybrid) {
      opacity.setValue(visible ? 1 : 0);
      if (visible) translateY.setValue(0);
      return;
    }
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();

    if (visible) {
      translateY.setValue(0);
      // Авто-скрытие через 10 секунд.
      if (autoHideRef.current) clearTimeout(autoHideRef.current);
      autoHideRef.current = setTimeout(() => { hide(); }, AUTO_HIDE_MS);
    }
    return () => {
      if (autoHideRef.current) {
        clearTimeout(autoHideRef.current);
        autoHideRef.current = null;
      }
    };
  }, [visible, opacity, translateY, hide, isHybrid]);

  // Авто-скрытие через 10с работает одинаково в обеих ветках — планируем отдельно
  // от classic Animated-эффекта, чтобы гибрид не терял таймер.
  useEffect(() => {
    if (!isHybrid || !visible) return;
    if (autoHideRef.current) clearTimeout(autoHideRef.current);
    autoHideRef.current = setTimeout(hide, AUTO_HIDE_MS);
    return () => {
      if (autoHideRef.current) {
        clearTimeout(autoHideRef.current);
        autoHideRef.current = null;
      }
    };
  }, [hide, isHybrid, visible]);

  if (!visible) return null;

  const offlineText = L(lang, {
    ru: 'Нет соединения',
    uk: 'Немає з’єднання',
    en: 'No connection',
    es: 'Sin conexión',
    'pt-BR': 'Sem conexão',
    vi: 'Mất kết nối',
    id: 'Tidak ada koneksi',
    tr: 'Bağlantı yok',
    pl: 'Brak połączenia',
  });

  if (isHybrid) {
    return (
      <View style={[styles.hybridAnchor, { top: insets.top + 4 }]}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.hybridMotion, { opacity, transform: [{ translateY }] }]}
        >
          <OfflineBannerHybridCard
            offlineText={offlineText}
            cardBg={glass.sheet}
            textColor={glass.text}
            edge={glass.glassEdge}
            tint={glass.selected}
            runtimeActive={runtimeActive}
          />
        </Animated.View>
      </View>
    );
  }

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.banner, { top: insets.top + 4, opacity, transform: [{ translateY }] }]}
    >
      <OfflineBannerSurface offlineText={offlineText} cardBg={glass.sheet} textColor={glass.text} edge={glass.glassEdge} tint={glass.selected} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  hybridAnchor: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  hybridMotion: {
    width: '100%',
    alignItems: 'center',
  },
  hybridCard: {
    width: '100%',
  },
  surface: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    overflow: 'hidden',
    ...noAndroidOutline,
  },
  surfaceSheen: {
    position: 'absolute',
    top: 0,
    left: 1,
    right: 1,
    height: 1,
  },
  surfaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  surfaceText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
});
