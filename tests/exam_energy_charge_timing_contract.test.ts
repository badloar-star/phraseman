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
    // зачем (D72/D87, PM-084): списание — через единый гейт первого вопроса
    // (hooks/useFirstQuestionEnergyGate), а не прямым spendAmount. Суть та же:
    // Plus не платит, списание строго ДО показа вопроса, подтверждение показа
    // (markShown) — сразу после setPhase('quiz') и до записи попытки.
    expect(source).toContain('useFirstQuestionEnergyGate({');
    expect(begin).toContain('if (!unlimitedEnergy)');
    expect(begin).toContain('await levelExamEnergyGate.charge()');
    expect(begin).not.toContain('confirmSpendAmount(');
    expect(begin.indexOf('await levelExamEnergyGate.charge()'))
      .toBeLessThan(begin.indexOf("setPhase('quiz')"));
    expect(begin.indexOf("setPhase('quiz')"))
      .toBeLessThan(begin.indexOf('levelExamEnergyGate.markShown()'));
    expect(begin.indexOf('levelExamEnergyGate.markShown()'))
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

    // зачем (PM-086/D06, решение владельца «отменить 20 энергии для экзамена»): списание идёт через
    // единую точку confirmSpendAmount (цена — 1 сессия из таблицы активностей), подпись с ценой убрана.
    // D72: единая точка — гейт первого вопроса; на кнопке «Начать тест» списания нет.
    expect(source).toContain('useFirstQuestionEnergyGate({');
    expect(start).not.toContain('confirmSpendAmount(');
    expect(start).not.toContain('.charge()');
    expect(commit).toContain('await examEnergyGate.charge()');
    expect(commit.indexOf('await examEnergyGate.charge()'))
      .toBeLessThan(commit.indexOf("setPhase('quiz')"));
    expect(commit.slice(commit.indexOf("setPhase('quiz')"))).not.toContain('await ');
    // D87: показ подтверждается сразу после открытия вопроса, сбой до него — возврат.
    expect(commit.indexOf("setPhase('quiz')"))
      .toBeLessThan(commit.indexOf('examEnergyGate.markShown()'));
    expect(commit).toContain('examEnergyGate.refundNotShown(');
    expect(source).not.toContain('списываются при открытии первого задания');
    expect(source).toContain('const LINGMAN_EXAM_ENERGY = 1;');
  });

  it('keeps Plus unlimited and never charges again when restoring a paid level attempt', () => {
    const source = read('components/level-exam/LevelExamV2.tsx');
    const restore = source.slice(
      source.indexOf('const stored = await loadActiveLevelExamAttempt'),
      source.indexOf('const startExam = useCallback'),
    );

    expect(source).toContain('const unlimitedEnergy = isUnlimited || hasPremiumAccess');
    expect(restore).not.toContain('spendAmount(');
    expect(restore).not.toContain('.charge()');
    expect(restore).not.toContain('addEnergy(');
  });
});
