import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1BridgeDiffPreflightPlan,
  GavanWeek1BridgeRequiredSurface,
  GavanWeek1BridgeSurfaceCode,
} from './personal_plan_gavan_week1_bridge_diff_preflight_plan';
import type {
  GavanWeek1ReleaseBlocker,
} from './personal_plan_gavan_week1_approval_readiness_manifest';

export const GAVAN_WEEK1_FUTURE_BRIDGE_APPROVAL_CONTRACT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-future-bridge-approval-contract.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanWeek1FutureBridgeApprovalAreaId =
  | GavanWeek1BridgeSurfaceCode
  | 'product_copy';

export type GavanWeek1FutureBridgeApprovalRole =
  | 'engineering_release_owner'
  | 'learning_engine_owner'
  | 'product_design_owner'
  | 'audio_pipeline_owner'
  | 'pronunciation_owner'
  | 'sync_owner'
  | 'content_quality_owner';

export type GavanWeek1FutureBridgeApprovalRecord = {
  areaId: string;
  role: string;
  approvedBy: string;
  approvedAt: string;
  reason: string;
};

export type GavanWeek1FutureBridgeApprovalArea = {
  areaId: GavanWeek1FutureBridgeApprovalAreaId;
  requiredRole: GavanWeek1FutureBridgeApprovalRole;
  signatureStatus: 'missing' | 'provided';
  state: 'blocked_until_signature';
  acceptanceCriteria: string[];
  approvalRecord?: GavanWeek1FutureBridgeApprovalRecord;
};

