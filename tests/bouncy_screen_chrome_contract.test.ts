import fs from 'fs';
import path from 'path';

// зачем: app/arena_lobby.tsx, app/arena_rating.tsx (Арена) и app/(tabs)/quizzes.tsx
// (квизы) удалены вместе с этими фичами; живые экраны ниже сохраняют проверку.
const screens = [
  'app/club_screen.tsx',
  'app/lesson_menu.tsx',
  'app/streak_stats.tsx',
];

describe('bouncy screen chrome contract', () => {
  it.each(screens)('%s keeps page chrome in the bouncy transform layer', (screenPath) => {
    const source = fs.readFileSync(path.join(__dirname, '..', screenPath), 'utf8');
    const layerStart = source.indexOf('<Reanimated.View style={[{ flex: 1 }, bouncyStyle]}>');
    const wrapStart = source.indexOf('<BouncyWrap>', layerStart);
    const wrapEnd = source.indexOf('</BouncyWrap>', wrapStart);
    const layerEnd = source.indexOf('</Reanimated.View>', wrapEnd);

    // зачем: проверяем сам факт дефолтного импорта Reanimated, а не точную строку.
    // Буквальное сравнение падало на живых экранах, где импорт с именованными членами:
    // `import Reanimated, { FadeInDown, ... } from 'react-native-reanimated'`.
    expect(source).toMatch(/import Reanimated(?:,\s*\{[^}]*\})?\s+from 'react-native-reanimated';/);
    expect(source).not.toContain('<BouncyWrap style={bouncyStyle}>');
    expect(layerStart).toBeGreaterThan(-1);
    expect(wrapStart).toBeGreaterThan(layerStart);
    expect(wrapEnd).toBeGreaterThan(wrapStart);
    expect(layerEnd).toBeGreaterThan(wrapEnd);
  });
});
