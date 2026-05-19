import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

describe('quiz no-energy paywall navigation', () => {
  it('closes the in-session no-energy modal without backing out before opening Premium', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'quizzes.tsx'), 'utf8');
    const match = source.match(/<NoEnergyModal\s+visible=\{showNoEnergyModal\}[\s\S]*?\/>/);

    expect(match).not.toBeNull();
    const modalBlock = match?.[0] ?? '';

    expect(modalBlock).toContain('onClose={dismissEnergyModal}');
    expect(modalBlock).toContain('onBeforeOpenPremium={() => setShowNoEnergyModal(false)}');
  });
});