export type GavanWeek1FutureBridgeApprovalContract = {
  kind: 'gavan_week1_future_bridge_approval_contract';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: 'future_bridge_contract_only_not_applied';
  sourcePreflightStatus: GavanWeek1BridgeDiffPreflightPlan['status'];
  liveIntegration: false;
  applied: false;
  approvalRequiredBeforeApply: true;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  canOpenLiveBridgeImplementationTask: boolean;
  allProductionSurfacesConnected: boolean;
  allRequiredSignaturesPresent: boolean;
  inputSummary: GavanWeek1BridgeDiffPreflightPlan['inputSummary'];
  preservedMissingSurfaces: GavanWeek1BridgeRequiredSurface[];
  preservedReleaseBlockers: GavanWeek1ReleaseBlocker[];
  approvalAreas: GavanWeek1FutureBridgeApprovalArea[];
  releasePolicy: {
    noLiveBridgeWithoutSeparateImplementationTask: true;
    noFakeAudio: true;
    noFakePronunciationScoring: true;
    noUiRouteBeforeProductReview: true;
    noProductionWritesInThisPhase: true;
  };
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1FutureBridgeApprovalContractOptions = {
  generatedAt: string;
  approvalRecords?: GavanWeek1FutureBridgeApprovalRecord[];
};

export type GavanWeek1FutureBridgeApprovalContractWriteOptions =
  GavanWeek1FutureBridgeApprovalContractOptions & {
    targetPath: string;
  };

export type GavanWeek1FutureBridgeApprovalContractIssueCode =
  | 'wrong_preflight_kind'
  | 'wrong_preflight_status'
  | 'live_preflight_not_allowed'
  | 'invalid_approval_area'
  | 'invalid_approval_role'
  | 'invalid_approval_timestamp'
  | 'invalid_approval_metadata'
  | 'target_path_not_allowed';

export type GavanWeek1FutureBridgeApprovalContractIssue = {
  code: GavanWeek1FutureBridgeApprovalContractIssueCode;
  detail: string;
  areaId?: string;
};

export type GavanWeek1FutureBridgeApprovalContractBuildResult = {
  valid: boolean;
  issues: GavanWeek1FutureBridgeApprovalContractIssue[];
  contract?: GavanWeek1FutureBridgeApprovalContract;
};

export type GavanWeek1FutureBridgeApprovalContractWriteResult =
  GavanWeek1FutureBridgeApprovalContractBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

type AreaDefinition = {
  areaId: GavanWeek1FutureBridgeApprovalAreaId;
  requiredRole: GavanWeek1FutureBridgeApprovalRole;
  acceptanceCriteria: string[];
};

const AREA_DEFINITIONS: AreaDefinition[] = [
  {
    areaId: 'catalog_route',
    requiredRole: 'engineering_release_owner',
    acceptanceCriteria: [
      'Approved week day ids are registered by a reviewed production bridge, not by generated mutation.',
      'Route registration keeps existing plan behavior and does not remove old onboarding or premium flows.',
      'Catalog data passes encoding, duplicate id, and day-order gates before any release branch is opened.',
    ],
  },
  {
    areaId: 'quiz_route',
    requiredRole: 'learning_engine_owner',
    acceptanceCriteria: [
      'Every plan quiz has exactly the approved question count and coverage for its linked day material.',
      'Quiz explanations describe only visible choices and never invent an option the learner did not see.',
      'Old disabled quiz ids stay isolated unless a separate reviewed migration explicitly restores them.',
    ],
  },
  {
    areaId: 'ui_route',
    requiredRole: 'product_design_owner',
    acceptanceCriteria: [
      'The user-facing route uses existing app style and does not alter perfected onboarding screens.',
      'The day view explains what to do next with plain product copy and no developer wording.',
      'UI states cover locked, active, completed, carryover, and continue-without-plan cases before release.',
    ],
  },
  {
    areaId: 'audio_pipeline',
    requiredRole: 'audio_pipeline_owner',
    acceptanceCriteria: [
      'Final audio assets exist for required listening tasks and are not represented by placeholder claims.',
      'Audio metadata includes provider, voice, duration, target text, asset id, and stable review evidence.',
      'Missing audio keeps the week blocked instead of silently degrading into text-only production content.',
    ],
  },
  {
    areaId: 'pronunciation_scoring',
    requiredRole: 'pronunciation_owner',
    acceptanceCriteria: [
      'Pronunciation tasks have a real scoring policy or are explicitly marked not required for the release.',
      'The scoring flow records attempts without exposing fake confidence or fake speech-quality claims.',
      'Learner feedback stays supportive and understandable when pronunciation scoring is not ready.',
    ],
  },
  {
    areaId: 'cloud_sync_bridge',
    requiredRole: 'sync_owner',
    acceptanceCriteria: [
      'Week progress, completed tasks, carryover, and plan instance identity are sync-safe across devices.',
      'Resetting or restarting a plan cannot reuse stale completed task ids from an older plan instance.',
      'Offline/local state and cloud state reconciliation are tested before production release.',
    ],
  },
  {
    areaId: 'product_copy',
    requiredRole: 'content_quality_owner',
    acceptanceCriteria: [
      'Learner-facing copy is friendly, concrete, socially safe, and free from developer-draft wording.',
      'Explanations cover new words and first-seen constructions without describing unseen wrong options.',
      'The week keeps broad reusable phrases and does not collapse into narrow private-data scenarios.',
    ],
  },
];

function issue(
  code: GavanWeek1FutureBridgeApprovalContractIssueCode,
  detail: string,
  areaId?: string,
): GavanWeek1FutureBridgeApprovalContractIssue {
  return { code, detail, areaId };
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

export function isGavanWeek1FutureBridgeApprovalContractTargetAllowed(
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

function areaDefinition(areaId: string): AreaDefinition | undefined {
  return AREA_DEFINITIONS.find((definition) => definition.areaId === areaId);
}

function isValidTimestamp(value: string): boolean {
  return value.includes('T') && !Number.isNaN(Date.parse(value));
}

function approvalMetadataValid(record: GavanWeek1FutureBridgeApprovalRecord): boolean {
  return record.approvedBy.trim().length > 0 && record.reason.trim().length >= 12;
}

function approvalIssues(
  records: GavanWeek1FutureBridgeApprovalRecord[],
): GavanWeek1FutureBridgeApprovalContractIssue[] {
  const issues: GavanWeek1FutureBridgeApprovalContractIssue[] = [];

  records.forEach((record) => {
    const definition = areaDefinition(record.areaId);

    if (!definition) {
      issues.push(issue(
        'invalid_approval_area',
        'Approval record points to an unknown approval area.',
        record.areaId,
      ));
      return;
    }

    if (record.role !== definition.requiredRole) {
      issues.push(issue(
        'invalid_approval_role',
        'Approval record role does not match the required role for this area.',
        record.areaId,
      ));
    }

    if (!isValidTimestamp(record.approvedAt)) {
      issues.push(issue(
        'invalid_approval_timestamp',
        'Approval record timestamp must be a valid ISO-like timestamp.',
        record.areaId,
      ));
    }

    if (!approvalMetadataValid(record)) {
      issues.push(issue(
        'invalid_approval_metadata',
        'Approval record must include reviewer identity and a non-empty reason.',
        record.areaId,
      ));
    }
  });

  return issues;
}

function recordForArea(
  areaId: GavanWeek1FutureBridgeApprovalAreaId,
  records: GavanWeek1FutureBridgeApprovalRecord[],
): GavanWeek1FutureBridgeApprovalRecord | undefined {
  const definition = areaDefinition(areaId);
  return records.find((record) =>
    record.areaId === areaId &&
    definition &&
    record.role === definition.requiredRole &&
    isValidTimestamp(record.approvedAt) &&
    approvalMetadataValid(record),
  );
}

function approvalAreas(
  records: GavanWeek1FutureBridgeApprovalRecord[],
): GavanWeek1FutureBridgeApprovalArea[] {
  return AREA_DEFINITIONS.map((definition) => {
    const approvalRecord = recordForArea(definition.areaId, records);

    return {
      areaId: definition.areaId,
      requiredRole: definition.requiredRole,
      signatureStatus: approvalRecord ? 'provided' : 'missing',
      state: 'blocked_until_signature',
      acceptanceCriteria: definition.acceptanceCriteria,
      approvalRecord,
    };
  });
}

export function buildGavanWeek1FutureBridgeApprovalContract(
  preflight: GavanWeek1BridgeDiffPreflightPlan,
  options: GavanWeek1FutureBridgeApprovalContractOptions,
): GavanWeek1FutureBridgeApprovalContractBuildResult {
  const issues: GavanWeek1FutureBridgeApprovalContractIssue[] = [];

  if (preflight.kind !== 'gavan_week1_bridge_diff_preflight_plan') {
    issues.push(issue(
      'wrong_preflight_kind',
      'Expected a Gavan week 1 bridge diff preflight plan.',
    ));
  }

  if (preflight.status !== 'bridge_plan_only_not_applied') {
    issues.push(issue(
      'wrong_preflight_status',
      'Future approval contract must start from a non-applied bridge preflight.',
    ));
  }

  if (preflight.liveIntegration !== false || preflight.applied !== false) {
    issues.push(issue(
      'live_preflight_not_allowed',
      'Future approval contract cannot start from already applied live integration.',
    ));
  }

  const records = options.approvalRecords ?? [];
  issues.push(...approvalIssues(records));

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  const areas = approvalAreas(records);
  const allProductionSurfacesConnected = preflight.requiredSurfaces.every((surface) =>
    surface.status === 'connected',
  );
  const allRequiredSignaturesPresent = areas.every((area) => area.signatureStatus === 'provided');

  return {
    valid: true,
    issues: [],
    contract: {
      kind: 'gavan_week1_future_bridge_approval_contract',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'future_bridge_contract_only_not_applied',
      sourcePreflightStatus: preflight.status,
      liveIntegration: false,
      applied: false,
      approvalRequiredBeforeApply: true,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      canOpenLiveBridgeImplementationTask: allProductionSurfacesConnected && allRequiredSignaturesPresent,
      allProductionSurfacesConnected,
      allRequiredSignaturesPresent,
      inputSummary: preflight.inputSummary,
      preservedMissingSurfaces: preflight.requiredSurfaces,
      preservedReleaseBlockers: preflight.preservedReleaseBlockers,
      approvalAreas: areas,
      releasePolicy: {
        noLiveBridgeWithoutSeparateImplementationTask: true,
        noFakeAudio: true,
        noFakePronunciationScoring: true,
        noUiRouteBeforeProductReview: true,
        noProductionWritesInThisPhase: true,
      },
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
      },
    },
  };
}

export function serializeGavanWeek1FutureBridgeApprovalContract(
  contract: GavanWeek1FutureBridgeApprovalContract,
): string {
  return `${JSON.stringify(contract, null, 2)}\n`;
}

export function writeGavanWeek1FutureBridgeApprovalContract(
  preflight: GavanWeek1BridgeDiffPreflightPlan,
  options: GavanWeek1FutureBridgeApprovalContractWriteOptions,
): GavanWeek1FutureBridgeApprovalContractWriteResult {
  const buildResult = buildGavanWeek1FutureBridgeApprovalContract(preflight, options);
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!buildResult.valid || !buildResult.contract) {
    return buildResult;
  }

  if (!isGavanWeek1FutureBridgeApprovalContractTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Future bridge approval contract can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const serialized = serializeGavanWeek1FutureBridgeApprovalContract(buildResult.contract);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    contract: buildResult.contract,
  };
}
