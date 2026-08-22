import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { MAX_CALL_HYBRID } from '../constants/motionHybrid';
import { useReduceMotion } from '../hooks/use_reduce_motion';

/**
 * Ореол экрана MAX-звонка (спека, раздел 6).
 *
 * Зачем так: сцена звонка — единственное место, куда юзер смотрит 5–8 минут
 * подряд на слабом Android. Feather строится настоящими полупрозрачными
 * концентрическими слоями разной плотности, без тяжёлого blur: Reanimated
 * меняет только transform/opacity на UI-потоке, ноль setState в кадре.
 *
 * Три механики:
 *  1) «дыхание» scale 1→1.04/1200мс — оживляет сцену в connecting/thinking;
 *  2) пять alpha-ступеней создают мягкий feather без GPU-blur;
 *  3) пульсы от уровня текущего голоса — визуальный бэкченнел вместо
 *     аудио-поддакиваний ИИ (вербальные бэкченнелы в v1 запрещены): уровень
 *     приходит императивно через ref-колбэк setMicLevel из 250мс-поллинга
 *     статов, НЕ через setState/props — иначе экран рендерился бы от звука.
 *
 * useReduceMotion гасит дыхание и пульсы (укачивающие циклы), оставляя
 * статичные цвета состояния — доступность важнее красоты.
 */

export type MaxCallHaloRef = {
  /**
   * Императивная подача уровня текущего аудио (0..1 или null="нет данных").
   * Зовётся из поллинга pc.getStats() каждые ~250мс — поэтому ref-колбэк,
   * а не prop: экран не должен ре-рендериться от каждого тика уровня.
   */
  setMicLevel: (level: number | null) => void;
};

type MaxCallHaloProps = {
  /** Цвет текущего UI-состояния (из max_call_ui_state → палитра экрана). */
  color: string;
  /** Дыхание включено (connecting/thinking); в остальных фазах ореол статичен. */
  breathing: boolean;
  /** Диаметр центральной зоны (аватара); кольца строятся от него. */
  size?: number;
  /** Аватар персонажа — рисуется хостом, ореол лишь обрамляет. */
  children?: React.ReactNode;
};

/**
 * Ступени настоящего feather: снаружи почти прозрачный широкий свет, к ядру
 * плотность растёт. Перекрытие alpha-слоёв даёт мягкий край без bitmap blur.
 */
const FEATHER_LAYERS = [
  { scale: 1.0, opacity: 0.025 },
  { scale: 0.86, opacity: 0.04 },
  { scale: 0.72, opacity: 0.065 },
  { scale: 0.6, opacity: 0.1 },
  { scale: 0.5, opacity: 0.16 },
] as const;

