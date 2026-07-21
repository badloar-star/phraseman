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

function firestorePath(key: string): string {
  if (key.startsWith("learning_v2_assignments:"))
    return `learning_v2_assignments/${key.slice("learning_v2_assignments:".length)}`;
  if (key.startsWith("learning_v2_launches:"))
    return `learning_v2_launches/${key.slice("learning_v2_launches:".length)}`;
  if (key.startsWith("learning_v2_timing_receipts:"))
    return `learning_v2_timing_receipts/${key.slice("learning_v2_timing_receipts:".length)}`;
  if (key.startsWith("learning_v2_failure_receipts:"))
    return `learning_v2_failure_receipts/${key.slice("learning_v2_failure_receipts:".length)}`;
  if (key.startsWith("learning-v2:delayed:"))
    return `learning_v2_receipt_operations/${key.slice("learning-v2:delayed:".length).replace(/:/g, "_")}`;
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
            const snapshot = await transaction.get(db.doc(firestorePath(key)));
            return {
              exists: snapshot.exists,
              data: snapshot.exists ? (snapshot.data() as R) : undefined,
            };
          },
          create: (key: string, value: unknown) =>
            transaction.create(db.doc(firestorePath(key)), value),
        }),
      ),
  };
}

export const finalizeLearningV2DelayedCandidate = onCall(
  async (request: CallableRequest<unknown>) => {
    if (!request.auth?.uid)
      throw new HttpsError("unauthenticated", "auth_required");
    const input = normalizeDelayedCallableInput(request.data);
    if (input.stableId !== request.auth.uid)
      throw new HttpsError("permission-denied", "stable_identity_mismatch");
    const now = Date.now();
    const adapterInput: FinalizeDelayedCandidateInput = {
      ...input,
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
