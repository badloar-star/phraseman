import fs from 'fs';
import path from 'path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('exam energy charge timing 3A', () => {
  it('charges the current level exam only when countdown opens the first question', () => {
    const source = read('components/level-exam/LevelExamV2.tsx');
    const start = source.slice(
      source.indexOf('const startExam = useCallback'),
      source.indexOf('const updateAnswer = useCallback'),
    );
    const begin = source.slice(
      source.indexOf('const beginQuiz = useCallback'),
      source.indexOf('const pauseAndExit = useCallback'),
    );

    expect(start).not.toContain('await spendAmount(ENERGY_COST)');
    expect(start).not.toContain('persistActiveLevelExamAttempt(nextAttempt)');
    expect(begin).toContain('if (!unlimitedEnergy)');
    expect(begin).toContain('!await spendAmount(ENERGY_COST)');
    expect(begin.indexOf('!await spendAmount(ENERGY_COST)'))
      .toBeLessThan(begin.indexOf("setPhase('quiz')"));
    expect(begin.indexOf("setPhase('quiz')"))
      .toBeLessThan(begin.indexOf('await persistActiveLevelExamAttempt(started)'));
    expect(source).not.toContain('recoveryRefundKey');
    expect(source).not.toContain('addEnergy(ENERGY_COST)');
  });

  it('charges the final exam after countdown and immediately exposes question one', () => {
    const source = read('app/exam.tsx');
    const commit = source.slice(
      source.indexOf('const commitExamFirstQuestion = React.useCallback'),
      source.indexOf('useEffect(() => {', source.indexOf('const commitExamFirstQuestion = React.useCallback')),
    );
    const start = source.slice(
      source.indexOf('const startExam = async'),
      source.indexOf('const submitExam = async'),
    );

    expect(start).not.toContain('await spendAmount(LINGMAN_EXAM_ENERGY)');
    expect(commit).toContain('await spendAmount(LINGMAN_EXAM_ENERGY)');
    expect(commit.indexOf('await spendAmount(LINGMAN_EXAM_ENERGY)'))
      .toBeLessThan(commit.indexOf("setPhase('quiz')"));
    expect(commit.slice(commit.indexOf("setPhase('quiz')"))).not.toContain('await ');
    expect(source).toContain('списываются при открытии первого задания');
  });

  it('keeps Plus unlimited and never charges again when restoring a paid level attempt', () => {
    const source = read('components/level-exam/LevelExamV2.tsx');
    const restore = source.slice(
      source.indexOf('const stored = await loadActiveLevelExamAttempt'),
      source.indexOf('const startExam = useCallback'),
    );

    expect(source).toContain('const unlimitedEnergy = isUnlimited || hasPremiumAccess');
    expect(restore).not.toContain('spendAmount(');
    expect(restore).not.toContain('addEnergy(');
  });
});
