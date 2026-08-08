import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useRuntimeActive } from '../../hooks/use_runtime_active';

/**
 * Живая волна аудио-плеера флешкарточек (правило A-35 макета
 * flashcards-screens.html / flashcards-main.html §05).
 *
 * зачем: в плеере не было НИКАКОЙ визуализации звука — кнопка play и тишина,
 * непонятно, играет ли трек вообще. Волна даёт мгновенную обратную связь
 * «звук идёт» без единого лишнего тапа.
 *
 * Параметры дословно из эталона:
 *   24 бара, scaleY .22 → .95, базовая длительность 1100мс,
 *   delay бара = (i * 47) % 900 мс, duration бара = 900 + (i * 97) % 500 мс.
 * Детерминированные формулы (без Math.random) — волна выглядит одинаково
 * между запусками и не «дёргается» при перемонтировании.
 *
 * Бюджет вечных циклов (A-6): считается ОДНИМ циклом на экран. Гасится:
 *  - при паузе (playing=false) — бары замирают в покое;
 *  - вне фокуса экрана — не жжёт кадры в фоне;
 *  - при системном «Уменьшении движения» (A-54) — статичная ровная полоса.
 */

/** Количество баров — дословно из макета. */
const BAR_COUNT = 24;
/** Покой/пик по scaleY — дословно из макета. */
const BAR_MIN = 0.22;
const BAR_MAX = 0.95;

interface AudioWaveformProps {
  active?: boolean;
  /** Играет ли трек прямо сейчас. false — бары замирают в покое. */
  playing: boolean;
  /** Цвет баров. */
  color: string;
  /** Высота полосы, px. Default 26. */
  height?: number;
  /**
   * Скорость плеера (0.75 / 1 / 1.25). Длительность делится на неё —
   * на ускоренном воспроизведении волна ходит чаще, как в эталоне.
   */
  speed?: number;
  style?: StyleProp<ViewStyle>;
}

function AudioWaveformBase({ active = true, playing, color, height = 26, speed = 1, style }: AudioWaveformProps) {
  const reduceMotion = useReduceMotion();
  const runtimeActive = useRuntimeActive(active);
  // По одному значению на бар; создаём один раз и переиспользуем.
  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(BAR_MIN)),
  ).current;

  useEffect(() => {
    if (!playing || !runtimeActive || reduceMotion) {
      // Пауза/фон/reduce-motion: мягко возвращаем бары в покой и НЕ крутим цикл.
      bars.forEach((bar) => bar.stopAnimation(() => bar.setValue(BAR_MIN)));
      return;
    }

    const safeSpeed = speed > 0 ? speed : 1;
    const loops = bars.map((bar, i) => {
      // Формулы задержки/длительности — дословно из макета (детерминированы).
      const delay = (i * 47) % 900;
      const duration = (900 + ((i * 97) % 500)) / safeSpeed;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(bar, {
            toValue: BAR_MAX,
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: BAR_MIN,
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
    });

    loops.forEach((loop) => loop.start());
    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [bars, playing, reduceMotion, runtimeActive, speed]);

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          height,
        },
        style,
      ]}
    >
      {bars.map((bar, i) => (
        <Animated.View
          // guard-ok: массив баров фиксированной длины (24), создаётся один раз
          // и никогда не сортируется/не переставляется — индекс здесь стабилен.
          key={`bar-${i}`}
          style={{
            width: 3,
            height,
            borderRadius: 999,
            backgroundColor: color,
            // Бары растут от центра — scaleY по вертикали, без layout-анимаций.
            transform: [{ scaleY: bar }],
          }}
        />
      ))}
    </View>
  );
}

export default memo(AudioWaveformBase);
