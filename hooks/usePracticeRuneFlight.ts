import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import type { LearningV2RuneFlightPoint } from '../components/LearningV2RuneFlight';

/**
 * usePracticeRuneFlight — та же механика полёта рун, что в Learning V2
 * (`learning_v2_direct_session_player_v1.tsx`: settleSessionRuneAward +
 * awardSessionRunes), обёрнутая в переиспользуемый хук для семи учебных
 * экранов (владелец, 2026-08-27: «анимация полёта точно такая же, как в
 * Learning V2»).
 *
 * Использование на экране:
 *   const flight = usePracticeRuneFlight();
 *   // на месте правильного ответа — измеряемый узел-источник:
 *   <View ref={flight.originRef} collapsable={false}>...карточка ответа...</View>
 *   // на счётчике в шапке:
 *   <View ref={flight.counterRef} collapsable={false}><PracticeRuneCounter .../></View>
 *   // при начислении:
 *   flight.fly(awarded); // awarded — 1..3, то что вернул onCorrectAnswer
 *   // в корне экрана, поверх всего:
 *   {flight.overlay}
 *
 * Полёт декоративен: если измерение не удалось (узел ещё не смонтирован) или
 * reduce motion включён, `fly` просто ничего не показывает — это НЕ должно
 * блокировать переход к следующему вопросу, ровно как в оригинале.
 */
export function usePracticeRuneFlight() {
  const reducedMotion = useReducedMotion();
  const originRef = useRef<View>(null);
  const counterRef = useRef<View>(null);
  const bump = useSharedValue(1);
  const [flight, setFlight] = useState<Readonly<{
    key: number;
    count: 1 | 2 | 3;
    from: LearningV2RuneFlightPoint;
    to: LearningV2RuneFlightPoint;
  }> | null>(null);

  const bumpCounter = useCallback(() => {
    if (reducedMotion) return;
    bump.value = withSequence(
      withTiming(1.28, { duration: 140 }),
      withTiming(1, { duration: 220 }),
    );
  }, [bump, reducedMotion]);

  const fly = useCallback((rawCount: number) => {
    const count = Math.max(1, Math.min(3, Math.round(rawCount))) as 1 | 2 | 3;
    bumpCounter();
    if (reducedMotion) return;
    const origin = originRef.current;
    const counter = counterRef.current;
    if (!origin || !counter) return;
    origin.measureInWindow((fromX, fromY, fromWidth, fromHeight) => {
      counter.measureInWindow((toX, toY, toWidth, toHeight) => {
        setFlight({
          key: Date.now(),
          count,
          from: { x: fromX + fromWidth / 2, y: fromY + fromHeight / 2 },
          to: { x: toX + toWidth / 2, y: toY + toHeight / 2 },
        });
      });
    });
  }, [bumpCounter, reducedMotion]);

  const clearFlight = useCallback(() => setFlight(null), []);

  return { originRef, counterRef, bump, fly, flight, clearFlight };
}

export type UsePracticeRuneFlightResult = ReturnType<typeof usePracticeRuneFlight>;
