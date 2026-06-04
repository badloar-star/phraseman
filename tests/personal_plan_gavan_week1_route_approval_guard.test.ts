import fs from 'fs';
import path from 'path';

import type { GavanWeek1RouteSignatureRequestPacket } from '../tools/personal_plan_gavan_week1_route_signature_request_packet';
import {
  buildGavanWeek1RouteApprovalGuard,
  GAVAN_WEEK1_ROUTE_APPROVAL_GUARD_PATH,
  writeGavanWeek1RouteApprovalGuard,
} from '../tools/personal_plan_gavan_week1_route_approval_guard';

const GENERATED_AT = '2026-06-03T10:25:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00c2\u00e2\ufffd]/;

function requestPacket(): GavanWeek1RouteSignatureRequestPacket {
  return JSON.parse(fs.readFileSync(
    path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-route-signature-request-packet.json',
    ),
    'utf8',
  )) as GavanWeek1RouteSignatureRequestPacket;
}

describe('Gavan week 1 route approval guard', () => {
  it('builds a blocked unsigned approval guard from the route signature request', () => {
    const result = buildGavanWeek1RouteApprovalGuard(requestPacket(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.guard).toEqual(expect.objectContaining({
      kind: 'gavan_week1_route_approval_guard',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'route_approval_guard_blocked_unsigned',
      sourceRequestStatus: 'route_signature_request_blocked_not_signed',
      blockerStillOpen: 'missing_signature:product_copy',
      approved: false,
      readyForLive: false,
      signatureStatus: 'missing',
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      liveEditsAllowed: false,
      catalogRouteRegistrationAllowed: false,
      quizRouteRegistrationAllowed: false,
      uiRouteRegistrationAllowed: false,
    }));
  });

  it('defines the required signed approval metadata shape without approving it', () => {
    const result = buildGavanWeek1RouteApprovalGuard(requestPacket(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.guard?.requiredSignedApprovalMetadata).toEqual({
      reviewerName: 'required_non_empty_string',
      reviewerRole: 'route_quality_owner',
      approvedAtIso: 'required_iso_datetime',
      approvalScope: 'full_route_bundle',
      approvedEvidenceFilePaths: [
        '.codex-tmp/personal-plans/gavan-week1-catalog-adapter-design.json',
        '.codex-tmp/personal-plans/gavan-week1-quiz-adapter-design.json',
        '.codex-tmp/personal-plans/gavan-week1-ui-route-adapter-design.json',
        '.codex-tmp/personal-plans/gavan-week1-aggregate-route-readiness-gate.json',
      ],
      regressionScope: 'home_onboarding_premium_self_guided_carryover_completed_day',
      decisionText: 'required_non_empty_string',
    });
    expect(result.guard?.approvalMayBeInferred).toBe(false);
    expect(result.guard?.signedApprovalAcceptedInThisPass).toBe(false);
  });

  it('rejects missing reviewer name approval timestamp approved evidence paths and partial route approval', () => {
    const metadata = {
      reviewerName: '',
      reviewerRole: 'route_quality_owner',
      approvedAtIso: '',
      approvalScope: 'quiz_only',
      approvedEvidenceFilePaths: [
        '.codex-tmp/personal-plans/gavan-week1-quiz-adapter-design.json',
      ],
      regressionScope: 'quiz_only',
      decisionText: '',
    };

    const result = buildGavanWeek1RouteApprovalGuard(requestPacket(), {
      generatedAt: GENERATED_AT,
      signedApprovalMetadata: metadata,
    });

    expect(result.valid).toBe(false);
    expect(result.guard).toBeUndefined();
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'reviewer_name_missing' }),
      expect.objectContaining({ code: 'approval_timestamp_missing' }),
      expect.objectContaining({ code: 'approved_evidence_paths_incomplete' }),
      expect.objectContaining({ code: 'partial_route_approval_not_allowed' }),
      expect.objectContaining({ code: 'decision_text_missing' }),
    ]));
  });

  it('rejects unsafe signed or already-approved requests instead of opening routes', () => {
    const unsafeRequest = {
      ...requestPacket(),
      reviewerDecision: {
        ...requestPacket().reviewerDecision,
        approved: true,
        status: 'approved',
      },
    } as unknown as GavanWeek1RouteSignatureRequestPacket;
    const liveRequest = {
      ...requestPacket(),
      readyForLive: true,
      uiRouteRegistrationAllowed: true,
    } as unknown as GavanWeek1RouteSignatureRequestPacket;

    expect(buildGavanWeek1RouteApprovalGuard(unsafeRequest, {
      generatedAt: GENERATED_AT,
    }).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'request_already_approved' }),
    ]));
    expect(buildGavanWeek1RouteApprovalGuard(liveRequest, {
      generatedAt: GENERATED_AT,
    }).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'request_not_blocked' }),
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const result = writeGavanWeek1RouteApprovalGuard(requestPacket(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_ROUTE_APPROVAL_GUARD_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-route-approval-guard.json',
    ));
    expect(result.bytesWritten).toBeGreaterThan(1000);

    const serialized = fs.readFileSync(GAVAN_WEEK1_ROUTE_APPROVAL_GUARD_PATH, 'utf8');
    expect(serialized).not.toMatch(BROKEN_ENCODING_RE);
    const parsed = JSON.parse(serialized);
    expect(parsed.kind).toBe('gavan_week1_route_approval_guard');
    expect(parsed.status).toBe('route_approval_guard_blocked_unsigned');
    expect(parsed.approved).toBe(false);
  });

  it('rejects app tools tests and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'route-approval-guard.json'),
      path.join(process.cwd(), 'components', 'route-approval-guard.json'),
      path.join(process.cwd(), 'tools', 'route-approval-guard.json'),
      path.join(process.cwd(), 'tests', 'route-approval-guard.json'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1RouteApprovalGuard(requestPacket(), {
        generatedAt: GENERATED_AT,
        targetPath,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'target_path_not_allowed' }),
      ]));
    }
  });

  it('does not import or mutate live catalog quiz UI storage audio scoring or navigation', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_route_approval_guard.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
