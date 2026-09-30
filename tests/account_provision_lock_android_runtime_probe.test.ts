import crypto from 'node:crypto';

type Identity = 'x' | 'y';
type Role = 'holder' | 'release';

type Binding = Readonly<{
  packageName: 'app.phraseman';
  processName: string;
  pid: number;
  starttime: string;
  launchNonce: string;
  runtimeIdentity: string;
}>;

type TimelineEvent = Readonly<{
  kind: string;
  sequence: number;
  timestamp: number;
  identity: Identity;
  binding: Binding;
}>;

type PhaseTranscript = Readonly<{
  phase: string;
  events: readonly Record<string, unknown>[];
}>;

type ProbeModule = Readonly<{
  MARKERS: Readonly<Record<string, string>>;
  SAFE_FAILURE_CODES: readonly string[];
  createAndroidAccountProvisionLockProbeRuntime(): {
    run(
      port: Record<string, unknown>,
      request: Readonly<{ role: Role; identity: Identity; binding: Binding }>,
      emit: (marker: string, evidence?: Record<string, unknown>) => void,
    ): Promise<void>;
  };
  adoptProvisionLockHandle(value: unknown): {
    assertOwned(): void;
    release(): Promise<void>;
  };
  validateLaunchPair(owner: Binding, waiter: Binding): void;
  validateContendedCheckpoint(value: unknown): void;
  validateOwnershipTimeline(events: readonly TimelineEvent[]): void;
  validatePhaseTranscript(value: PhaseTranscript): void;
  validateKilledWaiterBoundary(value: unknown): void;
  validateStaleLockEvidence(value: unknown): void;
  sanitizeDiagnostic(value: unknown): string;
}>;

const HEX_A = 'a'.repeat(32);
const HEX_B = 'b'.repeat(32);
const HEX_C = 'c'.repeat(32);
const HEX_D = 'd'.repeat(32);

function binding(overrides: Partial<Binding> = {}): Binding {
  return Object.freeze({
    packageName: 'app.phraseman',
    processName: 'app.phraseman',
    pid: 1201,
    starttime: '9001',
    launchNonce: HEX_A,
    runtimeIdentity: HEX_B,
    ...overrides,
  });
}

function vulnerableModule(): ProbeModule {
  const markers = Object.freeze({
    attempted: 'account_provision_lock_attempted',
    acquired: 'account_provision_lock_acquired',
    ownershipCheckpoint: 'account_provision_lock_owned_checkpoint',
    releaseRequested: 'account_provision_lock_release_requested',
    released: 'account_provision_lock_released',
    pass: 'account_provision_lock_probe_pass',
  });
  return {
    MARKERS: markers,
    SAFE_FAILURE_CODES: Object.freeze(['account_provision_lock_probe_failed']),
    createAndroidAccountProvisionLockProbeRuntime: () => ({
      run: async (_port, request, emit) => {
        emit(markers.attempted);
        emit(markers.acquired);
        emit(markers.ownershipCheckpoint, { ...request.binding, token: 'f'.repeat(32) });
        emit(markers.releaseRequested);
        emit(markers.released);
        emit(markers.pass);
      },
    }),
    adoptProvisionLockHandle: (_value) => ({
      assertOwned: () => undefined,
      release: async () => undefined,
    }),
    validateLaunchPair: () => undefined,
    validateContendedCheckpoint: () => undefined,
    validateOwnershipTimeline: () => undefined,
    validatePhaseTranscript: () => undefined,
    validateKilledWaiterBoundary: () => undefined,
    validateStaleLockEvidence: () => undefined,
    sanitizeDiagnostic: (value) => String(value),
  };
}

const subject: ProbeModule = process.env.ACCOUNT_PROVISION_LOCK_VULNERABLE === '1'
  ? vulnerableModule()
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  : require('../runtime-probes/android-account-provision-lock/probe') as ProbeModule;

const owner = binding();
const waiter = binding({
  processName: 'app.phraseman:account_v2_probe',
  pid: 1202,
  starttime: '9002',
  launchNonce: HEX_C,
  runtimeIdentity: HEX_D,
});

function timelineEvent(
  kind: string,
  sequence: number,
  actor: Binding,
  identity: Identity = 'x',
): TimelineEvent {
  return Object.freeze({ kind, sequence, timestamp: sequence * 10, identity, binding: actor });
}

