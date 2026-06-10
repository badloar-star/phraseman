import React, { useMemo, useEffect } from 'react';
import { useWindowDimensions, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  cancelAnimation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { rubberBand, BOUNCE_SPRING } from './bounceMath';

/**
 * «Резинка» для экранов БЕЗ скролла — В ОБЕ СТОРОНЫ (тяга вниз и вверх).
 *
 * Где контент целиком влезает в экран, скроллить нечего и нативного overscroll
 * нет. Поэтому здесь резинку даёт Pan-жест: тяга в любую сторону сдвигает контент
 * с сопротивлением (формула Apple) и пружинит назад.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * АРХИТЕКТУРА v7 (исправлены баги v1–v6):
 *
 *   • Pan-жест МЕМОИЗИРОВАН (useMemo) — раньше он пересоздавался на каждом
 *     рендере, GestureDetector переустанавливал нативный хэндлер, и жест «залипал»
 *     после нескольких касаний. Теперь объект стабилен.
 *   • Сброс stretch→0 БЕЗУСЛОВНЫЙ на onEnd И onFinalize, плюс cancelAnimation +
 *     обнуление на unmount — застрять смещённым нельзя даже при ремаунте/навигации.
 *   • Обе стороны: тяга вниз (translationY>0) и вверх (translationY<0).
 *
 *   ВАЖНО (Fabric): на экране БЕЗ скролла Pan не конфликтует ни с чем (нативного
 *   ScrollView тут нет), поэтому жест безопасен — в отличие от скролл-экранов, где
 *   мы от Pan отказались полностью (см. BouncyScrollView.tsx v7).
 *
 *   translateY-узел вынесен НАРУЖУ GestureDetector: если <Animated.View
 *   style={animatedStyle}> положить ВНУТРЬ <GestureDetector>, его Wrap клонирует
 *   узел, ремаунтит Reanimated и роняет приложение ("set key `current` on frozen
 *   object").
 *
 * Drop-in: оборачивает контент. Ставить ВНУТРИ фона (SafeAreaView/корневой View),
 * чтобы фон (ScreenGradient) и абсолютные оверлеи/модалки оставались на месте.
 */

export interface BounceViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Высота вьюпорта для формулы сопротивления. По умолчанию — высота экрана. */
  dimension?: number;
  enabled?: boolean;
}

export default function BounceView({
  children,
  style,
  dimension,
  enabled = true,
}: BounceViewProps) {
  const { height: screenH } = useWindowDimensions();
  const dim = dimension ?? screenH;
  const stretch = useSharedValue(0);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activeOffsetY([-10, 10])
        .failOffsetX([-18, 18])
        .onUpdate((e) => {
          'worklet';
          // Обе стороны: сопротивление по модулю смещения, знак сохраняется.
          const sign = e.translationY < 0 ? -1 : 1;
          stretch.value = sign * rubberBand(Math.abs(e.translationY), dim);
        })
        .onEnd(() => {
          'worklet';
          stretch.value = withSpring(0, BOUNCE_SPRING);
        })
        .onFinalize(() => {
          'worklet';
          stretch.value = withSpring(0, BOUNCE_SPRING);
        }),
    [enabled, dim, stretch],
  );

  // Гарантия: при размонтировании/навигации не оставить контент смещённым.
  useEffect(() => {
    return () => {
      cancelAnimation(stretch);
      stretch.value = 0;
    };
  }, [stretch]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: stretch.value }],
  }));

  // translateY-узел СНАРУЖИ GestureDetector — ключ к отсутствию вылетов.
  return (
    <Animated.View style={[style, animatedStyle]}>
      <GestureDetector gesture={pan}>
        <Animated.View style={{ flex: 1 }}>{children}</Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
