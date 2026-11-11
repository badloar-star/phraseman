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
    // зачем: строки про app/(tabs)/quizzes.tsx убраны — экран удалён вместе с квизами.
  });

  it('does not route long mistake explanation prose through bilingual latin coloring', () => {
    const aiCard = read('components/AiMistakeCard.tsx');

    expect(aiCard).not.toContain('BilingualMistakeText');
  });

  it('uses one Liquid Glass surface family for explanation sheets without changing their semantic body rendering', () => {
    // ExplainReportButton на liquidGlassTokens (overlays-campaigns OS-EXPLAIN-REPORT-*); шторки «Объяснить» и «Объясни проще» удалены владельцем 11.11.
    expect(read('components/ExplainReportButton.tsx')).toContain('liquidGlassTokens(liquidGlassThemeId)');
  });
});
