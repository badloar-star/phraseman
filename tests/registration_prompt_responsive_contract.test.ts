import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

function source(): string {
  return fs.readFileSync(path.join(ROOT, 'components', 'RegistrationPromptModal.tsx'), 'utf8');
}

describe('RegistrationPromptModal responsive layout contract', () => {
  it('keeps auth prompt content scrollable inside a viewport-bound card', () => {
    const src = source();

    expect(src).toContain('useWindowDimensions');
    expect(src).toContain('const cardMaxHeight = Math.max(280, viewportHeight - 64)');
    expect(src).toContain('maxHeight: cardMaxHeight');
    expect(src).toContain("overflow: 'hidden'");
    expect(src).toContain('<ScrollView');
    expect(src).toContain('contentContainerStyle={[styles.cardContent, { padding: cardPadding }]}');
    expect(src).toContain('keyboardShouldPersistTaps="handled"');
  });

  it('keeps later/privacy/legal footer from clipping on large system text', () => {
    const src = source();

    expect(src).toContain('testID="auth-prompt-later"');
    expect(src).toContain('const captionLineHeight = Math.max(18, Math.round(f.caption * 1.4))');
    expect(src).toContain('styles.privacy');
    expect(src).toContain('styles.legalLinks');
    expect(src).toContain("flexWrap: 'wrap'");
    expect(src).toContain("width: '100%'");
  });
});
