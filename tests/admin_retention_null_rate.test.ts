describe('Admin v2 observed-return null rates', () => {
  it('shows unavailable for a cohort with no eligible denominator', () => {
    const root = { innerHTML: '' };
    const previousWindow = (global as any).window;
    const previousDocument = (global as any).document;
    (global as any).window = {};
    (global as any).document = { getElementById: () => root };
    jest.isolateModules(() => {
      require('../admin/v2/scripts/components/analytics-language.js');
      require('../admin/v2/scripts/pages/retention-diagnostics.js');
    });
    (global as any).window.renderRetentionDiagnostics({
      d1_rate: null, returned_d1: 0, eligible_d1: 0,
      d7_rate: null, returned_d7: 0, eligible_d7: 0,
      d28_rate: null, returned_d28: 0, eligible_d28: 0,
      cohorts: [],
    });
    expect(root.innerHTML).toContain('–');
    expect(root.innerHTML).not.toContain('0.0%');
    (global as any).window = previousWindow;
    (global as any).document = previousDocument;
  });
});
