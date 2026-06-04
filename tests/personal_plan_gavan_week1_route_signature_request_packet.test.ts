import fs from 'fs';
import path from 'path';

import type { GavanWeek1AggregateRouteReadinessGate } from '../tools/personal_plan_gavan_week1_aggregate_route_readiness_gate';
import {
  buildGavanWeek1RouteSignatureRequestPacket,
  GAVAN_WEEK1_ROUTE_SIGNATURE_REQUEST_PACKET_PATH,
  writeGavanWeek1RouteSignatureRequestPacket,
} from '../tools/personal_plan_gavan_week1_route_signature_request_packet';

const GENERATED_AT = '2026-06-03T09:55:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00c2\u00e2\ufffd]/;

function aggregateGate(): GavanWeek1AggregateRouteReadinessGate {
  return JSON.parse(fs.readFileSync(
    path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-aggregate-route-readiness-gate.json',
    ),
    'utf8',
  )) as GavanWeek1AggregateRouteReadinessGate;
}

describe('Gavan week 1 route signature request packet', () => {
  it('builds a blocked unsigned route signature request from aggregate readiness', () => {
    const result = buildGavanWeek1RouteSignatureRequestPacket(aggregateGate(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.request).toEqual(expect.objectContaining({
      kind: 'gavan_week1_route_signature_request_packet',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'route_signature_request_blocked_not_signed',
      sourceGateStatus: 'aggregate_route_readiness_blocked_not_applied',
      blockerStillOpen: 'missing_signature:product_copy',
      signatureStatus: 'missing',
      readyForLive: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      liveEditsAllowed: false,
      catalogRouteRegistrationAllowed: false,
      quizRouteRegistrationAllowed: false,
      uiRouteRegistrationAllowed: false,
      signatureMayBeInferred: false,
    }));
  });

  it('summarizes catalog quiz UI regression blockers and live criteria for reviewer', () => {
    const result = buildGavanWeek1RouteSignatureRequestPacket(aggregateGate(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.request?.reviewerSummary).toEqual({
      catalogDayMappingCount: 6,
      blockedCatalogMappings: 6,
      quizRouteDesignCount: 6,
      tenQuestionQuizCount: 6,
      uiOpeningContractCount: 5,
      coveredUiOpeningContractCount: 5,
      regressionGateCount: 7,
      routeBlockerCount: 5,
      liveAcceptanceCriterionCount: 4,
      readyForLive: false,
    });
    expect(result.request?.routeBlockerIds).toEqual([
      'missing_signature:product_copy',
      'catalog_routes_not_registered',
      'quiz_routes_not_registered',
      'ui_routes_not_registered',
      'live_regression_not_run',
    ]);
  });

  it('includes exact evidence paths for all route-design artifacts', () => {
    const result = buildGavanWeek1RouteSignatureRequestPacket(aggregateGate(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.request?.evidenceFilePaths).toEqual({
      catalogAdapterDesign: '.codex-tmp/personal-plans/gavan-week1-catalog-adapter-design.json',
      quizAdapterDesign: '.codex-tmp/personal-plans/gavan-week1-quiz-adapter-design.json',
      uiRouteAdapterDesign: '.codex-tmp/personal-plans/gavan-week1-ui-route-adapter-design.json',
      aggregateRouteReadinessGate: '.codex-tmp/personal-plans/gavan-week1-aggregate-route-readiness-gate.json',
    });
  });

  it('requires reviewer decision without filling approval as true', () => {
    const result = buildGavanWeek1RouteSignatureRequestPacket(aggregateGate(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.request?.reviewerDecision).toEqual({
      required: true,
      status: 'not_reviewed',
      approved: false,
      approvedBy: null,
      approvedAt: null,
      signatureArtifactRequired: true,
    });
    expect(result.request?.approvalInstruction).toContain('Do not mark this route request approved');
  });

  it('rejects unsafe or already-live gates instead of inferring approval', () => {
    const unsafeGate = {
      ...aggregateGate(),
      readyForLive: true,
      uiRouteRegistrationAllowed: true,
    } as unknown as GavanWeek1AggregateRouteReadinessGate;
    const wrongStatusGate = {
      ...aggregateGate(),
      status: 'aggregate_route_readiness_ready',
    } as unknown as GavanWeek1AggregateRouteReadinessGate;

    expect(buildGavanWeek1RouteSignatureRequestPacket(unsafeGate, {
      generatedAt: GENERATED_AT,
    }).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'aggregate_gate_not_blocked' }),
    ]));
    expect(buildGavanWeek1RouteSignatureRequestPacket(wrongStatusGate, {
      generatedAt: GENERATED_AT,
    }).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'wrong_gate_status' }),
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const result = writeGavanWeek1RouteSignatureRequestPacket(aggregateGate(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_ROUTE_SIGNATURE_REQUEST_PACKET_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-route-signature-request-packet.json',
    ));
    expect(result.bytesWritten).toBeGreaterThan(1000);

    const serialized = fs.readFileSync(GAVAN_WEEK1_ROUTE_SIGNATURE_REQUEST_PACKET_PATH, 'utf8');
    expect(serialized).not.toMatch(BROKEN_ENCODING_RE);
    const parsed = JSON.parse(serialized);
    expect(parsed.kind).toBe('gavan_week1_route_signature_request_packet');
    expect(parsed.status).toBe('route_signature_request_blocked_not_signed');
    expect(parsed.reviewerDecision.approved).toBe(false);
  });

  it('rejects app tools tests and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'route-signature-request.json'),
      path.join(process.cwd(), 'components', 'route-signature-request.json'),
      path.join(process.cwd(), 'tools', 'route-signature-request.json'),
      path.join(process.cwd(), 'tests', 'route-signature-request.json'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1RouteSignatureRequestPacket(aggregateGate(), {
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_route_signature_request_packet.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
