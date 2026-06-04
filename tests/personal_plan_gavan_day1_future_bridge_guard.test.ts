import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import {
  generateGavanDay1ApprovedReportArtifact,
} from '../tools/personal_plan_gavan_day1_generated_artifact';
import {
  buildGavanDay1DryRunBridgeManifest,
} from '../tools/personal_plan_gavan_day1_dry_run_bridge_manifest';
import {
  buildGavanDay1BridgeDiffPlan,
  type GavanDay1BridgeDiffPlan,
} from '../tools/personal_plan_gavan_day1_bridge_diff_plan';
import {
  buildGavanDay1FutureBridgeGuardReport,
  GAVAN_DAY1_FUTURE_BRIDGE_GUARD_REPORT_PATH,
  writeGavanDay1FutureBridgeGuardReport,
} from '../tools/personal_plan_gavan_day1_future_bridge_guard';

const REVIEWER_ID = 'content-reviewer-1';
const APPROVED_AT = '2026-06-01T12:00:00.000Z';
const GENERATED_AT = '2026-06-02T12:30:00.000Z';

function liveSources() {
  return {
    catalogSource: readFileSync(path.join(process.cwd(), 'app', 'personal_plan_catalog.ts'), 'utf8'),
    quizSource: readFileSync(path.join(process.cwd(), 'app', 'personal_plan_quizzes.ts'), 'utf8'),
  };
}

function diffPlan(): GavanDay1BridgeDiffPlan {
  const artifact = generateGavanDay1ApprovedReportArtifact({
    reviewerId: REVIEWER_ID,
    approvedAt: APPROVED_AT,
    generatedAt: GENERATED_AT,
  }).artifact;
  const manifestResult = buildGavanDay1DryRunBridgeManifest(artifact, {
    generatedAt: GENERATED_AT,
  });
  if (!manifestResult.manifest) {
    throw new Error('Expected dry-run manifest in future bridge guard test setup.');
  }

  const diffResult = buildGavanDay1BridgeDiffPlan(manifestResult.manifest, {
    ...liveSources(),
    generatedAt: GENERATED_AT,
  });
  if (!diffResult.plan) {
    throw new Error('Expected diff plan in future bridge guard test setup.');
  }

  return diffResult.plan;
}

describe('Gavan day 1 future bridge guard report', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_DAY1_FUTURE_BRIDGE_GUARD_REPORT_PATH)) {
      rmSync(GAVAN_DAY1_FUTURE_BRIDGE_GUARD_REPORT_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanDay1FutureBridgeGuardReport(diffPlan(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_DAY1_FUTURE_BRIDGE_GUARD_REPORT_PATH,
    });
  });

  it('turns the non-applied diff plan into a guarded dry implementation checklist', () => {
    const result = buildGavanDay1FutureBridgeGuardReport(diffPlan(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.report).toEqual(expect.objectContaining({
      kind: 'gavan_day1_future_bridge_guard_report',
      generatedAt: GENERATED_AT,
      dayId: 'gavan-week1-day1',
      status: 'guarded_not_applied',
      approvalRequiredBeforeApply: true,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
    }));
    expect(result.report?.requiredCatalogUnitIds).toEqual([
      'gavan-day1-final-p1',
      'gavan-day1-final-p2',
      'gavan-day1-final-p3',
      'gavan-day1-final-p4',
      'gavan-day1-final-p5',
    ]);
    expect(result.report?.requiredQuizId).toBe('gavan-week1-day1-quiz');
    expect(result.report?.readOnlyFutureTargets).toEqual([
      'app/personal_plan_catalog.ts',
      'app/personal_plan_quizzes.ts',
    ]);
    expect(result.report?.checklist.every((item) => item.state === 'blocked_until_approval')).toBe(true);
  });

  it('fails if a future bridge plan is marked applied without explicit approval metadata', () => {
    const appliedPlan = {
      ...diffPlan(),
      applied: true,
      liveIntegration: true,
    } as unknown as GavanDay1BridgeDiffPlan;

    const result = buildGavanDay1FutureBridgeGuardReport(appliedPlan, {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(false);
    expect(result.report).toBeUndefined();
    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'applied_without_explicit_approval' }),
    ]);
  });

  it('fails if catalog ids are missing from the future diff plan', () => {
    const [catalogEdit, quizEdit] = diffPlan().futureEdits;
    const missingCatalogIdsPlan = {
      ...diffPlan(),
      futureEdits: [
        { ...catalogEdit, proposedIds: ['gavan-day1-final-p1'] },
        quizEdit,
      ],
    };

    const result = buildGavanDay1FutureBridgeGuardReport(missingCatalogIdsPlan, {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'missing_catalog_unit_ids' }),
    ]);
  });

  it('fails if quiz id or quiz registry target is missing', () => {
    const [catalogEdit, quizEdit] = diffPlan().futureEdits;
    const missingQuizPlan = {
      ...diffPlan(),
      futureEdits: [
        catalogEdit,
        {
          ...quizEdit,
          insertionPoint: 'PLAN_QUIZZES',
          proposedIds: [],
        },
      ],
    };

    const result = buildGavanDay1FutureBridgeGuardReport(missingQuizPlan, {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing_quiz_id' }),
      expect.objectContaining({ code: 'missing_quiz_registry_target' }),
    ]));
  });

  it('writes a deterministic dry report only under temp or report roots', () => {
    const result = writeGavanDay1FutureBridgeGuardReport(diffPlan(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_DAY1_FUTURE_BRIDGE_GUARD_REPORT_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-day1-future-bridge-guard-report.json',
    ));
    expect(existsSync(GAVAN_DAY1_FUTURE_BRIDGE_GUARD_REPORT_PATH)).toBe(true);

    const parsed = JSON.parse(
      readFileSync(GAVAN_DAY1_FUTURE_BRIDGE_GUARD_REPORT_PATH, 'utf8'),
    );
    expect(parsed.kind).toBe('gavan_day1_future_bridge_guard_report');
    expect(parsed.sourceWritesUsed).toBe(false);
    expect(parsed.phaseWriteTargets).toEqual([]);
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanDay1FutureBridgeGuardReport(diffPlan(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-day1-future-bridge-guard-report.json'),
    });
    const toolsResult = writeGavanDay1FutureBridgeGuardReport(diffPlan(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-day1-future-bridge-guard-report.json'),
    });
    const testsResult = writeGavanDay1FutureBridgeGuardReport(diffPlan(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-day1-future-bridge-guard-report.json'),
    });

    expect(appResult.valid).toBe(false);
    expect(toolsResult.valid).toBe(false);
    expect(testsResult.valid).toBe(false);
    expect(appResult.issues[0].code).toBe('target_path_not_allowed');
    expect(toolsResult.issues[0].code).toBe('target_path_not_allowed');
    expect(testsResult.issues[0].code).toBe('target_path_not_allowed');
  });

  it('does not import or mutate live catalog quiz UI storage audio scoring or navigation', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_day1_future_bridge_guard.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toContain("from '../app/personal_plan_catalog'");
    expect(source).not.toContain("from '../app/personal_plan_quizzes'");
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz/);
  });
});
