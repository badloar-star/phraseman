/**
 * R50 (координатор 26.10): намерения «начислить монеты за диалог» — телефон решил сумму на итоге, начисляет один хост.
 *
 * зачем: экран итога начислял сам и терял монеты, если человек уходил, пока копилка читалась с диска
 * (docs/work/dialogue-coins-r50-design-2026-10-26.md). За флагом dialogue_coin_intent_host_enabled экран только пишет
 * намерение сюда, а хост в корне (components/dialogue_coin/DialogueV2CoinIntentHost.tsx) доводит его до копилки —
 * даже после ухода с экрана и перезапуска. Ключ — по владельцу, как у отметок «начислено»: чужой аккаунт чужих намерений
 * не видит. Модуль лёгкий: только AsyncStorage, без React. Журнал — [COINS-EARN].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DialogueCoinEndedBy } from './dialogue_v2_coin_reward';

const LOG = '[COINS-EARN]';
const KEY_PREFIX = 'dialogue_v2_coin_intents_v1';
/** Потолок очереди на владельца: намерение живёт секунды; столько не набирается, но диск не растёт без предела. */
const MAX_INTENTS = 50;

export type DialogueV2CoinIntent = Readonly<{
  sessionId: string;
  amount: number;
  endedBy: DialogueCoinEndedBy;
  mistakes: number;
  atMs: number;
}>;

type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

export function dialogueV2CoinIntentsKey(ownerStableId: string): string {
  return `${KEY_PREFIX}:${ownerStableId}`;
}

const listeners = new Set<() => void>();
/** Подписка на новые намерения (сторож в корне перечитывает флаг и монтирует хост). */
export function subscribeDialogueV2CoinIntents(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); }; // guard-ok: отписка в памяти процесса, не данные пользователя
}
function emit(): void {
  for (const listener of listeners) {
    try { listener(); } catch (error: unknown) {
      console.warn(`${LOG} dialog-intent: подписчик упал`, error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
    }
  }
}

function parseIntents(raw: string | null): DialogueV2CoinIntent[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is DialogueV2CoinIntent => !!row && typeof row === 'object'
      && typeof (row as DialogueV2CoinIntent).sessionId === 'string' && (row as DialogueV2CoinIntent).sessionId.length > 0
      && Number.isSafeInteger((row as DialogueV2CoinIntent).amount) && (row as DialogueV2CoinIntent).amount > 0);
  } catch (error: unknown) {
    console.warn(`${LOG} dialog-intent: очередь не разобралась — считаем пустой`, error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
    return [];
  }
}

/** Намерения владельца (старые первыми). Сбой чтения — пусто, с причиной: начислим при следующем чтении. */
export async function readDialogueV2CoinIntents(ownerStableId: string, storage: Storage = AsyncStorage): Promise<DialogueV2CoinIntent[]> {
  try {
    return parseIntents(await storage.getItem(dialogueV2CoinIntentsKey(ownerStableId)));
  } catch (error: unknown) {
    console.warn(`${LOG} dialog-intent: очередь не прочиталась`, error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
    return [];
  }
}

/**
 * Положить намерение. Повтор той же сессии — не дублирует (возврат на итог ничего не добавляет): 'already_queued'.
 * 'failed' — не записалось: экран не обещает монеты, которых нигде нет.
 */
export async function enqueueDialogueV2CoinIntent(ownerStableId: string, intent: DialogueV2CoinIntent, storage: Storage = AsyncStorage): Promise<'queued' | 'already_queued' | 'failed'> {
  try {
    const current = await readDialogueV2CoinIntents(ownerStableId, storage);
    if (current.some((row) => row.sessionId === intent.sessionId)) {
      console.log(`${LOG} dialog-intent: уже в очереди session=${intent.sessionId.slice(0, 12)}`); // guard-ok: ранний выход
      return 'already_queued';
    }
    const next = [...current, intent].slice(-MAX_INTENTS);
    await storage.setItem(dialogueV2CoinIntentsKey(ownerStableId), JSON.stringify(next));
    console.log(`${LOG} dialog-intent: записано session=${intent.sessionId.slice(0, 12)} сумма=${intent.amount} в очереди=${next.length}`); // guard-ok: итог
    emit();
    return 'queued';
  } catch (error: unknown) {
    console.warn(`${LOG} dialog-intent: не записалось session=${intent.sessionId.slice(0, 12)}`, error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
    return 'failed';
  }
}

/** Снять намерение после того, как копилка его приняла (или оно уже было начислено раньше). */
export async function removeDialogueV2CoinIntent(ownerStableId: string, sessionId: string, storage: Storage = AsyncStorage): Promise<void> {
  try {
    const current = await readDialogueV2CoinIntents(ownerStableId, storage);
    const next = current.filter((row) => row.sessionId !== sessionId);
    if (next.length === current.length) return;
    await storage.setItem(dialogueV2CoinIntentsKey(ownerStableId), JSON.stringify(next));
    console.log(`${LOG} dialog-intent: снято session=${sessionId.slice(0, 12)} осталось=${next.length}`); // guard-ok: итог
  } catch (error: unknown) {
    console.warn(`${LOG} dialog-intent: не снялось session=${sessionId.slice(0, 12)} — хост повторит, отметка «начислено» не даст начислить дважды`, error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
