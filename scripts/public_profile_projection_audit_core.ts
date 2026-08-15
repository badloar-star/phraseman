import { getLevelFromXP } from '../functions/src/xp_levels';
import { createHash } from 'node:crypto';

type DocumentData = Record<string, unknown>;

export type ProjectionAuditInput = {
  stableUid: string;
  user: DocumentData;
  publicProfile?: DocumentData;
  authLinkStableIds: string[];
  deletionPending: boolean;
  userUpdateTime: string | null;
  profileUpdateTime: string | null;
};

export type ProjectionAuditClassification =
  | 'hidden_identity'
  | 'deletion_pending'
  | 'missing_auth_link'
  | 'missing_update_precondition'
  | 'progress_unavailable'
  | 'legacy_xp_debt'
  | 'server_truth_drift'
  | 'cosmetic_drift'
  | 'in_sync';

export type ProjectionAuditRow = {
  stableUid: string;
  classification: ProjectionAuditClassification;
  safeToApply: boolean;
  progressAuthoritative: boolean;
  cosmeticDrift: boolean;
  serverTruthDrift: boolean;
  legacyXp: {
    usersProgress: number | null;
    publicProfile: number | null;
    serverTruth: number | null;
  };
  desiredCosmetics: Record<string, unknown>;
  desiredServerTruth: Record<string, unknown> | null;
  expectedUserUpdateTime: string | null;
  expectedProfileUpdateTime: string | null;
};

export type ProjectionRepairScope = 'cosmetic' | 'server-truth';

export type ProjectionPlanEntry = {
  stableUid: string;
  classification: ProjectionAuditClassification;
  expectedUserUpdateTime: string;
  expectedProfileUpdateTime: string;
  patch: Record<string, unknown>;
  patchHash: string;
  entryHash: string;
};

export type ProjectionPreflightPlan = {
  version: 1;
  kind: 'public_profile_projection_preflight';
  projectId: string;
  scope: ProjectionRepairScope;
  generatedAt: string;
  planId: string;
  entries: ProjectionPlanEntry[];
};

export type ProjectionApplyReceipt = {
  version: 1;
  planId: string;
  stableUid: string;
  entryHash: string;
  patchHash: string;
  expectedUserUpdateTime: string;
  expectedProfileUpdateTime: string;
  status: 'applied' | 'failed';
  source?: 'mutation' | 'marker_reconciliation';
  attemptedAt: string;
  error?: string;
};

export type ProjectionApplySummary = {
  version: 1;
  planId: string;
  projectId: string;
  scope: ProjectionRepairScope;
  plannedCount: number;
  appliedCount: number;
  reconciledCount: number;
  failedCount: number;
  skippedCount: number;
  failures: { stableUid: string; error: string }[];
};

function record(value: unknown): DocumentData {
  return value && typeof value === 'object' ? value as DocumentData : {};
}

function optionalNonnegativeInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Math.trunc(Number(value));
  return Number.isFinite(number) ? Math.max(0, number) : null;
}

function cleanName(value: unknown): string {
  return typeof value === 'string'
    ? value.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 32)
    : '';
}

