import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ProductCopyApprovalPacket,
} from '../tools/personal_plan_gavan_week1_product_copy_approval_packet';
import {
  buildGavanWeek1ProductCopySignatureRequestPacket,
  GAVAN_WEEK1_PRODUCT_COPY_SIGNATURE_REQUEST_PACKET_PATH,
  writeGavanWeek1ProductCopySignatureRequestPacket,
} from '../tools/personal_plan_gavan_week1_product_copy_signature_request_packet';
import {
  blockedProductCopyApprovalPacket,
} from './personal_plan_gavan_week1_route_chain_fixtures';

const GENERATED_AT = '2026-06-03T05:10:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00c2\u00e2\ufffd]/;

function approvalPacket(): GavanWeek1ProductCopyApprovalPacket {
  return blockedProductCopyApprovalPacket();
}

describe('Gavan week 1 product copy signature request packet', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_PRODUCT_COPY_SIGNATURE_REQUEST_PACKET_PATH)) {
      rmSync(GAVAN_WEEK1_PRODUCT_COPY_SIGNATURE_REQUEST_PACKET_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1ProductCopySignatureRequestPacket(approvalPacket(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_PRODUCT_COPY_SIGNATURE_REQUEST_PACKET_PATH,
    });
  });

  it('builds a non-live signature request from a clean unsigned copy packet', () => {
    const result = buildGavanWeek1ProductCopySignatureRequestPacket(approvalPacket(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.request).toEqual(expect.objectContaining({
      kind: 'gavan_week1_product_copy_signature_request_packet',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'product_copy_signature_request_only_not_signed',
      sourcePacketStatus: 'product_copy_approval_packet_only_not_applied',
      targetWorkPackageId: 'product_copy_review',
      requiredOwnerRole: 'content_quality_owner',
      signatureStatus: 'missing',
      readyToRequestSignature: true,
      signatureMayBeInferred: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
      catalogRoutePlanningBlocked: true,
    }));
    expect(result.request?.phaseWriteTargets).toEqual([]);
    expect(result.request?.blockerStillOpen).toBe('missing_signature:product_copy');
  });

  it('summarizes evidence for the content quality owner without signing the packet', () => {
    const result = buildGavanWeek1ProductCopySignatureRequestPacket(approvalPacket(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.request?.evidenceSummary).toEqual({
      copyChecksPass: true,
      daysChecked: 6,
      daysPassing: 6,
      daysFailing: 0,
      totalCopyIssues: 0,
      blockingIssueCodes: [],
    });
    expect(result.request?.requestChecklist.length).toBeGreaterThanOrEqual(4);
    expect(result.request?.approvalInstruction).toContain('Do not mark this signed');
  });

  it('keeps signature request unavailable when copy checks fail', () => {
    const brokenPacket = {
      ...approvalPacket(),
      copyChecksPass: false,
      summary: {
        ...approvalPacket().summary,
        daysFailing: 1,
        totalIssues: 2,
        blockingIssueCodes: ['developer_or_robotic_copy'],
      },
    } as GavanWeek1ProductCopyApprovalPacket;

    const result = buildGavanWeek1ProductCopySignatureRequestPacket(brokenPacket, {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.request?.readyToRequestSignature).toBe(false);
    expect(result.request?.catalogRoutePlanningBlocked).toBe(true);
    expect(result.request?.requestBlockers).toEqual(expect.arrayContaining([
      'copy_checks_failed',
    ]));
  });

  it('rejects unsafe signed or source-writing packets instead of inferring approval', () => {
    const signedPacket = {
      ...approvalPacket(),
      signatureStatus: 'signed',
    } as unknown as GavanWeek1ProductCopyApprovalPacket;
    const unsafePacket = {
      ...approvalPacket(),
      sourceWritesUsed: true,
      phaseWriteTargets: ['app/personal_plan_catalog.ts'],
    } as unknown as GavanWeek1ProductCopyApprovalPacket;

    const signedResult = buildGavanWeek1ProductCopySignatureRequestPacket(signedPacket, {
      generatedAt: GENERATED_AT,
    });
    const unsafeResult = buildGavanWeek1ProductCopySignatureRequestPacket(unsafePacket, {
      generatedAt: GENERATED_AT,
    });

    expect(signedResult.valid).toBe(false);
    expect(signedResult.request).toBeUndefined();
    expect(signedResult.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'signature_already_present' }),
    ]));
    expect(unsafeResult.valid).toBe(false);
    expect(unsafeResult.request).toBeUndefined();
    expect(unsafeResult.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'source_writes_not_allowed' }),
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const result = writeGavanWeek1ProductCopySignatureRequestPacket(approvalPacket(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_PRODUCT_COPY_SIGNATURE_REQUEST_PACKET_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-product-copy-signature-request-packet.json',
    ));
    expect(existsSync(GAVAN_WEEK1_PRODUCT_COPY_SIGNATURE_REQUEST_PACKET_PATH)).toBe(true);

    const serialized = readFileSync(GAVAN_WEEK1_PRODUCT_COPY_SIGNATURE_REQUEST_PACKET_PATH, 'utf8');
    expect(serialized).not.toMatch(BROKEN_ENCODING_RE);

    const parsed = JSON.parse(serialized);
    expect(parsed.kind).toBe('gavan_week1_product_copy_signature_request_packet');
    expect(parsed.status).toBe('product_copy_signature_request_only_not_signed');
    expect(parsed.signatureStatus).toBe('missing');
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1ProductCopySignatureRequestPacket(approvalPacket(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-product-copy-signature-request-packet.json'),
    });
    const toolsResult = writeGavanWeek1ProductCopySignatureRequestPacket(approvalPacket(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-product-copy-signature-request-packet.json'),
    });
    const testsResult = writeGavanWeek1ProductCopySignatureRequestPacket(approvalPacket(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-product-copy-signature-request-packet.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_product_copy_signature_request_packet.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
