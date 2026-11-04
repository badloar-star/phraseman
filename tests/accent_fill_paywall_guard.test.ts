import fs from 'fs';
import path from 'path';

// зачем (координатор 12.10): в components/paywall заливка кнопки под accentInk идёт через accentFillGradient (контраст ≥ 4,5 на любой теме);
// голый градиент [g.accentBright, g.accent] в светлых градиентных темах давал 1,2–2,3:1.
const DIR = path.join(__dirname, '..', 'components', 'paywall');

describe('paywall: заливка под accentInk', () => {
  const files = fs.readdirSync(DIR).filter((f) => /\.tsx?$/.test(f));

  it.each(files)('%s не красит заливку голым accentBright', (file) => {
    const src = fs.readFileSync(path.join(DIR, file), 'utf8');
    expect(src).not.toMatch(/colors=\{\[\s*\w+\.accentBright\s*,\s*\w+\.accent\s*\]\}/);
  });

  it('C uses its approved flat theme CTA; the separate reminder prompt retains its contrast-safe gradient', () => {
    const plus = fs.readFileSync(path.join(DIR, 'PaywallPlus.tsx'), 'utf8');
    expect(plus).toContain('style={[S.cta, { backgroundColor: g.ctaFill }]}');
    expect(plus).not.toContain('ctaFillGradient(g)');
    expect(fs.readFileSync(path.join(DIR, 'PaywallTrialReminderPrompt.tsx'), 'utf8')).toContain('ctaFillGradient(g)');
  });
});
