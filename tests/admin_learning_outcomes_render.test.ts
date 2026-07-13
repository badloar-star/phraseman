describe('Admin v2 learning outcome rendering', () => {
  it('renders evidence definitions, consent coverage, samples and suppressed content', () => {
    const root = { innerHTML: '' };
    const previousWindow = (global as any).window;
    const previousDocument = (global as any).document;
    (global as any).window = {};
    (global as any).document = { getElementById: (id: string) => id === 'product-analytics-learning-outcomes' ? root : null };

    jest.isolateModules(() => {
      require('../admin/v2/scripts/components/analytics-language.js');
      require('../admin/v2/scripts/pages/product-analytics.js');
    });
    (global as any).window.renderLearningOutcomes({
      review: {
        persisted_answers: 20,
        consented_app_instances: 8,
        first_answer_accuracy: 0.7,
        delayed_recall_accuracy: 0.6,
      },
      reviewSessions: { starts: 10, completes: 7, abandons: 3, completion_rate: 0.7 },
      delayBuckets: [{ delay_bucket: 'd7_to_d29', answers: 5, correct_answers: 3, accuracy: 0.6, consented_app_instances: 4 }],
      masteryTransitions: [{ transition: 'mastered', events: 3, consented_app_instances: 3 }],
      contentDiagnostics: [{ diagnostic_group: 'suppressed_small_sample', answers: 4, accuracy: 0.5, consented_app_instances: 4 }],
      weeklyEffectiveLearners: [
        { week_start_utc: '2026-07-13', is_complete_week: false, active_consented_app_instances: 2, weekly_effective_learners: 0, weekly_effective_learner_rate: 0, delayed_success_count: 0 },
        { week_start_utc: '2026-07-06', is_complete_week: true, active_consented_app_instances: 8, weekly_effective_learners: 4, weekly_effective_learner_rate: 0.5, delayed_success_count: 4 },
      ],
    }, 1783900000000);

    expect(root.innerHTML).toContain('Weekly Effective Learners');
    expect(root.innerHTML).toContain('UTC');
    expect(root.innerHTML).toContain('экземпляр');
    expect(root.innerHTML).toContain('suppressed_small_sample');
    expect(root.innerHTML).toContain('Корреляция');
    const welCard = root.innerHTML.slice(root.innerHTML.indexOf('Weekly Effective Learners'), root.innerHTML.indexOf('Weekly Effective Learners') + 600);
    expect(welCard).toContain('50.0%');
    expect(root.innerHTML).toContain('Неполная неделя');
    expect(root.innerHTML).not.toContain('item-');
    expect(root.innerHTML).not.toContain('undefined');

    (global as any).window = previousWindow;
    (global as any).document = previousDocument;
  });
});
