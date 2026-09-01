import { useCallback, useEffect, useRef, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import {
  consumePendingRewardFlight,
  enqueueRewardFlight,
  peekPendingRewardFlight,
  subscribeRewardFlight,
} from '../../app/reward_flight_queue';
import { DebugLogger } from '../../app/debug-logger';
import { soundDirector } from '../../modules/audio/sound_director';
import {
  REWARD_FLIGHT_COUNT_MS,
  REWARD_FLIGHT_HIT_AT,
  REWARD_FLIGHT_TAIL_MS,
  rewardFlightDurationMs,
  type RewardFlightPoint,
} from '../../app/reward_flight_particles';

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
  /**
   * Готовый стиль счётчика рун — вешается на Animated.View (Reanimated).
   *
   * зачем стиль, а не голое значение (владелец, 2026-09-01: «увеличение цифры
   * будто заторможено и не связано с полётом»): пульс считается на UI-потоке
   * там же, где летят частицы, поэтому удар приходится ровно в кадр касания.
   * Прежний Animated.Value жил в JS-потоке и запаздывал на мост.
   */
  readonly runesPulseStyle: StyleProp<ViewStyle>;
  /** Готовый стиль счётчика жемчужин. */
  readonly shardsPulseStyle: StyleProp<ViewStyle>;
  /** Сырой пульс рун — отдаётся оверлею, который по нему бьёт. */
  readonly runesImpact: SharedValue<number>;
  /** Сырой пульс жемчужин. */
  readonly shardsImpact: SharedValue<number>;
  /**
   * Число, которое НАДО ПОКАЗЫВАТЬ в счётчике (вместо сырого баланса).
   *
   * зачем (макет «Гибрид», владелец 2026-09-01): пока летит волна, число
   * докручивается от старого значения к новому, а не прыгает скачком. Скачок
   * рвёт связь «прилетело → выросло»: глаз видит движение частиц и статичную
   * цифру. Вне волны возвращает переданный баланс как есть.
   */
  readonly displayRunes: (balance: number) => number;
  /** То же для жемчужин. */
  readonly displayShards: (balance: number) => number;
  /**
   * ref-колбэк на обёртку счётчика рун.
   *
   * Тип намеренно `unknown`: узел приходит от Reanimated.View, чей ref-тип —
   * внутренний Component<AnimatedProps<…>>, а нам от него нужен ровно один
   * метод measureInWindow. Сужаем внутри, а не тащим сюда чужой тип.
   */
  readonly measureRunesTarget: (ref: unknown) => void;
  /** ref-колбэк на обёртку счётчика жемчужин. */
  readonly measureShardsTarget: (ref: unknown) => void;
  /** Волна долетела — вызывает оверлей. */
  readonly onWaveDone: () => void;
  /**
   * Демо-запуск для дев-кнопки: проиграть полёт, НЕ трогая очередь наград.
   *
   * зачем (владелец, 2026-09-01): анимацию нужно смотреть по требованию, а не
   * ждать реального начисления. Очередь при этом не расходуется — иначе
   * настоящая награда, лежащая в ней, была бы «съедена» просмотром.
   */
  readonly playDemo: (runes: number, shards: number) => void;
}

