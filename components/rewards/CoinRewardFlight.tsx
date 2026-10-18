/**
 * Полёт монет начисления (D75, PM-052): монеты по дуге летят из точки, где их
 * заработали, в чип баланса.
 *
 * зачем (координатор §86/§87, 02.10): в 2.0 валюта — монеты, и полёт должен быть
 * один на всё приложение. Вид, кривая и тайминги утверждены владельцем ещё для
 * прежнего полёта (каталог движения A5, mock 08: 620 мс, каскад 90 мс,
 * cubic-bezier(.33,.52,.25,.99), дуга, один звук отрыва) — их не меняли, сменили
 * только валюту и имена. Летит базовая монета `coin_rank_00` (тот же ассет, что в
 * балансе), не шрифтовой символ.
 *
 * Требования координатора 02.10: анимация целиком в UI-потоке (Reanimated, без
 * setState в кадрах; единственный setState — замер окна при раскладке), не больше
 * ~8 частиц на слабом телефоне, «уменьшить движение» — полёта нет, `onDone`
 * сразу, и экран обновляет счётчик без анимации. Анимации конечные (без
 * withRepeat) — реестр вечных циклов не затрагивается.
 *
 * Координаты from/to приходят в оконной системе (measureInWindow); оверлей
 * измеряет собственное окно и переводит их в свою систему сам.
 */
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { soundDirector } from '../../modules/audio/sound_director';
import { HOME_RUNE_ICON_SOURCE as COIN_ICON_SOURCE } from '../home/homeRuneAsset';
import { logMemCoin } from '../coins/mem_coin_probe';

const FLIGHT_MS = 620;
const STAGGER_MS = 90;
const ARC_LIFT = 46;
const COIN_SIZE = 18;
const FLIGHT_EASE = Easing.bezier(0.33, 0.52, 0.25, 0.99);

/** Потолок частиц для слабых телефонов (координатор: «не больше ~8»). */
export const COIN_REWARD_FLIGHT_MAX_PARTICLES = 8;

/** Точка в оконных координатах (`measureInWindow`). */
export interface CoinRewardFlightPoint {
  readonly x: number;
  readonly y: number;
}

/** Сколько монет летит: фактическое начисление за действие (1–6). */
export type CoinRewardFlightCount = 1 | 2 | 3 | 4 | 6;

export interface CoinRewardFlightProps {
  from: CoinRewardFlightPoint;
  to: CoinRewardFlightPoint;
  count: CoinRewardFlightCount;
  onDone: () => void;
}

// Один тихий звук отрыва даёт полёту тактильность, но не повторяется для каждой
// монеты и не спорит с правильным ответом или озвучкой фразы.
const COIN_FLIGHT_SOUND_OPTIONS = { scope: 'coin-flight' } as const;
const playFlightStart = () => {
  soundDirector.request('pm.coin.flight_start', COIN_FLIGHT_SOUND_OPTIONS);
};

interface FlightCoinProps {
  index: number;
  isLast: boolean;
  dx: number;
  dy: number;
  onLastDone: () => void;
}

const FlightCoin = memo(function FlightCoin({ index, isLast, dx, dy, onLastDone }: FlightCoinProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    // Звук отрыва — один на всю пачку: его даёт первая монета, иначе наложенные
    // вдохи превратятся в шум.
    if (index === 0) playFlightStart();
    progress.value = withDelay(
      index * STAGGER_MS,
      withTiming(1, { duration: FLIGHT_MS, easing: FLIGHT_EASE }, (finished) => {
        if (!finished) return;
        if (isLast) scheduleOnRN(onLastDone);
      }),
    );
    return () => cancelAnimation(progress);
  }, [index, isLast, onLastDone, progress]);

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
    <Animated.View pointerEvents="none" style={[styles.coin, style]}>
      {/* зачем (R129): монета 768² в 18 dp, несколько сразу — expo-image декодирует под размер вида; движение у обёртки Animated.View, сама картинка статична */}
      <Image source={COIN_ICON_SOURCE} contentFit="contain" style={styles.asset} onLoad={() => logMemCoin('coin-reward-flight', COIN_SIZE)} />
    </Animated.View>
  );
});

export const CoinRewardFlight = memo(function CoinRewardFlight({ from, to, count, onDone }: CoinRewardFlightProps) {
  const reducedMotion = useReducedMotion();
  // Обновления HUD родителя могут сменить колбэк, но никогда не перезапускают полёт.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const finishFlight = useCallback(() => onDoneRef.current(), []);
  const rootRef = useRef<View>(null);
  const [origin, setOrigin] = useState<CoinRewardFlightPoint | null>(null);

  useEffect(() => {
    if (!reducedMotion) return;
    // «Уменьшить движение»: монеты не летят, счётчик обновляется сразу.
    onDoneRef.current();
  }, [reducedMotion]);

  if (reducedMotion) return null;
  const particles = Array.from({ length: Math.min(count, COIN_REWARD_FLIGHT_MAX_PARTICLES) }, (_, index) => index);

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
        ? particles.map((index) => (
            <View
              key={index} // guard-ok: фиксированный список монет, вставок нет
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: from.x - origin.x - COIN_SIZE / 2,
                top: from.y - origin.y - COIN_SIZE / 2,
              }}
            >
              <FlightCoin
                index={index}
                isLast={index === particles.length - 1}
                dx={to.x - from.x}
                dy={to.y - from.y}
                onLastDone={finishFlight}
              />
            </View>
          ))
        : null}
    </View>
  );
});

const styles = StyleSheet.create({
  coin: { width: COIN_SIZE, height: COIN_SIZE, alignItems: 'center', justifyContent: 'center' },
  asset: { width: COIN_SIZE, height: COIN_SIZE },
});

export default CoinRewardFlight;
