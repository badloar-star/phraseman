export const MARKERS = Object.freeze({
  launchAcknowledged: 'account_provision_lock_launch_ack',
  attempted: 'account_provision_lock_attempted',
  acquired: 'account_provision_lock_acquired',
  controlAcknowledged: 'account_provision_lock_control_ack',
  ownershipCheckpoint: 'account_provision_lock_owned_checkpoint',
  releaseRequested: 'account_provision_lock_release_requested',
  released: 'account_provision_lock_released',
  pass: 'account_provision_lock_probe_pass',
});

export const SAFE_FAILURE_CODES = Object.freeze([
  'account_provision_lock_request_invalid',
  'account_provision_lock_identity_invalid',
  'account_provision_lock_duplicate_role',
  'account_provision_lock_native_unsupported',
  'account_provision_lock_database_root_invalid',
  'account_provision_lock_acquire_failed',
  'account_provision_lock_handle_invalid',
  'account_provision_lock_control_invalid',
  'account_provision_lock_release_failed',
  'account_provision_lock_duplicate_release',
  'account_provision_lock_post_release_use',
  'account_provision_lock_emit_failed',
  'account_provision_lock_probe_failed',
] as const);

const SAFE_FAILURE_CODE_SET = new Set<string>(SAFE_FAILURE_CODES);
const PACKAGE_NAME = 'app.phraseman';
const PRIMARY_PROCESS = PACKAGE_NAME;
const SECONDARY_PROCESS = `${PACKAGE_NAME}:account_v2_probe`;
const HEX_32 = /^[0-9a-f]{32}$/u;
const DECIMAL = /^[1-9][0-9]*$/u;
const DATABASE_NAMES = Object.freeze({
  x: `accounts-v2-g-${'a'.repeat(64)}.db`,
  y: `accounts-v2-g-${'b'.repeat(64)}.db`,
});
const ANDROID_SQLITE_ROOT = '/data/user/0/app.phraseman/files/SQLite';
const ANDROID_NO_BACKUP_FILES_DIR = '/data/user/0/app.phraseman/no_backup';
const IDENTITY_X_LOCK_PATH_SHA256 = 'a3fc8a7de2f9ec1a99ebc22819b5f6fbbf08d1da49247340a72654842fd9d1e4';
const CAPTURED_PROMISE_THEN = Promise.prototype.then;

type FailureCode = typeof SAFE_FAILURE_CODES[number];
export type ProvisionLockIdentity = keyof typeof DATABASE_NAMES;
export type ProvisionLockRole = 'holder' | 'release';

export type LaunchBinding = Readonly<{
  packageName: typeof PACKAGE_NAME;
  processName: string;
  pid: number;
  starttime: string;
  launchNonce: string;
  runtimeIdentity: string;
}>;

export type ProvisionLockRequest = Readonly<{
  role: ProvisionLockRole;
  identity: ProvisionLockIdentity;
  binding: LaunchBinding;
}>;

export type ProvisionLockPort = Readonly<{
  defaultDatabaseDirectory: unknown;
  acquireAccountProvisionLockAsync(databasePath: string): Promise<unknown>;
  waitForReleaseControl?(binding: LaunchBinding): Promise<unknown>;
}>;

export type TimelineEvent = Readonly<{
  kind: string;
  sequence: number;
  timestamp: number;
  identity: ProvisionLockIdentity;
  binding: LaunchBinding;
}>;

type CapturedMethod = Readonly<{
  receiver: object;
  owner: object;
  name: PropertyKey;
  method: (...args: readonly unknown[]) => unknown;
}>;

class ProbeFailure extends Error {}

function fail(code: FailureCode): never {
  throw new ProbeFailure(code);
}

function reject(code: string): never {
  throw new Error(code);
}

function isObject(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

function ownData(target: object, key: PropertyKey): unknown {
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(target, key);
  } catch {
    return undefined;
  }
  return descriptor !== undefined && Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ? descriptor.value
    : undefined;
}

