/**
 * FriendsAddSheetShell — нижняя шторка «Добавить друга» по community.html find (макет 04.10).
 *
 * зачем (координатор 05.10): макет 04.10 новее решения владельца 26.07 («окно по центру»), но причину того решения
 * закрываем, а не возвращаем: тогда шторка росла паддингом под клавиатурой и «ездила». Здесь шторка фиксированной
 * высоты по содержимому и при открытой клавиатуре ЦЕЛИКОМ поднимается над ней (поле и кнопка видны), без роста.
 * На Android окно Modal может само сузиться под клавиатуру (adjustResize) — тогда поднимать нечего: подъём считается
 * как «высота клавиатуры минус то, на что уже сузился корень», чтобы не поднять дважды. Все решения — в лог
 * [FRIEND-ADD-SHEET].
 *
 * Вид (kit.css .sheet / .grab / .rb.fill): радиус 28 сверху, поля 12/18/40, кромка 1 px без нижней, ручка 44×5,
 * выезд 440 мс cubic-bezier(.2,1,.3,1), затемнение .6, «закрыть» — крестик в круге 35.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type KeyboardEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  Easing as REasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { KIT_MOTION } from '../../constants/motionHybrid';
import PressableHybrid from '../PressableHybrid';
import { nestedBoxShadow } from '../v2/ShadowSurface';
import { hapticTap } from '../../hooks/use-haptics';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { useLineScale } from '../../hooks/useLineScale';
import { useFriendsGlass } from './FriendsGlassKit';
import SheetSwipeClose, { SheetSwipeRoot } from '../modal_fx/SheetSwipeClose';

const LOG = '[FRIEND-ADD-SHEET]';
// зачем (AGENTS.md Motion п.8): числа шторки — из словаря кита KIT_MOTION (kit.css:147/150), не литералами.
const SHEET_EASE = REasing.bezier(...KIT_MOTION.sheetEase);
const SHEET_IN_MS = KIT_MOTION.sheetMs;
const SHEET_OUT_MS = KIT_MOTION.sheetMs;

interface FriendsAddSheetShellProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  closeLabel: string;
  testID?: string;
  /**
   * Раскладка шапки. 'friends' (по умолчанию) — как утверждено для «Добавить друга». 'kit' — ровно `.flex` макета
   * profile.html PRF-23: по центру, зазор 10, подзаголовок с отступом 7 (`.screen-sub`).
   */
  headerLayout?: 'friends' | 'kit';
  /**
   * зачем (шторка «Язык изучения» PRF-23 с пилюли Видео, 11.10): содержимому иногда нужно закрыть шторку
   * тем же выездом 440 мс после своего действия (выбор строки). Функция получает requestDismiss — анимированное
   * закрытие БЕЗ второй вибрации (строка уже дала отклик). Обычные потребители передают узлы, как раньше.
   */
  children: React.ReactNode | ((controls: { requestDismiss: () => void }) => React.ReactNode);
}

