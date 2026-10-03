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

  it('wires the ELI5 «Объяснить проще» modal opened from the card footer', () => {
    expect(source).toContain('MistakeEli5Modal');
    expect(source).toContain('openEli5Modal');
    // Хук строит запрос с вариантом eli5 через buildArgs('eli5').
    expect(combined).toMatch(/buildArgs\(['"]eli5['"]\)|variant: 'eli5'/);
  });

  it('keeps the footer phrase-explain button on the 3+gift credit path (separate from the mistake breakdown)', () => {
    // The footer «Объясни просто» button toggles the ExplainSheet via explainOpen state.
    expect(source).toContain('setExplainOpen');
    expect(source).toContain('const explainHintsLeft = Math.max(0, 3 + bonusHints - fiftyFiftyUsedToday)');
    expect(source).not.toContain('lesson1-explain-result');
  });

});
