import type { PhoneStateScope } from './account_secret';
import { canonicalJsonWithLimit } from './canonical';
import type { PendingPersonalOperation } from './contracts';
import type { LearningV2Completion } from './domains/learning_v2';
import type { PhoneStateStore } from './store';

type Runtime = Readonly<{
  scope: PhoneStateScope;
  deviceId: string;
  store: PhoneStateStore;
  triggerSync: () => void;
}>;

type CompletionInput = Readonly<{
  stableId: string | null;
  generation: number;
  mutationId: string;
  envelope: object;
}>;

let runtime: Runtime | null = null;

export function configurePhoneStateLearningV2Bridge(next: Runtime | null): void {
  runtime = next;
}

export async function commitPhoneStateLearningV2Completion(input: CompletionInput): Promise<boolean> {
  const active = runtime;
  if (
    !active || !input.stableId || input.stableId !== active.scope.stableUid
    || input.generation !== active.scope.accountGeneration || !input.mutationId.trim()
  ) return false;
  const envelope = input.envelope as Readonly<Record<string, unknown>>;
  const requiredSessionId = envelope.canonicalSessionId;
  const courseId = envelope.sessionSetId;
  if (typeof requiredSessionId !== 'string' || typeof courseId !== 'string') return false;
  const completion: LearningV2Completion = Object.freeze({
    mutationId: input.mutationId,
    requiredSessionId,
    courseId,
    exactResult: input.envelope,
  });
  try {
    canonicalJsonWithLimit(completion, 48 * 1024);
    const pending: PendingPersonalOperation = Object.freeze({
      schemaVersion: 1,
      stableUid: active.scope.stableUid,
      accountGeneration: active.scope.accountGeneration,
      deviceId: active.deviceId,
      domain: 'learning_v2',
      kind: 'required_session_completion',
      entityId: completion.mutationId,
      payload: completion,
      exactResult: completion.exactResult,
      createdAtMs: Date.now(),
    });
    await active.store.commit(pending, { idempotencyKey: `learning_v2:${completion.mutationId}` });
    active.triggerSync();
    return true;
  } catch {
    return false;
  }
}
