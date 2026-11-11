import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');
// Оркестрация ИИ-разбора вынесена в общий хук useMistakeExplain (используется и в
// уроках, и в режимах личного плана), поэтому внутренности (вызов клиента, diffPairs,
// variant eli5) теперь живут в хуке. Проверяем интеграцию по СУММЕ обоих файлов.
const hookSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'use_mistake_explain.ts'), 'utf8');
const combined = source + '\n' + hookSource;

describe('lesson AI mistake card integration', () => {
  it('renders the smart card only for wrong result answers and calls explainMistake through the safe client', () => {
    expect(source).toContain('<AiMistakeCard');
    expect(source).toContain("status === 'result' && wasWrong");
    expect(source).toContain('useMistakeExplain');
    expect(combined).toContain('callExplainMistake');
  });

  // зачем (04.10): правило «разбор бесплатен для всех» (07.11) заменено решением владельца 17.09
  // (макет runes/MAKET.html, экран 5): 120 монет, 3 бесплатных в день, ОДИН общий счётчик для всех
  // поверхностей — его сторожит tests/runes_mistake_explain_contract.test.ts. Здесь держим другое:
  // сам экран урока лимитом не управляет, он живёт только в общем хуке.
  it('the lesson screen itself does no daily-cap gating — the shared hook owns it', () => {
    expect(source).not.toContain('getAiMistakeExplainsLeftToday');
    expect(source).not.toContain('markAiMistakeExplainUsed');
    expect(hookSource).toContain('getAiMistakeExplainsLeftToday');
  });

  it('sends every mismatched word pair so the AI explains the WHOLE error', () => {
    expect(combined).toContain('resolveAllMistakeTokens');
    expect(combined).toContain('diffPairs');
  });

  // зачем (владелец 11.11: «убери кнопку объяснить проще и функцию… они не нужны… обе удалить», плюс лампочку «Объяснить»): урок не открывает ни шторку «Объясни проще», ни шторку «Объяснить».
  it('has no «Объяснить проще» modal and no footer «Объяснить» tile in the lesson', () => {
    expect(source).not.toContain('MistakeEli5Modal');
    expect(source).not.toContain('openEli5Modal');
    expect(source).not.toContain('onOpenSimple');
    expect(source).not.toContain('<ExplainSheet');
    expect(source).not.toContain('setExplainOpen');
    expect(source).not.toContain('testID="lesson1-explain"');
  });

  it('keeps the 50/50 hint on the 3+gift daily credit path', () => {
    expect(source).toContain('const explainHintsLeft = Math.max(0, 3 + bonusHints - fiftyFiftyUsedToday)');
    expect(source).not.toContain('lesson1-explain-result');
  });

});
