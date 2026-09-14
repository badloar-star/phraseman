import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DebugLogger } from '../app/debug-logger';
import { getStableId } from '../app/stable_id';
import {
  awardPracticeRune,
  createPracticeRuneEarnings,
  forfeitPendingPracticeRunes,
  practiceRuneAwardForCorrectStreak,
  parsePracticeRuneAccumulator,
  practiceRuneEarningsStorageKey,
  recoverablePracticeRunePendingDelta,
  practiceRuneSettledOnceStorageKey,
  settlePracticeRuneEarnings,
  serializePracticeRuneAccumulator,
  PRACTICE_RUNE_FULL_AWARD,
  type PracticeRuneActivity,
  type PracticeRuneEarnings,
} from '../app/practice_rune_earnings';
import {
  clearPracticeRuneSettlementPending,
  flushStalePracticeRuneSettlements,
  markPracticeRuneSettlementPending,
  readCommittedPracticeRuneCompletionOrdinal,
  readCommittedPracticeRuneSettlementEarnings,
  settlePracticeRuneEarningsToServer,
} from '../app/practice_rune_settlement';

/**
 * usePracticeRunes — единая точка подключения копилки рун к экрану сессии.
 *
 * зачем (владелец, 2026-08-27): семь экранов (урок, словарь, глаголы, блиц,
 * тренировка, ошибки, голос) должны заводить/восстанавливать копилку, платить
 * за правильные ответы и зачитывать накопленное на экране завершения ОДИНАКОВО
 * — иначе семь мест независимо переизобретают одну и ту же последовательность
 * операций с диском и рискуют разойтись в деталях.
 *
 * Жизненный цикл:
 *   1. Хук монтируется → читает с диска отметку «уже приносило руны» → читает
 *      сохранённую копилку (или создаёт пустую по правильной цене).
 *   2. Экран зовёт `onCorrectAnswer(itemId)` на каждый правильный ответ.
 *      Копилка обновляется В ПАМЯТИ и персистится на диск асинхронно (не
 *      блокирует кадр) — если игрок выйдет посреди сессии, накопленное не
 *      пропадёт.
 *   3. Экран зовёт `settle()` на экране завершения. Копилка зачитывается на
 *      сервер, отметка «уже приносило руны» ставится, счётчик сбрасывается.
 *
 * Firebase-экономия: ноль чтений/записей Firestore на каждый ответ — только
 * AsyncStorage. Один вызов сервера — при `settle()`.
 */

export type UsePracticeRunesInput = Readonly<{
  activity: PracticeRuneActivity;
  /** Ключ сессии: id урока, id набора карточек, раздел словаря... */
  sessionKey: string;
  /** Порядковый номер прохождения ЭТОЙ сессии — растёт при каждом новом заходе. */
  completionOrdinal: number;
  /** false отключает хук целиком (превью/сандбокс без записи прогресса). */
  enabled?: boolean;
  /**
   * DEV HUB ONLY (владелец, 2026-08-27): «Проверка рун» открывает настоящий
   * экран, но со случайным стартовым числом рун вместо реальной копилки с
   * диска — чтобы визуально проверить счётчик/анимацию без прохождения
   * сессии целиком. Диск и сеть НЕ трогаются вообще: onCorrectAnswer и
   * settle() в этом режиме работают только в памяти (см. ниже).
   */
  devFakeStartRunes?: number;
}>;

