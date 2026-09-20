import { HttpsError, onCall } from 'firebase-functions/v2/https';
import deManifest from '../../content/arena-multilingual/generated/de/manifest.json';
import esManifest from '../../content/arena-multilingual/generated/es/manifest.json';
import frManifest from '../../content/arena-multilingual/generated/fr/manifest.json';
import { arenaCanonicalSha256 } from './arena_content_generation';
import { ADMIN_SENSITIVE_WRITE_OPTIONS, requireAdminAppCheck } from './callable_options';

/**
 * Read-only admin projection for the Codex-generated Arena language packages.
 *
 * The task payloads are intentionally not accepted by these callables. Each
 * package is about 10 MB and there is no reviewed, durable staging transport
 * for it yet. Shipping only the small manifests lets the owner inspect exact
 * counts and fingerprints without creating a fake upload or an accidental
 * publication path.
 */

export const ARENA_ADMIN_CONTENT_TARGETS = ['es', 'fr', 'de'] as const;
export type ArenaAdminContentTarget = typeof ARENA_ADMIN_CONTENT_TARGETS[number];

const REQUIRED_TASK_COUNT = 4_000;
const HASH = /^[a-f0-9]{64}$/u;
const REQUIRED_BLOCK_REASONS = [
  'independent_review_and_admin_publication_required',
  'lexical_facts_pending_native_review',
] as const;
const REQUIRED_QUOTAS = Object.freeze({
  'fill_gap:1': 160,
  'fill_gap:2': 180,
  'fill_gap:3': 160,
  'find_oddity:1': 110,
  'find_oddity:2': 205,
  'find_oddity:3': 0,
  'guess_phrase:1': 470,
  'guess_phrase:2': 554,
  'guess_phrase:3': 469,
  'speed_match:1': 60,
  'speed_match:2': 70,
  'speed_match:3': 62,
  'translate_build:1': 400,
  'translate_build:2': 700,
  'translate_build:3': 400,
});

type Row = Record<string, unknown>;

const BUNDLED_MANIFESTS: Readonly<Record<ArenaAdminContentTarget, unknown>> = Object.freeze({
  es: esManifest,
  fr: frManifest,
  de: deManifest,
});

