import fs from 'fs';
import path from 'path';

const read = (relativePath: string): string =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

const between = (source: string, start: string, end: string): string => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
};

describe('rapid presses across learning surfaces', () => {
  it('accepts each quiz answer once and scopes flash to the active question', () => {
    const source = read('app/(tabs)/quizzes.tsx');
    const answerFlow = between(source, 'const afterAnswer =', 'const handleChoice =');
    const handler = between(source, 'const handleChoice =', 'const handleTyped =');
    const tapHandler = between(source, 'const handleTap =', '  return (');
    const options = between(source, '{(current.choices || []).map(', '{/* Hard mode tip */}');

    expect(source).toContain('const questionTransitionRef = useRef(false)');
    expect(source).toContain('const activeQuestionIdentity = current?.questionId');
    expect(source).toContain('const activeQuestionKey = `${reviewing ? `review:${rIdx}` : `main:${idx}`}:${activeQuestionIdentity}`');
    expect(source).toContain('questionTransitionRef.current = false');
    expect(answerFlow).toContain('if (questionTransitionRef.current) return');
    expect(answerFlow).toContain('questionTransitionRef.current = true');
    expect(handler).toContain('handleChoice = (ci: number, optionKey: string)');
    expect(handler).toContain('if (answeredRef.current || chosen !== null) return');
    expect(handler).toContain('answeredRef.current = true');
    expect(handler).toContain('flash(optionKey)');
    expect(handler.indexOf('answeredRef.current = true')).toBeLessThan(handler.indexOf('flash(optionKey)'));
    expect(options).toContain('const optionKey = `${quizAttemptIdRef.current}:${activeQuestionKey}:${ci}:${ch}`');
    expect(options).toContain('key={optionKey}');
    expect(options).toContain('onPress={() => { handleChoice(ci, optionKey); }}');
    expect(options).not.toContain('flash(');
    expect(tapHandler).toContain('if (questionTransitionRef.current) return');
    expect(tapHandler).toContain('questionTransitionRef.current = true');
    expect(tapHandler).toContain('answeredRef.current = false');
  });

  it('locks level-exam scoring and energy spend synchronously', () => {
    const source = read('app/level_exam.tsx');
    const start = between(source, 'const startExam = useCallback', 'const { flashKey, flash }');
    const handler = between(source, 'const handlePick =', 'const goNext =');
    const nextHandler = between(source, 'const goNext =', 'const finishExam =');
    const options = between(source, '{(q.opts ?? []).map(', '{/* Кнопка Далее */}');

    expect(source).toContain('const examStartingRef = useRef(false)');
    expect(source).toContain('const answerLockedRef = useRef(false)');
    expect(source).toContain('const questionAdvanceRef = useRef(false)');
    expect(source).toContain("if ((phase === 'intro' || phase === 'result') && !examStarting) examStartingRef.current = false");
    expect(start).toContain('if (examStartingRef.current || examStarting) return');
    expect(start).toContain('examStartingRef.current = true');
    expect(start).toContain('let transitionedToExam = false');
    expect(start).toContain('transitionedToExam = true');
    expect(start).toContain('if (!transitionedToExam) examStartingRef.current = false');
    expect(handler).toContain('handlePick = (ci: number, optionKey: string)');
    expect(handler).toContain('if (answerLockedRef.current || chosen !== null) return');
    expect(handler).toContain('answerLockedRef.current = true');
    expect(handler).toContain('flash(optionKey)');
    expect(nextHandler).toContain('if (questionAdvanceRef.current) return');
    expect(nextHandler).toContain('questionAdvanceRef.current = true');
    expect(nextHandler.indexOf('questionAdvanceRef.current = true')).toBeLessThan(nextHandler.indexOf('setShowAnswer(false)'));
    expect(options).toContain('const optionKey = `${lvl}:${idx}:${q.lessonNum}:${ci}:${opt}`');
    expect(options).toContain('key={optionKey}');
    expect(options).not.toContain('flash(');
  });

  it('keeps final-exam answer changes intentional while preventing double start and stale flash', () => {
    const source = read('app/exam.tsx');
    const handler = between(source, 'const handleAnswer =', 'const toggleFlag =');
    const start = between(source, 'const startExam = async', 'const submitExam = async');
    const options = between(source, '{(q.opts ?? []).map(', '</BouncyScrollView>');

    expect(source).toContain('const examStartingRef = useRef(false)');
    expect(source).toContain("if ((phase === 'intro' || phase === 'result') && !examStarting) examStartingRef.current = false");
    expect(start).toContain('if (examStartingRef.current || examStarting) return');
    expect(start).toContain('examStartingRef.current = true');
    expect(start).toContain('let transitionedToExam = false');
    expect(start).toContain('transitionedToExam = true');
    expect(start).toContain('if (!transitionedToExam) examStartingRef.current = false');
    expect(handler).toContain('handleAnswer = (ci: number, optionKey: string)');
    expect(handler).toContain('flash(optionKey)');
    expect(handler).toContain('setChoices(prev =>');
    expect(handler).not.toContain('answerLockedRef');
    expect(options).toContain('const optionKey = `${examAttemptIdRef.current}:${idx}:${q.lessonNum}:${ci}:${opt}`');
    expect(options).toContain('key={optionKey}');
    expect(options).not.toContain('disabled=');
  });

  it('uses live tile ownership and a synchronous result lock in phrase trainer modes', () => {
    const source = read('app/trainer_phrases_session.tsx');
    const wordBank = between(source, 'function WordBankMode', '// ── Fill Gap');
    const fillGap = between(source, 'function FillGapMode', '// ── Основной экран');

    expect(wordBank).toContain('const selectedRef = useRef<WordBankTile[]>([])');
    expect(wordBank).toContain('const bankSlotsRef = useRef<Set<number> | null>(null)');
    expect(wordBank).toContain('bankSlotsRef.current = new Set(bank.map(tile => tile.slot))');
    expect(wordBank).toContain("const feedbackRef = useRef<'none' | 'correct' | 'wrong'>('none')");
    expect(wordBank).toContain('if (feedbackRef.current !== \'none\' || !liveBankSlots?.has(tile.slot)) return');
    expect(wordBank).toContain('const tileKey = `${item.key}:word-bank:${tile.slot}:${tile.text}`');
    expect(wordBank).not.toContain('flash(tileKey);\n                requestAnimationFrame');

    expect(fillGap).toContain("const feedbackRef = useRef<'none' | 'correct' | 'wrong'>('none')");
    expect(fillGap).toContain('pick = (opt: string, optionKey: string)');
    expect(fillGap).toContain("if (feedbackRef.current !== 'none') return");
    expect(fillGap).toContain('feedbackRef.current = isOk ? \'correct\' : \'wrong\'');
    expect(fillGap).toContain('const optionKey = `${item.key}:fill-gap:${opt}`');
  });

  it('starts only one word-trainer swipe animation per card', () => {
    const source = read('app/trainer_words_session.tsx');
    const card = between(source, 'function SwipeCard', '// ── Основной экран');

    expect(card).toContain('const swipeInProgressRef = useRef(false)');
    expect(card).toContain('if (!isTopRef.current || swipeInProgressRef.current) return');
    expect(card).toContain('swipeInProgressRef.current = true');
    expect(card.indexOf('swipeInProgressRef.current = true')).toBeLessThan(card.indexOf('hapticSuccess()'));
    expect(card).toContain('onStartShouldSetPanResponder: () => isTopRef.current && !swipeInProgressRef.current');
  });

  it('serializes personal-plan submissions and consumes listen-build tiles from live state', () => {
    const source = read('app/personal_plan_exercise.tsx');
    const submitBlock = between(source, 'const submit = async', '  return (');
    const buildOptions = between(source, '{item.wordOptions.map(', '{!lastResult ? (');
    const choiceOptions = between(source, '{choiceOptions.map(', '{lastResult ? <View');

    expect(source).toContain('const savingRef = useRef(false)');
    expect(source).toContain('const buildWordsRef = useRef<string[]>([])');
    expect(source).toContain('const advancingRef = useRef(false)');
    expect(source).toContain('const beginSaving = useCallback(() => {');
    expect((submitBlock.match(/if \(!beginSaving\(\)\) return;/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(submitBlock).toContain("const answer = buildWordsRef.current.join(' ')");
    expect(buildOptions).toContain('const optionKey = `${item.id}:listen-build:${wordIndex}:${word}`');
    expect(buildOptions).toContain('const liveBuildWords = buildWordsRef.current');
    expect(buildOptions).toContain('buildWordsRef.current = nextBuildWords');
    expect(buildOptions).toContain('flash(optionKey)');
    expect(choiceOptions).toContain('const optionKey = `${item.id}:choice:${optionIndex}:${option}`');
    expect(choiceOptions).toContain('showPressed={flashKey === optionKey}');
  });
});
