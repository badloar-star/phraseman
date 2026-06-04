import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import {
  generateGavanDay1ApprovedReportArtifact,
} from '../tools/personal_plan_gavan_day1_generated_artifact';
import {
  buildGavanDay1DryRunBridgeManifest,
  type GavanDay1DryRunBridgeManifest,
} from '../tools/personal_plan_gavan_day1_dry_run_bridge_manifest';
import {
  buildGavanDay1BridgeDiffPlan,
  GAVAN_DAY1_BRIDGE_DIFF_PLAN_PATH,
  writeGavanDay1BridgeDiffPlan,
} from '../tools/personal_plan_gavan_day1_bridge_diff_plan';

const REVIEWER_ID = 'content-reviewer-1';
const APPROVED_AT = '2026-06-01T12:00:00.000Z';
const GENERATED_AT = '2026-06-02T12:00:00.000Z';

function manifest(): GavanDay1DryRunBridgeManifest {
  const artifact = generateGavanDay1ApprovedReportArtifact({
    reviewerId: REVIEWER_ID,
    approvedAt: APPROVED_AT,
    generatedAt: GENERATED_AT,
  }).artifact;
  const result = buildGavanDay1DryRunBridgeManifest(artifact, {
    generatedAt: GENERATED_AT,
  });
  if (!result.manifest) {
    throw new Error('Expected dry-run manifest in diff-plan test setup.');
  }
  return result.manifest;
}

function liveSources() {
  return {
    catalogSource: readFileSync(path.join(process.cwd(), 'app', 'personal_plan_catalog.ts'), 'utf8'),
    quizSource: readFileSync(path.join(process.cwd(), 'app', 'personal_plan_quizzes.ts'), 'utf8'),
  };
}

describe('Gavan day 1 non-applied bridge diff plan', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_DAY1_BRIDGE_DIFF_PLAN_PATH)) {
      rmSync(GAVAN_DAY1_BRIDGE_DIFF_PLAN_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanDay1BridgeDiffPlan(manifest(), {
      ...liveSources(),
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_DAY1_BRIDGE_DIFF_PLAN_PATH,
    });
  });

  it('maps the dry-run manifest to recognized live catalog and quiz insertion points', () => {
    const result = buildGavanDay1BridgeDiffPlan(manifest(), {
      ...liveSources(),
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.plan).toEqual(expect.objectContaining({
      kind: 'gavan_day1_bridge_diff_plan',
      generatedAt: GENERATED_AT,
      liveIntegration: false,
      status: 'ready',
      applied: false,
    }));
    expect(result.plan?.sourceShape.catalog).toEqual(expect.objectContaining({
      recognized: true,
      hasCatalogExport: true,
      hasGavanDefinition: true,
      hasGenerateDaysCall: true,
    }));
    expect(result.plan?.sourceShape.quiz).toEqual(expect.objectContaining({
      recognized: true,
      hasPlanQuizzesRegistry: true,
      hasCoverageRegistry: true,
      hasTaskCopyRegistry: true,
    }));
  });

  it('lists exact future edits and marks every edit not_applied', () => {
    const result = buildGavanDay1BridgeDiffPlan(manifest(), {
      ...liveSources(),
      generatedAt: GENERATED_AT,
    });

    expect(result.plan?.futureEdits).toEqual([
      expect.objectContaining({
        targetFile: 'app/personal_plan_catalog.ts',
        editMode: 'not_applied',
        insertionPoint: 'PERSONAL_PLAN_CATALOG[gavan].days',
        proposedIds: [
          'gavan-day1-final-p1',
          'gavan-day1-final-p2',
          'gavan-day1-final-p3',
          'gavan-day1-final-p4',
          'gavan-day1-final-p5',
        ],
      }),
      expect.objectContaining({
        targetFile: 'app/personal_plan_quizzes.ts',
        editMode: 'not_applied',
        insertionPoint: 'PLAN_QUIZZES / PLAN_QUIZ_COVERAGE / PLAN_QUIZ_TASK_COPY',
        proposedIds: ['gavan-week1-day1-quiz'],
      }),
    ]);
    expect(result.plan?.futureEdits.every((edit) => edit.editMode === 'not_applied')).toBe(true);
    expect(result.plan?.futureEdits.every((edit) => edit.applied === false)).toBe(true);
  });

  it('reports blockers if live file shape cannot be recognized', () => {
    const result = buildGavanDay1BridgeDiffPlan(manifest(), {
      catalogSource: 'export const BROKEN = [];',
      quizSource: 'export const ALSO_BROKEN = {};',
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(false);
    expect(result.plan).toBeUndefined();
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'catalog_shape_unrecognized' }),
      expect.objectContaining({ code: 'quiz_shape_unrecognized' }),
    ]));
  });

  it('writes deterministic JSON only under allowed temp or report roots', () => {
    const result = writeGavanDay1BridgeDiffPlan(manifest(), {
      ...liveSources(),
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_DAY1_BRIDGE_DIFF_PLAN_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-day1-bridge-diff-plan.json',
    ));
    expect(existsSync(GAVAN_DAY1_BRIDGE_DIFF_PLAN_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_DAY1_BRIDGE_DIFF_PLAN_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_day1_bridge_diff_plan');
    expect(parsed.applied).toBe(false);
    expect(parsed.status).toBe('ready');
  });

  it('rejects source tooling test and root config write targets', () => {
    const appResult = writeGavanDay1BridgeDiffPlan(manifest(), {
      ...liveSources(),
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-day1-bridge-diff-plan.json'),
    });
    const toolResult = writeGavanDay1BridgeDiffPlan(manifest(), {
      ...liveSources(),
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-day1-bridge-diff-plan.json'),
    });
    const testResult = writeGavanDay1BridgeDiffPlan(manifest(), {
      ...liveSources(),
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-day1-bridge-diff-plan.json'),
    });

    expect(appResult.valid).toBe(false);
    expect(toolResult.valid).toBe(false);
    expect(testResult.valid).toBe(false);
    expect(appResult.issues[0].code).toBe('target_path_not_allowed');
    expect(toolResult.issues[0].code).toBe('target_path_not_allowed');
    expect(testResult.issues[0].code).toBe('target_path_not_allowed');
  });

  it('does not import or mutate live catalog quiz UI storage audio scoring or navigation', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_day1_bridge_diff_plan.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toContain("from '../app/personal_plan_catalog'");
    expect(source).not.toContain("from '../app/personal_plan_quizzes'");
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz/);
  });
});
