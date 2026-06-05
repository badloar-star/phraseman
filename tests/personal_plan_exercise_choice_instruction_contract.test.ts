import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan exercise choice instruction contract', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_exercise.tsx'), 'utf8');

  it('makes choose-phrase mode actionable instead of showing a generic prompt', () => {
    expect(source).toContain('isChoiceMode ? `Смысл: ${item.promptRu}` : item.promptRu');
    expect(source).toContain("isChoiceMode ? 'Нажми лучший вариант ниже'");
    expect(source).toContain('styles.choiceInstruction');
    expect(source).toContain('choiceInstruction: { fontSize: 28, lineHeight: 34 }');
  });
});

