import {
  validatePlanAudioAsset,
  type PlanAudioAsset,
} from './personal_plan_audio_asset_readiness';

export type PlanAudioApprovalRecord = {
  kind: 'plan_audio_approval_record';
  assetId: string;
  reviewerId: string;
  approvedAt: string;
  audioChecksum: string;
};

export type PlanAudioApprovalInput = {
  kind: 'plan_audio_approval_input';
  approvals: PlanAudioApprovalRecord[];
};

export type PlanAudioApprovalInputOptions = {
  reviewerId: string;
  approvedAt: string;
};

export type PlanAudioApprovalIssueCode =
  | 'wrong_approval_input_kind'
  | 'missing_approval_record'
  | 'duplicate_approval_record'
  | 'unknown_audio_asset'
  | 'missing_reviewer_id'
  | 'invalid_approved_at'
  | 'audio_checksum_mismatch'
  | 'audio_asset_not_generated'
  | 'audio_asset_readiness_failed'
  | 'approved_audio_not_final'
  | 'approved_audio_readiness_failed';

export type PlanAudioApprovalIssue = {
  code: PlanAudioApprovalIssueCode;
  assetId?: string;
  detail: string;
};

export type PlanAudioApprovalSummary = {
  assets: number;
  approved: number;
  blocked: number;
};

export type PlanAudioApprovalGateResult = {
  valid: boolean;
  issues: PlanAudioApprovalIssue[];
  summary: PlanAudioApprovalSummary;
};

export type PlanAudioApprovalResult = PlanAudioApprovalGateResult & {
  approvedAssets?: PlanAudioAsset[];
};

