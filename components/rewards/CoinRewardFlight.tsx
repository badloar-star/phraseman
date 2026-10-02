/**
 * Полёт монет начисления (D75, PM-052): монеты по дуге летят из точки, где их
 * заработали, в чип баланса.
 *
 * зачем (координатор §86/§87, 02.10): в 2.0 валюта — монеты, а полёт должен быть
 * один на всё приложение. Вид, кривая, тайминги и звук уже утверждены владельцем
 * для прежнего полёта (620 мс, каскад 90 мс, дуга, один звук отрыва) и с 01.10
 * летит базовая монета `coin_rank_00`. Поэтому это не новый рисунок, а единое
 * монетное имя с ПРЕЖНИМ API: Ядро подключает его на 12 экранах простой заменой
 * импорта `LearningV2RuneFlight` → `CoinRewardFlight`.
 *
 * Требования координатора (02.10): анимация целиком в UI-потоке (Reanimated,
 * без setState в кадрах) — это даёт реализация; не больше ~8 частиц на слабом
 * телефоне — потолок ниже; «уменьшить движение» — полёта нет, `onDone` сразу,
 * экран обновляет счётчик без анимации.
 *
 * Реализация полёта пока живёт в `components/LearningV2RuneFlight.tsx`: на её
 * исходник опираются 13 контрактов. Когда последние «руны» уйдут из кода, она
 * переезжает сюда вместе с этими контрактами одним коммитом.
 */
import React, { memo, useEffect, useRef } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import {
  LearningV2RuneFlight,
  type LearningV2RuneFlightPoint,
} from '../LearningV2RuneFlight';

/** Точка в оконных координатах (`measureInWindow`). */
export type CoinRewardFlightPoint = LearningV2RuneFlightPoint;

/** Сколько монет летит: фактическое начисление за действие (1–6). */
export type CoinRewardFlightCount = 1 | 2 | 3 | 4 | 6;

/** Потолок частиц для слабых телефонов (координатор: «не больше ~8»). */
export const COIN_REWARD_FLIGHT_MAX_PARTICLES = 8;

export interface CoinRewardFlightProps {
  from: CoinRewardFlightPoint;
  to: CoinRewardFlightPoint;
  count: CoinRewardFlightCount;
  onDone: () => void;
}

export const CoinRewardFlight = memo(function CoinRewardFlight(props: CoinRewardFlightProps) {
  const reducedMotion = useReducedMotion();
  // Колбэк родителя может меняться между рендерами — полёт и мгновенное завершение
  // всё равно вызывают актуальный, а не тот, что был при монтировании.
  const onDoneRef = useRef(props.onDone);
  onDoneRef.current = props.onDone;

  useEffect(() => {
    if (!reducedMotion) return;
    // «Уменьшить движение»: монеты не летят, счётчик обновляется сразу.
    onDoneRef.current();
  }, [reducedMotion]);

  if (reducedMotion) return null;
  const count = Math.min(props.count, COIN_REWARD_FLIGHT_MAX_PARTICLES) as CoinRewardFlightCount;
  return <LearningV2RuneFlight from={props.from} to={props.to} count={count} onDone={props.onDone} />;
});

export default CoinRewardFlight;
