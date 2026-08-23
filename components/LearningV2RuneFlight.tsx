import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { pickRuneGlyphs } from '../constants/runes';

/**
 * Полёт рун с пройденного узла карты в чип баланса.
 *
 * зачем (владелец, 22.08, каталог движения A5 + выбор «чип в шапке V2»):
 * заработанная валюта по дуге улетает в баланс — заметный премиальный момент
 * после сессии. Кривая и тайминги из спеки mock 08: 620мс, каскад 90мс,
 * cubic-bezier(.33,.52,.25,.99). Анимации КОНЕЧНЫЕ (без withRepeat), поэтому
 * реестр вечных циклов не затрагивается; reduce motion отсекается родителем.
 *
 * зачем (владелец, 22.08, макет 26-checkpoint-and-runes): в полёте идут РАЗНЫЕ
 * рунические символы, а не один повторённый — «древние знаки тянутся каждый
 * раз новые». Глиф — обычный текст старшего футарка: он есть в системных
 * шрифтах, ассеты не нужны и вес приложения не растёт.
 *
 * Координаты from/to приходят в оконной системе (measureInWindow); оверлей
 * измеряет собственное окно и переводит их в свою систему сам.
 */

const FLIGHT_MS = 620;
const STAGGER_MS = 90;
/** Сколько рун летит: макет требует 5–8 разных символов, берём середину. */
const RUNE_COUNT = 6;
const ARC_LIFT = 46;
const RUNE_SIZE = 18;
const FLIGHT_EASE = Easing.bezier(0.33, 0.52, 0.25, 0.99);

export interface LearningV2RuneFlightPoint {
  readonly x: number;
  readonly y: number;
}

interface RuneProps {
  index: number;
  glyph: string;
  dx: number;
  dy: number;
  color: string;
  onLastDone: () => void;
}

const FlightRune = memo(function FlightRune({
  index,
  glyph,
  dx,
  dy,
  color,
  onLastDone,
}: RuneProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * STAGGER_MS,
      withTiming(1, { duration: FLIGHT_MS, easing: FLIGHT_EASE }, (finished) => {
        if (finished && index === RUNE_COUNT - 1) runOnJS(onLastDone)();
      }),
    );
  }, [index, onLastDone, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p < 0.08 ? p / 0.08 : p > 0.94 ? 1 - (p - 0.94) * 6 : 1,
      transform: [
        { translateX: dx * p },
        // Дуга: вертикаль поднимается синусом, как в утверждённом макете.
        { translateY: dy * p - ARC_LIFT * Math.sin(Math.PI * p) },
        { scale: 1 - 0.45 * p },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.rune, style]}>
      <Text
        allowFontScaling={false}
        style={[styles.glyph, { color }]}
      >
        {glyph}
      </Text>
    </Animated.View>
  );
});

interface Props {
  from: LearningV2RuneFlightPoint;
  to: LearningV2RuneFlightPoint;
  color: string;
  onDone: () => void;
}

export const LearningV2RuneFlight = memo(function LearningV2RuneFlight({
  from,
  to,
  color,
  onDone,
}: Props) {
  const rootRef = useRef<View>(null);
  const [origin, setOrigin] = useState<LearningV2RuneFlightPoint | null>(null);
  // Выборка фиксируется на весь полёт: пересчёт в рендере менял бы символы
  // прямо в воздухе.
  const glyphs = useMemo(() => pickRuneGlyphs(RUNE_COUNT), []);

  return (
    <View
      ref={rootRef}
      collapsable={false}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={() => {
        rootRef.current?.measureInWindow((x, y) => setOrigin({ x, y }));
      }}
    >
      {origin !== null
        ? glyphs.map((glyph, index) => (
            <View
              key={index} // guard-ok: фиксированный список рун, вставок нет
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: from.x - origin.x - RUNE_SIZE / 2,
                top: from.y - origin.y - RUNE_SIZE / 2,
              }}
            >
              <FlightRune
                index={index}
                glyph={glyph}
                dx={to.x - from.x}
                dy={to.y - from.y}
                color={color}
                onLastDone={onDone}
              />
            </View>
          ))
        : null}
    </View>
  );
});

const styles = StyleSheet.create({
  rune: { width: RUNE_SIZE, height: RUNE_SIZE, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: RUNE_SIZE, lineHeight: RUNE_SIZE + 2, fontWeight: '700' },
});

export default LearningV2RuneFlight;
