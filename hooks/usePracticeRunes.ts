import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getStableId } from '../app/stable_id';
import {
  awardPracticeRune,
  createPracticeRuneEarnings,
  parsePracticeRuneEarnings,
  practiceRuneEarningsStorageKey,
  practiceRuneSettledOnceStorageKey,
  settlePracticeRuneEarnings,
  PRACTICE_RUNE_FULL_AWARD,
  type PracticeRuneActivity,
  type PracticeRuneEarnings,
} from '../app/practice_rune_earnings';
import {
  clearPracticeRuneSettlementPending,
  markPracticeRuneSettlementPending,
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
  /** Отметить правильный ответ по элементу. Возвращает начисленное (0, если элемент уже оплачен). */
  onCorrectAnswer: (itemId: string) => number;
  /** Зачесть копилку на сервер. Вызывать на экране завершения. */
  settle: () => Promise<void>;
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
  // DEV HUB ONLY: элементы, уже «оплаченные» в этой in-memory сессии — без
  // этого повторный тап по той же карточке в dev-режиме продолжал бы плюсовать
  // до бесконечности, что выглядело бы как явный баг при проверке экрана.
  const devCreditedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // DEV HUB ONLY (владелец, 2026-08-27): «Проверка рун» — диск и сеть не
    // трогаются вообще, счётчик уже выставлен случайным числом в useState выше.
    if (devFakeStartRunes !== undefined) { setHydrating(false); return; }
    if (!enabled) { setHydrating(false); return; }
    let cancelled = false;
    void (async () => {
      const ownerStableId = (await getStableId()).trim();
      if (cancelled) return;
      if (!ownerStableId) { setHydrating(false); return; }
      ownerRef.current = ownerStableId;

      const settledOnceRaw = await AsyncStorage.getItem(practiceRuneSettledOnceStorageKey({
        ownerStableId, activity: input.activity, sessionKey: input.sessionKey,
      }));
      if (cancelled) return;
      // Маркер хранит ЧИСЛО успешных зачётов этой сессии (легаси-значение '1'
      // читается как 1). Оно двигает и цену (повтор = 1 руна), и серверный
      // номер прохода в settle() ниже.
      const settledCountParsed = Number.parseInt(settledOnceRaw ?? '', 10);
      const settledCount = Number.isSafeInteger(settledCountParsed) && settledCountParsed > 0
        ? settledCountParsed
        : (settledOnceRaw ? 1 : 0);
      settledCountRef.current = settledCount;
      const firstCompletion = settledCount === 0;

      const storageKey = practiceRuneEarningsStorageKey({
        ownerStableId, activity: input.activity, sessionKey: input.sessionKey,
      });
      const storedRaw = await AsyncStorage.getItem(storageKey);
      if (cancelled) return;
      const stored = parsePracticeRuneEarnings(storedRaw, {
        activity: input.activity, sessionKey: input.sessionKey,
      });
      // зачем (владелец, 2026-08-28, «анимация полёта в уроках не появилась»):
      // зачтённая копилка прошлого прохода (pendingRunes 0 при непустом списке
      // оплаченных) раньше восстанавливалась КАК ЕСТЬ — каждый элемент значился
      // «уже оплаченным», onCorrectAnswer возвращал 0, и ни полёт, ни счётчик
      // не оживали больше никогда. startNewCompletion() чинил это только на
      // экранах со встроенным финишем; урок финиширует на отдельном роуте, и
      // его новый маунт попадал ровно в эту ловушку. Завершённый проход при
      // гидратации = начать НОВЫЙ проход по цене повтора (правило владельца:
      // «повторно можно проходить и снова зарабатывать руны»).
      const storedIsFinishedPass = stored !== null
        && stored.pendingRunes === 0
        && stored.creditedItemIds.length > 0;
      const earnings = stored !== null && !storedIsFinishedPass
        ? stored
        : createPracticeRuneEarnings({
            activity: input.activity, sessionKey: input.sessionKey, firstCompletion,
          });
      earningsRef.current = earnings;
      setRunes(earnings.pendingRunes);
      setHydrating(false);
    })();
    return () => { cancelled = true; };
    // зачем: sessionKey/activity фиксированы на весь жизненный цикл экрана —
    // пересоздавать копилку при их смене здесь не нужно, это отдельный маунт.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const persist = useCallback((earnings: PracticeRuneEarnings) => {
    const ownerStableId = ownerRef.current;
    if (!ownerStableId) return;
    const storageKey = practiceRuneEarningsStorageKey({
      ownerStableId, activity: earnings.activity, sessionKey: earnings.sessionKey,
    });
    void AsyncStorage.setItem(storageKey, JSON.stringify(earnings)).catch(() => {});
  }, []);

  const onCorrectAnswer = useCallback((itemId: string): number => {
    if (devFakeStartRunes !== undefined) {
      // DEV HUB ONLY: копится поверх случайного старта, в памяти, без диска.
      if (devCreditedRef.current.has(itemId)) return 0;
      devCreditedRef.current.add(itemId);
      const awarded = PRACTICE_RUNE_FULL_AWARD;
      setRunes((value) => value + awarded);
      return awarded;
    }
    const current = earningsRef.current;
    if (!current) return 0;
    const result = awardPracticeRune(current, itemId);
    if (result.awarded === 0) return 0;
    earningsRef.current = result.earnings;
    setRunes(result.earnings.pendingRunes);
    persist(result.earnings);
    return result.awarded;
  }, [devFakeStartRunes, persist]);

  const settle = useCallback(async (): Promise<void> => {
    // DEV HUB ONLY: зачёт — не более чем визуальный жест здесь, диск и сеть
    // не участвуют. Оставляем накопленное число как есть, а не обнуляем: это
    // и есть то, что владелец пришёл посмотреть.
    if (devFakeStartRunes !== undefined) return;
    const current = earningsRef.current;
    const ownerStableId = ownerRef.current;
    if (!current || !ownerStableId || current.pendingRunes <= 0) return;

    // зачем (аудит 2026-08-28): экраны со встроенным финишем передают
    // completionOrdinal=1 на каждый маунт — берём максимум с числом уже
    // подтверждённых зачётов, чтобы повторный проход получил СВЕЖИЙ
    // operationId, а не дубль первого (сервер дубль молча отверг бы).
    const effectiveOrdinal = Math.max(input.completionOrdinal, settledCountRef.current + 1);
    await markPracticeRuneSettlementPending({
      ownerStableId, earnings: current, completionOrdinal: effectiveOrdinal,
    });
    const result = await settlePracticeRuneEarningsToServer(current, effectiveOrdinal);
    if (result.settled) {
      settledCountRef.current = effectiveOrdinal;
      await clearPracticeRuneSettlementPending({
        ownerStableId, activity: current.activity, sessionKey: current.sessionKey,
      });
      // Маркер хранит число подтверждённых зачётов (легаси '1' совместимо).
      await AsyncStorage.setItem(practiceRuneSettledOnceStorageKey({
        ownerStableId, activity: current.activity, sessionKey: current.sessionKey,
      }), String(effectiveOrdinal));
    }
    // Обнуляем локальный счётчик независимо от исхода сети: руны уже
    // отражены в снапшоте оптимистично (settlePracticeRuneEarningsToServer),
    // а незачтённая копилка досылается при следующем заходе в любую
    // активность — экран не должен ждать и не должен показывать их дважды.
    const settled = settlePracticeRuneEarnings(current);
    earningsRef.current = settled;
    setRunes(0);
    persist(settled);
  }, [input.completionOrdinal, persist]);

  const startNewCompletion = useCallback(() => {
    if (!enabled) return;
    // Повторный проход всегда «не первое прохождение» этой сессии — цену
    // определяет settledOnce, а не то, была ли уже вызвана settle() именно
    // сейчас: даже незачтённая (например, экран закрыли без интернета) первая
    // попытка уже потратила «первый раз», второй заход честно платит меньше.
    const earnings = createPracticeRuneEarnings({
      activity: input.activity, sessionKey: input.sessionKey, firstCompletion: false,
    });
    earningsRef.current = earnings;
    setRunes(0);
    persist(earnings);
  }, [enabled, input.activity, input.sessionKey, persist]);

  return { runes, onCorrectAnswer, settle, startNewCompletion, hydrating };
}