function isRecord(value: unknown): value is Row {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isTarget(value: unknown): value is ArenaAdminContentTarget {
  return typeof value === 'string'
    && (ARENA_ADMIN_CONTENT_TARGETS as readonly string[]).includes(value);
}

export type ArenaAdminManifestValidation = Readonly<
  { ok: true; code: 'manifest_valid_draft' }
  | { ok: false; code:
    | 'target_unsupported'
    | 'manifest_schema_invalid'
    | 'target_mismatch'
    | 'task_count_not_exact'
    | 'draft_release_state_invalid'
    | 'block_reason_incomplete'
    | 'quota_matrix_invalid'
    | 'hash_invalid'
    | 'coverage_not_reviewed'
    | 'manifest_hash_mismatch' }
>;

function exactQuotaMatrix(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const expected = Object.entries(REQUIRED_QUOTAS);
  return Object.keys(value).length === expected.length
    && expected.every(([key, count]) => value[key] === count);
}

/** Validates manifest identity while preserving its mandatory DRAFT/BLOCK state. */
export function validateArenaAdminDraftManifest(
  manifest: unknown,
  expectedTarget: unknown,
): ArenaAdminManifestValidation {
  if (!isTarget(expectedTarget)) return { ok: false, code: 'target_unsupported' };
  if (!isRecord(manifest)
    || manifest.schemaVersion !== 'arena-multilingual-pool-manifest-v1') {
    return { ok: false, code: 'manifest_schema_invalid' };
  }
  if (manifest.studyTarget !== expectedTarget) return { ok: false, code: 'target_mismatch' };
  if (manifest.requiredTaskCount !== REQUIRED_TASK_COUNT
    || manifest.generatedTaskCount !== REQUIRED_TASK_COUNT) {
    return { ok: false, code: 'task_count_not_exact' };
  }
  if (manifest.verdict !== 'BLOCK' || manifest.releaseEligible !== false) {
    return { ok: false, code: 'draft_release_state_invalid' };
  }
  const blockReason = typeof manifest.blockReason === 'string' ? manifest.blockReason : '';
  if (REQUIRED_BLOCK_REASONS.some((reason) => !blockReason.split(';').includes(reason))) {
    return { ok: false, code: 'block_reason_incomplete' };
  }
  if (!exactQuotaMatrix(manifest.quotas)) return { ok: false, code: 'quota_matrix_invalid' };
  if ([manifest.evidencePackSha256, manifest.tasksSha256, manifest.semanticLedgerSha256,
    manifest.manifestSha256].some((value) => typeof value !== 'string' || !HASH.test(value))) {
    return { ok: false, code: 'hash_invalid' };
  }
  if (!isRecord(manifest.coverage)
    || manifest.coverage.lexicalFactInventoryStatus !== 'pending_native_review') {
    return { ok: false, code: 'coverage_not_reviewed' };
  }
  const { manifestSha256, ...body } = manifest;
  if (manifestSha256 !== arenaCanonicalSha256(body)) {
    return { ok: false, code: 'manifest_hash_mismatch' };
  }
  return { ok: true, code: 'manifest_valid_draft' };
}

function stringField(row: Row, key: string): string {
  return typeof row[key] === 'string' ? row[key] : '';
}

function statusRow(target: ArenaAdminContentTarget, manifest: unknown) {
  const validation = validateArenaAdminDraftManifest(manifest, target);
  const row = isRecord(manifest) ? manifest : {};
  const requiredTaskCount = Number(row.requiredTaskCount) || 0;
  const generatedTaskCount = Number(row.generatedTaskCount) || 0;
  const valid = validation.ok;
  return Object.freeze({
    studyTarget: target,
    requiredTaskCount,
    generatedTaskCount,
    countComplete: requiredTaskCount === REQUIRED_TASK_COUNT
      && generatedTaskCount === REQUIRED_TASK_COUNT,
    verdict: valid ? 'BLOCK' as const : 'BLOCK' as const,
    blockReason: valid
      ? stringField(row, 'blockReason')
      : `manifest_validation_failed:${validation.code}`,
    releaseEligible: false as const,
    manifestIntegrity: valid ? 'PASS' as const : 'BLOCK' as const,
    reviewReadiness: 'BLOCK' as const,
    publicationDecision: 'BLOCK' as const,
    manifestSha256: stringField(row, 'manifestSha256'),
    tasksSha256: stringField(row, 'tasksSha256'),
    semanticLedgerSha256: stringField(row, 'semanticLedgerSha256'),
    evidencePackSha256: stringField(row, 'evidencePackSha256'),
    validationCode: validation.code,
  });
}

export function arenaAdminContentStatus() {
  return Object.freeze({
    schemaVersion: 'arena-admin-content-status-v1' as const,
    workflow: 'DRAFT' as const,
    transport: Object.freeze({
      available: false as const,
      reason: 'large_static_package_transport_unavailable' as const,
      instruction: 'Generate and review with Codex static packages; no API generation or browser upload.',
    }),
    targets: Object.freeze(ARENA_ADMIN_CONTENT_TARGETS.map((target) => (
      statusRow(target, BUNDLED_MANIFESTS[target])
    ))),
  });
}

type AdminRequest = Readonly<{
  app?: unknown;
  auth?: Readonly<{ uid?: string; token?: Row }> | null;
}>;

function requireArenaContentAdmin(request: AdminRequest): void {
  requireAdminAppCheck(request);
  if (!String(request.auth?.uid ?? '').trim() || request.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
}

export const adminArenaContentStatus = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireArenaContentAdmin(request as AdminRequest);
    return arenaAdminContentStatus();
  },
);

export const adminArenaContentValidate = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireArenaContentAdmin(request as AdminRequest);
    const target = request.data?.studyTarget;
    if (!isTarget(target)) throw new HttpsError('invalid-argument', 'target_unsupported');
    const status = arenaAdminContentStatus().targets.find((row) => row.studyTarget === target);
    if (!status) throw new HttpsError('failed-precondition', 'manifest_missing');
    return { ok: status.manifestIntegrity === 'PASS', target: status };
  },
);
