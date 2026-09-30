import { sameSessionFence, type SessionFence } from '../modules/account-session-v2/account_session';
import type {
  AccountSyncEffect,
  AccountSyncOwnedOperation,
  AccountSyncState,
} from '../modules/account-session-v2/account_sync';
import {
  createAccountSyncRunner,
  type AccountSyncRunnerPorts,
} from '../modules/account-session-v2/account_sync_runner';

const fenceA = Object.freeze({
  scopeKey: 'account:uid/a-юзер', uid: 'uid/a-юзер', generation: 1, nonce: 'nonce-a',
});

function ownedOperation(operationId = 'operation-1'): AccountSyncOwnedOperation {
  return {
    ownerUid: 'uid/a-юзер',
    operation: {
      schemaVersion: 1,
      operationId,
      entityType: 'lesson_progress',
      entityId: `entity/${operationId}`,
      clientSequence: 1,
      baseRevision: null,
      payload: { opaque: true },
    },
  };
}

function receipt(operationId = 'operation-1') {
  return { operationId, outcome: 'applied' as const, serverRevision: 7 };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolveValue, rejectValue) => {
    resolve = resolveValue;
    reject = rejectValue;
  });
  return { promise, resolve, reject };
}

function makePorts(overrides: Partial<AccountSyncRunnerPorts> = {}): AccountSyncRunnerPorts {
  return {
    load: async () => ({ batchId: 'batch-1', operations: [ownedOperation()], pendingCount: 1 }),
    dispatch: async () => ({ outcome: 'accepted', receipts: [receipt()] }),
    ackCommit: async () => ({
      committedOperationIds: ['operation-1'], remainingPendingCountObserved: 0,
    }),
    ...overrides,
  };
}

function phase(state: AccountSyncState): AccountSyncState['phase'] {
  return state.phase;
}

describe('account sync runner v2 sequencing', () => {
  test('runs one batch through load, dispatch and committed acknowledgement', async () => {
    const seen: AccountSyncEffect[] = [];
    const runner = createAccountSyncRunner('uid/a-юзер', fenceA, 1, {
      load: async (effect) => {
        seen.push(effect);
        return { batchId: 'batch-1', operations: [ownedOperation()], pendingCount: 1 };
      },
      dispatch: async (effect) => {
        seen.push(effect);
        return { outcome: 'accepted', receipts: [receipt()] };
      },
      ackCommit: async (effect) => {
        seen.push(effect);
        return { committedOperationIds: ['operation-1'], remainingPendingCountObserved: 3 };
      },
    }, () => true);

    const result = await runner.runOneBatch();

    expect(seen.map((effect) => effect.type)).toEqual([
      'LOAD_OUTBOX_BATCH', 'DISPATCH_OUTBOX_BATCH', 'COMMIT_OUTBOX_ACKS',
    ]);
    expect(seen.every(Object.isFrozen)).toBe(true);
    expect(result).toMatchObject({
      evidenceKind: 'sync_runner_port_only', failure: null,
      state: { pendingCount: 3, phase: { tag: 'idle' } },
    });
    expect(result.confirmations).toEqual([{
      type: 'REPORT_SYNC_CONFIRMED', ownerUid: 'uid/a-юзер', expectedFence: fenceA,
      attemptEpoch: 3, batchId: 'batch-1', confirmedOperationIds: ['operation-1'],
      remainingPendingCountObserved: 3,
    }]);
    expect(runner.getState()).toBe(result.state);
  });

  test('does not acknowledge or confirm before dispatch succeeds', async () => {
    const dispatch = deferred<unknown>();
    let ackCalls = 0;
    const runner = createAccountSyncRunner('uid/a-юзер', fenceA, 1, makePorts({
      dispatch: () => dispatch.promise,
      ackCommit: async () => {
        ackCalls += 1;
        return { committedOperationIds: ['operation-1'], remainingPendingCountObserved: 0 };
      },
    }), () => true);

    const running = runner.runOneBatch();
    await Promise.resolve();
    await Promise.resolve();
    expect(ackCalls).toBe(0);
    dispatch.resolve({ outcome: 'accepted', receipts: [receipt()] });
    const result = await running;
    expect(ackCalls).toBe(1);
    expect(result.confirmations).toHaveLength(1);
  });

  test('stops after an empty load and never auto-drains another batch', async () => {
    let loadCalls = 0;
    const runner = createAccountSyncRunner('uid/a-юзер', fenceA, 2, makePorts({
      load: async () => {
        loadCalls += 1;
        return loadCalls === 1
          ? { batchId: 'empty', operations: [], pendingCount: 0 }
          : { batchId: 'unexpected', operations: [ownedOperation()], pendingCount: 1 };
      },
    }), () => true);

    const result = await runner.runOneBatch();
    expect(result.state).toMatchObject({ pendingCount: 0, phase: { tag: 'idle' } });
    expect(loadCalls).toBe(1);
    await Promise.resolve();
    expect(loadCalls).toBe(1);
  });

  test('preserves a concurrent enqueue count and requires another explicit run', async () => {
    let loadCalls = 0;
    const runner = createAccountSyncRunner('uid/a-юзер', fenceA, 1, makePorts({
      load: async () => {
        loadCalls += 1;
        return { batchId: `batch-${loadCalls}`, operations: [ownedOperation()], pendingCount: 1 };
      },
      ackCommit: async () => ({
        committedOperationIds: ['operation-1'], remainingPendingCountObserved: 2,
      }),
    }), () => true);
    const first = await runner.runOneBatch();
    expect(first.state.pendingCount).toBe(2);
    expect(loadCalls).toBe(1);
    await runner.runOneBatch();
    expect(loadCalls).toBe(2);
  });
});

