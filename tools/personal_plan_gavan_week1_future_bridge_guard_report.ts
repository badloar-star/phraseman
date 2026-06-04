import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1FutureBridgeApprovalAreaId,
  GavanWeek1FutureBridgeApprovalContract,
} from './personal_plan_gavan_week1_future_bridge_approval_contract';
import type {
  GavanWeek1BridgeRequiredSurface,
  GavanWeek1BridgeSurfaceCode,
} from './personal_plan_gavan_week1_bridge_diff_preflight_plan';
import type {
  GavanWeek1ReleaseBlocker,
  GavanWeek1ReleaseBlockerCode,
} from './personal_plan_gavan_week1_approval_readiness_manifest';

export const GAVAN_WEEK1_FUTURE_BRIDGE_GUARD_REPORT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-future-bridge-guard-report.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanWeek1FutureBridgeGuardBlockerCategory =
  | 'missing_signature'
  | 'missing_production_surface'
  | 'preserved_release_blocker';

export type GavanWeek1FutureBridgeGuardBlocker = {
  id: string;
  category: GavanWeek1FutureBridgeGuardBlockerCategory;
  blocksLiveBridge: true;
  detail: string;
  areaId?: GavanWeek1FutureBridgeApprovalAreaId;
  surfaceCode?: GavanWeek1BridgeSurfaceCode;
  releaseBlockerCode?: GavanWeek1ReleaseBlockerCode;
};

