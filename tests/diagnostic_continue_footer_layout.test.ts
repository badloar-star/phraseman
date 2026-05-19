import fs from 'fs';
import path from 'path';

describe('diagnostic continue button layout', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'diagnostic_test.tsx'), 'utf8');

  it('keeps the post-answer continue CTA outside the scrollable question body', () => {
    const footerIndex = source.indexOf('testID="diagnostic-continue-footer"');
    expect(footerIndex).toBeGreaterThan(-1);

    const previousScrollCloseIndex = source.lastIndexOf('</ScrollView>', footerIndex);
    expect(previousScrollCloseIndex).toBeGreaterThan(-1);
    expect(footerIndex).toBeGreaterThan(previousScrollCloseIndex);

    const footerBlock = source.slice(footerIndex, footerIndex + 1_500);
    expect(footerBlock).toContain('paddingBottom: Math.max(12, insets.bottom + 12)');
    expect(footerBlock).toContain('minHeight: 52');
    expect(footerBlock).toContain('accessibilityRole="button"');
  });
});
