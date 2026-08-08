import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
/**
 * AiConsentSheetModal — общий bottom-sheet «Включить [AI-фичу]?» с двумя
 * кнопками (Включить / Не сейчас). Текст — пропами, чтобы разные AI-фичи
 * (разбор ошибок, AI-диалоги, ...) не плодили копии одной и той же анимации/
 * вёрстки. Вынесен из AiExplainConsentModal при добавлении второго
 * потребителя — см. его комментарий для юридического контекста ("зачем
 * вообще этот экран существует").
 *
 * Фирменный дизайн приложения, НЕ системный Alert — reanimated
 * drag-to-dismiss, TonalSurface, glow-градиент (паттерн MistakeEli5Modal).
 * Свайп/фон/системная «назад» трактуются как отказ — тихое закрытие без
 * решения было бы неоднозначным состоянием, а тут нужен явный да/нет.
 */
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing as REasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import TonalSurface from './TonalSurface';
import AiBadge from './AiBadge';
import { noAndroidOutline } from '../constants/androidGlow';

interface Props {
  visible: boolean;
  title: string;
  body: string;
  acceptLabel: string;
  declineLabel: string;
  onAccept: () => void;
  onDecline: () => void;
  testIdPrefix: string;
}

const SHEET_HIDDEN = 320;

function AiConsentSheetModal({ visible, title, body, acceptLabel, declineLabel, onAccept, onDecline, testIdPrefix }: Props) {
  const { theme: t, f } = useTheme();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { height: viewportHeight } = useWindowDimensions();

  const backdropO = useSharedValue(0);
  const sheetY = useSharedValue(SHEET_HIDDEN);
  const sheetOpacity = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    dragTranslateY.value = 0;
    backdropO.value = withTiming(1, { duration: 200, easing: REasing.out(REasing.cubic) });
    sheetY.value = SHEET_HIDDEN;
    sheetOpacity.value = withTiming(1, { duration: 220 });
    sheetY.value = withTiming(0, { duration: 380, easing: REasing.bezier(0.32, 0.72, 0, 1) });
  }, [visible, backdropO, sheetY, sheetOpacity, dragTranslateY]);

  // Решение уже принято здесь (не в dismissSheet) — свайп/фон закрывают ПОСЛЕ
  // выставления состояния, чтобы decline долетел раньше unmount модалки.
  const onDeclineRef = useRef(onDecline);
  onDeclineRef.current = onDecline;

  const dismissAsDecline = useCallback(() => {
    hapticTap();
    onDeclineRef.current();
  }, []);

  const dismissSheet = useCallback(() => {
    backdropO.value = withTiming(0, { duration: 200 });
    sheetOpacity.value = withTiming(0, { duration: 180 });
    sheetY.value = withTiming(SHEET_HIDDEN, { duration: 240, easing: REasing.out(REasing.cubic) }, (finished) => {
      if (finished) runOnJS(dismissAsDecline)();
    });
  }, [backdropO, sheetOpacity, sheetY, dismissAsDecline]);

  const swipeOffDistance = useMemo(() => Math.max(480, viewportHeight * 0.6), [viewportHeight]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(10)
        .failOffsetX([-32, 32])
        .onUpdate((e) => {
          'worklet';
          const ty = e.translationY;
          dragTranslateY.value = ty < 0 ? ty * 0.12 : ty;
        })
        .onEnd((e) => {
          'worklet';
          const shouldClose = dragTranslateY.value > 88 || e.velocityY > 900;
          if (shouldClose) {
            dragTranslateY.value = withTiming(swipeOffDistance, { duration: 260 }, (finished) => {
              if (finished) runOnJS(dismissAsDecline)();
            });
          } else {
            dragTranslateY.value = withSpring(0, { damping: 22, stiffness: 300 });
          }
        }),
    [dismissAsDecline, dragTranslateY, swipeOffDistance],
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropO.value * (1 - Math.min(Math.max(dragTranslateY.value, 0) / 600, 0.5)),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetY.value + dragTranslateY.value }],
  }));

  const handleAccept = useCallback(() => {
    hapticTap();
    backdropO.value = withTiming(0, { duration: 200 });
    sheetOpacity.value = withTiming(0, { duration: 180 });
    sheetY.value = withTiming(SHEET_HIDDEN, { duration: 240, easing: REasing.out(REasing.cubic) }, (finished) => {
      if (finished) runOnJS(onAccept)();
    });
  }, [backdropO, sheetOpacity, sheetY, onAccept]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissSheet}>
      <GestureHandlerRootView style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissSheet}
          accessibilityRole="button"
          accessibilityLabel={declineLabel}
        >
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: t.bgCard,
                shadowColor: t.accent,
                paddingBottom: 20 + bottomInset,
              },
              sheetStyle,
            ]}
          >
            <TonalSurface pointerEvents="none" radius={24} tone="raised" style={StyleSheet.absoluteFillObject} />
            <LinearGradient
              colors={[`${t.accent}1F`, 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.5 }}
              style={styles.sheetGlow}
              pointerEvents="none"
            />

            <View style={styles.grabber} pointerEvents="none">
              <View style={[styles.grabberPill, { backgroundColor: t.border }]} />
            </View>

            <View style={styles.badgeRow}>
              <AiBadge />
            </View>

            <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h3 }]}>
              {title}
            </Text>
            <Text style={[styles.body, { color: t.textSecond, fontSize: f.body }]}>
              {body}
            </Text>

            <Pressable
              testID={`${testIdPrefix}-accept`}
              accessibilityRole="button"
              onPress={handleAccept}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: t.accent, shadowColor: t.accent },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.primaryBtnText, { color: t.correctText, fontSize: f.bodyLg }]}>
                {acceptLabel}
              </Text>
            </Pressable>

            <Pressable
              testID={`${testIdPrefix}-decline`}
              accessibilityRole="button"
              onPress={() => { hapticTap(); onDecline(); }}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            >
              <Text style={[styles.secondaryBtnText, { color: t.textMuted, fontSize: f.body }]}>
                {declineLabel}
              </Text>
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

export default memo(AiConsentSheetModal);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  sheet: {
    width: '100%',
    maxHeight: '86%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 0,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 8,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -6 },
    elevation: 14,
  },
  sheetGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  grabber: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  grabberPill: {
    width: 44,
    height: 5,
    borderRadius: 3,
    opacity: 0.9,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  title: {
    fontWeight: '900',
    lineHeight: 28,
    marginBottom: 10,
  },
  body: {
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 20,
  },
  primaryBtn: {
    borderRadius: 18,
    borderWidth: 0,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    marginBottom: 10,
    ...noAndroidOutline,
  },
  primaryBtnText: {
    fontWeight: '800',
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
  pressed: {
    opacity: 0.78,
  },
});
