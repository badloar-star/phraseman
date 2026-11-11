import fs from 'fs';
import ts from 'typescript';

function screenNode(screen: string, predicate: (node: ts.Node) => boolean): string {
  const file = ts.createSourceFile(`${screen}.tsx`, fs.readFileSync(`app/${screen}.tsx`, 'utf8'), ts.ScriptTarget.Latest, true);
  function find(node: ts.Node): ts.Node | undefined {
    return predicate(node) ? node : ts.forEachChild(node, find);
  }
  const node = find(file);
  if (!node) throw new Error(`Expected code in ${screen}`);
  return node.getText(file);
}

function compile<T>(code: string, scope: Record<string, unknown>): T {
  const js = ts.transpileModule(`return (${code});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(scope), js)(...Object.values(scope));
}

test('completed vocabulary opens with every word queued and keeps the learned counts', () => {
  const makeQueue = screenNode('lesson_words', node => ts.isFunctionDeclaration(node) && node.name?.text === 'makeTrainingQueueState');
  const initialQueue = screenNode('lesson_words', node => ts.isArrowFunction(node) && node.body.getText().startsWith('makeTrainingQueueState(words, initialLearned'));
  const words = [{ en: 'go' }, { en: 'take' }];
  const initialCounts = { go: 3, take: 3 };
  const build = compile<() => { queue: typeof words; counts: typeof initialCounts }>(initialQueue, {
    makeTrainingQueueState: compile(makeQueue, { REQUIRED: 3, buildQueueItem: (word: unknown) => word, shuffleNoConsecutive: (items: unknown[]) => items }),
    words, initialCounts, initialLearned: [], lang: 'en', devJumpToFinale: false,
  });
  expect(build()).toMatchObject({ queue: words, counts: initialCounts, learnedCnt: 2 });
  initialCounts.take = 0;
  expect(build()).toMatchObject({ queue: [words[1]], counts: initialCounts, learnedCnt: 1 });
});

test('verbs reopen with the whole lesson if no unfinished portion remains', () => {
  const code = screenNode('lesson_irregular_verbs', node => ts.isVariableDeclaration(node) && node.name.getText() === 'verbsForLearnTab');
  const allVerbs = [{ base: 'go' }, { base: 'take' }];
  const select = (activePortion: typeof allVerbs) => compile<() => typeof allVerbs>(`() => { const ${code}; return verbsForLearnTab; }`, {
    activePortion, allVerbs, practiceAll: false,
  })();
  expect(select([])).toEqual(allVerbs);
  expect(select([allVerbs[1]])).toEqual([allVerbs[1]]);
});

test('a correct vocabulary answer finishes a repeated word without rewriting its progress', () => {
  const advance = screenNode('lesson_words', node => ts.isArrowFunction(node) && /^\{\s*const newQueue = sanitizeTrainingQueue\(queueRef.current\);/.test(node.body.getText()));
  const current = { word: { en: 'go' } };
  const storedCounts = Object.freeze({ go: 3 });
  const applyTrainingCounts = jest.fn();
  const onCountUpdate = jest.fn();
  const setAllDone = jest.fn();
  const applyTrainingQueue = jest.fn();
  compile<() => void>(advance, {
    sanitizeTrainingQueue: (items: unknown[]) => [...items], clampQueueIndex: () => 0,
    queueRef: { current: [current, current] }, qIdxRef: { current: 0 },
    isTrainingCard: () => true, isRight: true, countsRef: { current: storedCounts },
    current, words: [current.word], wordEn: 'go', REQUIRED: 3, countLearnedWords: () => 1,
    applyTrainingCounts, onCountUpdate, applyTrainingQueue, setAllDone,
    applyLearnedCount: jest.fn(), setChosen: jest.fn(), locked: { current: true },
  })();
  expect(applyTrainingQueue).toHaveBeenCalledWith([], 0);
  expect(setAllDone).toHaveBeenCalledWith(true);
  expect(applyTrainingCounts).not.toHaveBeenCalled();
  expect(onCountUpdate).not.toHaveBeenCalled();
});

test('prepositions reopen at the first question with a fresh score and keep partial resumes', async () => {
  const hydrate = screenNode('preposition_drill', node => ts.isArrowFunction(node) && node.body.getText().includes('setProgressReadyForKey(null)') && node.body.getText().includes('AsyncStorage.getItem(progressKey)'));
  const items = [{ id: 'first' }, { id: 'second' }];
  const check = async (answeredIds: string[], expectedIndex: number, expectedCorrect: number) => {
    const setItemIdx = jest.fn();
    const setCorrectCount = jest.fn();
    let hydrated!: () => void;
    const ready = new Promise<void>(resolve => { hydrated = resolve; });
    compile<() => void>(hydrate, {
      pack: { items }, progressKey: 'progress', setItemIdx, setCorrectCount,
      setProgressReadyForKey: (key: string | null) => { if (key) hydrated(); },
      setReviewMode: jest.fn(), setSelected: jest.fn(), setIsCorrect: jest.fn(),
      setAnsweredIds: jest.fn(), setWrongIds: jest.fn(), setPracticeOnly: jest.fn(),
      noteSwallowedHandler: () => jest.fn(),
      AsyncStorage: { getItem: async () => JSON.stringify({ answeredIds, wrongIds: [] }) },
    })();
    await ready;
    expect(setItemIdx).toHaveBeenLastCalledWith(expectedIndex);
    expect(setCorrectCount).toHaveBeenLastCalledWith(expectedCorrect);
  };
  await check(['first', 'second'], 0, 0);
  await check(['first'], 1, 1);
});

test('preposition replay results do not overwrite the completed progress', () => {
  const code = screenNode('preposition_drill', node => ts.isVariableDeclaration(node) && node.name.getText() === 'saveProgress');
  const setItem = jest.fn(async () => {});
  const save = (practiceOnly: boolean) => compile<() => (answered: string[], wrong: string[]) => void>(
    `() => { const ${code}; return saveProgress; }`,
    { practiceOnly, progressKey: 'progress', AsyncStorage: { setItem }, noteSwallowedHandler: () => jest.fn() },
  )();
  save(true)(['first', 'second'], ['first']);
  expect(setItem).not.toHaveBeenCalled();
  save(false)(['first'], []);
  expect(setItem).toHaveBeenCalledWith('progress', JSON.stringify({ answeredIds: ['first'], wrongIds: [] }));
});
