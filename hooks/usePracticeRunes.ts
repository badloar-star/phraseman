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
  const [runes, setRunes] = useState(0);
  const [hydrating, setHydrating] = useState(enabled);
  const earningsRef = useRef<PracticeRuneEarnings | null>(null);
  const ownerRef = useRef<string | null>(null);

  useEffect(() => {
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
      const firstCompletion = settledOnceRaw !== '1';

      const storageKey = practiceRuneEarningsStorageKey({
        ownerStableId, activity: input.activity, sessionKey: input.sessionKey,
      });
      const storedRaw = await AsyncStorage.getItem(storageKey);
      if (cancelled) return;
      const stored = parsePracticeRuneEarnings(storedRaw, {
        activity: input.activity, sessionKey: input.sessionKey,
      });
      const earnings = stored ?? createPracticeRuneEarnings({
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
    const current = earningsRef.current;
    if (!current) return 0;
    const result = awardPracticeRune(current, itemId);
    if (result.awarded === 0) return 0;
    earningsRef.current = result.earnings;
    setRunes(result.earnings.pendingRunes);
    persist(result.earnings);
    return result.awarded;
  }, [persist]);

  const settle = useCallback(async (): Promise<void> => {
    const current = earningsRef.current;
    const ownerStableId = ownerRef.current;
    if (!current || !ownerStableId || current.pendingRunes <= 0) return;

    await markPracticeRuneSettlementPending({
      ownerStableId, earnings: current, completionOrdinal: input.completionOrdinal,
    });
    const result = await settlePracticeRuneEarningsToServer(current, input.completionOrdinal);
    if (result.settled) {
      await clearPracticeRuneSettlementPending({
        ownerStableId, activity: current.activity, sessionKey: current.sessionKey,
      });
      await AsyncStorage.setItem(practiceRuneSettledOnceStorageKey({
        ownerStableId, activity: current.activity, sessionKey: current.sessionKey,
      }), '1');
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
