import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';

import {
  consumePendingRewardFlight,
  enqueueRewardFlight,
  peekPendingRewardFlight,
  subscribeRewardFlight,
} from '../../app/reward_flight_queue';
import { DebugLogger } from '../../app/debug-logger';
import { soundDirector } from '../../modules/audio/sound_director';
import { rewardFlightDurationMs, type RewardFlightPoint } from '../../app/reward_flight_particles';

/**
 * Управление сбором наград на Главной: когда запускать волну, куда лететь,
 * когда пульсировать счётчику.
 *
 * зачем отдельным хуком: home.tsx уже за 4000 строк, и класть туда ещё один
 * жизненный цикл значит гарантированно сломать соседа при следующей правке
 * (правило «много маленьких файлов»). Здесь только оркестрация; сама отрисовка
 * частиц — в HomeRewardCollectFlight.
 *
 * Порядок волн: сначала руны, затем жемчужины. Одновременный запуск двух валют
 * читался бы как случайная россыпь — глаз не понимает, что во что прилетело.
 */

/** Пауза между волной рун и волной жемчужин. */
const WAVE_GAP_MS = 220;
/** Сколько ждать замера цели, прежде чем сдаться и просто зачислить без анимации. */
const TARGET_WAIT_MS = 1200;

export type RewardCollectWave = 'runes' | 'shards';

/**
 * Всё, что нам нужно от узла-цели. Именно `Animated.View` не подходит по типу
 * (он оборачивает нативный узел), а measureInWindow есть у обоих — поэтому
 * структурный тип, а не конкретный класс компонента.
 */
export interface MeasurableView {
  measureInWindow?: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
}

export interface HomeRewardCollectState {
  /** Какая волна летит прямо сейчас (null — ничего не летит). */
  readonly wave: RewardCollectWave | null;
  /** Сумма текущей волны — задаёт число частиц. */
  readonly amount: number;
  /** Цель текущей волны в координатах окна. */
  readonly target: RewardFlightPoint | null;
}

const PULSE_SOUND_OPTIONS = { scope: 'home-reward-collect' } as const;

export interface UseHomeRewardCollectResult {
  readonly state: HomeRewardCollectState;
  /** Пульс счётчика рун — вешается на transform: [{ scale }]. */
  readonly runesPulse: Animated.Value;
  /** Пульс счётчика жемчужин. */
  readonly shardsPulse: Animated.Value;
  /** ref-колбэк на обёртку счётчика рун: сам меряет центр в координатах окна. */
  readonly measureRunesTarget: (ref: MeasurableView | null) => void;
  /** ref-колбэк на обёртку счётчика жемчужин. */
  readonly measureShardsTarget: (ref: MeasurableView | null) => void;
  /** Волна долетела — вызывает оверлей. */
  readonly onWaveDone: () => void;
}