export default function FriendsAddSheetShell({ visible, onClose, title, subtitle, closeLabel, testID, headerLayout = 'friends', children }: FriendsAddSheetShellProps) {
  const kitHeader = headerLayout === 'kit';
  const { glass, textScale } = useFriendsGlass();
  const lh = useLineScale();
  const insets = useStableSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();

  const backdropO = useSharedValue(0);
  const slide = useSharedValue(1); // 1 — за краем экрана, 0 — на месте
  const lift = useSharedValue(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const rootBaseHeightRef = useRef<number | null>(null);
  const [rootHeight, setRootHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    // зачем (ревью TG-3BD963DD05D5, R5): после закрытия затемнение остаётся 0, но повторное открытие должно стартовать
    // с нуля явно, как выезд (slide) — иначе прерванное закрытие начинало бы затемнение с середины.
    backdropO.value = 0;
    backdropO.value = withTiming(1, { duration: KIT_MOTION.dimMs });
    slide.value = 1;
    slide.value = withTiming(0, { duration: SHEET_IN_MS, easing: SHEET_EASE });
  }, [visible, backdropO, slide]);

  // Клавиатура: шторка поднимается целиком на высоту клавиатуры (за вычетом того, что уже съело само окно).
  useEffect(() => {
    if (!visible) return undefined;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: KeyboardEvent) => {
      const h = Math.max(0, Math.round(e.endCoordinates?.height ?? 0));
      if (__DEV__) console.log(LOG, 'keyboard show', JSON.stringify({ keyboardHeight: h, screenY: e.endCoordinates?.screenY ?? null, viewportHeight, platform: Platform.OS }));
      setKeyboardHeight(h);
    };
    const onHide = () => {
      if (__DEV__) console.log(LOG, 'keyboard hide', JSON.stringify({ viewportHeight }));
      setKeyboardHeight(0);
    };
    const s1 = Keyboard.addListener(showEvent, onShow);
    const s2 = Keyboard.addListener(hideEvent, onHide);
    return () => { s1.remove(); s2.remove(); };
  }, [visible, viewportHeight]);

  const onRootLayout = useCallback((e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    setRootHeight(h);
    if (keyboardHeight === 0) rootBaseHeightRef.current = h;
  }, [keyboardHeight]);

  useEffect(() => {
    const base = rootBaseHeightRef.current;
    const shrunkBy = base !== null && rootHeight !== null ? Math.max(0, base - rootHeight) : 0;
    const next = Math.max(0, keyboardHeight - shrunkBy - (keyboardHeight > 0 ? insets.bottom : 0));
    if (__DEV__) console.log(LOG, 'lift', JSON.stringify({ keyboardHeight, rootBase: base, rootHeight, shrunkBy, safeBottom: insets.bottom, lift: next }));
    lift.value = withTiming(next, { duration: keyboardHeight > 0 ? 250 : 200, easing: REasing.out(REasing.cubic) });
  }, [keyboardHeight, rootHeight, insets.bottom, lift]);

  const handleCloseRef = useRef(onClose);
  handleCloseRef.current = onClose;
  const animateOut = useCallback(() => {
    Keyboard.dismiss();
    backdropO.value = withTiming(0, { duration: KIT_MOTION.dimMs });
    slide.value = withTiming(1, { duration: SHEET_OUT_MS, easing: SHEET_EASE }, (finished) => {
      if (finished) runOnJS(handleCloseRef.current)();
    });
  }, [backdropO, slide]);
  const dismiss = useCallback(() => {
    hapticTap();
    animateOut();
  }, [animateOut]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropO.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slide.value * viewportHeight - lift.value }],
  }));

  // Высота по содержимому, но не выше доступного места над клавиатурой (минус верхний отступ).
  const availableAboveKeyboard = viewportHeight - keyboardHeight - insets.top - 12;
  const maxSheetHeight = Math.max(200, Math.min(viewportHeight * 0.9, availableAboveKeyboard));

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <SheetSwipeRoot>
      <View style={styles.root} onLayout={onRootLayout}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel={closeLabel}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>
        {/* зачем (координатор 14.10, «ручка ⇒ свайп»): свайп вниз закрывает шторку тем же dismiss, что фон и крестик; лист едет за пальцем */}
        <SheetSwipeClose name="friends-add" onClose={dismiss}>
        <Animated.View
          testID={testID}
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: glass.opaqueSheet, // зачем (владелец 12.10, стиль «Тень»): без обводки — отделяют тон и малая внешняя тень (шторка)
              paddingBottom: (keyboardHeight > 0 ? 18 : 40) + (keyboardHeight > 0 ? 0 : insets.bottom),
              maxHeight: maxSheetHeight,
            },
            sheetStyle,
          ]}
        >
          <View style={[styles.grab, { backgroundColor: glass.mutedText }]} />
          <View style={[styles.header, kitHeader ? styles.headerKit : null]}>
            <View style={styles.headerCopy}>
              <Text accessibilityRole="header" style={{ color: glass.text, fontSize: 19 * textScale, lineHeight: lh(24 * textScale), fontWeight: '700' }}>{title}</Text>
              {subtitle ? <Text style={{ color: glass.secondary, fontSize: 16 * textScale, lineHeight: lh(21 * textScale), marginTop: kitHeader ? 7 : 4 }}>{subtitle}</Text> : null}
            </View>
            {/* зачем (Motion п.4): кнопка шторки — клавиша PressableHybrid, а не плоское затемнение; вибрацию даёт dismiss. */}
            <PressableHybrid
              testID="friends-add-sheet-close"
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              hitSlop={6}
              variant="icon"
              withHaptic={false}
              withSound={false}
              onPress={dismiss}
              contentStyle={[styles.close, { backgroundColor: glass.opaqueControl, boxShadow: nestedBoxShadow(glass) }]} // зачем (владелец 12.10, стиль «Тень»): без обводки — отделяют тон и малая внешняя тень (круглая кнопка закрытия)
            >
              <Ionicons name="close" size={18} color={glass.text} />
            </PressableHybrid>
          </View>
          <ScrollView
            decelerationRate="fast"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.content}
          >
            {typeof children === 'function' ? children({ requestDismiss: animateOut }) : children}
          </ScrollView>
        </Animated.View>
        </SheetSwipeClose>
      </View>
      </SheetSwipeRoot>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' }, // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  // .grab: 44×5, r3, в 26 над содержимым.
  grab: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 26 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  // kit.css `.flex`: align-items center, gap 10 (шапка шторки PRF-23).
  headerKit: { alignItems: 'center', gap: 10 },
  headerCopy: { flex: 1, minWidth: 0 },
  // .rb.fill: 35, круг, #2A2A2C, кромка --line.
  close: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: 20 },
});
