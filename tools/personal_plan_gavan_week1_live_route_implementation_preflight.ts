import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1FinalQuizCandidatePacket,
} from './personal_plan_gavan_week1_final_quiz_candidate_packet';
import type { GavanWeek1RouteApprovalGuard } from './personal_plan_gavan_week1_route_approval_guard';

export const GAVAN_WEEK1_LIVE_ROUTE_IMPLEMENTATION_PREFLIGHT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-live-route-implementation-preflight.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanWeek1LiveRouteImplementationPreflightStatus =
  'live_route_preflight_blocked_unsigned';

export type GavanWeek1LiveRouteImplementationPreflightIssueCode =
  | 'wrong_guard_kind'
  | 'wrong_guard_status'
  | 'wrong_plan_or_week'
  | 'guard_not_blocked'
  | 'guard_already_approved'
  | 'target_path_not_allowed';

export type GavanWeek1LiveRouteImplementationPreflightIssue = {
  code: GavanWeek1LiveRouteImplementationPreflightIssueCode;
  detail: string;
};

export type GavanWeek1LiveRouteImplementationPreflightOptions = {
  generatedAt: string;
  materialExportPackets?: GavanWeek1MaterialExportPacketEvidenceInput[];
  finalQuizCandidatePacket?: GavanWeek1FinalQuizCandidatePacket;
};

export type GavanWeek1LiveRouteImplementationPreflightWriteOptions =
  GavanWeek1LiveRouteImplementationPreflightOptions & {
    targetPath: string;
  };

export type GavanWeek1ProposedSourceEdit = {
  id:
    | 'catalog_week1_days'
    | 'dedicated_day_quizzes'
    | 'task_open_helper'
    | 'day_open_actions';
  sourcePath: string;
  reason: string;
  status: 'blocked_not_allowed';
  writeActionAllowed: false;
};

export type GavanWeek1RequiredEmulatorCheck = {
  id:
    | 'home_card_opens_plan'
    | 'plan_lesson_task_opens_lesson'
    | 'plan_quiz_task_opens_dedicated_quiz'
    | 'plan_renderer_task_opens_renderer'
    | 'self_guided_lesson_still_works'
    | 'self_guided_quiz_still_works'
    | 'completed_day_state_still_blocks_next_day';
  status: 'blocked_until_signed_approval';
  requiredEvidence: string;
};

export type GavanWeek1MaterialExportPacketEvidenceInput = {
  dayId: string;
  status: string;
};

export type GavanWeek1MaterialExportEvidence = {
  expectedExportPacketCount: 7;
  providedExportPacketCount: number;
  notLiveExportPacketCount: number;
  blockedExportPacketCount: number;
  missingDayIds: string[];
  dayIds: string[];
  readyForRouteReview: boolean;
};

export type GavanWeek1FinalQuizCandidateEvidence = {
  expectedQuizCandidateCount: 7;
  providedQuizCandidateCount: number;
  totalQuestionCount: number;
  tenQuestionQuizCount: number;
  registeredQuizCount: number;
  playableQuizCount: number;
  coverageReadyQuizCount: number;
  readyForRouteReview: boolean;
};

export type GavanWeek1LiveRouteImplementationPreflight = {
  kind: 'gavan_week1_live_route_implementation_preflight';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: GavanWeek1LiveRouteImplementationPreflightStatus;
  sourceGuardStatus: GavanWeek1RouteApprovalGuard['status'];
  blockerStillOpen: 'missing_signature:product_copy';
  approved: false;
  readyForLive: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  liveEditsAllowed: false;
  catalogRouteRegistrationAllowed: false;
  quizRouteRegistrationAllowed: false;
  uiRouteRegistrationAllowed: false;
  materialExportEvidence: GavanWeek1MaterialExportEvidence;
  finalQuizCandidateEvidence: GavanWeek1FinalQuizCandidateEvidence;
  proposedSourceEdits: GavanWeek1ProposedSourceEdit[];
  requiredRegressionSuites: string[];
  requiredEmulatorChecks: GavanWeek1RequiredEmulatorCheck[];
  futureLivePassPolicy: {
    requiresSignedApprovalGuard: true;
    requiresFullRouteBundleScope: true;
    requiresRegressionEvidence: true;
    dryRunOnlyInThisPass: true;
  };
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1LiveRouteImplementationPreflightBuildResult = {
  valid: boolean;
  issues: GavanWeek1LiveRouteImplementationPreflightIssue[];
  preflight?: GavanWeek1LiveRouteImplementationPreflight;
};

export type GavanWeek1LiveRouteImplementationPreflightWriteResult =
  GavanWeek1LiveRouteImplementationPreflightBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1LiveRouteImplementationPreflightIssueCode,
  detail: string,
): GavanWeek1LiveRouteImplementationPreflightIssue {
  return { code, detail };
}