function validCheckpoint(): Record<string, unknown> {
  return {
    owner,
    waiter,
    identity: 'x',
    observations: [
      {
        sequence: 3,
        timestamp: 30,
        owner,
        waiter,
        ownerReportsOwnership: true,
        waiterAcquired: false,
        ownershipToken: 'e'.repeat(32),
      },
      {
        sequence: 4,
        timestamp: 40,
        owner,
        waiter,
        ownerReportsOwnership: true,
        waiterAcquired: false,
        ownershipToken: 'f'.repeat(32),
      },
    ],
    events: [timelineEvent('attempted', 1, owner), timelineEvent('acquired', 2, owner), timelineEvent('attempted', 2.5, waiter)],
  };
}

function validKilledWaiter(): Record<string, unknown> {
  return {
    owner,
    waiter,
    events: [
      timelineEvent('attempted', 1, owner),
      timelineEvent('acquired', 2, owner),
      timelineEvent('attempted', 3, waiter),
      timelineEvent('proc_disappeared', 4, waiter),
      { ...timelineEvent('owner_live_owned', 4.5, owner), live: true, owns: true, ownershipToken: 'e'.repeat(32) },
      timelineEvent('release_requested', 5, owner),
      timelineEvent('released', 6, owner),
      timelineEvent('relaunch', 7, binding({
        processName: waiter.processName,
        pid: 1203,
        starttime: '9003',
        launchNonce: 'e'.repeat(32),
        runtimeIdentity: 'f'.repeat(32),
      })),
    ],
  };
}

function validStaleEvidence(): Record<string, unknown> {
  const noBackupFilesDir = '/data/user/0/app.phraseman/no_backup';
  const lockPath = `${noBackupFilesDir}/account-sqlite-provision-locks/accounts-v2-g-${'a'.repeat(64)}.db.provision.lock`;
  const lockPathHash = crypto.createHash('sha256').update(lockPath, 'utf8').digest('hex');
  return {
    staleLockFilePresent: true,
    identity: 'x',
    noBackupFilesDir,
    acquisitionSequence: 2,
    facts: [
      {
        checkpoint: 'before_acquire',
        sequence: 1,
        identity: 'x',
        pathHash: lockPathHash,
        exists: true,
        kind: 'regular',
        symlink: false,
      },
      {
        checkpoint: 'while_acquired',
        sequence: 3,
        identity: 'x',
        pathHash: lockPathHash,
        exists: true,
        kind: 'regular',
        symlink: false,
      },
    ],
  };
}

function expectCode(operation: () => unknown, code: string): void {
  expect(operation).toThrow(code);
}

