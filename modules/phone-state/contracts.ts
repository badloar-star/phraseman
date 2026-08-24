export type HybridClock = Readonly<{
  counter: number;
  deviceId: string;
}>;

export type PersonalOperation = Readonly<{
  schemaVersion: 1;
  operationId: string;
  stableUid: string;
  accountGeneration: number;
  deviceId: string;
  deviceSequence: number;
  hybridClock: HybridClock;
  domain: string;
  kind: string;
  entityId: string | null;
  payload: unknown;
  exactResult: unknown;
  createdAtMs: number;
  fingerprint: string;
}>;

export type PendingPersonalOperation = Omit<
  PersonalOperation,
  'operationId' | 'deviceSequence' | 'hybridClock' | 'fingerprint'
>;

export type ProjectionEnvelope = Readonly<{
  schemaVersion: 1;
  domain: string;
  reducerVersion: number;
  state: unknown;
  throughOperationCount: number;
}>;