function findMethod(receiver: object, name: PropertyKey, code: FailureCode): CapturedMethod {
  let cursor: object | null = receiver;
  for (let depth = 0; depth < 32 && cursor !== null; depth += 1) {
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(cursor, name);
    } catch {
      fail(code);
    }
    if (descriptor !== undefined) {
      if (!Object.prototype.hasOwnProperty.call(descriptor, 'value') || typeof descriptor.value !== 'function') {
        fail(code);
      }
      return Object.freeze({
        receiver,
        owner: cursor,
        name,
        method: descriptor.value as (...args: readonly unknown[]) => unknown,
      });
    }
    try {
      cursor = Object.getPrototypeOf(cursor) as object | null;
    } catch {
      fail(code);
    }
  }
  fail(code);
}

function assertMethodStable(captured: CapturedMethod, code: FailureCode): void {
  const current = findMethod(captured.receiver, captured.name, code);
  if (current.owner !== captured.owner || current.method !== captured.method) fail(code);
}

function invoke(captured: CapturedMethod, args: readonly unknown[], code: FailureCode): unknown {
  assertMethodStable(captured, code);
  try {
    return Reflect.apply(captured.method, captured.receiver, args);
  } catch {
    fail(code);
  }
}

function isGenuinePromise(value: unknown): value is Promise<unknown> {
  if (!isObject(value)) return false;
  try {
    Reflect.apply(CAPTURED_PROMISE_THEN, value, [undefined, () => undefined]);
    return true;
  } catch {
    return false;
  }
}

async function awaitCaptured(
  captured: CapturedMethod,
  args: readonly unknown[],
  code: FailureCode,
): Promise<unknown> {
  const result = invoke(captured, args, code);
  if (!isGenuinePromise(result)) fail(code);
  try {
    const resolved = await result;
    assertMethodStable(captured, code);
    return resolved;
  } catch (error) {
    if (error instanceof ProbeFailure) throw error;
    fail(code);
  }
}

function sameBinding(left: LaunchBinding, right: LaunchBinding): boolean {
  return left.packageName === right.packageName &&
    left.processName === right.processName &&
    left.pid === right.pid &&
    left.starttime === right.starttime &&
    left.launchNonce === right.launchNonce &&
    left.runtimeIdentity === right.runtimeIdentity;
}

function bindingFrom(value: unknown, code: string): LaunchBinding {
  if (!isObject(value)) reject(code);
  const packageName = ownData(value, 'packageName');
  const processName = ownData(value, 'processName');
  const pid = ownData(value, 'pid');
  const starttime = ownData(value, 'starttime');
  const launchNonce = ownData(value, 'launchNonce');
  const runtimeIdentity = ownData(value, 'runtimeIdentity');
  if (
    packageName !== PACKAGE_NAME ||
    (processName !== PRIMARY_PROCESS && processName !== SECONDARY_PROCESS) ||
    !Number.isSafeInteger(pid) || (pid as number) <= 0 ||
    typeof starttime !== 'string' || !DECIMAL.test(starttime) ||
    typeof launchNonce !== 'string' || !HEX_32.test(launchNonce) ||
    typeof runtimeIdentity !== 'string' || !HEX_32.test(runtimeIdentity)
  ) {
    reject(code);
  }
  return value as LaunchBinding;
}

function normalizeDirectory(value: unknown): string {
  if (typeof value !== 'string' || value.replace(/\/+$/u, '') !== ANDROID_SQLITE_ROOT) {
    fail('account_provision_lock_database_root_invalid');
  }
  return `${ANDROID_SQLITE_ROOT}/accounts-v2`;
}

function emitFixed(
  emit: (marker: string, evidence?: Readonly<Record<string, unknown>>) => void,
  marker: string,
  binding: LaunchBinding,
): void {
  try {
    emit(marker, Object.freeze({ ...binding }));
  } catch {
    fail('account_provision_lock_emit_failed');
  }
}

export function adoptProvisionLockHandle(value: unknown): Readonly<{
  assertOwned(): void;
  release(): Promise<void>;
}> {
  if (!isObject(value)) fail('account_provision_lock_handle_invalid');
  const releaseAsync = findMethod(value, 'releaseAsync', 'account_provision_lock_handle_invalid');
  let state: 'owned' | 'releasing' | 'released' = 'owned';
  return Object.freeze({
    assertOwned(): void {
      if (state !== 'owned') fail('account_provision_lock_post_release_use');
      assertMethodStable(releaseAsync, 'account_provision_lock_handle_invalid');
    },
    async release(): Promise<void> {
      if (state !== 'owned') fail('account_provision_lock_duplicate_release');
      state = 'releasing';
      try {
        const result = invoke(releaseAsync, [], 'account_provision_lock_release_failed');
        if (!isGenuinePromise(result)) fail('account_provision_lock_release_failed');
        const resolved = await result;
        if (resolved !== undefined && resolved !== null) fail('account_provision_lock_release_failed');
        assertMethodStable(releaseAsync, 'account_provision_lock_handle_invalid');
        state = 'released';
      } catch (error) {
        state = 'released';
        if (error instanceof ProbeFailure) throw error;
        fail('account_provision_lock_release_failed');
      }
    },
  });
}

