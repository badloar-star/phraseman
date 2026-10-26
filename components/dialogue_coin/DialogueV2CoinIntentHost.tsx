/**
 * R50 (координатор 26.10): ОДИН хозяин начисления монет за диалог — по намерениям с диска (app/dialogue_v2_coin_intents.ts).
 *
 * зачем: экран итога терял монеты, если человек уходил, пока копилка читалась с диска. Хост живёт в корне приложения
 * (за флагом dialogue_coin_intent_host_enabled, монтирует DialogueV2CoinIntentGate) и доводит намерения до копилки по
 * одному, тем же usePracticeRunes и тем же входом, что был у экрана (dialogueV2CoinPracticeRunesInput) → тот же id
 * операции на сервере. Порядок как у экрана: копилка прочитана → отметка «начислено» ДО начисления → начисление →
 * намерение снято → зачёт на сервер (settle, долговечная очередь копилки). Журнал — [COINS-EARN] dialog-host.
 */
import React, { useEffect, useRef, useState } from 'react';

import { usePracticeRunes } from '../../hooks/usePracticeRunes';
import { getStableId } from '../../app/stable_id';
import {
  readDialogueV2CoinIntents,
  removeDialogueV2CoinIntent,
  subscribeDialogueV2CoinIntents,
  type DialogueV2CoinIntent,
} from '../../app/dialogue_v2_coin_intents';
import {
  clearDialogueV2CoinsAwarded,
  dialogueV2CoinItemId,
  dialogueV2CoinPracticeRunesInput,
  markDialogueV2CoinsAwarded,
  readDialogueV2CoinsAwarded,
} from '../../app/dialogue_v2_coin_reward';

const LOG = '[COINS-EARN] dialog-host:';
const errText = (error: unknown): string => (error instanceof Error ? error.message : String(error));

async function currentOwner(): Promise<string> {
  try {
    return (await getStableId()).trim();
  } catch (error: unknown) {
    console.warn(`${LOG} нет аккаунта — намерения ждут`, errText(error)); // guard-ok: catch пишет причину
    return '';
  }
}

export default function DialogueV2CoinIntentHost() {
  const [owner, setOwner] = useState<string | null>(null);
  const [queue, setQueue] = useState<readonly DialogueV2CoinIntent[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => subscribeDialogueV2CoinIntents(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ownerNow = await currentOwner();
      if (cancelled) return;
      if (!ownerNow) {
        console.log(`${LOG} аккаунта нет — очередь не читаем`); // guard-ok: ранний выход
        setOwner(null);
        setQueue([]);
        return;
      }
      const rows = await readDialogueV2CoinIntents(ownerNow);
      if (cancelled) return;
      console.log(`${LOG} очередь владельца: ${rows.length}${rows[0] ? ` первое session=${rows[0].sessionId.slice(0, 12)} сумма=${rows[0].amount}` : ''}`); // guard-ok: вход
      setOwner(ownerNow);
      setQueue(rows);
    })();
    return () => { cancelled = true; };
  }, [tick]);

  const head = queue[0] ?? null;
  if (!owner || !head) return null;
  return <IntentWorker key={`${owner}:${head.sessionId}`} owner={owner} intent={head} onDone={() => setTick((n) => n + 1)} />;
}

function IntentWorker({ owner, intent, onDone }: Readonly<{ owner: string; intent: DialogueV2CoinIntent; onDone: () => void }>) {
  const runes = usePracticeRunes({ ...dialogueV2CoinPracticeRunesInput(intent.sessionId), enabled: true });
  const startedRef = useRef(false);
  const runesRef = useRef(runes);
  runesRef.current = runes;

  useEffect(() => {
    if (startedRef.current || runes.hydrating) return;
    startedRef.current = true;
    const { sessionId, amount } = intent;
    const short = sessionId.slice(0, 12);
    void (async () => {
      // аккаунт сменился, пока копилка читалась: чужая копилка — не трогаем, намерение остаётся своему владельцу
      const ownerNow = await currentOwner();
      if (ownerNow !== owner) {
        console.warn(`${LOG} аккаунт сменился (${owner.slice(0, 6)}… → ${ownerNow.slice(0, 6) || 'none'}) — намерение ждёт владельца session=${short}`); // guard-ok: ранний выход
        onDone();
        return;
      }
      if (await readDialogueV2CoinsAwarded(owner, sessionId)) {
        console.log(`${LOG} уже начислено — намерение снимается без начисления session=${short}`); // guard-ok: ранний выход
        await removeDialogueV2CoinIntent(owner, sessionId);
        onDone();
        return;
      }
      if (!(await markDialogueV2CoinsAwarded(owner, sessionId, amount))) {
        // отметка не записалась — начислять нельзя (при повторе было бы дважды); намерение ждёт следующего запуска
        console.warn(`${LOG} отметка не записалась — начисление отложено session=${short}`); // guard-ok: ранний выход
        return;
      }
      let credited = 0;
      for (let item = 1; item <= amount; item += 1) credited += runesRef.current.onCorrectAnswer(dialogueV2CoinItemId(item));
      if (credited <= 0) {
        console.warn(`${LOG} копилка не приняла начисление (credited=${credited}) — отметка откатывается, намерение снято session=${short}`); // guard-ok: ветка отката
        await clearDialogueV2CoinsAwarded(owner, sessionId);
        await removeDialogueV2CoinIntent(owner, sessionId);
        onDone();
        return;
      }
      await removeDialogueV2CoinIntent(owner, sessionId);
      console.log(`${LOG} начислено +${credited} (локально) session=${short}, зачёт на сервер фоном`); // guard-ok: итог
      try {
        await runesRef.current.settle();
        console.log(`${LOG} зачёт отправлен session=${short}`); // guard-ok: итог зачёта
      } catch (error: unknown) {
        console.warn(`${LOG} зачёт не прошёл — копилка повторит при следующем запуске session=${short}`, errText(error)); // guard-ok: catch пишет причину
      }
      onDone();
    })();
  }, [intent, onDone, owner, runes.hydrating]);

  return null;
}
