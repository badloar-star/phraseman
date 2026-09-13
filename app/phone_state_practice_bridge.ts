import * as Crypto from "expo-crypto";

import { canonicalJsonWithLimit } from "../modules/phone-state/canonical";
import type { PhoneStateScope } from "../modules/phone-state/account_secret";
import type { PendingPersonalOperation } from "../modules/phone-state/contracts";
import type { PracticeReducerState } from "../modules/phone-state/domains/practice";
import type { PhoneStateStore } from "../modules/phone-state/store";

export type PhoneStatePracticeFactType =
  | "completed_task"
  | "mistake"
  | "mastered"
  | "attempt";

type Runtime = Readonly<{
  scope: PhoneStateScope;
  deviceId: string;
  store: PhoneStateStore;
  triggerSync: () => void;
}>;

let runtime: Runtime | null = null;
let runtimeRevision = 0;
const runtimeRevisionListeners = new Set<(revision: number) => void>();

export function configurePhoneStatePracticeBridge(next: Runtime | null): void {
  runtime = next;
  runtimeRevision += 1;
  for (const listener of runtimeRevisionListeners) listener(runtimeRevision);
}

export function getPhoneStatePracticeBridgeRevision(): number {
  return runtimeRevision;
}

export function subscribePhoneStatePracticeBridgeRevision(
  listener: (revision: number) => void,
): Readonly<{ remove: () => void }> {
  runtimeRevisionListeners.add(listener);
  return Object.freeze({ remove: () => runtimeRevisionListeners.delete(listener) });
}

function pending(
  active: Runtime,
  kind: string,
  entityId: string,
  payload: Readonly<Record<string, unknown>>,
): PendingPersonalOperation {
  canonicalJsonWithLimit(payload, 48 * 1024);
  return Object.freeze({
    schemaVersion: 1,
    stableUid: active.scope.stableUid,
    accountGeneration: active.scope.accountGeneration,
    deviceId: active.deviceId,
    domain: "practice",
    kind,
    entityId,
    payload,
    exactResult: payload,
    createdAtMs: Date.now(),
  });
}

export async function commitPhoneStatePracticeFact(
  factType: PhoneStatePracticeFactType,
  entityId: string,
  value: unknown,
  expectedStableUid?: string,
): Promise<boolean> {
  const active = runtime;
  if (
    !active ||
    !entityId.trim() ||
    (expectedStableUid !== undefined &&
      active.scope.stableUid !== expectedStableUid)
  ) {
    return false;
  }
  try {
    await active.store.commit(
      pending(active, factType, entityId, Object.freeze({ value })),
      { idempotencyKey: `practice:${factType}:${entityId}` },
    );
    active.triggerSync();
    return true;
  } catch {
    return false;
  }
}

export type PhoneStatePracticeFactProjectionRead =
  | Readonly<{ status: "unavailable" }>
  | Readonly<{ status: "stale_account" }>
  | Readonly<{
      status: "available";
      stableUid: string;
      lineage: number;
      facts: Readonly<Record<string, unknown>>;
    }>;

export async function readPhoneStatePracticeFactProjection(
  factType: PhoneStatePracticeFactType,
  expectedStableUid?: string,
): Promise<PhoneStatePracticeFactProjectionRead> {
  const active = runtime;
  // зачем: мост не поднят → квота карточек НИКОГДА не прочитается, и кнопки
  // тренировки молча мертвы. Немой выход здесь стоил владельцу «нажимается,
  // но ничего не происходит» — причина обязана быть видна.
  if (!active) {
    console.warn(`[FC-TRAIN-ENTRY] bridge:unavailable — runtime моста не инициализирован (factType=${factType})`);
    return Object.freeze({ status: "unavailable" });
  }
  if (
    expectedStableUid !== undefined &&
    active.scope.stableUid !== expectedStableUid
  ) {
    console.warn('[FC-TRAIN-ENTRY] bridge:stale_account — uid моста не совпал', JSON.stringify({
      bridgeStableUid: active.scope.stableUid,
      expectedStableUid,
      lineage: active.scope.accountGeneration,
    }));
    return Object.freeze({ status: "stale_account" });
  }
  try {
    const state = stateFrom(active, await active.store.readProjection("practice"));
    const facts = Object.freeze({ ...(state?.facts?.[factType] ?? {}) });
    console.log('[FC-TRAIN-ENTRY] bridge:available', JSON.stringify({
      stableUid: active.scope.stableUid,
      lineage: active.scope.accountGeneration,
      factType,
      factKeys: Object.keys(facts).length,
      hadState: state != null,
    }));
    return Object.freeze({
      status: "available",
      stableUid: active.scope.stableUid,
      lineage: active.scope.accountGeneration,
      facts,
    });
  } catch (error: unknown) {
    console.warn('[FC-TRAIN-ENTRY] bridge:catch → unavailable (readProjection упал)',
      error instanceof Error ? `${error.name}: ${error.message}` : String(error));
    return Object.freeze({ status: "unavailable" });
  }
}

