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
  type GavanDay1FutureBridgeGuardReport,
} from '../tools/personal_plan_gavan_day1_future_bridge_guard';
import {
  buildGavanDay1LiveBridgePreflightReport,
  GAVAN_DAY1_LIVE_BRIDGE_PREFLIGHT_REPORT_PATH,
  writeGavanDay1LiveBridgePreflightReport,
} from '../tools/personal_plan_gavan_day1_live_bridge_preflight';

const REVIEWER_ID = 'content-reviewer-1';
const APPROVED_AT = '2026-06-01T12:00:00.000Z';
const GENERATED_AT = '2026-06-02T13:00:00.000Z';

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
    throw new Error('Expected dry-run manifest in live bridge preflight test setup.');
  }

  const diffResult = buildGavanDay1BridgeDiffPlan(manifestResult.manifest, {
    ...liveSources(),
    generatedAt: GENERATED_AT,
  });
  if (!diffResult.plan) {
    throw new Error('Expected diff plan in live bridge preflight test setup.');
  }

  return diffResult.plan;
}

function guardReport(plan = diffPlan()): GavanDay1FutureBridgeGuardReport {
  const result = buildGavanDay1FutureBridgeGuardReport(plan, {
    generatedAt: GENERATED_AT,
  });
  if (!result.report) {
    throw new Error('Expected guard report in live bridge preflight test setup.');
  }
  return result.report;
}

describe('Gavan day 1 live bridge preflight report', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_DAY1_LIVE_BRIDGE_PREFLIGHT_REPORT_PATH)) {
      rmSync(GAVAN_DAY1_LIVE_BRIDGE_PREFLIGHT_REPORT_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanDay1LiveBridgePreflightReport(diffPlan(), guardReport(), {
      ...liveSources(),
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_DAY1_LIVE_BRIDGE_PREFLIGHT_REPORT_PATH,
    });
  });

  it('confirms the live bridge is still blocked without approval metadata', () => {
    const result = buildGavanDay1LiveBridgePreflightReport(diffPlan(), guardReport(), {
      ...liveSources(),
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.report).toEqual(expect.objectContaining({
      kind: 'gavan_day1_live_bridge_preflight_report',
      generatedAt: GENERATED_AT,
      dayId: 'gavan-week1-day1',
      status: 'waiting_for_explicit_approval',
      liveBridgeCanApplyNow: false,
      approvalMetadataPresent: false,
      liveFilesContainCertifiedIds: false,
      futureDiffStable: true,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
    }));
    expect(result.report?.applyBlockedReasons).toContain('approval_metadata_missing');
    expect(result.report?.readOnlyFilesChecked).toEqual([
      'app/personal_plan_catalog.ts',
      'app/personal_plan_quizzes.ts',
    ]);
  });

  it('fails if current live files already contain certified Gavan day 1 ids', () => {
    const result = buildGavanDay1LiveBridgePreflightReport(diffPlan(), guardReport(), {
      ...liveSources(),
      catalogSource: `${liveSources().catalogSource}\n'gavan-day1-final-p1'\n`,
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(false);
    expect(result.report).toBeUndefined();
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'certified_ids_already_in_live_source',
        found: ['gavan-day1-final-p1'],
      }),
    ]);
  });

  it('fails if the future diff no longer matches the certified Gavan day 1 ids', () => {
    const [catalogEdit, quizEdit] = diffPlan().futureEdits;
    const changedDiffPlan = {
      ...diffPlan(),
      futureEdits: [
        { ...catalogEdit, proposedIds: ['gavan-day1-final-p1'] },
        quizEdit,
      ],
    };

    const result = buildGavanDay1LiveBridgePreflightReport(
      changedDiffPlan,
      guardReport(diffPlan()),
      {
        ...liveSources(),
        generatedAt: GENERATED_AT,
      },
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'future_diff_changed' }),
    ]);
  });

  it('fails if the guard report claims source writes were used in this phase', () => {
    const brokenGuard = {
      ...guardReport(),
      sourceWritesUsed: true,
      phaseWriteTargets: ['app/personal_plan_catalog.ts'],
    } as unknown as GavanDay1FutureBridgeGuardReport;

    const result = buildGavanDay1LiveBridgePreflightReport(diffPlan(), brokenGuard, {
      ...liveSources(),
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'dry_guard_policy_broken' }),
    ]);
  });

  it('writes deterministic preflight JSON only under temp or report roots', () => {
    const result = writeGavanDay1LiveBridgePreflightReport(diffPlan(), guardReport(), {
      ...liveSources(),
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_DAY1_LIVE_BRIDGE_PREFLIGHT_REPORT_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-day1-live-bridge-preflight-report.json',
    ));
    expect(existsSync(GAVAN_DAY1_LIVE_BRIDGE_PREFLIGHT_REPORT_PATH)).toBe(true);

    const parsed = JSON.parse(
      readFileSync(GAVAN_DAY1_LIVE_BRIDGE_PREFLIGHT_REPORT_PATH, 'utf8'),
    );
    expect(parsed.liveBridgeCanApplyNow).toBe(false);
    expect(parsed.sourceWritesUsed).toBe(false);
    expect(parsed.phaseWriteTargets).toEqual([]);
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanDay1LiveBridgePreflightReport(diffPlan(), guardReport(), {
      ...liveSources(),
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-day1-live-bridge-preflight.json'),
    });
    const toolsResult = writeGavanDay1LiveBridgePreflightReport(diffPlan(), guardReport(), {
      ...liveSources(),
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-day1-live-bridge-preflight.json'),
    });
    const testsResult = writeGavanDay1LiveBridgePreflightReport(diffPlan(), guardReport(), {
      ...liveSources(),
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-day1-live-bridge-preflight.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_day1_live_bridge_preflight.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toContain("from '../app/personal_plan_catalog'");
    expect(source).not.toContain("from '../app/personal_plan_quizzes'");
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz/);
  });
});
