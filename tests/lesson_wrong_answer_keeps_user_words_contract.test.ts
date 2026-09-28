import { readFileSync } from 'fs';
import { join } from 'path';

// зачем: ученики думали, что приложение подменяет их слово (waist→waste, know→remember,
// them→they): при ошибке на месте их фразы появлялся эталон зелёным. Контракт — при
// неверном ответе в строке ответа остаются слова ученика, эталон показан отдельно.
describe('lesson result on wrong answer keeps the learner words in place', () => {
  const source = readFileSync(join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');

  it('renders the learner answer in the primary row when wrong', () => {
    expect(source).toContain('testID="lesson1-user-answer-on-wrong"');
    expect(source).toContain("status === 'result' && wasWrong && wrongResultTokens.length > 0");
  });

  it('shows the correct line separately in the mistake box', () => {
    expect(source).toContain('testID="lesson1-correct-answer-on-wrong"');
  });
});
