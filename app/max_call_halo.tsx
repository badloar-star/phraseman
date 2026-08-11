import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../hooks/use_reduce_motion';

/**
 * Ореол экрана MAX-звонка (спека, раздел 6).
 *
 * Зачем так: сцена звонка — единственное место, куда юзер смотрит 5–8 минут
 * подряд на слабом Android, поэтому здесь запрещено всё тяжёлое: никаких
 * svg/блюров/теней/анимаций layout-свойств. Только два концентрических View
 * с borderRadius и Reanimated-анимации transform:scale + цвет — они целиком
 * живут на UI-потоке, ноль setState в кадре.
 *
 * Три механики:
 *  1) «дыхание» scale 1→1.04/1200мс — оживляет сцену в connecting/thinking;
 *  2) цвет состояния — interpolateColor ТОЛЬКО на переходах (200–250мс),
 *     между переходами цвет статичен и не жуёт кадры;
 *  3) «кивки»-пульсы от уровня микрофона — визуальный бэкченнел вместо
 *     аудио-поддакиваний ИИ (вербальные бэкченнелы в v1 запрещены): уровень
 *     приходит императивно через ref-колбэк setMicLevel из 100мс-поллинга
 *     статов, НЕ через setState/props — иначе 10 рендеров экрана в секунду.
 *
 * useReduceMotion гасит дыхание и пульсы (укачивающие циклы), оставляя
 * статичные цвета состояния — доступность важнее красоты.
 */

export type MaxCallHaloRef = {
  /**
   * Императивная подача уровня микрофона (0..1 или null="нет данных").
   * Зовётся из поллинга pc.getStats() каждые ~100мс — поэтому ref-колбэк,
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

/** Насколько «кивок» может раздуть кольцо при максимальной громкости речи. */
const MIC_PULSE_MAX = 0.06;
/** Дыхание: амплитуда и период из спеки (1→1.04 за 1200мс в одну сторону). */
const BREATH_SCALE = 1.04;
const BREATH_HALF_MS = 1200;
/** Смена цвета состояния: один withTiming на переход (200–250мс по спеке). */
const COLOR_TRANSITION_MS = 240;

function clamp01(v: number): number {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export const MaxCallHalo = forwardRef<MaxCallHaloRef, MaxCallHaloProps>(function MaxCallHalo(
  { color, breathing, size = 96, children },
  ref,
) {
  const reduceMotion = useReduceMotion();
  // Колбэк setMicLevel живёт вне рендера — reduce-motion читаем через ref,
  // чтобы не пересоздавать императивный хендл на каждое изменение настройки.
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;

  const breath = useSharedValue(1);
  const micPulse = useSharedValue(1);
  // Пара цветов + прогресс: interpolateColor гоняется только пока progress
  // едет 0→1 на переходе состояния; в покое style стабилен.
  const fromColor = useSharedValue(color);
  const toColor = useSharedValue(color);
  const colorProgress = useSharedValue(1);

  // Дыхание: бесконечный цикл только когда фаза этого просит и motion разрешён.
  useEffect(() => {
    if (breathing && !reduceMotion) {
      breath.value = withRepeat(
        withSequence(
          withTiming(BREATH_SCALE, { duration: BREATH_HALF_MS, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: BREATH_HALF_MS, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(breath);
      breath.value = withTiming(1, { duration: 200 });
    }
    return () => {
      cancelAnimation(breath);
    };
  }, [breathing, reduceMotion, breath]);

  // Цвет состояния: interpolateColor ТОЛЬКО на переходе — прошлый целевой цвет
  // становится исходным, прогресс перезапускается. Reduce motion не блокирует
  // смену цвета (это информация, не движение) — просто без анимации.
  useEffect(() => {
    if (toColor.value === color) return;
    if (reduceMotionRef.current) {
      fromColor.value = color;
      toColor.value = color;
      colorProgress.value = 1;
      return;
    }
    fromColor.value = toColor.value;
    toColor.value = color;
    cancelAnimation(colorProgress);
    colorProgress.value = 0;
    colorProgress.value = withTiming(1, { duration: COLOR_TRANSITION_MS });
  }, [color, fromColor, toColor, colorProgress]);

  useImperativeHandle(
    ref,
    () => ({
      setMicLevel(level: number | null) {
        // Reduce motion / нет данных → кольцо спокойно возвращается к базе.
        if (reduceMotionRef.current || level === null || !Number.isFinite(level)) {
          micPulse.value = withTiming(1, { duration: 160 });
          return;
        }
        // Кивок пропорционален энергии речи; 120мс — быстрее следующего тика
        // поллинга (100мс с джиттером), кольцо «дышит голосом», не дребезжит.
        micPulse.value = withTiming(1 + clamp01(level) * MIC_PULSE_MAX, { duration: 120 });
      },
    }),
    [micPulse],
  );

  // Внешнее кольцо ходит всей амплитудой, внутреннее — 60% (глубина без блюра).
  // Transform и цвет — РАЗНЫЕ useAnimatedStyle: worklet перевычисляется только
  // когда меняются его shared values, поэтому кадры дыхания/кивков (breath,
  // micPulse) гоняют лишь дешёвый scale, а interpolateColor (парсинг строк
  // цвета) исполняется только пока colorProgress едет 0→1 на переходе
  // состояния (200–250мс) — не 60 раз в секунду всю жизнь сцены.
  const outerTransformStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value * micPulse.value }],
  }));
  const innerTransformStyle = useAnimatedStyle(() => {
    const raw = breath.value * micPulse.value;
    return {
      transform: [{ scale: 1 + (raw - 1) * 0.6 }],
    };
  });
  // По одному цветовому worklet'у на кольцо (общий style-объект между двумя
  // Animated.View Reanimated не разделяет надёжно), оба зависят ТОЛЬКО от
  // colorProgress/fromColor/toColor.
  const outerColorStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      colorProgress.value,
      [0, 1],
      [fromColor.value, toColor.value],
    ),
  }));
  const innerColorStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      colorProgress.value,
      [0, 1],
      [fromColor.value, toColor.value],
    ),
  }));

  const outerSize = Math.round(size * 1.55);
  const innerSize = Math.round(size * 1.24);

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
          {
            position: 'absolute',
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            opacity: 0.16,
          },
          outerTransformStyle,
          outerColorStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            opacity: 0.3,
          },
          innerTransformStyle,
          innerColorStyle,
        ]}
      />
      {children}
    </View>
  );
});

/* expo-router route shim: файлы в app/ считаются роутами и требуют default export. */
export default function __RouteShim() {
  return null;
}
