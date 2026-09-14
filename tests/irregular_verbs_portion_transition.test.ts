import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const source = fs.readFileSync(path.join(__dirname, '../app/lesson_irregular_verbs.tsx'), 'utf8');
const file = ts.createSourceFile('screen.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

// Run the actual screen callback with controlled async boundaries, without native UI dependencies.
function transition(scope: Record<string, unknown>): (restart?: boolean) => Promise<void> {
  let callback = '';
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'continuePortion'
      && node.initializer && ts.isCallExpression(node.initializer)) {
      callback = node.initializer.arguments[0].getText(file);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  expect(callback).not.toBe('');
  return new Function(...Object.keys(scope), `return (${callback});`)(...Object.values(scope));
}

function fixture() {
  const next = [{ base: 'go' }, { base: 'take' }];
  return {
    allDone: true,
    sectionProgress: { next },
    practiceRunes: { hydrating: false, startNewCompletionIfSettled: jest.fn(() => true) },
    continuationInFlightRef: { current: false },
    mountedRef: { current: true },
    setContinuing: jest.fn(), setContinuationFailed: jest.fn(),
    settlePortion: jest.fn(async () => {}),
    setPortionVerbs: jest.fn(), setQueue: jest.fn(), setPos: jest.fn(),
    setLearnedCnt: jest.fn(), setTotalPts: jest.fn(), setLearnedBurst: jest.fn(),
    setAllDone: jest.fn(), initVerb: jest.fn(), onReset: jest.fn(),
  };
}

test('double tap waits for settlement and advances the paid screen exactly once', async () => {
  const scope = fixture();
  let finish!: () => void;
  scope.settlePortion.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  const run = transition(scope);
  const pending = run();
  await run();
  expect(scope.setQueue).not.toHaveBeenCalled();
  finish();
  await pending;
  expect(scope.setQueue).toHaveBeenCalledTimes(1);
  expect(scope.setQueue).toHaveBeenCalledWith(scope.sectionProgress.next);
  expect(scope.setPortionVerbs).toHaveBeenCalledWith(scope.sectionProgress.next);
  expect(scope.initVerb).toHaveBeenCalledWith(scope.sectionProgress.next[0]);
  expect(scope.setAllDone).toHaveBeenCalledWith(false);
  expect(scope.onReset).not.toHaveBeenCalled();
});

test('failed local settlement preserves the portion and permits a successful retry', async () => {
  const scope = fixture();
  scope.practiceRunes.startNewCompletionIfSettled.mockReturnValueOnce(false);
  const run = transition(scope);
  await run();
  expect(scope.setQueue).not.toHaveBeenCalled();
  expect(scope.setContinuationFailed).toHaveBeenLastCalledWith(true);
  await run();
  expect(scope.setQueue).toHaveBeenCalledTimes(1);
});

test('Start over also waits and never remounts with unsettled runes', async () => {
  const scope = fixture();
  const run = transition(scope);
  scope.settlePortion.mockRejectedValueOnce(new Error('storage unavailable'));
  await run(true);
  expect(scope.onReset).not.toHaveBeenCalled();
  await run(true);
  expect(scope.onReset).toHaveBeenCalledTimes(1);
  expect(scope.setQueue).not.toHaveBeenCalled();
});

test('leaving during settlement does not start another completion', async () => {
  const scope = fixture();
  scope.settlePortion.mockImplementationOnce(async () => { scope.mountedRef.current = false; });
  await transition(scope)();
  expect(scope.practiceRunes.startNewCompletionIfSettled).not.toHaveBeenCalled();
  expect(scope.setQueue).not.toHaveBeenCalled();
});

test('screen waits for progress hydration and displays a captured portion denominator', () => {
  expect(source).toContain('hydratedCountsKey !== irregularStorageKey');
  expect(source).toContain('${learnedCnt} / ${portionVerbs.length}');
  expect(source).not.toContain('${learnedCnt} / ${verbs.length}');
  expect(source).toContain('if (!allDone || !sectionProgress.complete) return;');
  expect(source).toContain('if (!allDone || !sectionProgress.complete || learnedCnt === 0) return;');
});
