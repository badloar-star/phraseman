import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1RouteRegistrationImplementationPreflightV2,
} from './personal_plan_gavan_week1_route_registration_implementation_preflight_v2';

export const GAVAN_WEEK1_LIVE_ROUTE_REGRESSION_EVIDENCE_PREFLIGHT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-live-route-regression-evidence-preflight.json',
);

type PreflightStatus =
  | 'blocked_before_source_registration_plan'
  | 'blocked_invalid_route_registration_preflight'
  | 'regression_evidence_plan_ready_non_live';

type IssueCode =
  | 'wrong_registration_preflight_kind'
  | 'wrong_plan_or_week'
  | 'registration_preflight_not_non_live'
  | 'target_path_not_allowed';

type RegressionSuiteId =
  | 'home_onboarding_regression'
  | 'premium_gate_regression'
  | 'catalog_route_regression'
  | 'quiz_route_regression'
  | 'ui_opening_route_regression'
  | 'self_guided_carryover_regression'
  | 'completed_day_state_regression';

type DeviceCheckId =
  | 'open_plan_screen'
  | 'open_day_task_surface'
  | 'open_catalog_route'
  | 'open_quiz_route'
  | 'open_renderer_route';

export type GavanWeek1LiveRouteRegressionEvidencePreflightIssue = {
  code: IssueCode;
  detail: string;
};

export type GavanWeek1LiveRouteRegressionEvidencePreflightBlocker = {
  code: string;
  blocksProduction: true;
  detail: string;
};

export type GavanWeek1RouteRegressionSuite = {
  id: RegressionSuiteId;
  status: 'blocked_not_run';
  requiredAfterSourceRegistration: true;
};

export type GavanWeek1RouteDeviceCheck = {
  id: DeviceCheckId;
  status: 'blocked_not_verified';
  requiredAfterSourceRegistration: true;
};

export type GavanWeek1LiveRouteRegressionEvidencePreflight = {
  kind: 'gavan_week1_live_route_regression_evidence_preflight';
  generatedAt: string;
  evidenceOwnerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceRegistrationPreflightStatus: GavanWeek1RouteRegistrationImplementationPreflightV2['status'];
  status: PreflightStatus;
  releaseDecision: 'hold';
  regressionEvidenceReady: false;
  deviceEvidenceReady: false;
  sourceRegistrationPlanReady: boolean;
  routeRegistrationComplete: false;
  readyForLive: false;
  productionReady: false;
  sourceWritesUsed: false;
  liveEditsAllowed: false;
  regressionSuites: GavanWeek1RouteRegressionSuite[];
  deviceChecks: GavanWeek1RouteDeviceCheck[];
  summary: {
    regressionSuiteCount: number;
    blockedRegressionSuiteCount: number;
    deviceCheckCount: number;
    blockedDeviceCheckCount: number;
    routeFamilyCount: number;
    routeRegistrationComplete: false;
    inheritedImplementationBlockerCount: number;
    evidenceBlockerCount: number;
  };
  blockers: GavanWeek1LiveRouteRegressionEvidencePreflightBlocker[];
  requiredNextActions: string[];
  writePolicy: {
    allowedTargetRoots: ['.codex-tmp', 'docs/reports'];
    sourceWritesAllowed: false;
    liveWritesAllowed: false;
  };
};

export type BuildOptions = {
  generatedAt: string;
  evidenceOwnerId: string;
};

export type WriteOptions = BuildOptions & {
  targetPath: string;
};

export type BuildResult = {
  valid: boolean;
  issues: GavanWeek1LiveRouteRegressionEvidencePreflightIssue[];
  preflight: GavanWeek1LiveRouteRegressionEvidencePreflight;
};

export type WriteResult = {
  valid: boolean;
  issues: GavanWeek1LiveRouteRegressionEvidencePreflightIssue[];
  targetPath?: string;
  bytesWritten?: number;
  preflight?: GavanWeek1LiveRouteRegressionEvidencePreflight;
};

