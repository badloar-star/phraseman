const MAX_ACTIVE_NETWORK_LEASES = 32;
const MAX_QUIET_HANDLES = 16;
const SOURCE = /^[a-z][a-z0-9_.:-]{0,79}$/;

declare const INTERACTIVE_NETWORK_QUIET_HANDLE: unique symbol;
export type InteractiveNetworkQuietHandle = Readonly<{
  epoch: number;
  [INTERACTIVE_NETWORK_QUIET_HANDLE]: true;
}>;

export type BackgroundNetworkLease = Readonly<{
  source: string;
  signal: AbortSignal;
  assertCurrent(): void;
}>;

type Phase = 'open' | 'quiescing' | 'quiet';
type ActiveLease = {
  readonly id: number;
  readonly source: string;
  readonly controller: AbortController;
  readonly settled: Promise<void>;
  settle(): void;
};
type QuietParticipant = Readonly<{
  quiesce(): void | Promise<void>;
  resume(): void;
}>;

const handles = new Set<object>();
const handleEpochs = new WeakMap<object, number>();
const handleReady = new WeakMap<object, Promise<void>>();
const activeLeases = new Map<number, ActiveLease>();
const liveBackgroundNetworkLeases = new WeakSet<object>();
const participants = new Map<string, QuietParticipant>();

let phase: Phase = 'open';
let epoch = 0;
let nextLeaseId = 1;
let quiescence: Promise<void> = Promise.resolve();
let reopenTicket = 0;
let participantsSealed = false;

class InteractiveNetworkDeferredError extends Error {
  constructor() { super('interactive_network_deferred'); }
}

const deferred = (): Error => new InteractiveNetworkDeferredError();

export const isInteractiveNetworkDeferredError = (error: unknown): boolean =>
  error instanceof InteractiveNetworkDeferredError;

/** Runtime brand for consumers that must reject forged signal-like objects. */
export const isCurrentBackgroundNetworkLease = (
  value: unknown,
): value is BackgroundNetworkLease =>
  typeof value === 'object' && value !== null && liveBackgroundNetworkLeases.has(value);

const assertHandle = (handle: InteractiveNetworkQuietHandle): object => {
  if (!handle || typeof handle !== 'object' || !handles.has(handle as object) ||
    handleEpochs.get(handle as object) !== handle.epoch) {
    throw new Error('interactive_network_quiet_handle_invalid');
  }
  return handle as object;
};

const startQuiescence = (): void => {
  phase = 'quiescing';
  epoch += 1;
  const targetEpoch = epoch;
  const participantSettlements: Promise<void>[] = [];
  for (const participant of participants.values()) {
    try {
      participantSettlements.push(Promise.resolve(participant.quiesce()));
    } catch (error) {
      participantSettlements.push(Promise.reject(error));
    }
  }
  for (const lease of activeLeases.values()) lease.controller.abort(deferred());
  quiescence = Promise.resolve().then(async () => {
    await Promise.all(participantSettlements);
    while (activeLeases.size > 0) {
      await Promise.all([...activeLeases.values()].map((lease) => lease.settled));
    }
    if (epoch === targetEpoch && handles.size > 0) phase = 'quiet';
  });
};

/**
 * Closes admission synchronously. The returned handle becomes ready only after
 * every already-admitted operation has actually settled; abort() alone is not
 * treated as a network fence.
 */
export const beginInteractiveNetworkQuiet = (): InteractiveNetworkQuietHandle => {
  if (handles.size >= MAX_QUIET_HANDLES) {
    throw new Error('interactive_network_quiet_handle_capacity');
  }
  // The first interactive boundary freezes the app-wide participant set.
  // Readiness must remain monotonic after SESSION_READY; a lazy module cannot
  // retroactively introduce a new network subsystem into an active session.
  participantsSealed = true;
  reopenTicket += 1;
  if (phase === 'open') startQuiescence();
  const handle = Object.freeze({ epoch }) as InteractiveNetworkQuietHandle;
  handles.add(handle as object);
  handleEpochs.set(handle as object, epoch);
  handleReady.set(handle as object, quiescence);
  return handle;
};

export const waitForInteractiveNetworkQuiet = async (
  handle: InteractiveNetworkQuietHandle,
): Promise<void> => {
  const object = assertHandle(handle);
  const ready = handleReady.get(object);
  if (!ready) throw new Error('interactive_network_quiet_handle_invalid');
  await ready;
  assertHandle(handle);
  if (phase !== 'quiet' || handle.epoch !== epoch) {
    throw new Error('interactive_network_quiet_handle_stale');
  }
};

