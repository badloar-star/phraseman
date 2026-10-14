/**
 * Шторка пейвола, которую можно смахнуть вниз за шапку.
 *
 * зачем (координатор 14.10, 🔴 «закрыл предложение купить — всё зависло», Сверка WB-4): на шторке нарисована «ручка», которая
 * обещает свайп, а маршрут пейвола идёт с gestureEnabled:false. Свайп ничего не делал, касания под шторкой не проходили,
 * и человек закрывал приложение целиком. Теперь сдвиг за шапку > 88 px или быстрый рывок вниз закрывает шторку тем же путём,
 * что крестик (onSwipeClose → handleClose('close')); короткий сдвиг возвращается пружиной. Закон жеста — как у HybridSheetShell.
 *
 * Это НЕ входная анимация: сдвиг стартует с 0, первый кадр шторки финальный (paywall_navigation_smooth_contract).
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing as REasing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { KIT_MOTION, SHEET } from '../../constants/motionHybrid';

/** Сдвиг вниз, после которого шторка закрывается (как HybridSheetShell). */
export const PAYWALL_SWIPE_CLOSE_DISTANCE = 88;
/** Скорость рывка вниз, после которой шторка закрывается (как HybridSheetShell). */
export const PAYWALL_SWIPE_CLOSE_VELOCITY = 900;

type Props = {
  readonly testID?: string;
  readonly style: StyleProp<ViewStyle>;
  /** false — во время оплаты и на экране напоминания: свайп не закрывает. */
  readonly enabled: boolean;
  /** Высота окна — докуда уезжает шторка при закрытии. */
  readonly travel: number;
  /** Вызывается после того, как шторка уехала вниз. */
  readonly onSwipeClose: (dy: number) => void;
  /** Шапка с «ручкой» — за неё тянут. */
  readonly header: React.ReactNode;
  readonly children: React.ReactNode;
};

export function PaywallSwipeSheet({ testID, style, enabled, travel, onSwipeClose, header, children }: Props) {
  const dragY = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const onSwipeCloseRef = useRef(onSwipeClose);
  onSwipeCloseRef.current = onSwipeClose;
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (fallbackRef.current) clearTimeout(fallbackRef.current); }, []);

  const finishClose = useCallback((dy: number) => {
    onSwipeCloseRef.current(dy);
    // зачем: если закрытие не состоялось (замок повторного тапа и т. п.), шторка не должна остаться невидимой поверх приложения —
    // через секунду возвращаем её на место. Обычный путь — размонтирование — отменяет таймер.
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
    fallbackRef.current = setTimeout(() => {
      console.warn('[WINBACK-FREEZE] sheet swipe_close_not_dismissed → шторка возвращена на место'); // guard-ok: ранний выход логируется
      dragY.value = withSpring(0, SHEET.dragReturn);
    }, KIT_MOTION.sheetMs + 600);
  }, [dragY]);

  const startClose = useCallback((dy: number) => {
    if (reduceMotion) { finishClose(dy); return; }
    dragY.value = withTiming(
      travel,
      { duration: KIT_MOTION.sheetMs, easing: REasing.bezier(KIT_MOTION.sheetEase[0], KIT_MOTION.sheetEase[1], KIT_MOTION.sheetEase[2], KIT_MOTION.sheetEase[3]) },
      () => { runOnJS(finishClose)(dy); },
    );
  }, [dragY, finishClose, reduceMotion, travel]);

  const pan = useMemo(() => Gesture.Pan()
    .enabled(enabled)
    .activeOffsetY(10)
    .failOffsetX([-32, 32])
    .onUpdate((e) => {
      'worklet';
      const ty = e.translationY;
      dragY.value = ty < 0 ? ty * 0.12 : ty;
    })
    .onEnd((e) => {
      'worklet';
      const dy = dragY.value;
      if (dy > PAYWALL_SWIPE_CLOSE_DISTANCE || e.velocityY > PAYWALL_SWIPE_CLOSE_VELOCITY) {
        runOnJS(startClose)(dy);
      } else {
        dragY.value = reduceMotion ? 0 : withSpring(0, SHEET.dragReturn);
      }
    }), [dragY, enabled, reduceMotion, startClose]);

  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));

  return (
    <Animated.View testID={testID} style={[style, dragStyle]}>
      <GestureDetector gesture={pan}>
        <View collapsable={false}>{header}</View>
      </GestureDetector>
      {children}
    </Animated.View>
  );
}
