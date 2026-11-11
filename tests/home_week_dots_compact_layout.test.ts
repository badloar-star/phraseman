import fs from 'fs';
import path from 'path';
import { decodeActiveDays } from '../app/friends_together/together_days';
import { homeWeekDays } from '../components/home/v2/home_week_days';

const ROOT = path.resolve(__dirname, '..');

describe('home weekly dot compact layout', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

  // зачем (координатор §46, 2026-10-01): компактные точки недели жили в
  // экспериментальной панели статуса Главной V1 (удалена 01.10). От них осталась
  // только пульсация точки дня — её и сторожим: не крутится вне активной Главной
  // и при «уменьшить движение».
  it('drops the V1 status week dots and gates the remaining day pulse', () => {
    expect(source).not.toContain('experimentalStatusWeekDotSize');
    const effectStart = source.indexOf('if (!weekDotAnimationToken || !homeRuntimeActive || homeMotionReduceMotion) {');
    expect(effectStart).toBeGreaterThan(-1);
    expect(source.slice(effectStart, effectStart + 200)).toContain('weekDotPulseAnim.stopAnimation();');
  });
});

describe('home counted days', () => {
  it('shows the local calendar week and fills dates from the training history', () => {
    const history = decodeActiveDays({ anchor: '2026-11-10', bits: '101' });
    expect(homeWeekDays('2026-11-11', history, false)).toEqual([
      { date: '2026-11-09', isToday: false, counted: false },
      { date: '2026-11-10', isToday: false, counted: true },
      { date: '2026-11-11', isToday: true, counted: false },
      { date: '2026-11-12', isToday: false, counted: false },
      { date: '2026-11-13', isToday: false, counted: false },
      { date: '2026-11-14', isToday: false, counted: false },
      { date: '2026-11-15', isToday: false, counted: false },
    ]);
  });

  it('fills today immediately and starts a fresh row on Monday', () => {
    const history = new Set(['2026-11-01', '2026-11-03']);
    const week = homeWeekDays('2026-11-02', history, true);
    expect(week.filter((day) => day.counted).map((day) => day.date)).toEqual(['2026-11-02']);
  });

  it('renders the dots above the scene CTA and opens streak statistics', () => {
    const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');
    const home = read('app/(tabs)/home.tsx');
    const scene = read('components/home/v2/scene/HomeScene.tsx');
    const stage = read('components/home/v2/scene/HomeSceneStage.tsx');
    expect(home).toMatch(/<HomeScene\s[\s\S]*?week=\{\{\s*active: homeRuntimeActive,\s*focusTick,\s*todayCounted: streakToday === 'counted',\s*onPress: \(\) => nav\.push\('\/streak_stats\?focus=series'\)/);
    expect(scene).toMatch(/<HomeSceneStage\s[^>]*week=\{p\.week\}/);
    expect(stage).toMatch(/<HomeWeekDots \{\.\.\.week\} \/> : null\}\s*\{copy.cta \? \(\s*<V2Pressable\s+testID="home-scene-cta"/);
    expect(read('components/home/v2/HomeV2TodayCard.tsx')).not.toContain('HomeWeekDots');
  });
});
