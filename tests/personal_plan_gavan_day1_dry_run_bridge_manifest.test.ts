import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import type {
  GavanDay1ApprovedReportArtifact,
} from '../tools/personal_plan_gavan_day1_approved_report_artifact';
import {
  generateGavanDay1ApprovedReportArtifact,
} from '../tools/personal_plan_gavan_day1_generated_artifact';
import {
  buildGavanDay1DryRunBridgeManifest,
  GAVAN_DAY1_DRY_RUN_BRIDGE_MANIFEST_PATH,
  writeGavanDay1DryRunBridgeManifest,
} from '../tools/personal_plan_gavan_day1_dry_run_bridge_manifest';

const REVIEWER_ID = 'content-reviewer-1';
const APPROVED_AT = '2026-06-01T12:00:00.000Z';
const GENERATED_AT = '2026-06-02T10:00:00.000Z';

function cleanArtifact(): GavanDay1ApprovedReportArtifact {
  return generateGavanDay1ApprovedReportArtifact({
    reviewerId: REVIEWER_ID,
    approvedAt: APPROVED_AT,
    generatedAt: GENERATED_AT,
  }).artifact;
}

function blockedArtifact(): GavanDay1ApprovedReportArtifact {
  const artifact = JSON.parse(JSON.stringify(cleanArtifact())) as GavanDay1ApprovedReportArtifact;
  artifact.report.groups.quizPrompts[0].textChecksum = 'fnv1a:00000000';
  return artifact;
}

describe('Gavan day 1 dry-run production bridge manifest', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_DAY1_DRY_RUN_BRIDGE_MANIFEST_PATH)) {
      rmSync(GAVAN_DAY1_DRY_RUN_BRIDGE_MANIFEST_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanDay1DryRunBridgeManifest(cleanArtifact(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_DAY1_DRY_RUN_BRIDGE_MANIFEST_PATH,
    });
  });

  it('builds a deterministic non-live manifest only from a readiness-ready artifact', () => {
    const result = buildGavanDay1DryRunBridgeManifest(cleanArtifact(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.manifest).toEqual(expect.objectContaining({
      kind: 'gavan_day1_dry_run_bridge_manifest',
      manifestVersion: 1,
      dayId: 'gavan-week1-day1',
      liveIntegration: false,
      generatedAt: GENERATED_AT,
    }));
    expect(result.manifest?.readiness.status).toBe('ready');
    expect(result.manifest?.readiness.canDraftProductionBridge).toBe(true);
  });

  it('lists proposed catalog units quiz ids and future source files without live imports', () => {
    const result = buildGavanDay1DryRunBridgeManifest(cleanArtifact(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.manifest?.proposedFiles).toEqual([
      {
        path: 'app/personal_plan_catalog.ts',
        purpose: 'future_add_personal_plan_content_units',
        editMode: 'not_applied',
      },
      {
        path: 'app/personal_plan_quizzes.ts',
        purpose: 'future_add_personal_plan_quiz',
        editMode: 'not_applied',
      },
    ]);
    expect(result.manifest?.proposedCatalogUnits.map((unit) => unit.id)).toEqual([
      'gavan-day1-final-p1',
      'gavan-day1-final-p2',
      'gavan-day1-final-p3',
      'gavan-day1-final-p4',
      'gavan-day1-final-p5',
    ]);
    expect(result.manifest?.proposedCatalogUnits[0]).toEqual(expect.objectContaining({
      sourceSnippetId: 'phrase:gavan-day1-final-p1:explanation-1',
      coveredTargets: ['here', "I'm"],
      exactText: expect.stringContaining("I'm here."),
    }));
    expect(result.manifest?.proposedQuiz).toEqual(expect.objectContaining({
      id: 'gavan-week1-day1-quiz',
      itemIds: [
        'item-1',
        'item-2',
        'item-3',
        'item-4',
        'item-5',
        'item-6',
        'item-7',
        'item-8',
        'item-9',
        'item-10',
      ],
    }));
    expect(result.manifest?.proposedQuiz.promptSnippetIds).toHaveLength(10);
    expect(result.manifest?.proposedQuiz.noteSnippetIds).toHaveLength(30);
  });

  it('refuses to build a manifest from blocked readiness', () => {
    const result = buildGavanDay1DryRunBridgeManifest(blockedArtifact(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(false);
    expect(result.manifest).toBeUndefined();
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'readiness_blocked',
        blocker: 'approved_report',
      }),
    ]));
  });

  it('writes the manifest only under allowed temp or report roots', () => {
    const result = writeGavanDay1DryRunBridgeManifest(cleanArtifact(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_DAY1_DRY_RUN_BRIDGE_MANIFEST_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-day1-dry-run-bridge-manifest.json',
    ));
    expect(existsSync(GAVAN_DAY1_DRY_RUN_BRIDGE_MANIFEST_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_DAY1_DRY_RUN_BRIDGE_MANIFEST_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_day1_dry_run_bridge_manifest');
    expect(parsed.liveIntegration).toBe(false);
    expect(parsed.readiness.status).toBe('ready');
  });

  it('rejects source and tooling write targets', () => {
    const appResult = writeGavanDay1DryRunBridgeManifest(cleanArtifact(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-day1-dry-run-bridge-manifest.json'),
    });
    const toolResult = writeGavanDay1DryRunBridgeManifest(cleanArtifact(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-day1-dry-run-bridge-manifest.json'),
    });
    const testResult = writeGavanDay1DryRunBridgeManifest(cleanArtifact(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-day1-dry-run-bridge-manifest.json'),
    });

    expect(appResult.valid).toBe(false);
    expect(toolResult.valid).toBe(false);
    expect(testResult.valid).toBe(false);
    expect(appResult.issues[0].code).toBe('target_path_not_allowed');
    expect(toolResult.issues[0].code).toBe('target_path_not_allowed');
    expect(testResult.issues[0].code).toBe('target_path_not_allowed');
  });

  it('does not import live catalog live quizzes UI storage audio scoring or navigation', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_day1_dry_run_bridge_manifest.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toContain("from '../app/personal_plan_catalog'");
    expect(source).not.toContain("from '../app/personal_plan_quizzes'");
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz/);
  });
});