export type PhoneStatePracticeReceiptCommit =
  | Readonly<{ status: "committed"; duplicate: boolean }>
  | Readonly<{ status: "unavailable" }>
  | Readonly<{ status: "stale_account" }>
  | Readonly<{ status: "failed" }>;

export async function commitPhoneStatePracticeReceipt(
  factType: PhoneStatePracticeFactType,
  entityId: string,
  value: unknown,
  idempotencyKey: string,
  expectedStableUid: string,
  expectedLineage: number,
): Promise<PhoneStatePracticeReceiptCommit> {
  const active = runtime;
  if (!active) return Object.freeze({ status: "unavailable" });
  if (
    active.scope.stableUid !== expectedStableUid ||
    active.scope.accountGeneration !== expectedLineage
  ) {
    return Object.freeze({ status: "stale_account" });
  }
  if (!entityId.trim() || !idempotencyKey.trim()) {
    return Object.freeze({ status: "failed" });
  }
  try {
    const result = await active.store.commit(
      pending(active, factType, entityId, Object.freeze({ value })),
      { idempotencyKey },
    );
    active.triggerSync();
    return Object.freeze({ status: "committed", duplicate: result.duplicate });
  } catch {
    return Object.freeze({ status: "failed" });
  }
}

export async function commitPhoneStatePracticeRegister(
  field: string,
  value: unknown,
): Promise<boolean> {
  const active = runtime;
  if (!active || !field.trim()) return false;
  try {
    await active.store.commit(
      pending(active, "set_field", field, Object.freeze({ field, value })),
      { idempotencyKey: `practice:set_field:${Crypto.randomUUID()}` },
    );
    active.triggerSync();
    return true;
  } catch {
    return false;
  }
}

function stateFrom(
  active: Runtime,
  projection: Awaited<ReturnType<PhoneStateStore["readProjection"]>>,
): PracticeReducerState | null {
  if (!projection || (projection.domain && projection.domain !== "practice"))
    return null;
  return projection.state as PracticeReducerState;
}

export async function mergePhoneStatePracticeFacts<T>(
  factType: PhoneStatePracticeFactType,
  legacy: Readonly<Record<string, T>>,
  expectedStableUid?: string,
): Promise<Record<string, T>> {
  const active = runtime;
  if (
    !active ||
    (expectedStableUid !== undefined &&
      active.scope.stableUid !== expectedStableUid)
  ) {
    return { ...legacy };
  }
  for (const [entityId, value] of Object.entries(legacy)) {
    await commitPhoneStatePracticeFact(
      factType,
      entityId,
      value,
      expectedStableUid,
    );
  }
  try {
    const state = stateFrom(
      active,
      await active.store.readProjection("practice"),
    );
    const remote = state?.facts?.[factType] as
      | Readonly<Record<string, T>>
      | undefined;
    return { ...legacy, ...(remote ?? {}) };
  } catch {
    return { ...legacy };
  }
}

export async function readOrImportPhoneStatePracticeRegister<T>(
  field: string,
  legacy: T,
): Promise<T> {
  const active = runtime;
  if (!active) return legacy;
  try {
    const first = stateFrom(
      active,
      await active.store.readProjection("practice"),
    );
    const existing = first?.registers?.[field];
    if (existing && existing.value !== null && existing.value !== undefined) {
      return existing.value as T;
    }
    // An empty compatibility read during boot is not a durable value. Cloud
    // restore may populate the legacy mirror moments later; persisting null
    // here would make the PhoneState register win forever and hide that plan.
    if (legacy === null || legacy === undefined) return legacy;
    const repairingEmptyOpeningImport = existing !== undefined;
    await active.store.commit(
      pending(
        active,
        "set_field",
        field,
        Object.freeze({ field, value: legacy }),
      ),
      {
        idempotencyKey: repairingEmptyOpeningImport
          ? `practice:opening_import_non_null_v2:${field}`
          : `practice:opening_import:${field}`,
      },
    );
    active.triggerSync();
    const imported = stateFrom(
      active,
      await active.store.readProjection("practice"),
    )?.registers?.[field];
    return imported && imported.value !== null && imported.value !== undefined
      ? (imported.value as T)
      : legacy;
  } catch {
    return legacy;
  }
}

export default function __RouteShim() {
  return null;
}
