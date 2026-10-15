// R36 (Ревизор F02 15.10): число серии и точки недели на Главной не обновлялись после занятия (только loadData с диска).
// Главная слушает «день засчитан» и ставит новое число сразу, локально, без сети; точки недели перечитывает с диска.
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8');

describe('Главная: серия обновляется сразу после занятия', () => {
  it('подписка на streak_day_counted ставит число серии и перечитывает точки недели; отписка при размонтировании', () => {
    expect(src).toMatch(/const dayCountedSub = onAppEvent\('streak_day_counted', \(payload\) => \{[\s\S]{0,600}setStreak\(payload\.days\);\s*setDisplayStreak\(payload\.days\);[\s\S]{0,80}refreshWeekMarkers\(\);/);
    expect(src).toContain('dayCountedSub.remove();');
    expect(src).toContain('[STREAK] home:day_counted');
  });
});