const TARGET_PATH_NOT_ALLOWED_DETAIL =
  'Live route regression evidence preflight can only write under .codex-tmp or docs/reports.';

function issue(code: IssueCode, detail: string): GavanWeek1LiveRouteRegressionEvidencePreflightIssue {
  return { code, detail };
}

function isAllowedTargetPath(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  const roots = [
    path.resolve(process.cwd(), '.codex-tmp'),
    path.resolve(process.cwd(), 'docs', 'reports'),
  ];

  return roots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));
}

function validateRegistrationPreflight(
  preflight: GavanWeek1RouteRegistrationImplementationPreflightV2,
): GavanWeek1LiveRouteRegressionEvidencePreflightIssue[] {
  const issues: GavanWeek1LiveRouteRegressionEvidencePreflightIssue[] = [];

  if (preflight.kind !== 'gavan_week1_route_registration_implementation_preflight_v2') {
    issues.push(issue(
      'wrong_registration_preflight_kind',
      'Live route regression evidence preflight requires route registration implementation preflight v2.',
    ));
  }
  if (preflight.planId !== 'gavan' || preflight.weekId !== 'gavan-week1') {
    issues.push(issue(
      'wrong_plan_or_week',
      'Live route regression evidence preflight can only target Gavan week 1.',
    ));
  }
  if (
    preflight.routeRegistrationAllowed !== false ||
    preflight.catalogRouteRegistrationAllowed !== false ||
    preflight.quizRouteRegistrationAllowed !== false ||
    preflight.uiRouteRegistrationAllowed !== false ||
    preflight.liveRegressionAllowed !== false ||
    preflight.deviceVerificationAllowed !== false ||
    preflight.readyForLive !== false ||
    preflight.sourceWritesUsed !== false ||
    preflight.liveEditsAllowed !== false
  ) {
    issues.push(issue(
      'registration_preflight_not_non_live',
      'Live route regression evidence preflight cannot start from a live-ready route registration preflight.',
    ));
  }

  return issues;
}

function regressionSuites(): GavanWeek1RouteRegressionSuite[] {
  return [
    'home_onboarding_regression',
    'premium_gate_regression',
    'catalog_route_regression',
    'quiz_route_regression',
    'ui_opening_route_regression',
    'self_guided_carryover_regression',
    'completed_day_state_regression',
  ].map((id) => ({
    id: id as RegressionSuiteId,
    status: 'blocked_not_run',
    requiredAfterSourceRegistration: true,
  }));
}

function deviceChecks(): GavanWeek1RouteDeviceCheck[] {
  return [
    'open_plan_screen',
    'open_day_task_surface',
    'open_catalog_route',
    'open_quiz_route',
    'open_renderer_route',
  ].map((id) => ({
    id: id as DeviceCheckId,
    status: 'blocked_not_verified',
    requiredAfterSourceRegistration: true,
  }));
}

function statusFor(
  preflight: GavanWeek1RouteRegistrationImplementationPreflightV2,
  issues: GavanWeek1LiveRouteRegressionEvidencePreflightIssue[],
): PreflightStatus {
  if (issues.length > 0) return 'blocked_invalid_route_registration_preflight';
  if (preflight.sourceRegistrationPlanReady) return 'regression_evidence_plan_ready_non_live';
  return 'blocked_before_source_registration_plan';
}

