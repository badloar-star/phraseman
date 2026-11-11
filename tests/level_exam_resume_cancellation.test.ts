import fs from 'fs';
import { resolve } from 'path';
import ts from 'typescript';

const SOURCE_PATH = resolve(__dirname, '../components/level-exam/LevelExamV2.tsx');

type ProbeState = {
  phase: string;
  blueprint: unknown;
  attempt: unknown;
};

type ProbeEnvironment = Record<string, unknown>;

function extractRestoreAsyncCallback(): string {
  const sourceText = fs.readFileSync(SOURCE_PATH, 'utf8');
  const sourceFile = ts.createSourceFile(
    SOURCE_PATH,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let callback: string | null = null;
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)
      && node.expression.getText(sourceFile) === 'useEffect'
      && node.getText(sourceFile).includes('loadActiveLevelExamAttempt')) {
      const outer = node.arguments[0];
      if (outer && ts.isArrowFunction(outer)) {
        const findInner = (candidate: ts.Node): void => {
          if (callback) return;
          if (ts.isArrowFunction(candidate)
            && candidate !== outer
            && candidate.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword)) {
            callback = candidate.getText(sourceFile);
            return;
          }
          ts.forEachChild(candidate, findInner);
        };
        findInner(outer);
      }
    }
    if (!callback) ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (!callback) throw new Error('level_exam_restore_async_callback_not_found');
  return callback;
}

function compileEffectStart(callbackSource: string) {
  const wrapper = `
    export function start(env: any) {
      const {
        getCanonicalUserId, noteSwallowedAs, setOwnerStableUid, setIdentityUnavailable,
        AsyncStorage, levelExamKey, setBestScore, loadActiveLevelExamAttempt, level,
        examSourceLocale, restoreLevelExamAttempt, clearActiveLevelExamAttempt,
        buildLevelExamBlueprint, trackFeatureError, setContentUnavailable,
        levelExamAttemptMatchesBlueprintIdentity, persistActiveLevelExamAttempt,
        noteSwallowedHandler, blueprintRef, attemptRef, setBlueprint, setAttempt,
        setRemainingMs, remainingLevelExamMs, setPhase, finishExam,
      } = env;
      let cancelled = false;
      const promise = (${callbackSource})();
      return { promise, cancel: () => { cancelled = true; } };
    }
  `;
  const js = ts.transpileModule(wrapper, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} as { start?: (env: ProbeEnvironment) => { promise: Promise<void>; cancel: () => void } } };
  new Function('module', 'exports', js)(module, module.exports);
  if (!module.exports.start) throw new Error('level_exam_restore_probe_compile_failed');
  return module.exports.start;
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve = (): void => undefined;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function createHarness() {
  const state: ProbeState = { phase: 'loading', blueprint: null, attempt: null };
  const blueprintRef = { current: null as unknown };
  const attemptRef = { current: null as unknown };
  const base: ProbeEnvironment = {
    getCanonicalUserId: async () => 'owner-a',
    noteSwallowedAs: () => () => null,
    noteSwallowedHandler: () => () => undefined,
    setOwnerStableUid: () => undefined,
    setIdentityUnavailable: () => undefined,
    AsyncStorage: { getItem: async () => null },
    levelExamKey: () => 'best-key',
    setBestScore: () => undefined,
    examSourceLocale: 'ru',
    clearActiveLevelExamAttempt: async () => undefined,
    trackFeatureError: () => undefined,
    setContentUnavailable: () => undefined,
    levelExamAttemptMatchesBlueprintIdentity: () => true,
    blueprintRef,
    attemptRef,
    setBlueprint: (value: unknown) => { state.blueprint = value; },
    setAttempt: (value: unknown) => { state.attempt = value; },
    setRemainingMs: () => undefined,
    remainingLevelExamMs: () => 100,
    setPhase: (value: string) => { state.phase = value; },
    finishExam: () => undefined,
  };
  return { state, blueprintRef, attemptRef, base };
}

describe('level exam restore effect cancellation source probe', () => {
  test('late A1 resume persistence cannot overwrite the completed A2 effect or enable cached A1 scoring', async () => {
    const start = compileEffectStart(extractRestoreAsyncCallback());
    const delayedPersist = deferred();
    const persistStarted = deferred();
    const { state, blueprintRef, attemptRef, base } = createHarness();
    const progressWrites: { level: string; blueprint: unknown; attempt: unknown }[] = [];
    const a1Attempt = { seed: 'a1', blueprintVersion: 4, status: 'active' };
    const a1Blueprint = { marker: 'A1' };

    const a1 = start({
      ...base,
      level: 'A1',
      loadActiveLevelExamAttempt: async () => a1Attempt,
      restoreLevelExamAttempt: () => ({ kind: 'resume', attempt: a1Attempt }),
      buildLevelExamBlueprint: () => a1Blueprint,
      persistActiveLevelExamAttempt: () => {
        persistStarted.resolve();
        return delayedPersist.promise;
      },
    });
    await persistStarted.promise;
    a1.cancel();

    const a2 = start({
      ...base,
      level: 'A2',
      loadActiveLevelExamAttempt: async () => null,
      restoreLevelExamAttempt: () => { throw new Error('not reached'); },
      buildLevelExamBlueprint: () => { throw new Error('not reached'); },
      persistActiveLevelExamAttempt: async () => undefined,
    });
    await a2.promise;
    expect(state.phase).toBe('intro');

    delayedPersist.resolve();
    await a1.promise;

    // Source-bound effect probe plus a deterministic cached-submit sentinel;
    // this intentionally does not claim to be a full RNTL or native lifecycle run.
    if (state.phase === 'quiz' && attemptRef.current === a1Attempt) {
      progressWrites.push({ level: 'A2', blueprint: blueprintRef.current, attempt: attemptRef.current });
    }
    expect(state).toEqual({ phase: 'intro', blueprint: null, attempt: null });
    expect(blueprintRef.current).toBeNull();
    expect(attemptRef.current).toBeNull();
    expect(progressWrites).toEqual([]);
  });

  test('an uncancelled normal resume still commits its restored blueprint and attempt', async () => {
    const start = compileEffectStart(extractRestoreAsyncCallback());
    const { state, blueprintRef, attemptRef, base } = createHarness();
    const attempt = { seed: 'a1', blueprintVersion: 4, status: 'active' };
    const blueprint = { marker: 'A1' };
    const run = start({
      ...base,
      level: 'A1',
      loadActiveLevelExamAttempt: async () => attempt,
      restoreLevelExamAttempt: () => ({ kind: 'resume', attempt }),
      buildLevelExamBlueprint: () => blueprint,
      persistActiveLevelExamAttempt: async () => undefined,
    });

    await run.promise;

    expect(state).toEqual({ phase: 'quiz', blueprint, attempt });
    expect(blueprintRef.current).toBe(blueprint);
    expect(attemptRef.current).toBe(attempt);
  });
});
