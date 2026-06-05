import fs from 'fs';
import path from 'path';

describe('personal plan setup theme contract', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', 'personal_plan_setup.tsx'), 'utf8');

  it('uses the active app theme as the setup screen chrome', () => {
    expect(source).toContain('const accent = t.accent');
    expect(source).toContain('const onAccent = t.correctText');
    expect(source).toContain('const screenBg = t.bgPrimary');
    expect(source).toContain('const cardBg = t.bgCard');
    expect(source).toContain('colors={t.bgGradient}');
    expect(source).toContain('colors={t.cardGradient}');
  });

  it('does not let plan art override the global theme palette', () => {
    expect(source).not.toContain('planArt.ambient');
    expect(source).not.toContain('art.ambient');
    expect(source).not.toContain('planArt.heroGradient');
  });

  it('asks for daily time during plan setup and activates the plan with that selected load', () => {
    expect(source).toContain("type Step = 'goal' | 'level' | 'focus' | 'minutes' | 'result' | 'all'");
    expect(source).toContain('PERSONAL_PLAN_SETUP_MINUTES');
    expect(source).toContain('const [selectedMinutes, setSelectedMinutes]');
    expect(source).toContain('setStep(\'minutes\')');
    expect(source).toContain('minutesPerDay: selectedMinutes');
    expect(source).not.toContain('minutesPerDay: getPlanDefaultMinutes(planId)');
    for (const minutes of [5, 10, 15, 20]) {
      expect(source).toContain(`id: ${minutes}`);
    }
  });
});