describe('account sync runner v2 finite failures and retries', () => {
  test('maps port failures to the retained retry stage with fresh epochs', async () => {
    // зачем (TG-7CD73967EF61): легаси `{outcome:'rejected'}` теперь неудача с backoff.
    let now = 1_000_000;
    let loadAttempts = 0;
    let dispatchAttempts = 0;
    let ackAttempts = 0;
    const runner = createAccountSyncRunner('uid/a-юзер', fenceA, 1, makePorts({
      load: async () => {
        loadAttempts += 1;
        if (loadAttempts === 1) throw new Error('private load failure');
        return { batchId: 'batch-1', operations: [ownedOperation()], pendingCount: 1 };
      },
      dispatch: async () => {
        dispatchAttempts += 1;
        if (dispatchAttempts === 1) return { outcome: 'rejected' };
        return { outcome: 'accepted', receipts: [receipt()] };
      },
      ackCommit: async () => {
        ackAttempts += 1;
        if (ackAttempts === 1) throw new Error('private ack failure');
        return { committedOperationIds: ['operation-1'], remainingPendingCountObserved: 0 };
      },
    }), () => true, { nowMs: () => now, random: () => 0 });

    expect(phase((await runner.runOneBatch()).state)).toMatchObject({
      tag: 'sync_attention', code: 'sync_load_failed', retry: { stage: 'load' },
    });
    const rejected = await runner.runOneBatch();
    expect(phase(rejected.state)).toMatchObject({
      tag: 'sync_attention', code: 'sync_dispatch_rejected', retry: { stage: 'dispatch' },
    });
    expect(rejected.transport).toMatchObject({ action: 'retry', failedAttempts: 1, errorCode: 'legacy_rejected' });
    now += rejected.transport?.delayMs ?? 0;
    expect(phase((await runner.runOneBatch()).state)).toMatchObject({
      tag: 'sync_attention', code: 'sync_ack_commit_failed', retry: { stage: 'ack_commit' },
    });
    const succeeded = await runner.runOneBatch();
    expect(succeeded.state).toMatchObject({ attemptEpoch: 6, phase: { tag: 'idle' } });
    expect(succeeded.confirmations).toHaveLength(1);
  });

  test.each([
    ['load', makePorts({ load: async () => ({}) }), 'sync_outbox_invalid'],
    ['dispatch', makePorts({ dispatch: async () => ({ outcome: 'accepted' }) }),
      'sync_receipt_invalid'],
    ['ack', makePorts({ ackCommit: async () => ({}) }), 'sync_ack_commit_invalid'],
  ] as const)('maps malformed %s responses to finite attention', async (_stage, ports, code) => {
    const runner = createAccountSyncRunner('uid/a-юзер', fenceA, 1, ports, () => true);
    const result = await runner.runOneBatch();
    expect(result.failure).toBeNull();
    expect(result.confirmations).toEqual([]);
    expect(result.state.phase).toMatchObject({ tag: 'sync_attention', code });
  });

  test('maps a thrown dispatch transport failure without acknowledging or erasing', async () => {
    let ackCalls = 0;
    const runner = createAccountSyncRunner('uid/a-юзер', fenceA, 4, makePorts({
      load: async () => ({ batchId: 'batch-1', operations: [ownedOperation()], pendingCount: 4 }),
      dispatch: () => { throw new Error('private transport detail'); },
      ackCommit: async () => {
        ackCalls += 1;
        return {};
      },
    }), () => true);
    const result = await runner.runOneBatch();
    expect(result.failure).toBeNull();
    expect(result.state).toMatchObject({
      pendingCount: 4,
      phase: { tag: 'sync_attention', code: 'sync_dispatch_failed', retry: { stage: 'dispatch' } },
    });
    expect(ackCalls).toBe(0);
    expect(result.confirmations).toEqual([]);
  });

  test('does not invoke response getters and reports malformed content', async () => {
    let getterCalls = 0;
    const response = Object.defineProperty({}, 'operations', {
      enumerable: true,
      get() { getterCalls += 1; throw new Error('private getter'); },
    });
    const runner = createAccountSyncRunner('uid/a-юзер', fenceA, 1,
      makePorts({ load: async () => response }), () => true);
    const result = await runner.runOneBatch();
    expect(getterCalls).toBe(0);
    expect(result.state.phase).toMatchObject({
      tag: 'sync_attention', code: 'sync_outbox_invalid',
    });
  });

  test('confirms only the exact committed operation order', async () => {
    const runner = createAccountSyncRunner('uid/a-юзер', fenceA, 1, makePorts({
      ackCommit: async () => ({
        committedOperationIds: ['wrong-operation'], remainingPendingCountObserved: 0,
      }),
    }), () => true);
    const result = await runner.runOneBatch();
    expect(result.confirmations).toEqual([]);
    expect(result.state.phase).toMatchObject({
      tag: 'sync_attention', code: 'sync_ack_commit_invalid', retry: { stage: 'ack_commit' },
    });
  });
});