function validateControl(
  value: unknown,
  expected: LaunchBinding,
): Readonly<{ command: 'checkpoint'; token: string } | { command: 'release' }> {
  if (!isObject(value)) {
    fail('account_provision_lock_control_invalid');
  }
  const command = ownData(value, 'command');
  if (command !== 'checkpoint' && command !== 'release') fail('account_provision_lock_control_invalid');
  let actual: LaunchBinding;
  try {
    actual = bindingFrom(ownData(value, 'binding'), 'account_provision_lock_control_invalid');
  } catch {
    fail('account_provision_lock_control_invalid');
  }
  if (!sameBinding(actual, expected)) fail('account_provision_lock_control_invalid');
  if (command === 'checkpoint') {
    const token = ownData(value, 'token');
    if (typeof token !== 'string' || !HEX_32.test(token)) fail('account_provision_lock_control_invalid');
    return Object.freeze({ command, token });
  }
  if (ownData(value, 'token') !== undefined) fail('account_provision_lock_control_invalid');
  return Object.freeze({ command });
}

export function createAndroidAccountProvisionLockProbeRuntime(): Readonly<{
  run(
    port: ProvisionLockPort,
    request: ProvisionLockRequest,
    emit: (marker: string, evidence?: Readonly<Record<string, unknown>>) => void,
  ): Promise<void>;
}> {
  let claimed = false;
  return Object.freeze({
    async run(port, request, emit): Promise<void> {
      if (!isObject(request) || (request.role !== 'holder' && request.role !== 'release')) {
        fail('account_provision_lock_request_invalid');
      }
      if (request.identity !== 'x' && request.identity !== 'y') {
        fail('account_provision_lock_identity_invalid');
      }
      try {
        bindingFrom(request.binding, 'account_provision_lock_request_invalid');
      } catch {
        fail('account_provision_lock_request_invalid');
      }
      if (claimed) fail('account_provision_lock_duplicate_role');
      claimed = true;
      if (!isObject(port)) fail('account_provision_lock_native_unsupported');

      const acquire = findMethod(
        port,
        'acquireAccountProvisionLockAsync',
        'account_provision_lock_native_unsupported',
      );
      const directory = normalizeDirectory(port.defaultDatabaseDirectory);
      emitFixed(emit, MARKERS.attempted, request.binding);
      const acquired = await awaitCaptured(
        acquire,
        [`${directory}/${DATABASE_NAMES[request.identity]}`],
        'account_provision_lock_acquire_failed',
      );
      const handle = adoptProvisionLockHandle(acquired);
      emitFixed(emit, MARKERS.acquired, request.binding);

      if (request.role === 'holder') {
        const waitForControl = findMethod(
          port,
          'waitForReleaseControl',
          'account_provision_lock_control_invalid',
        );
        for (;;) {
          const value = await awaitCaptured(
            waitForControl,
            [request.binding],
            'account_provision_lock_control_invalid',
          );
          const control = validateControl(value, request.binding);
          try {
            emit(MARKERS.controlAcknowledged, Object.freeze({ ...request.binding, ...control }));
          } catch {
            fail('account_provision_lock_emit_failed');
          }
          if (control.command === 'release') break;
          handle.assertOwned();
          try {
            emit(MARKERS.ownershipCheckpoint, Object.freeze({ ...request.binding, token: control.token }));
          } catch {
            fail('account_provision_lock_emit_failed');
          }
        }
      }

      handle.assertOwned();
      emitFixed(emit, MARKERS.releaseRequested, request.binding);
      await handle.release();
      emitFixed(emit, MARKERS.released, request.binding);
      emitFixed(emit, MARKERS.pass, request.binding);
    },
  });
}