export function buildProjectionAuditRow(input: ProjectionAuditInput): ProjectionAuditRow {
  const progress = record(input.user.progress);
  const serverState = record(input.user.progressServerState);
  const profile = record(input.publicProfile);
  const progressAuthoritative = input.user.progressServerAuthoritative === true
    && input.user.progressServerState != null
    && typeof input.user.progressServerState === 'object';
  const usersProgressXp = optionalNonnegativeInt(progress.user_total_xp);
  const publicProfileXp = optionalNonnegativeInt(profile.totalXp);
  const serverTruthXp = progressAuthoritative ? optionalNonnegativeInt(serverState.totalXp) ?? 0 : null;
  const desiredName = cleanName(progress.user_name ?? profile.name);
  const desiredCosmetics = desiredName
    ? { name: desiredName, nameLower: desiredName.toLowerCase() }
    : {};
  const desiredServerTruth = progressAuthoritative && serverTruthXp !== null
    ? {
        totalXp: serverTruthXp,
        level: getLevelFromXP(serverTruthXp),
        weekPoints: optionalNonnegativeInt(serverState.weekPoints) ?? 0,
        streak: optionalNonnegativeInt(serverState.streakCount) ?? 0,
        progressAuthority: 'server',
      }
    : null;

  const anchored = input.authLinkStableIds.includes(input.stableUid);
  const hasPreconditions = Boolean(input.userUpdateTime && input.profileUpdateTime);
  const hidden = input.user.identityHidden === true;
  const cosmeticDrift = desiredName !== '' && (
    cleanName(profile.name) !== desiredName
    || cleanName(profile.nameLower) !== desiredName.toLowerCase()
  );
  const legacyXpDebt = progressAuthoritative && serverTruthXp !== null && (
    (usersProgressXp !== null && usersProgressXp !== serverTruthXp)
    || (publicProfileXp !== null && publicProfileXp !== serverTruthXp)
  );
  const serverTruthDrift = desiredServerTruth !== null && (
    publicProfileXp !== desiredServerTruth.totalXp
    || optionalNonnegativeInt(profile.level) !== desiredServerTruth.level
    || optionalNonnegativeInt(profile.weekPoints) !== desiredServerTruth.weekPoints
    || optionalNonnegativeInt(profile.streak) !== desiredServerTruth.streak
    || profile.progressAuthority !== 'server'
  );

  let classification: ProjectionAuditClassification;
  if (hidden) classification = 'hidden_identity';
  else if (input.deletionPending) classification = 'deletion_pending';
  else if (!anchored) classification = 'missing_auth_link';
  else if (!hasPreconditions) classification = 'missing_update_precondition';
  else if (!progressAuthoritative) classification = 'progress_unavailable';
  else if (legacyXpDebt) classification = 'legacy_xp_debt';
  else if (serverTruthDrift) classification = 'server_truth_drift';
  else if (cosmeticDrift) classification = 'cosmetic_drift';
  else classification = 'in_sync';

  return {
    stableUid: input.stableUid,
    classification,
    safeToApply: !hidden && !input.deletionPending && anchored && hasPreconditions,
    progressAuthoritative,
    cosmeticDrift,
    serverTruthDrift,
    legacyXp: {
      usersProgress: usersProgressXp,
      publicProfile: publicProfileXp,
      serverTruth: serverTruthXp,
    },
    desiredCosmetics,
    desiredServerTruth,
    expectedUserUpdateTime: input.userUpdateTime,
    expectedProfileUpdateTime: input.profileUpdateTime,
  };
}

