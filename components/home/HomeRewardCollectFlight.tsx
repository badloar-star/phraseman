import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { DebugLogger } from '../../app/debug-logger';
import { soundDirector } from '../../modules/audio/sound_director';
import {
  REWARD_FLIGHT_HIT_AT,
  REWARD_FLIGHT_HIT_DOWN_MS,
  REWARD_FLIGHT_HIT_UP_MS,
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

/** Удар вверх — резкий, чтобы толчок читался как попадание, а не как наплыв. */
const IMPACT_UP_EASE = Easing.out(Easing.quad);
/** Возврат — чуть мягче, но всё равно быстрый: счётчик должен успеть осесть. */
const IMPACT_DOWN_EASE = Easing.inOut(Easing.quad);

const FLIGHT_SOUND_OPTIONS = { scope: 'home-reward-collect' } as const;

/** Щелчок приземления. Зовётся с UI-потока через мост — звук всё равно асинхронен. */
function playLandSound(): void {
  soundDirector.request('pm.reward.rune_flight_land', FLIGHT_SOUND_OPTIONS);
}

interface ParticleProps {
  index: number;
  isLast: boolean;
  from: RewardFlightPoint;
  to: RewardFlightPoint;
  source: ImageSourcePropType;
  /**
   * Пульс счётчика, общий для всей волны.
   *
   * зачем (владелец, 2026-09-01: «увеличение цифры будто заторможено и не
   * связано с самим полётом»): раньше счётчик дёргался ОДИН раз и только
   * когда долетала ПОСЛЕДНЯЯ частица — через мост UI→JS, то есть с двойным
   * запозданием. Теперь по счётчику бьёт КАЖДАЯ частица ровно в момент своего
   * касания, и удар живёт на том же UI-потоке, что и полёт: рассинхрону
   * взяться неоткуда.
   */
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
        'worklet';
        if (!finished) return;
        // Удар по счётчику — прямо здесь, на UI-потоке, в кадре касания.
        // Каждая частица подбрасывает счётчик и он оседает обратно; частицы
        // идут каскадом, поэтому счётчик «набухает» вместе с потоком, а не
        // дёргается один раз в конце.
        // Через мост уходит только закрытие волны — оно асинхронно по своей
        // природе. Удар счётчика и звук живут выше, на уровне волны.
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
      // Гашение начинается на 97%, а не на 90%: раньше частица исчезала
      // заметно НЕ долетев, и удар счётчика выглядел беспричинным.
      opacity: p < 0.12 ? p / 0.12 : p > 0.97 ? Math.max(0, 1 - (p - 0.97) * 33) : 1,
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
  /**
   * Пульс счётчика этой валюты: 0 — покой, 1 — удар. Живёт на UI-потоке,
   * поэтому идёт кадр в кадр с полётом, без моста и задержки.
   */
  impact: SharedValue<number>;
  onDone: () => void;
}

export const HomeRewardCollectFlight = memo(function HomeRewardCollectFlight({
  amount,
  target,
  source,
  playStartSound = true,
  impact,
  onDone,
}: HomeRewardCollectFlightProps) {
  const rootRef = useRef<View>(null);
  // Стартовое значение — РАЗМЕР ОКНА, а не null.
  //
  // зачем (владелец, 2026-09-01: «иногда пропадает анимация полёта, а
  // увеличение счётчика есть»): раньше частицы ждали measureInWindow внутри
  // onLayout. Цепочка асинхронная (layout → замер → setState → ре-рендер), и
  // когда она не успевала, particles оставался ПУСТЫМ: полёта не было вовсе,
  // а волну через пару секунд закрывал страховочный таймер — счётчик при этом
  // всё равно отрабатывал. Ровно то, что владелец и увидел.
  //
  // Оверлей растянут на absoluteFill, поэтому его origin почти всегда (0,0), а
  // размеры равны окну. Берём это СРАЗУ и рисуем первый кадр без ожидания;
  // фактический замер приходит следом и уточняет origin, если экран смещён
  // (планшетный сплит, модальная подложка).
  const [frame, setFrame] = useState<{
    origin: RewardFlightPoint;
    width: number;
    height: number;
  }>(() => {
    const window = Dimensions.get('window');
    return { origin: { x: 0, y: 0 }, width: window.width, height: window.height };
  });

  // Звук отрыва — ОДИН на всю волну, а не на каждую частицу: 14 наложенных
  // вдохов дали бы шум вместо полёта (тот же приём, что в LearningV2RuneFlight).
  useEffect(() => {
    if (!playStartSound) return;
    soundDirector.request('pm.reward.rune_flight_start', FLIGHT_SOUND_OPTIONS);
  }, [playStartSound]);

  const count = rewardFlightParticleCount(amount);
  const waveMs = count > 0
    ? REWARD_FLIGHT_MS + (count - 1) * REWARD_FLIGHT_STAGGER_MS
    : 0;

  // ОДИН удар счётчика на всю волну — макет «Гибрид».
  //
  // зачем не на каждую частицу (владелец 2026-09-01): удар на касание читался
  // как тряска. Здесь счётчик отзывается один раз мягкой волной на 65% полёта,
  // когда прилетело большинство — то есть ДО конца, иначе реакция выглядит
  // запоздалой.
  useEffect(() => {
    if (waveMs <= 0) return;
    impact.value = withDelay(
      Math.round(waveMs * REWARD_FLIGHT_HIT_AT),
      withSequence(
        withTiming(1, { duration: REWARD_FLIGHT_HIT_UP_MS, easing: IMPACT_UP_EASE }),
        withTiming(0, { duration: REWARD_FLIGHT_HIT_DOWN_MS, easing: IMPACT_DOWN_EASE }),
      ),
    );
    // Звук приземления — вместе с ударом, а не в конце волны.
    const timer = setTimeout(playLandSound, Math.round(waveMs * REWARD_FLIGHT_HIT_AT));
    return () => clearTimeout(timer);
  }, [impact, waveMs]);

  // Траектории считаются один раз на волну: пересчёт в рендере дал бы новую
  // геометрию при каждом ре-рендере Главной и частицы бы прыгали.
  const particles = useMemo(() => {
    if (count <= 0) return [];
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
        // Уточнение уже нарисованного кадра, а НЕ условие его появления.
        // Координаты цели приходят в системе окна (measureInWindow), а частицы
        // живут внутри оверлея — если оверлей смещён, переводим origin.
        rootRef.current?.measureInWindow((x, y) => {
          if (!Number.isFinite(x) || !Number.isFinite(y) || width <= 0 || height <= 0) {
            // Немой отказ запрещён: без причины в логе «полёт пропал» снова
            // будет неотлаживаемым.
            DebugLogger.warn(
              'reward_flight:overlay_measure_invalid',
              JSON.stringify({ x, y, width, height }),
            );
            return;
          }
          setFrame((current) => (
            current.origin.x === x
              && current.origin.y === y
              && current.width === width
              && current.height === height
              ? current // та же геометрия — не будим ре-рендер посреди полёта
              : { origin: { x, y }, width, height }
          ));
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