export async function runAndroidAccountProvisionLockProbe(
  port: ProvisionLockPort,
  request: ProvisionLockRequest,
  emit: (marker: string, evidence?: Readonly<Record<string, unknown>>) => void,
): Promise<void> {
  return createAndroidAccountProvisionLockProbeRuntime().run(port, request, emit);
}

export function validateLaunchPair(ownerValue: LaunchBinding, waiterValue: LaunchBinding): void {
  const code = 'account_provision_lock_launch_binding_invalid';
  const owner = bindingFrom(ownerValue, code);
  const waiter = bindingFrom(waiterValue, code);
  if (
    owner.processName === waiter.processName ||
    owner.pid === waiter.pid ||
    owner.starttime === waiter.starttime ||
    owner.launchNonce === waiter.launchNonce ||
    owner.runtimeIdentity === waiter.runtimeIdentity
  ) {
    reject(code);
  }
}

function numberField(value: object, key: PropertyKey, code: string): number {
  const result = ownData(value, key);
  if (typeof result !== 'number' || !Number.isFinite(result)) reject(code);
  return result;
}

function arrayField(value: object, key: PropertyKey, code: string): readonly unknown[] {
  const result = ownData(value, key);
  if (!Array.isArray(result)) reject(code);
  return result;
}

export function validateContendedCheckpoint(value: unknown): void {
  const code = 'account_provision_lock_checkpoint_invalid';
  if (!isObject(value) || ownData(value, 'identity') !== 'x') reject(code);
  const owner = bindingFrom(ownData(value, 'owner'), code);
  const waiter = bindingFrom(ownData(value, 'waiter'), code);
  try {
    validateLaunchPair(owner, waiter);
  } catch {
    reject(code);
  }
  const observations = arrayField(value, 'observations', code);
  if (observations.length !== 2) reject(code);
  let previousSequence = -Infinity;
  let previousTimestamp = -Infinity;
  for (const observation of observations) {
    if (!isObject(observation)) reject(code);
    const sequence = numberField(observation, 'sequence', code);
    const timestamp = numberField(observation, 'timestamp', code);
    if (sequence <= previousSequence || timestamp <= previousTimestamp) reject(code);
    previousSequence = sequence;
    previousTimestamp = timestamp;
    const observedOwner = bindingFrom(ownData(observation, 'owner'), code);
    const observedWaiter = bindingFrom(ownData(observation, 'waiter'), code);
    if (!sameBinding(owner, observedOwner) || !sameBinding(waiter, observedWaiter)) reject(code);
    if (ownData(observation, 'ownerReportsOwnership') !== true || ownData(observation, 'waiterAcquired') !== false) {
      reject(code);
    }
    const ownershipToken = ownData(observation, 'ownershipToken');
    if (typeof ownershipToken !== 'string' || !HEX_32.test(ownershipToken)) reject(code);
  }
  const secondSequence = numberField(observations[1] as object, 'sequence', code);
  for (const candidate of arrayField(value, 'events', code)) {
    if (!isObject(candidate)) reject(code);
    const sequence = numberField(candidate, 'sequence', code);
    const kind = ownData(candidate, 'kind');
    const eventBinding = bindingFrom(ownData(candidate, 'binding'), code);
    if (
      sequence <= secondSequence &&
      ((kind === 'acquired' && sameBinding(eventBinding, waiter)) ||
        ((kind === 'release_requested' || kind === 'control_release') && sameBinding(eventBinding, owner)))
    ) {
      reject(code);
    }
  }
}

