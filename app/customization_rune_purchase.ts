import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import {
  prepareCustomizationRunePurchase,
  recoverAndHydrateLevelSpinStarGrants,
} from './level_spin_star_grants';
import { commitPhoneStateNonMonetaryEconomyGrant } from './phone_state_economy_bridge';
import { withStorageLock } from './storage_mutex';
import {
  hasValidCustomizationRunePurchaseFingerprint,
  parseCustomizationRunePurchaseExactResult,
  type CustomizationRunePurchaseExactResultV1,
} from '../modules/phone-state/domains/economy';
import type { ApplyCustomizationInput } from './customization_service';

const MAX_PENDING_CUSTOMIZATION_RUNE_PURCHASES = 128;

function ownerFromToken(token: AccountGenerationToken): string {
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    throw new Error('customization_rune_purchase_identity_changed');
  }
  return ownerStableId;
}

export function customizationRunePurchaseOutboxKey(ownerStableId: string): string {
  const owner = ownerStableId.trim();
  if (!owner || owner.length > 160 || owner.includes('/')) {
    throw new Error('customization_rune_purchase_owner_invalid');
  }
  return `customization_rune_purchase_outbox_v1:${encodeURIComponent(owner)}`;
}

async function parseOutbox(
  raw: string | null,
  ownerStableId: string,
): Promise<CustomizationRunePurchaseExactResultV1[]> {
  if (raw === null) return [];
  let input: unknown;
  try { input = JSON.parse(raw) as unknown; } catch { throw new Error('customization_rune_outbox_corrupt'); }
  if (!Array.isArray(input) || input.length > MAX_PENDING_CUSTOMIZATION_RUNE_PURCHASES) {
    throw new Error('customization_rune_outbox_corrupt');
  }
  const operations: CustomizationRunePurchaseExactResultV1[] = [];
  const fingerprints = new Map<string, string>();
  for (const candidate of input) {
    const operation = parseCustomizationRunePurchaseExactResult(candidate);
    if (!operation
      || operation.ownerStableId !== ownerStableId
      || !await hasValidCustomizationRunePurchaseFingerprint(operation)) {
      throw new Error('customization_rune_outbox_corrupt');
    }
    const prior = fingerprints.get(operation.operationId);
    if (prior && prior !== operation.requestFingerprint) {
      throw new Error('customization_rune_outbox_conflict');
    }
    if (!prior) operations.push(operation);
    fingerprints.set(operation.operationId, operation.requestFingerprint);
  }
  return operations;
}

export interface CommitCustomizationRuneCompositeInput {
  token: AccountGenerationToken;
  operationId: string;
  avatarId: string;
  ownedValue: string;
  avatarValue: string;
  applyInput?: ApplyCustomizationInput;
  price: number;
  reason: 'custom_avatar' | 'custom_avatar_restyle';
  localWrites: readonly (readonly [string, string])[];
}

export async function commitCustomizationRuneCompositeOperation(
  input: CommitCustomizationRuneCompositeInput,
): Promise<Readonly<{ duplicate: boolean; balanceBefore: number; balanceAfter: number }>> {
  const ownerStableId = ownerFromToken(input.token);
  const committed = await withAccountTransitionLock(async (lease) => {
    const prepared = await prepareCustomizationRunePurchase({
      token: input.token,
      operationId: input.operationId,
      avatarId: input.avatarId,
      ownedValue: input.ownedValue,
      avatarValue: input.avatarValue,
      ...(input.applyInput ? { applyInput: input.applyInput } : {}),
      price: input.price,
      reason: input.reason,
    }, lease);
    await withStorageLock(async () => {
      if (!isCurrentAccountGeneration(input.token, ownerStableId)) {
        throw new Error('customization_rune_purchase_identity_changed');
      }
      const key = customizationRunePurchaseOutboxKey(ownerStableId);
      const outbox = await parseOutbox(await AsyncStorage.getItem(key), ownerStableId);
      const prior = outbox.find((candidate) => candidate.operationId === prepared.operation.operationId);
      if (prior && prior.requestFingerprint !== prepared.operation.requestFingerprint) {
        throw new Error('customization_rune_outbox_conflict');
      }
      if (!prior && outbox.length >= MAX_PENDING_CUSTOMIZATION_RUNE_PURCHASES) {
        throw new Error('customization_rune_outbox_full');
      }
      const nextOutbox = prior ? outbox : [...outbox, prepared.operation];
      const writes: [string, string][] = [
        ...prepared.durableWrites.map(([keyPart, value]) => [keyPart, value] as [string, string]),
        [key, JSON.stringify(nextOutbox)],
        ...input.localWrites.map(([keyPart, value]) => [keyPart, value] as [string, string]),
      ];
      await AsyncStorage.multiSet(writes);
    });
    return Object.freeze({
      duplicate: prepared.duplicate,
      balanceBefore: prepared.balanceBefore,
      balanceAfter: prepared.balanceAfter,
    });
  });

  void recoverAndHydrateLevelSpinStarGrants(input.token, { syncNow: false }).catch(() => {});
  void syncPendingCustomizationRunePurchases(input.token).catch(() => {});
  return committed;
}

export async function syncPendingCustomizationRunePurchases(
  token: AccountGenerationToken,
): Promise<Readonly<{ synced: number; pending: number }>> {
  const ownerStableId = ownerFromToken(token);
  const operations = await withAccountTransitionLock(async () => withStorageLock(async () => {
    return parseOutbox(
      await AsyncStorage.getItem(customizationRunePurchaseOutboxKey(ownerStableId)),
      ownerStableId,
    );
  }));
  const syncedIds = new Set<string>();
  for (const operation of operations) {
    if (!isCurrentAccountGeneration(token, ownerStableId)) {
      throw new Error('customization_rune_purchase_identity_changed');
    }
    const stored = await commitPhoneStateNonMonetaryEconomyGrant({
      operationId: operation.operationId,
      kind: 'customization_rune_purchase',
      entitlementId: operation.operationId,
      expectedOwnerStableId: ownerStableId,
      expectedAccountGeneration: token.generation,
      exactResult: operation,
    });
    if (stored) syncedIds.add(operation.operationId);
  }
  return withAccountTransitionLock(async () => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(token, ownerStableId)) {
      throw new Error('customization_rune_purchase_identity_changed');
    }
    const remaining = operations.filter((operation) => !syncedIds.has(operation.operationId));
    await AsyncStorage.setItem(customizationRunePurchaseOutboxKey(ownerStableId), JSON.stringify(remaining));
    return Object.freeze({ synced: syncedIds.size, pending: remaining.length });
  }));
}
