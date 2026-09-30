import type { AccountScope } from '../account_session';
import {
  AccountScopeStoreError,
  type AccountScopeTransaction,
  type ScopeJson,
  type ScopeEraseEvidence,
  type ScopeRecord,
  type ScopeStorageAdapter,
  type ScopeStorageConnection,
} from '../account_scope_store';

type HoldPhase = 'open' | 'read' | 'before_publish' | 'close' | 'erase';
type FailurePhase = 'open' | 'read' | 'transaction' | 'close' | 'erase';

type HoldControl = {
  readonly entered: Promise<void>;
  readonly wait: Promise<void>;
  enter(): void;
  release(): void;
};

function cloneJson(value: ScopeJson): ScopeJson {
  if (Array.isArray(value)) return value.map((entry) => cloneJson(entry));
  if (typeof value === 'object' && value !== null) {
    const result: { [key: string]: ScopeJson } = {};
    for (const [key, child] of Object.entries(value)) {
      Object.defineProperty(result, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: cloneJson(child),
      });
    }
    return result;
  }
  return value;
}

function cloneRecord(record: ScopeRecord): ScopeRecord {
  return { key: record.key, value: cloneJson(record.value) };
}

export class MemoryScopeStorageAdapter implements ScopeStorageAdapter {
  private readonly scopeMaps = new Map<AccountScope['scopeKey'], Map<string, ScopeRecord>>();
  private readonly transactionTails = new Map<AccountScope['scopeKey'], Promise<void>>();
  private readonly holds = new Map<HoldPhase, HoldControl[]>();
  private readonly failures = new Map<string, string[]>();
  private readonly mutableOpenCalls: AccountScope['scopeKey'][] = [];
  private readonly mutableEraseCalls: `account:${string}`[] = [];
  private readonly mutableCloseCalls: AccountScope['scopeKey'][] = [];

  get openCalls(): readonly AccountScope['scopeKey'][] {
    return Object.freeze([...this.mutableOpenCalls]);
  }

  get eraseCalls(): readonly `account:${string}`[] {
    return Object.freeze([...this.mutableEraseCalls]);
  }

  get closeCalls(): readonly AccountScope['scopeKey'][] {
    return Object.freeze([...this.mutableCloseCalls]);
  }

  holdNext(phase: HoldPhase): Readonly<{ entered: Promise<void>; release(): void }> {
    let enter!: () => void;
    let release!: () => void;
    const entered = new Promise<void>((resolve) => { enter = resolve; });
    const wait = new Promise<void>((resolve) => { release = resolve; });
    const control: HoldControl = { entered, wait, enter, release };
    const queue = this.holds.get(phase) ?? [];
    queue.push(control);
    this.holds.set(phase, queue);
    return Object.freeze({ entered, release });
  }

  failNext(
    phase: FailurePhase,
    scopeKey: AccountScope['scopeKey'],
    code: string,
  ): void {
    const key = `${phase}:${scopeKey}`;
    const queue = this.failures.get(key) ?? [];
    queue.push(code);
    this.failures.set(key, queue);
  }

  private async pause(phase: HoldPhase): Promise<void> {
    const queue = this.holds.get(phase);
    const control = queue?.shift();
    if (!control) return;
    if (queue?.length === 0) this.holds.delete(phase);
    control.enter();
    await control.wait;
  }

  private takeFailure(phase: FailurePhase, scopeKey: AccountScope['scopeKey']): string | null {
    const key = `${phase}:${scopeKey}`;
    const queue = this.failures.get(key);
    const code = queue?.shift() ?? null;
    if (queue?.length === 0) this.failures.delete(key);
    return code;
  }

  private throwFailure(phase: FailurePhase, scopeKey: AccountScope['scopeKey']): void {
    const code = this.takeFailure(phase, scopeKey);
    if (code !== null) throw new Error(code);
  }