export function validateOwnershipTimeline(events: readonly TimelineEvent[]): void {
  const owners = new Map<ProvisionLockIdentity, string>();
  const states = new Map<string, 'attempted' | 'acquired' | 'release_requested' | 'released' | 'passed'>();
  const allowedKinds = new Set([
    'attempted', 'acquired', 'release_requested', 'released', 'pass', 'timeout',
    'control_release', 'sigkill_sent', 'proc_disappeared', 'owner_live_owned',
    'contended_observation', 'killed_waiter_control_rejected', 'relaunch',
    'stale_lstat_before', 'stale_lstat_while_owned',
  ]);
  let previousSequence = -Infinity;
  let previousTimestamp = -Infinity;
  for (const eventValue of events) {
    if (!isObject(eventValue)) reject('account_provision_lock_timeline_invalid');
    const sequence = numberField(eventValue, 'sequence', 'account_provision_lock_timeline_invalid');
    const timestamp = numberField(eventValue, 'timestamp', 'account_provision_lock_timeline_invalid');
    if (sequence <= previousSequence || timestamp <= previousTimestamp) {
      reject('account_provision_lock_timeline_invalid');
    }
    previousSequence = sequence;
    previousTimestamp = timestamp;
    const identity = ownData(eventValue, 'identity');
    if (identity !== 'x' && identity !== 'y') reject('account_provision_lock_timeline_invalid');
    const actor = bindingFrom(ownData(eventValue, 'binding'), 'account_provision_lock_timeline_invalid');
    const key = `${actor.pid}:${actor.starttime}:${actor.launchNonce}:${actor.runtimeIdentity}`;
    const kind = ownData(eventValue, 'kind');
    if (typeof kind !== 'string' || !allowedKinds.has(kind)) reject('account_provision_lock_timeline_invalid');
    if (kind === 'attempted') {
      if (states.has(key)) reject('account_provision_lock_timeline_invalid');
      states.set(key, 'attempted');
    } else if (kind === 'acquired') {
      if (states.get(key) !== 'attempted') reject('account_provision_lock_timeline_invalid');
      const current = owners.get(identity);
      if (current !== undefined && current !== key) reject('account_provision_lock_overlap');
      owners.set(identity, key);
      states.set(key, 'acquired');
    } else if (kind === 'release_requested') {
      if (states.get(key) !== 'acquired' || owners.get(identity) !== key) reject('account_provision_lock_timeline_invalid');
      states.set(key, 'release_requested');
    } else if (kind === 'released') {
      if (states.get(key) !== 'release_requested' || owners.get(identity) !== key) reject('account_provision_lock_timeline_invalid');
      owners.delete(identity);
      states.set(key, 'released');
    } else if (kind === 'pass') {
      if (states.get(key) !== 'released') reject('account_provision_lock_timeline_invalid');
      states.set(key, 'passed');
    } else if (kind === 'proc_disappeared' && owners.get(identity) === key) {
      owners.delete(identity);
    }
  }
}

function exactKeys(value: object, expected: readonly string[], code: string): void {
  let actual: string[];
  try {
    actual = Object.keys(value).sort();
  } catch {
    reject(code);
  }
  const sortedExpected = [...expected].sort();
  if (actual.length !== sortedExpected.length || actual.some((key, index) => key !== sortedExpected[index])) reject(code);
}

type ValidatedPhaseEvent = Readonly<{
  kind: string;
  sequence: number;
  timestamp: number;
  identity: ProvisionLockIdentity;
  binding: LaunchBinding;
  raw: object;
}>;

function phaseEventFrom(value: unknown, code: string): ValidatedPhaseEvent {
  if (!isObject(value)) reject(code);
  const kind = ownData(value, 'kind');
  const observation = kind === 'contended_observation';
  const ownerLive = kind === 'owner_live_owned';
  const stale = kind === 'stale_lstat_before' || kind === 'stale_lstat_while_owned';
  exactKeys(value, [
    'kind', 'sequence', 'timestamp', 'identity', 'binding',
    ...(observation ? ['waiter', 'ownerLive', 'ownerReportsOwnership', 'waiterLive', 'waiterAcquired', 'ownershipToken'] : []),
    ...(ownerLive ? ['live', 'owns', 'ownershipToken'] : []),
    ...(stale ? ['pathHash', 'exists', 'fileKind', 'symlink'] : []),
  ], code);
  const sequence = numberField(value, 'sequence', code);
  const timestamp = numberField(value, 'timestamp', code);
  const identity = ownData(value, 'identity');
  if (identity !== 'x' && identity !== 'y') reject(code);
  const binding = bindingFrom(ownData(value, 'binding'), code);
  return Object.freeze({ kind: String(kind), sequence, timestamp, identity, binding, raw: value });
}

function requireSimple(
  event: ValidatedPhaseEvent,
  kind: string,
  actor: LaunchBinding,
  identity: ProvisionLockIdentity,
  code: string,
): void {
  if (event.kind !== kind || event.identity !== identity || !sameBinding(event.binding, actor)) reject(code);
}

