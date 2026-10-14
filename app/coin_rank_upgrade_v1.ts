// ═══ Атомарное повышение ранга монеты (PM-075) ═══════════════════════════════
// зачем (владелец 2026-09-24, D34/D42/D60/D62): человек сам жмёт «Повысить уровень» на
// Главной, когда накопил цену следующего ранга (N × 1000, app/coin_rank_table_v1.ts);
// монеты списываются, монета-аватар меняется на следующую.
//
// Кошелёк монет = рунный кошелёк (до PM-069), поэтому списание идёт ТЕМ ЖЕ путём, что и
// все покупки за руны (разбор ошибки, диалог, набор карточек): prepareRuneSpend готовит
// записи траты, НИЧЕГО не пишет, а мы кладём их ОДНИМ AsyncStorage.multiSet вместе с
// новым рангом. Отдельного «сначала сняли, потом подняли» нет — конституция экономики
// запрещает именно такой разрыв (без денег И без ранга при сбое посередине).
//
// Идемпотентность — три слоя:
//  1) expectedFromRank: вызывающий передаёт ранг, который ВИДЕЛ человек в момент тапа.
//     Второй тап / ретрай после успеха видит ранг уже +1 → `already_applied`, без второй
//     цены. Без этого двойной тап при достаточном балансе поднял бы на ДВА ранга.
//  2) детерминированный operationId `coin_rank:to_N` — один на ранг на аккаунт, ранг не
//     убывает. Если трата уже лежит в кошельке (сбой между записями на экзотической
//     платформе), prepareRuneSpend вернёт alreadySpent и мы допишем ранг БЕЗ новой цены.
//  3) замки аккаунта и хранилища (как у всех трат) сериализуют параллельные вызовы;
//     токен поколения аккаунта проверяется под замком — смена аккаунта посреди
//     повышения не спишет у нового владельца и не запишет ранг старому.
// Офлайн: сети в повышении нет вовсе (телефон авторитетен, как у всех рунных трат).
//
// Празднование НЕ здесь и НЕ durable: результат `upgraded` — сигнал вызывающему показать
// церемонию (hooks/use_coin_rank_upgrade.ts). Пропуск показа ничего не стоит.
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { isValidCoinRank, nextCoinRankRow } from './coin_rank_table_v1';
import {
  coinRankStateKey,
  parseCoinRankState,
  publishCoinRank,
  type CoinRankStateV1,
} from './coin_rank_state_v1';
import { DebugLogger, reportSwallowed, swallowError } from './debug-logger';
import { prepareRuneSpend, publishRuneSpend } from './level_spin_star_grants';
import { withStorageLock } from './storage_mutex';
import { syncPublicProfileSnapshot } from './public_profile_snapshot';
import { recordCoinRankStory } from '../modules/story_events/story_event_sources';

const LOG = '[COIN-RANK-UPGRADE]';

function trace(message: string, data?: Record<string, unknown>): void {
  DebugLogger.info(LOG, data ? `${message} ${JSON.stringify(data)}` : message);
}

export type CoinRankUpgradeResult =
  | Readonly<{ ok: true; status: 'upgraded'; fromRank: number; toRank: number; price: number; balanceAfter: number; recovered: boolean }>
  | Readonly<{ ok: true; status: 'already_applied'; fromRank: number; toRank: number }>
  | Readonly<{
      ok: false;
      reason: 'identity_changed' | 'invalid_rank' | 'stale_rank' | 'max_rank' | 'insufficient_coins' | 'state_corrupt' | 'failed';
      currentRank?: number;
      price?: number;
    }>;

/** operationId траты за ранг N. Один на ранг: ранг не убывает, повтор не даёт второй цены. */
export function coinRankUpgradeOperationId(toRank: number): string {
  return `coin_rank:to_${toRank}`;
}

