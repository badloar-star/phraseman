// зачем: владелец попросил, чтобы на главной сохранённые карточки «собирались в
// кучку и улетали в раздел Карточки», а сам раздел чуть отзывался, принимая их.
//
// Почему оверлеем, а не внутри плитки: главная обязана держать стабильный первый
// кадр (Performance Bible). Если бы карточки жили в потоке вёрстки, их появление
// двигало бы соседние блоки. Оверлей рисуется поверх и не занимает места, поэтому
// геометрия экрана не меняется ни на кадр.
//
// Всё на UI-потоке через Reanimated: главный поток не участвует, первый кадр не
// задерживается. При системном «уменьшить движение» полёт не проигрывается вовсе.
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../hooks/use_reduce_motion';

/** Сколько карточек показываем в стопке — больше пяти глаз всё равно не считает. */
const MAX_VISIBLE_CARDS = 5;
const CARD_TRAVEL_MS = 620;
const CARD_STAGGER_MS = 70;

export interface SavedCardsFlightProps {
  /** Сколько карточек прилетело. Ноль — компонент ничего не рисует. */
  readonly count: number;
  /** Куда лететь: центр плитки «Карточки» в координатах экрана. */
  readonly target: { readonly x: number; readonly y: number } | null;
  /** Откуда лететь: обычно центр экрана или место, где человек их сохранял. */
  readonly origin: { readonly x: number; readonly y: number };
  readonly color: string;
  /** Вызывается один раз, когда последняя карточка долетела. */
  readonly onDone: () => void;
}

interface FlyingCardProps {
  readonly index: number;
  readonly origin: { readonly x: number; readonly y: number };
  readonly target: { readonly x: number; readonly y: number };
  readonly color: string;
  readonly last: boolean;
  readonly onDone: () => void;
}

function FlyingCard({
  index,
  origin,
  target,
  color,
  last,
  onDone,
}: FlyingCardProps) {
  const progress = useSharedValue(0);
  const gather = useSharedValue(0);

  useEffect(() => {
    const delay = index * CARD_STAGGER_MS;
    // Сначала карточки собираются в кучку из разброса, потом улетают вместе.
    gather.value = withDelay(
      delay,
      withSpring(1, { damping: 14, stiffness: 180 }),
    );
    progress.value = withDelay(
      delay + 220,
      withTiming(
        1,
        { duration: CARD_TRAVEL_MS, easing: Easing.out(Easing.cubic) },
        (finished) => {
          // Сообщаем о завершении ровно один раз — по последней карточке.
          if (finished && last) runOnJS(onDone)();
        },
      ),
    );
  }, [gather, index, last, onDone, progress]);

  // Разброс до сборки: каждая карточка стартует чуть в стороне, веером.
  const spreadX = (index - (MAX_VISIBLE_CARDS - 1) / 2) * 26;
  const spreadY = index * 6;

  const style = useAnimatedStyle(() => {
    const gathered = gather.value;
    const startX = origin.x + spreadX * (1 - gathered);
    const startY = origin.y + spreadY * (1 - gathered);
    const p = progress.value;
    // Небольшая дуга: карточки не едут по линейке, а взлетают и опускаются.
    const arc = Math.sin(p * Math.PI) * -46;
    return {
      opacity: p < 0.92 ? 1 : (1 - p) / 0.08,
      transform: [
        { translateX: startX + (target.x - startX) * p },
        { translateY: startY + (target.y - startY) * p + arc },
        { scale: 1 - p * 0.55 },
        { rotate: `${(1 - gathered) * (index - 2) * 7}deg` },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.card, style, { backgroundColor: color }]}
    />
  );
}

export function SavedCardsFlight({
  count,
  target,
  origin,
  color,
  onDone,
}: SavedCardsFlightProps) {
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    // зачем: при «уменьшить движение» полёт не играем, но состояние обязаны
    // закрыть — иначе главная будет ждать анимацию, которой не будет.
    if (count > 0 && (reduceMotion || !target)) onDone();
  }, [count, onDone, reduceMotion, target]);

  if (count <= 0 || !target || reduceMotion) return null;

  const visible = Math.min(count, MAX_VISIBLE_CARDS);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: visible }, (_unused, index) => (
        <FlyingCard
          key={index} // guard-ok: фиксированный список на один проигрыш, без вставок и сортировки
          index={index}
          origin={origin}
          target={target}
          color={color}
          last={index === visible - 1}
          onDone={onDone}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: 44,
    height: 58,
    borderRadius: 10,
    // Тень вместо обводки: владелец запретил рамки вокруг блоков.
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});

export default SavedCardsFlight;
