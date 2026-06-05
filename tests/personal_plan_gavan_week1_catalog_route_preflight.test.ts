import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ApprovalReadinessManifest,
} from '../tools/personal_plan_gavan_week1_approval_readiness_manifest';
import type {
  GavanWeek1ProductCopySignatureRequestPacket,
} from '../tools/personal_plan_gavan_week1_product_copy_signature_request_packet';
import {
  buildGavanWeek1CatalogRoutePreflight,
  GAVAN_WEEK1_CATALOG_ROUTE_PREFLIGHT_PATH,
  writeGavanWeek1CatalogRoutePreflight,
} from '../tools/personal_plan_gavan_week1_catalog_route_preflight';
import { ensureGavanWeek1RoutePrerequisiteArtifacts } from '../tools/personal_plan_gavan_week1_route_prerequisite_artifact_refresh';

const GENERATED_AT = '2026-06-03T05:35:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00c2\u00e2\ufffd]/;

function signatureRequest(): GavanWeek1ProductCopySignatureRequestPacket {
  return JSON.parse(readFileSync(
    path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-product-copy-signature-request-packet.json',
    ),
    'utf8',
  ));
}

function manifest(): GavanWeek1ApprovalReadinessManifest {
  return JSON.parse(readFileSync(
    path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-approval-readiness-manifest.json',
    ),
    'utf8',
  ));
}

describe('Gavan week 1 catalog route preflight', () => {
  beforeAll(() => {
    ensureGavanWeek1RoutePrerequisiteArtifacts({ generatedAt: GENERATED_AT });
  });

  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_CATALOG_ROUTE_PREFLIGHT_PATH)) {
      rmSync(GAVAN_WEEK1_CATALOG_ROUTE_PREFLIGHT_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1CatalogRoutePreflight(signatureRequest(), manifest(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_CATALOG_ROUTE_PREFLIGHT_PATH,
    });
  });

  it('builds a non-live catalog preflight blocked by the missing product-copy signature', () => {
    const result = buildGavanWeek1CatalogRoutePreflight(signatureRequest(), manifest(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.preflight).toEqual(expect.objectContaining({
      kind: 'gavan_week1_catalog_route_preflight',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'catalog_route_preflight_blocked_by_product_copy_signature_not_applied',
      sourceSignatureRequestStatus: 'product_copy_signature_request_only_not_signed',
      signatureStatus: 'missing',
      requiredOwnerRole: 'content_quality_owner',
      catalogRoutePlanningBlocked: true,
      blockingDependency: 'missing_signature:product_copy',
      canOpenCatalogRouteTask: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
      catalogSourceEdited: false,
    }));
    expect(result.preflight?.phaseWriteTargets).toEqual([]);
  });

  it('lists approved day routes from the manifest without registering them', () => {
    const result = buildGavanWeek1CatalogRoutePreflight(signatureRequest(), manifest(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.preflight?.proposedRoutes).toHaveLength(6);
    expect(result.preflight?.proposedRoutes.map((route) => route.dayId)).toEqual([
      'gavan-week1-day2',
      'gavan-week1-day3',
      'gavan-week1-day4',
      'gavan-week1-day5',
      'gavan-week1-day6',
      'gavan-week1-day7',
    ]);
    result.preflight?.proposedRoutes.forEach((route) => {
      expect(route.routeStatus).toBe('blocked_not_registered');
      expect(route.productionRouteRegistered).toBe(false);
      expect(route.playable).toBe(false);
      expect(route.approvedArtifactPath).toContain(`gavan-week1-day${route.dayIndex}-approved-reviewer-export.json`);
    });
  });

  it('keeps route planning blocked even when the signature request is ready', () => {
    const result = buildGavanWeek1CatalogRoutePreflight(signatureRequest(), manifest(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.preflight?.inputSummary).toEqual({
      readyToRequestSignature: true,
      daysProposed: 6,
      totalApprovedRows: 98,
    });
    expect(result.preflight?.routeBlockers).toEqual([
      'missing_signature:product_copy',
    ]);
  });

  it('rejects signed unsafe or wrong-shape requests instead of unblocking catalog routes', () => {
    const signedRequest = {
      ...signatureRequest(),
      signatureStatus: 'signed',
      catalogRoutePlanningBlocked: false,
    } as unknown as GavanWeek1ProductCopySignatureRequestPacket;
    const unsafeRequest = {
      ...signatureRequest(),
      sourceWritesUsed: true,
      phaseWriteTargets: ['app/personal_plan_catalog.ts'],
    } as unknown as GavanWeek1ProductCopySignatureRequestPacket;

    const signedResult = buildGavanWeek1CatalogRoutePreflight(signedRequest, manifest(), {
      generatedAt: GENERATED_AT,
    });
    const unsafeResult = buildGavanWeek1CatalogRoutePreflight(unsafeRequest, manifest(), {
      generatedAt: GENERATED_AT,
    });

    expect(signedResult.valid).toBe(false);
    expect(signedResult.preflight).toBeUndefined();
    expect(signedResult.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'signature_not_missing' }),
    ]));
    expect(unsafeResult.valid).toBe(false);
    expect(unsafeResult.preflight).toBeUndefined();
    expect(unsafeResult.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'source_writes_not_allowed' }),
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const result = writeGavanWeek1CatalogRoutePreflight(signatureRequest(), manifest(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_CATALOG_ROUTE_PREFLIGHT_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-catalog-route-preflight.json',
    ));
    expect(existsSync(GAVAN_WEEK1_CATALOG_ROUTE_PREFLIGHT_PATH)).toBe(true);

    const serialized = readFileSync(GAVAN_WEEK1_CATALOG_ROUTE_PREFLIGHT_PATH, 'utf8');
    expect(serialized).not.toMatch(BROKEN_ENCODING_RE);

    const parsed = JSON.parse(serialized);
    expect(parsed.kind).toBe('gavan_week1_catalog_route_preflight');
    expect(parsed.status).toBe('catalog_route_preflight_blocked_by_product_copy_signature_not_applied');
    expect(parsed.catalogRoutePlanningBlocked).toBe(true);
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1CatalogRoutePreflight(signatureRequest(), manifest(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-catalog-route-preflight.json'),
    });
    const toolsResult = writeGavanWeek1CatalogRoutePreflight(signatureRequest(), manifest(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-catalog-route-preflight.json'),
    });
    const testsResult = writeGavanWeek1CatalogRoutePreflight(signatureRequest(), manifest(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-catalog-route-preflight.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_catalog_route_preflight.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
