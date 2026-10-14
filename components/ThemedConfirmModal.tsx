import { BlurView } from 'expo-blur';
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { LinearGradient } from './SafeLinearGradient';
import { Animated, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Reanimated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from './ThemeContext';
import { hapticTap, hapticWarning } from '../hooks/use-haptics';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import HybridAlertShell, { CascadeItem } from './modal_fx/HybridAlertShell';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LUM, TOAST } from '../constants/motionHybrid';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';

const EXEMPT_COLOR_3 = '#000000'; // theme-exempt: красная плашка макета system_23 для тёмного оформления; тень и затемнение окна — постоянные

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  /** JSX alternative to message — use when you need inline images/icons */
  messageNode?: React.ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** Accent confirm button (e.g. go to shop) */
  confirmVariant?: 'default' | 'accent';
  testIDPrefix?: string;
  /** Production default — hybrid; explicit `classic` is the rollback/QA path. */
  motionVariant?: 'classic' | 'hybrid';
  /** Деструктивное действие (например, «Удалить») — на подтверждение играет
   * одна дрожь TOAST.errorShakePx (макет M1: «приглушённый тон + дрожь»). */
  destructive?: boolean;
};

function ThemedConfirmModal({
  visible,
  title,
  message,
  messageNode,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  confirmVariant = 'accent',
  testIDPrefix,
  motionVariant = 'hybrid',
  destructive = false,
}: Props) {
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const isHybrid = motionVariant === 'hybrid';
  const shakeX = useSharedValue(0);

  useEffect(() => {
    return () => cancelAnimation(shakeX);
  }, [shakeX]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const runDangerShake = () => {
    if (!isHybrid || !destructive || reduceMotion) return;
    const [a, b, c, d, e] = TOAST.errorShakePx;
    shakeX.value = withSequence(
      withTiming(a, { duration: TOAST.errorShakeStepMs }),
      withTiming(b, { duration: TOAST.errorShakeStepMs }),
      withTiming(c, { duration: TOAST.errorShakeStepMs }),
      withTiming(d, { duration: TOAST.errorShakeStepMs }),
      withTiming(e, { duration: TOAST.errorShakeStepMs }),
    );
  };
  const panelBackground = Platform.OS === 'android' ? glass.opaqueSheet : glass.sheet;
  // зачем: паритет с макетом system.html system_23 — «Удалить» это приглушённо-красная плашка (#3A1E1C) с коралловым
  // текстом (#FF8C82). Эти значения рассчитаны на тёмный графит; в светлой теме берём красные роли темы.
  // зачем (владелец 13.10, №35 «никакие кнопки чтобы не сливались» + «все модалы слушаются тему»): заливки — токены кнопок темы (dangerFill/dangerInk, ctaFill, buttonFill),
  // а не зашитые #3A1E1C/#FF8C82 и не selected/opaqueControl (давали 1,0–1,3 : 1 к шторке). Образец Макетов: опасная #6A2A25 / текст #FFC2BB.
  const confirmBackground = destructive
    ? glass.dangerFill
    : confirmVariant === 'accent'
      ? glass.ctaFill
      : glass.buttonFill;
  const confirmForeground = destructive
    ? glass.dangerInk
    : confirmVariant === 'accent'
      ? glass.ctaInk
      : glass.text;

  // Свайп-вниз по карточке = закрыть (в дополнение к тапу по фону и кнопке
  // «Отмена»). Лёгкая версия на встроенном PanResponder — без reanimated и
  // gesture-handler, чтобы не тащить тяжёлую машинерию в общий компонент.
  // Тянем только вниз; отпустил ниже порога/резким движением — закрыли, иначе
  // карточка пружинит назад.
  const dragY = useRef(new Animated.Value(0)).current;

  // Сброс позиции при каждом открытии — иначе после закрытия свайпом карточка
  // осталась бы «уехавшей» вниз на следующем показе.
  useEffect(() => {
    if (visible) dragY.setValue(0);
  }, [visible, dragY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Перехватываем жест только на явном вертикальном движении вниз, чтобы
        // не мешать нажатиям на кнопки внутри карточки.
        onMoveShouldSetPanResponder: (_evt, g) =>
          g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_evt, g) => {
          // Только вниз (вверх не тянем — чуть-чуть сопротивления, если дёрнули вверх).
          dragY.setValue(g.dy > 0 ? g.dy : g.dy * 0.12);
        },
        onPanResponderRelease: (_evt, g) => {
          const shouldClose = g.dy > 90 || g.vy > 1.2;
          if (shouldClose) {
            Animated.timing(dragY, {
              toValue: 600,
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              hapticTap();
              onCancel();
            });
          } else {
            Animated.spring(dragY, {
              toValue: 0,
              damping: 16,
              stiffness: 180,
              mass: 0.9,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragY, {
            toValue: 0,
            damping: 16,
            stiffness: 180,
            mass: 0.9,
            useNativeDriver: true,
          }).start();
        },
      }),
    [dragY, onCancel],
  );

  const panelContent = (
    <Reanimated.View style={[styles.panelShell, isHybrid ? shakeStyle : undefined]}>
      <LinearGradient
        testID={testIDPrefix ? `${testIDPrefix}-modal` : undefined}
        colors={[panelBackground, panelBackground]}
        style={styles.panel}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <BlurView
            intensity={Platform.OS === 'android' ? 12 : 22}
            blurReductionFactor={3}
            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'}
            tint="systemUltraThinMaterialDark"
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: glass.sheet }]} />
          <LinearGradient
            colors={[glass.selected, 'transparent']}
            start={{ x: 0.04, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false} decelerationRate="fast"
        >
          <CascadeItem delay={isHybrid ? LUM.ladder[2] : 0} reduceMotion={!isHybrid || reduceMotion}>
            <Text accessibilityRole="header" style={[styles.title, { color: glass.text }, !message && !messageNode ? styles.titleAlone : null]}>
              {title}
            </Text>
          </CascadeItem>
          <CascadeItem delay={isHybrid ? LUM.ladder[2] + 96 : 0} reduceMotion={!isHybrid || reduceMotion}>
            {messageNode ? (
              <View style={styles.messageNode}>{messageNode}</View>
            ) : message ? (
              <Text style={[styles.message, { color: glass.secondary }]}>
                {message}
              </Text>
            ) : null}
          </CascadeItem>
          <CascadeItem delay={isHybrid ? LUM.ladder[2] + 192 : 0} reduceMotion={!isHybrid || reduceMotion}>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                testID={testIDPrefix ? `${testIDPrefix}-cancel` : undefined}
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
                accessibilityState={{ disabled: false }}
                activeOpacity={0.76}
                onPress={() => {
                  hapticTap();
                  onCancel();
                }}
                style={[styles.action, { backgroundColor: glass.buttonFill }]}
              >
                <Text style={[styles.actionLabel, { color: glass.text }]}>
                  {cancelLabel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID={testIDPrefix ? `${testIDPrefix}-confirm` : undefined}
                accessibilityRole="button"
                accessibilityLabel={confirmLabel}
                accessibilityState={{ disabled: false }}
                activeOpacity={0.82}
                onPress={() => {
                  if (isHybrid && destructive) {
                    hapticWarning();
                    runDangerShake();
                  } else {
                    hapticTap();
                  }
                  onConfirm();
                }}
                style={[styles.action, { backgroundColor: confirmBackground }]}
              >
                <Text style={[styles.actionLabel, { color: confirmForeground }]}>
                  {confirmLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </CascadeItem>
        </ScrollView>
      </LinearGradient>
    </Reanimated.View>
  );

  // Hybrid keeps the shared dismissal state machine; classic keeps the
  // established backdrop, Android Back, and swipe-down rollback path.
  if (isHybrid) {
    return (
      <HybridAlertShell
        visible={visible}
        onRequestClose={onCancel}
        scrollContent={false}
        shadowColor={EXEMPT_COLOR_3}
        testID={testIDPrefix ? `${testIDPrefix}-modal-hybrid` : 'themed-confirm-modal-hybrid'}
      >
        {panelContent}
      </HybridAlertShell>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        accessible={false}
        onPress={() => {
          hapticTap();
          onCancel();
        }}
        style={[
          styles.classicBackdrop,
          {
            paddingTop: Math.max(24, insets.top),
            paddingBottom: Math.max(24, insets.bottom),
            paddingLeft: Math.max(16, insets.left),
            paddingRight: Math.max(16, insets.right),
          },
        ]}
      >
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.classicPanel, { transform: [{ translateY: dragY }] }]}
        >
          <Pressable
            accessible={false}
            accessibilityViewIsModal
            importantForAccessibility="yes"
            onPress={(event) => event.stopPropagation()}
            style={styles.panelShell}
          >
            {panelContent}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panelShell: { width: '100%', maxHeight: '100%' },
  panel: { width: '100%', maxHeight: '100%', borderRadius: 26, overflow: 'hidden' },
  scroll: { flexShrink: 1, minHeight: 0 },
  content: { paddingHorizontal: 20, paddingTop: 26, paddingBottom: 20 },
  title: { fontSize: 21, lineHeight: 27, fontWeight: '700', textAlign: 'center' },
  titleAlone: { marginBottom: 20 },
  // зачем (system.html `.modal .mb` 15/21): шкала D145 — текст под заголовком 16/22.
  message: { fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 8, marginBottom: 20 },
  messageNode: { marginTop: 8, marginBottom: 20 },
  confirmActions: { flexDirection: 'row', gap: 12, marginTop: 0 }, // зачем (Макеты 854d5866c, №35): зазор между кнопками >= 12 (было 10)
  action: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // `.cta` 17 в ките; шкала D145 — 16, как во всех окнах 2.0.
  actionLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  classicBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)', // theme-exempt: красная плашка макета system_23 для тёмного оформления; тень и затемнение окна — постоянные
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  classicPanel: { width: '100%', maxWidth: 360, maxHeight: '100%' },
});

export default memo(ThemedConfirmModal);
