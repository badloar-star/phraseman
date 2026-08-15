import type AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AVATAR_AURA_OWNED_KEY,
  CUSTOM_AVATAR_OWNED_KEY,
  CUSTOMIZATION_PURCHASE_INTENT_KEY,
} from '../constants/customization_storage_keys';
import type {
  ShardSpendReason,
  CommitShardCompositeOperationInput,
} from './shards_system';
import type { CommitClientShardOperationResult } from './economy/client_shard_operation_ledger';
import { newShardOpId } from './shards_delta_queue';
import { semanticShardOperationId } from './economy/client_shard_semantic_id';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from './account_generation';
import {
  applyCustomizationDraft,
  type ApplyCustomizationInput,
  type CustomizationServiceDeps,
} from './customization_service';

interface PurchaseCustomizationBase {
  target: 'avatar' | 'aura';
  itemId: string;
  cost: number;
  spendReason: Extract<ShardSpendReason, 'custom_avatar' | 'custom_avatar_restyle' | 'avatar_aura'>;
  ownedValue: true | string;
}

export type PurchaseCustomizationInput =
  | (PurchaseCustomizationBase & { mode: 'buy-only'; applyInput?: never })
  | (PurchaseCustomizationBase & { mode: 'buy-and-apply'; applyInput: ApplyCustomizationInput });

export type CustomizationPurchaseIntent = PurchaseCustomizationInput & {
  v: 1;
  accountScope: string;
  opId: string;
  phase: 'prepared' | 'charged' | 'granted';
  createdAt: number;
};

export interface CustomizationPurchaseDeps extends Omit<CustomizationServiceDeps, 'storage'> {
  storage: Pick<typeof AsyncStorage, 'multiSet' | 'multiRemove' | 'getItem'>;
  getAccountScope: () => Promise<string>;
  commitShardCompositeOperation: (
    input: CommitShardCompositeOperationInput,
  ) => Promise<CommitClientShardOperationResult>;
  onOwnershipGranted: (
    target: 'avatar' | 'aura',
    itemId: string,
    ownedValue: true | string,
  ) => void | Promise<void>;
  validatePurchase: (intent: CustomizationPurchaseIntent) => boolean | Promise<boolean>;
  validateApply: (intent: CustomizationPurchaseIntent) => boolean | Promise<boolean>;
}

export type CustomizationPurchaseOutcome = 'applied' | 'purchased-only';

function validInput(input: PurchaseCustomizationInput): boolean {
  return (input.target === 'avatar' || input.target === 'aura')
    && input.itemId.trim().length > 0
    && Number.isFinite(input.cost)
    && input.cost > 0
    && (input.mode === 'buy-only' || !!input.applyInput);
}

async function persistIntent(
  intent: CustomizationPurchaseIntent,
  deps: CustomizationPurchaseDeps,
): Promise<void> {
  await deps.storage.multiSet([[CUSTOMIZATION_PURCHASE_INTENT_KEY, JSON.stringify(intent)]]);
}

export async function prepareCustomizationPurchase(
  input: PurchaseCustomizationInput,
  deps: CustomizationPurchaseDeps,
): Promise<CustomizationPurchaseIntent> {
  if (!validInput(input)) throw new Error('invalid_customization_purchase');
  const accountScope = (await deps.getAccountScope()).trim();
  if (!accountScope) throw new Error('missing_customization_account_scope');
  const intent: CustomizationPurchaseIntent = {
    ...input,
    v: 1,
    accountScope,
    opId: input.spendReason === 'custom_avatar_restyle'
      ? newShardOpId()
      : await semanticShardOperationId(`${input.target}_initial`, input.itemId),
    phase: 'prepared',
    createdAt: Date.now(),
  };
  await persistIntent(intent, deps);
  return intent;
}

function parseOwnedMap(raw: string | null): Record<string, string | true> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, string | true>
      : {};
  } catch {
    return {};
  }
}

async function grantOwnership(
  intent: CustomizationPurchaseIntent,
  deps: CustomizationPurchaseDeps,
): Promise<CustomizationPurchaseIntent> {
  const ownedKey = intent.target === 'avatar' ? CUSTOM_AVATAR_OWNED_KEY : AVATAR_AURA_OWNED_KEY;
  const currentOwned = parseOwnedMap(await deps.storage.getItem(ownedKey));
  const granted: CustomizationPurchaseIntent = { ...intent, phase: 'granted' };
  await deps.storage.multiSet([
    [ownedKey, JSON.stringify({ ...currentOwned, [intent.itemId]: intent.ownedValue })],
    [CUSTOMIZATION_PURCHASE_INTENT_KEY, JSON.stringify(granted)],
  ]);
  await deps.onOwnershipGranted(intent.target, intent.itemId, intent.ownedValue);
  return granted;
}

