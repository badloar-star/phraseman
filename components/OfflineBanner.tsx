// Глобальный баннер «Нет интернета» — тонкая плашка под статус-баром.
// Приложение раньше НИКАК не показывало офлайн: экраны молча отдавали
// устаревший кэш, а действия падали с генерик-«попробуй ещё раз».
// Баннер появляется через пару секунд офлайна (probe в net_status).
//
// Поведение (по просьбе пользователя):
//  - короткий текст «Нет интернета» (без «прогресс сохраняется…»);
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

/** «Нет интернета» на 9 языках — один источник для баннера и экранов без сети (Пик без конфига, решение координатора 15.10). */
export function offlineBannerText(lang: string): string {
  return L(lang, {
    ru: 'Нет интернета',
    uk: 'Немає інтернету',
    en: 'No internet',
    es: 'Sin internet',
    'pt-BR': 'Sem internet',
    vi: 'Không có mạng',
    id: 'Tidak ada internet',
    tr: 'İnternet yok',
    pl: 'Brak internetu',
  });
}

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
        {/* зачем (координатор 18.10, список Сайта; прецедент — интро урока, «свечение текста убери»): на Android dimezis-BlurView без blurTarget снимает экран вместе с текстом панели
            и кладёт размытую копию под него — ореол у текста. На Android живой блюр выключен; тон, вуаль и кромка ниже остаются, iOS как было. */}
        {Platform.OS !== 'android' ? (
          <BlurView intensity={14} blurReductionFactor={3}
          experimentalBlurMethod={'none'}
          tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: cardBg }]} />
        <LinearGradient colors={[tint, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={[styles.surfaceSheen, { backgroundColor: edge }]} />
      </View>
      <View style={styles.surfaceRow}>
        <Ionicons name="cloud-offline-outline" size={20} color={textColor} />
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

// зачем (system-005, макет system.html SYS-02 «Снова в сети»): светлая капсула с галочкой после возврата сети.
// Вход как `@keyframes bin` (translateY −70→0, 480 мс, cubic-bezier(.2,1,.3,1)), 2 с на экране, уход за LUM.exitMs.
const BACK_ONLINE_ENTER_MS = 480;
const BACK_ONLINE_HOLD_MS = 2000;

function BackOnlineBanner({ text, top, onDone }: { text: string; top: number; onDone: () => void }) {
  // зачем (10.10, цвет не от темы): капсула «Снова в сети» — кнопочные цвета выбранной темы (cta/ctaInk); у «Спокойно» это ровно #F2F1F6 / #0B0C0E макета SYS-02.
  const { liquidGlassThemeId } = useTheme();
  const onlineGlass = liquidGlassTokens(liquidGlassThemeId);
  const reduceMotion = useReduceMotion();
  const y = useSharedValue(reduceMotion ? 0 : -70);
  const opacity = useSharedValue(1);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    if (!reduceMotion) {
      y.value = withTiming(0, { duration: BACK_ONLINE_ENTER_MS, easing: Easing.bezier(0.2, 1, 0.3, 1) });
    }
    const hold = setTimeout(() => {
      if (reduceMotion) { onDoneRef.current(); return; }
      y.value = withTiming(-70, { duration: LUM.exitMs, easing: Easing.in(Easing.cubic) });
      opacity.value = withTiming(0, { duration: LUM.exitMs, easing: Easing.in(Easing.cubic) });
    }, (reduceMotion ? 0 : BACK_ONLINE_ENTER_MS) + BACK_ONLINE_HOLD_MS);
    const done = setTimeout(() => onDoneRef.current(), (reduceMotion ? 0 : BACK_ONLINE_ENTER_MS + LUM.exitMs) + BACK_ONLINE_HOLD_MS);
    return () => {
      clearTimeout(hold);
      clearTimeout(done);
      cancelAnimation(y);
      cancelAnimation(opacity);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }] }));
  return (
    <View pointerEvents="none" style={[styles.hybridAnchor, { top }]}>
      <Reanimated.View style={[styles.hybridCard, style]} accessibilityLiveRegion="polite" testID="back-online-banner">
        <View style={[styles.surface, { backgroundColor: onlineGlass.cta }]}>
          <View style={styles.surfaceRow}>
            <Ionicons name="checkmark" size={20} color={onlineGlass.ctaInk} />
            <Text style={[styles.surfaceText, { color: onlineGlass.ctaInk }]}>{text}</Text>
          </View>
        </View>
      </Reanimated.View>
    </View>
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

  // зачем (system-005): был ли офлайн до этого события — только переход offline→online даёт «Снова в сети»,
  // а стартовый unknown→online нет. Пока только лог: что показали бы.
  const wasOfflineRef = useRef(false);
  // Ключ показа «Снова в сети» — один на переход offline→online; null — не показываем.
  const [backOnlineKey, setBackOnlineKey] = useState<number | null>(null);
  useEffect(() => {
    const unsubscribe = subscribeNetStatus((online) => {
      const wasOffline = wasOfflineRef.current;
      wasOfflineRef.current = !online;
      console.warn('[NET-BANNER] status', JSON.stringify({
        online, wasOffline, wouldShowBackOnline: online && wasOffline,
      })); // guard-ok: временная трассировка system-005, только на переход сети
      setOffline(!online);
      // Вернулась сеть — сбрасываем «скрытость», чтобы следующий офлайн показался.
      if (online) setDismissed(false);
      // зачем (system-005): «Снова в сети» — только на реальный переход, не на стартовый unknown→online.
      setBackOnlineKey(online && wasOffline ? Date.now() : null);
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

  if (!visible) {
    if (backOnlineKey === null || offline) return null;
    return (
      <BackOnlineBanner
        key={backOnlineKey}
        top={insets.top + 4}
        text={L(lang, {
          ru: 'Снова в сети', uk: 'Знову в мережі', en: 'Back online', es: 'Conectado de nuevo',
          'pt-BR': 'Conectado de novo', vi: 'Đã kết nối lại', id: 'Kembali online', tr: 'Yeniden çevrimiçi', pl: 'Znowu online',
        })}
        onDone={() => setBackOnlineKey((current) => (current === backOnlineKey ? null : current))}
      />
    );
  }

  const offlineText = offlineBannerText(lang);

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
  // зачем: паритет с макетом system.html SYS-02 — капсула 44pt, радиус 22, значок 20; текст 15/600 → 16 по шкале D145.
  surface: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 22,
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
    gap: 10,
  },
  surfaceText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
