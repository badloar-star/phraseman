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

  it('uses the shared semantic blocks on every explanation surface', () => {
    expect(read('components/AiMistakeCard.tsx')).toContain('buildMistakeExplanationBlocks');
    expect(read('components/AiMistakeCard.tsx')).toContain('LearningSemanticBlock');
    expect(read('components/ExplainSheet.tsx')).toContain('buildExplainSheetBlocks');
    expect(read('components/ExplainSheet.tsx')).toContain('LearningSemanticBlock');
    expect(read('components/MistakeEli5Modal.tsx')).toContain('buildMistakeExplanationBlocks');
    expect(read('components/MistakeEli5Modal.tsx')).toContain('LearningSemanticBlock');
    expect(read('app/(tabs)/quizzes.tsx')).toContain('buildQuizExplanationBlocks');
    expect(read('app/(tabs)/quizzes.tsx')).toContain('LearningSemanticBlock');
  });

  it('does not route long generated explanation prose through bilingual latin coloring', () => {
    const aiCard = read('components/AiMistakeCard.tsx');
    const explainSheet = read('components/ExplainSheet.tsx');
    const eli5 = read('components/MistakeEli5Modal.tsx');

    expect(aiCard).not.toContain('BilingualMistakeText');
    expect(explainSheet).not.toContain('splitExplainSegments');
    expect(explainSheet).not.toContain('bodyEn');
    expect(eli5).not.toContain('BilingualMistakeText');
  });
});
