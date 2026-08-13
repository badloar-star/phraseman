import fs from 'fs';
import path from 'path';

import {
  buildBundledPlanContentDryRunParityReport,
  validateBundledPlanContentDryRunParityReport,
} from '../app/plan_content_pack_dry_run';
import { validatePlanContentParityReport } from '../app/plan_content_pack_parity';

const ROOT = path.resolve(__dirname, '..');
const HASH = 'c'.repeat(64);

const DRY_RUN_OPTIONS = {
  manifestId: 'local.plan_content.dry_run.1',
  manifestHash: HASH,
  sourceSnapshotId: 'local:bundled',
  generatedAt: '2026-06-26T00:00:00.000Z',
} as const;

describe('plan content dry-run parity reporter', () => {
  it('builds a valid hold report from bundled compatibility content', () => {
    const { report, validation } = validateBundledPlanContentDryRunParityReport(DRY_RUN_OPTIONS);

    expect(validation).toEqual({ ok: true, errors: [] });
    expect(report.verdict).toBe('hold');
    expect(report.comparedPlanDayCount).toBeGreaterThan(0);
    expect(report.addedShadowOnlyRows).toEqual([]);
    expect(report.missingRows).toEqual([]);
    expect(report.hashMismatches).toEqual([]);
    expect(report.adapterOutputMismatches).toEqual([]);
    expect(report.fallbackDecisionMismatches).toEqual([]);
    expect(report.reviewerSummary).toEqual({
      reviewedRowCount: report.comparedPlanDayCount,
      reviewStatusCounts: {
        approved: 0,
        shadow: report.comparedPlanDayCount,
        hold: 0,
        rejected: 0,
      },
      localeGateStatusCounts: {
        passed: 0,
        hold: report.comparedPlanDayCount,
        failed: 0,
      },
    });
  });

  it('can mark clean local parity as shadow-passed without activation approval', () => {
    const report = buildBundledPlanContentDryRunParityReport({
      ...DRY_RUN_OPTIONS,
      verdict: 'shadow_parity_passed',
    });

    expect(validatePlanContentParityReport(report)).toEqual({ ok: true, errors: [] });
    expect(report.verdict).toBe('shadow_parity_passed');
    expect(report.reviewerSummary.reviewStatusCounts.approved).toBe(0);
    expect(report.reviewerSummary.localeGateStatusCounts.hold).toBe(report.comparedPlanDayCount);
  });

  it('fails closed and never emits activation_candidate from dry-run options', () => {
    const report = buildBundledPlanContentDryRunParityReport({
      ...DRY_RUN_OPTIONS,
      verdict: 'activation_candidate' as never,
    });

    expect(validatePlanContentParityReport(report)).toEqual({ ok: true, errors: [] });
    expect(report.verdict).toBe('hold');
  });

  it('keeps the dry-run reporter disconnected from startup, network, storage and loader runtime', () => {
    const dryRunSource = fs.readFileSync(path.join(ROOT, 'app', 'plan_content_pack_dry_run.ts'), 'utf8');
    expect(dryRunSource).not.toMatch(/firebase|firestore|storage\(\)|upload|download|getDownloadURL|fetch\(|XMLHttpRequest|AsyncStorage|cloud_sync|course_pack_loader/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_pack_dry_run|PlanContentDryRunParity/i);
    }
  });
});
