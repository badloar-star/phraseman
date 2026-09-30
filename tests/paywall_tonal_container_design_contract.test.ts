import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('paywall tonal container design contract', () => {
  // Тест карточек тарифов удалён 2026-09-30 вместе с PaywallPlanCards (D78).
  it('renders paywall proof cards as tonal layers instead of flat bordered panels', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components', 'paywall', 'PaywallProofCards.tsx'), 'utf8');
    const proofCardStart = source.indexOf('function ProofCard');
    const proofCardEnd = source.indexOf('function formatMirrorValue', proofCardStart);
    const proofCard = source.slice(proofCardStart, proofCardEnd);

    expect(proofCardStart).toBeGreaterThan(-1);
    expect(proofCard).toContain('<LinearGradient');
    expect(proofCard).toContain('chrome.tc.heroAccent');
    expect(proofCard).toContain('S.cardHighlight');
    expect(source).toContain("card: { borderRadius: 18, borderWidth: 0");
    expect(source).toContain("overflow: 'hidden'");
    expect(proofCard).not.toContain('borderWidth: 1');
    expect(source).not.toContain('<BlurView');
    expect(source).not.toContain('backdropFilter');
    expect(source).not.toContain('filter: blur');
  });
});
