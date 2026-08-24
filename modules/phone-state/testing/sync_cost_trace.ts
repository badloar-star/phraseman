import type { PhoneStateScope } from '../account_secret';
import type { PersonalOperation } from '../contracts';
import { assembleSegments } from '../segments';

export type PhoneStateSyncCostTrace = Readonly<{
  segmentCreates: number;
  segmentReads: number;
  manifestCreates: number;
  manifestReads: number;
  externalEventReads: number;
  checkpointCreates: number;
  checkpointReads: number;
  progressWrites: number;
  progressCallables: number;
  transactions: number;
}>;

type MutableTrace = {
  -readonly [Key in keyof PhoneStateSyncCostTrace]: PhoneStateSyncCostTrace[Key];
};

function newTrace(): MutableTrace {
  return {
    segmentCreates: 0,
    segmentReads: 0,
    manifestCreates: 0,
    manifestReads: 0,
    externalEventReads: 0,
    checkpointCreates: 0,
    checkpointReads: 0,
    progressWrites: 0,
    progressCallables: 0,
    transactions: 0,
  };
}

function snapshot(trace: MutableTrace): PhoneStateSyncCostTrace {
  return Object.freeze({ ...trace });
}

const SCOPE: PhoneStateScope = Object.freeze({
  stableUid: 'cost-trace-stable-user',
  accountGeneration: 1,
});
const DEVICE_ID = 'cost_trace_device_0001';

function answerOperation(sequence: number): PersonalOperation {
  return Object.freeze({
    schemaVersion: 1,
    operationId: `${DEVICE_ID}:${sequence}`,
    stableUid: SCOPE.stableUid,
    accountGeneration: SCOPE.accountGeneration,
    deviceId: DEVICE_ID,
    deviceSequence: sequence,
    hybridClock: Object.freeze({ counter: sequence, deviceId: DEVICE_ID }),
    domain: 'progress',
    kind: 'answer_committed',
    entityId: `answer-${sequence}`,
    payload: Object.freeze({ correct: true }),
    exactResult: Object.freeze({ answerAccepted: true }),
    createdAtMs: sequence,
    fingerprint: sequence.toString(16).padStart(64, '0'),
  });
}

export async function traceLessonSync(input: Readonly<{
  answers: number;
}>): Promise<PhoneStateSyncCostTrace> {
  if (!Number.isSafeInteger(input.answers) || input.answers < 0 || input.answers > 50) {
    throw new TypeError('phone_state_cost_trace_answers_invalid');
  }
  const trace = newTrace();
  if (input.answers === 0) return snapshot(trace);

  const operations = Array.from({ length: input.answers }, (_, index) => answerOperation(index + 1));
  const segments = await assembleSegments(operations, { reason: 'lesson_complete' });

  // These counters are incremented at the same repository boundary that bills
  // Firestore. A lesson completion writes sealed segments directly; it does
  // not invoke a progress callable or a Firestore transaction.
  for (const _segment of segments) {
    trace.segmentCreates += 1;
    trace.progressWrites += 1;
  }
  return snapshot(trace);
}

export async function traceForegroundSync(input: Readonly<{
  localDirty: boolean;
  remoteHeadsUnchanged: boolean;
}>): Promise<PhoneStateSyncCostTrace> {
  const trace = newTrace();

  // A foreground event is only a scheduling hint. If durable local metadata
  // already proves that neither side advanced, no personal collection is read.
  if (!input.localDirty && input.remoteHeadsUnchanged) return snapshot(trace);

  if (input.localDirty) {
    trace.segmentCreates += 1;
    trace.progressWrites += 1;
  }
  if (!input.remoteHeadsUnchanged) {
    trace.segmentReads += 1;
  }
  return snapshot(trace);
}

export async function synchronizedDevices(input: Readonly<{
  initialSegments: number;
}>): Promise<Readonly<{
  sync(): Promise<PhoneStateSyncCostTrace>;
  appendRemoteSegments(count: number): void;
}>> {
  if (!Number.isSafeInteger(input.initialSegments) || input.initialSegments < 0) {
    throw new TypeError('phone_state_cost_trace_segments_invalid');
  }

  let remoteTail = input.initialSegments;
  let localCursor = 0;

  return Object.freeze({
    sync: async () => {
      const trace = newTrace();
      // This is the repository's `lastSequence > cursor` query model: only
      // documents after the durable local cursor are returned and billed.
      trace.segmentReads = remoteTail - localCursor;
      localCursor = remoteTail;
      return snapshot(trace);
    },
    appendRemoteSegments: (count: number) => {
      if (!Number.isSafeInteger(count) || count < 0) {
        throw new TypeError('phone_state_cost_trace_segments_invalid');
      }
      remoteTail += count;
      if (!Number.isSafeInteger(remoteTail)) {
        throw new TypeError('phone_state_cost_trace_segments_invalid');
      }
    },
  });
}
