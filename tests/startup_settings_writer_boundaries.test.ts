import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import vm from 'node:vm';
import type { SettingsBootReadScope } from '../lib/startup_settings_read_scope';

const ROOT = path.resolve(__dirname, '..');
function source(file: string): ts.SourceFile {
  return ts.createSourceFile(file, fs.readFileSync(path.join(ROOT, file), 'utf8'), ts.ScriptTarget.Latest, true);
}
function nodes(root: ts.Node, predicate: (node: ts.Node) => boolean): ts.Node[] {
  const found: ts.Node[] = [];
  function visit(node: ts.Node): void {
    if (predicate(node)) found.push(node);
    node.forEachChild(visit);
  }
  visit(root);
  return found;
}
function compile(code: string, context: Record<string, unknown>): (...args: unknown[]) => Promise<void> {
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  return vm.runInNewContext(`${js}\nexecute`, context);
}

describe('actual native-write boundaries invalidate settings boot reuse', () => {
  let scope: SettingsBootReadScope;
  let beginSettingsStorageMutation: () => () => void;
  const raw = '{"speechRate":1.3}';
  beforeEach(() => {
    jest.resetModules();
    const policy = require('../lib/startup_settings_read_scope');
    beginSettingsStorageMutation = policy.beginSettingsStorageMutation;
    scope = policy.createSettingsBootReadScope(() => true);
    scope.beginRead()(raw);
  });

  function storageContext(pairs: [string, string][], failure = false) {
    const values = new Map<string, string>();
    const AsyncStorage = {
      getItem: async () => null,
      multiGet: async (keys: string[]) => keys.map((key) => [key, values.get(key) ?? null]),
      multiSet: async (written: [string, string][]) => {
        expect(scope.peek()).toBeNull(); // Must invalidate before native dispatch.
        scope.beginRead()(raw);
        expect(scope.peek()).toBeNull(); // Native write is still pending here.
        expect(written).toEqual(pairs);
        if (failure) throw new Error('native write failed');
        written.forEach(([key, value]) => values.set(key, value));
      },
      multiRemove: async (keys: string[]) => {
        expect(scope.peek()).toBeNull();
        keys.forEach((key) => values.delete(key));
      },
      clear: async () => {
        expect(scope.peek()).toBeNull();
        if (failure) throw new Error('native write failed');
      },
    };
    return { AsyncStorage, beginSettingsStorageMutation };
  }

  test.each([[false, false], [true, false], [false, true], [true, true]])(
    'cloud restore covers personal-plan branch %s, native failure %s', async (withPlan, failure) => {
    const file = source('app/cloud_sync.ts');
    const fn = nodes(file, (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'applyPersonalPlanRestorePairs')[0];
    const pairs: [string, string][] = [['user_settings', raw]];
    if (withPlan) pairs.push(['personal_plan_state_v1', '{}']);
    const run = compile(`${fn.getText(file)}\nconst execute = applyPersonalPlanRestorePairs;`, {
      ...storageContext(pairs, failure),
      PERSONAL_PLAN_RESTORE_KEY_SET: new Set(['personal_plan_state_v1']),
      sanitizeStoragePairs: (value: unknown) => value,
      withPersonalPlanStateStorageLock: (task: () => Promise<void>) => task(),
      withPlanXpLedgerStorageLock: (task: () => Promise<void>) => task(),
      mergePersonalPlanRestoreValue: (_key: string, cloud: string) => cloud,
      invalidatePersonalPlanStateCache: () => {},
    });
    if (failure) await expect(run(pairs)).rejects.toThrow('native write failed');
    else await run(pairs);
    expect(scope.peek()).toBeNull();
    scope.beginRead()(raw);
    expect(scope.peek()).toBe(raw); // All write leases released.
  });

  test.each([[0, false], [1, false], [0, true], [1, true]] as const)(
    'emergency-backup batch %s, native failure %s preserves error/readback', async (index, failure) => {
    const file = source('app/account_switch_backup_restore.ts');
    const blocks = nodes(file, (node) => ts.isIfStatement(node) && node.expression.getText(file) === 'missing.length > 0');
    expect(blocks).toHaveLength(2);
    const missing: [string, string][] = [['user_settings', raw]];
    const context = storageContext(missing, failure);
    let readbacks = 0;
    const run = compile(`async function execute() { ${blocks[index].getText(file)} }`, {
      ...context, missing,
      multiGetExactly: async (keys: string[]) => { readbacks += 1; return context.AsyncStorage.multiGet(keys); },
    });
    if (failure) await expect(run()).rejects.toThrow('native write failed');
    else await run();
    expect(readbacks).toBe(failure ? 0 : 1);
    scope.beginRead()(raw);
    expect(scope.peek()).toBe(raw);
  });

  test('account wipe invalidates before deleting settings and preserves readback', async () => {
    const file = source('app/cloud_sync.ts');
    const variable = nodes(file, (node) => ts.isVariableDeclaration(node) && node.name.getText(file) === 'removeExactly')[0];
    const run = compile(`const ${variable.getText(file)}; const execute = removeExactly;`, {
      ...storageContext([]), KEEP: new Set(['app_theme']),
    });
    await run(['user_settings', 'app_theme']);
    scope.beginRead()(raw);
    expect(scope.peek()).toBe(raw);
  });

  test.each([0, 1])('account native clear boundary %s is fenced even if native clear fails', async (index) => {
    const file = source('app/auth_provider.ts');
    const calls = nodes(file, (node) => ts.isCallExpression(node) && node.expression.getText(file) === 'AsyncStorage.clear');
    expect(calls).toHaveLength(2);
    let block: ts.Node = calls[index];
    while (block.parent && !ts.isTryStatement(block)) block = block.parent;
    expect(ts.isTryStatement(block)).toBe(true);
    // This is also an admission guard: do not execute a whole auth flow in a unit test.
    expect(block.getText(file)).toContain('finishSettingsMutation');
    const siblings = (block.parent as ts.Block).statements;
    const indexInBlock = siblings.indexOf(block as ts.Statement);
    const begin = siblings[indexInBlock - 1].getText(file);
    expect(begin).toBe('const finishSettingsMutation = beginSettingsStorageMutation();');
    const run = compile(`async function execute() { let localExitVerified = true; ${begin} ${block.getText(file)} }`, {
      ...storageContext([], true), __DEV__: false,
    });
    await run().catch((error: Error) => expect(error.message).toBe('native write failed'));
    expect(scope.peek()).toBeNull();
    scope.beginRead()(raw);
    expect(scope.peek()).toBe(raw);
  });

  test('the policy has no storage/native/auth imports, scheduling or shared pending promises', () => {
    const policy = source('lib/startup_settings_read_scope.ts');
    expect(nodes(policy, ts.isImportDeclaration)).toHaveLength(0);
    expect(policy.text).not.toMatch(/\b(?:setTimeout|setInterval|queueMicrotask|Promise|async|await)\b/);
  });

  test('all cloud and backup native batch writes remain within the audited boundaries', () => {
    for (const fileName of ['app/cloud_sync.ts', 'app/account_switch_backup_restore.ts']) {
      const file = source(fileName);
      const writes = nodes(file, (node) => ts.isCallExpression(node) && node.expression.getText(file) === 'AsyncStorage.multiSet');
      expect(writes).toHaveLength(2);
      for (const write of writes) {
        let boundary: ts.Node = write;
        while (boundary.parent && !ts.isTryStatement(boundary)) boundary = boundary.parent;
        expect(boundary.getText(file)).toContain('finishSettingsMutation');
      }
    }
    const lesson = source('app/lesson1.tsx');
    // This file still reads the raw settings key; it must not silently become a writer.
    const writes = nodes(lesson, (node) => ts.isCallExpression(node)
      && /^AsyncStorage\.(setItem|removeItem|mergeItem)$/.test(node.expression.getText(lesson))
      && node.arguments[0]?.getText(lesson) === 'SETTINGS_KEY');
    expect(writes).toHaveLength(0);
  });
});
