describe('Admin v2 evidence retention rendering', () => {
  it('renders activation, exact and rolling cohorts, missing-source disclosure, and legacy diagnostics', () => {
    const root = { innerHTML: '' };
    const previousWindow = (global as any).window;
    const previousDocument = (global as any).document;
    (global as any).window = {};
    (global as any).document = { getElementById: () => root };

    jest.isolateModules(() => {
      require('../admin/v2/scripts/components/analytics-language.js');
      require('../admin/v2/scripts/pages/retention-diagnostics.js');
    });
    (global as any).window.renderRetentionDiagnostics(
      {
        exact_d1_rate: 0.2, rolling_d1_rate: 0.3, eligible_d1: 10,
        exact_d7_rate: 0.1, rolling_d7_rate: 0.2, eligible_d7: 10,
        exact_d14_rate: null, rolling_d14_rate: null, eligible_d14: 0,
        exact_d30_rate: null, rolling_d30_rate: null, eligible_d30: 0,
        cohorts: [],
      },
      { d1_rate: 0.4, returned_d1: 4, eligible_d1: 10, cohorts: [] },
      { cohort_app_instances: 10, onboarding_completed: 8, onboarding_rate: 0.8 },
      {
        firebaseFirstTouch: { channels: [{ channel: 'organic_search', consented_first_touch_app_instances: 6 }] },
        storeImports: { status: 'unavailable_not_configured' },
        adSpendImports: { status: 'unavailable_not_configured' },
      },
      { first_touch_coverage_rate: 0.9, valid_first_touch_app_instances: 9, invalid_or_missing_first_touch_app_instances: 1 },
    );

    expect(root.innerHTML).toContain('D14');
    expect(root.innerHTML).toContain('24–72');
    expect(root.innerHTML).toContain('organic_search');
    expect(root.innerHTML).toContain('Импорты App Store');
    expect(root.innerHTML).toContain('<details');
    expect(root.innerHTML).toContain('экземпляров приложения с разрешённой аналитикой');
    expect(root.innerHTML).toContain('не уникальные люди и не подтверждённые магазином установки');
    expect(root.innerHTML).not.toContain('наблюдаемых установок');
    expect(root.innerHTML).not.toContain('undefined');

    (global as any).window = previousWindow;
    (global as any).document = previousDocument;
  });
});