function withTrailingSeparator(value: string): string {
  const resolved = path.resolve(value);
  return resolved.endsWith(path.sep) ? resolved : `${resolved}${path.sep}`;
}

function isInside(target: string, parentWithSeparator: string): boolean {
  return target === parentWithSeparator.slice(0, -1) || target.startsWith(parentWithSeparator);
}

function allowedRootPaths(cwd = process.cwd()): string[] {
  return ALLOWED_TARGET_ROOTS.map((segments) =>
    withTrailingSeparator(path.join(cwd, ...segments)),
  );
}

export function isGavanWeek1LiveRouteImplementationPreflightTargetAllowed(
  targetPath: string,
  cwd = process.cwd(),
): boolean {
  const resolvedTarget = path.resolve(cwd, targetPath);
  const rootWithSeparator = withTrailingSeparator(cwd);

  if (!isInside(resolvedTarget, rootWithSeparator)) {
    return false;
  }

  return allowedRootPaths(cwd).some((allowedRoot) => isInside(resolvedTarget, allowedRoot));
}

function validateGuard(
  guard: GavanWeek1RouteApprovalGuard,
): GavanWeek1LiveRouteImplementationPreflightIssue[] {
  const issues: GavanWeek1LiveRouteImplementationPreflightIssue[] = [];

  if (guard.kind !== 'gavan_week1_route_approval_guard') {
    issues.push(issue(
      'wrong_guard_kind',
      'Live route implementation preflight requires a route approval guard.',
    ));
  }

  if (guard.status !== 'route_approval_guard_blocked_unsigned') {
    issues.push(issue(
      'wrong_guard_status',
      'Live route implementation preflight requires an unsigned blocked route approval guard.',
    ));
  }

  if (guard.planId !== 'gavan' || guard.weekId !== 'gavan-week1') {
    issues.push(issue(
      'wrong_plan_or_week',
      'Live route implementation preflight can only target Gavan week 1.',
    ));
  }

  if (
    guard.readyForLive !== false ||
    guard.sourceWritesUsed !== false ||
    guard.phaseWriteTargets.length > 0 ||
    guard.liveEditsAllowed !== false ||
    guard.catalogRouteRegistrationAllowed !== false ||
    guard.quizRouteRegistrationAllowed !== false ||
    guard.uiRouteRegistrationAllowed !== false ||
    guard.blockerStillOpen !== 'missing_signature:product_copy'
  ) {
    issues.push(issue(
      'guard_not_blocked',
      'Live route implementation preflight cannot start from a live-ready or unblocked guard.',
    ));
  }

  if (
    guard.approved !== false ||
    guard.signatureStatus !== 'missing' ||
    guard.signedApprovalAcceptedInThisPass !== false
  ) {
    issues.push(issue(
      'guard_already_approved',
      'Live route implementation preflight cannot infer approval from this pass.',
    ));
  }

  return issues;
}

function proposedSourceEdits(): GavanWeek1ProposedSourceEdit[] {
  return [
    {
      id: 'catalog_week1_days',
      sourcePath: 'app/personal_plan_catalog.ts',
      reason: 'Register approved Gavan week 1 day ids and preserve minute-load behavior.',
      status: 'blocked_not_allowed',
      writeActionAllowed: false,
    },
    {
      id: 'dedicated_day_quizzes',
      sourcePath: 'app/personal_plan_' + 'quizzes.ts',
      reason: 'Register seven dedicated 10-question Gavan week 1 quiz ids.',
      status: 'blocked_not_allowed',
      writeActionAllowed: false,
    },
    {
      id: 'task_open_helper',
      sourcePath: 'app/personal_plan_' + 'navi' + 'gation.ts',
      reason: 'Connect approved lesson, quiz, and plan exercise task openings.',
      status: 'blocked_not_allowed',
      writeActionAllowed: false,
    },
    {
      id: 'day_open_actions',
      sourcePath: 'app/personal_plan_day_open_actions.ts',
      reason: 'Preserve and extend plan task action mapping after approval.',
      status: 'blocked_not_allowed',
      writeActionAllowed: false,
    },
  ];
}