describe('account sync runner v2 concurrency, fence and invalidation', () => {
  test('captures port functions once without invoking getter-bearing ports', async () => {
    let originalLoadCalls = 0;
    let replacementGetterCalls = 0;
    const ports = makePorts({
      load: async () => {
        originalLoadCalls += 1;
        return { batchId: 'batch-1', operations: [ownedOperation()], pendingCount: 1 };
      },
    });
    const runner = createAccountSyncRunner('uid/a-юзер', fenceA, 1, ports, () => true);
    Object.defineProperty(ports, 'load', {
      enumerable: true,
      configurable: true,
      get() { replacementGetterCalls += 1; throw new Error('must not be read'); },
    });
    await runner.runOneBatch();
    expect(originalLoadCalls).toBe(1);
    expect(replacementGetterCalls).toBe(0);

    let constructorGetterCalls = 0;
    const getterPorts = Object.defineProperties({}, {
      load: { enumerable: true, get() { constructorGetterCalls += 1; return async () => ({}); } },
      dispatch: { enumerable: true, value: async () => ({}) },
      ackCommit: { enumerable: true, value: async () => ({}) },
    });
    expect(() => createAccountSyncRunner(
      'uid/a-юзер', fenceA, 1, getterPorts as AccountSyncRunnerPorts, () => true,
    )).toThrow('account_sync_invalid_input');
    expect(constructorGetterCalls).toBe(0);
  });

  test('coalesces concurrent and synchronous reentrant runs to one installed promise', async () => {
    const loadResult = deferred<unknown>();
    let nested: Promise<unknown> | undefined;
    let loadCalls = 0;
    let runner!: ReturnType<typeof createAccountSyncRunner>;
    const ports = makePorts({
      load: () => {
        loadCalls += 1;
        nested = runner.runOneBatch();
        return loadResult.promise;
      },
    });
    runner = createAccountSyncRunner('uid/a-юзер', fenceA, 1, ports, () => true);
    const first = runner.runOneBatch();
    const duplicate = runner.runOneBatch();
    expect(duplicate).toBe(first);
    expect(nested).toBe(first);
    expect(loadCalls).toBe(1);
    loadResult.resolve({ batchId: 'batch-1', operations: [ownedOperation()], pendingCount: 1 });
    await first;
  });

  test.each(['load', 'dispatch', 'ack'] as const)(
    'synchronously invalidates during a never-settling %s port',
    async (stage) => {
      const never = new Promise<never>(() => undefined);
      const stageStarted = deferred<void>();
      let dispatchCalls = 0;
      let ackCalls = 0;
      const runner = createAccountSyncRunner('uid/a-юзер', fenceA, 1, makePorts({
        load: () => {
          if (stage === 'load') {
            stageStarted.resolve(undefined);
            return never;
          }
          return Promise.resolve({
            batchId: 'batch-1', operations: [ownedOperation()], pendingCount: 1,
          });
        },
        dispatch: () => {
          dispatchCalls += 1;
          if (stage === 'dispatch') {
            stageStarted.resolve(undefined);
            return never;
          }
          return Promise.resolve({ outcome: 'accepted', receipts: [receipt()] });
        },
        ackCommit: () => {
          ackCalls += 1;
          if (stage === 'ack') {
            stageStarted.resolve(undefined);
            return never;
          }
          return Promise.resolve({
            committedOperationIds: ['operation-1'], remainingPendingCountObserved: 0,
          });
        },
      }), () => true);
      const running = runner.runOneBatch();
      await stageStarted.promise;
      runner.invalidate();
      expect(runner.getState().phase).toEqual({ tag: 'stopped' });
      const result = await running;
      expect(result.state.phase).toEqual({ tag: 'stopped' });
      expect(result.confirmations).toEqual([]);
      if (stage === 'load') expect(dispatchCalls).toBe(0);
      if (stage !== 'ack') expect(ackCalls).toBe(0);
    },
  );

  test('observes and ignores a late rejection after invalidation', async () => {
    const late = deferred<unknown>();
    const runner = createAccountSyncRunner('uid/a-юзер', fenceA, 1,
      makePorts({ load: () => late.promise }), () => true);
    const running = runner.runOneBatch();
    runner.invalidate();
    await expect(running).resolves.toMatchObject({ state: { phase: { tag: 'stopped' } } });
    late.reject(new Error('private late rejection'));
    await Promise.resolve();
    await Promise.resolve();
    expect(runner.getState().phase).toEqual({ tag: 'stopped' });
  });

  test('cannot resurrect after response descriptor capture reentrantly invalidates', async () => {
    let dispatchCalls = 0;
    let runner!: ReturnType<typeof createAccountSyncRunner>;
    const responseTarget = {
      batchId: 'batch-1', operations: [ownedOperation()], pendingCount: 1,
    };
    const response = new Proxy(responseTarget, {
      getOwnPropertyDescriptor(target, key) {
        if (key === 'operations') runner.invalidate();
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    runner = createAccountSyncRunner('uid/a-юзер', fenceA, 1, makePorts({
      load: async () => response,
      dispatch: async () => {
        dispatchCalls += 1;
        return { outcome: 'accepted', receipts: [receipt()] };
      },
    }), () => true);
    const result = await runner.runOneBatch();
    expect(result.state.phase).toEqual({ tag: 'stopped' });
    expect(result.confirmations).toEqual([]);
    expect(dispatchCalls).toBe(0);
  });

  test('cannot publish a parsed batch after a nested payload trap invalidates', async () => {
    let dispatchCalls = 0;
    let runner!: ReturnType<typeof createAccountSyncRunner>;
    const payload = new Proxy({ value: true }, {
      getPrototypeOf(target) {
        runner.invalidate();
        return Reflect.getPrototypeOf(target);
      },
    });
    runner = createAccountSyncRunner('uid/a-юзер', fenceA, 1, makePorts({
      load: async () => ({
        batchId: 'batch-1',
        operations: [{ ...ownedOperation(), operation: {
          ...ownedOperation().operation, payload,
        } }],
        pendingCount: 1,
      }),
      dispatch: async () => {
        dispatchCalls += 1;
        return { outcome: 'accepted', receipts: [receipt()] };
      },
    }), () => true);
    const result = await runner.runOneBatch();
    expect(result.state.phase).toEqual({ tag: 'stopped' });
    expect(result.confirmations).toEqual([]);
    expect(dispatchCalls).toBe(0);
  });

  test('drops a queued confirmation when ACK descriptor capture schedules invalidation', async () => {
    let runner!: ReturnType<typeof createAccountSyncRunner>;
    const ackTarget = {
      committedOperationIds: ['operation-1'], remainingPendingCountObserved: 0,
    };
    const ackResponse = new Proxy(ackTarget, {
      getOwnPropertyDescriptor(target, key) {
        if (key === 'committedOperationIds') queueMicrotask(() => runner.invalidate());
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    runner = createAccountSyncRunner('uid/a-юзер', fenceA, 1,
      makePorts({ ackCommit: async () => ackResponse }), () => true);
    const result = await runner.runOneBatch();
    expect(result.state.phase).toEqual({ tag: 'stopped' });
    expect(result.confirmations).toEqual([]);
    expect(runner.getState()).toBe(result.state);
  });

  test('drops final confirmation when the full fence changes before publication', async () => {
    let currentFence: SessionFence = fenceA;
    const nextFence = Object.freeze({ ...fenceA, generation: 2, nonce: 'nonce-b' });
    const ackTarget = {
      committedOperationIds: ['operation-1'], remainingPendingCountObserved: 0,
    };
    const ackResponse = new Proxy(ackTarget, {
      getOwnPropertyDescriptor(target, key) {
        if (key === 'committedOperationIds') queueMicrotask(() => { currentFence = nextFence; });
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    const runner = createAccountSyncRunner('uid/a-юзер', fenceA, 1,
      makePorts({ ackCommit: async () => ackResponse }),
      (expectedFence) => sameSessionFence(currentFence, expectedFence));
    const result = await runner.runOneBatch();
    expect(result.state.phase).toEqual({ tag: 'stopped' });
    expect(result.confirmations).toEqual([]);
  });

  test('keeps the same flight installed during a reentrant final fence guard', async () => {
    let runner!: ReturnType<typeof createAccountSyncRunner>;
    let reentrant: Promise<unknown> | undefined;
    let atFinalPublication = false;
    let finalBranchRuns = 0;
    const ackTarget = {
      committedOperationIds: ['operation-1'], remainingPendingCountObserved: 0,
    };
    const ackResponse = new Proxy(ackTarget, {
      getOwnPropertyDescriptor(target, key) {
        if (key === 'committedOperationIds') {
          queueMicrotask(() => { atFinalPublication = true; });
        }
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    runner = createAccountSyncRunner('uid/a-юзер', fenceA, 1,
      makePorts({ ackCommit: async () => ackResponse }), () => {
      if (atFinalPublication) {
        finalBranchRuns += 1;
        reentrant = runner.runOneBatch();
      }
      return true;
    });
    const running = runner.runOneBatch();
    const result = await running;
    expect(finalBranchRuns).toBe(1);
    expect(reentrant).toBe(running);
    expect(result.confirmations).toHaveLength(1);
  });

  test('stops when the same UID has a newer full session fence', async () => {
    const loaded = deferred<unknown>();
    let currentFence: SessionFence = fenceA;
    let dispatchCalls = 0;
    const runner = createAccountSyncRunner('uid/a-юзер', fenceA, 1, makePorts({
      load: () => loaded.promise,
      dispatch: async () => {
        dispatchCalls += 1;
        return { outcome: 'accepted', receipts: [receipt()] };
      },
    }), (expectedFence) => sameSessionFence(currentFence, expectedFence));
    const running = runner.runOneBatch();
    loaded.resolve({ batchId: 'batch-1', operations: [ownedOperation()], pendingCount: 1 });
    currentFence = Object.freeze({ ...fenceA, generation: 2, nonce: 'nonce-b' });
    const result = await running;
    expect(result.state.phase).toEqual({ tag: 'stopped' });
    expect(dispatchCalls).toBe(0);
  });

  test('treats a throwing or non-true current-fence check as stopped', async () => {
    for (const isCurrent of [() => false, () => { throw new Error('private fence failure'); }]) {
      let loadCalls = 0;
      const runner = createAccountSyncRunner('uid/a-юзер', fenceA, 1, makePorts({
        load: async () => { loadCalls += 1; return {}; },
      }), isCurrent);
      const result = await runner.runOneBatch();
      expect(result.state.phase).toEqual({ tag: 'stopped' });
      expect(loadCalls).toBe(0);
      expect(result.failure).toBeNull();
    }
  });
});