  async open(scope: AccountScope): Promise<ScopeStorageConnection> {
    const scopeKey = scope.scopeKey;
    this.mutableOpenCalls.push(scopeKey);
    await this.pause('open');
    this.throwFailure('open', scopeKey);
    let closed = false;
    let revoked = false;
    const assertReadable = (): void => {
      if (revoked) throw new Error('connection_revoked');
      if (closed) throw new Error('connection_closed');
    };
    return {
      readRecord: async (key): Promise<ScopeRecord | null> => {
        assertReadable();
        await this.pause('read');
        assertReadable();
        this.throwFailure('read', scopeKey);
        const record = this.scopeMaps.get(scopeKey)?.get(key) ?? null;
        return record ? cloneRecord(record) : null;
      },
      withGuardedTransaction: async (work, mayPublishNow): Promise<void> => {
        assertReadable();
        const prior = this.transactionTails.get(scopeKey) ?? Promise.resolve();
        let releaseQueue!: () => void;
        const queueGate = new Promise<void>((resolve) => { releaseQueue = resolve; });
        const tail = prior.then(() => queueGate);
        this.transactionTails.set(scopeKey, tail);
        await prior;
        try {
          assertReadable();
          const stagedMap = new Map<string, ScopeRecord>();
          for (const [key, record] of this.scopeMaps.get(scopeKey) ?? []) {
            stagedMap.set(key, cloneRecord(record));
          }
          let active = true;
          const assertActive = (): void => {
            if (!active) throw new AccountScopeStoreError('account_scope_transaction_closed');
            assertReadable();
          };
          const transaction: AccountScopeTransaction = {
            async readRecord(key): Promise<ScopeRecord | null> {
              assertActive();
              const record = stagedMap.get(key) ?? null;
              return record ? cloneRecord(record) : null;
            },
            async putRecord(record): Promise<void> {
              assertActive();
              stagedMap.set(record.key, cloneRecord(record));
            },
            async deleteRecord(key): Promise<void> {
              assertActive();
              stagedMap.delete(key);
            },
          };
          try {
            await work(transaction);
          } finally {
            active = false;
          }
          await this.pause('before_publish');
          assertReadable();
          this.throwFailure('transaction', scopeKey);
          if (!mayPublishNow()) throw new AccountScopeStoreError('account_scope_stale');
          assertReadable();
          this.scopeMaps.set(scopeKey, stagedMap);
        } finally {
          releaseQueue();
          if (this.transactionTails.get(scopeKey) === tail) {
            void tail.then(() => {
              if (this.transactionTails.get(scopeKey) === tail) this.transactionTails.delete(scopeKey);
            });
          }
        }
      },
      revoke(): undefined {
        revoked = true;
        return undefined;
      },
      close: async (): Promise<void> => {
        this.mutableCloseCalls.push(scopeKey);
        await this.pause('close');
        this.throwFailure('close', scopeKey);
        closed = true;
      },
    };
  }

  async eraseClosedAccountScope(
    scope: Extract<AccountScope, { kind: 'account' }>,
  ): Promise<ScopeEraseEvidence> {
    const scopeKey = scope.scopeKey;
    this.mutableEraseCalls.push(scopeKey);
    await this.pause('erase');
    this.throwFailure('erase', scopeKey);
    const records = this.scopeMaps.get(scopeKey);
    const erasedRecordCount = records?.size ?? 0;
    const outcome = records ? 'erased' : 'already_absent';
    this.scopeMaps.delete(scopeKey);
    return Object.freeze({
      scopeKey,
      outcome,
      evidenceKind: 'memory_reference_only',
      erasedRecordCount,
      manifestVersion: null,
    });
  }

  snapshot(scopeKey: AccountScope['scopeKey']): readonly ScopeRecord[] {
    const records = [...(this.scopeMaps.get(scopeKey)?.values() ?? [])]
      .map((record) => Object.freeze(cloneRecord(record)))
      .sort((left, right) => left.key.localeCompare(right.key));
    return Object.freeze(records);
  }
}
