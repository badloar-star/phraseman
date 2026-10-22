// ════════════════════════════════════════════════════════════════════════════
// SeasonCarousel.tsx — карусель карт эпизодов «Сезона» (эталон course-hybrid-1-4.html, `.h2flow`).
//
// зачем (владелец 21.10; №39 «не тормозить на слабых Android»): центральная карта крупнее, соседние уходят в глубину и поворачиваются, свайп
// листает, тап по центральной карте раскрывает её, тап по соседней перелистывает к ней. Всё движение — на UI-треде (Reanimated): позиция карусели —
// shared value, положение каждой карты считает worklet seasonCardLayout(index − position) на каждый кадр без setState. Список виртуализирован:
// монтируется окно из 2·windowRadius+1 карт вокруг текущей (seasonWindowIndexes), остальные не существуют — длинная колода не ест память.
// Окно сдвигается через runOnJS ТОЛЬКО когда округлённая позиция сменилась (раз на карту, не на кадр). Первый кадр — итоговая геометрия: стартовая
// карта уже в центре, без «прыжка». «Уменьшить движение» — переход без пружины.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withSpring, withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {
  SEASON_CAROUSEL, seasonCardLayout, seasonNearestIndex, seasonSnapTarget, seasonWindowIndexes,
} from './season_carousel_layout';

export type SeasonCarouselProps = Readonly<{
  count: number;
  /** Стартовая карта (в центре с первого кадра). */
  initialIndex: number;
  /** Смена значения заново ставит карусель на initialIndex (без анимации), даже если сам индекс не менялся: «К эпизоду N» из раскрытой карты. */
  recenterKey?: number;
  /** Рисует лицо карты с индексом `index` (вызывается только для карт окна). */
  renderCard: (index: number) => React.ReactNode;
  /** Карусель остановилась на карте (после свайпа или тапа по соседней). */
  onIndexSettled: (index: number) => void;
  /** Тап по ЦЕНТРАЛЬНОЙ карте (раскрыть). */
  onCenterPress: (index: number) => void;
  reducedMotion: boolean;
  accessibilityLabelForIndex?: (index: number) => string;
  testID?: string;
}>;

const SPRING = { damping: 22, stiffness: 240, mass: 0.9 } as const;
/** Сколько пикселей протянуть пальцем, чтобы позиция сдвинулась на одну карту. */
const DRAG_PER_CARD = SEASON_CAROUSEL.shiftX * 1.1;

function CarouselCard({ index, position, children, onPress, label }: Readonly<{
  index: number;
  position: SharedValue<number>;
  children: React.ReactNode;
  onPress: () => void;
  label?: string;
}>) {
  const style = useAnimatedStyle(() => {
    const l = seasonCardLayout(index - position.value);
    return {
      opacity: l.opacity,
      zIndex: l.zIndex,
      transform: [
        { perspective: SEASON_CAROUSEL.perspective },
        { translateX: l.translateX },
        { rotateY: `${l.rotateYDeg}deg` },
        { scale: l.scale },
      ],
    };
  });
  // зачем (отклик нажатия, координатор 22.10): карта — плитка, поэтому видимое нажатие (приглушение) без хаптика
  return (
    <Animated.View style={[styles.card, style]}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} testID={`season-card-${index}`} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

function SeasonCarousel({ count, initialIndex, recenterKey, renderCard, onIndexSettled, onCenterPress, reducedMotion, accessibilityLabelForIndex, testID }: SeasonCarouselProps) {
  const safeInitial = seasonNearestIndex(initialIndex, count);
  const position = useSharedValue(safeInitial);
  const dragStart = useSharedValue(safeInitial);
  const [center, setCenter] = useState(safeInitial);

  // окно монтируемых карт следует за округлённой позицией; на кадр setState не зовём
  useAnimatedReaction(
    () => seasonNearestIndex(position.value, count),
    (now, prev) => {
      if (now !== prev) runOnJS(setCenter)(now);
    },
    [count],
  );

  // колода поменялась (другая глава/урок) или стартовая карта сменилась снаружи — встаём на неё без анимации
  useEffect(() => {
    position.value = seasonNearestIndex(initialIndex, count);
    setCenter(seasonNearestIndex(initialIndex, count));
  }, [count, initialIndex, position, recenterKey]);

  const settle = useCallback((index: number) => {
    onIndexSettled(index);
  }, [onIndexSettled]);

  const moveTo = useCallback((target: number) => {
    const clamped = seasonNearestIndex(target, count);
    if (reducedMotion) {
      position.value = withTiming(clamped, { duration: 1 });
      onIndexSettled(clamped);
      return;
    }
    position.value = withSpring(clamped, SPRING, (finished) => {
      'worklet';
      if (finished) runOnJS(settle)(clamped);
    });
  }, [count, onIndexSettled, position, reducedMotion, settle]);

  const pan = useMemo(
    () => Gesture.Pan()
      .activeOffsetX([-12, 12])
      .failOffsetY([-24, 24])
      .onBegin(() => {
        'worklet';
        dragStart.value = position.value;
      })
      .onUpdate((e) => {
        'worklet';
        const next = dragStart.value - e.translationX / DRAG_PER_CARD;
        // за краями колоды карта не уезжает дальше чем на треть шага (резинка)
        position.value = Math.min(count - 1 + 0.33, Math.max(-0.33, next));
      })
      .onEnd((e) => {
        'worklet';
        const target = seasonSnapTarget(position.value, e.velocityX, count);
        position.value = reducedMotion
          ? withTiming(target, { duration: 1 })
          : withSpring(target, SPRING, (finished) => {
            'worklet';
            if (finished) runOnJS(settle)(target);
          });
        if (reducedMotion) runOnJS(settle)(target);
      }),
    [count, dragStart, position, reducedMotion, settle],
  );

  const indexes = seasonWindowIndexes(center, count);
  return (
    <GestureDetector gesture={pan}>
      <View style={styles.flow} testID={testID} accessibilityRole="adjustable"
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const step = e.nativeEvent.actionName === 'increment' ? 1 : -1;
          moveTo(seasonNearestIndex(position.value, count) + step);
        }}
      >
        {indexes.map((index) => (
          <CarouselCard
            key={index} // guard-ok: индекс карты в колоде — её стабильная личность, колода не сортируется и не вставляется
            index={index}
            position={position}
            label={accessibilityLabelForIndex?.(index)}
            onPress={() => {
              const nearest = seasonNearestIndex(position.value, count);
              if (index === nearest) onCenterPress(index);
              else moveTo(index);
            }}
          >
            {renderCard(index)}
          </CarouselCard>
        ))}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  flow: { height: SEASON_CAROUSEL.flowHeight, marginTop: SEASON_CAROUSEL.flowMarginTop, alignItems: 'center' },
  card: { position: 'absolute', top: 4, width: SEASON_CAROUSEL.cardWidth, height: SEASON_CAROUSEL.cardHeight },
});

export default memo(SeasonCarousel);