export async function upgradeCoinRank(
  input: Readonly<{ token: AccountGenerationToken; expectedFromRank: number; nowMs?: number }>,
): Promise<CoinRankUpgradeResult> {
  const { token, expectedFromRank } = input;
  const owner = token.stableId?.trim() ?? '';
  trace('вход', { owner: owner || null, generation: token.generation, phase: token.phase, expectedFromRank });
  if (!owner || !isCurrentAccountGeneration(token, owner)) {
    trace('отказ: аккаунт сменился или не активен до замка', { owner: owner || null });
    return { ok: false, reason: 'identity_changed' };
  }
  if (!isValidCoinRank(expectedFromRank)) {
    trace('отказ: невалидный expectedFromRank', { expectedFromRank });
    return { ok: false, reason: 'invalid_rank' };
  }

  try {
    return await withAccountTransitionLock(async (lease) => withStorageLock(async (storageLease) => {
      if (!isCurrentAccountGeneration(token, owner)) {
        trace('отказ: аккаунт сменился под замком', { owner });
        return { ok: false, reason: 'identity_changed' } as const;
      }
      const key = coinRankStateKey(owner);
      let state: CoinRankStateV1;
      try {
        state = parseCoinRankState(await AsyncStorage.getItem(key), owner);
      } catch (error) {
        // Битая запись ранга: НЕ списываем — иначе рискуем взять деньги за ранг поверх
        // неизвестного состояния. Нужен разбор по логам.
        DebugLogger.warn(LOG, `отказ: запись ранга битая, списания нет ${JSON.stringify({ owner, error: String(error) })}`);
        return { ok: false, reason: 'state_corrupt' } as const;
      }
      trace('состояние прочитано', { owner, rank: state.rank, upgrades: state.upgrades.length });

      const targetRank = expectedFromRank + 1;
      if (state.rank === targetRank && state.upgrades.some((entry) => entry.toRank === targetRank)) {
        // Повтор уже выполненного повышения (двойной тап, ретрай после успеха).
        publishCoinRank(owner, state.rank);
        trace('уже применено: второй цены нет', { owner, fromRank: expectedFromRank, toRank: targetRank });
        return { ok: true, status: 'already_applied', fromRank: expectedFromRank, toRank: targetRank } as const;
      }
      if (state.rank !== expectedFromRank) {
        trace('отказ: ранг на экране устарел', { owner, expectedFromRank, currentRank: state.rank });
        publishCoinRank(owner, state.rank);
        return { ok: false, reason: 'stale_rank', currentRank: state.rank } as const;
      }
      const next = nextCoinRankRow(state.rank);
      if (!next) {
        trace('отказ: ранг последний', { owner, rank: state.rank });
        return { ok: false, reason: 'max_rank', currentRank: state.rank } as const;
      }

      const operationId = coinRankUpgradeOperationId(next.rank);
      const spend = await prepareRuneSpend({
        token,
        operationId,
        kind: 'coin_rank',
        subjectId: `rank_${next.rank}`,
        price: next.priceToReach,
        createdAtMs: input.nowMs,
      }, lease, storageLease);
      if (!spend.ok) {
        trace('отказ: не хватает монет', { owner, price: next.priceToReach, reason: spend.reason });
        return { ok: false, reason: 'insufficient_coins', currentRank: state.rank, price: next.priceToReach } as const;
      }
      trace('трата подготовлена', {
        owner, operationId, price: next.priceToReach, alreadySpent: spend.alreadySpent,
        balanceBefore: spend.balanceBefore, balanceAfter: spend.balanceAfter,
      });

      const nextState: CoinRankStateV1 = Object.freeze({
        ...state,
        rank: next.rank,
        upgrades: Object.freeze([
          ...state.upgrades,
          Object.freeze({ toRank: next.rank, operationId, price: next.priceToReach, atMs: input.nowMs ?? Date.now() }),
        ]),
      });
      // зачем одним multiSet: трата и ранг ложатся вместе или не ложатся вовсе.
      // При alreadySpent записей траты нет — дописываем только ранг (восстановление).
      await AsyncStorage.multiSet([
        ...spend.durableWrites.map(([k, v]) => [k, v] as [string, string]),
        [key, JSON.stringify(nextState)],
      ]);
      // Показывать новую цифру и новую монету — только после записи на диск.
      publishRuneSpend(token, spend);
      publishCoinRank(owner, next.rank);
      // Публичная карточка — best effort после durable multiSet. Сеть или callable
      // не имеют права откатить уже состоявшееся локальное повышение и списание.
      try {
        // зачем: PM-229-A1 — сбой публичной карточки больше не немой (повышение уже состоялось).
        void syncPublicProfileSnapshot({ reason: 'display_change' }, token).catch(swallowError('coin_rank_upgrade:syncPublicProfileSnapshot'));
      } catch (syncError) {
        reportSwallowed('coin_rank_upgrade:syncPublicProfileSnapshot:sync', syncError);
        // Денежный результат остаётся успешным даже при синхронном сбое окружения.
      }
      trace('повышено', {
        owner, fromRank: state.rank, toRank: next.rank, price: next.priceToReach,
        balanceAfter: spend.balanceAfter, recovered: spend.alreadySpent,
      });
      void recordCoinRankStory(next.rank); // зачем (D192): факт → история у аватарки на Главной; за флагом stories_v1, без сети, поведение места не меняется.
      return {
        ok: true,
        status: 'upgraded',
        fromRank: state.rank,
        toRank: next.rank,
        price: next.priceToReach,
        balanceAfter: spend.balanceAfter,
        recovered: spend.alreadySpent,
      } as const;
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'level_spin_star_identity_changed') {
      trace('отказ: аккаунт сменился во время траты', { owner });
      return { ok: false, reason: 'identity_changed' };
    }
    // Сбой записи/кошелька: multiSet не прошёл → ни трата, ни ранг не опубликованы.
    DebugLogger.error('coin_rank_upgrade', error instanceof Error ? error : new Error(message), 'warning');
    DebugLogger.warn(LOG, `сбой повышения, ничего не опубликовано ${JSON.stringify({ owner, expectedFromRank, error: message })}`);
    return { ok: false, reason: 'failed' };
  }
}