export type GavanWeek1FutureBridgeGuardReport = {
  kind: 'gavan_week1_future_bridge_guard_report';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: 'future_bridge_guard_blocked_not_applied';
  sourceContractStatus: GavanWeek1FutureBridgeApprovalContract['status'];
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  implementationTaskAllowed: boolean;
  sourceContractGeneratedAt: string;
  inputSummary: GavanWeek1FutureBridgeApprovalContract['inputSummary'];
  blockerSummary: {
    missingSignatures: number;
    missingProductionSurfaces: number;
    preservedReleaseBlockers: number;
    totalBlockers: number;
  };
  blockers: GavanWeek1FutureBridgeGuardBlocker[];
  preservedMissingSurfaces: GavanWeek1BridgeRequiredSurface[];
  preservedReleaseBlockers: GavanWeek1ReleaseBlocker[];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1FutureBridgeGuardReportOptions = {
  generatedAt: string;
};

export type GavanWeek1FutureBridgeGuardReportWriteOptions =
  GavanWeek1FutureBridgeGuardReportOptions & {
    targetPath: string;
  };

export type GavanWeek1FutureBridgeGuardReportIssueCode =
  | 'wrong_contract_kind'
  | 'wrong_contract_status'
  | 'applied_live_contract_not_allowed'
  | 'incomplete_contract_cannot_apply'
  | 'target_path_not_allowed';

export type GavanWeek1FutureBridgeGuardReportIssue = {
  code: GavanWeek1FutureBridgeGuardReportIssueCode;
  detail: string;
};

export type GavanWeek1FutureBridgeGuardReportBuildResult = {
  valid: boolean;
  issues: GavanWeek1FutureBridgeGuardReportIssue[];
  report?: GavanWeek1FutureBridgeGuardReport;
};

export type GavanWeek1FutureBridgeGuardReportWriteResult =
  GavanWeek1FutureBridgeGuardReportBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1FutureBridgeGuardReportIssueCode,
  detail: string,
): GavanWeek1FutureBridgeGuardReportIssue {
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

export function isGavanWeek1FutureBridgeGuardReportTargetAllowed(
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

function missingSignatureBlockers(
  contract: GavanWeek1FutureBridgeApprovalContract,
): GavanWeek1FutureBridgeGuardBlocker[] {
  return contract.approvalAreas
    .filter((area) => area.signatureStatus === 'missing')
    .map((area) => ({
      id: `missing_signature:${area.areaId}`,
      category: 'missing_signature',
      blocksLiveBridge: true,
      areaId: area.areaId,
      detail: `Missing ${area.requiredRole} approval for ${area.areaId}.`,
    }));
}

function missingSurfaceBlockers(
  contract: GavanWeek1FutureBridgeApprovalContract,
): GavanWeek1FutureBridgeGuardBlocker[] {
  return contract.preservedMissingSurfaces
    .filter((surface) => surface.status === 'missing_or_not_connected')
    .map((surface) => ({
      id: `missing_surface:${surface.code}`,
      category: 'missing_production_surface',
      blocksLiveBridge: true,
      surfaceCode: surface.code,
      detail: surface.reason,
    }));
}

function preservedReleaseBlockers(
  contract: GavanWeek1FutureBridgeApprovalContract,
): GavanWeek1FutureBridgeGuardBlocker[] {
  return contract.preservedReleaseBlockers.map((blocker) => ({
    id: `release_blocker:${blocker.code}`,
    category: 'preserved_release_blocker',
    blocksLiveBridge: true,
    releaseBlockerCode: blocker.code,
    detail: blocker.detail,
  }));
}

function blockers(contract: GavanWeek1FutureBridgeApprovalContract): GavanWeek1FutureBridgeGuardBlocker[] {
  return [
    ...missingSignatureBlockers(contract),
    ...missingSurfaceBlockers(contract),
    ...preservedReleaseBlockers(contract),
  ];
}

function isAppliedOrLive(contract: GavanWeek1FutureBridgeApprovalContract): boolean {
  const unsafe = contract as unknown as { applied?: boolean; liveIntegration?: boolean };
  return unsafe.applied === true || unsafe.liveIntegration === true;
}

function isIncomplete(contract: GavanWeek1FutureBridgeApprovalContract): boolean {
  return !contract.allProductionSurfacesConnected ||
    !contract.allRequiredSignaturesPresent ||
    !contract.canOpenLiveBridgeImplementationTask;
}

export function buildGavanWeek1FutureBridgeGuardReport(
  contract: GavanWeek1FutureBridgeApprovalContract,
  options: GavanWeek1FutureBridgeGuardReportOptions,
): GavanWeek1FutureBridgeGuardReportBuildResult {
  const issues: GavanWeek1FutureBridgeGuardReportIssue[] = [];

  if (contract.kind !== 'gavan_week1_future_bridge_approval_contract') {
    issues.push(issue(
      'wrong_contract_kind',
      'Expected a Gavan week 1 future bridge approval contract.',
    ));
  }

  if (contract.status !== 'future_bridge_contract_only_not_applied') {
    issues.push(issue(
      'wrong_contract_status',
      'Future bridge guard report requires a non-applied approval contract.',
    ));
  }

  if (isAppliedOrLive(contract)) {
    issues.push(issue(
      'applied_live_contract_not_allowed',
      'Future bridge guard report cannot accept an applied or live contract in this phase.',
    ));
  }

  if (isAppliedOrLive(contract) && isIncomplete(contract)) {
    issues.push(issue(
      'incomplete_contract_cannot_apply',
      'Applied or live contract is incomplete: signatures and production surfaces must be complete first.',
    ));
  }

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  const allBlockers = blockers(contract);
  const missingSignatures = allBlockers.filter((blocker) => blocker.category === 'missing_signature').length;
  const missingProductionSurfaces = allBlockers.filter((blocker) =>
    blocker.category === 'missing_production_surface'
  ).length;
  const preservedBlockers = allBlockers.filter((blocker) =>
    blocker.category === 'preserved_release_blocker'
  ).length;

  return {
    valid: true,
    issues: [],
    report: {
      kind: 'gavan_week1_future_bridge_guard_report',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'future_bridge_guard_blocked_not_applied',
      sourceContractStatus: contract.status,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      implementationTaskAllowed: contract.canOpenLiveBridgeImplementationTask && allBlockers.length === 0,
      sourceContractGeneratedAt: contract.generatedAt,
      inputSummary: contract.inputSummary,
      blockerSummary: {
        missingSignatures,
        missingProductionSurfaces,
        preservedReleaseBlockers: preservedBlockers,
        totalBlockers: allBlockers.length,
      },
      blockers: allBlockers,
      preservedMissingSurfaces: contract.preservedMissingSurfaces,
      preservedReleaseBlockers: contract.preservedReleaseBlockers,
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
      },
    },
  };
}

export function serializeGavanWeek1FutureBridgeGuardReport(
  report: GavanWeek1FutureBridgeGuardReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function writeGavanWeek1FutureBridgeGuardReport(
  contract: GavanWeek1FutureBridgeApprovalContract,
  options: GavanWeek1FutureBridgeGuardReportWriteOptions,
): GavanWeek1FutureBridgeGuardReportWriteResult {
  const buildResult = buildGavanWeek1FutureBridgeGuardReport(contract, options);
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!buildResult.valid || !buildResult.report) {
    return buildResult;
  }

  if (!isGavanWeek1FutureBridgeGuardReportTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Future bridge guard report can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const serialized = serializeGavanWeek1FutureBridgeGuardReport(buildResult.report);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    report: buildResult.report,
  };
}