export async function resumeCustomizationPurchase(
  intent: CustomizationPurchaseIntent,
  deps: CustomizationPurchaseDeps,
): Promise<CustomizationPurchaseOutcome> {
  const accountScope = (await deps.getAccountScope()).trim();
  if (!accountScope || intent.accountScope !== accountScope) throw new Error('customization_purchase_account_mismatch');
  const accountToken = captureAccountGeneration();
  const assertCurrentAccount = async (): Promise<void> => {
    if (
      accountToken.stableId !== accountScope
      || !isCurrentAccountGeneration(accountToken, accountScope)
    ) {
      throw new Error('customization_purchase_account_mismatch');
    }
    const latestScope = (await deps.getAccountScope()).trim();
    if (
      latestScope !== accountScope
      || !isCurrentAccountGeneration(accountToken, accountScope)
    ) {
      throw new Error('customization_purchase_account_mismatch');
    }
  };
  await assertCurrentAccount();
  if (!(await deps.validatePurchase(intent))) {
    await withAccountTransitionLock(async () => {
      await assertCurrentAccount();
      await deps.storage.multiRemove([CUSTOMIZATION_PURCHASE_INTENT_KEY]);
    });
    throw new Error('invalid_customization_purchase_product');
  }
  let current = intent;
  if (current.phase === 'prepared') {
    const ownedKey = current.target === 'avatar' ? CUSTOM_AVATAR_OWNED_KEY : AVATAR_AURA_OWNED_KEY;
    const currentOwned = parseOwnedMap(await deps.storage.getItem(ownedKey));
    const granted: CustomizationPurchaseIntent = { ...current, phase: 'granted' };
    const purchase = await deps.commitShardCompositeOperation({
      amount: current.cost,
      reason: current.spendReason,
      operationId: current.opId,
      grant: {
        kind: current.target === 'avatar'
          ? (current.spendReason === 'custom_avatar_restyle' ? 'custom_avatar_restyle' : 'custom_avatar')
          : 'avatar_aura',
        subjectId: current.itemId,
        payload: { ownedValue: current.ownedValue },
      },
      localWrites: [
        [ownedKey, JSON.stringify({ ...currentOwned, [current.itemId]: current.ownedValue })],
        [CUSTOMIZATION_PURCHASE_INTENT_KEY, JSON.stringify(granted)],
      ],
    });
    if (purchase.status === 'insufficient') throw new Error('insufficient_shards');
    if (purchase.status === 'failed') throw new Error('shard_spend_failed');
    await assertCurrentAccount();
    current = granted;
    await deps.onOwnershipGranted(current.target, current.itemId, current.ownedValue);
  }
  return withAccountTransitionLock(async () => {
    await assertCurrentAccount();
    if (current.phase === 'charged') {
      await persistIntent(current, deps);
      if (!(await deps.validatePurchase(current))) {
        await deps.storage.multiRemove([CUSTOMIZATION_PURCHASE_INTENT_KEY]);
        throw new Error('invalid_customization_purchase_product');
      }
      current = await grantOwnership(current, deps);
    }
    if (current.mode === 'buy-and-apply') {
      if (await deps.validateApply(current)) {
        await applyCustomizationDraft(current.applyInput, deps);
        await deps.storage.multiRemove([CUSTOMIZATION_PURCHASE_INTENT_KEY]);
        return 'applied';
      }
    }
    await deps.storage.multiRemove([CUSTOMIZATION_PURCHASE_INTENT_KEY]);
    return 'purchased-only';
  });
}

function parseIntent(raw: string | null): CustomizationPurchaseIntent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CustomizationPurchaseIntent>;
    if (parsed.v !== 1
      || typeof parsed.accountScope !== 'string'
      || typeof parsed.opId !== 'string'
      || !['prepared', 'charged', 'granted'].includes(String(parsed.phase))) return null;
    return validInput(parsed as PurchaseCustomizationInput)
      ? parsed as CustomizationPurchaseIntent
      : null;
  } catch {
    return null;
  }
}

export async function resumePersistedCustomizationPurchase(
  deps: CustomizationPurchaseDeps,
): Promise<CustomizationPurchaseOutcome | null> {
  const intent = parseIntent(await deps.storage.getItem(CUSTOMIZATION_PURCHASE_INTENT_KEY));
  if (!intent) return null;
  const accountScope = (await deps.getAccountScope()).trim();
  if (!accountScope || intent.accountScope !== accountScope) return null;
  return resumeCustomizationPurchase(intent, deps);
}
