import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('quiz level select header contract', () => {
  it('does not render the redundant tab title in the compact top bar', () => {
    const source = fs.readFileSync(path.join(root, 'app', '(tabs)', 'quizzes.tsx'), 'utf8');
    const headerStart = source.indexOf('<View style={{ paddingHorizontal: 16, paddingTop: 16 + insets.top');
    const energyStart = source.indexOf('<EnergyBar size={30} />', headerStart);
    const header = source.slice(headerStart, energyStart);

    expect(headerStart).toBeGreaterThan(-1);
    expect(energyStart).toBeGreaterThan(headerStart);
    expect(header).toContain('<View style={{ flex: 1 }} />');
    expect(header).not.toContain("ru: 'Вызовы'");
    expect(header).not.toContain('tabQuizzes');
  });
});