export function useHomeRewardCollect(
  active: boolean,
  reduceMotion: boolean,
  /**
   * Текущие балансы — нужны докрутке как ТОЧКА ОТСЧЁТА.
   *
   * К моменту волны баланс УЖЕ новый (награда начислена, снапшот обновлён),
   * поэтому докрутка идёт от «баланс минус прилетевшее» к «баланс». Так число
   * растёт синхронно с частицами, а не прыгает до их вылета.
   */
  balances: { runes: number; shards: number },
): UseHomeRewardCollectResult {
  const balancesRef = useRef(balances);
  balancesRef.current = balances;
  const [state, setState] = useState<HomeRewardCollectState>({
    wave: null,
    amount: 0,
    target: null,
  });

  // 0 — покой, 1 — удар. Частицы поднимают значение сами, из своего worklet.
  const runesImpact = useSharedValue(0);
  const shardsImpact = useSharedValue(0);

  // Масштаб счётчика от удара: +28% на пике.
  //
  // зачем (владелец, 2026-09-01: «пульсирует правдоподобно несколько раз»):
  // толчков за волну теперь 1–4, а не по одному на каждую частицу, и каждый
  // длится 270мс — этого достаточно, чтобы удар читался без экстремальной
  // амплитуды. Выше не берём: счётчик стоит в плотной строке заголовка и
  // начал бы толкать соседей.
  const runesPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + runesImpact.value * 0.28 }],
  }));
  const shardsPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + shardsImpact.value * 0.28 }],
  }));

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

  /** Узел годится, только если умеет measureInWindow — больше нам ничего не надо. */
  const asMeasurable = (ref: unknown): MeasurableView | null => (
    typeof (ref as MeasurableView | null)?.measureInWindow === 'function'
      ? (ref as MeasurableView)
      : null
  );

  const measureRunesTarget = useCallback((ref: unknown) => {
    runesNodeRef.current = asMeasurable(ref);
  }, []);
  const measureShardsTarget = useCallback((ref: unknown) => {
    shardsNodeRef.current = asMeasurable(ref);
  }, []);

  /** Освежить обе цели перед запуском волны. */
  const refreshTargets = useCallback(() => {
    measureNode(runesNodeRef.current, runesTargetRef);
    measureNode(shardsNodeRef.current, shardsTargetRef);
  }, [measureNode]);

  // Пульса-функции здесь БОЛЬШЕ НЕТ.
  //
  // зачем (владелец, 2026-09-01: «увеличение цифры будто заторможено и не
  // связано с самим полётом»): раньше счётчик дёргался отсюда, из JS-потока, и
  // ровно один раз — когда через мост прилетало «долетела последняя частица».
  // Между касанием и ударом набегала задержка, и связь с полётом рвалась.
  // Теперь по счётчику бьёт каждая частица из своего worklet (см. impact в
  // HomeRewardCollectFlight), а хук лишь владеет shared value.

  /**
   * Докрутка числа в счётчике.
   *
   * Отдельный лёгкий раннер на requestAnimationFrame, а не Animated: значение
   * нужно КАК ЧИСЛО для отрисовки текстом, а не как стиль. Ре-рендерится
   * только счётчик — Главная целиком не перерисовывается.
   *
   * Кривая ease-out БЕЗ перелёта: цифра, проскочившая финальное значение и
   * вернувшаяся назад, читается как ошибка, а не как оживление.
   */
  const [rollRunes, setRollRunes] = useState<number | null>(null);
  const [rollShards, setRollShards] = useState<number | null>(null);
  const rollRafRef = useRef<Record<RewardCollectWave, number | null>>({ runes: null, shards: null });

  const startRoll = useCallback((wave: RewardCollectWave, from: number, to: number) => {
    if (from === to) return;
    const setter = wave === 'runes' ? setRollRunes : setRollShards;
    const prev = rollRafRef.current[wave];
    if (prev !== null) cancelAnimationFrame(prev);

    const t0 = Date.now();
    const step = () => {
      if (!mountedRef.current) return;
      const p = Math.min(1, (Date.now() - t0) / REWARD_FLIGHT_COUNT_MS);
      const eased = 1 - Math.pow(1 - p, 3);
      setter(Math.round(from + (to - from) * eased));
      if (p < 1) {
        rollRafRef.current[wave] = requestAnimationFrame(step);
      } else {
        rollRafRef.current[wave] = null;
        // Отпускаем показ: дальше счётчик снова рисует настоящий баланс.
        setter(null);
      }
    };
    rollRafRef.current[wave] = requestAnimationFrame(step);
  }, []);

  const displayRunes = useCallback(
    (balance: number) => (rollRunes ?? balance),
    [rollRunes],
  );
  const displayShards = useCallback(
    (balance: number) => (rollShards ?? balance),
    [rollShards],
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
      // Волна закрывается без пульса: счётчик бьётся сам, из оверлея.
      waveDoneRef.current = onFinished;

      // Докрутка стартует ВМЕСТЕ с ударом счётчика (65% волны), а не в конце:
      // число, меняющееся после приземления всех частиц, читается как лаг.
      const waveMs = rewardFlightDurationMs(amount) - REWARD_FLIGHT_TAIL_MS;
      const to = wave === 'runes' ? balancesRef.current.runes : balancesRef.current.shards;
      const from = Math.max(0, to - amount);
      later(
        () => startRoll(wave, from, to),
        Math.round(waveMs * REWARD_FLIGHT_HIT_AT),
      );
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
    [later, startRoll],
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
   * Демо: те же волны, но суммы приходят снаружи и очередь не трогается.
   *
   * Специально переиспользует runWave/finish, а не свою копию: демо обязано
   * показывать РОВНО то, что увидит пользователь, иначе им нельзя проверять
   * настоящую анимацию.
   */
  const playDemo = useCallback((runes: number, shards: number) => {
    if (runningRef.current) {
      DebugLogger.info('reward_flight:demo_busy', JSON.stringify({ runes, shards }));
      return;
    }
    if (runes <= 0 && shards <= 0) return;
    refreshTargets();
    runningRef.current = true;
    DebugLogger.info('reward_flight:demo', JSON.stringify({ runes, shards, reduceMotion }));

    if (reduceMotion) {
      runningRef.current = false;
      setState({ wave: null, amount: 0, target: null });
      soundDirector.request('pm.reward.rune_count_done', PULSE_SOUND_OPTIONS);
      return;
    }

    const playShards = () => {
      if (!runWave('shards', shards, finish)) finish();
    };
    const startedRunes = runWave('runes', runes, () => {
      if (shards > 0) later(playShards, WAVE_GAP_MS);
      else finish();
    });
    if (!startedRunes) {
      if (shards > 0) playShards();
      else finish();
    }
  }, [finish, later, reduceMotion, refreshTargets, runWave]);

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
    measureRunesTarget,
    measureShardsTarget,
    onWaveDone,
    displayRunes,
    displayShards,
    playDemo,
    runesPulseStyle,
    shardsPulseStyle,
    runesImpact,
    shardsImpact,
  };
}
