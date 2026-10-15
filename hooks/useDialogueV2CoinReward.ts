/**
 * Начисление монет на итоге диалога (решение владельца 13.10, образец dialogs.html D1–D4).
 *
 * зачем: экран итога (app/dialogue_v2_completion.tsx) знает исход разговора; хук превращает его в монеты тем же путём, что у
 * уроков — usePracticeRunes (копилка на диске → одна серверная расписка practiceRuneGrant), без новых функций. Счётчик
 * меняется сразу (Optimistic UI): монеты лежат в копилке до ответа сервера; не легли в копилку — отметка откатывается.
 * Один раз на сессию: отметка по аккаунту и id сессии ставится ДО начисления. Журнал [COINS-EARN] — вход, каждый ранний
 * выход и каждый catch.
 */
import { useEffect, useRef, useState } from 'react';

import { usePracticeRunes } from './usePracticeRunes';
import { isDevDialogCoinsAward } from '../app/dev_dialog_state';
import { getStableId } from '../app/stable_id';
import {
  clearDialogueV2CoinsAwarded,
  dialogueV2CoinAward,
  dialogueV2CoinSessionKey,
  markDialogueV2CoinsAwarded,
  readDialogueV2CoinsAwarded,
  type DialogueCoinEndedBy,
} from '../app/dialogue_v2_coin_reward';

export type DialogueV2CoinReward = Readonly<{
  /** Сколько монет начислено за этот диалог (0 — ещё не начислено / уже было / не положено). */
  coins: number;
  /** Итог начисления для экрана и журнала. */
  status: 'waiting' | 'awarded' | 'already' | 'skipped';
}>;

export function useDialogueV2CoinReward(input: Readonly<{
  sessionId: string | null;
  /** Итог готов (ответ сервера или локальный разбор) — можно считать сумму. */
  ready: boolean;
  endedBy: DialogueCoinEndedBy;
  mistakes: number;
}>): DialogueV2CoinReward {
  const { sessionId, ready, endedBy, mistakes } = input;
  const sessionKey = sessionId ? dialogueV2CoinSessionKey(sessionId) : 'dialogue_none';
  const practiceRunes = usePracticeRunes({
    // зачем: не speaking_practice — та засчитывает каждый элемент в задание дня «карточки» (today_tasks_practice_map); у lesson
    // ответы в задания дня не идут, а бонус за серию без correctStreak = 0 → ровно N монет.
    activity: 'lesson',
    sessionKey,
    completionOrdinal: 1,
    // Цена 1 за элемент: N элементов = ровно N монет по образцу (30 / 25 / 10).
    repeatPriceOnly: true,
    enabled: Boolean(sessionId),
  });
  const [reward, setReward] = useState<DialogueV2CoinReward>({ coins: 0, status: 'waiting' });
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    if (!sessionId) {
      startedRef.current = true;
      console.warn('[COINS-EARN] dialog: нет id сессии — монеты не начисляются'); // guard-ok: ранний выход
      setReward({ coins: 0, status: 'skipped' });
      return;
    }
    // TODO(R50, после релиза, владелец — Ядро): выход в первые доли секунды, пока копилка читается с диска (hydrating), теряет монеты диалога.
    // Лечение — намерение в очереди отложенных расчётов копилки (markPracticeRuneSettlementPending) с её id операции; до выпуска НЕ делаем
    // (решение координатора 15.10: риск двойного начисления выше пользы).
    if (!ready || practiceRunes.hydrating) return;
    startedRef.current = true;
    const amount = dialogueV2CoinAward({ endedBy, mistakes });
    // зачем (координатор 13.10, кадр итога D1): dev_dialog_coins=award — награда «начислена» для кадра без копилки, отметки и сети; в стор-сборке флаг всегда выключен.
    if (isDevDialogCoinsAward()) {
      console.warn(`[COINS-EARN] dialog: dev=skip_award сумма=${amount} — копилка и сервер не тронуты`); // guard-ok: dev-ветка
      setReward({ coins: amount, status: 'awarded' });
      return;
    }
    console.log(`[COINS-EARN] dialog: вход session=${sessionId.slice(0, 12)} endedBy=${endedBy} ошибок=${mistakes} сумма=${amount} ключ=${sessionKey.slice(0, 40)}`); // guard-ok: вход
    void (async () => {
      let owner = '';
      try {
        owner = (await getStableId()).trim();
      } catch (error: unknown) {
        console.warn('[COINS-EARN] dialog: нет аккаунта — монеты не начисляются', error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
        setReward({ coins: 0, status: 'skipped' });
        return;
      }
      if (!owner) {
        console.warn('[COINS-EARN] dialog: пустой аккаунт — монеты не начисляются'); // guard-ok: ранний выход
        setReward({ coins: 0, status: 'skipped' });
        return;
      }
      if (await readDialogueV2CoinsAwarded(owner, sessionId)) {
        console.log(`[COINS-EARN] dialog: уже начислено за эту сессию — повтор не начисляет session=${sessionId.slice(0, 12)}`); // guard-ok: ранний выход
        setReward({ coins: 0, status: 'already' });
        return;
      }
      if (!(await markDialogueV2CoinsAwarded(owner, sessionId, amount))) {
        setReward({ coins: 0, status: 'skipped' });
        return;
      }
      let credited = 0;
      for (let item = 1; item <= amount; item += 1) credited += practiceRunes.onCorrectAnswer(`dialogue_coin_${item}`);
      if (credited <= 0) {
        console.warn(`[COINS-EARN] dialog: копилка не приняла начисление (credited=${credited}) — отметка откатывается`); // guard-ok: ветка отката
        await clearDialogueV2CoinsAwarded(owner, sessionId);
        setReward({ coins: 0, status: 'skipped' });
        return;
      }
      // Счётчик меняется сразу; сервер подтверждает фоном (одна расписка). Сбой сети — копилка ждёт следующего запуска.
      setReward({ coins: credited, status: 'awarded' });
      console.log(`[COINS-EARN] dialog: начислено +${credited} (локально), зачёт на сервер фоном`); // guard-ok: итог
      try {
        await practiceRunes.settle();
        console.log(`[COINS-EARN] dialog: зачёт отправлен session=${sessionId.slice(0, 12)}`); // guard-ok: итог зачёта
      } catch (error: unknown) {
        console.warn('[COINS-EARN] dialog: зачёт не прошёл — копилка повторит при следующем запуске', error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
      }
    })();
  }, [endedBy, mistakes, practiceRunes, ready, sessionId, sessionKey]);

  return reward;
}