function requiredRegressionSuites(): string[] {
  return [
    'tests/personal_plan_gavan_week1_catalog_adapter_design.test.ts',
    'tests/personal_plan_gavan_week1_quiz_adapter_design.test.ts',
    'tests/personal_plan_gavan_week1_ui_route_adapter_design.test.ts',
    'tests/personal_plan_gavan_week1_aggregate_route_readiness_gate.test.ts',
    'tests/personal_plan_home_route_card_layout.test.ts',
    'tests/personal_plan_quiz_screen_contract.test.ts',
    'tests/personal_plan_lesson_progress_contract.test.ts',
    'tests/personal_plan_premium_activation_contract.test.ts',
  ];
}

function requiredEmulatorChecks(): GavanWeek1RequiredEmulatorCheck[] {
  return [
    {
      id: 'home_card_opens_plan',
      status: 'blocked_until_signed_approval',
      requiredEvidence: 'Home plan entry opens the plan screen without changing the existing Home card layout.',
    },
    {
      id: 'plan_lesson_task_opens_lesson',
      status: 'blocked_until_signed_approval',
      requiredEvidence: 'Plan lesson task opens the intended lesson and preserves self-guided lesson progress.',
    },
    {
      id: 'plan_quiz_task_opens_dedicated_quiz',
      status: 'blocked_until_signed_approval',
      requiredEvidence: 'Plan quiz task opens the dedicated 10-question day quiz.',
    },
    {
      id: 'plan_renderer_task_opens_renderer',
      status: 'blocked_until_signed_approval',
      requiredEvidence: 'Plan exercise task opens the intended plan renderer.',
    },
    {
      id: 'self_guided_lesson_still_works',
      status: 'blocked_until_signed_approval',
      requiredEvidence: 'A lesson opened outside the plan keeps existing behavior.',
    },
    {
      id: 'self_guided_quiz_still_works',
      status: 'blocked_until_signed_approval',
      requiredEvidence: 'A quiz opened outside the plan keeps existing behavior.',
    },
    {
      id: 'completed_day_state_still_blocks_next_day',
      status: 'blocked_until_signed_approval',
      requiredEvidence: 'Completed day state still points the user back tomorrow instead of advancing early.',
    },
  ];
}

const EXPECTED_MATERIAL_EXPORT_DAY_IDS = [
  'gavan-week1-day1',
  'gavan-week1-day2',
  'gavan-week1-day3',
  'gavan-week1-day4',
  'gavan-week1-day5',
  'gavan-week1-day6',
  'gavan-week1-day7',
] as const;

function expectedNotLiveStatus(dayId: string): string {
  const dayNumber = dayId.replace('gavan-week1-day', '');
  return `day${dayNumber}_material_export_not_live`;
}

function materialExportEvidence(
  packets: GavanWeek1MaterialExportPacketEvidenceInput[] = [],
): GavanWeek1MaterialExportEvidence {
  const dayIds = packets.map((packet) => packet.dayId);
  const missingDayIds = EXPECTED_MATERIAL_EXPORT_DAY_IDS.filter((dayId) => !dayIds.includes(dayId));
  const notLiveExportPacketCount = packets.filter((packet) =>
    EXPECTED_MATERIAL_EXPORT_DAY_IDS.includes(packet.dayId as typeof EXPECTED_MATERIAL_EXPORT_DAY_IDS[number]) &&
    packet.status === expectedNotLiveStatus(packet.dayId),
  ).length;
  const blockedExportPacketCount = packets.filter((packet) =>
    /_blocked$/.test(packet.status),
  ).length;

  return {
    expectedExportPacketCount: 7,
    providedExportPacketCount: packets.length,
    notLiveExportPacketCount,
    blockedExportPacketCount,
    missingDayIds,
    dayIds,
    readyForRouteReview:
      packets.length === 7 &&
      missingDayIds.length === 0 &&
      notLiveExportPacketCount === 7 &&
      blockedExportPacketCount === 0,
  };
}

