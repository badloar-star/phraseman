import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1BlockerResolutionRoadmap,
} from '../tools/personal_plan_gavan_week1_blocker_resolution_roadmap';
import {
  buildGavanWeek1ProductCopyApprovalPacket,
  GAVAN_WEEK1_PRODUCT_COPY_APPROVAL_PACKET_PATH,
  writeGavanWeek1ProductCopyApprovalPacket,
} from '../tools/personal_plan_gavan_week1_product_copy_approval_packet';
import {
  blockedBlockerResolutionRoadmap,
  approvedProductCopyArtifacts,
} from './personal_plan_gavan_week1_route_chain_fixtures';

const GENERATED_AT = '2026-06-03T04:45:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00c2\u00e2\ufffd]/;

function roadmap(): GavanWeek1BlockerResolutionRoadmap {
  return blockedBlockerResolutionRoadmap();
}

function approvedArtifacts(): unknown[] {
  return approvedProductCopyArtifacts();
}

describe('Gavan week 1 product copy approval packet', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_PRODUCT_COPY_APPROVAL_PACKET_PATH)) {
      rmSync(GAVAN_WEEK1_PRODUCT_COPY_APPROVAL_PACKET_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1ProductCopyApprovalPacket(roadmap(), approvedArtifacts(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_PRODUCT_COPY_APPROVAL_PACKET_PATH,
    });
  });

  it('builds a non-live product copy packet from the first roadmap package', () => {
    const result = buildGavanWeek1ProductCopyApprovalPacket(roadmap(), approvedArtifacts(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.packet).toEqual(expect.objectContaining({
      kind: 'gavan_week1_product_copy_approval_packet',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'product_copy_approval_packet_only_not_applied',
      targetWorkPackageId: 'product_copy_review',
      signatureStatus: 'missing',
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      liveEditsAllowed: false,
    }));
    expect(result.packet?.targetBlockerIds).toEqual(['missing_signature:product_copy']);
  });

  it('keeps approval missing even when current approved artifacts pass copy checks', () => {
    const result = buildGavanWeek1ProductCopyApprovalPacket(roadmap(), approvedArtifacts(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.packet?.approvalReady).toBe(false);
    expect(result.packet?.copyChecksPass).toBe(true);
    expect(result.packet?.summary.daysChecked).toBe(6);
    expect(result.packet?.summary.daysPassing).toBe(6);
    expect(result.packet?.summary.daysFailing).toBe(0);
    expect(result.packet?.summary.blockingIssueCodes).toEqual([]);
    expect(result.packet?.dayChecks.find((day) => day.dayId === 'gavan-week1-day2')?.issues).toEqual([]);
  });

  it('checks the specific product copy dimensions that must gate future routes', () => {
    const artifact = JSON.parse(JSON.stringify(approvedArtifacts()[0]));
    artifact.contentUnitRows[0].english = 'My phone number is 087...';
    artifact.contentUnitRows[0].meaningRu = 'My phone number is 087...';
    artifact.explanationRows[0].body = 'DEV placeholder: you chose the wrong option.';
    artifact.explanationRows[0].wrongAnswerSafe = false;
    artifact.exerciseRows[0].purpose = 'Build this scenario for the route.';

    const result = buildGavanWeek1ProductCopyApprovalPacket(roadmap(), [artifact], {
      generatedAt: GENERATED_AT,
    });
    const issueCodes = result.packet?.dayChecks[0].issues.map((issue) => issue.code) ?? [];

    expect(issueCodes).toEqual(expect.arrayContaining([
      'narrow_anchor_present',
      'developer_or_robotic_copy',
      'fake_selected_answer_context',
      'wrong_answer_context_not_safe',
      'forbidden_user_facing_term',
    ]));
  });

  it('rejects unsafe roadmaps and missing product copy packages', () => {
    const unsafeRoadmap = {
      ...roadmap(),
      sourceWritesUsed: true,
      phaseWriteTargets: ['app/personal_plan_catalog.ts'],
    } as unknown as GavanWeek1BlockerResolutionRoadmap;
    const missingPackageRoadmap = {
      ...roadmap(),
      workPackages: roadmap().workPackages.filter((workPackage) =>
        workPackage.id !== 'product_copy_review'
      ),
    };

    const unsafeResult = buildGavanWeek1ProductCopyApprovalPacket(unsafeRoadmap, approvedArtifacts(), {
      generatedAt: GENERATED_AT,
    });
    const missingPackageResult = buildGavanWeek1ProductCopyApprovalPacket(
      missingPackageRoadmap,
      approvedArtifacts(),
      { generatedAt: GENERATED_AT },
    );

    expect(unsafeResult.valid).toBe(false);
    expect(unsafeResult.packet).toBeUndefined();
    expect(unsafeResult.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'source_writes_not_allowed' }),
    ]));
    expect(missingPackageResult.valid).toBe(false);
    expect(missingPackageResult.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'product_copy_package_missing' }),
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const result = writeGavanWeek1ProductCopyApprovalPacket(roadmap(), approvedArtifacts(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_PRODUCT_COPY_APPROVAL_PACKET_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-product-copy-approval-packet.json',
    ));
    expect(existsSync(GAVAN_WEEK1_PRODUCT_COPY_APPROVAL_PACKET_PATH)).toBe(true);

    const serialized = readFileSync(GAVAN_WEEK1_PRODUCT_COPY_APPROVAL_PACKET_PATH, 'utf8');
    expect(serialized).not.toMatch(BROKEN_ENCODING_RE);

    const parsed = JSON.parse(serialized);
    expect(parsed.kind).toBe('gavan_week1_product_copy_approval_packet');
    expect(parsed.status).toBe('product_copy_approval_packet_only_not_applied');
    expect(parsed.signatureStatus).toBe('missing');
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1ProductCopyApprovalPacket(roadmap(), approvedArtifacts(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-product-copy-approval-packet.json'),
    });
    const toolsResult = writeGavanWeek1ProductCopyApprovalPacket(roadmap(), approvedArtifacts(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-product-copy-approval-packet.json'),
    });
    const testsResult = writeGavanWeek1ProductCopyApprovalPacket(roadmap(), approvedArtifacts(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-product-copy-approval-packet.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_product_copy_approval_packet.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