export function useHomeRewardCollect(
  active: boolean,
  reduceMotion: boolean,
): UseHomeRewardCollectResult {
  const [state, setState] = useState<HomeRewardCollectState>({
    wave: null,
    amount: 0,
    target: null,
  });

  const runesPulse = useRef(new Animated.Value(1)).current;
  const shardsPulse = useRef(new Animated.Value(1)).current;

  const runesTargetRef = useRef<RewardFlightPoint | null>(null);
  const shardsTargetRef = useRef<RewardFlightPoint | null>(null);
  const runningRef = useRef(false);
  const mountedRef = useRef(true);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const waveDoneRef = useRef<(() => void) | null>(null);
  /**
   * Взведён, пока мы возвращаем неотыгранную волну обратно в очередь.
   * Гасит собственное эхо: возврат — это тоже изменение очереди, и без флага
   * подписчик тут же забрал бы её снова, получив бесконечную петлю.
   */
  const retryBlockedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Таймеры волн обязаны умереть вместе с экраном: иначе setState прилетит
      // в размонтированный компонент, а звук — в пустоту.
      for (const timer of timersRef.current) clearTimeout(timer);
      timersRef.current = [];
      runningRef.current = false;
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timersRef.current = timersRef.current.filter((item) => item !== timer);
      if (mountedRef.current) fn();
    }, ms);
    timersRef.current.push(timer);
    return timer;
  }, []);

  // Узлы счётчиков. Держим сами узлы, а не разово снятые координаты: шапка
  // живёт внутри скролла, и координаты, снятые на маунте, к моменту награды
  // могут указывать мимо (класс бага «полёт мимо цели после скролла»).
  const runesNodeRef = useRef<MeasurableView | null>(null);
  const shardsNodeRef = useRef<MeasurableView | null>(null);

  const measureNode = useCallback(
    (
      node: MeasurableView | null,
      slot: React.MutableRefObject<RewardFlightPoint | null>,
    ) => {
      if (!node?.measureInWindow) return;
      node.measureInWindow((x, y, width, height) => {
        if (!mountedRef.current) return;
        // Android/Fabric умеет вернуть нули на неготовом кадре — в этом случае
        // ПРЕЖНЮЮ валидную цель не затираем (тот же приём, что у подсказки
        // энергии и у цели «подарка дня» выше по home.tsx).
        if (!Number.isFinite(x) || !Number.isFinite(y) || width <= 0 || height <= 0) {
          DebugLogger.warn(
            'reward_flight:measure_invalid',
            JSON.stringify({ x, y, width, height, kept: slot.current }),
          );
          return;
        }
        // Центр счётчика: частицы должны гаснуть В иконке, а не у её угла.
        slot.current = { x: x + width / 2, y: y + height / 2 };
      });
    },
    [],
  );

  const measureRunesTarget = useCallback((ref: MeasurableView | null) => {
    runesNodeRef.current = ref;
  }, []);
  const measureShardsTarget = useCallback((ref: MeasurableView | null) => {
    shardsNodeRef.current = ref;
  }, []);

  /** Освежить обе цели перед запуском волны. */
  const refreshTargets = useCallback(() => {
    measureNode(runesNodeRef.current, runesTargetRef);
    measureNode(shardsNodeRef.current, shardsTargetRef);
  }, [measureNode]);

  /** Пульс счётчика в момент приземления — «вспышка», которую просил владелец. */
  const pulse = useCallback(
    (value: Animated.Value) => {
      if (reduceMotion) return;
      value.stopAnimation();
      value.setValue(1);
      Animated.sequence([
        // Разгон короткий: счётчик отзывается сразу, как нажатая кнопка.
        Animated.spring(value, { toValue: 1.32, useNativeDriver: true, friction: 3.4, tension: 180 }),
        Animated.spring(value, { toValue: 1, useNativeDriver: true, friction: 5.5, tension: 140 }),
      ]).start();
      soundDirector.request('pm.reward.rune_flight_land', PULSE_SOUND_OPTIONS);
    },
    [reduceMotion],
  );

  const finish = useCallback(() => {
    runningRef.current = false;
    if (mountedRef.current) setState({ wave: null, amount: 0, target: null });
    soundDirector.request('pm.reward.rune_count_done', PULSE_SOUND_OPTIONS);
  }, []);

  /** Запуск конкретной волны; возвращает false, если лететь нечему/некуда. */
  const runWave = useCallback(
    (wave: RewardCollectWave, amount: number, onFinished: () => void): boolean => {
      const target = wave === 'runes' ? runesTargetRef.current : shardsTargetRef.current;
      if (amount <= 0) return false;
      if (!target) {
        // Ранний выход обязан логировать причину: молчащий отказ ровно так и
        // порождает «анимация просто не работает, и непонятно почему».
        DebugLogger.warn(
          'reward_flight:no_target',
          JSON.stringify({ wave, amount, reason: 'counter_not_measured' }),
        );
        return false;
      }
      setState({ wave, amount, target });
      waveDoneRef.current = () => {
        pulse(wave === 'runes' ? runesPulse : shardsPulse);
        onFinished();
      };
      // Страховка: если оверлей по какой-то причине не сообщит о завершении
      // (экран увели, кадр не собрался), волна всё равно закроется — иначе
      // оверлей завис бы поверх Главной навсегда.
      later(() => {
        if (waveDoneRef.current) {
          DebugLogger.warn(
            'reward_flight:wave_timeout',
            JSON.stringify({ wave, amount }),
          );
          const done = waveDoneRef.current;
          waveDoneRef.current = null;
          done();
        }
      }, rewardFlightDurationMs(amount) + 400);
      return true;
    },
    [later, pulse, runesPulse, shardsPulse],
  );

  const onWaveDone = useCallback(() => {
    const done = waveDoneRef.current;
    waveDoneRef.current = null;
    done?.();
  }, []);

  const forcePlay = useCallback(() => {
    if (runningRef.current) return;
    const taken = consumePendingRewardFlight();
    if (taken.runes <= 0 && taken.shards <= 0) return;
    runningRef.current = true;

    DebugLogger.info('reward_flight:play', JSON.stringify({ taken, reduceMotion }));

    if (reduceMotion) {
      // Reduce motion — не «ничего», а «без движения»: счётчик всё равно
      // отзывается, чтобы человек понял, что награда пришла (правило доступности
      // — убираем перемещение, а не обратную связь).
      runningRef.current = false;
      setState({ wave: null, amount: 0, target: null });
      soundDirector.request('pm.reward.rune_count_done', PULSE_SOUND_OPTIONS);
      return;
    }

    // Возврат в очередь под флагом: иначе собственное же изменение очереди
    // разбудит подписчика и получится петля «вернул → забрал → вернул».
    const putBack = (wave: RewardCollectWave, amount: number) => {
      retryBlockedRef.current = true;
      try {
        enqueueRewardFlight(wave, amount);
      } finally {
        retryBlockedRef.current = false;
      }
    };

    const playShards = () => {
      if (!runWave('shards', taken.shards, finish)) {
        // Цель жемчужин так и не измерилась — возвращаем ИМЕННО их в очередь,
        // чтобы сбор проиграл при следующем заходе, а не пропал молча.
        putBack('shards', taken.shards);
        finish();
      }
    };

    const startedRunes = runWave('runes', taken.runes, () => {
      if (taken.shards > 0) later(playShards, WAVE_GAP_MS);
      else finish();
    });

    if (!startedRunes) {
      if (taken.runes > 0) putBack('runes', taken.runes);
      if (taken.shards > 0) playShards();
      else finish();
    }
  }, [finish, later, reduceMotion, runWave]);

  /**
   * Проигрывание накопленного: руны → пауза → жемчужины.
   *
   * Отличие от forcePlay: сперва проверяем, измерены ли цели. Полёт в неизмеренный
   * счётчик — это молча пропавшая награда, поэтому один раз ждём кадр и только
   * затем забираем очередь в любом случае (иначе она копилась бы вечно).
   */
  const play = useCallback(() => {
    if (runningRef.current) return;
    const queued = peekPendingRewardFlight();
    if (queued.runes <= 0 && queued.shards <= 0) return;

    // Меряем прямо сейчас: measureInWindow асинхронен, поэтому результат ляжет
    // в refs к моменту фактического запуска, а не к этому кадру. Если счётчик
    // ещё ни разу не мерился, сработает ветка ожидания ниже.
    refreshTargets();

    const runesReady = queued.runes <= 0 || runesTargetRef.current !== null;
    const shardsReady = queued.shards <= 0 || shardsTargetRef.current !== null;
    if (!runesReady || !shardsReady) {
      DebugLogger.info(
        'reward_flight:waiting_target',
        JSON.stringify({ queued, runesReady, shardsReady }),
      );
      later(() => {
        const stillQueued = peekPendingRewardFlight();
        if (!runningRef.current && (stillQueued.runes > 0 || stillQueued.shards > 0)) {
          forcePlay();
        }
      }, TARGET_WAIT_MS);
      return;
    }
    forcePlay();
  }, [forcePlay, later, refreshTargets]);

  // Запуск при показе Главной + на живые начисления, случившиеся прямо здесь.
  useEffect(() => {
    if (!active) return undefined;
    // Небольшая пауза после появления экрана: даём кадру собраться и целям
    // измериться, иначе первая волна стартует в пустоту (Performance Bible —
    // первый кадр не должен делить поток с анимацией).
    later(play, 260);
    const unsubscribe = subscribeRewardFlight((value) => {
      if (value.runes <= 0 && value.shards <= 0) return;
      // Возврат неотыгранной волны в очередь (цель не измерилась) тоже будит
      // подписчика. Без этой проверки получилась бы петля «вернул → сразу забрал
      // → снова вернул», крутящаяся до конца жизни экрана. Ждём следующего
      // осмысленного повода: новой награды или повторного захода на Главную.
      if (retryBlockedRef.current) return;
      play();
    });
    return unsubscribe;
  }, [active, later, play]);

  return {
    state,
    runesPulse,
    shardsPulse,
    measureRunesTarget,
    measureShardsTarget,
    onWaveDone,
  };
}
