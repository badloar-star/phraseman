import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan home route card layout', () => {
  const source = fs.readFileSync(path.join(ROOT, 'components', 'PersonalPlanHomeRouteCard.tsx'), 'utf8');
  const homeSource = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

  it('keeps the route title readable instead of forcing a one-line ellipsis', () => {
    const titleStart = source.indexOf('<Text style={[styles.title');
    const titleEnd = source.indexOf('</Text>', titleStart);
    const titleBlock = source.slice(titleStart, titleEnd);

    expect(titleStart).toBeGreaterThanOrEqual(0);
    expect(titleBlock).toContain("{snapshot.planName}{'\\n'}день {snapshot.dayIndex}");
    expect(titleBlock).not.toContain('numberOfLines={1}');
    expect(titleBlock).not.toContain('ellipsizeMode');
  });

  it('renders from the active plan snapshot instead of preview constants', () => {
    expect(source).toContain('snapshot: PersonalPlanHomeSnapshot');
    expect(source).toContain('pct={snapshot.progressPct}');
    expect(source).toContain("router.push('/personal_plan' as any)");
    expect(source).toContain("router.push('/personal_plan_dev' as any)");
    expect(source).not.toContain('ACTIVE_PLAN_PREVIEW');
    expect(source).not.toContain('progressPct = 3');
    expect(homeSource).not.toContain('const hasActivePersonalPlan: boolean = true');
  });

  it('keeps the route card compact and free of the trailing arrow button', () => {
    expect(source).toContain('minHeight: 132');
    expect(source).toContain('size={62}');
    expect(source).not.toContain('styles.chevron');
    expect(source).not.toContain('chevron-forward');
  });

  it('does not place generated route task art inside the compact home card', () => {
    expect(source).not.toContain('getPersonalPlanTaskVisualAsset');
    expect(source).not.toContain('styles.heroImageBackdrop');
    expect(source).not.toContain('styles.heroImage');
    expect(source).not.toContain('contentFit="contain"');
    expect(source).not.toContain('contentFit="cover"');
  });
});
