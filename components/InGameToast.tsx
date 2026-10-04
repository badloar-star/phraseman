import React, { memo, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from './ThemeContext';
import { LinearGradient } from './SafeLinearGradient';
import { noAndroidOutline } from '../constants/androidGlow';
import { LUM, TOAST } from '../constants/motionHybrid';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';

/** Минимальный отступ сверху — прежнее поведение на экранах без выреза. */
const TOAST_TOP_MIN = 60;
/** Воздух между системной панелью и тостом, когда вырез есть. */
const TOAST_TOP_GAP = 12;

interface Props {
  message: string | null;
  onHide: () => void;
  duration?: number;
  type?: 'error' | 'info';
  /** Production default — hybrid; explicit `classic` is the rollback/QA path. */
  motionVariant?: 'classic' | 'hybrid';
}

/** Иконка и акцент тона — раньше `type` не влиял на вид (`void type`), баннер про
 * потерянного друга и обычную инфо-подсказку выглядели одинаково. */
// зачем (overlays-runtime OR-TOAST-INGAME-INFO / -ERROR): значок в плитке — «чат» для информации, «крестик» для ошибки.
const TONE_ICON: Record<'error' | 'info', keyof typeof Ionicons.glyphMap> = {
  error: 'close',
  info: 'chatbubble-outline',
};

/** Local passive material; callers, timers, and tone semantics remain unchanged. */
function inGameToastGlassChrome(glass: ReturnType<typeof liquidGlassTokens>) {
  return {
    // `.or-toast`: сплошная графитовая подложка (var(--control)) — контраст не зависит от экрана под тостом.
    surface: glass.opaqueControl,
    tile: glass.opaqueCard,
    sheenColors: [glass.lightTint, 'transparent'] as [string, string],
    accent: glass.cta,
    accentSoft: glass.selected,
    border: glass.glassEdge,
    title: glass.text,
    body: glass.secondary,
    closeBg: glass.selected,
    shadowColor: glass.bg,
    radius: 19,
  };
}

/** One passive surface is shared by both motion variants, so contrast is independent of the screen below. */
function InGameToastSurface({ chrome }: { chrome: ReturnType<typeof inGameToastGlassChrome> }) {
  return (
    <>
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: chrome.surface }]} />
      <LinearGradient
        pointerEvents="none"
        colors={chrome.sheenColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { opacity: 0.12 }]}
      />
    </>
  );
}

/** зачем: гибрид «Световод» (макет T1 «Тосты») — вход из света без отскока
 * (LUM.resolveMs/settle), ошибка получает жёсткую пружину + единственную
 * дрожь TOAST.errorShakePx, выход короче входа (TOAST.exitMs). */
function InGameToastHybrid({
  message,
  type,
  duration,
  onHide,
  chrome,
}: {
  message: string;
  type: 'error' | 'info';
  duration: number;
  onHide: () => void;
  chrome: ReturnType<typeof inGameToastGlassChrome>;
}) {
  // зачем: тост висел на жёстком top:60 и на Android с вырезом/высоким статус-баром
  // уезжал под системную панель («вылазит за рамки экрана», замечание владельца).
  // Отступ берём от безопасной зоны, минимум сохраняем прежним.
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const safeTop = Math.max(TOAST_TOP_MIN, insets.top + TOAST_TOP_GAP);
  const opacity = useSharedValue(0);
  const y = useSharedValue(-14);
  const x = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      y.value = 0;
      x.value = 0;
    } else if (type === 'error') {
      opacity.value = withTiming(1, { duration: TOAST.enterMs, easing: Easing.out(Easing.cubic) });
      y.value = withSpring(0, TOAST.errorSpring);
      x.value = withDelay(
        LUM.resolveMs - 40,
        withSequence(
          ...TOAST.errorShakePx.map((v) => withTiming(v, { duration: TOAST.errorShakeStepMs, easing: Easing.linear })),
        ),
      );
    } else {
      opacity.value = withTiming(1, { duration: TOAST.enterMs, easing: Easing.out(Easing.cubic) });
      y.value = withSpring(0, LUM.settle);
    }
    const timer = setTimeout(() => {
      if (reduceMotion) {
        onHide();
        return;
      }
      opacity.value = withTiming(0, { duration: TOAST.exitMs, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onHide)();
      });
    }, duration);
    return () => {
      clearTimeout(timer);
      cancelAnimation(opacity);
      cancelAnimation(y);
      cancelAnimation(x);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, type, duration, reduceMotion]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }, { translateX: x.value }],
  }));
  const icon = TONE_ICON[type];

  return (
    <View style={[styles.toastAnchor, { top: safeTop }]} pointerEvents="none">
    <Reanimated.View style={[styles.toastCard, { shadowColor: chrome.shadowColor, borderColor: chrome.border }, cardStyle]}>
      <InGameToastSurface chrome={chrome} />
      <View style={styles.hybridRow}>
        <View style={[styles.tile, { backgroundColor: chrome.tile }]}>
          <Ionicons name={icon} size={20} color={chrome.title} />
        </View>
        <Text style={[styles.copy, { color: chrome.title }]}>
          {message}
        </Text>
      </View>
    </Reanimated.View>
    </View>
  );
}

