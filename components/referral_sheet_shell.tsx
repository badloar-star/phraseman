/**
 * ReferralSheetShell — общий каркас нижней шторки раздела «Награда за друга».
 *
 * зачем: владелец схлопнул экраны «Ввести код» и «Как это работает» в шиты
 * поверх единого экрана рефералов — каркас (подложка, выезд, drag-to-dismiss)
 * один, содержимое разное. Паттерн жестов — как в ExplainSheet/RegistrationPromptModal:
 * тяга вниз 1:1, вверх резина ×0.12, закрытие по 88px / velocityY 900.
 *
 * Токены темы; fontWeight только 400/700; без обводок (тон).
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing as REasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { hapticTap } from '../hooks/use-haptics';
import { useKeyboardBottomInset } from './keyboardAvoidance';
import { useTheme } from './ThemeContext';
import TonalSurface from './TonalSurface';

const SHEET_HIDDEN = 320;

interface ReferralSheetShellProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  testID?: string;
  children: React.ReactNode;
}

export default function ReferralSheetShell({
  visible,
  onClose,
  title,
  closeLabel,
  testID,
  children,
}: ReferralSheetShellProps) {
  const { theme: t, f } = useTheme();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { height: viewportHeight } = useWindowDimensions();
  // зачем: владелец (2026-07-25) — раньше KeyboardAvoidingView(padding) двигал ВЕСЬ
  // шит вверх на высоту клавиатуры → шит «прыгал»/уезжал вместо стабильной позиции.
  // Теперь шит остаётся закреплён снизу (justifyContent:'flex-end' в .avoider),
  // а клавиатуре уступает только его нижний паддинг — контент виден, каркас не едет.
  const keyboardBottomInset = useKeyboardBottomInset(visible);

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

  const handleCloseRef = useRef(onClose);
  handleCloseRef.current = onClose;
  const dismissFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (dismissFallbackRef.current) clearTimeout(dismissFallbackRef.current);
  }, []);

  const dismissSheet = useCallback(() => {
    hapticTap();
    backdropO.value = withTiming(0, { duration: 200 });
    sheetOpacity.value = withTiming(0, { duration: 180 });
    // зачем: владелец (2026-07-26) — callback Reanimated приходит с finished=false
    // при отмене, onClose не вызывался и шит «зависал открытым» невидимо (кнопка
    // повторного открытия выглядела мёртвой). JS-страховка закрывает всегда.
    if (dismissFallbackRef.current) clearTimeout(dismissFallbackRef.current);
    dismissFallbackRef.current = setTimeout(() => {
      dismissFallbackRef.current = null;
      handleCloseRef.current();
    }, 320);
    sheetY.value = withTiming(SHEET_HIDDEN, { duration: 240, easing: REasing.out(REasing.cubic) }, (finished) => {
      if (finished) runOnJS(handleCloseRef.current)();
    });
  }, [backdropO, sheetOpacity, sheetY]);

  const closeAfterSwipe = useCallback(() => {
    handleCloseRef.current();
  }, []);

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
              if (finished) runOnJS(closeAfterSwipe)();
            });
          } else {
            dragTranslateY.value = withSpring(0, { damping: 22, stiffness: 300 });
          }
        }),
    [closeAfterSwipe, dragTranslateY, swipeOffDistance],
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropO.value * (1 - Math.min(Math.max(dragTranslateY.value, 0) / 600, 0.5)),
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetY.value + dragTranslateY.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissSheet}>
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissSheet} accessibilityLabel={closeLabel}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <View style={styles.avoider} pointerEvents="box-none">
          <GestureDetector gesture={panGesture}>
            <Animated.View
              testID={testID}
              style={[
                styles.sheet,
                // зачем: паддинг снизу растёт на высоту клавиатуры вместо сдвига
                // всего шита — заголовок/грабер не дёргаются, стабильная позиция.
                { backgroundColor: t.bgCard, paddingBottom: 20 + Math.max(bottomInset, keyboardBottomInset) },
                sheetStyle,
              ]}
            >
              <TonalSurface pointerEvents="none" radius={24} tone="raised" style={StyleSheet.absoluteFillObject} />
              <View style={styles.grabber} pointerEvents="none">
                <View style={[styles.grabberPill, { backgroundColor: t.border }]} />
              </View>
              <View style={styles.header}>
                <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '700', flex: 1 }}>
                  {title}
                </Text>
                <Pressable
                  onPress={dismissSheet}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={closeLabel}
                  style={({ pressed }) => [styles.closeBtn, { backgroundColor: t.bgSurface2, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Ionicons name="close" size={20} color={t.textMuted} />
                </Pressable>
              </View>
              {children}
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  avoider: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    overflow: 'hidden',
  },
  grabber: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  grabberPill: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
