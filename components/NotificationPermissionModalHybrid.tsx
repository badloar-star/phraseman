/**
 * NotificationPermissionModalHybrid — гибрид «Световод + Чекан» для запроса
 * разрешения на уведомления. Классика — центрированная карточка со scale-spring;
 * гибрид сохраняет каскад «Световод + Чекан», но локально держит центрированную
 * карточку: системный эталон SYS-08 — не нижний sheet.
 * Колбэки — реальные (onConfirm запускает системный permission-flow снаружи),
 * тут только анимация и вёрстка.
 *
 * зачем: владелец (2026-08-15) — переезд семьи на гибрид, подключается ТОЛЬКО
 * через NotificationPermissionModal.motionVariant='hybrid'.
 */
import React, { memo, useCallback, useEffect } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
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
import { useTheme } from './ThemeContext';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { LinearGradient } from './SafeLinearGradient';

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
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
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
        style={[styles.primaryBtn, { backgroundColor: glass.accent }]}
      >
        <Text style={[styles.primaryBtnText, { color: glass.accentInk }]}>{label}</Text>
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
  const { liquidGlassThemeId } = useTheme();
  const insets = useStableSafeAreaInsets();
  const glass = liquidGlassTokens(liquidGlassThemeId);

  const handleCancel = useCallback(() => {
    hapticTap();
    onCancel();
  }, [onCancel]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onCancel}>
      <Pressable onPress={handleCancel} accessible={false} style={[styles.backdrop, { backgroundColor: glass.scrim, paddingTop: Math.max(20, insets.top + 12), paddingBottom: Math.max(20, insets.bottom + 12) }]}>
        <Pressable onPress={(event) => event.stopPropagation()} accessible={false} style={[styles.card, { backgroundColor: glass.sheet, paddingBottom: Math.max(18, insets.bottom + 12) }]}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <BlurView intensity={Platform.OS === 'android' ? 12 : 16} blurReductionFactor={3} experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'} tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: glass.sheet }]} />
            <LinearGradient colors={[glass.selected, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
          </View>
          <ScrollView testID="notification-permission-scroll-content-hybrid" style={styles.scrollContent} contentContainerStyle={styles.scrollContentInner} showsVerticalScrollIndicator={false} bounces={false} decelerationRate="fast">
            <CascadeItem index={0} style={styles.iconRow}>
              {/* зачем: паритет с макетом system.html system_19 — плашка 55pt/r14 на графите, белый колокольчик, без цвета темы. */}
              <View style={[styles.iconWrap, { backgroundColor: glass.opaqueControl }]}>
                <Ionicons name="notifications-outline" size={24} color={glass.text} />
              </View>
            </CascadeItem>

            <CascadeItem index={1}>
              <Text style={[styles.title, { color: glass.text }]}>{title}</Text>
            </CascadeItem>

            {body ? <CascadeItem index={2}><Text style={[styles.body, { color: glass.secondary }]}>{body}</Text></CascadeItem> : null}

            <CascadeItem index={3} style={styles.points}>
              {points.map((p) => (
                <View key={p} style={styles.pointRow}>
                  <Ionicons name="checkmark" size={18} color={glass.text} />
                  <Text style={[styles.pointText, { color: glass.text }]}>{p}</Text>
                </View>
              ))}
            </CascadeItem>
          </ScrollView>

          <CascadeItem index={4} style={styles.footer}>
            <ConfirmButton label={confirmLabel} onPress={onConfirm} testID="notification-permission-confirm" />
            <Pressable
              testID="notification-permission-cancel"
              accessibilityRole="button"
              onPress={handleCancel}
              style={styles.secondaryBtn}
            >
              <Text style={[styles.secondaryBtnText, { color: glass.text }]}>{cancelLabel}</Text>
            </Pressable>
          </CascadeItem>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default memo(NotificationPermissionModalHybrid);

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  card: { width: '100%', maxWidth: 390, maxHeight: '100%', borderRadius: 26, paddingHorizontal: 20, paddingTop: 26, overflow: 'hidden' },
  scrollContent: { width: '100%', flexShrink: 1, minHeight: 0 },
  scrollContentInner: { paddingBottom: 14 },
  iconRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrap: {
    width: 55,
    height: 55,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 27,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 16,
  },
  points: {
    gap: 10,
    marginTop: 6,
    marginBottom: 20,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
  },
  footer: {
    gap: 10,
  },
  primaryBtn: {
    borderRadius: 24,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    shadowColor: '#000000', // theme-exempt: тень кнопки всегда чёрная, не зависит от темы
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    ...noAndroidOutline,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
