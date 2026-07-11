import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan exercise choice instruction contract', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_exercise.tsx'), 'utf8');

  it('makes choose-phrase mode actionable instead of showing a generic prompt', () => {
    expect(source).toContain('})}: ${itemPrompt}`');
    expect(source).toContain("ru: 'Нажми лучший вариант ниже'");
    expect(source).toContain('styles.choiceInstruction');
    expect(source).toContain('choiceInstruction: { fontSize: 22, lineHeight: 28 }');
  });

  it('renders missing-word mode as a blank sentence with compact word chips', () => {
    expect(source).toContain('isMissingWordMode');
    expect(source).toContain("'displayEnglish' in item");
    expect(source).toContain('const useGridOptions = choiceOptions.length > 0');
    expect(source).toContain('useGridOptions ? styles.optionsGrid : styles.options');
    expect(source).toContain('useGridOptions ? s.optionGridSurface : s.option');
    expect(source).toContain('useGridOptions ? s.optionGridText : s.optionText');
    expect(source).toContain('optionsGrid: {');
    expect(source).toContain("flexWrap: 'wrap'");
  });
});
