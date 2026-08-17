import * as admin from "firebase-admin";
import {
  onCall,
  HttpsError,
  type CallableRequest,
} from "firebase-functions/v2/https";
import { hashCanonicalBody } from "../../modules/learning-v2/policies/decision_registry";
import {
  finalizeDelayedCandidate,
  type FinalizeDelayedCandidateInput,
  type DelayedReceiptTransaction,
} from "./learning_v2_delayed_adapter";
import {
  createProgressEventAuthorization,
} from "./learning_v2/progress_event_callable";

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export interface DelayedCallableInput {
  readonly operationId: string;
  readonly stableId: string;
  readonly accountGeneration: number;
  readonly candidate: Readonly<Record<string, unknown>>;
  readonly assignmentRef: {
    readonly assignmentId: string;
    readonly contentHash: string;
  };
  readonly launchReceiptRef: {
    readonly launchId: string;
    readonly contentHash: string;
  };
  readonly probeRef: { readonly probeId: string; readonly contentHash: string };
  readonly expectedTupleKeys: readonly string[];
  readonly timingReceiptId: string;
  readonly failureReceiptId: string;
  readonly windowPolicyId: string;
}

export const V2_DELAYED_CALLABLE_OPTIONS = {
  enforceAppCheck: false,
  region: "us-central1",
  timeoutSeconds: 15,
  memory: "256MiB" as const,
} as const;

export function normalizeDelayedCallableInput(
  data: unknown,
): DelayedCallableInput {
  if (!record(data))
    throw new HttpsError("invalid-argument", "delayed_input_invalid");
  const operationId = text(data.operationId);
  const stableId = text(data.stableId);
  const accountGeneration = Number(data.accountGeneration);
  const candidate = data.candidate;
  const assignmentRef = data.assignmentRef;
  const launchReceiptRef = data.launchReceiptRef;
  const probeRef = data.probeRef;
  const expectedTupleKeys = data.expectedTupleKeys;
  const timingReceiptId = text(data.timingReceiptId);
  const failureReceiptId = text(data.failureReceiptId);
  const windowPolicyId = text(data.windowPolicyId);
  if (
    !/^[A-Za-z0-9._-]{1,160}$/.test(operationId) ||
    !stableId ||
    !Number.isSafeInteger(accountGeneration) ||
    accountGeneration < 1 ||
    !record(candidate) ||
    !record(assignmentRef) ||
    !record(launchReceiptRef) ||
    !record(probeRef) ||
    !Array.isArray(expectedTupleKeys) ||
    !expectedTupleKeys.every((key) => typeof key === "string") ||
    !timingReceiptId ||
    !failureReceiptId ||
    !windowPolicyId
  )
    throw new HttpsError("invalid-argument", "delayed_input_invalid");
  return Object.freeze({
    operationId,
    stableId,
    accountGeneration,
    candidate,
    assignmentRef: {
      assignmentId: text(assignmentRef.assignmentId),
      contentHash: text(assignmentRef.contentHash),
    },
    launchReceiptRef: {
      launchId: text(launchReceiptRef.launchId),
      contentHash: text(launchReceiptRef.contentHash),
    },
    probeRef: {
      probeId: text(probeRef.probeId),
      contentHash: text(probeRef.contentHash),
    },
    expectedTupleKeys: Object.freeze([...expectedTupleKeys] as string[]),
    timingReceiptId,
    failureReceiptId,
    windowPolicyId,
  });
}

export function delayedFirestorePath(key: string): string {
  const safe = (value: string): boolean =>
    /^[A-Za-z0-9._-]{1,192}$/.test(value) && value !== "." && value !== "..";
  const scoped = (prefix: string, collection: string): string | undefined => {
    if (!key.startsWith(prefix)) return undefined;
    const parts = key.slice(prefix.length).split(":");
    if (parts.length !== 2 || parts.some((part) => !safe(part))) {
      throw new Error("delayed_firestore_key_invalid");
    }
    return `users/${parts[0]}/${collection}/${parts[1]}`;
  };
  const mapped =
    (() => {
      if (!key.startsWith("auth_links:")) return undefined;
      const authUid = key.slice("auth_links:".length);
      if (!authUid || authUid.length > 128 || authUid.includes("/")) {
        throw new Error("delayed_firestore_key_invalid");
      }
      return `auth_links/${authUid}`;
    })() ??
    (() => {
      if (!key.startsWith("users:")) return undefined;
      const stableId = key.slice("users:".length);
      if (!safe(stableId)) throw new Error("delayed_firestore_key_invalid");
      return `users/${stableId}`;
    })() ??
    (() => {
      if (!key.startsWith("account_deletion_tombstones:")) return undefined;
      const stableId = key.slice("account_deletion_tombstones:".length);
      if (!safe(stableId)) throw new Error("delayed_firestore_key_invalid");
      return `account_deletion_tombstones/${stableId}`;
    })() ??
    scoped("learning_v2_assignments:", "v2_delayed_assignments") ??
    scoped("learning_v2_launches:", "v2_delayed_launches") ??
    scoped("learning_v2_timing_receipts:", "v2_delayed_timing_receipts") ??
    scoped("learning_v2_failure_receipts:", "v2_delayed_failure_receipts") ??
    scoped("learning_v2_delayed_terminals:", "v2_delayed_attempts") ??
    scoped("learning-v2:delayed:", "v2_delayed_operations");
  if (mapped) return mapped;
  throw new Error("delayed_firestore_key_invalid");
}

function makeRepository(db: FirebaseFirestore.Firestore) {
  return {
    runTransaction: <T>(
      fn: (transaction: DelayedReceiptTransaction) => Promise<T>,
    ) =>
      db.runTransaction(async (transaction) =>
        fn({
          get: async <R>(key: string) => {
            const snapshot = await transaction.get(db.doc(delayedFirestorePath(key)));
            return {
              exists: snapshot.exists,
              data: snapshot.exists ? (snapshot.data() as R) : undefined,
            };
          },
          create: (key: string, value: unknown) =>
            transaction.create(db.doc(delayedFirestorePath(key)), value),
        }),
      ),
  };
}

export const finalizeLearningV2DelayedCandidate = onCall(
  V2_DELAYED_CALLABLE_OPTIONS,
  async (request: CallableRequest<unknown>) => {
    if (!request.auth?.uid)
      throw new HttpsError("unauthenticated", "auth_required");
    const input = normalizeDelayedCallableInput(request.data);
    // Stable identity and generation are server-owned, exactly as for the
    // regular V2 progress callable. The fields remain in the legacy request
    // envelope for backwards compatibility, but are only accepted when they
    // match the canonical auth anchor and current account generation.
    const binding = await createProgressEventAuthorization(admin.firestore())(
      request.auth.uid,
    );
    if (typeof binding === "string" ||
        input.stableId !== binding.stableUid ||
        input.accountGeneration !== binding.accountGeneration)
      throw new HttpsError("permission-denied", "stable_identity_mismatch");
    const now = Date.now();
    const adapterInput: FinalizeDelayedCandidateInput = {
      ...input,
      authUid: request.auth.uid,
      stableId: binding.stableUid,
      accountGeneration: binding.accountGeneration,
      fingerprint: hashCanonicalBody({ ...input, candidate: input.candidate }),
      acceptedAtServer: new Date(now).toISOString(),
      observedDelayMs: 0,
      serverDecision: { kind: "timed", window: "inside_pinned_window" },
      nowMs: now,
    };
    const result = await finalizeDelayedCandidate(
      makeRepository(admin.firestore()),
      adapterInput,
    );
    return { ok: true, replayed: result.replayed, receipt: result.receipt };
  },
);
