import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan exercise choice instruction contract', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_exercise.tsx'), 'utf8');

  it('makes choose-phrase mode actionable instead of showing a generic prompt', () => {
    expect(source).toContain('? `Смысл: ${item.promptRu}`');
    expect(source).toContain("? 'Нажми лучший вариант ниже'");
    expect(source).toContain('styles.choiceInstruction');
    expect(source).toContain('choiceInstruction: { fontSize: 28, lineHeight: 34 }');
  });

  it('renders missing-word mode as a blank sentence with compact word chips', () => {
    expect(source).toContain('isMissingWordMode');
    expect(source).toContain("isMissingWordMode && 'displayEnglish' in item");
    expect(source).toContain('styles.missingWordHint');
    expect(source).toContain('styles.optionChipGrid');
    expect(source).toContain('isMissingWordMode ? styles.optionChip : styles.option');
    expect(source).toContain('isMissingWordMode ? styles.optionChipText : styles.optionText');
    expect(source).toContain('optionChipGrid: {');
    expect(source).toContain("flexWrap: 'wrap'");
  });
});
