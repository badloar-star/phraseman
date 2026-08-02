import fs from 'fs';
import path from 'path';

describe('personal plan setup unanswered-choice contract', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'app', 'personal_plan_setup.tsx'),
    'utf8',
  );

  it('does not render fallback recommendation values as answers before the user chooses them', () => {
    expect(source).toContain('const [goalChosen, setGoalChosen] = useState(false)');
    expect(source).toContain('const [levelChosen, setLevelChosen] = useState(false)');
    expect(source).toContain('const [minutesChosen, setMinutesChosen] = useState(false)');

    expect(source).toContain('selected={goalChosen && goal === item.id}');
    expect(source).toContain('selected={levelChosen && level === item.id}');
    expect(source).toContain('selected={minutesChosen && selectedMinutes === item.id}');
  });

  it('marks only restored or explicitly tapped answers as chosen', () => {
    expect(source).toMatch(/if \(hasGoal\) \{\s*setGoal\(savedGoal as PersonalPlanSetupGoal\);\s*setGoalChosen\(true\);\s*\}/);
    expect(source).toMatch(/if \(hasLevel\) \{\s*setLevel\(savedLevel as PersonalPlanSetupLevel\);\s*setLevelChosen\(true\);\s*\}/);
    expect(source).toMatch(/if \(hasMinutes\) \{\s*setSelectedMinutes\(savedMinutesNum as PlanMinutesChoice\);\s*setMinutesChosen\(true\);\s*\}/);

    expect(source).toMatch(/setGoal\(item\.id\);\s*setGoalChosen\(true\);/);
    expect(source).toMatch(/setLevel\(item\.id\);\s*setLevelChosen\(true\);/);
    expect(source).toMatch(/setSelectedMinutes\(item\.id\);\s*setMinutesChosen\(true\);/);
    expect(source).toMatch(/if \(pending != null && !hasMinutes\) \{\s*setSelectedMinutes\(pending\.minutesPerDay\);\s*setMinutesChosen\(true\);\s*\}/);
  });

  it('exits normal setup to lessons while plan-change mode returns to the active plan', () => {
    expect(source).toContain("const PERSONAL_PLAN_SETUP_EXIT_FALLBACK = '/lessons_list'");
    expect(source).toContain("const exitFallback = directToPlans ? '/personal_plan' : PERSONAL_PLAN_SETUP_EXIT_FALLBACK");
    expect(source).toContain('safeRouterBack(router, exitFallback)');

    const topBarStart = source.indexOf('{/* Top bar */}');
    expect(topBarStart).toBeGreaterThan(-1);
    const topBar = source.slice(topBarStart, topBarStart + 900);
    expect(topBar).toContain('safeRouterBack(router, exitFallback)');
  });
});
