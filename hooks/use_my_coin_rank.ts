// ─── Ранг монеты текущего аккаунта для показа (PM-076) ──────────────────────
// зачем: аватар человека = монета его ранга (D03/D61). Хук даёт ранг синхронно из кэша
// в памяти (первый кадр без прыжка, если ранг уже читали в этом запуске), затем читает
// диск и слушает публикации повышения — после подтверждённого апгрейда аватар меняется
// в тот же кадр, без сети. Смена аккаунта сбрасывает значение, чужой ранг не показывается.
//
// null = ранг ещё неизвестен (или запись битая) → вызывающий показывает прежний аватар,
// а не выдумывает медную монету до чтения.
import { useEffect, useRef, useState } from 'react';

import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from '../app/account_generation';
import { peekCoinRank, readCoinRank, subscribeCoinRank } from '../app/coin_rank_state_v1';

export type MyCoinRankBinding = Readonly<{
  ownerStableId: string;
  accountGeneration: number;
  rank: number;
}>;

function activeOwner(token: AccountGenerationToken): string | null {
  if (token.phase !== 'active') return null;
  return token.stableId?.trim() || null;
}

function bindingFor(token: AccountGenerationToken, rank: number | null): MyCoinRankBinding | null {
  const owner = activeOwner(token);
  if (!owner || rank === null) return null;
  return Object.freeze({ ownerStableId: owner, accountGeneration: token.generation, rank });
}

/** Rank plus the exact account generation that produced its visible value. */
export function useMyCoinRankBinding(): MyCoinRankBinding | null {
  const initialTokenRef = useRef<AccountGenerationToken>(captureAccountGeneration());
  const [token, setToken] = useState<AccountGenerationToken>(initialTokenRef.current);
  const [binding, setBinding] = useState<MyCoinRankBinding | null>(() => (
    bindingFor(initialTokenRef.current, peekCoinRank(activeOwner(initialTokenRef.current)))
  ));

  useEffect(() => {
    const sub = subscribeAccountGeneration((token) => {
      // Owner and generation change invalidate the displayed rank immediately;
      // the new owner is never paired with a rank from the previous render.
      setBinding((current) => (
        current
        && current.ownerStableId === activeOwner(token)
        && current.accountGeneration === token.generation
          ? current
          : null
      ));
      setToken(token);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const owner = activeOwner(token);
    if (!owner) {
      setBinding(null);
      return undefined;
    }
    let alive = true;
    const commit = (value: number | null) => {
      if (!alive || !isCurrentAccountGeneration(token, owner)) return;
      setBinding(bindingFor(token, value));
    };
    commit(peekCoinRank(owner));
    void readCoinRank(owner).then((value) => {
      // readCoinRank logs a corrupt row; commit keeps owner and generation atomic.
      commit(value);
    });
    const unsubscribe = subscribeCoinRank((changedOwner, value) => {
      if (changedOwner === owner) commit(value);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [token]);

  return binding;
}

export function useMyCoinRank(): number | null {
  return useMyCoinRankBinding()?.rank ?? null;
}
