// ─── Кнопка «Повысить уровень»: хук повышения ранга монеты (PM-075/077) ─────
// зачем (D42/D62 п.3–4): механика готова к подключению к кнопке на Главной (саму кнопку
// ставит сессия интерфейса — home.tsx не наш файл). Хук:
//  • отдаёт текущий ранг и строку следующего (цена, название, картинка) из единой таблицы;
//  • upgrade() — атомарное списание + ранг (app/coin_rank_upgrade_v1.ts), защита от
//    двойного тапа (ref в полёте + expectedFromRank = ранг, который видел человек);
//  • после `upgraded` кладёт в состояние `ceremony` {fromRank, toRank} — ТОЛЬКО в память.
//    Празднование не durable: ранг и списание уже записаны, показ — украшение; закрыли,
//    перезапустили, пропустили — ничего не начисляется и не списывается повторно.
//
// Аватар и баланс обновляются сами (publishCoinRank / publishRuneSpend) до показа церемонии.
import { useCallback, useEffect, useRef, useState } from 'react';

import { captureAccountGeneration } from '../app/account_generation';
import { COIN_RANK_MAX, nextCoinRankRow, type CoinRankRow } from '../app/coin_rank_table_v1';
import { upgradeCoinRank, type CoinRankUpgradeResult } from '../app/coin_rank_upgrade_v1';
import { DebugLogger } from '../app/debug-logger';
import { getDevCoinBalanceOverride, isDevCoinUpgradeHold } from '../app/dev_coin_rank';
import {
  isCoinRankCeremonyBindingStale,
  isCoinRankOwnerBindingCurrent,
} from './coin_rank_upgrade_guard';
import { useMyCoinRankBinding, type MyCoinRankBinding } from './use_my_coin_rank';

export type CoinRankCeremony = Readonly<{
  ownerStableId: string;
  accountGeneration: number;
  fromRank: number;
  toRank: number;
}>;

export type UseCoinRankUpgrade = Readonly<{
  /** Immutable owner/generation/rank that produced the visible rank. */
  rankBinding: MyCoinRankBinding | null;
  /** Текущий ранг или null, пока не прочитан (кнопку в этом состоянии не показывать). */
  rank: number | null;
  /** Следующий ранг (цена priceToReach, levelTitle, source) или null на последнем ранге. */
  next: CoinRankRow | null;
  isMaxRank: boolean;
  upgrading: boolean;
  upgrade: () => Promise<CoinRankUpgradeResult>;
  /** Не null → показать <CoinRankUpgradeCeremony ceremony={...} onDone={dismissCeremony} />. */
  ceremony: CoinRankCeremony | null;
  dismissCeremony: () => void;
}>;

export function useCoinRankUpgrade(): UseCoinRankUpgrade {
  const binding = useMyCoinRankBinding();
  const rank = binding?.rank ?? null;
  const [upgrading, setUpgrading] = useState(false);
  const [ceremony, setCeremony] = useState<CoinRankCeremony | null>(null);
  const inFlight = useRef<Promise<CoinRankUpgradeResult> | null>(null);

  const upgrade = useCallback((): Promise<CoinRankUpgradeResult> => {
    if (inFlight.current) {
      DebugLogger.info('[COIN-RANK-UPGRADE]', 'хук: повторный тап во время повышения — ждём тот же результат');
      return inFlight.current;
    }
    // зачем (Авторизация 12.10, coins-004 и защита денег): dev `coinupgrade=hold` держит «Проверяем повышение…» без сервера; при подменённом
    // балансе (`coins=N`, только показ) настоящее повышение НЕ запускается — иначе тап списал бы настоящие монеты. В сторе оба геттера выключены.
    if (isDevCoinUpgradeHold()) {
      DebugLogger.info('[COIN-RANK-UPGRADE]', '[DEV-STATE] повышение удержано (coinupgrade=hold) — сервер не вызывается');
      setUpgrading(true);
      const held = new Promise<CoinRankUpgradeResult>(() => undefined);
      inFlight.current = held;
      return held;
    }
    if (getDevCoinBalanceOverride() !== null) {
      DebugLogger.warn('[COIN-RANK-UPGRADE]', '[DEV-STATE] повышение отклонено — баланс подменён для показа (coins=N), списания нет');
      return Promise.resolve({ ok: false, reason: 'failed' } as const);
    }
    const token = captureAccountGeneration();
    if (!binding || !isCoinRankOwnerBindingCurrent(binding, token)) {
      DebugLogger.info('[COIN-RANK-UPGRADE]', 'хук: показанный ранг не принадлежит текущему поколению аккаунта — повышение не запускаем');
      return Promise.resolve({ ok: false, reason: 'stale_rank' } as const);
    }
    setUpgrading(true);
    const run = upgradeCoinRank({ token, expectedFromRank: binding.rank })
      .then((result) => {
        DebugLogger.info('[COIN-RANK-UPGRADE]', `хук: результат ${JSON.stringify(result)}`);
        // зачем (владелец 30.09: «анимация не запускается при изменении ранга») — временная
        // трассировка [RANK-CEREMONY]: печатаем КАЖДОЕ условие, решающее, заведём ли церемонию.
        const ownerCurrentNow = isCoinRankOwnerBindingCurrent(binding, captureAccountGeneration());
        DebugLogger.info('[RANK-CEREMONY]', `хук: решение о церемонии ${JSON.stringify({
          ok: result.ok,
          status: result.ok ? result.status : null,
          reason: result.ok ? null : (result as { reason?: string }).reason ?? null,
          resultFromRank: result.ok ? result.fromRank : null,
          resultToRank: result.ok ? result.toRank : null,
          bindingRankAtTap: binding.rank,
          ownerCurrentNow,
        })}`);
        // Церемония только на свежем повышении; повтор (already_applied) не празднуем дважды.
        if (result.ok && result.status === 'upgraded'
          && result.fromRank === binding.rank
          && ownerCurrentNow) {
          DebugLogger.info('[RANK-CEREMONY]', `хук: церемония заведена ${result.fromRank}→${result.toRank}`);
          setCeremony({
            ownerStableId: binding.ownerStableId,
            accountGeneration: binding.accountGeneration,
            fromRank: result.fromRank,
            toRank: result.toRank,
          });
        } else {
          DebugLogger.info('[RANK-CEREMONY]', 'хук: церемонию НЕ заводим — см. решение выше');
        }
        return result;
      })
      .finally(() => {
        inFlight.current = null;
        setUpgrading(false);
      });
    inFlight.current = run;
    return run;
  }, [binding]);

  useEffect(() => {
    if (!ceremony) return;
    const stale = isCoinRankCeremonyBindingStale(ceremony, binding, captureAccountGeneration());
    DebugLogger.info('[RANK-CEREMONY]', `хук: сверка церемонии с рангом ${JSON.stringify({
      ceremonyFrom: ceremony.fromRank,
      ceremonyTo: ceremony.toRank,
      bindingRank: binding?.rank ?? null,
      bindingIsNull: binding === null,
      stale,
    })}`);
    if (stale) {
      DebugLogger.info('[RANK-CEREMONY]', 'хук: церемония устарела — сбрасываем');
      setCeremony(null);
    }
  }, [binding, ceremony]);

  const dismissCeremony = useCallback(() => setCeremony(null), []);

  return {
    rankBinding: binding,
    rank,
    next: rank === null ? null : nextCoinRankRow(rank),
    isMaxRank: rank === COIN_RANK_MAX,
    upgrading,
    upgrade,
    ceremony,
    dismissCeremony,
  };
}
