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

  it('обе кнопки используют ctaFillGradient (обёртка accentFillGradient: №35, главная кнопка не сливается с фоном)', () => {
    for (const f of ['PaywallPlus.tsx', 'PaywallTrialReminderPrompt.tsx']) {
      expect(fs.readFileSync(path.join(DIR, f), 'utf8')).toContain('ctaFillGradient(g)');
    }
  });
});
