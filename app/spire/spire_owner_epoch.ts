// spire_owner_epoch.ts — «эпоха владельца» Пика: растёт при выходе и смене аккаунта (account_owner_change).
//
// зачем (Ревизор F02, координатор 15.10, R39 🔴): use_spire_game держал uid/stableId, комнату, друзей, итог недели и шаг прошлого
// аккаунта — после выхода A и входа B экран показывал Пик A, а досылка очереди шла с ids A от имени B. Хук читает эпоху
// (useSyncExternalStore) и на её смену сбрасывает всё своё состояние и заново берёт личность. Память модулей Пика (неделя, день
// серии, комната, позиция для окон) сбрасывают сами модули своей подпиской. 0 чтений сети, ничего не хранится на диске.
import { useSyncExternalStore } from 'react';
import { onAccountOwnerChanged } from '../account_owner_change';

const LOG = '[SPIRE]';
let epoch = 0;
const listeners = new Set<() => void>();

onAccountOwnerChanged('spire_owner_epoch', () => {
  epoch += 1;
  console.log(LOG, 'owner_changed', JSON.stringify({ epoch, listeners: listeners.size })); // guard-ok: одна строка на смену владельца
  for (const listener of listeners) listener();
});

export function peekSpireOwnerEpoch(): number {
  return epoch;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Текущая эпоха владельца; меняется при выходе/смене аккаунта. */
export function useSpireOwnerEpoch(): number {
  return useSyncExternalStore(subscribe, peekSpireOwnerEpoch, peekSpireOwnerEpoch);
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