function requireObservation(
  event: ValidatedPhaseEvent,
  owner: LaunchBinding,
  waiter: LaunchBinding,
  code: string,
): void {
  requireSimple(event, 'contended_observation', owner, 'x', code);
  const observedWaiter = bindingFrom(ownData(event.raw, 'waiter'), code);
  const token = ownData(event.raw, 'ownershipToken');
  if (!sameBinding(observedWaiter, waiter) ||
      ownData(event.raw, 'ownerLive') !== true ||
      ownData(event.raw, 'ownerReportsOwnership') !== true ||
      ownData(event.raw, 'waiterLive') !== true ||
      ownData(event.raw, 'waiterAcquired') !== false ||
      typeof token !== 'string' || !HEX_32.test(token)) reject(code);
}

function requireOwnership(event: ValidatedPhaseEvent, owner: LaunchBinding, code: string): void {
  requireSimple(event, 'owner_live_owned', owner, 'x', code);
  const token = ownData(event.raw, 'ownershipToken');
  if (ownData(event.raw, 'live') !== true || ownData(event.raw, 'owns') !== true ||
      typeof token !== 'string' || !HEX_32.test(token)) reject(code);
}

function requireDistinct(owner: LaunchBinding, waiter: LaunchBinding, code: string): void {
  try {
    validateLaunchPair(owner, waiter);
  } catch {
    reject(code);
  }
}

function requireFreshRelaunch(previous: LaunchBinding, fresh: LaunchBinding, code: string): void {
  if (previous.processName !== fresh.processName || previous.packageName !== fresh.packageName ||
      previous.pid === fresh.pid || previous.starttime === fresh.starttime ||
      previous.launchNonce === fresh.launchNonce || previous.runtimeIdentity === fresh.runtimeIdentity) reject(code);
}

