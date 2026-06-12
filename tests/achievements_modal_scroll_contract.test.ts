import fs from 'fs';
import path from 'path';

describe('achievement modal scroll contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/achievements_screen.tsx'), 'utf8');

  it('keeps the achievement detail modal on a plain ScrollView so modal content has stable height', () => {
    const modalStart = source.indexOf('function AchievementModal');
    const modalEnd = source.indexOf('// ── Секция-аккордеон', modalStart);
    const modalSource = source.slice(modalStart, modalEnd);

    expect(modalSource).toContain('<ScrollView');
    expect(modalSource).not.toContain('<BouncyScrollView');
  });
});
