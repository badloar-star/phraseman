// ─── Баланс монет текущего аккаунта (для кнопок покупки на визитке) ──────────
// зачем: визитке нужны те же правила баланса, что и экрану «Ранг игрока»
// (app/coin_rank.tsx): локальная проекция кошелька, null пока владелец неизвестен,
// принудительная сверка после отказа «не хватает монет». Копия логики, а не вынос
// из app/coin_rank.tsx: исходниковые контракты экрана ранга
// (tests/coin_rank_screen_source_contract.test.mjs) требуют, чтобы она жила там.
import { useCallback, useEffect, useRef, useState } from 'react';

import { subscribeAppSnapshot } from '../app/app_snapshot_store';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
} from '../app/account_generation';
import { DebugLogger } from '../app/debug-logger';
import { getRunesBalanceRead, peekRunes } from '../app/runes_system';

type AccountToken = ReturnType<typeof captureAccountGeneration>;

function activeOwner(token: AccountToken): string | null {
  if (token.phase !== 'active') return null;
  const stableId = token.stableId?.trim() ?? '';
  return stableId || null;
}

export type CoinBalanceProjection = Readonly<{
  /** null — баланс неизвестен (нет владельца или не прочитан); кнопки покупки выключены. */
  balance: number | null;
  forceBalanceReconcile: () => Promise<'durable' | 'unavailable'>;
}>;

export function useCoinBalance(): CoinBalanceProjection {
  const initialTokenRef = useRef<AccountToken>(captureAccountGeneration());
  const ownerRef = useRef<string | null>(activeOwner(initialTokenRef.current));
  const generationRef = useRef<number>(initialTokenRef.current.generation);
  const forcedBlockRef = useRef(false);
  const [balance, setBalance] = useState<number | null>(() => (
    ownerRef.current ? peekRunes() : null
  ));

  const reconcile = useCallback((token: AccountToken = captureAccountGeneration()) => {
    const owner = activeOwner(token);
    if (!owner || ownerRef.current !== owner) return;
    void getRunesBalanceRead()
      .then((read) => {
        if (ownerRef.current !== owner || !isCurrentAccountGeneration(token, owner)) return;
        if (!forcedBlockRef.current) setBalance(read.wallet.balance);
      })
      .catch((error: unknown) => {
        // Оставляем последнее известное значение: неудачное чтение не имеет права
        // «нарисовать» ноль или включить кнопку покупки.
        DebugLogger.warn('[PROFILE-CARD]', `баланс: чтение упало, держим прежнее ${JSON.stringify({ owner, error: String(error) })}`);
      });
  }, []);

  const forceBalanceReconcile = useCallback(async (): Promise<'durable' | 'unavailable'> => {
    const token = captureAccountGeneration();
    const owner = activeOwner(token);
    if (!owner || ownerRef.current !== owner || generationRef.current !== token.generation) return 'unavailable';
    forcedBlockRef.current = true;
    // зачем (координатор 15.10, аудит Optimistic UI п.5): раньше баланс обнулялся ДО ответа — число мигало «—» на время сверки.
    // Держим прежнее значение до ответа (кнопку покупки на это время держит занятость операции); ответ «не подтверждено» →
    // «—», как раньше (покупка выключена, тост объясняет); подтверждено → новое число.
    const sameOwner = (): boolean => ownerRef.current === owner && generationRef.current === token.generation && isCurrentAccountGeneration(token, owner);
    try {
      const read = await getRunesBalanceRead();
      if (!sameOwner()) return 'unavailable';
      if (read.quality !== 'durable') {
        DebugLogger.warn('[PROFILE-CARD]', `баланс: сверка не подтверждена (quality=${read.quality}) — показываем «—»`);
        setBalance(null);
        return 'unavailable';
      }
      forcedBlockRef.current = false;
      setBalance(read.wallet.balance);
      return 'durable';
    } catch (error) {
      DebugLogger.warn('[PROFILE-CARD]', `баланс: принудительная сверка упала ${JSON.stringify({ owner, error: String(error) })}`);
      if (sameOwner()) setBalance(null);
      return 'unavailable';
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const unsubscribeSnapshot = subscribeAppSnapshot(() => {
      if (!mounted) return;
      const token = captureAccountGeneration();
      const owner = activeOwner(token);
      if (forcedBlockRef.current
        || !owner
        || ownerRef.current !== owner
        || generationRef.current !== token.generation
        || !isCurrentAccountGeneration(token, owner)) return;
      setBalance(peekRunes());
    });
    const accountSubscription = subscribeAccountGeneration((token) => {
      if (!mounted) return;
      const nextOwner = activeOwner(token);
      const ownerChanged = ownerRef.current !== nextOwner || generationRef.current !== token.generation;
      ownerRef.current = nextOwner;
      generationRef.current = token.generation;
      if (ownerChanged) {
        forcedBlockRef.current = false;
        setBalance(null);
      }
      if (nextOwner) reconcile(token);
    });
    if (ownerRef.current) reconcile(initialTokenRef.current);
    return () => {
      mounted = false;
      unsubscribeSnapshot();
      accountSubscription.remove();
    };
  }, [reconcile]);

  return { balance, forceBalanceReconcile };
}
