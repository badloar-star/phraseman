import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useReduceMotionPreference } from './use_reduce_motion';

import type { CoinRewardFlightPoint } from '../components/rewards/CoinRewardFlight';

/**
 * useCoinRewardFlight (зачем (PM-052, D75): полёт монет вместо рун) — та же механика полёта рун, что была в плеере
 * удалённого курса занятий (settleSessionRuneAward +
 * awardSessionRunes), обёрнутая в переиспользуемый хук для семи учебных
 * экранов (владелец, 2026-08-27: «анимация полёта точно такая же, как в
 * Learning V2»).
 *
 * Использование на экране:
 *   const flight = useCoinRewardFlight();
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
export function useCoinRewardFlight() {
  const reducedMotion = useReduceMotionPreference();
  const reducedMotionRef = useRef(reducedMotion);
  const originRef = useRef<View>(null);
  const counterRef = useRef<View>(null);
  const mountedRef = useRef(false);
  const lifetimeRef = useRef(0);
  const requestRef = useRef(0);
  const [flight, setFlight] = useState<Readonly<{
    key: number;
    count: 1 | 2 | 3;
    from: CoinRewardFlightPoint;
    to: CoinRewardFlightPoint;
  }> | null>(null);

  /*
   * Монотонный ключ полёта.
   *
   * зачем (аудит 2026-09-03): ключом стоял `Date.now()`. Два быстрых верных
   * ответа в одну миллисекунду давали ОДИНАКОВЫЙ ключ — React не перемонтировал
   * компонент, и полёт не проигрывался вовсе. На Арене ответы идут быстро, там
   * это заметно. Счётчик растёт всегда и совпасть не может.
   */
  const flightKeyRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    lifetimeRef.current += 1;
    return () => {
      mountedRef.current = false;
      lifetimeRef.current += 1;
      requestRef.current += 1;
    };
  }, []);

  useLayoutEffect(() => {
    if (reducedMotionRef.current === reducedMotion) return;
    reducedMotionRef.current = reducedMotion;
    // A committed accessibility-mode transition supersedes native work started
    // under the previous committed mode.
    requestRef.current += 1;
  }, [reducedMotion]);

  const fly = useCallback((rawCount: number) => {
    const count = Math.max(1, Math.min(3, Math.round(rawCount))) as 1 | 2 | 3;
    const request = requestRef.current + 1;
    requestRef.current = request;
    const lifetime = lifetimeRef.current;
    if (reducedMotionRef.current !== false) return;
    const origin = originRef.current;
    const counter = counterRef.current;
    if (!origin || !counter) return;
    origin.measureInWindow((fromX, fromY, fromWidth, fromHeight) => {
      if (!mountedRef.current || reducedMotionRef.current !== false || lifetimeRef.current !== lifetime || requestRef.current !== request) return;
      counter.measureInWindow((toX, toY, toWidth, toHeight) => {
        if (!mountedRef.current || reducedMotionRef.current !== false || lifetimeRef.current !== lifetime || requestRef.current !== request) return;
        flightKeyRef.current += 1;
        setFlight({
          key: flightKeyRef.current,
          count,
          from: { x: fromX + fromWidth / 2, y: fromY + fromHeight / 2 },
          to: { x: toX + toWidth / 2, y: toY + toHeight / 2 },
        });
      });
    });
  }, []);

  const displayedKey = flight?.key ?? null;
  const clearFlight = useCallback(() => {
    if (displayedKey === null) {
      requestRef.current += 1;
      setFlight(null);
      return;
    }
    setFlight((current) => current?.key === displayedKey ? null : current);
  }, [displayedKey]);

  return { originRef, counterRef, fly, flight, clearFlight };
}

export type UseCoinRewardFlightResult = ReturnType<typeof useCoinRewardFlight>;
