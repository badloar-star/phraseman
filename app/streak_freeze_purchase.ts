import { commitShardCompositeOperation } from './shards_system';
import { semanticShardOperationId } from './economy/client_shard_semantic_id';

export const STREAK_FREEZE_STORAGE_KEY = 'streak_freeze';

export async function purchaseStreakFreeze(
  costShards: number,
  dateKey: string,
): Promise<'ok' | 'insufficient' | 'failed'> {
  const state = { active: true, date: dateKey };
  const purchase = await commitShardCompositeOperation({
    amount: costShards,
    reason: 'streak_freeze',
    operationId: await semanticShardOperationId('streak_freeze', dateKey),
    grant: { kind: 'streak_freeze', subjectId: dateKey, payload: state },
    localWrites: [[STREAK_FREEZE_STORAGE_KEY, JSON.stringify(state)]],
  });
  if (purchase.status === 'insufficient') return 'insufficient';
  if (purchase.status === 'failed') return 'failed';
  return 'ok';
}
