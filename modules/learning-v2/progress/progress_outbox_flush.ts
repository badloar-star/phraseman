import type {
  ProgressOutboxIdentity,
  ProgressOutboxItem,
} from "./progress_outbox";
import type {
  ProgressAccountScope,
  ProgressGenerationGuard,
} from "./progress_store";
import { progressAccountKey } from "./progress_store";

export interface ProgressOutboxRepository {
  list(scope: ProgressAccountScope): Promise<ProgressOutboxItem[]>;
  acknowledge(
    scope: ProgressAccountScope,
    identity: ProgressOutboxIdentity,
    terminalStatus: "protocol_rejected",
  ): Promise<"recorded" | "already_recorded">;
  completeAccepted(
    scope: ProgressAccountScope,
    identity: ProgressOutboxIdentity,
  ): Promise<"removed" | "already_removed">;
}

export type ProgressOutboxSubmitDisposition = {
  readonly kind: "accepted";
  readonly mutationId: string;
  readonly payloadFingerprint: string;
  readonly duplicate: boolean;
  readonly receipt: ProgressOutboxServerReceipt;
};

export interface ProgressOutboxServerReceipt {
  readonly schemaVersion: "v2-progress-outbox-server-receipt.v1";
  readonly receiptId: string;
  readonly receiptFingerprint: string;
}

export type ProgressOutboxAcknowledgement =
  | ProgressOutboxSubmitDisposition
  | {
      readonly kind: "protocol_rejected";
      readonly mutationId: string;
      readonly payloadFingerprint: string;
      readonly receipt: ProgressOutboxServerReceipt;
    };

export type ProgressOutboxErrorDisposition =
  | { readonly kind: "retryable" }
  | {
      readonly kind: "mutation_local_protocol_rejected";
      readonly acknowledgement: Extract<
        ProgressOutboxAcknowledgement,
        { readonly kind: "protocol_rejected" }
      >;
    };

export interface ProgressOutboxFlushResult {
  readonly accepted: number;
  readonly duplicates: number;
  readonly terminalRejected: number;
  readonly remainingPending: number;
  readonly stoppedBy:
    | "empty"
    | "retryable_failure"
    | "receipt_required"
    | "limit";
}

export interface ProgressOutboxFlusherOptions {
  readonly scope: ProgressAccountScope;
  readonly repository: ProgressOutboxRepository;
  readonly isCurrentGeneration: ProgressGenerationGuard;
  readonly submit: (
    item: ProgressOutboxItem,
  ) => Promise<ProgressOutboxSubmitDisposition>;
  readonly classifyError: (
    error: unknown,
    item: ProgressOutboxItem,
  ) => ProgressOutboxErrorDisposition;
  /** Must deduplicate durable effects by mutationId + payloadFingerprint. */
  readonly persistAcknowledgementIdempotently: (
    identity: ProgressOutboxIdentity,
    acknowledgement: ProgressOutboxAcknowledgement,
  ) => Promise<void>;
  readonly maxItems?: number;
  /** null is reserved for a caller that owns an external non-abandoning lease. */
  readonly operationTimeoutMs?: number | null;
}

const inFlightFlushes = new Map<string, Promise<ProgressOutboxFlushResult>>();
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isDelayedProbe = (item: ProgressOutboxItem): boolean =>
  isRecord(item.payload) && item.payload.kind === "scheduled_delayed_probe";
const isServerReceipt = (value: unknown): value is ProgressOutboxServerReceipt =>
  isRecord(value) &&
  Object.keys(value).length === 3 &&
  value.schemaVersion === "v2-progress-outbox-server-receipt.v1" &&
  typeof value.receiptId === "string" &&
  /^[A-Za-z0-9._:-]{8,160}$/.test(value.receiptId) &&
  typeof value.receiptFingerprint === "string" &&
  /^[a-f0-9]{64}$/.test(value.receiptFingerprint);
const isExactAcknowledgement = (
  value: unknown,
  item: ProgressOutboxItem,
): value is ProgressOutboxSubmitDisposition =>
  isRecord(value) &&
  Object.keys(value).length === 5 &&
  value.kind === "accepted" &&
  value.mutationId === item.mutationId &&
  value.payloadFingerprint === item.payloadFingerprint &&
  typeof value.duplicate === "boolean" &&
  isServerReceipt(value.receipt);
