import React, { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { hapticTap } from '../hooks/use-haptics';

/**
 * Узел карты Learning V2 — «плоский объём» в духе Duolingo.
 *
 * зачем (решение владельца 2026-08-22, макет 25-learning-v2-motion-catalog):
 * узлы карты — объёмные кнопки: цельная яркая площадка и сплошной цоколь того
 * же цвета темнее, видимый снизу. Без градиентов, бликов и рамок (запрет
 * обводок). Нажатие опускает площадку на цоколь целиком; закрытый узел мягко
 * «прожимается» (scale 1→.96→1, 240мс) вместо мёртвого тапа в пустоту.
 *
 * Цоколь = цвет площадки + 32% чёрного поверх — так узлы автоматически слушают
 * активную тему интерфейса без ручных копий палитр (второе решение владельца).
 *
 * Дыхание гало текущего узла (2400мс, spec mock 08) гейтится пропом `active`:
 * lessons.tsx передаёт сюда результат useRuntimeActive(ownerVisible) — таб
 * «Уроки» живёт внутри общего роутного экрана, и это единственный честный
 * сигнал видимости. Неактивный или reduce-motion режим держит гало статичным.
 */

const PLATE_H = 6;
const PRESS_MS = 120;
const DENIAL_HALF_MS = 120;
const HALO_MS = 2400;
const PRESS_EASE = Easing.bezier(0.23, 1, 0.32, 1);

export type LearningV2MapNodeStateV1 = 'completed' | 'current' | 'next' | 'locked';

interface Props {
  state: LearningV2MapNodeStateV1;
  width: number;
  height: number;
  radius: number;
  faceColor: string;
  /** Цвет дыхания текущего узла (theme.accent); гало рисуется только у current. */
  haloColor?: string;
  /** Узел можно открыть (current/completed); иначе тап даёт «спокойный отказ». */
  accessible: boolean;
  /** Гейт бесконечного гало: useRuntimeActive(ownerVisible) со стороны lessons.tsx. */
  active: boolean;
  reduceMotion: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  /** Центр узла в оконных координатах в момент перехода next/current → completed
   *  — старт полёта звёзд в баланс (сцена A5, выбор владельца «чип в шапке»). */
  onCompletedTransition?: (point: { x: number; y: number }) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children: React.ReactNode;
}

export const LearningV2MapNode = memo(function LearningV2MapNode({
  state,
  width,
  height,
  radius,
  faceColor,
  haloColor,
  accessible,
  active,
  reduceMotion,
  accessibilityLabel,
  onPress,
  onCompletedTransition,
  style,
  testID,
  children,
}: Props) {
  const rootRef = useRef<View>(null);
  const pressY = useSharedValue(0);
  const denialScale = useSharedValue(1);
  const popScale = useSharedValue(1);
  const halo = useSharedValue(0);
  const showHalo = state === 'current' && Boolean(haloColor);
  const previousState = useRef<LearningV2MapNodeStateV1 | null>(null);

  // зачем: возвращение из пройденной сессии меняет состояния узлов на месте —
  // спека mock 08 требует «выстрел» нового current (scale .7→1.1→1, 420мс) и
  // мягкую посадку узла, ставшего done. Pop только на СМЕНЕ состояния после
  // маунта: вход строк уже анимирует LearningV2InlineNodeReveal.
  useEffect(() => {
    const prev = previousState.current;
    previousState.current = state;
    if (prev === null || prev === state || reduceMotion) return;
    if (state === 'current') {
      popScale.value = 0.7;
      popScale.value = withSequence(
        withTiming(1.1, { duration: 230, easing: PRESS_EASE }),
        withTiming(1, { duration: 190, easing: PRESS_EASE }),
      );
    } else if (state === 'completed') {
      popScale.value = withSequence(
        withTiming(1.08, { duration: 150, easing: PRESS_EASE }),
        withTiming(1, { duration: 170, easing: PRESS_EASE }),
      );
      if (active && onCompletedTransition) {
        rootRef.current?.measureInWindow((x, y, w, h) => {
          onCompletedTransition({ x: x + w / 2, y: y + h / 2 });
        });
      }
    }
  }, [active, onCompletedTransition, popScale, reduceMotion, state]);

  useEffect(() => {
    if (!showHalo) return undefined;
    if (!active || reduceMotion) {
      // Статичный кадр: гало видно, но не работает в фоне/при reduce motion.
      cancelAnimation(halo);
      halo.value = 0.4;
      return undefined;
    }
    halo.value = 0;
    halo.value = withRepeat(
      withSequence(
        withTiming(1, { duration: HALO_MS / 2, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: HALO_MS / 2, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(halo);
  }, [active, halo, reduceMotion, showHalo]);

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressY.value }, { scale: denialScale.value }],
  }));
  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: popScale.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: (0.55 + halo.value * 0.45) * 0.3,
    transform: [{ scale: 1 + halo.value * 0.14 }],
  }));

  const pressIn = () => {
    if (!accessible) return;
    hapticTap();
    pressY.value = withTiming(PLATE_H, {
      duration: reduceMotion ? 1 : PRESS_MS,
      easing: PRESS_EASE,
    });
  };
  const pressOut = () => {
    if (!accessible) return;
    pressY.value = withTiming(0, {
      duration: reduceMotion ? 1 : PRESS_MS,
      easing: PRESS_EASE,
    });
  };
  const press = () => {
    if (!accessible) {
      hapticTap();
      if (!reduceMotion) {
        denialScale.value = withSequence(
          withTiming(0.96, { duration: DENIAL_HALF_MS, easing: PRESS_EASE }),
          withTiming(1, { duration: DENIAL_HALF_MS, easing: PRESS_EASE }),
        );
      }
    }
    onPress();
  };

  return (
    <Pressable
      ref={rootRef}
      collapsable={false}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !accessible }}
      hitSlop={6}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={press}
      testID={testID}
      style={[{ width, height: height + PLATE_H }, style]}
    >
      <Animated.View style={[styles.body, popStyle]}>
        {showHalo ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.halo,
              {
                left: -10,
                right: -10,
                top: -10,
                bottom: PLATE_H - 10,
                borderRadius: radius + 10,
                backgroundColor: haloColor,
              },
              haloStyle,
            ]}
          />
        ) : null}
        <View
          pointerEvents="none"
          style={[
            styles.plate,
            { top: PLATE_H, height, borderRadius: radius, backgroundColor: faceColor },
          ]}
        >
          <View style={styles.plateShade} />
        </View>
        <Animated.View
          style={[
            styles.face,
            { height, borderRadius: radius, backgroundColor: faceColor },
            faceStyle,
          ]}
        >
          {children}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  body: { flex: 1 },
  halo: { position: 'absolute' },
  plate: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  // Цоколь: тот же цвет площадки, затемнённый постоянной чёрной вуалью —
  // работает с любым форматом цвета темы без разбора hex.
  plateShade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.32)' },
  face: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LearningV2MapNode;
