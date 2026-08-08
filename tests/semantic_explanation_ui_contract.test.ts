import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('semantic explanation UI contract', () => {
  it('renders explanation blocks through a shared borderless intro-like primitive', () => {
    const src = read('components/LearningSemanticBlock.tsx');

    expect(src).toContain('SemanticExplanationBlock');
    expect(src).toContain('semanticToneAccent');
    expect(src).toContain('testID');
    expect(src).toContain('semantic-explanation-block');
    expect(src).toContain('borderWidth: 0');
    expect(src).toContain('stripe');
  });

  it('uses shared semantic blocks on mistake and quiz explanation surfaces only', () => {
    expect(read('components/AiMistakeCard.tsx')).toContain('buildMistakeExplanationBlocks');
    expect(read('components/AiMistakeCard.tsx')).toContain('LearningSemanticBlock');
    expect(read('components/MistakeEli5Modal.tsx')).toContain('buildMistakeExplanationBlocks');
    expect(read('components/MistakeEli5Modal.tsx')).toContain('LearningSemanticBlock');
    // зачем: строки про app/(tabs)/quizzes.tsx убраны — экран удалён вместе с квизами.
  });

  it('keeps the simple phrase ExplainSheet out of the semantic-cloud redesign', () => {
    const explainSheet = read('components/ExplainSheet.tsx');

    expect(explainSheet).not.toContain('LearningSemanticBlock');
    expect(explainSheet).not.toContain('buildExplainSheetBlocks');
    expect(explainSheet).toContain('splitExplainParagraphs(display.text)');
  });

  it('does not route long mistake explanation prose through bilingual latin coloring', () => {
    const aiCard = read('components/AiMistakeCard.tsx');
    const eli5 = read('components/MistakeEli5Modal.tsx');

    expect(aiCard).not.toContain('BilingualMistakeText');
    expect(eli5).not.toContain('BilingualMistakeText');
  });

  it('uses the shared tonal surface for explanation sheets without changing their semantic body rendering', () => {
    expect(read('components/ExplainSheet.tsx')).toContain('TonalSurface');
    expect(read('components/MistakeEli5Modal.tsx')).toContain('TonalSurface');
    expect(read('components/ExplainReportButton.tsx')).toContain('TonalSurface');
  });
});
