import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan premium UI contract', () => {
  const screenSource = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan.tsx'), 'utf8');
  const homeCardSource = fs.readFileSync(path.join(ROOT, 'components', 'PersonalPlanHomeRouteCard.tsx'), 'utf8');

  it('keeps per-plan art on the home entry point while the plan screen opens straight to tasks', () => {
    expect(screenSource).not.toContain('PlanArtHero');
    expect(screenSource).not.toContain("from './personal_plan_art'");
    expect(homeCardSource).toContain("from '../app/personal_plan_art'");
    expect(homeCardSource).toContain('getPersonalPlanArt(snapshot.planId)');
  });

  it('keeps primary progress and action controls tied to the active app theme', () => {
    expect(screenSource).toContain('const actionAccent = isGold ?');
    expect(screenSource).toContain('color={actionAccent}');
    expect(screenSource).toContain('backgroundColor: completed ? t.bgSurface2 : actionAccent');
    expect(screenSource).not.toContain('completed ? t.bgSurface2 : plan.accent');
  });

  it('does not mix per-plan accent colors into the normal user interface', () => {
    expect(screenSource).not.toContain('art.heroGradient');
    expect(screenSource).not.toContain('art.ambientSoft');
    expect(screenSource).not.toContain('backgroundColor: art.line');
    expect(homeCardSource).not.toContain('art.ambientSoft');
    expect(homeCardSource).not.toContain('art.line');
  });

  it('keeps the normal user UI polished instead of developer-like', () => {
    const lowerScreen = screenSource.toLowerCase();
    expect(lowerScreen).not.toContain('сцена');
    expect(lowerScreen).not.toContain('маршрут');
    expect(lowerScreen).not.toContain('debug');
  });
});