export const isInteractiveNetworkQuietReady = (
  handle: InteractiveNetworkQuietHandle,
): boolean => {
  try {
    assertHandle(handle);
    return phase === 'quiet' && handle.epoch === epoch;
  } catch {
    return false;
  }
};

/** Last release is deferred by one microtask so adjacent route hand-offs do not
 * momentarily reopen network admission. */
export const releaseInteractiveNetworkQuiet = (
  handle: InteractiveNetworkQuietHandle,
): void => {
  const object = assertHandle(handle);
  handles.delete(object);
  handleEpochs.delete(object);
  handleReady.delete(object);
  if (handles.size > 0) return;
  const ticket = ++reopenTicket;
  queueMicrotask(() => {
    if (ticket !== reopenTicket || handles.size > 0) return;
    epoch += 1;
    phase = 'open';
    quiescence = Promise.resolve();
    for (const participant of participants.values()) {
      try { participant.resume(); } catch { /* resume retries belong to the producer */ }
    }
  });
};

export const registerInteractiveNetworkQuietParticipant = (
  source: string,
  participant: QuietParticipant,
): (() => void) => {
  if (!SOURCE.test(source)) throw new Error('interactive_network_source_invalid');
  if (participantsSealed) throw new Error('interactive_network_participants_sealed');
  if (participants.has(source)) throw new Error('interactive_network_participant_duplicate');
  if (participants.size >= MAX_ACTIVE_NETWORK_LEASES) {
    throw new Error('interactive_network_participant_capacity');
  }
  participants.set(source, participant);
  if (phase !== 'open') {
    phase = 'quiescing';
    let settlement: Promise<void>;
    try { settlement = Promise.resolve(participant.quiesce()); }
    catch (error) { settlement = Promise.reject(error); }
    const targetEpoch = epoch;
    quiescence = Promise.all([quiescence, settlement]).then(() => {
      if (epoch === targetEpoch && handles.size > 0) phase = 'quiet';
    });
    for (const handle of handles) handleReady.set(handle, quiescence);
  }
  return () => {
    if (participantsSealed || phase !== 'open' || handles.size > 0) {
      throw new Error('interactive_network_participant_in_use');
    }
    if (participants.get(source) === participant) participants.delete(source);
  };
};

/**
 * Every app-owned background network producer must enter through this seam.
 * The caller must pass the signal to its transport and call assertCurrent after
 * every await before starting another native/network operation.
 */
export const withBackgroundNetworkLease = async <T>(
  source: string,
  work: (lease: BackgroundNetworkLease) => Promise<T>,
): Promise<T> => {
  if (!SOURCE.test(source)) throw new Error('interactive_network_source_invalid');
  if (phase !== 'open') throw deferred();
  if (activeLeases.size >= MAX_ACTIVE_NETWORK_LEASES) {
    throw new Error('interactive_network_lease_capacity');
  }
  const controller = new AbortController();
  const id = nextLeaseId++;
  let settle!: () => void;
  const settled = new Promise<void>((resolve) => { settle = resolve; });
  const active: ActiveLease = { id, source, controller, settled, settle };
  activeLeases.set(id, active);
  const assertCurrent = (): void => {
    if (phase !== 'open' || controller.signal.aborted || !activeLeases.has(id)) {
      throw deferred();
    }
  };
  const lease = Object.freeze({ source, signal: controller.signal, assertCurrent });
  liveBackgroundNetworkLeases.add(lease);
  try {
    assertCurrent();
    const value = await work(lease);
    assertCurrent();
    return value;
  } finally {
    liveBackgroundNetworkLeases.delete(lease);
    activeLeases.delete(id);
    settle();
  }
};

export const interactiveNetworkQuietSnapshot = (): Readonly<{
  phase: Phase;
  epoch: number;
  activeHandles: number;
  activeNetworkLeases: number;
}> => Object.freeze({
  phase,
  epoch,
  activeHandles: handles.size,
  activeNetworkLeases: activeLeases.size,
});

export const __resetInteractiveNetworkQuietForTests = (): void => {
  if (activeLeases.size > 0) throw new Error('interactive_network_reset_active');
  handles.clear();
  phase = 'open';
  epoch = 0;
  nextLeaseId = 1;
  quiescence = Promise.resolve();
  reopenTicket += 1;
  participantsSealed = false;
};
