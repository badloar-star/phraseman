import type { PhoneStateScope } from '../modules/phone-state/account_secret';
import type { PendingPersonalOperation } from '../modules/phone-state/contracts';
import { getRemoteBool } from './remote_flags';

export type PhoneStateShadowAppendInput = Readonly<{
  operation: PendingPersonalOperation;
  idempotencyKey: string;
}>;

export type PhoneStateShadowScope = PhoneStateScope & Readonly<{ deviceId: string }>;

export type PhoneStateShadowRuntime = Readonly<{
  scope(): PhoneStateShadowScope | null;
  append(input: PhoneStateShadowAppendInput): Promise<Readonly<{ duplicate: boolean }>>;
}>;

export type PhoneStateShadowDisposition =
  | Readonly<{ kind: 'disabled' | 'unavailable' | 'unsupported' }>
  | Readonly<{ kind: 'recorded' | 'duplicate'; idempotencyKey: string }>
  | Readonly<{ kind: 'failed'; errorClass: string }>;

let runtime: PhoneStateShadowRuntime | null = null;

export function configurePhoneStateShadowRuntime(next: PhoneStateShadowRuntime | null): void {
  runtime = next;
}

function errorClass(error: unknown): string {
  if (error instanceof Error && error.name) return error.name.slice(0, 64);
  return 'shadow_unknown';
}

async function appendShadow(
  idempotencyKey: string,
  operationForScope: (scope: PhoneStateShadowScope) => PendingPersonalOperation,
): Promise<PhoneStateShadowDisposition> {
  if (!getRemoteBool('phone_state_shadow_enabled')) return Object.freeze({ kind: 'disabled' });
  const current = runtime;
  const scope = current?.scope() ?? null;
  if (!current || !scope) return Object.freeze({ kind: 'unavailable' });
  try {
    const result = await current.append({
      idempotencyKey,
      operation: operationForScope(scope),
    });
    return Object.freeze({
      kind: result.duplicate ? 'duplicate' : 'recorded',
      idempotencyKey,
    });
  } catch (error) {
    // Shadow recording is diagnostics-only. The current local result is
    // already durable and must never be rolled back or surfaced as an error.
    return Object.freeze({ kind: 'failed', errorClass: errorClass(error) });
  }
}

export function recordShadowXpGrant(input: Readonly<{
  eventId: string;
  amount: number;
  resultingTotalXp: number;
  source: string;
  lessonId?: string | number | null;
  payload?: Readonly<Record<string, unknown>>;
  createdAtMs?: number;
}>): Promise<PhoneStateShadowDisposition> {
  const eventId = input.eventId.trim();
  if (!eventId || !Number.isFinite(input.amount) || !Number.isFinite(input.resultingTotalXp)) {
    return Promise.resolve(Object.freeze({ kind: 'unsupported' }));
  }
  const createdAtMs = input.createdAtMs ?? Date.now();
  return appendShadow(`xp:${eventId}`, (scope) => Object.freeze({
    schemaVersion: 1,
    stableUid: scope.stableUid,
    accountGeneration: scope.accountGeneration,
    deviceId: scope.deviceId,
    domain: 'xp',
    kind: 'grant',
    entityId: eventId,
    payload: Object.freeze({
      eventId,
      amount: input.amount,
      source: input.source,
      lessonId: input.lessonId ?? null,
      ...(input.payload ?? {}),
    }),
    exactResult: Object.freeze({ totalXp: input.resultingTotalXp }),
    createdAtMs,
  }));
}

export function recordShadowProgressEvent(input: Readonly<{
  eventId: string;
  type: string;
  payload: Readonly<Record<string, unknown>>;
  createdAtMs?: number;
}>): Promise<PhoneStateShadowDisposition> {
  if (input.type !== 'lesson_complete' && input.type !== 'exam_complete') {
    return Promise.resolve(Object.freeze({ kind: 'unsupported' }));
  }
  const eventId = input.eventId.trim();
  if (!eventId) return Promise.resolve(Object.freeze({ kind: 'unsupported' }));
  const domain = input.type === 'lesson_complete' ? 'lesson_completion' : 'exam_completion';
  return appendShadow(`progress:${eventId}`, (scope) => Object.freeze({
    schemaVersion: 1,
    stableUid: scope.stableUid,
    accountGeneration: scope.accountGeneration,
    deviceId: scope.deviceId,
    domain,
    kind: input.type,
    entityId: eventId,
    payload: Object.freeze({ eventId, ...input.payload }),
    exactResult: Object.freeze({ committed: true }),
    createdAtMs: input.createdAtMs ?? Date.now(),
  }));
}
