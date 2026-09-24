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
import { useCallback, useRef, useState } from 'react';

import { captureAccountGeneration } from '../app/account_generation';
import { COIN_RANK_MAX, nextCoinRankRow, type CoinRankRow } from '../app/coin_rank_table_v1';
import { upgradeCoinRank, type CoinRankUpgradeResult } from '../app/coin_rank_upgrade_v1';
import { DebugLogger } from '../app/debug-logger';
import { useMyCoinRank } from './use_my_coin_rank';

export type CoinRankCeremony = Readonly<{ fromRank: number; toRank: number }>;

export type UseCoinRankUpgrade = Readonly<{
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
  const rank = useMyCoinRank();
  const [upgrading, setUpgrading] = useState(false);
  const [ceremony, setCeremony] = useState<CoinRankCeremony | null>(null);
  const inFlight = useRef<Promise<CoinRankUpgradeResult> | null>(null);

  const upgrade = useCallback((): Promise<CoinRankUpgradeResult> => {
    if (inFlight.current) {
      DebugLogger.info('[COIN-RANK-UPGRADE]', 'хук: повторный тап во время повышения — ждём тот же результат');
      return inFlight.current;
    }
    if (rank === null) {
      DebugLogger.info('[COIN-RANK-UPGRADE]', 'хук: ранг ещё не прочитан — повышение не запускаем');
      return Promise.resolve({ ok: false, reason: 'stale_rank' } as const);
    }
    setUpgrading(true);
    const run = upgradeCoinRank({ token: captureAccountGeneration(), expectedFromRank: rank })
      .then((result) => {
        DebugLogger.info('[COIN-RANK-UPGRADE]', `хук: результат ${JSON.stringify(result)}`);
        // Церемония только на свежем повышении; повтор (already_applied) не празднуем дважды.
        if (result.ok && result.status === 'upgraded') {
          setCeremony({ fromRank: result.fromRank, toRank: result.toRank });
        }
        return result;
      })
      .finally(() => {
        inFlight.current = null;
        setUpgrading(false);
      });
    inFlight.current = run;
    return run;
  }, [rank]);

  const dismissCeremony = useCallback(() => setCeremony(null), []);

  return {
    rank,
    next: rank === null ? null : nextCoinRankRow(rank),
    isMaxRank: rank === COIN_RANK_MAX,
    upgrading,
    upgrade,
    ceremony,
    dismissCeremony,
  };
}