const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function issue(
  code: PlanAudioApprovalIssueCode,
  detail: string,
  assetId?: string,
): PlanAudioApprovalIssue {
  return { code, detail, assetId };
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoTimestamp(value: string): boolean {
  if (!ISO_TIMESTAMP_RE.test(value)) return false;
  return new Date(value).toISOString() === value;
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function approvalByAssetId(
  approvals: PlanAudioApprovalRecord[],
): Map<string, PlanAudioApprovalRecord> {
  const byId = new Map<string, PlanAudioApprovalRecord>();
  for (const record of approvals) {
    if (!byId.has(record.assetId)) byId.set(record.assetId, record);
  }
  return byId;
}

function stableAudioText(asset: PlanAudioAsset): string {
  return [
    asset.assetId ?? '',
    asset.blockId,
    asset.contentUnitIds.join(','),
    asset.targetText,
    asset.uri ?? '',
    String(asset.durationMs ?? ''),
    asset.voiceId ?? '',
    asset.provider ?? '',
  ].join('|');
}

function summaryFromIssues(assets: PlanAudioAsset[], issues: PlanAudioApprovalIssue[]): PlanAudioApprovalSummary {
  const blockedIds = new Set(issues.map((entry) => entry.assetId).filter(hasText));
  return {
    assets: assets.length,
    approved: Math.max(0, assets.length - blockedIds.size),
    blocked: blockedIds.size,
  };
}

export function checksumPlanAudioAsset(asset: PlanAudioAsset): string {
  return fnv1a(stableAudioText(asset));
}

export function buildPlanAudioApprovalInput(
  assets: PlanAudioAsset[],
  options: PlanAudioApprovalInputOptions,
): PlanAudioApprovalInput {
  return {
    kind: 'plan_audio_approval_input',
    approvals: assets.map((asset) => ({
      kind: 'plan_audio_approval_record',
      assetId: asset.assetId ?? asset.id,
      reviewerId: options.reviewerId,
      approvedAt: options.approvedAt,
      audioChecksum: checksumPlanAudioAsset(asset),
    })),
  };
}

export function validatePlanAudioApprovalGate(
  assets: PlanAudioAsset[],
  input: PlanAudioApprovalInput,
): PlanAudioApprovalGateResult {
  const issues: PlanAudioApprovalIssue[] = [];
  const assetsById = new Map(assets.map((asset) => [asset.assetId ?? asset.id, asset]));
  const seenApprovalIds = new Set<string>();

  if (input.kind !== 'plan_audio_approval_input') {
    issues.push(issue('wrong_approval_input_kind', 'Audio approval input must use the expected kind.'));
  }

  for (const asset of assets) {
    const assetId = asset.assetId ?? asset.id;
    const readiness = validatePlanAudioAsset(asset);

    if (asset.status !== 'generated') {
      issues.push(issue(
        'audio_asset_not_generated',
        'Only generated audio can be promoted through this approval gate.',
        assetId,
      ));
    }

    if (!readiness.validForAuthoring || readiness.issues.length > 0) {
      issues.push(issue(
        'audio_asset_readiness_failed',
        'Generated audio must pass audio readiness before approval.',
        assetId,
      ));
    }
  }

  for (const record of input.approvals) {
    if (seenApprovalIds.has(record.assetId)) {
      issues.push(issue(
        'duplicate_approval_record',
        'Each audio asset can have only one approval record.',
        record.assetId,
      ));
    }
    seenApprovalIds.add(record.assetId);

    if (!record.reviewerId.trim()) {
      issues.push(issue(
        'missing_reviewer_id',
        'Audio approval record must include a reviewer id.',
        record.assetId,
      ));
    }

    if (!isIsoTimestamp(record.approvedAt)) {
      issues.push(issue(
        'invalid_approved_at',
        'Audio approval record must include an ISO timestamp with milliseconds and Z timezone.',
        record.assetId,
      ));
    }

    const asset = assetsById.get(record.assetId);
    if (!asset) {
      issues.push(issue(
        'unknown_audio_asset',
        'Audio approval record references an asset that is not in the generated asset set.',
        record.assetId,
      ));
      continue;
    }

    if (record.audioChecksum !== checksumPlanAudioAsset(asset)) {
      issues.push(issue(
        'audio_checksum_mismatch',
        'Audio approval checksum must match the current generated asset metadata.',
        record.assetId,
      ));
    }
  }

  for (const asset of assets) {
    const assetId = asset.assetId ?? asset.id;
    if (!seenApprovalIds.has(assetId)) {
      issues.push(issue(
        'missing_approval_record',
        'Every generated audio asset needs an explicit approval record.',
        assetId,
      ));
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    summary: summaryFromIssues(assets, issues),
  };
}

export function approvePlanAudioAssets(
  assets: PlanAudioAsset[],
  input: PlanAudioApprovalInput,
): PlanAudioApprovalResult {
  const gate = validatePlanAudioApprovalGate(assets, input);
  if (!gate.valid) return gate;

  const approvals = approvalByAssetId(input.approvals);
  const approvedAssets = assets.map((asset) => {
    const assetId = asset.assetId ?? asset.id;
    approvals.get(assetId);
    return {
      ...asset,
      status: 'approved' as const,
      finalAssetReady: true,
    };
  });

  return {
    ...gate,
    approvedAssets,
  };
}

export function validatePlanApprovedAudioAssets(
  assets: PlanAudioAsset[],
): PlanAudioApprovalGateResult {
  const issues: PlanAudioApprovalIssue[] = [];

  for (const asset of assets) {
    const assetId = asset.assetId ?? asset.id;
    const readiness = validatePlanAudioAsset(asset);

    if (asset.status !== 'approved' || asset.finalAssetReady !== true) {
      issues.push(issue(
        'approved_audio_not_final',
        'Approved audio must be marked approved and final.',
        assetId,
      ));
    }

    if (!readiness.productionReady || readiness.issues.length > 0) {
      issues.push(issue(
        'approved_audio_readiness_failed',
        'Approved audio must pass production readiness.',
        assetId,
      ));
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    summary: summaryFromIssues(assets, issues),
  };
}
