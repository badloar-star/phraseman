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
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { KIT_MOTION } from '../constants/motionHybrid';
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
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette'; // зачем: шит «Код от друга» на токенах стекла (overlays-more, ReferralCodeSheet)

// зачем (координатор 10.10, гейт «приложение = макет»): движение шторки — kit.css `.sheet`: 440 мс cubic-bezier(.2,1,.3,1) в обе стороны,
// затемнение 260 мс; шторка стартует за нижним краем экрана без выцветания (как общий HybridSheetShell).
const SHEET_HIDDEN = Dimensions.get('window').height;
type SheetEase = ReturnType<typeof REasing.bezier>; // зачем: Easing.bezier в Reanimated возвращает фабрику, а не функцию (tsc)
let sheetEaseCache: SheetEase | null = null;
// зачем: кривая создаётся лениво — тесты с урезанным мок-Reanimated (без Easing.bezier) не должны падать при загрузке модуля.
const sheetEase = (): SheetEase => {
  if (!sheetEaseCache) sheetEaseCache = REasing.bezier(KIT_MOTION.sheetEase[0], KIT_MOTION.sheetEase[1], KIT_MOTION.sheetEase[2], KIT_MOTION.sheetEase[3]);
  return sheetEaseCache;
};

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
  const { f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
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
    backdropO.value = withTiming(1, { duration: KIT_MOTION.dimMs, easing: REasing.ease });
    sheetY.value = SHEET_HIDDEN;
    sheetOpacity.value = 1;
    sheetY.value = withTiming(0, { duration: KIT_MOTION.sheetMs, easing: sheetEase() });
  }, [visible, backdropO, sheetY, sheetOpacity, dragTranslateY]);

  const handleCloseRef = useRef(onClose);
  handleCloseRef.current = onClose;
  // зачем (Макеты 15.10: «[Worklets] Tried to modify key `current` of an object which has been already passed to a worklet» ×2 каждые 0,5 с на «Друзьях»): worklet-коллбэк withTiming раньше брал `handleCloseRef.current` ВНУТРИ себя —
  // ref-объект попадал в worklet и становился неизменяемым, а присваивание `handleCloseRef.current = …` в каждом рендере после первого закрытия писало предупреждение. В worklet уходит стабильная функция, ref остаётся обычным JS-объектом.
  const invokeHandleClose = useCallback(() => { handleCloseRef.current(); }, []);
  const dismissFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (dismissFallbackRef.current) clearTimeout(dismissFallbackRef.current);
  }, []);

  const dismissSheet = useCallback(() => {
    hapticTap();
    backdropO.value = withTiming(0, { duration: KIT_MOTION.dimMs, easing: REasing.ease });
    // зачем: владелец (2026-07-26) — callback Reanimated приходит с finished=false
    // при отмене, onClose не вызывался и шит «зависал открытым» невидимо (кнопка
    // повторного открытия выглядела мёртвой). JS-страховка закрывает всегда.
    if (dismissFallbackRef.current) clearTimeout(dismissFallbackRef.current);
    dismissFallbackRef.current = setTimeout(() => {
      dismissFallbackRef.current = null;
      handleCloseRef.current();
    }, KIT_MOTION.sheetMs + 80);
    sheetY.value = withTiming(SHEET_HIDDEN, { duration: KIT_MOTION.sheetMs, easing: sheetEase() }, (finished) => {
      if (finished) runOnJS(invokeHandleClose)();
    });
  }, [invokeHandleClose, backdropO, sheetOpacity, sheetY]);

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
                { backgroundColor: glass.opaqueSheet, paddingBottom: 20 + Math.max(bottomInset, keyboardBottomInset) },
                sheetStyle,
              ]}
            >
              <View style={styles.grabber} pointerEvents="none">
                <View style={[styles.grabberPill, { backgroundColor: glass.glassEdge }]} />
              </View>
              <View style={styles.header}>
                {/* зачем (overlay-more.css `.om-title`): заголовок 25/31 по центру шторки; слева запас под ширину крестика, чтобы центр не съезжал. */}
                <Text style={{ color: glass.text, fontSize: 25, lineHeight: 31, fontWeight: '800', flex: 1, textAlign: 'center', marginLeft: 56 }}>
                  {title}
                </Text>
                <Pressable
                  onPress={dismissSheet}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={closeLabel}
                  style={({ pressed }) => [styles.closeBtn, { backgroundColor: glass.selected, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Ionicons name="close" size={20} color={glass.secondary} />
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
    backgroundColor: 'rgba(0,0,0,0.55)', // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме
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
    // зачем (R1_DIFF_ONE_FIX, overlays-campaigns-016…026, решение координатора 12.10): «✕» шторки справа, как в образце referral-code-states. Заголовок идёт ПЕРВЫМ ребёнком, поэтому
    // row-reverse ставил крестик слева, а marginLeft: 56 у заголовка сдвигал его вправо; в обычном `row` крестик справа, а 56 слева уравновешивают ширину крестика (центр заголовка = центр шторки).
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
