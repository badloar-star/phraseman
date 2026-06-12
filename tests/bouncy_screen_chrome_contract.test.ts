import fs from 'fs';
import path from 'path';

const screens = [
  'app/arena_lobby.tsx',
  'app/arena_rating.tsx',
  'app/club_screen.tsx',
  'app/(tabs)/quizzes.tsx',
  'app/daily_tasks_screen.tsx',
  'app/lesson_menu.tsx',
  'app/personal_plan.tsx',
  'app/personal_plan_stats_screen.tsx',
  'app/streak_stats.tsx',
  'app/trainer.tsx',
];

describe('bouncy screen chrome contract', () => {
  it.each(screens)('%s keeps page chrome in the bouncy transform layer', (screenPath) => {
    const source = fs.readFileSync(path.join(__dirname, '..', screenPath), 'utf8');
    const layerStart = source.indexOf('<Reanimated.View style={[{ flex: 1 }, bouncyStyle]}>');
    const wrapStart = source.indexOf('<BouncyWrap>', layerStart);
    const wrapEnd = source.indexOf('</BouncyWrap>', wrapStart);
    const layerEnd = source.indexOf('</Reanimated.View>', wrapEnd);

    expect(source).toContain("import Reanimated from 'react-native-reanimated';");
    expect(source).not.toContain('<BouncyWrap style={bouncyStyle}>');
    expect(layerStart).toBeGreaterThan(-1);
    expect(wrapStart).toBeGreaterThan(layerStart);
    expect(wrapEnd).toBeGreaterThan(wrapStart);
    expect(layerEnd).toBeGreaterThan(wrapEnd);
  });
});
