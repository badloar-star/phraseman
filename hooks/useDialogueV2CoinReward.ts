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
import { getRemoteBool } from '../app/remote_flags';
import { enqueueDialogueV2CoinIntent } from '../app/dialogue_v2_coin_intents';
import {
  clearDialogueV2CoinsAwarded,
  dialogueV2CoinAward,
  dialogueV2CoinItemId,
  dialogueV2CoinPracticeRunesInput,
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
  // зачем (R50, координатор 26.10): за флагом начисляет один хост в корне по намерению с диска — экран только пишет намерение
  // и сразу показывает сумму. Флаг читается один раз на экран: смена посреди итога не превращает его в двух начислителей.
  const [intentHostOn] = useState(() => getRemoteBool('dialogue_coin_intent_host_enabled'));
  // Вход копилки общий с хостом (один sessionKey и номер прохода → один id операции на сервере)
  const runesInput = dialogueV2CoinPracticeRunesInput(sessionId);
  const { sessionKey } = runesInput;
  const practiceRunes = usePracticeRunes({
    ...runesInput,
    // при флаге экран копилку не читает вовсе — начисляет хост
    enabled: Boolean(sessionId) && !intentHostOn,
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
    // R50: выход в первые доли секунды, пока копилка читается с диска (hydrating), терял монеты диалога. Лечение 26.10 — за флагом
    // dialogue_coin_intent_host_enabled (ВЫКЛ; 15.10 владелец отложил из-за риска двойного начисления, включать — его слово после
    // ревью Ревизора): намерение на диск + один хост в корне (components/dialogue_coin). При ВЫКЛ путь ниже прежний.
    // R50 за флагом dialogue_coin_intent_host_enabled: экран не ждёт копилку — намерение пишется сразу, начисляет хост.
    if (!ready || (!intentHostOn && practiceRunes.hydrating)) return;
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
      if (intentHostOn) {
        // «телефон решил»: сумма показывается сразу, отметку «начислено» и копилку ведёт хост (один хозяин начисления)
        const queued = await enqueueDialogueV2CoinIntent(owner, { sessionId, amount, endedBy, mistakes, atMs: Date.now() });
        console.log(`[COINS-EARN] dialog: флаг хоста — намерение ${queued} session=${sessionId.slice(0, 12)} сумма=${amount}`); // guard-ok: ветка флага
        setReward(queued === 'queued' ? { coins: amount, status: 'awarded' } : queued === 'already_queued' ? { coins: 0, status: 'already' } : { coins: 0, status: 'skipped' });
        return;
      }
      if (!(await markDialogueV2CoinsAwarded(owner, sessionId, amount))) {
        setReward({ coins: 0, status: 'skipped' });
        return;
      }
      let credited = 0;
      for (let item = 1; item <= amount; item += 1) credited += practiceRunes.onCorrectAnswer(dialogueV2CoinItemId(item));
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
  }, [endedBy, intentHostOn, mistakes, practiceRunes, ready, sessionId, sessionKey]);

  return reward;
}
