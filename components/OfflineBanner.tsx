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

import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
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
import { LUM, TOAST } from '../constants/motionHybrid';
import { hapticSoftImpact, hapticSuccess } from '../hooks/use-haptics';

import { noAndroidOutline } from '../constants/androidGlow';
const AUTO_HIDE_MS = 10_000;

const L = (lang: string, map: Record<string, string>): string =>
  map[lang] ?? map.ru ?? Object.values(map)[0] ?? '';

/**
 * зачем: гибрид «Световод» (макет .motion-mockups/phraseman-hybrid.html,
 * сцена T3 «Оффлайн-баннер»). Персистентный статус: вход из света (y -12→0,
 * LUM.settle, без отскока), затем еле заметное дыхание (opacity 1↔0.82,
 * 1400мс) — ЕДИНСТВЕННЫЙ цикл, гардим useRuntimeActive, чтобы не крутился в
 * фоне (runtime_lifecycle_ratchet). Смена офлайн→снова-в-сети — НА МЕСТЕ
 * (кросс-фейд иконки/текста 180мс, без перевхода), уход короче входа
 * (TOAST.exitMs).
 */
function OfflineBannerHybridCard({
  online,
  offlineText,
  onlineText,
  accentOffline,
  accentOnline,
  cardBg,
  textColor,
  runtimeActive,
}: {
  online: boolean;
  offlineText: string;
  onlineText: string;
  accentOffline: string;
  accentOnline: string;
  cardBg: string;
  textColor: string;
  runtimeActive: boolean;
}) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(-12);
  const breathe = useSharedValue(1);
  const stateOpacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.cubic) });
    y.value = withSpring(0, LUM.settle);
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(y);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Дыхание — единственный цикл этого компонента, крутится только пока
  // экран в фокусе и приложение активно (закон Performance Bible).
  useEffect(() => {
    if (!runtimeActive || online) {
      breathe.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
      return;
    }
    breathe.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(0.82, { duration: 1400, easing: Easing.inOut(Easing.cubic) }),
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(breathe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtimeActive, online]);

  // Кросс-фейд НА МЕСТЕ при возврате сети — не перевход, а смена содержимого.
  useEffect(() => {
    stateOpacity.value = 0;
    stateOpacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });
    return () => cancelAnimation(stateOpacity);
  }, [online]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * breathe.value,
    transform: [{ translateY: y.value }],
  }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: stateOpacity.value }));

  const accent = online ? accentOnline : accentOffline;

  return (
    <Reanimated.View style={[styles.hybridCard, { backgroundColor: cardBg }, cardStyle]}>
      <View style={[styles.hybridSpine, { backgroundColor: accent }]} />
      <Reanimated.View style={[styles.hybridRow, contentStyle]}>
        <Ionicons name={online ? 'checkmark-circle' : 'wifi-outline'} size={18} color={accent} />
        <Text style={[styles.hybridText, { color: textColor }]} numberOfLines={1}>
          {online ? onlineText : offlineText}
        </Text>
      </Reanimated.View>
    </Reanimated.View>
  );
}

interface OfflineBannerProps {
  lang: string;
  /** dev-only: витрина движения запускает гибрид «Световод» рядом с боевым видом. Default 'classic'. */
  motionVariant?: 'classic' | 'hybrid';
}

// lang приходит пропом (не из LangContext): баннер монтируется в _layout,
// где язык уже есть, — так он не зависит от места в дереве провайдеров.
export default function OfflineBanner({ lang, motionVariant = 'classic' }: OfflineBannerProps) {
  const insets = useStableSafeAreaInsets();
  const { theme: t } = useTheme();
  const isHybrid = motionVariant === 'hybrid';
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
  const hide = useRef(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -80, duration: 180, useNativeDriver: true }),
    ]).start(() => setDismissed(true));
  }).current;

  // Жест «смахнуть вверх» для закрытия. В гибриде своя карточка на Reanimated —
  // classic-жест (Animated.Value) ей не подходит, смахивание остаётся дефолтным.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => !isHybrid && Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
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
  ).current;

  useEffect(() => {
    // Гибрид анимирует вход/дыхание сам на Reanimated — classic Animated.Value
    // не участвует, чтобы не задваивать анимацию (тот же приём, что ActionToast).
    if (isHybrid) return;
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
    autoHideRef.current = setTimeout(() => setDismissed(true), AUTO_HIDE_MS);
    return () => {
      if (autoHideRef.current) {
        clearTimeout(autoHideRef.current);
        autoHideRef.current = null;
      }
    };
  }, [isHybrid, visible]);

  if (!visible) return null;

  const offlineText = L(lang, {
    ru: 'Нет соединения',
    uk: 'Немає з’єднання',
    es: 'Sin conexión',
    'pt-BR': 'Sem conexão',
    vi: 'Mất kết nối',
    id: 'Tidak ada koneksi',
    tr: 'Bağlantı yok',
    pl: 'Brak połączenia',
  });

  if (isHybrid) {
    const onlineText = L(lang, {
      ru: 'Снова в сети',
      uk: 'Знову онлайн',
      es: 'De vuelta en línea',
      'pt-BR': 'De volta online',
      vi: 'Đã có mạng trở lại',
      id: 'Kembali online',
      tr: 'Tekrar çevrimiçi',
      pl: 'Znowu online',
    });
    return (
      <View style={[styles.hybridHost, { top: insets.top + 4 }]} pointerEvents="none">
        <OfflineBannerHybridCard
          online={!offline}
          offlineText={offlineText}
          onlineText={onlineText}
          accentOffline={t.wrong}
          accentOnline={t.correct}
          cardBg={t.bgCard}
          textColor={t.textPrimary}
          runtimeActive={runtimeActive}
        />
      </View>
    );
  }

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.banner, { top: insets.top + 4, opacity, transform: [{ translateY }] }]}
    >
      <Text style={styles.text} numberOfLines={1}>
        {offlineText}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    ...noAndroidOutline,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(30, 30, 36, 0.92)',
    alignItems: 'center',
  },
  text: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12.5,
    fontWeight: '600',
  },
  hybridHost: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    alignItems: 'center',
  },
  hybridCard: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 12,
    overflow: 'hidden',
    ...noAndroidOutline,
  },
  hybridSpine: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  hybridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hybridText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
});
