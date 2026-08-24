/**
 * NotificationPermissionModalHybrid — гибрид «Световод + Чекан» для запроса
 * разрешения на уведомления. Классика — центрированная карточка со scale-spring;
 * гибрид переносит её в общий каркас семьи (HybridSheetShell, подъём из света
 * без отскока) — единая хореография с остальными шитами «Согласия и объяснения».
 * Колбэки — реальные (onConfirm запускает системный permission-flow снаружи),
 * тут только анимация и вёрстка.
 *
 * зачем: владелец (2026-08-15) — переезд семьи на гибрид, подключается ТОЛЬКО
 * через NotificationPermissionModal.motionVariant='hybrid'.
 */
import React, { memo, useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LUM, PRESS } from '../constants/motionHybrid';
import { hapticTap } from '../hooks/use-haptics';
import { noAndroidOutline } from '../constants/androidGlow';
import HybridSheetShell from './modal_fx/HybridSheetShell';
import { useTheme } from './ThemeContext';
import { useReduceMotion } from '../hooks/use_reduce_motion';

interface Props {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  body: string;
  points: string[];
  confirmLabel: string;
  cancelLabel: string;
}

function CascadeItem({ index, style, children }: { index: number; style?: object; children: React.ReactNode }) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const y = useSharedValue(reduceMotion ? 0 : 14);
  const delay = LUM.ladder[Math.min(index, LUM.ladder.length - 1)];

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      y.value = 0;
      return;
    }
    opacity.value = withDelay(delay, withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.cubic) }));
    y.value = withDelay(delay, withSpring(0, LUM.settle));
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(y);
    };
  }, [delay, opacity, reduceMotion, y]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

function ConfirmButton({ label, onPress, testID }: { label: string; onPress: () => void; testID: string }) {
  const { theme: t, f } = useTheme();
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    hapticTap();
    if (reduceMotion) return;
    scale.value = withTiming(PRESS.scale.primary, { duration: PRESS.downMs });
  }, [reduceMotion, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = reduceMotion ? 1 : withSpring(1, PRESS.releasePrimary);
  }, [reduceMotion, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.primaryBtn, { backgroundColor: t.accent, shadowColor: t.accent }]}
      >
        <Text style={[styles.primaryBtnText, { color: t.correctText, fontSize: f.body }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function NotificationPermissionModalHybrid({
  visible,
  onConfirm,
  onCancel,
  title,
  body,
  points,
  confirmLabel,
  cancelLabel,
}: Props) {
  const { theme: t, f } = useTheme();

  const handleCancel = useCallback(() => {
    hapticTap();
    onCancel();
  }, [onCancel]);

  return (
    <HybridSheetShell visible={visible} onClose={onCancel} closeLabel={cancelLabel} testID="notification-permission-sheet">
      <CascadeItem index={0} style={styles.iconRow}>
        <View style={[styles.iconWrap, { backgroundColor: t.accentBg }]}>
          <Ionicons name="notifications-outline" size={26} color={t.accent} />
        </View>
      </CascadeItem>

      <CascadeItem index={1}>
        <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h3 }]}>{title}</Text>
      </CascadeItem>

      <CascadeItem index={2}>
        <Text style={[styles.body, { color: t.textSecond, fontSize: f.body }]}>{body}</Text>
      </CascadeItem>

      <CascadeItem index={3} style={styles.points}>
        {points.map((p) => (
          <View key={p} style={styles.pointRow}>
            <Ionicons name="checkmark-circle" size={16} color={t.correct} />
            <Text style={[styles.pointText, { color: t.textMuted, fontSize: f.sub }]}>{p}</Text>
          </View>
        ))}
      </CascadeItem>

      <CascadeItem index={4} style={styles.footer}>
        <ConfirmButton label={confirmLabel} onPress={onConfirm} testID="notification-permission-confirm" />
        <Pressable
          testID="notification-permission-cancel"
          accessibilityRole="button"
          onPress={handleCancel}
          style={styles.secondaryBtn}
        >
          <Text style={[styles.secondaryBtnText, { color: t.textMuted, fontSize: f.body }]}>{cancelLabel}</Text>
        </Pressable>
      </CascadeItem>
    </HybridSheetShell>
  );
}

export default memo(NotificationPermissionModalHybrid);

const styles = StyleSheet.create({
  iconRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    lineHeight: 22,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 16,
  },
  points: {
    gap: 8,
    marginBottom: 20,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointText: {
    flex: 1,
  },
  footer: {
    gap: 10,
  },
  primaryBtn: {
    borderRadius: 18,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    ...noAndroidOutline,
  },
  primaryBtnText: {
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontWeight: '700',
  },
});
