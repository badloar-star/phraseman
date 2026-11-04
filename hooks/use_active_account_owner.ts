// use_active_account_owner.ts — stableId активного аккаунта (или null) с перерисовкой при смене аккаунта.
//
// зачем (владелец 04.11, дыры новичка/восстановления): вердикт «новый/старый», приветствие и окна «Открытие разделов» принадлежат аккаунту, а не процессу;
// экран, который их показывает, обязан пересчитать решение, когда аккаунт сменился (выход, удаление, второй человек на телефоне).
import { useSyncExternalStore } from 'react';
import { captureAccountGeneration, subscribeAccountGeneration } from '../app/account_generation';

function activeOwner(): string | null {
  const token = captureAccountGeneration();
  return token.phase === 'active' && token.stableId ? token.stableId : null;
}

function subscribe(onChange: () => void): () => void {
  const subscription = subscribeAccountGeneration(onChange);
  return () => subscription.remove();
}

export function useActiveAccountOwner(): string | null {
  return useSyncExternalStore(subscribe, activeOwner, activeOwner);
}
