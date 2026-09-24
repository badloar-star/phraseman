// ─── Ранг монеты текущего аккаунта для показа (PM-076) ──────────────────────
// зачем: аватар человека = монета его ранга (D03/D61). Хук даёт ранг синхронно из кэша
// в памяти (первый кадр без прыжка, если ранг уже читали в этом запуске), затем читает
// диск и слушает публикации повышения — после подтверждённого апгрейда аватар меняется
// в тот же кадр, без сети. Смена аккаунта сбрасывает значение, чужой ранг не показывается.
//
// null = ранг ещё неизвестен (или запись битая) → вызывающий показывает прежний аватар,
// а не выдумывает медную монету до чтения.
import { useEffect, useState } from 'react';

import { captureAccountGeneration, subscribeAccountGeneration } from '../app/account_generation';
import { peekCoinRank, readCoinRank, subscribeCoinRank } from '../app/coin_rank_state_v1';

export function useMyCoinRank(): number | null {
  const [owner, setOwner] = useState<string | null>(() => captureAccountGeneration().stableId);
  const [rank, setRank] = useState<number | null>(() => peekCoinRank(captureAccountGeneration().stableId));

  useEffect(() => {
    const sub = subscribeAccountGeneration((token) => {
      setOwner(token.phase === 'active' ? token.stableId : null);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!owner) {
      setRank(null);
      return undefined;
    }
    let alive = true;
    setRank(peekCoinRank(owner));
    void readCoinRank(owner).then((value) => {
      // readCoinRank сам логирует сбой чтения; здесь только не пишем в размонтированный хук.
      if (alive) setRank(value);
    });
    const unsubscribe = subscribeCoinRank((changedOwner, value) => {
      if (alive && changedOwner === owner) setRank(value);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [owner]);

  return rank;
}