function InGameToast({ message, onHide, duration = 3000, type = 'info', motionVariant = 'hybrid' }: Props) {
  const { liquidGlassThemeId } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const isHybrid = motionVariant === 'hybrid';
  // зачем: тот же фикс безопасной зоны, что в гибриде — жёсткий top:60 уводил
  // тост под системную панель на Android с вырезом.
  const insets = useStableSafeAreaInsets();
  const safeTop = Math.max(TOAST_TOP_MIN, insets.top + TOAST_TOP_GAP);

  useEffect(() => {
    if (!message || isHybrid) return;
    anim.setValue(0);
    let cancelled = false;
    const seq = Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(duration),
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]);
    seq.start(({ finished }) => {
      if (!finished || cancelled) return;
      queueMicrotask(() => {
        onHide();
      });
    });
    return () => {
      cancelled = true;
      seq.stop();
    };
  }, [message, anim, duration, onHide, isHybrid]);

  if (!message) return null;

  const inGameToastGlass = liquidGlassTokens(liquidGlassThemeId);
  const chrome = inGameToastGlassChrome(inGameToastGlass);

  if (isHybrid) {
    return (
      <InGameToastHybrid message={message} type={type} duration={duration} onHide={onHide} chrome={chrome} />
    );
  }

  const icon = TONE_ICON[type];

  return (
    <View style={[styles.toastAnchor, { top: safeTop }]} pointerEvents="none">
      <Animated.View
        pointerEvents="none"
        style={[
        styles.toastCard,
        // зачем: обводка контейнера запрещена стилем владельца — разделяем тоном
        // и тенью; отступ сверху берём от безопасной зоны.
        { shadowColor: chrome.shadowColor, borderColor: chrome.border, opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
      ]}
    >
      <InGameToastSurface chrome={chrome} />
      <View style={styles.classicRow}>
        <View style={[styles.tile, { backgroundColor: chrome.tile }]}>
          <Ionicons name={icon} size={20} color={chrome.title} />
        </View>
        <Text style={[styles.copy, { color: chrome.title }]}>
          {message}
        </Text>
      </View>
      </Animated.View>
    </View>
  );
}

export default memo(InGameToast);

const styles = StyleSheet.create({
  // `.or-toast`: 14 от краёв, высота 58, поля 12/14, радиус 19, зазор 11.
  toastAnchor: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 999999,
  },
  toastCard: {
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    minHeight: 58,
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    // зачем: фон тоста приходит из темы, поэтому Android рисовал квадрат
    // вокруг скругления 16 (elevation 28 делал его особенно заметным).
    shadowOpacity: 0.25,
    shadowRadius: 10,
    ...noAndroidOutline,
  },
  classicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  hybridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  tile: { width: 41, height: 41, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  // `.or-toast-copy` 13/18/680 — цвет текста задаётся ниже через стиль строки.
  copy: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 18, fontWeight: '700' },
});