describe('Android Account V2 provision-lock runtime probe', () => {
  test('preserves receiver identity for acquire/release and delays release markers until resolution', async () => {
    const emitted: { marker: string; evidence?: Record<string, unknown> }[] = [];
    const calls: string[] = [];
    let resolveRelease!: () => void;
    const releaseGate = new Promise<void>((resolve) => { resolveRelease = resolve; });
    const handle = {
      releaseAsync: async function releaseAsync(this: unknown): Promise<void> {
        expect(this).toBe(handle);
        calls.push('release');
        await releaseGate;
      },
    };
    const port = {
      defaultDatabaseDirectory: '/data/user/0/app.phraseman/files/SQLite///',
      waitForReleaseControl: jest.fn(async function waitForReleaseControl(this: unknown): Promise<unknown> {
        expect(this).toBe(port);
        calls.push('control');
        return calls.filter((value) => value === 'control').length === 1
          ? { command: 'checkpoint', binding: owner, token: 'f'.repeat(32) }
          : { command: 'release', binding: owner };
      }),
      acquireAccountProvisionLockAsync: async function acquire(this: unknown, path: unknown) {
        expect(this).toBe(port);
        expect(path).toBe(`/data/user/0/app.phraseman/files/SQLite/accounts-v2/accounts-v2-g-${'a'.repeat(64)}.db`);
        calls.push('acquire');
        return handle;
      },
    };
    const runtime = subject.createAndroidAccountProvisionLockProbeRuntime();
    const running = runtime.run(port, { role: 'holder', identity: 'x', binding: owner }, (marker, evidence) => {
      emitted.push({ marker, evidence });
    });

    await new Promise<void>((resolve) => { setImmediate(resolve); });
    expect(emitted).toEqual([
      { marker: subject.MARKERS.attempted, evidence: owner },
      { marker: subject.MARKERS.acquired, evidence: owner },
      {
        marker: subject.MARKERS.controlAcknowledged,
        evidence: { ...owner, command: 'checkpoint', token: 'f'.repeat(32) },
      },
      { marker: subject.MARKERS.ownershipCheckpoint, evidence: { ...owner, token: 'f'.repeat(32) } },
      { marker: subject.MARKERS.controlAcknowledged, evidence: { ...owner, command: 'release' } },
      { marker: subject.MARKERS.releaseRequested, evidence: owner },
    ]);
    expect(calls).toEqual(['acquire', 'control', 'control', 'release']);
    resolveRelease();
    await running;
    expect(emitted).toEqual([
      { marker: subject.MARKERS.attempted, evidence: owner },
      { marker: subject.MARKERS.acquired, evidence: owner },
      {
        marker: subject.MARKERS.controlAcknowledged,
        evidence: { ...owner, command: 'checkpoint', token: 'f'.repeat(32) },
      },
      { marker: subject.MARKERS.ownershipCheckpoint, evidence: { ...owner, token: 'f'.repeat(32) } },
      { marker: subject.MARKERS.controlAcknowledged, evidence: { ...owner, command: 'release' } },
      { marker: subject.MARKERS.releaseRequested, evidence: owner },
      { marker: subject.MARKERS.released, evidence: owner },
      { marker: subject.MARKERS.pass, evidence: owner },
    ]);
  });

  test('rejects malformed handles and native failures without acquired/released/PASS', async () => {
    for (const result of [null, {}, { releaseAsync: 1 }]) {
      const emitted: string[] = [];
      const runtime = subject.createAndroidAccountProvisionLockProbeRuntime();
      const port = {
        defaultDatabaseDirectory: '/data/user/0/app.phraseman/files/SQLite',
        acquireAccountProvisionLockAsync: async () => result,
      };
      await expect(runtime.run(port, { role: 'release', identity: 'x', binding: owner }, (value) => emitted.push(value)))
        .rejects.toThrow('account_provision_lock_handle_invalid');
      expect(emitted).toEqual([subject.MARKERS.attempted]);
    }

    const emitted: string[] = [];
    const runtime = subject.createAndroidAccountProvisionLockProbeRuntime();
    await expect(runtime.run({
      defaultDatabaseDirectory: '/data/user/0/app.phraseman/files/SQLite',
      acquireAccountProvisionLockAsync: async () => { throw new Error('C:\\private\\native'); },
    }, { role: 'release', identity: 'x', binding: owner }, (value) => emitted.push(value)))
      .rejects.toThrow('account_provision_lock_acquire_failed');
    expect(emitted).toEqual([subject.MARKERS.attempted]);
  });

  test('fails closed on duplicate role, duplicate release, and post-release use', async () => {
    const handle = { releaseAsync: async () => undefined };
    const runtime = subject.createAndroidAccountProvisionLockProbeRuntime();
    const port = {
      defaultDatabaseDirectory: '/data/user/0/app.phraseman/files/SQLite',
      acquireAccountProvisionLockAsync: async () => handle,
    };
    await runtime.run(port, { role: 'release', identity: 'x', binding: owner }, () => undefined);
    await expect(runtime.run(port, { role: 'release', identity: 'x', binding: owner }, () => undefined))
      .rejects.toThrow('account_provision_lock_duplicate_role');

    const adopted = subject.adoptProvisionLockHandle(handle);
    adopted.assertOwned();
    await adopted.release();
    await expect(adopted.release()).rejects.toThrow('account_provision_lock_duplicate_release');
    expectCode(() => adopted.assertOwned(), 'account_provision_lock_post_release_use');
  });

  test.each(['../x', 'X', 'x.db', 'x/', ' y', 'z', '', 'accounts-v2-g-a.db'])(
    'rejects non-canonical identity selector %p',
    async (identity) => {
      const runtime = subject.createAndroidAccountProvisionLockProbeRuntime();
      const port = {
        defaultDatabaseDirectory: '/data/user/0/app.phraseman/files/SQLite',
        acquireAccountProvisionLockAsync: async () => ({}),
      };
      await expect(runtime.run(port, { role: 'release', identity: identity as Identity, binding: owner }, () => undefined))
        .rejects.toThrow('account_provision_lock_identity_invalid');
    },
  );

  test.each([
    ['URI or backslash', ['file:///data/user/0/app.phraseman/files/SQLite', '/data/user/0/app.phraseman/files\\SQLite']],
    ['dot or parent', ['/data/user/0/app.phraseman/files/SQLite/.', '/data/user/0/app.phraseman/files/SQLite/../SQLite']],
    ['sibling or case', ['/safe', '/data/user/0/app.phraseman/files/SQLite-other', '/data/user/0/app.phraseman/files/sqlite']],
    ['whitespace or non-string', [' /data/user/0/app.phraseman/files/SQLite', '/data/user/0/app.phraseman/files/SQLite\n', null, 1]],
  ])('rejects non-native SQLite roots in the %s group before acquire', async (_group, defaultDatabaseDirectories) => {
    for (const defaultDatabaseDirectory of defaultDatabaseDirectories) {
      const acquire = jest.fn(async () => ({ releaseAsync: async () => undefined }));
      await expect(subject.createAndroidAccountProvisionLockProbeRuntime().run({
        defaultDatabaseDirectory,
        acquireAccountProvisionLockAsync: acquire,
      }, { role: 'release', identity: 'x', binding: owner }, () => undefined))
        .rejects.toThrow('account_provision_lock_database_root_invalid');
      expect(acquire).not.toHaveBeenCalled();
    }
  });

  test('requires exact process, PID, starttime, nonce, runtime, and different processes', () => {
    expect(() => subject.validateLaunchPair(owner, waiter)).not.toThrow();
    for (const changed of [
      { packageName: 'app.phraseman.other' },
      { processName: owner.processName },
      { pid: owner.pid },
      { starttime: owner.starttime },
      { launchNonce: owner.launchNonce },
      { runtimeIdentity: owner.runtimeIdentity },
      { starttime: '09x' },
      { launchNonce: 'A'.repeat(32) },
    ]) {
      expectCode(
        () => subject.validateLaunchPair(owner, binding(changed as Partial<Binding>)),
        'account_provision_lock_launch_binding_invalid',
      );
    }
  });

  test('accepts exactly two stable, distinct, increasing contended observations', () => {
    expect(() => subject.validateContendedCheckpoint(validCheckpoint())).not.toThrow();
  });

  test('rejects missing, replayed, non-increasing, cross-nonce, and ownership-drift observations', () => {
    const mutations: ((value: Record<string, unknown>) => void)[] = [
      (value) => { value.observations = (value.observations as unknown[]).slice(0, 1); },
      (value) => { (value.observations as unknown[])[1] = (value.observations as unknown[])[0]; },
      (value) => { ((value.observations as Record<string, unknown>[])[1]).timestamp = 30; },
      (value) => { ((value.observations as Record<string, unknown>[])[1]).owner = binding({ launchNonce: HEX_C }); },
      (value) => { ((value.observations as Record<string, unknown>[])[1]).waiter = binding({ ...waiter, runtimeIdentity: HEX_A }); },
      (value) => { ((value.observations as Record<string, unknown>[])[1]).ownerReportsOwnership = false; },
    ];
    for (const mutate of mutations) {
      const value = structuredClone(validCheckpoint());
      mutate(value);
      expectCode(() => subject.validateContendedCheckpoint(value), 'account_provision_lock_checkpoint_invalid');
    }
  });

  test('rejects waiter acquisition or release/control before and between either observation', () => {
    for (const injected of [
      timelineEvent('acquired', 2.75, waiter),
      timelineEvent('acquired', 3, waiter),
      timelineEvent('acquired', 3.5, waiter),
      timelineEvent('acquired', 4, waiter),
      timelineEvent('control_release', 3.5, owner),
      timelineEvent('release_requested', 3.5, owner),
    ]) {
      const value = validCheckpoint();
      value.events = [...value.events as TimelineEvent[], injected];
      expectCode(() => subject.validateContendedCheckpoint(value), 'account_provision_lock_checkpoint_invalid');
    }
  });

  test('rejects overlapping same-identity ownership but permits different identities', () => {
    const overlapping = [
      timelineEvent('attempted', 1, owner), timelineEvent('acquired', 2, owner),
      timelineEvent('attempted', 3, waiter), timelineEvent('acquired', 4, waiter),
      timelineEvent('release_requested', 5, owner), timelineEvent('released', 6, owner),
    ];
    expectCode(() => subject.validateOwnershipTimeline(overlapping), 'account_provision_lock_overlap');

    const independent = [...overlapping];
    independent[2] = timelineEvent('attempted', 3, waiter, 'y');
    independent[3] = timelineEvent('acquired', 4, waiter, 'y');
    expect(() => subject.validateOwnershipTimeline(independent)).not.toThrow();
  });

  test('treats timeout as observation only and never as cancellation/release', () => {
    const events = [
      timelineEvent('attempted', 1, owner), timelineEvent('acquired', 2, owner),
      timelineEvent('attempted', 3, waiter), timelineEvent('timeout', 4, waiter), timelineEvent('acquired', 5, waiter),
    ];
    expectCode(() => subject.validateOwnershipTimeline(events), 'account_provision_lock_overlap');
  });

  test('requires the complete ordered primary-holder transcript and rejects unknown or missing events', () => {
    const observation = (sequence: number): Record<string, unknown> => ({
      kind: 'contended_observation', sequence, timestamp: sequence * 10, identity: 'x', binding: owner,
      waiter, ownerLive: true, ownerReportsOwnership: true, waiterLive: true, waiterAcquired: false,
      ownershipToken: sequence === 4 ? 'e'.repeat(32) : 'f'.repeat(32),
    });
    const events: Record<string, unknown>[] = [
      timelineEvent('attempted', 1, owner),
      timelineEvent('acquired', 2, owner),
      timelineEvent('attempted', 3, waiter),
      observation(4), observation(5),
      timelineEvent('control_release', 6, owner),
      timelineEvent('release_requested', 7, owner),
      timelineEvent('released', 8, owner),
      timelineEvent('pass', 9, owner),
      timelineEvent('acquired', 10, waiter),
      timelineEvent('release_requested', 11, waiter),
      timelineEvent('released', 12, waiter),
      timelineEvent('pass', 13, waiter),
    ];
    expect(() => subject.validatePhaseTranscript({ phase: 'primary-holder-secondary-waiter', events })).not.toThrow();
    for (const mutated of [
      events.slice(1),
      events.filter((event) => event.kind !== 'released'),
      events.map((event, index) => index === 4 ? { ...event, kind: 'mystery' } : event),
      events.map((event, index) => index === 10 ? { ...event, binding: owner } : event),
    ]) {
      expectCode(
        () => subject.validatePhaseTranscript({ phase: 'primary-holder-secondary-waiter', events: mutated }),
        'account_provision_lock_phase_invalid',
      );
    }
  });

  test('requires death boundaries, killed-waiter rejection, fresh relaunch, and identity independence', () => {
    const fresh = binding({
      processName: waiter.processName,
      pid: 1203,
      starttime: '9003',
      launchNonce: 'e'.repeat(32),
      runtimeIdentity: 'f'.repeat(32),
    });
    const holderDeath = [
      timelineEvent('attempted', 1, owner), timelineEvent('acquired', 2, owner),
      timelineEvent('attempted', 3, waiter),
      { ...timelineEvent('owner_live_owned', 4, owner), live: true, owns: true, ownershipToken: 'e'.repeat(32) },
      timelineEvent('sigkill_sent', 5, owner), timelineEvent('proc_disappeared', 6, owner),
      timelineEvent('acquired', 7, waiter), timelineEvent('release_requested', 8, waiter),
      timelineEvent('released', 9, waiter), timelineEvent('pass', 10, waiter),
    ];
    expect(() => subject.validatePhaseTranscript({ phase: 'holder-death', events: holderDeath })).not.toThrow();
    expectCode(
      () => subject.validatePhaseTranscript({
        phase: 'holder-death',
        events: holderDeath.map((event, index) => index === 4 ? { ...event, kind: 'timeout' } : event),
      }),
      'account_provision_lock_phase_invalid',
    );

    const observation = (sequence: number): Record<string, unknown> => ({
      kind: 'contended_observation', sequence, timestamp: sequence * 10, identity: 'x', binding: owner,
      waiter, ownerLive: true, ownerReportsOwnership: true, waiterLive: true, waiterAcquired: false,
      ownershipToken: sequence === 4 ? 'e'.repeat(32) : 'f'.repeat(32),
    });
    const waiterDeath: Record<string, unknown>[] = [
      timelineEvent('attempted', 1, owner), timelineEvent('acquired', 2, owner), timelineEvent('attempted', 3, waiter),
      observation(4), observation(5), timelineEvent('sigkill_sent', 6, waiter), timelineEvent('proc_disappeared', 7, waiter),
      { ...timelineEvent('owner_live_owned', 8, owner), live: true, owns: true, ownershipToken: '9'.repeat(32) },
      timelineEvent('killed_waiter_control_rejected', 9, waiter), timelineEvent('control_release', 10, owner),
      timelineEvent('release_requested', 11, owner), timelineEvent('released', 12, owner), timelineEvent('pass', 13, owner),
      timelineEvent('relaunch', 14, fresh), timelineEvent('attempted', 15, fresh), timelineEvent('acquired', 16, fresh),
      timelineEvent('release_requested', 17, fresh), timelineEvent('released', 18, fresh), timelineEvent('pass', 19, fresh),
    ];
    expect(() => subject.validatePhaseTranscript({ phase: 'waiter-death', events: waiterDeath })).not.toThrow();
    for (const forbidden of ['killed_waiter_control_rejected', 'control_release', 'relaunch']) {
      expectCode(
        () => subject.validatePhaseTranscript({
          phase: 'waiter-death',
          events: waiterDeath.filter((event) => event.kind !== forbidden),
        }),
        'account_provision_lock_phase_invalid',
      );
    }
    expectCode(
      () => subject.validatePhaseTranscript({
        phase: 'waiter-death',
        events: [...waiterDeath, timelineEvent('acquired', 20, waiter)],
      }),
      'account_provision_lock_phase_invalid',
    );

    const independent = [
      timelineEvent('attempted', 1, owner, 'x'), timelineEvent('acquired', 2, owner, 'x'),
      timelineEvent('attempted', 3, waiter, 'y'), timelineEvent('acquired', 4, waiter, 'y'),
      timelineEvent('release_requested', 5, waiter, 'y'), timelineEvent('released', 6, waiter, 'y'), timelineEvent('pass', 7, waiter, 'y'),
      { ...timelineEvent('owner_live_owned', 8, owner, 'x'), live: true, owns: true, ownershipToken: 'e'.repeat(32) },
      timelineEvent('control_release', 9, owner, 'x'), timelineEvent('release_requested', 10, owner, 'x'),
      timelineEvent('released', 11, owner, 'x'), timelineEvent('pass', 12, owner, 'x'),
    ];
    expect(() => subject.validatePhaseTranscript({ phase: 'independent-identities', events: independent })).not.toThrow();
    expectCode(
      () => subject.validatePhaseTranscript({
        phase: 'independent-identities',
        events: independent.map((event) => event.identity === 'y' ? { ...event, identity: 'x' } : event),
      }),
      'account_provision_lock_phase_invalid',
    );
  });

  test('requires stale lstat after verified holder death and before a fresh same-process X acquire', () => {
    const fresh = binding({
      pid: 1203,
      starttime: '9003',
      launchNonce: 'e'.repeat(32),
      runtimeIdentity: 'f'.repeat(32),
    });
    const stale = (kind: string, sequence: number, actor: Binding): Record<string, unknown> => ({
      ...timelineEvent(kind, sequence, actor),
      pathHash: 'a3fc8a7de2f9ec1a99ebc22819b5f6fbbf08d1da49247340a72654842fd9d1e4',
      exists: true,
      fileKind: 'regular',
      symlink: false,
    });
    const events: Record<string, unknown>[] = [
      timelineEvent('attempted', 1, owner), timelineEvent('acquired', 2, owner),
      { ...timelineEvent('owner_live_owned', 3, owner), live: true, owns: true, ownershipToken: '1'.repeat(32) },
      timelineEvent('sigkill_sent', 4, owner), timelineEvent('proc_disappeared', 5, owner),
      stale('stale_lstat_before', 6, owner), timelineEvent('relaunch', 7, fresh),
      timelineEvent('attempted', 8, fresh), timelineEvent('acquired', 9, fresh),
      stale('stale_lstat_while_owned', 10, fresh),
      { ...timelineEvent('owner_live_owned', 11, fresh), live: true, owns: true, ownershipToken: '2'.repeat(32) },
      timelineEvent('control_release', 12, fresh), timelineEvent('release_requested', 13, fresh),
      timelineEvent('released', 14, fresh), timelineEvent('pass', 15, fresh),
    ];
    expect(() => subject.validatePhaseTranscript({ phase: 'stale-file', events })).not.toThrow();
    const movedBeforeDeath = [...events];
    [movedBeforeDeath[4], movedBeforeDeath[5]] = [movedBeforeDeath[5], movedBeforeDeath[4]];
    expectCode(
      () => subject.validatePhaseTranscript({ phase: 'stale-file', events: movedBeforeDeath }),
      'account_provision_lock_phase_invalid',
    );
  });

  test('requires killed waiter /proc disappearance before release/relaunch and rejects late nonce events', () => {
    expect(() => subject.validateKilledWaiterBoundary(validKilledWaiter())).not.toThrow();
    for (const mutate of [
      (events: TimelineEvent[]) => events.filter((value) => value.kind !== 'proc_disappeared'),
      (events: TimelineEvent[]) => events.filter((value) => value.kind !== 'owner_live_owned'),
      (events: TimelineEvent[]) => events.map((value) => value.kind === 'proc_disappeared' ? { ...value, sequence: 6.5 } : value),
      (events: TimelineEvent[]) => [
        ...events.slice(0, 3),
        timelineEvent('control_release', 3.5, owner),
        ...events.slice(3),
      ],
      (events: TimelineEvent[]) => [
        ...events.slice(0, 3),
        timelineEvent('relaunch', 3.5, waiter),
        ...events.slice(3),
      ],
      (events: TimelineEvent[]) => events.map((value) => value.kind === 'owner_live_owned'
        ? { ...value, binding: binding({ ...owner, runtimeIdentity: HEX_A }) }
        : value),
      (events: TimelineEvent[]) => events.map((value) => value.kind === 'owner_live_owned'
        ? { ...value, owns: false }
        : value),
      (events: TimelineEvent[]) => [...events, timelineEvent('acquired', 8, waiter)],
    ]) {
      const value = validKilledWaiter();
      value.events = mutate(value.events as TimelineEvent[]);
      expectCode(() => subject.validateKilledWaiterBoundary(value), 'account_provision_lock_killed_waiter_invalid');
    }
  });

  test('requires exact stale regular non-symlink lstat before and while acquired', () => {
    expect(() => subject.validateStaleLockEvidence(validStaleEvidence())).not.toThrow();
    const mutations: ((value: Record<string, unknown>) => void)[] = [
      (value) => { value.staleLockFilePresent = false; },
      (value) => { value.identity = 'y'; },
      (value) => { value.noBackupFilesDir = '/data/user/0/app.phraseman/files'; },
      (value) => { value.facts = (value.facts as unknown[]).slice(0, 1); },
      (value) => { ((value.facts as Record<string, unknown>[])[0]).pathHash = '1'.repeat(64); },
      (value) => { ((value.facts as Record<string, unknown>[])[1]).pathHash = '2'.repeat(64); },
      (value) => { ((value.facts as Record<string, unknown>[])[1]).identity = 'y'; },
      (value) => { ((value.facts as Record<string, unknown>[])[0]).kind = 'directory'; },
      (value) => { ((value.facts as Record<string, unknown>[])[1]).symlink = true; },
      (value) => { ((value.facts as Record<string, unknown>[])[0]).exists = false; },
      (value) => { value.acquisitionSequence = 1; },
    ];
    for (const mutate of mutations) {
      const value = structuredClone(validStaleEvidence());
      mutate(value);
      expectCode(() => subject.validateStaleLockEvidence(value), 'account_provision_lock_stale_file_invalid');
    }
  });

  test('reduces hostile/raw failures to a fixed safe code', () => {
    expect(subject.sanitizeDiagnostic(new Error('C:\\private\\secret.db'))).toBe('account_provision_lock_probe_failed');
    expect(subject.sanitizeDiagnostic({ message: 'account_provision_lock_acquire_failed' }))
      .toBe('account_provision_lock_probe_failed');
    for (const code of subject.SAFE_FAILURE_CODES) {
      expect(subject.sanitizeDiagnostic(new Error(code))).toBe(code);
      expect(code).toMatch(/^account_[a-z0-9_]+$/u);
      expect(code).not.toMatch(/[\\/]/u);
    }
  });
});