function blockersFor(status: PreflightStatus): GavanWeek1LiveRouteRegressionEvidencePreflightBlocker[] {
  const shared = [
    {
      code: 'route_registration_not_complete',
      blocksProduction: true as const,
      detail: 'Route registration has not completed.',
    },
    {
      code: 'home_onboarding_premium_regression_not_run',
      blocksProduction: true as const,
      detail: 'Home, onboarding, and Premium regression evidence has not been produced.',
    },
    {
      code: 'catalog_quiz_ui_route_regression_not_run',
      blocksProduction: true as const,
      detail: 'Catalog, quiz, and UI route regression evidence has not been produced.',
    },
    {
      code: 'device_route_opening_not_verified',
      blocksProduction: true as const,
      detail: 'Device route opening verification has not been produced.',
    },
    {
      code: 'audio_pronunciation_master_blockers_still_open',
      blocksProduction: true as const,
      detail: 'Audio and pronunciation blockers remain open in the master readiness matrix.',
    },
  ];

  if (status === 'regression_evidence_plan_ready_non_live') {
    return shared;
  }

  return [
    {
      code: 'source_registration_plan_not_ready',
      blocksProduction: true,
      detail: 'Source-registration plan is not ready.',
    },
    ...shared,
  ];
}

function requiredNextActions(status: PreflightStatus): string[] {
  if (status === 'regression_evidence_plan_ready_non_live') {
    return [
      'Complete route source registration in a separate implementation pass.',
      'Run all seven route regression suites after source registration.',
      'Verify all five device route opening checks after source registration.',
    ];
  }

  return [
    'Prepare the non-live source-registration plan first.',
    'Keep live route regression and device verification blocked until source registration completes.',
  ];
}

export function buildGavanWeek1LiveRouteRegressionEvidencePreflight(
  registrationPreflight: GavanWeek1RouteRegistrationImplementationPreflightV2,
  options: BuildOptions,
): BuildResult {
  const issues = validateRegistrationPreflight(registrationPreflight);
  const status = statusFor(registrationPreflight, issues);
  const suites = regressionSuites();
  const checks = deviceChecks();
  const blockers = blockersFor(status);

  return {
    valid: issues.length === 0,
    issues,
    preflight: {
      kind: 'gavan_week1_live_route_regression_evidence_preflight',
      generatedAt: options.generatedAt,
      evidenceOwnerId: options.evidenceOwnerId,
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourceRegistrationPreflightStatus: registrationPreflight.status,
      status,
      releaseDecision: 'hold',
      regressionEvidenceReady: false,
      deviceEvidenceReady: false,
      sourceRegistrationPlanReady: registrationPreflight.sourceRegistrationPlanReady,
      routeRegistrationComplete: false,
      readyForLive: false,
      productionReady: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
      regressionSuites: suites,
      deviceChecks: checks,
      summary: {
        regressionSuiteCount: suites.length,
        blockedRegressionSuiteCount: suites.length,
        deviceCheckCount: checks.length,
        blockedDeviceCheckCount: checks.length,
        routeFamilyCount: registrationPreflight.summary.routeFamilyCount,
        routeRegistrationComplete: false,
        inheritedImplementationBlockerCount: registrationPreflight.summary.implementationBlockerCount,
        evidenceBlockerCount: blockers.length,
      },
      blockers,
      requiredNextActions: requiredNextActions(status),
      writePolicy: {
        allowedTargetRoots: ['.codex-tmp', 'docs/reports'],
        sourceWritesAllowed: false,
        liveWritesAllowed: false,
      },
    },
  };
}

export function writeGavanWeek1LiveRouteRegressionEvidencePreflight(
  registrationPreflight: GavanWeek1RouteRegistrationImplementationPreflightV2,
  options: WriteOptions,
): WriteResult {
  if (!isAllowedTargetPath(options.targetPath)) {
    return {
      valid: false,
      issues: [{
        code: 'target_path_not_allowed',
        detail: TARGET_PATH_NOT_ALLOWED_DETAIL,
      }],
    };
  }

  const result = buildGavanWeek1LiveRouteRegressionEvidencePreflight(registrationPreflight, options);
  mkdirSync(path.dirname(options.targetPath), { recursive: true });
  const json = `${JSON.stringify(result.preflight, null, 2)}\n`;
  writeFileSync(options.targetPath, json, 'utf8');

  return {
    valid: result.valid,
    issues: result.issues,
    targetPath: options.targetPath,
    bytesWritten: Buffer.byteLength(json, 'utf8'),
    preflight: result.preflight,
  };
}