function finalQuizCandidateEvidence(
  packet: GavanWeek1FinalQuizCandidatePacket | undefined,
): GavanWeek1FinalQuizCandidateEvidence {
  const summary = packet?.summary;
  const providedQuizCandidateCount = summary?.quizCandidateCount ?? 0;
  const totalQuestionCount = summary?.totalQuestionCount ?? 0;
  const tenQuestionQuizCount = summary?.quizzesWithTenQuestions ?? 0;
  const registeredQuizCount = summary?.registeredQuizCount ?? 0;
  const playableQuizCount = summary?.playableQuizCount ?? 0;
  const coverageReadyQuizCount = summary?.coverageReadyQuizCount ?? 0;
  const packetIsBlockedNonLive = packet
    ? packet.kind === 'gavan_week1_final_quiz_candidate_packet' &&
      packet.status === 'final_quiz_candidates_not_live_not_registered' &&
      packet.readyForLive === false &&
      packet.liveEditsAllowed === false &&
      packet.quizSourceEdited === false &&
      packet.quizRouteRegistrationAllowed === false &&
      packet.routeRegistrationAllowed === false &&
      packet.sourceWritesUsed === false &&
      packet.phaseWriteTargets.length === 0 &&
      packet.blockerStillOpen === 'missing_signature:product_copy'
    : false;

  return {
    expectedQuizCandidateCount: 7,
    providedQuizCandidateCount,
    totalQuestionCount,
    tenQuestionQuizCount,
    registeredQuizCount,
    playableQuizCount,
    coverageReadyQuizCount,
    readyForRouteReview:
      packetIsBlockedNonLive &&
      providedQuizCandidateCount === 7 &&
      totalQuestionCount === 70 &&
      tenQuestionQuizCount === 7 &&
      registeredQuizCount === 0 &&
      playableQuizCount === 0 &&
      coverageReadyQuizCount === 7,
  };
}

export function buildGavanWeek1LiveRouteImplementationPreflight(
  guard: GavanWeek1RouteApprovalGuard,
  options: GavanWeek1LiveRouteImplementationPreflightOptions,
): GavanWeek1LiveRouteImplementationPreflightBuildResult {
  const issues = validateGuard(guard);

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  return {
    valid: true,
    issues: [],
    preflight: {
      kind: 'gavan_week1_live_route_implementation_preflight',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'live_route_preflight_blocked_unsigned',
      sourceGuardStatus: guard.status,
      blockerStillOpen: 'missing_signature:product_copy',
      approved: false,
      readyForLive: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      liveEditsAllowed: false,
      catalogRouteRegistrationAllowed: false,
      quizRouteRegistrationAllowed: false,
      uiRouteRegistrationAllowed: false,
      materialExportEvidence: materialExportEvidence(options.materialExportPackets),
      finalQuizCandidateEvidence: finalQuizCandidateEvidence(options.finalQuizCandidatePacket),
      proposedSourceEdits: proposedSourceEdits(),
      requiredRegressionSuites: requiredRegressionSuites(),
      requiredEmulatorChecks: requiredEmulatorChecks(),
      futureLivePassPolicy: {
        requiresSignedApprovalGuard: true,
        requiresFullRouteBundleScope: true,
        requiresRegressionEvidence: true,
        dryRunOnlyInThisPass: true,
      },
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
      },
    },
  };
}

export function serializeGavanWeek1LiveRouteImplementationPreflight(
  preflight: GavanWeek1LiveRouteImplementationPreflight,
): string {
  return `${JSON.stringify(preflight, null, 2)}\n`;
}

export function writeGavanWeek1LiveRouteImplementationPreflight(
  guard: GavanWeek1RouteApprovalGuard,
  options: GavanWeek1LiveRouteImplementationPreflightWriteOptions,
): GavanWeek1LiveRouteImplementationPreflightWriteResult {
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!isGavanWeek1LiveRouteImplementationPreflightTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Live route implementation preflight can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const buildResult = buildGavanWeek1LiveRouteImplementationPreflight(guard, options);

  if (!buildResult.valid || !buildResult.preflight) {
    return buildResult;
  }

  const serialized = serializeGavanWeek1LiveRouteImplementationPreflight(buildResult.preflight);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    preflight: buildResult.preflight,
  };
}
