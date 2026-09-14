import fs from 'node:fs';
import path from 'node:path';

interface Scope {
  peek(): string | null;
  beginRead(): (raw: string) => void;
  close(): void;
}
interface Policy {
  createSettingsBootReadScope: (isCurrent: () => boolean) => Scope;
  beginSettingsStorageMutation: () => () => void;
}

describe('boot settings ready-result policy', () => {
  let policy: Policy;
  let generation: number;
  let scope: Scope;
  const raw = '{"speechRate":1.3,"voiceOut":false}';

  beforeEach(() => {
    jest.resetModules();
    const file = path.resolve(__dirname, '../lib/startup_settings_read_scope.ts');
    const loaded = fs.existsSync(file) ? require(file) : {};
    expect(typeof loaded.createSettingsBootReadScope).toBe('function');
    expect(typeof loaded.beginSettingsStorageMutation).toBe('function');
    policy = loaded as Policy;
    generation = 1;
    scope = policy.createSettingsBootReadScope(() => generation === 1);
  });

  test('reuses a completed result within the same unchanged boot', () => {
    expect(scope.peek()).toBeNull();
    scope.beginRead()(raw);
    expect(scope.peek()).toBe(raw);
  });

  test('does not expose unfinished work to another reader', () => {
    const finishFirst = scope.beginRead();
    expect(scope.peek()).toBeNull();
    const finishSecond = scope.beginRead();
    finishSecond(raw);
    expect(scope.peek()).toBe(raw);
    finishFirst(raw);
    expect(scope.peek()).toBe(raw);
  });

  test('a failed read does not prevent a fresh successful read', () => {
    scope.beginRead(); // Failure does not call the successful completion callback.
    expect(scope.peek()).toBeNull();
    scope.beginRead()(raw);
    expect(scope.peek()).toBe(raw);
  });

  test('invalidates before a settings write finishes', () => {
    scope.beginRead()(raw);
    const finishWrite = policy.beginSettingsStorageMutation();
    expect(scope.peek()).toBeNull();
    finishWrite();
    expect(scope.peek()).toBeNull();
  });

  test('does not remember a read spanning a completed write', () => {
    const finishRead = scope.beginRead();
    policy.beginSettingsStorageMutation()();
    finishRead(raw);
    expect(scope.peek()).toBeNull();
  });

  test('does not remember a read started during a pending write', () => {
    const finishWrite = policy.beginSettingsStorageMutation();
    const finishRead = scope.beginRead();
    finishWrite();
    finishRead(raw);
    expect(scope.peek()).toBeNull();
  });

  test('a scope opened during a write also cannot reuse that read', () => {
    const finishWrite = policy.beginSettingsStorageMutation();
    const newScope = policy.createSettingsBootReadScope(() => true);
    const finishRead = newScope.beginRead();
    finishWrite();
    finishRead(raw);
    expect(newScope.peek()).toBeNull();
  });

  test('tracks overlapping writers even when completion is repeated', () => {
    const finishFirst = policy.beginSettingsStorageMutation();
    const finishSecond = policy.beginSettingsStorageMutation();
    finishFirst();
    finishFirst();
    scope.beginRead()(raw);
    expect(scope.peek()).toBeNull();
    finishSecond();
    scope.beginRead()(raw);
    expect(scope.peek()).toBe(raw);
  });

  test('a failed write cannot revive a cached value', () => {
    scope.beginRead()(raw);
    const finishFailedWrite = policy.beginSettingsStorageMutation();
    try { throw new Error('disk full'); } catch { /* Existing caller handles failure. */ }
    finally { finishFailedWrite(); }
    expect(scope.peek()).toBeNull();
    scope.beginRead()(raw);
    expect(scope.peek()).toBe(raw);
  });

  test('does not reuse account A after B or a new generation of A', () => {
    scope.beginRead()(raw);
    generation = 2;
    expect(scope.peek()).toBeNull();
    generation = 3; // A again, but not the captured generation.
    expect(scope.peek()).toBeNull();
  });

  test('late completion of an old account does not seed a new scope', () => {
    const finishOld = scope.beginRead();
    generation = 2;
    const newScope = policy.createSettingsBootReadScope(() => generation === 2);
    finishOld(raw);
    expect(scope.peek()).toBeNull();
    expect(newScope.peek()).toBeNull();
  });

  test('closing drops completed and pending results', () => {
    scope.beginRead()(raw);
    const finishPending = scope.beginRead();
    scope.close();
    scope.close();
    finishPending(raw);
    scope.beginRead()(raw);
    expect(scope.peek()).toBeNull();
  });

  test('rejects results from a read begun without an active owner', () => {
    generation = 2;
    const finishRead = scope.beginRead();
    generation = 1;
    finishRead(raw);
    expect(scope.peek()).toBeNull();
  });

  test('retains only the latest eligible raw result, not a growing map', () => {
    scope.beginRead()(raw);
    const latest = '{"voiceOut":true}';
    scope.beginRead()(latest);
    expect(scope.peek()).toBe(latest);
  });
});