export function buildProjectionRepairPatch(
  row: ProjectionAuditRow,
  options: { apply: boolean; scope: ProjectionRepairScope },
): Record<string, unknown> | null {
  if (!options.apply || !row.safeToApply) return null;
  if (options.scope === 'server-truth' && (!row.progressAuthoritative || !row.desiredServerTruth)) return null;
  return {
    ...row.desiredCosmetics,
    ...(options.scope === 'server-truth' ? row.desiredServerTruth ?? {} : {}),
    expectedUserUpdateTime: row.expectedUserUpdateTime,
    expectedProfileUpdateTime: row.expectedProfileUpdateTime,
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = canonicalize((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }
  return value;
}

export function projectionArtifactHash(value: unknown): string {
  const serialized = JSON.stringify(canonicalize(value));
  return createHash('sha256').update(serialized === undefined ? '__undefined__' : serialized).digest('hex');
}

export function resolveProjectionAuditProjectId(input: {
  configuredProjectId?: unknown;
  serviceAccountProjectId?: unknown;
  environmentProjectId?: unknown;
}): string {
  return [input.configuredProjectId, input.serviceAccountProjectId, input.environmentProjectId]
    .map((value) => String(value ?? '').trim())
    .find(Boolean) ?? '';
}

function projectionEntryHashSource(entry: Omit<ProjectionPlanEntry, 'entryHash'>): unknown {
  return {
    stableUid: entry.stableUid,
    classification: entry.classification,
    expectedUserUpdateTime: entry.expectedUserUpdateTime,
    expectedProfileUpdateTime: entry.expectedProfileUpdateTime,
    patchHash: entry.patchHash,
  };
}

function projectionPlanHashSource(plan: Omit<ProjectionPreflightPlan, 'planId'>): unknown {
  return {
    version: plan.version,
    kind: plan.kind,
    projectId: plan.projectId,
    scope: plan.scope,
    generatedAt: plan.generatedAt,
    entries: plan.entries,
  };
}

export function buildProjectionPreflightPlan(input: {
  projectId: string;
  scope: ProjectionRepairScope;
  generatedAt: string;
  rows: ProjectionAuditRow[];
}): ProjectionPreflightPlan {
  const projectId = String(input.projectId || '').trim();
  if (!projectId) throw new Error('plan_project_required');
  const entries = input.rows
    .map((row): ProjectionPlanEntry | null => {
      if (input.scope === 'cosmetic' && !row.cosmeticDrift) return null;
      if (input.scope === 'server-truth' && !row.cosmeticDrift && !row.serverTruthDrift) return null;
      const repairPatch = buildProjectionRepairPatch(row, { apply: true, scope: input.scope });
      if (!repairPatch || !row.expectedUserUpdateTime || !row.expectedProfileUpdateTime) return null;
      const {
        expectedUserUpdateTime: _expectedUserUpdateTime,
        expectedProfileUpdateTime: _expectedProfileUpdateTime,
        ...patch
      } = repairPatch;
      const base: Omit<ProjectionPlanEntry, 'entryHash'> = {
        stableUid: row.stableUid,
        classification: row.classification,
        expectedUserUpdateTime: row.expectedUserUpdateTime,
        expectedProfileUpdateTime: row.expectedProfileUpdateTime,
        patch,
        patchHash: projectionArtifactHash(patch),
      };
      return { ...base, entryHash: projectionArtifactHash(projectionEntryHashSource(base)) };
    })
    .filter((entry): entry is ProjectionPlanEntry => entry !== null)
    .sort((a, b) => a.stableUid.localeCompare(b.stableUid));
  const base: Omit<ProjectionPreflightPlan, 'planId'> = {
    version: 1,
    kind: 'public_profile_projection_preflight',
    projectId,
    scope: input.scope,
    generatedAt: input.generatedAt,
    entries,
  };
  return { ...base, planId: projectionArtifactHash(projectionPlanHashSource(base)) };
}

export function validateProjectionPreflightPlan(value: unknown): ProjectionPreflightPlan {
  if (!value || typeof value !== 'object') throw new Error('plan_invalid');
  const plan = value as ProjectionPreflightPlan;
  if (plan.version !== 1 || plan.kind !== 'public_profile_projection_preflight') throw new Error('plan_version_invalid');
  if (!plan.projectId || (plan.scope !== 'cosmetic' && plan.scope !== 'server-truth')) throw new Error('plan_contract_invalid');
  if (!Array.isArray(plan.entries)) throw new Error('plan_entries_invalid');
  for (const entry of plan.entries) {
    if (!entry || typeof entry !== 'object' || !entry.stableUid || !entry.expectedUserUpdateTime
      || !entry.expectedProfileUpdateTime || !entry.patch || typeof entry.patch !== 'object') {
      throw new Error('plan_entry_invalid');
    }
    if (projectionArtifactHash(entry.patch) !== entry.patchHash) throw new Error('plan_entry_hash_mismatch');
    const { entryHash: _entryHash, ...base } = entry;
    if (projectionArtifactHash(projectionEntryHashSource(base)) !== entry.entryHash) {
      throw new Error('plan_entry_hash_mismatch');
    }
  }
  const { planId: _planId, ...base } = plan;
  if (projectionArtifactHash(projectionPlanHashSource(base)) !== plan.planId) throw new Error('plan_hash_mismatch');
  return plan;
}

export function shouldSkipProjectionPlanEntry(
  plan: ProjectionPreflightPlan,
  entry: ProjectionPlanEntry,
  receipts: ProjectionApplyReceipt[],
): boolean {
  return receipts.some((receipt) => receipt.status === 'applied'
    && receipt.planId === plan.planId
    && receipt.stableUid === entry.stableUid
    && receipt.entryHash === entry.entryHash
    && receipt.patchHash === entry.patchHash
    && receipt.expectedUserUpdateTime === entry.expectedUserUpdateTime
    && receipt.expectedProfileUpdateTime === entry.expectedProfileUpdateTime);
}

export function projectionRepairMarkerState(
  profile: Record<string, unknown>,
  plan: ProjectionPreflightPlan,
  entry: ProjectionPlanEntry,
): 'none' | 'exact' | 'prior_complete' | 'conflict' {
  const markerKeys = [
    'projectionRepairPlanId',
    'projectionRepairEntryHash',
    'projectionRepairPatchHash',
    'projectionRepairAppliedAt',
  ] as const;
  if (!markerKeys.some((key) => profile[key] !== undefined && profile[key] !== null)) return 'none';
  const markerComplete = typeof profile.projectionRepairPlanId === 'string'
    && profile.projectionRepairPlanId.length > 0
    && typeof profile.projectionRepairEntryHash === 'string'
    && profile.projectionRepairEntryHash.length > 0
    && typeof profile.projectionRepairPatchHash === 'string'
    && profile.projectionRepairPatchHash.length > 0
    && profile.projectionRepairAppliedAt !== undefined
    && profile.projectionRepairAppliedAt !== null;
  if (profile.projectionRepairPlanId !== plan.planId) {
    return markerComplete ? 'prior_complete' : 'conflict';
  }
  if (!markerComplete) return 'conflict';
  const markerMatches = markerComplete
    && profile.projectionRepairEntryHash === entry.entryHash
    && profile.projectionRepairPatchHash === entry.patchHash;
  const patchMatches = Object.entries(entry.patch).every(([key, value]) => (
    projectionArtifactHash(profile[key]) === projectionArtifactHash(value)
  ));
  return markerMatches && patchMatches ? 'exact' : 'conflict';
}

function receiptFor(
  plan: ProjectionPreflightPlan,
  entry: ProjectionPlanEntry,
  status: ProjectionApplyReceipt['status'],
  attemptedAt: string,
  error?: string,
  source?: ProjectionApplyReceipt['source'],
): ProjectionApplyReceipt {
  return {
    version: 1,
    planId: plan.planId,
    stableUid: entry.stableUid,
    entryHash: entry.entryHash,
    patchHash: entry.patchHash,
    expectedUserUpdateTime: entry.expectedUserUpdateTime,
    expectedProfileUpdateTime: entry.expectedProfileUpdateTime,
    status,
    attemptedAt,
    ...(source ? { source } : {}),
    ...(error ? { error } : {}),
  };
}

export async function executeProjectionApplyPlan(input: {
  plan: ProjectionPreflightPlan;
  existingReceipts: ProjectionApplyReceipt[];
  attemptedAt: () => string;
  applyOne: (entry: ProjectionPlanEntry) => Promise<void | 'applied' | 'reconciled'>;
  writeReceipt: (receipt: ProjectionApplyReceipt) => Promise<void>;
}): Promise<ProjectionApplySummary> {
  const plan = validateProjectionPreflightPlan(input.plan);
  const summary: ProjectionApplySummary = {
    version: 1,
    planId: plan.planId,
    projectId: plan.projectId,
    scope: plan.scope,
    plannedCount: plan.entries.length,
    appliedCount: 0,
    reconciledCount: 0,
    failedCount: 0,
    skippedCount: 0,
    failures: [],
  };
  for (const entry of plan.entries) {
    if (shouldSkipProjectionPlanEntry(plan, entry, input.existingReceipts)) {
      summary.skippedCount += 1;
      continue;
    }
    let outcome: void | 'applied' | 'reconciled';
    try {
      outcome = await input.applyOne(entry);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await input.writeReceipt(receiptFor(plan, entry, 'failed', input.attemptedAt(), message));
      summary.failedCount += 1;
      summary.failures.push({ stableUid: entry.stableUid, error: message });
      continue;
    }
    const reconciled = outcome === 'reconciled';
    await input.writeReceipt(receiptFor(
      plan,
      entry,
      'applied',
      input.attemptedAt(),
      undefined,
      reconciled ? 'marker_reconciliation' : 'mutation',
    ));
    if (reconciled) summary.reconciledCount += 1;
    else summary.appliedCount += 1;
  }
  return summary;
}