export function validatePhaseTranscript(value: unknown): void {
  const code = 'account_provision_lock_phase_invalid';
  if (!isObject(value)) reject(code);
  exactKeys(value, ['phase', 'events'], code);
  const phase = ownData(value, 'phase');
  const rawEvents = arrayField(value, 'events', code);
  if (rawEvents.length === 0) reject(code);
  const events = rawEvents.map((event) => phaseEventFrom(event, code));
  let previousSequence = -Infinity;
  let previousTimestamp = -Infinity;
  for (const event of events) {
    if (event.sequence <= previousSequence || event.timestamp <= previousTimestamp) reject(code);
    previousSequence = event.sequence;
    previousTimestamp = event.timestamp;
  }

  const owner = events[0]?.binding;
  if (owner === undefined) reject(code);
  const secondAttempt = events.find((event, index) => index > 0 && event.kind === 'attempted');
  if (secondAttempt === undefined) reject(code);
  const waiter = secondAttempt.binding;
  if (phase !== 'stale-file') requireDistinct(owner, waiter, code);

  if (phase === 'primary-holder-secondary-waiter' || phase === 'secondary-holder-primary-waiter') {
    if (events.length !== 13 ||
        owner.processName !== (phase === 'primary-holder-secondary-waiter' ? PRIMARY_PROCESS : SECONDARY_PROCESS) ||
        waiter.processName !== (phase === 'primary-holder-secondary-waiter' ? SECONDARY_PROCESS : PRIMARY_PROCESS)) reject(code);
    requireSimple(events[0], 'attempted', owner, 'x', code);
    requireSimple(events[1], 'acquired', owner, 'x', code);
    requireSimple(events[2], 'attempted', waiter, 'x', code);
    requireObservation(events[3], owner, waiter, code);
    requireObservation(events[4], owner, waiter, code);
    requireSimple(events[5], 'control_release', owner, 'x', code);
    requireSimple(events[6], 'release_requested', owner, 'x', code);
    requireSimple(events[7], 'released', owner, 'x', code);
    requireSimple(events[8], 'pass', owner, 'x', code);
    requireSimple(events[9], 'acquired', waiter, 'x', code);
    requireSimple(events[10], 'release_requested', waiter, 'x', code);
    requireSimple(events[11], 'released', waiter, 'x', code);
    requireSimple(events[12], 'pass', waiter, 'x', code);
  } else if (phase === 'holder-death') {
    if (events.length !== 10) reject(code);
    requireSimple(events[0], 'attempted', owner, 'x', code);
    requireSimple(events[1], 'acquired', owner, 'x', code);
    requireSimple(events[2], 'attempted', waiter, 'x', code);
    requireOwnership(events[3], owner, code);
    for (const [index, kind, actor] of [
      [4, 'sigkill_sent', owner], [5, 'proc_disappeared', owner], [6, 'acquired', waiter],
      [7, 'release_requested', waiter], [8, 'released', waiter], [9, 'pass', waiter],
    ] as const) requireSimple(events[index], kind, actor, 'x', code);
  } else if (phase === 'waiter-death') {
    if (events.length !== 19) reject(code);
    requireSimple(events[0], 'attempted', owner, 'x', code);
    requireSimple(events[1], 'acquired', owner, 'x', code);
    requireSimple(events[2], 'attempted', waiter, 'x', code);
    requireObservation(events[3], owner, waiter, code);
    requireObservation(events[4], owner, waiter, code);
    requireSimple(events[5], 'sigkill_sent', waiter, 'x', code);
    requireSimple(events[6], 'proc_disappeared', waiter, 'x', code);
    requireOwnership(events[7], owner, code);
    requireSimple(events[8], 'killed_waiter_control_rejected', waiter, 'x', code);
    requireSimple(events[9], 'control_release', owner, 'x', code);
    requireSimple(events[10], 'release_requested', owner, 'x', code);
    requireSimple(events[11], 'released', owner, 'x', code);
    requireSimple(events[12], 'pass', owner, 'x', code);
    const fresh = events[13].binding;
    requireSimple(events[13], 'relaunch', fresh, 'x', code);
    requireDistinct(owner, fresh, code);
    requireFreshRelaunch(waiter, fresh, code);
    for (const [index, kind] of [[14, 'attempted'], [15, 'acquired'], [16, 'release_requested'], [17, 'released'], [18, 'pass']] as const) {
      requireSimple(events[index], kind, fresh, 'x', code);
    }
  } else if (phase === 'independent-identities') {
    if (events.length !== 12) reject(code);
    for (const [index, kind, actor, identity] of [
      [0, 'attempted', owner, 'x'], [1, 'acquired', owner, 'x'],
      [2, 'attempted', waiter, 'y'], [3, 'acquired', waiter, 'y'],
      [4, 'release_requested', waiter, 'y'], [5, 'released', waiter, 'y'], [6, 'pass', waiter, 'y'],
    ] as const) requireSimple(events[index], kind, actor, identity, code);
    requireOwnership(events[7], owner, code);
    for (const [index, kind] of [[8, 'control_release'], [9, 'release_requested'], [10, 'released'], [11, 'pass']] as const) {
      requireSimple(events[index], kind, owner, 'x', code);
    }
  } else if (phase === 'stale-file') {
    if (events.length !== 15) reject(code);
    requireSimple(events[0], 'attempted', owner, 'x', code);
    requireSimple(events[1], 'acquired', owner, 'x', code);
    requireOwnership(events[2], owner, code);
    requireSimple(events[3], 'sigkill_sent', owner, 'x', code);
    requireSimple(events[4], 'proc_disappeared', owner, 'x', code);
    requireSimple(events[5], 'stale_lstat_before', owner, 'x', code);
    const fresh = events[6].binding;
    requireFreshRelaunch(owner, fresh, code);
    requireSimple(events[6], 'relaunch', fresh, 'x', code);
    requireSimple(events[7], 'attempted', fresh, 'x', code);
    requireSimple(events[8], 'acquired', fresh, 'x', code);
    requireSimple(events[9], 'stale_lstat_while_owned', fresh, 'x', code);
    requireOwnership(events[10], fresh, code);
    for (const [index, kind] of [[11, 'control_release'], [12, 'release_requested'], [13, 'released'], [14, 'pass']] as const) {
      requireSimple(events[index], kind, fresh, 'x', code);
    }
    for (const index of [5, 9]) {
      const event = events[index];
      if (ownData(event.raw, 'pathHash') !== IDENTITY_X_LOCK_PATH_SHA256 || ownData(event.raw, 'exists') !== true ||
          ownData(event.raw, 'fileKind') !== 'regular' || ownData(event.raw, 'symlink') !== false) reject(code);
    }
  } else {
    reject(code);
  }

  try {
    validateOwnershipTimeline(events as readonly TimelineEvent[]);
  } catch {
    reject(code);
  }
}

