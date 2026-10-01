import * as Crypto from 'expo-crypto';

import {
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import type { DailyJourneyGiftOccurrenceV1 } from './daily_journey_gift_inbox';
import { commitDailyJourneyFreezeGrant } from './daily_journey_freeze_ledger';
import { enqueueLevelSpinStarGrant } from './level_spin_star_grants';
import {
  dailyJourneySpinCompensationGrants,
  reserveDailyJourneySpinCompensation,
} from './gifts_to_coins_spin_cap_v1';
import { DebugLogger } from './debug-logger';

const RUNE_DENOMINATIONS = Object.freeze([1_000, 500, 250, 100, 50, 20, 10] as const);
const SUPPORTED_AMOUNTS: Readonly<Record<DailyJourneyGiftOccurrenceV1['reward']['kind'], readonly number[]>> = Object.freeze({
  pearls: Object.freeze([10, 20, 50, 100, 150, 250]),
  runes: Object.freeze([100, 200, 300, 400, 500, 600, 700, 750, 800, 1_000]),
  spins: Object.freeze([1, 2, 3, 5]),
  energy_full: Object.freeze([1]),
  energy_plus: Object.freeze([2, 3]),
  freeze: Object.freeze([1, 2]),
});

function assertCurrent(token: AccountGenerationToken, ownerStableId: string): void {
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    throw new Error('daily_journey_account_stale');
  }
}

function assertActivationContract(
  occurrence: DailyJourneyGiftOccurrenceV1,
  claimOperationId: string,
  token: AccountGenerationToken,
): void {
  if (claimOperationId !== `daily-journey-gift-claim:${occurrence.operationId}`) {
    throw new Error('daily_journey_claim_identity_mismatch');
  }
  assertCurrent(token, occurrence.ownerStableId);
  if (!SUPPORTED_AMOUNTS[occurrence.reward.kind]?.includes(occurrence.reward.amount)) {
    throw new Error('daily_journey_activation_reward_unsupported');
  }
}

async function activationHash(
  occurrence: DailyJourneyGiftOccurrenceV1,
  claimOperationId: string,
  token: AccountGenerationToken,
): Promise<string> {
  const ownerStableId = occurrence.ownerStableId;
  assertCurrent(token, ownerStableId);
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify({
      schemaVersion: 'daily-journey-gift-activation.v1',
      claimOperationId,
      ownerStableId,
      operationId: occurrence.operationId,
      occurrenceFingerprint: occurrence.payloadFingerprint,
      reward: occurrence.reward,
    }),
  );
  assertCurrent(token, ownerStableId);
  return hash;
}

function runeGiftIds(amount: number): string[] {
  let remaining = amount;
  const giftIds: string[] = [];
  for (const denomination of RUNE_DENOMINATIONS) {
    while (remaining >= denomination) {
      giftIds.push(`stars_${denomination}`);
      remaining -= denomination;
    }
  }
  if (remaining !== 0 || giftIds.length === 0) {
    throw new Error('daily_journey_rune_amount_unsupported');
  }
  return giftIds;
}

export async function applyDailyJourneyGiftActivation(
  occurrence: DailyJourneyGiftOccurrenceV1,
  claimOperationId: string,
  token: AccountGenerationToken,
): Promise<void> {
  assertActivationContract(occurrence, claimOperationId, token);
  const hash = await activationHash(occurrence, claimOperationId, token);
  switch (occurrence.reward.kind) {
    case 'pearls': {
      // зачем (PM-058, владелец: «удалить выдачу жемчуга за любые действия»):
      // выдача жемчуга по «Дневному пути» остановлена тем же паттерном, что
      // спины (PM-047) — commitShardCreditOperation убран, активация
      // по-прежнему завершается успешно (не бросает), чтобы очередь подарков
      // закрывалась штатно и не зависала в непогашенном состоянии.
      assertCurrent(token, occurrence.ownerStableId);
      return;
    }
    case 'runes': {
      const giftIds = runeGiftIds(occurrence.reward.amount);
      for (const [index, giftId] of giftIds.entries()) {
        await enqueueLevelSpinStarGrant({
          token,
          requestId: `dailyjourney_${hash.slice(0, 32)}_${index + 1}`,
          lane: 'base',
          giftId,
          promotionEligibility: 'gameplay',
        });
        assertCurrent(token, occurrence.ownerStableId);
      }
      return;
    }
    case 'spins': {
      // зачем (D51/D53; координатор 2026-10-01, Q12): спин как механика убран
      // (PM-047), но закрыть его «без начисления» нельзя — человек теряет
      // компенсацию, а миграция «Подарки → монеты» увидит подарок уже забранным.
      // Платим по таблице D53 (130 монет за спин, общий потолок 20) ТЕМИ ЖЕ
      // ключами, что и миграция (gifts_to_coins_spin_cap_v1): кто бы ни пришёл
      // вторым, кошелёк схлопнет повтор. Подарок закрывает штатная квитанция.
      const ownerStableId = occurrence.ownerStableId;
      const reservation = await reserveDailyJourneySpinCompensation(
        ownerStableId, occurrence.operationId, occurrence.reward.amount,
      );
      assertCurrent(token, ownerStableId);
      const grants = await dailyJourneySpinCompensationGrants(
        ownerStableId, occurrence.operationId, reservation.paidSpins,
      );
      for (const grant of grants) {
        await enqueueLevelSpinStarGrant({
          token,
          requestId: grant.requestId,
          lane: 'base',
          giftId: grant.giftId,
          promotionEligibility: 'excluded_compensation',
        });
        assertCurrent(token, ownerStableId);
      }
      DebugLogger.info(
        '[SPIN-RETIRED]',
        `source=daily_journey op=${claimOperationId} amount=${occurrence.reward.amount}`
        + ` promised=spins action=closed_with_coins paidSpins=${reservation.paidSpins}`
        + ` capped=${reservation.cappedSpins} coins=${grants.reduce((sum, grant) => sum + Number(grant.giftId.replace('stars_', '')), 0)}`
        + ` ops=${grants.length} replayed=${reservation.replayed} reason=PM-047_D53_compensation`,
      );
      return;
    }
    case 'energy_full':
    case 'energy_plus':
      assertCurrent(token, occurrence.ownerStableId);
      return;
    case 'freeze': {
      const result = await commitDailyJourneyFreezeGrant({
        claimOperationId,
        amount: occurrence.reward.amount,
        occurrenceFingerprint: occurrence.payloadFingerprint,
      }, token);
      assertCurrent(token, occurrence.ownerStableId);
      if (result.status !== 'applied' && result.status !== 'already_applied') {
        throw new Error('daily_journey_activation_effect_failed');
      }
      return;
    }
  }
}

export async function finalizeDailyJourneyGiftActivation(
  occurrence: DailyJourneyGiftOccurrenceV1,
  claimOperationId: string,
  token: AccountGenerationToken,
): Promise<void> {
  assertActivationContract(occurrence, claimOperationId, token);
  // Level-gift effect receipts are retired; historical occurrences are closed
  // without replaying a removed effect.
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
