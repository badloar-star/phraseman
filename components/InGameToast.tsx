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
import { themedToastChrome } from '../constants/themedToastChrome';
import { noAndroidOutline } from '../constants/androidGlow';
import { LUM, TOAST } from '../constants/motionHybrid';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { useReduceMotion } from '../hooks/use_reduce_motion';

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
const TONE_ICON: Record<'error' | 'info', keyof typeof Ionicons.glyphMap> = {
  error: 'alert-circle',
  info: 'information-circle',
};

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
  chrome: ReturnType<typeof themedToastChrome>;
}) {
  const { f } = useTheme();
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
    <Reanimated.View style={[styles.toastCard, { shadowColor: chrome.shadowColor }, cardStyle]}>
      <LinearGradient colors={chrome.cardColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      <View style={styles.hybridRow}>
        <Ionicons name={icon} size={18} color={chrome.accent} />
        <Text style={{ flex: 1, color: chrome.title, fontSize: f.body, fontWeight: '700', textAlign: 'left' }}>
          {message}
        </Text>
      </View>
    </Reanimated.View>
    </View>
  );
}

function InGameToast({ message, onHide, duration = 3000, type = 'info', motionVariant = 'hybrid' }: Props) {
  const { theme: t, f, themeMode } = useTheme();
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

  const chrome = themedToastChrome(themeMode, t);

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
        { shadowColor: chrome.shadowColor, opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
      ]}
    >
      <LinearGradient colors={chrome.cardColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      <View style={styles.classicRow}>
        <Ionicons name={icon} size={18} color={chrome.accent} />
        <Text style={{ flex: 1, color: chrome.title, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>
          {message}
        </Text>
      </View>
      </Animated.View>
    </View>
  );
}

export default memo(InGameToast);

const styles = StyleSheet.create({
  toastAnchor: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 999999,
  },
  toastCard: {
    borderRadius: 16,
    overflow: 'hidden',
    paddingVertical: 14,
    paddingHorizontal: 20,
    // зачем: фон тоста приходит из темы, поэтому Android рисовал квадрат
    // вокруг скругления 16 (elevation 28 делал его особенно заметным).
    shadowOpacity: 0.25,
    shadowRadius: 10,
    ...noAndroidOutline,
  },
  classicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  hybridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
