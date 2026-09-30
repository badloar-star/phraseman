import fs from 'fs';
import path from 'path';

describe('diagnostic continue button layout', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'diagnostic_test.tsx'), 'utf8');

  it('keeps the post-answer continue CTA outside the scrollable question body', () => {
    const footerIndex = source.indexOf('testID="diagnostic-continue-footer"');
    expect(footerIndex).toBeGreaterThan(-1);

    const previousScrollCloseIndex = source.lastIndexOf('</BouncyScrollView>', footerIndex);
    expect(previousScrollCloseIndex).toBeGreaterThan(-1);
    expect(footerIndex).toBeGreaterThan(previousScrollCloseIndex);

    // зачем: подвал теперь <ExamFooter> (safe-area отступ внутри него), кнопка — <PracticeCta> (role=button, высота от 48).
    const footerBlock = source.slice(footerIndex, footerIndex + 1_500);
    expect(footerBlock).toContain('bottomInset={bottomInset}');
    expect(footerBlock).toContain('<PracticeCta');
    expect(footerBlock).toContain('accessibilityLabel={continueA11yLabel}');

    const parts = fs.readFileSync(path.join(__dirname, '..', 'components', 'level-exam', 'ExamGlassParts.tsx'), 'utf8');
    expect(parts).toContain('paddingBottom: Math.max(16, bottomInset + 8)');
    const cta = fs.readFileSync(path.join(__dirname, '..', 'components', 'practice', 'PracticeStates.tsx'), 'utf8');
    expect(cta).toContain('accessibilityRole="button"');
    expect(cta).toContain('minHeight: 48');
  });
});