function clamp01(v: number): number {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export const MaxCallHalo = forwardRef<MaxCallHaloRef, MaxCallHaloProps>(function MaxCallHalo(
  { color, breathing, size = MAX_CALL_HYBRID.coreSize, children },
  ref,
) {
  const reduceMotion = useReduceMotion();
  // Колбэк setMicLevel живёт вне рендера — reduce-motion читаем через ref,
  // чтобы не пересоздавать императивный хендл на каждое изменение настройки.
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;

  const breath = useSharedValue(1);
  const micPulse = useSharedValue(1);

  // Дыхание: бесконечный цикл только когда фаза этого просит и motion разрешён.
  useEffect(() => {
    if (breathing && !reduceMotion) {
      breath.value = withRepeat(
        withSequence(
          withTiming(MAX_CALL_HYBRID.breathScale, {
            duration: MAX_CALL_HYBRID.breathHalfMs,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: MAX_CALL_HYBRID.breathHalfMs, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(breath);
      breath.value = withTiming(1, { duration: MAX_CALL_HYBRID.settleMs });
    }
    return () => {
      cancelAnimation(breath);
    };
  }, [breathing, reduceMotion, breath]);

  useImperativeHandle(
    ref,
    () => ({
      setMicLevel(level: number | null) {
        // Reduce motion / нет данных → кольцо спокойно возвращается к базе.
        if (reduceMotionRef.current || level === null || !Number.isFinite(level)) {
          micPulse.value = withTiming(1, { duration: MAX_CALL_HYBRID.micResetMs });
          return;
        }
        // Оба перехода длиннее 250-мс тика статов: следующие слоги мягко
        // перенаправляют уже идущее движение вместо отдельных толчков.
        const target = 1 + clamp01(level) * MAX_CALL_HYBRID.micPulseMax;
        micPulse.value = withTiming(target, {
          duration: target > micPulse.value ? MAX_CALL_HYBRID.micAttackMs : MAX_CALL_HYBRID.micReleaseMs,
          easing: Easing.inOut(Easing.quad),
        });
      },
    }),
    [micPulse],
  );

  // Вся feather-группа ходит одним transform: один worklet на пять слоёв.
  const outerTransformStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value * micPulse.value }],
  }));
  const coreTransformStyle = useAnimatedStyle(() => {
    const raw = breath.value * micPulse.value;
    return { transform: [{ scale: 1 + (raw - 1) * 0.22 }] };
  });
  const scale = size / MAX_CALL_HYBRID.coreSize;
  const outerSize = Math.round(MAX_CALL_HYBRID.containerSize * scale);
  const outerRingSize = Math.round(MAX_CALL_HYBRID.outerRingSize * scale);
  const innerRingSize = Math.round(MAX_CALL_HYBRID.innerRingSize * scale);

  return (
    <View
      style={{
        width: outerSize,
        height: outerSize,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        style={[
          { position: 'absolute', width: outerSize, height: outerSize },
          outerTransformStyle,
        ]}
      >
        {FEATHER_LAYERS.map((layer, index) => {
          const layerSize = Math.round(outerSize * layer.scale);
          return (
            <View
              key={`feather-${index}`}
              style={{
                position: 'absolute',
                left: (outerSize - layerSize) / 2,
                top: (outerSize - layerSize) / 2,
                width: layerSize,
                height: layerSize,
                borderRadius: layerSize / 2,
                backgroundColor: color,
                opacity: layer.opacity,
              }}
            />
          );
        })}
        <View
          style={{
            position: 'absolute',
            left: (outerSize - outerRingSize) / 2,
            top: (outerSize - outerRingSize) / 2,
            width: outerRingSize,
            height: outerRingSize,
            borderRadius: outerRingSize / 2,
            borderWidth: MAX_CALL_HYBRID.ringStrokePx,
            borderColor: color,
            opacity: MAX_CALL_HYBRID.outerRingOpacity,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: (outerSize - innerRingSize) / 2,
            top: (outerSize - innerRingSize) / 2,
            width: innerRingSize,
            height: innerRingSize,
            borderRadius: innerRingSize / 2,
            borderWidth: MAX_CALL_HYBRID.ringStrokePx,
            borderColor: MAX_CALL_HYBRID.innerRingColor,
            opacity: MAX_CALL_HYBRID.innerRingOpacity,
          }}
        />
      </Animated.View>
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
          },
          coreTransformStyle,
        ]}
      >
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity: MAX_CALL_HYBRID.coreOpacity,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: MAX_CALL_HYBRID.highlightWidth * scale,
            height: MAX_CALL_HYBRID.highlightHeight * scale,
            top: MAX_CALL_HYBRID.highlightTop * scale,
            left: MAX_CALL_HYBRID.highlightLeft * scale,
            borderRadius: MAX_CALL_HYBRID.highlightHeight * scale,
            backgroundColor: '#FFFFFF',
            opacity: MAX_CALL_HYBRID.highlightOpacity,
          }}
        />
        {children}
      </Animated.View>
    </View>
  );
});

/* expo-router route shim: файлы в app/ считаются роутами и требуют default export. */
export default function __RouteShim() {
  return null;
}