const isExactRejection = (
  value: unknown,
  item: ProgressOutboxItem,
): value is Extract<ProgressOutboxAcknowledgement, { kind: "protocol_rejected" }> =>
  isRecord(value) &&
  Object.keys(value).length === 4 &&
  value.kind === "protocol_rejected" &&
  value.mutationId === item.mutationId &&
  value.payloadFingerprint === item.payloadFingerprint &&
  isServerReceipt(value.receipt);

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("progress_flush_timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const withOptionalTimeout = <T>(promise: Promise<T>, timeoutMs: number | null): Promise<T> =>
  timeoutMs === null ? promise : withTimeout(promise, timeoutMs);

const assertCurrent = (
  scope: ProgressAccountScope,
  isCurrentGeneration: ProgressGenerationGuard,
): void => {
  if (!isCurrentGeneration(scope)) throw new Error("progress_generation_stale");
};

const countPending = (items: readonly ProgressOutboxItem[]): number =>
  items.filter((item) => item.status === "pending").length;

const runFlush = async (
  options: ProgressOutboxFlusherOptions,
): Promise<ProgressOutboxFlushResult> => {
  const maxItems = options.maxItems ?? 32;
  const timeoutMs = options.operationTimeoutMs === undefined
    ? 15_000
    : options.operationTimeoutMs;
  if (!Number.isSafeInteger(maxItems) || maxItems < 1 || maxItems > 128) {
    throw new Error("progress_flush_limit_invalid");
  }
  if (timeoutMs !== null && (!Number.isSafeInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 60_000)) {
    throw new Error("progress_flush_timeout_invalid");
  }
  let accepted = 0;
  let duplicates = 0;
  let terminalRejected = 0;
  let stoppedBy: ProgressOutboxFlushResult["stoppedBy"] = "empty";

  while (accepted + terminalRejected < maxItems) {
    assertCurrent(options.scope, options.isCurrentGeneration);
    const items = await withOptionalTimeout(options.repository.list(options.scope), timeoutMs);
    assertCurrent(options.scope, options.isCurrentGeneration);
    const item = items.find((candidate) => candidate.status === "pending");
    if (!item) { stoppedBy = "empty"; break; }
    if (isDelayedProbe(item)) { stoppedBy = "receipt_required"; break; }

    let acknowledgement: ProgressOutboxSubmitDisposition;
    try {
      assertCurrent(options.scope, options.isCurrentGeneration);
      const submitted = await withOptionalTimeout(options.submit(item), timeoutMs);
      assertCurrent(options.scope, options.isCurrentGeneration);
      if (!isExactAcknowledgement(submitted, item)) {
        stoppedBy = "retryable_failure";
        break;
      }
      acknowledgement = submitted;
    } catch (error) {
      assertCurrent(options.scope, options.isCurrentGeneration);
      let disposition: ProgressOutboxErrorDisposition = { kind: "retryable" };
      try { disposition = options.classifyError(error, item); } catch { disposition = { kind: "retryable" }; }
      if (disposition.kind !== "mutation_local_protocol_rejected" || !isExactRejection(disposition.acknowledgement, item)) {
        stoppedBy = "retryable_failure";
        break;
      }
      try {
        await withOptionalTimeout(options.persistAcknowledgementIdempotently(item, disposition.acknowledgement), timeoutMs);
        assertCurrent(options.scope, options.isCurrentGeneration);
        await withOptionalTimeout(options.repository.acknowledge(options.scope, item, "protocol_rejected"), timeoutMs);
        assertCurrent(options.scope, options.isCurrentGeneration);
      } catch {
        assertCurrent(options.scope, options.isCurrentGeneration);
        stoppedBy = "retryable_failure";
        break;
      }
      terminalRejected += 1;
      continue;
    }

    try {
      await withOptionalTimeout(options.persistAcknowledgementIdempotently(item, acknowledgement), timeoutMs);
      assertCurrent(options.scope, options.isCurrentGeneration);
      await withOptionalTimeout(options.repository.completeAccepted(options.scope, item), timeoutMs);
      assertCurrent(options.scope, options.isCurrentGeneration);
    } catch {
      assertCurrent(options.scope, options.isCurrentGeneration);
      stoppedBy = "retryable_failure";
      break;
    }
    accepted += 1;
    if (acknowledgement.duplicate) duplicates += 1;
  }

  assertCurrent(options.scope, options.isCurrentGeneration);
  const remainingPending = countPending(await withOptionalTimeout(options.repository.list(options.scope), timeoutMs));
  assertCurrent(options.scope, options.isCurrentGeneration);
  if (stoppedBy === "empty" && remainingPending > 0 && accepted + terminalRejected >= maxItems) {
    stoppedBy = "limit";
  }
  return { accepted, duplicates, terminalRejected, remainingPending, stoppedBy };
};

export const createProgressOutboxFlusher = (
  options: ProgressOutboxFlusherOptions,
): { flush(): Promise<ProgressOutboxFlushResult> } => ({
  flush(): Promise<ProgressOutboxFlushResult> {
    const key = progressAccountKey(options.scope);
    const existing = inFlightFlushes.get(key);
    if (existing) return existing;
    const current = runFlush(options).finally(() => {
      if (inFlightFlushes.get(key) === current) inFlightFlushes.delete(key);
    });
    inFlightFlushes.set(key, current);
    return current;
  },
});
