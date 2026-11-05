/**
 * R50 (координатор 26.10): ОДИН хозяин начисления монет за диалог — по намерениям с диска (app/dialogue_v2_coin_intents.ts).
 *
 * зачем: экран итога терял монеты, если человек уходил, пока копилка читалась с диска. Хост живёт в корне приложения
 * (за флагом dialogue_coin_intent_host_enabled, монтирует DialogueV2CoinIntentGate) и доводит намерения до копилки по
 * одному, тем же usePracticeRunes и тем же входом, что был у экрана (dialogueV2CoinPracticeRunesInput) → тот же id
 * операции на сервере. Fixed reward seals one immutable operation before the awarded latch and intent removal.
 * Replay stays on ordinal 1; ordinary repeat-pass accumulator hydration cannot allocate another dialogue reward.
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
  dialogueV2CoinItemId,
  dialogueV2CoinPracticeRunesInput,
  markDialogueV2CoinsAwarded,
  readDialogueV2CoinsAwardedStrict,
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
    let cancelled = false;
    const workerRunes = runesRef.current;
    const { sessionId, amount } = intent;
    const short = sessionId.slice(0, 12);
    const active = async () => { const ownerNow = await currentOwner(); return !cancelled && ownerNow === owner; };
    void (async () => {
      // аккаунт сменился, пока копилка читалась: чужая копилка — не трогаем, намерение остаётся своему владельцу
      const ownerNow = await currentOwner();
      if (ownerNow !== owner) {
        console.warn(`${LOG} аккаунт сменился (${owner.slice(0, 6)}… → ${ownerNow.slice(0, 6) || 'none'}) — намерение ждёт владельца session=${short}`); // guard-ok: ранний выход
        onDone();
        return;
      }
      try {
        // A legacy latch is not durable economy proof; reconstruct/replay the
        // same fixed operation even when it survived an earlier pre-seal crash.
        await readDialogueV2CoinsAwardedStrict(owner, sessionId);
        if (!(await active())) return;
        const outcome = await workerRunes.settleFixedReward({ownerStableId: owner, amount,
          itemIds: Array.from({length: amount}, (_, index) => dialogueV2CoinItemId(index + 1))});
        if (outcome.status === 'deferred' || outcome.ownerStableId !== owner || !(await active())) return;
        if (!(await markDialogueV2CoinsAwarded(owner, sessionId, amount))) return;
        if (!(await active())) return;
        await removeDialogueV2CoinIntent(owner, sessionId);
        console.log(`${LOG} durable=${outcome.status} operation=${outcome.operationId} session=${short}`);
        onDone();
      } catch (error: unknown) {
        console.warn(`${LOG} durable reward deferred session=${short}`, errText(error));
      }
    })();
    return () => { cancelled = true; };
  }, [intent, owner, runes.hydrating]);

  return null;
}
