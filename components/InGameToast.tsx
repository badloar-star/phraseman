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

interface Props {
  message: string | null;
  onHide: () => void;
  duration?: number;
  type?: 'error' | 'info';
  /** dev-only: витрина движения запускает гибрид «Световод» рядом с боевым видом. Default 'classic'. */
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
  const opacity = useSharedValue(0);
  const y = useSharedValue(-14);
  const x = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    opacity.value = withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.cubic) });
    if (type === 'error') {
      y.value = withSpring(0, TOAST.errorSpring);
      x.value = withDelay(
        LUM.resolveMs - 40,
        withSequence(
          ...TOAST.errorShakePx.map((v) => withTiming(v, { duration: TOAST.errorShakeStepMs, easing: Easing.linear })),
        ),
      );
    } else {
      y.value = withSpring(0, LUM.settle);
    }
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: TOAST.exitMs, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished && !cancelled) {
          runOnJSHide();
        }
      });
    }, duration);
    // Reanimated worklet callback runs off the JS thread on Fabric; queueMicrotask
    // hands control back safely, matching the classic path's dismiss timing style.
    function runOnJSHide() {
      queueMicrotask(() => {
        if (!cancelled) onHide();
      });
    }
    return () => {
      cancelled = true;
      clearTimeout(timer);
      cancelAnimation(opacity);
      cancelAnimation(y);
      cancelAnimation(x);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, type, duration]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }, { translateX: x.value }],
  }));
  const icon = TONE_ICON[type];

  return (
    <Reanimated.View style={[styles.toast, { shadowColor: chrome.shadowColor }, cardStyle]} pointerEvents="none">
      <LinearGradient colors={chrome.cardColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      <View style={styles.hybridRow}>
        <Ionicons name={icon} size={18} color={chrome.accent} />
        <Text style={{ flex: 1, color: chrome.title, fontSize: f.body, fontWeight: '700', textAlign: 'left' }}>
          {message}
        </Text>
      </View>
    </Reanimated.View>
  );
}

function InGameToast({ message, onHide, duration = 3000, type = 'info', motionVariant = 'classic' }: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const isHybrid = motionVariant === 'hybrid';

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
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        { borderColor: chrome.border, shadowColor: chrome.shadowColor, opacity: anim,
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
  );
}

export default memo(InGameToast);

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
    zIndex: 999999,
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
