import {
  buildDryRunSampleGeneratedDayPacket,
  runPersonalPlanGenerationDryRunHarness,
  validatePersonalPlanGenerationDryRunHarnessReport,
} from '../app/personal_plan_generation_dry_run_harness';

describe('personal plan generation dry-run harness', () => {
  it('runs one sample generated day through every non-live gate without source/runtime writes', () => {
    const report = runPersonalPlanGenerationDryRunHarness({
      packet: buildDryRunSampleGeneratedDayPacket(),
      reviewerId: 'dry-run-reviewer',
      reviewedAt: '2026-06-05T01:00:00.000Z',
    });

    expect(report.kind).toBe('personal_plan_generation_dry_run_harness_report');
    expect(report.status).toBe('valid_non_live_dry_run');
    expect(report.productionReady).toBe(false);
    expect(report.sourceRuntimeWriteAllowed).toBe(false);
    expect(report.liveRegistrationAllowed).toBe(false);
    expect(report.generatedContentCreationAllowed).toBe(false);
    expect(report.packetValidation.status).toBe('valid_needs_review');
    expect(report.review.status).toBe('approved_for_source_intake');
    expect(report.sourceIntake.status).toBe('ready_for_import_format_design');
    expect(report.importFormat.status).toBe('ready_for_runtime_write_guard');
    expect(report.importFormatValidation.status).toBe('valid_non_live_import_format');
    expect(report.runtimeSourceGuard.status).toBe('hold_before_integration_pass');
    expect(report.runtimeSourceGuardValidation.status).toBe('valid_hold_guard');
    expect(report.nextRequiredStep).toBe('bulk_generation_review_queue');
    expect(report.writtenSourceFamilies).toEqual([]);
  });

  it('reports invalid packets and still keeps live/source writes blocked', () => {
    const invalidPacket = buildDryRunSampleGeneratedDayPacket({
      selectedDailyTimeAffectsTasks: false,
      taskModes: ['lesson'],
      productionReady: true,
    });

    const report = runPersonalPlanGenerationDryRunHarness({
      packet: invalidPacket,
      reviewerId: 'dry-run-reviewer',
      reviewedAt: '2026-06-05T01:00:00.000Z',
    });

    expect(report.status).toBe('blocked');
    expect(report.sourceRuntimeWriteAllowed).toBe(false);
    expect(report.liveRegistrationAllowed).toBe(false);
    expect(report.generatedContentCreationAllowed).toBe(false);
    expect(report.packetValidation.issueCodes).toEqual(expect.arrayContaining([
      'lesson_task_not_allowed',
      'time_based_task_selection_required_for_visible_slice',
      'production_ready_not_allowed',
    ]));
    expect(report.review.status).toBe('rejected');
    expect(report.nextRequiredStep).toBe('regenerate_or_rewrite_packet');
  });

  it('validates the dry-run report and blocks fake readiness flags', () => {
    const report = runPersonalPlanGenerationDryRunHarness({
      packet: buildDryRunSampleGeneratedDayPacket(),
      reviewerId: 'dry-run-reviewer',
      reviewedAt: '2026-06-05T01:00:00.000Z',
    });

    expect(validatePersonalPlanGenerationDryRunHarnessReport(report)).toEqual({
      status: 'valid_non_live_dry_run',
      issueCodes: [],
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      nextRequiredStep: 'bulk_generation_review_queue',
    });

    expect(validatePersonalPlanGenerationDryRunHarnessReport({
      ...report,
      productionReady: true as any,
    }).issueCodes).toContain('production_ready_not_allowed');

    expect(validatePersonalPlanGenerationDryRunHarnessReport({
      ...report,
      sourceRuntimeWriteAllowed: true as any,
    }).issueCodes).toContain('source_runtime_write_not_allowed');
  });
});
