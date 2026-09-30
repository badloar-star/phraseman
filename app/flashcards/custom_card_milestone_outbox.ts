import type { StudyTarget } from '../study_target';
import { CUSTOM_CARD_OWNER_ALERT_MILESTONE } from './custom_card_access';

export const CUSTOM_CARD_MILESTONE_OUTBOX_PREFIX = 'custom_card_milestone_outbox_v1:';

type MilestoneStatus = 'pending' | 'acknowledged';

type StoredMilestone = Readonly<{
  schemaVersion: 1;
  stableId: string;
  generation: number;
  language: StudyTarget;
  milestone: typeof CUSTOM_CARD_OWNER_ALERT_MILESTONE;
  count: number;
  createdAtMs: number;
  status: MilestoneStatus;
  acknowledgedAtMs?: number;
}>;

export type CustomCardMilestoneScope = Readonly<{
  stableId: string;
  generation: number;
  /** Attempt-only Firebase identity binder. Never serialize this value. */
  expectedOwnerUid: string | null;
  isCurrent: () => boolean;
}>;

export type CustomCardMilestoneDependencies = Readonly<{
  storage: Readonly<{
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
  }>;
  send: (request: Readonly<{
    count: number;
    language: StudyTarget;
    expectedOwnerUid: string;
  }>) => Promise<Readonly<{ accepted: true; duplicate: boolean }>>;
  nowMs: () => number;
  /** Runs one local write while the captured account still owns the process. */
  commitIfCurrent: (work: () => Promise<void>) => Promise<boolean>;
}>;

export type CustomCardMilestoneResult =
  | 'below-milestone'
  | 'stale-account'
  | 'deferred'
  | 'acknowledged'
  | 'already-acknowledged';

export function customCardMilestoneStorageKey(
  stableId: string,
  language: StudyTarget,
): string {
  return `${CUSTOM_CARD_MILESTONE_OUTBOX_PREFIX}${encodeURIComponent(stableId)}:${language}:1500`;
}

function parseStoredMilestone(raw: string | null, input: Readonly<{
  stableId: string;
  language: StudyTarget;
}>): StoredMilestone | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredMilestone>;
    if (
      value.schemaVersion !== 1
      || value.stableId !== input.stableId
      || value.language !== input.language
      || value.milestone !== CUSTOM_CARD_OWNER_ALERT_MILESTONE
      || (value.status !== 'pending' && value.status !== 'acknowledged')
      || !Number.isSafeInteger(value.count)
      || Number(value.count) < CUSTOM_CARD_OWNER_ALERT_MILESTONE
      || !Number.isSafeInteger(value.createdAtMs)
      || Number(value.createdAtMs) <= 0
    ) return null;
    return value as StoredMilestone;
  } catch {
    return null;
  }
}

/**
 * Persists before network delivery and never rejects. The card library is the
 * authoritative user action; this owner-only signal is always fail-open.
 */
export async function processCustomCardMilestone(
  input: Readonly<{
    count: number;
    language: StudyTarget;
    scope: CustomCardMilestoneScope;
  }>,
  dependencies: CustomCardMilestoneDependencies,
): Promise<CustomCardMilestoneResult> {
  if (!Number.isSafeInteger(input.count) || input.count < CUSTOM_CARD_OWNER_ALERT_MILESTONE) {
    return 'below-milestone';
  }
  const stableId = input.scope.stableId.trim();
  if (!stableId || stableId.length > 160 || !input.scope.isCurrent()) return 'stale-account';

  const key = customCardMilestoneStorageKey(stableId, input.language);
  try {
    const stored = parseStoredMilestone(await dependencies.storage.getItem(key), {
      stableId,
      language: input.language,
    });
    if (stored?.status === 'acknowledged') return 'already-acknowledged';

    const pending: StoredMilestone = Object.freeze({
      schemaVersion: 1,
      stableId,
      generation: input.scope.generation,
      language: input.language,
      milestone: CUSTOM_CARD_OWNER_ALERT_MILESTONE,
      count: Math.max(input.count, stored?.count ?? 0),
      createdAtMs: stored?.createdAtMs ?? dependencies.nowMs(),
      status: 'pending',
    });
    const pendingCommitted = await dependencies.commitIfCurrent(
      () => dependencies.storage.setItem(key, JSON.stringify(pending)),
    );
    if (!pendingCommitted || !input.scope.isCurrent()) return 'stale-account';

    const expectedOwnerUid = input.scope.expectedOwnerUid;
    if (
      typeof expectedOwnerUid !== 'string'
      || expectedOwnerUid.length < 1
      || expectedOwnerUid.length > 128
      || expectedOwnerUid.trim() !== expectedOwnerUid
    ) return 'deferred';

    const response = await dependencies.send({
      count: pending.count,
      language: pending.language,
      expectedOwnerUid,
    });
    if (response.accepted !== true || !input.scope.isCurrent()) return 'deferred';

    const acknowledgedCommitted = await dependencies.commitIfCurrent(
      () => dependencies.storage.setItem(key, JSON.stringify({
        ...pending,
        status: 'acknowledged',
        acknowledgedAtMs: dependencies.nowMs(),
      } satisfies StoredMilestone)),
    );
    if (!acknowledgedCommitted) return 'stale-account';
    return 'acknowledged';
  } catch {
    return 'deferred';
  }
}