export function validateKilledWaiterBoundary(value: unknown): void {
  const code = 'account_provision_lock_killed_waiter_invalid';
  if (!isObject(value)) reject(code);
  const owner = bindingFrom(ownData(value, 'owner'), code);
  const waiter = bindingFrom(ownData(value, 'waiter'), code);
  try {
    validateLaunchPair(owner, waiter);
  } catch {
    reject(code);
  }
  const events = arrayField(value, 'events', code);
  let disappearance = -1;
  let ownerLiveOwned = -1;
  let previousSequence = -Infinity;
  for (const candidate of events) {
    if (!isObject(candidate)) reject(code);
    const sequence = numberField(candidate, 'sequence', code);
    if (sequence <= previousSequence) reject(code);
    previousSequence = sequence;
    const kind = ownData(candidate, 'kind');
    const actor = bindingFrom(ownData(candidate, 'binding'), code);
    if (kind === 'proc_disappeared' && sameBinding(actor, waiter)) {
      if (disappearance >= 0) reject(code);
      disappearance = sequence;
      continue;
    }
    if (disappearance >= 0 && sameBinding(actor, waiter)) reject(code);
    if (kind === 'owner_live_owned') {
      const token = ownData(candidate, 'ownershipToken');
      if (
        disappearance < 0 || ownerLiveOwned >= 0 || !sameBinding(actor, owner) ||
        ownData(candidate, 'live') !== true || ownData(candidate, 'owns') !== true ||
        typeof token !== 'string' || !HEX_32.test(token)
      ) {
        reject(code);
      }
      ownerLiveOwned = sequence;
      continue;
    }
    if (
      (kind === 'release_requested' || kind === 'released' || kind === 'control_release') &&
      sameBinding(actor, owner) &&
      (disappearance < 0 || ownerLiveOwned < 0 || sequence <= ownerLiveOwned)
    ) {
      reject(code);
    }
    if (kind === 'relaunch' && (disappearance < 0 || ownerLiveOwned < 0 || sequence <= ownerLiveOwned)) reject(code);
  }
  if (disappearance < 0 || ownerLiveOwned < 0) reject(code);
}

export function validateStaleLockEvidence(value: unknown): void {
  const code = 'account_provision_lock_stale_file_invalid';
  if (!isObject(value) || ownData(value, 'staleLockFilePresent') !== true) reject(code);
  const identity = ownData(value, 'identity');
  if (identity !== 'x' || ownData(value, 'noBackupFilesDir') !== ANDROID_NO_BACKUP_FILES_DIR) reject(code);
  const acquisitionSequence = numberField(value, 'acquisitionSequence', code);
  const facts = arrayField(value, 'facts', code);
  if (facts.length !== 2) reject(code);
  const expectedCheckpoints = ['before_acquire', 'while_acquired'] as const;
  let pathHash: string | undefined;
  let beforeSequence = -Infinity;
  let whileSequence = Infinity;
  for (let index = 0; index < facts.length; index += 1) {
    const fact = facts[index];
    if (!isObject(fact)) reject(code);
    const sequence = numberField(fact, 'sequence', code);
    const currentPathHash = ownData(fact, 'pathHash');
    if (
      ownData(fact, 'checkpoint') !== expectedCheckpoints[index] ||
      ownData(fact, 'identity') !== identity ||
      currentPathHash !== IDENTITY_X_LOCK_PATH_SHA256 ||
      ownData(fact, 'exists') !== true ||
      ownData(fact, 'kind') !== 'regular' ||
      ownData(fact, 'symlink') !== false
    ) {
      reject(code);
    }
    if (pathHash !== undefined && pathHash !== currentPathHash) reject(code);
    pathHash = currentPathHash;
    if (index === 0) beforeSequence = sequence;
    else whileSequence = sequence;
  }
  if (!(beforeSequence < acquisitionSequence && acquisitionSequence < whileSequence)) reject(code);
}

export function sanitizeDiagnostic(value: unknown): string {
  if (!isObject(value)) return 'account_provision_lock_probe_failed';
  const message = ownData(value, 'message');
  return value instanceof Error && typeof message === 'string' && SAFE_FAILURE_CODE_SET.has(message)
    ? message
    : 'account_provision_lock_probe_failed';
}
