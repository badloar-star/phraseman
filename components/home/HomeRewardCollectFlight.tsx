import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { soundDirector } from '../../modules/audio/sound_director';
import {
  REWARD_FLIGHT_MS,
  REWARD_FLIGHT_STAGGER_MS,
  rewardFlightParticleCount,
  rewardFlightSpawnPoint,
  type RewardFlightPoint,
} from '../../app/reward_flight_particles';

/**
 * Сбор наград на Главной: частицы валюты слетаются со всех сторон экрана
 * в счётчик в шапке.
 *
 * зачем (владелец, 2026-09-01): «после того как пользователь заработал руны в
 * любом месте — уроки, модалки, призы, спины — при возврате на главную они со
 * всех сторон анимированно собираются и влетают в счётчик, заметно и со звуком
 * полёта». Материал берётся из `app/reward_flight_queue.ts`.
 *
 * Почему не переиспользован LearningV2RuneFlight: тот решает другую задачу —
 * ОДНА точка старта (пройденный узел карты) и 1–3 частицы. Здесь старт у каждой
 * частицы свой, за краем экрана, а количество не равно сумме награды.
 *
 * Производительность (Performance Bible): анимации КОНЕЧНЫЕ (никаких
 * withRepeat) — реестр вечных циклов не затрагивается; двигаются только
 * transform и opacity, то есть всё живёт на UI-потоке Reanimated и не будит
 * ре-рендеры Главной; оверлей монтируется ТОЛЬКО на время полёта и
 * pointerEvents="none", поэтому тапы по шапке не перехватываются.
 */

const PARTICLE_SIZE = 22;

/**
 * Кривая полёта: старт мгновенный, приземление плавное (ease-out).
 * ease-in здесь запрещён — он «залипает» на старте, а глаз смотрит именно туда.
 */
const FLIGHT_EASE = Easing.bezier(0.22, 0.9, 0.24, 1);

interface ParticleProps {
  index: number;
  isLast: boolean;
  from: RewardFlightPoint;
  to: RewardFlightPoint;
  source: ImageSourcePropType;
  onLastDone: () => void;
}

const FlightParticle = memo(function FlightParticle({
  index,
  isLast,
  from,
  to,
  source,
  onLastDone,
}: ParticleProps) {
  const progress = useSharedValue(0);
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  useEffect(() => {
    progress.value = withDelay(
      index * REWARD_FLIGHT_STAGGER_MS,
      withTiming(1, { duration: REWARD_FLIGHT_MS, easing: FLIGHT_EASE }, (finished) => {
        if (!finished) return;
        if (isLast) scheduleOnRN(onLastDone);
      }),
    );
  }, [index, isLast, onLastDone, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    // Дуга: частица не идёт по прямой, а «подныривает» перпендикулярно курсу —
    // прямые траектории читаются как техническая интерполяция, а не как полёт.
    const arc = Math.sin(Math.PI * p) * 0.18;
    return {
      // Появление быстрое (частица влетает уже в движении), гашение — у самой
      // цели, чтобы она не «протыкала» счётчик насквозь.
      opacity: p < 0.12 ? p / 0.12 : p > 0.9 ? Math.max(0, 1 - (p - 0.9) * 10) : 1,
      transform: [
        { translateX: dx * p - dy * arc },
        { translateY: dy * p + dx * arc },
        // Приближаясь к счётчику, частица уменьшается: масштаб читается как
        // перспектива, «всасывание» в цель.
        { scale: 1.05 - 0.65 * p },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        { left: from.x - PARTICLE_SIZE / 2, top: from.y - PARTICLE_SIZE / 2 },
        style,
      ]}
    >
      <Image // guard-ok: декоративная частица — баланс озвучивает сам счётчик
        source={source}
        style={styles.asset}
        contentFit="contain"
        contentPosition="center"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Animated.View>
  );
});

export interface HomeRewardCollectFlightProps {
  /** Сколько единиц валюты прилетело — задаёт число частиц, не равно ему. */
  amount: number;
  /** Куда лететь: центр счётчика в координатах окна. */
  target: RewardFlightPoint;
  /** Ассет валюты — ТОТ ЖЕ, что рисует счётчик, иначе валюта «раздвоится». */
  source: ImageSourcePropType;
  /** Первая волна играет звук отрыва; вторая (жемчужины) молчит. */
  playStartSound?: boolean;
  onDone: () => void;
}

const FLIGHT_SOUND_OPTIONS = { scope: 'home-reward-collect' } as const;

export const HomeRewardCollectFlight = memo(function HomeRewardCollectFlight({
  amount,
  target,
  source,
  playStartSound = true,
  onDone,
}: HomeRewardCollectFlightProps) {
  const rootRef = useRef<View>(null);
  const [frame, setFrame] = useState<{
    origin: RewardFlightPoint;
    width: number;
    height: number;
  } | null>(null);

  // Звук отрыва — ОДИН на всю волну, а не на каждую частицу: 14 наложенных
  // вдохов дали бы шум вместо полёта (тот же приём, что в LearningV2RuneFlight).
  useEffect(() => {
    if (!playStartSound) return;
    soundDirector.request('pm.reward.rune_flight_start', FLIGHT_SOUND_OPTIONS);
  }, [playStartSound]);

  const count = rewardFlightParticleCount(amount);

  // Траектории считаются один раз на волну: пересчёт в рендере дал бы новую
  // геометрию при каждом ре-рендере Главной и частицы бы прыгали.
  const particles = useMemo(() => {
    if (!frame || count <= 0) return [];
    const localTarget = {
      x: target.x - frame.origin.x,
      y: target.y - frame.origin.y,
    };
    return Array.from({ length: count }, (_, index) => ({
      key: index,
      from: rewardFlightSpawnPoint(index, frame.width, frame.height, localTarget),
      to: localTarget,
    }));
  }, [count, frame, target.x, target.y]);

  return (
    <View
      ref={rootRef}
      collapsable={false}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        // Координаты цели приходят в системе ОКНА (measureInWindow), а частицы
        // живут внутри оверлея — переводим один раз, как это делает
        // LearningV2RuneFlight.
        rootRef.current?.measureInWindow((x, y) => {
          setFrame({ origin: { x, y }, width, height });
        });
      }}
    >
      {particles.map((particle) => (
        <FlightParticle
          key={particle.key} // guard-ok: список частиц фиксирован на волну, вставок нет
          index={particle.key}
          isLast={particle.key === particles.length - 1}
          from={particle.from}
          to={particle.to}
          source={source}
          onLastDone={onDone}
        />
      ))}
    </View>
  );
});


const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    width: PARTICLE_SIZE,
    height: PARTICLE_SIZE,
  },
  asset: { width: PARTICLE_SIZE, height: PARTICLE_SIZE },
});

export default HomeRewardCollectFlight;