export type UsePracticeRunesResult = Readonly<{
  /** Сколько рун накоплено в этой сессии прямо сейчас. */
  runes: number;
  /** Отметить правильный ответ; урок может передать 1-based непрерывную серию. */
  onCorrectAnswer: (itemId: string, correctStreak?: number) => number;
  /** Зачесть копилку на сервер. Вызывать на экране завершения. */
  settle: () => Promise<void>;
  /** Обнулить только незачтённые руны этого прохода, сохранив оплаченные элементы. */
  forfeitPendingRunes: () => Promise<void>;
  /**
   * Начать НОВЫЙ проход той же сессии БЕЗ перемонтирования экрана — кнопка
   * «Повторить»/«Начать заново» на экранах, где финиш встроен в тот же
   * компонент (словарь, глаголы), а не на отдельном роуте (урок).
   *
   * зачем: обычная гидратация запускается один раз при монтировании и не
   * знает про повторный проход. Без этого метода второй проход в рамках
   * одного маунта продолжал бы платить по цене ПЕРВОГО прохождения — здесь же
   * сбрасывается локальный список оплаченных элементов и подставляется цена
   * повтора (решение владельца, 2026-08-27: полная цена только за первый
   * проход, дальше — по одной руне за ответ).
   */
  startNewCompletion: () => void;
  /** Continue a portion only when replacing the accumulator cannot lose pending earnings. */
  startNewCompletionIfSettled: () => boolean;
  /** Копилка ещё не подтянута с диска (первый кадр). */
  hydrating: boolean;
}>;

