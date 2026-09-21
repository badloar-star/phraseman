import React, { memo, useCallback, useEffect, useRef } from 'react';
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

/**
 * Пульсирующее гало текущего узла.
 *
 * зачем: useAnimatedStyle для гало выполнялся в КАЖДОМ узле карты, хотя гало
 * бывает только у текущего — то есть 2047 узлов из 2048 платили за маппер
 * Reanimated впустую (аудит 20.09). Вынесено в отдельный компонент: хук
 * существует ровно там, где гало реально рисуется.
 *
 * 21.09 сюда же переехали само shared value и его бесконечный цикл: раньше
 * их создавал родитель, то есть мост JS↔UI всё равно заводился у каждого
 * узла. Теперь у гало нет следа за пределами текущего узла.
 */
function LearningV2MapNodeHalo({
  radius,
  color,
  active,
  reduceMotion,
}: Readonly<{ radius: number; color: string; active: boolean; reduceMotion: boolean }>) {
  const halo = useSharedValue(0);
  useEffect(() => {
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
  }, [active, halo, reduceMotion]);
  const haloStyle = useAnimatedStyle(() => ({
    opacity: (0.55 + halo.value * 0.45) * 0.3,
    transform: [{ scale: 1 + halo.value * 0.14 }],
  }));
  return (
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
          backgroundColor: color,
        },
        haloStyle,
      ]}
    />
  );
}

type NodePressHandlers = Readonly<{
  pressIn: () => void;
  pressOut: () => void;
  denial: () => void;
}>;

/**
 * Анимированная «начинка» узла: нажатие, отказ и pop при смене состояния.
 *
 * зачем: владелец 21.09 — «экран при быстром скролле всё равно не успевает
 * рисоваться». Замер по коду: КАЖДЫЙ узел создавал 4 useSharedValue и
 * 3 useAnimatedStyle, хотя анимации нужны далеко не всем. Закрытый узел не
 * нажимается и не меняет состояние — он платил за мосты JS↔UI и
 * worklet-мапперы впустую, а на карте 2048 узлов.
 *
 * Хуки нельзя вызывать условно, поэтому тяжёлая часть живёт здесь и
 * монтируется только там, где реально нужна (см. needsMotion ниже).
 */
function LearningV2MapNodeMotion({
  state,
  height,
  radius,
  faceColor,
  accessible,
  active,
  reduceMotion,
  onCompletedTransition,
  rootRef,
  registerPress,
  children,
}: Readonly<{
  state: LearningV2MapNodeStateV1;
  height: number;
  radius: number;
  faceColor: string;
  accessible: boolean;
  active: boolean;
  reduceMotion: boolean;
  onCompletedTransition?: (point: { x: number; y: number }) => void;
  rootRef: React.RefObject<View | null>;
  registerPress: (handlers: NodePressHandlers | null) => void;
  children: React.ReactNode;
}>) {
  const pressY = useSharedValue(0);
  const denialScale = useSharedValue(1);
  const popScale = useSharedValue(1);
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
  }, [active, onCompletedTransition, popScale, reduceMotion, rootRef, state]);

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressY.value }, { scale: denialScale.value }],
  }));
  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: popScale.value }],
  }));

  // Обработчики отдаём наружу: Pressable остаётся в родителе, поэтому узел
  // нажимается и без этой начинки (у статичных она не монтируется вовсе).
  useEffect(() => {
    registerPress({
      pressIn: () => {
        if (!accessible) return;
        pressY.value = withTiming(PLATE_H, {
          duration: reduceMotion ? 1 : PRESS_MS,
          easing: PRESS_EASE,
        });
      },
      pressOut: () => {
        if (!accessible) return;
        pressY.value = withTiming(0, {
          duration: reduceMotion ? 1 : PRESS_MS,
          easing: PRESS_EASE,
        });
      },
      denial: () => {
        if (reduceMotion) return;
        denialScale.value = withSequence(
          withTiming(0.96, { duration: DENIAL_HALF_MS, easing: PRESS_EASE }),
          withTiming(1, { duration: DENIAL_HALF_MS, easing: PRESS_EASE }),
        );
      },
    });
    return () => registerPress(null);
  }, [accessible, denialScale, pressY, reduceMotion, registerPress]);

  return (
    <Animated.View style={[styles.body, popStyle]}>
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
  );
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
  const pressHandlersRef = useRef<NodePressHandlers | null>(null);
  const registerPress = useCallback((handlers: NodePressHandlers | null) => {
    pressHandlersRef.current = handlers;
  }, []);
  const showHalo = state === 'current' && Boolean(haloColor);

  // зачем (владелец 21.09, «не успевает рисоваться»): анимационная начинка
  // монтируется ТОЛЬКО там, где её видно. Закрытый узел статичен — он не
  // нажимается, не меняет состояние на глазах и не имеет гало, поэтому
  // остаётся обычной вёрсткой без единого моста в UI-поток.
  // reduceMotion гасит анимации целиком — тогда начинка не нужна вообще.
  const needsMotion = !reduceMotion && (accessible || showHalo);

  const pressIn = () => {
    if (!accessible) return;
    hapticTap();
    pressHandlersRef.current?.pressIn();
  };
  const pressOut = () => {
    pressHandlersRef.current?.pressOut();
  };
  const press = () => {
    if (!accessible) {
      hapticTap();
      pressHandlersRef.current?.denial();
    }
    onPress();
  };

  const halo = showHalo ? (
    <LearningV2MapNodeHalo
      radius={radius}
      color={haloColor as string}
      active={active}
      reduceMotion={reduceMotion}
    />
  ) : null;

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
      {/* зачем: гало рисуется ПОД кружком — оно лежит первым в разметке.
          Поставить его после узла нельзя: absolute-слой перекрыл бы лицо
          кружка, и иконка с номером ушли бы под свечение. */}
      {halo}
      {needsMotion ? (
        <LearningV2MapNodeMotion
          state={state}
          height={height}
          radius={radius}
          faceColor={faceColor}
          accessible={accessible}
          active={active}
          reduceMotion={reduceMotion}
          onCompletedTransition={onCompletedTransition}
          rootRef={rootRef}
          registerPress={registerPress}
        >
          {children}
        </LearningV2MapNodeMotion>
      ) : (
        <View style={styles.body}>
          <View
            pointerEvents="none"
            style={[
              styles.plate,
              { top: PLATE_H, height, borderRadius: radius, backgroundColor: faceColor },
            ]}
          >
            <View style={styles.plateShade} />
          </View>
          <View
            style={[
              styles.face,
              { height, borderRadius: radius, backgroundColor: faceColor },
            ]}
          >
            {children}
          </View>
        </View>
      )}
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
