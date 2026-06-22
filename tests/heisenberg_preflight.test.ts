import { SOURCE_LOCALES } from '../app/source_locales';
import { buildHeisenbergPreflightReport } from '../scripts/heisenberg_preflight';

describe('heisenberg preflight brain', () => {
  it('audits the full source-locale registry and required AI/runtime contracts', () => {
    const report = buildHeisenbergPreflightReport(process.cwd());
    const areas = report.checks.map((check) => check.area);

    expect(report.mode).toBe('heisenberg-preflight-brain');
    expect(report.sourceLocales).toEqual(SOURCE_LOCALES);
    expect(areas).toContain('PlanContent generation prompt');
    expect(areas).toContain('PlanContent pipeline gate');
    expect(areas).toContain('Premium dialog language context');
    expect(areas).toContain('Weekly review generated-language gate');
    expect(areas).toContain('Stats insights generated-language gate');
    expect(areas).toContain('Generated AI language post-gate');
    expect(areas).toContain('Generated AI language contract');
    expect(areas).toContain('Explain localized fallback');
    expect(areas).toContain('Explain phrase client language forwarding');
    expect(areas).toContain('Choice explanation language isolation');
    expect(areas).toContain('Choice explanation client contract');
    expect(areas).toContain('Quiz explanation language isolation');
    expect(areas).toContain('Quiz explanation client language forwarding');
    expect(areas).toContain('Mistake explanation language isolation');
    expect(areas).toContain('Admin personal trainings sync');
  });

  it('reports PlanContent container status before content activation', () => {
    const report = buildHeisenbergPreflightReport(process.cwd());
    const voyazh = report.planContent.find((plan) => plan.plan === 'voyazh');

    expect(voyazh).toBeDefined();
    expect(voyazh!.days).toBe(84);
    expect(Array.isArray(voyazh!.protectedAnchorBlockers)).toBe(true);
    expect(Array.isArray(voyazh!.blockedLocales)).toBe(true);
    expect(report.status).toBe(report.summary.blockers > 0 ? 'HOLD' : 'GO');
    if (report.summary.planContentBlockers > 0) {
      expect(report.nextActions.join('\n')).toContain('PlanContent');
      expect(report.planContent.some((plan) => plan.protectedAnchorBlockers.length > 0)).toBe(true);
    } else {
      expect(report.nextActions.join('\n')).toContain('Preflight is GO');
    }
  });
});