export function usePracticeRunes(input: UsePracticeRunesInput): UsePracticeRunesResult {
  const enabled = input.enabled ?? true;
  const devFakeStartRunes = input.devFakeStartRunes;
  const [runes, setRunes] = useState(devFakeStartRunes ?? 0);
  const [hydrating, setHydrating] = useState(enabled && devFakeStartRunes === undefined);
  const earningsRef = useRef<PracticeRuneEarnings | null>(null);
  const ownerRef = useRef<string | null>(null);
  // Сколько зачётов этой сессии сервер уже подтвердил (гидратируется из
  // маркера settledOnce). Нужен settle() ниже: экраны со встроенным финишем
  // держат completionOrdinal=1 на каждый маунт, и без этого счётчика повторный
  // проход строил бы ТОТ ЖЕ operationId — сервер отверг бы его как дубль.
  const settledCountRef = useRef(0);
  const settlementInFlightRef = useRef<number | null>(null);
  // Session props can change without an unmount (Blitz "Ещё разок"). Every
  // async hydration/settlement captures this generation so an older round can
  // finish its own durable write without replacing the new round in memory.
  const sessionGenerationRef = useRef(0);
  const activeSessionIdentityRef = useRef('');
  const settlementOrdinalByGenerationRef = useRef<Map<number, number>>(new Map());
  // DEV HUB ONLY: элементы, уже «оплаченные» в этой in-memory сессии — без
  // этого повторный тап по той же карточке в dev-режиме продолжал бы плюсовать
  // до бесконечности, что выглядело бы как явный баг при проверке экрана.
  const devCreditedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    sessionGenerationRef.current += 1;
    const sessionGeneration = sessionGenerationRef.current;
    activeSessionIdentityRef.current = '';
    settlementOrdinalByGenerationRef.current.clear();
    ownerRef.current = null;
    earningsRef.current = null;
    settledCountRef.current = 0;
    settlementInFlightRef.current = null;
    devCreditedRef.current = new Set();
    setRunes(devFakeStartRunes ?? 0);
    setHydrating(enabled && devFakeStartRunes === undefined);
    // DEV HUB ONLY (владелец, 2026-08-27): «Проверка рун» — диск и сеть не
    // трогаются вообще, счётчик уже выставлен случайным числом в useState выше.
    if (devFakeStartRunes !== undefined) { setHydrating(false); return; }
    if (!enabled) { setHydrating(false); return; }
    let cancelled = false;
    void (async () => {
      const ownerStableId = (await getStableId()).trim();
      if (cancelled || sessionGeneration !== sessionGenerationRef.current) return;
      if (!ownerStableId) { setHydrating(false); return; }
      ownerRef.current = ownerStableId;

      const storageKey = practiceRuneEarningsStorageKey({
        ownerStableId, activity: input.activity, sessionKey: input.sessionKey,
      });
      const [storedRaw, settledOnceRaw] = await Promise.all([
        AsyncStorage.getItem(storageKey),
        AsyncStorage.getItem(practiceRuneSettledOnceStorageKey({
          ownerStableId, activity: input.activity, sessionKey: input.sessionKey,
        })),
      ]);
      if (cancelled || sessionGeneration !== sessionGenerationRef.current) return;
      const storedAccumulator = parsePracticeRuneAccumulator(storedRaw, {
        activity: input.activity, sessionKey: input.sessionKey,
      });
      const stored = storedAccumulator?.earnings ?? null;
      const normalizedSessionKey = stored?.sessionKey ?? createPracticeRuneEarnings({
        activity: input.activity,
        sessionKey: input.sessionKey,
        firstCompletion: false,
      }).sessionKey;
      const settledCountParsed = Number.parseInt(settledOnceRaw ?? '', 10);
      const markerCount = Number.isSafeInteger(settledCountParsed) && settledCountParsed > 0
        ? settledCountParsed
        : (settledOnceRaw ? 1 : 0);
      let committedOrdinal = markerCount;
      try {
        committedOrdinal = await readCommittedPracticeRuneCompletionOrdinal({
          ownerStableId,
          activity: input.activity,
          sessionKey: normalizedSessionKey,
          settledOrdinal: markerCount,
          requestedOrdinal: input.completionOrdinal,
        });
      } catch (error) {
        // A targeted recovery read must never wedge all seven practice screens.
        // The immutable commit guard still fails closed if this fallback later
        // encounters an occupied ordinal.
        DebugLogger.error('practice_runes:ordinal_recovery_failed', error, 'warning');
      }
      if (cancelled || sessionGeneration !== sessionGenerationRef.current) return;
      const storedOrdinal = storedAccumulator?.completionOrdinal ?? null;
      let recoveredNextCompletion: PracticeRuneEarnings | null = null;
      if (stored !== null
        && stored.pendingRunes > 0
        && storedOrdinal !== null
        && committedOrdinal >= storedOrdinal) {
        try {
          const committedEarnings = await readCommittedPracticeRuneSettlementEarnings({
            ownerStableId,
            activity: stored.activity,
            sessionKey: stored.sessionKey,
            completionOrdinal: storedOrdinal,
          });
          const committedItems = committedEarnings?.creditedItemIds ?? [];
          const committedHasExactIdentityPrefix = committedEarnings !== null
            && committedEarnings.activity === stored.activity
            && committedEarnings.sessionKey === stored.sessionKey
            && committedEarnings.awardPerItem === stored.awardPerItem
            && committedItems.length <= stored.creditedItemIds.length
            && committedItems.every((itemId, index) => stored.creditedItemIds[index] === itemId);
          const recoveredPendingRunes = committedHasExactIdentityPrefix
            ? recoverablePracticeRunePendingDelta({
                activity: stored.activity,
                awardPerItem: stored.awardPerItem,
                committedItemCount: committedItems.length,
                storedItemCount: stored.creditedItemIds.length,
                committedPendingRunes: committedEarnings?.pendingRunes ?? -1,
                storedPendingRunes: stored.pendingRunes,
              })
            : null;
          if (recoveredPendingRunes !== null) {
            const remainingItems = stored.creditedItemIds.slice(committedItems.length);
            recoveredNextCompletion = remainingItems.length === 0
              ? createPracticeRuneEarnings({
                  activity: stored.activity,
                  sessionKey: stored.sessionKey,
                  firstCompletion: false,
                })
              : Object.freeze({
                  ...stored,
                  // A lesson suffix can legitimately carry the bonus earned at
                  // its original streak position (10→11: +4). Keeping the
                  // proven prefix ids makes pendingRunes=4 parseable after a
                  // second restart without paying any prefix item again.
                  creditedItemIds: stored.activity === 'lesson'
                    ? stored.creditedItemIds
                    : Object.freeze(remainingItems),
                  pendingRunes: recoveredPendingRunes,
                });
          }
        } catch (error) {
          DebugLogger.error('practice_runes:committed_split_failed', error, 'warning');
        }
      }
      if (cancelled || sessionGeneration !== sessionGenerationRef.current) return;
      const storedIsFinishedPass = stored !== null
        && stored.pendingRunes === 0
        && stored.creditedItemIds.length > 0;
      const accumulatorHighWater = storedIsFinishedPass
        ? (storedAccumulator?.completionOrdinal ?? 0)
        : 0;
      // The UI close marker can lag the durable economy journal when the
      // process dies between those writes. A finished v2 accumulator also
      // carries its committed ordinal when the marker trails by more than one.
      const settledCount = Math.max(markerCount, committedOrdinal, accumulatorHighWater);
      settledCountRef.current = settledCount;
      const firstCompletion = settledCount === 0;
      // зачем (владелец, 2026-08-28, «анимация полёта в уроках не появилась»):
      // зачтённая копилка прошлого прохода (pendingRunes 0 при непустом списке
      // оплаченных) раньше восстанавливалась КАК ЕСТЬ — каждый элемент значился
      // «уже оплаченным», onCorrectAnswer возвращал 0, и ни полёт, ни счётчик
      // не оживали больше никогда. startNewCompletion() чинил это только на
      // экранах со встроенным финишем; урок финиширует на отдельном роуте, и
      // его новый маунт попадал ровно в эту ловушку. Завершённый проход при
      // гидратации = начать НОВЫЙ проход по цене повтора (правило владельца:
      // «повторно можно проходить и снова зарабатывать руны»).
      const earnings = recoveredNextCompletion
        ?? (stored !== null && !storedIsFinishedPass
        ? stored
        : createPracticeRuneEarnings({
            activity: input.activity, sessionKey: input.sessionKey, firstCompletion,
          }));
      // A finished accumulator's ordinal belongs to the pass that just closed;
      // the new pass allocated below must not inherit it.
      const activeStoredOrdinal = storedIsFinishedPass ? null : storedOrdinal;
      const assignedOrdinal = recoveredNextCompletion
        ? Math.max(input.completionOrdinal, settledCount + 1)
        : activeStoredOrdinal
        ?? (stored !== null && stored.pendingRunes > 0 && committedOrdinal > markerCount
          // Legacy v1 accumulator after a crash before either close write.
          ? committedOrdinal
          : Math.max(input.completionOrdinal, settledCount + 1));
      settlementOrdinalByGenerationRef.current.set(sessionGeneration, assignedOrdinal);
      if (recoveredNextCompletion) {
        await AsyncStorage.multiSet([
          [storageKey, serializePracticeRuneAccumulator(earnings, assignedOrdinal)],
          [practiceRuneSettledOnceStorageKey({
            ownerStableId, activity: earnings.activity, sessionKey: earnings.sessionKey,
          }), String(Math.max(markerCount, storedOrdinal ?? 0))],
        ]);
        if (cancelled || sessionGeneration !== sessionGenerationRef.current) return;
      }
      activeSessionIdentityRef.current = `${earnings.activity}\u0000${earnings.sessionKey}`;
      earningsRef.current = earnings;
      setRunes(earnings.pendingRunes);
      setHydrating(false);
      DebugLogger.info('practice_runes:hydrated', JSON.stringify({
        activity: input.activity,
        sessionKey: earnings.sessionKey,
        settledCount,
        awardPerItem: earnings.awardPerItem,
        pendingRunes: earnings.pendingRunes,
        restoredFinishedPass: storedIsFinishedPass,
      }));
      void flushStalePracticeRuneSettlements(ownerStableId).catch((error) => {
        DebugLogger.error('practice_runes:stale_flush_failed', error, 'warning');
      });
    })();
    return () => { cancelled = true; };
    // Blitz replaces roundId/sessionKey in-place, without remounting this hook.
    // Rehydrate on identity changes so credited item ids and the operation id
    // can never leak into the next completion.
  }, [devFakeStartRunes, enabled, input.activity, input.sessionKey]);

  const persist = useCallback((earnings: PracticeRuneEarnings) => {
    const ownerStableId = ownerRef.current;
    if (!ownerStableId) return;
    const storageKey = practiceRuneEarningsStorageKey({
      ownerStableId, activity: earnings.activity, sessionKey: earnings.sessionKey,
    });
    const completionOrdinal = settlementOrdinalByGenerationRef.current.get(
      sessionGenerationRef.current,
    ) ?? null;
    void AsyncStorage.setItem(
      storageKey,
      serializePracticeRuneAccumulator(earnings, completionOrdinal),
    ).catch(() => {});
  }, []);

  const onCorrectAnswer = useCallback((itemId: string, correctStreak?: number): number => {
    if (devFakeStartRunes !== undefined) {
      // DEV HUB ONLY: копится поверх случайного старта, в памяти, без диска.
      if (devCreditedRef.current.has(itemId)) return 0;
      const awarded = practiceRuneAwardForCorrectStreak({
        activity: input.activity,
        awardPerItem: PRACTICE_RUNE_FULL_AWARD,
        correctStreak,
        creditedItemCount: devCreditedRef.current.size,
      });
      devCreditedRef.current.add(itemId);
      setRunes((value) => value + awarded);
      return awarded;
    }
    const current = earningsRef.current;
    if (!current) return 0;
    const result = awardPracticeRune(current, itemId, correctStreak);
    if (result.awarded === 0) return 0;
    earningsRef.current = result.earnings;
    setRunes(result.earnings.pendingRunes);
    persist(result.earnings);
    DebugLogger.info('practice_runes:answer_awarded', JSON.stringify({
      activity: result.earnings.activity,
      sessionKey: result.earnings.sessionKey,
      itemId: itemId.slice(0, 80),
      awarded: result.awarded,
      pendingRunes: result.earnings.pendingRunes,
    }));
    return result.awarded;
  }, [devFakeStartRunes, input.activity, persist]);

  const forfeitPendingRunes = useCallback(async (): Promise<void> => {
    if (devFakeStartRunes !== undefined) {
      setRunes(0);
      return;
    }
    const current = earningsRef.current;
    const ownerStableId = ownerRef.current;
    if (!current || !ownerStableId) return;
    const forfeited = forfeitPendingPracticeRunes(current);
    if (forfeited === current) return;
    earningsRef.current = forfeited;
    setRunes(0);
    const storageKey = practiceRuneEarningsStorageKey({
      ownerStableId,
      activity: forfeited.activity,
      sessionKey: forfeited.sessionKey,
    });
    const completionOrdinal = settlementOrdinalByGenerationRef.current.get(
      sessionGenerationRef.current,
    ) ?? null;
    await AsyncStorage.setItem(
      storageKey,
      serializePracticeRuneAccumulator(forfeited, completionOrdinal),
    );
    DebugLogger.info('practice_runes:pending_forfeited', JSON.stringify({
      activity: forfeited.activity,
      sessionKey: forfeited.sessionKey,
    }));
  }, [devFakeStartRunes]);

  const settle = useCallback(async (): Promise<void> => {
    // DEV HUB ONLY: зачёт — не более чем визуальный жест здесь, диск и сеть
    // не участвуют. Оставляем накопленное число как есть, а не обнуляем: это
    // и есть то, что владелец пришёл посмотреть.
    if (devFakeStartRunes !== undefined) {
      DebugLogger.info('practice_runes:settle_skip_dev', JSON.stringify({
        activity: input.activity,
        sessionKey: input.sessionKey,
      }));
      return;
    }
    const current = earningsRef.current;
    const ownerStableId = ownerRef.current;
    if (!current || !ownerStableId || current.pendingRunes <= 0) {
      DebugLogger.info('practice_runes:settle_skip_not_ready', JSON.stringify({
        activity: input.activity,
        sessionKey: input.sessionKey,
        hasEarnings: Boolean(current),
        hasOwner: Boolean(ownerStableId),
        pendingRunes: current?.pendingRunes ?? null,
      }));
      return;
    }
    if (settlementInFlightRef.current !== null) {
      DebugLogger.info('practice_runes:settle_skip_in_flight', JSON.stringify({
        activity: current.activity,
        sessionKey: current.sessionKey,
      }));
      return;
    }
    const sessionGeneration = sessionGenerationRef.current;
    const sessionIdentity = `${current.activity}\u0000${current.sessionKey}`;
    settlementInFlightRef.current = sessionGeneration;
    try {

    // зачем (аудит 2026-08-28): экраны со встроенным финишем передают
    // completionOrdinal=1 на каждый маунт — берём максимум с числом уже
    // подтверждённых зачётов, чтобы повторный проход получил СВЕЖИЙ
    // operationId, а не дубль первого (сервер дубль молча отверг бы).
    const assignedOrdinal = settlementOrdinalByGenerationRef.current.get(sessionGeneration);
    let latestCommittedOrdinal = settledCountRef.current;
    if (assignedOrdinal === undefined) {
      try {
        latestCommittedOrdinal = await readCommittedPracticeRuneCompletionOrdinal({
          ownerStableId,
          activity: current.activity,
          sessionKey: current.sessionKey,
          settledOrdinal: settledCountRef.current,
          requestedOrdinal: input.completionOrdinal,
        });
      } catch (error) {
        DebugLogger.error('practice_runes:ordinal_allocation_failed', error, 'warning');
      }
    }
    const highestAllocatedOrdinal = Math.max(
      0,
      ...settlementOrdinalByGenerationRef.current.values(),
    );
    const effectiveOrdinal = assignedOrdinal ?? Math.max(
      input.completionOrdinal,
      settledCountRef.current + 1,
      latestCommittedOrdinal + 1,
      highestAllocatedOrdinal + 1,
    );
    settlementOrdinalByGenerationRef.current.set(sessionGeneration, effectiveOrdinal);
    DebugLogger.info('practice_runes:settle_start', JSON.stringify({
      activity: current.activity,
      sessionKey: current.sessionKey,
      pendingRunes: current.pendingRunes,
      requestedOrdinal: input.completionOrdinal,
      settledCount: settledCountRef.current,
      effectiveOrdinal,
    }));
    let durableIntent: Awaited<ReturnType<typeof markPracticeRuneSettlementPending>>;
    try {
      durableIntent = await markPracticeRuneSettlementPending({
        ownerStableId, earnings: current, completionOrdinal: effectiveOrdinal,
      });
    } catch (error) {
      // An occupied operation id never authorizes moving these bytes to a new
      // id. Hydration splits only when the durable operation and full pending
      // earnings receipt prove the exact committed prefix.
      throw error;
    }
    DebugLogger.info('practice_runes:pending_marker_written', JSON.stringify({
      activity: current.activity,
      sessionKey: current.sessionKey,
      effectiveOrdinal,
    }));
    const result = await settlePracticeRuneEarningsToServer(
      current, effectiveOrdinal, durableIntent,
    );
    DebugLogger.info('practice_runes:settle_server_result', JSON.stringify({
      activity: current.activity,
      sessionKey: current.sessionKey,
      effectiveOrdinal,
      locallyCommitted: result.locallyCommitted,
      settled: result.settled,
    }));
    if (result.locallyCommitted) {
      const settled = settlePracticeRuneEarnings(current);
      const settledOnceKey = practiceRuneSettledOnceStorageKey({
        ownerStableId, activity: current.activity, sessionKey: current.sessionKey,
      });
      const earningsKey = practiceRuneEarningsStorageKey({
        ownerStableId, activity: current.activity, sessionKey: current.sessionKey,
      });
      const sameStorageSession = activeSessionIdentityRef.current === sessionIdentity;
      const markerOrdinal = sameStorageSession
        ? Math.max(settledCountRef.current, effectiveOrdinal)
        : effectiveOrdinal;
      if (sameStorageSession) settledCountRef.current = markerOrdinal;
      if (sessionGenerationRef.current === sessionGeneration) {
        // Close only the accumulator that is still active. A previous pass may
        // complete after "Повторить", but it must not zero the new pass.
        await AsyncStorage.multiSet([
          [earningsKey, serializePracticeRuneAccumulator(settled, effectiveOrdinal)],
          [settledOnceKey, String(markerOrdinal)],
        ]);
        earningsRef.current = settled;
      } else {
        // Preserve the old pass's durable ordinal without replacing the newer
        // accumulator that shares this activity/session storage key.
        await AsyncStorage.setItem(settledOnceKey, String(markerOrdinal));
      }
    }
    if (result.settled) {
      await clearPracticeRuneSettlementPending({
        ownerStableId,
        activity: current.activity,
        sessionKey: current.sessionKey,
        completionOrdinal: effectiveOrdinal,
      });
    }
    // Закрываем локальную копилку, но сохраняем показанный итог на экране:
    // это уже заработанные руны, а не индикатор незавершённой транзакции.
    // Новый проход явно обнулит число через startNewCompletion().
    DebugLogger.info('practice_runes:local_counter_settled', JSON.stringify({
      activity: current.activity,
      sessionKey: current.sessionKey,
      effectiveOrdinal,
      locallyCommitted: result.locallyCommitted,
      serverSettled: result.settled,
      displayedRunes: current.pendingRunes,
    }));
    } finally {
      if (settlementInFlightRef.current === sessionGeneration) {
        settlementInFlightRef.current = null;
      }
    }
  }, [
    devFakeStartRunes,
    input.activity,
    input.completionOrdinal,
    input.sessionKey,
  ]);

  const startNewCompletion = useCallback(() => {
    if (!enabled) return;
    sessionGenerationRef.current += 1;
    const sessionGeneration = sessionGenerationRef.current;
    settlementInFlightRef.current = null;
    devCreditedRef.current = new Set();
    // Повторный проход всегда «не первое прохождение» этой сессии — цену
    // определяет settledOnce, а не то, была ли уже вызвана settle() именно
    // сейчас: даже незачтённая (например, экран закрыли без интернета) первая
    // попытка уже потратила «первый раз», второй заход честно платит меньше.
    const earnings = createPracticeRuneEarnings({
      activity: input.activity, sessionKey: input.sessionKey, firstCompletion: false,
    });
    const highestAllocatedOrdinal = Math.max(
      0,
      ...settlementOrdinalByGenerationRef.current.values(),
    );
    settlementOrdinalByGenerationRef.current.set(sessionGeneration, Math.max(
      input.completionOrdinal,
      settledCountRef.current + 1,
      highestAllocatedOrdinal + 1,
    ));
    activeSessionIdentityRef.current = `${earnings.activity}\u0000${earnings.sessionKey}`;
    earningsRef.current = earnings;
    setRunes(0);
    persist(earnings);
  }, [enabled, input.activity, input.sessionKey, persist]);

  const startNewCompletionIfSettled = useCallback((): boolean => {
    if (!enabled) return false;
    if (devFakeStartRunes === undefined && (
      !earningsRef.current
      || earningsRef.current.pendingRunes !== 0
      || settlementInFlightRef.current !== null
    )) return false;
    startNewCompletion();
    return true;
  }, [enabled, devFakeStartRunes, startNewCompletion]);

  return { runes, onCorrectAnswer, settle, forfeitPendingRunes, startNewCompletion, startNewCompletionIfSettled, hydrating };
}
