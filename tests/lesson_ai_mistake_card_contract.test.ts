import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');

describe('lesson AI mistake card integration', () => {
  it('renders the smart card only for wrong result answers and calls explainMistake through the safe client', () => {
    expect(source).toContain('<AiMistakeCard');
    expect(source).toContain("status === 'result' && wasWrong");
    expect(source).toContain('callExplainMistake');
    expect(source).toContain('getAiMistakeExplainsLeftToday');
    expect(source).toContain('markAiMistakeExplainUsed');
  });

  it('keeps the footer explain button as the pre-answer 3+gift credit path', () => {
    expect(source).toContain("testID=\"lesson1-explain\"");
    expect(source).toContain('const explainHintsLeft = Math.max(0, 3 + bonusHints - fiftyFiftyUsedToday)');
    expect(source).not.toContain('lesson1-explain-result');
  });
});
