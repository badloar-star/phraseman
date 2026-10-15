/**
 * CenteredDialogShell — центрированное окно-диалог поверх экрана.
 *
 * зачем: владелец (2026-07-26) — «Добавить друга» не должен быть нижним шитом,
 * который ездит вместе с клавиатурой. Нужно маленькое окошко ПОСРЕДИ экрана,
 * которое появляется, а клавиатура выезжает под ним и НИКАК его не двигает.
 * Поэтому здесь принципиально нет KeyboardAvoidingView и нет подписки на
 * события клавиатуры — геометрия окна не зависит от неё вообще.
 *
 * Отличие от ReferralSheetShell (нижняя шторка): тот каркас закреплён снизу и
 * растит нижний паддинг под клавиатуру. Его трогать нельзя — на нём живут шиты
 * рефералки, поэтому центрированный вариант вынесен в отдельный компонент.
 *
 * Токены темы; контент скроллится внутри окна, так что появление карточки
 * результата не ломает центрирование.
 *
 * зачем (владелец 2026-09-29): вид 1 в 1 по макету community.html#COM-04-FIND (`.modal.cf-dialog`):
 * стеклянная поверхность темы Liquid Glass (13 тем), радиус 26, поля 20, тонкая 1 px полупрозрачная
 * кромка, заголовок 19/24, «закрыть» — голый крестик 44 dp. Поведение (fade+scale, независимость
 * от клавиатуры, закрытие по подложке) не менялось.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing as REasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { hapticTap } from '../hooks/use-haptics';
import { LinearGradient } from './SafeLinearGradient';
import { FriendsRoundButton, useFriendsGlass } from './friends/FriendsGlassKit';

const DIALOG_WIDTH_RATIO = 0.92;
const DIALOG_MAX_WIDTH = 460;
/** Окно не должно упираться в края даже при открытой клавиатуре и мелком экране. */
const DIALOG_MAX_HEIGHT_RATIO = 0.74;
/**
 * зачем (координатор 01.10, замер на эмуляторе): на коротком экране (<700 dp) центрированное
 * окно уходит под клавиатуру — поле ввода закрыто. Правило владельца «окно не ездит за
 * клавиатурой» соблюдаем: окно по-прежнему неподвижно, просто стоит в верхней трети.
 */
export const SHORT_SCREEN_DP = 700;
const SHORT_SCREEN_TOP_RATIO = 0.1;

interface CenteredDialogShellProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  testID?: string;
  children: React.ReactNode;
}

export default function CenteredDialogShell({
  visible,
  onClose,
  title,
  closeLabel,
  testID,
  children,
}: CenteredDialogShellProps) {
  const { glass, textScale } = useFriendsGlass();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();

  const backdropO = useSharedValue(0);
  const dialogO = useSharedValue(0);
  const dialogScale = useSharedValue(0.94);

  useEffect(() => {
    if (!visible) return;
    // Появление: короткий fade + мягкий scale-up. Без bounce — окно «проявляется»,
    // а не прыгает; ease-out кривая как у системных алертов.
    backdropO.value = withTiming(1, { duration: 180, easing: REasing.out(REasing.cubic) });
    dialogO.value = withTiming(1, { duration: 200, easing: REasing.out(REasing.cubic) });
    dialogScale.value = 0.94;
    dialogScale.value = withTiming(1, { duration: 260, easing: REasing.bezier(0.32, 0.72, 0, 1) });
  }, [visible, backdropO, dialogO, dialogScale]);

  const handleCloseRef = useRef(onClose);
  handleCloseRef.current = onClose;
  // зачем (Макеты 15.10: «[Worklets] Tried to modify key `current` of an object which has been already passed to a worklet» ×2 каждые 0,5 с на «Друзьях»): worklet-коллбэк withTiming раньше брал `handleCloseRef.current` ВНУТРИ себя —
  // ref-объект попадал в worklet и становился неизменяемым, а присваивание `handleCloseRef.current = …` в каждом рендере после первого закрытия писало предупреждение. В worklet уходит стабильная функция, ref остаётся обычным JS-объектом.
  const invokeHandleClose = useCallback(() => { handleCloseRef.current(); }, []);

  const dismissDialog = useCallback(() => {
    hapticTap();
    backdropO.value = withTiming(0, { duration: 160 });
    dialogScale.value = withTiming(0.96, { duration: 160, easing: REasing.in(REasing.cubic) });
    dialogO.value = withTiming(0, { duration: 160 }, (finished) => {
      if (finished) runOnJS(invokeHandleClose)();
    });
  }, [invokeHandleClose, backdropO, dialogO, dialogScale]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropO.value }));
  const dialogStyle = useAnimatedStyle(() => ({
    opacity: dialogO.value,
    transform: [{ scale: dialogScale.value }],
  }));

  const dialogWidth = Math.min(viewportWidth * DIALOG_WIDTH_RATIO, DIALOG_MAX_WIDTH);
  const dialogMaxHeight = viewportHeight * DIALOG_MAX_HEIGHT_RATIO;
  const shortScreen = viewportHeight < SHORT_SCREEN_DP;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissDialog}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissDialog} accessibilityLabel={closeLabel}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        {/* pointerEvents="box-none" — тап мимо окна доходит до подложки и закрывает его. */}
        <View style={[styles.centerer, shortScreen ? { justifyContent: 'flex-start', paddingTop: Math.round(viewportHeight * SHORT_SCREEN_TOP_RATIO) } : null]} pointerEvents="box-none">
          <Animated.View
            testID={testID}
            accessibilityViewIsModal
            style={[
              styles.dialog,
              { backgroundColor: glass.opaqueSheet, width: dialogWidth, maxHeight: dialogMaxHeight },
              dialogStyle,
            ]}
          >
            <LinearGradient pointerEvents="none" colors={[glass.selected, 'transparent']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.header}>
              <Text accessibilityRole="header" style={{ color: glass.text, fontSize: 19 * textScale, lineHeight: 24 * textScale, fontWeight: '700', flex: 1 }}>
                {title}
              </Text>
              <FriendsRoundButton glass={glass} icon="close" bare label={closeLabel} onPress={dismissDialog} size={44} haptic={false} />
            </View>
            {/* зачем: карточка найденного друга заметно растит контент. Скроллим
                ВНУТРИ окна, чтобы окно осталось по центру и не подстраивалось
                под клавиатуру. */}
            <ScrollView decelerationRate="fast"
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {children}
            </ScrollView>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)', // theme-exempt: затемнение под окном — тёмный скрим в любой теме
  },
  centerer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    borderRadius: 26,
    padding: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: -6,
    marginBottom: 6,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 2,
  },
});
