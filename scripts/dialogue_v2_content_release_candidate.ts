import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { DIALOGUE_V2_CATALOGUE_INDEX } from '../shared/dialogue_v2_catalogue_index';
import {
  DIALOGUE_V2_REVIEW_ROLES,
  DIALOGUE_V2_STUDY_TARGETS,
} from '../shared/dialogue_v2_language_pack_contract';

const CANDIDATE_ID = 'dialogue-v2-content-candidate-v1';
const MANIFEST_SCHEMA_VERSION = 'dialogue-v2-content-candidate-manifest.v1';
const RECEIPT_SCHEMA_VERSION = 'dialogue-v2-content-review-receipt.v1';
const PENDING_STATUS = 'candidate_pending_authorized_review';
const AUTHORING_LEDGER_PATH = 'content/dialogues-v2/authoring/dialogue_v2_authoring_ru.json';
const PERSONA_PROFILES_PATH = 'content/dialogues-v2/authoring/dialogue_v2_persona_locale_profiles.v1.json';
const DRAFT_DIRECTORY = 'content/dialogues-v2/authoring/locale-drafts';
const CANDIDATE_DIRECTORY = 'content/dialogues-v2/release-candidate';
const MANIFEST_PATH = `${CANDIDATE_DIRECTORY}/dialogue_v2_content_candidate.v1.json`;
const PENDING_RECEIPT_PATH = `${CANDIDATE_DIRECTORY}/dialogue_v2_content_review_receipt.pending.v1.json`;
const RECEIPT_SCHEMA_PATH = `${CANDIDATE_DIRECTORY}/dialogue_v2_content_review_receipt.schema.v1.json`;
const SHA256_RE = /^[a-f0-9]{64}$/;
const TOKEN_RE = /^(?=.{1,128}$)[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

type JsonPrimitive = null | boolean | number | string;
type JsonValue = JsonPrimitive | readonly JsonValue[] | JsonObject;
interface JsonObject {
  readonly [key: string]: JsonValue;
}
type PlainRecord = Record<string, unknown>;

export type DialogueV2ContentCandidatePin = Readonly<{
  key: string;
  studyTarget: string;
  sourceScenarioId: string;
  worldId: string;
  rankRequired: number;
  cefr: string;
  objectiveCount: number;
  sourceDraftPath: string;
  sourceDraftSha256: string;
  sourceLedgerSha256: string;
  targetPayloadSha256: string;
  candidatePacketSha256: string;
}>;

export type DialogueV2ContentCandidateManifest = Readonly<{
  schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
  status: typeof PENDING_STATUS;
  candidateId: typeof CANDIDATE_ID;
  source: Readonly<{
    ledgerPath: typeof AUTHORING_LEDGER_PATH;
    ledgerSha256: string;
    personaProfilesPath: typeof PERSONA_PROFILES_PATH;
    personaProfilesSha256: string;
    draftDirectory: typeof DRAFT_DIRECTORY;
  }>;
  summary: Readonly<{
    sourceScenarioCount: 76;
    targetPacketCount: 304;
    studyTargets: readonly string[];
  }>;
  packets: readonly DialogueV2ContentCandidatePin[];
  manifestSha256: string;
}>;

export type DialogueV2CandidateValidation =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; error: string }>;

const CONTENT_REVIEW_RECEIPT_SCHEMA = Object.freeze({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'dialogue-v2-content-review-receipt.v1',
  title: 'Dialogue V2 content review receipt',
  type: 'object',
  additionalProperties: false,
  required: [
    'schemaVersion',
    'status',
    'candidateId',
    'candidateManifestSha256',
    'requiredReviewRoles',
    'review',
  ],
  properties: {
    schemaVersion: { const: RECEIPT_SCHEMA_VERSION },
    status: { enum: ['pending_authorized_review', 'approved_for_promotion'] },
    candidateId: { const: CANDIDATE_ID },
    candidateManifestSha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    requiredReviewRoles: {
      const: [...DIALOGUE_V2_REVIEW_ROLES],
    },
    review: {
      type: 'object',
      additionalProperties: false,
      required: [
        'decision',
        'reviewerId',
        'authorityReference',
        'reviewedAt',
        'packetCountReviewed',
        'roleVerdicts',
      ],
      properties: {
        decision: { enum: ['PENDING', 'APPROVE'] },
        reviewerId: { type: ['string', 'null'] },
        authorityReference: { type: ['string', 'null'] },
        reviewedAt: { type: ['string', 'null'], format: 'date-time' },
        packetCountReviewed: { type: 'integer', minimum: 0, maximum: 304 },
        roleVerdicts: {
          type: 'object',
          additionalProperties: false,
          properties: Object.fromEntries(DIALOGUE_V2_REVIEW_ROLES.map((role) => [
            role,
            { const: 'PASS' },
          ])),
        },
      },
    },
  },
} as const);

function plainRecord(value: unknown): PlainRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null ? value as PlainRecord : null;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0)) throw new Error('candidate_non_json_number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const object = plainRecord(value);
  if (!object) throw new Error('candidate_non_json_value');
  return `{${Object.keys(object).sort().map((key) => (
    `${JSON.stringify(key)}:${canonicalJson(object[key])}`
  )).join(',')}}`;
}

function sha256Bytes(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function hashDialogueV2CandidateValue(value: unknown): string {
  return sha256Bytes(Buffer.from(canonicalJson(value), 'utf8'));
}

function readJsonWithBytes(filePath: string): Readonly<{ value: unknown; bytes: Buffer }> {
  const bytes = fs.readFileSync(filePath);
  return { value: JSON.parse(bytes.toString('utf8')) as unknown, bytes };
}

function nonEmptyText(value: unknown): value is string {
  return typeof value === 'string'
    && value === value.trim()
    && value.length > 0
    && !/[\u0000-\u001f\u007f]/u.test(value);
}

function requireRecord(value: unknown, error: string): PlainRecord {
  const result = plainRecord(value);
  if (!result) throw new Error(error);
  return result;
}

function requireArray(value: unknown, error: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(error);
  return value;
}

function exactStringKeys(value: PlainRecord, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function immutableCandidatePacket(
  studyTarget: string,
  sourceScenarioId: string,
  sourceDraftSha256: string,
  sourceLedgerSha256: string,
  catalogue: Readonly<{ worldId: string; rankRequired: number; cefr: string }>,
  targetPayload: PlainRecord,
): JsonValue {
  return {
    schemaVersion: 'dialogue-v2-content-candidate-packet.v1',
    status: 'candidate_not_releaseable',
    studyTarget,
    sourceScenarioId,
    sourceDraftSha256,
    sourceLedgerSha256,
    catalogue,
    targetPayload: targetPayload as JsonValue,
  };
}

function manifestWithoutSelfHash(manifest: unknown): PlainRecord {
  const value = requireRecord(manifest, 'candidate_manifest_invalid');
  const clone: PlainRecord = {};
  for (const [key, item] of Object.entries(value)) {
    if (key !== 'manifestSha256') clone[key] = item;
  }
  return clone;
}

export function computeDialogueV2CandidateManifestSha256(manifest: unknown): string {
  return hashDialogueV2CandidateValue(manifestWithoutSelfHash(manifest));
}

export function buildDialogueV2ContentCandidate(
  repoRoot: string,
): DialogueV2ContentCandidateManifest {
  const ledgerAbsolutePath = path.join(repoRoot, ...AUTHORING_LEDGER_PATH.split('/'));
  const ledgerRead = readJsonWithBytes(ledgerAbsolutePath);
  const ledger = requireRecord(ledgerRead.value, 'authoring_ledger_invalid');
  if (ledger.schemaVersion !== 'dialogue-v2-authoring-ledger.v1'
    || ledger.status !== 'authoring_only_not_releaseable'
    || ledger.sourceLocale !== 'ru') throw new Error('authoring_ledger_not_candidate_source');
  const ledgerSha256 = sha256Bytes(ledgerRead.bytes);
  const profilesRead = readJsonWithBytes(path.join(repoRoot, ...PERSONA_PROFILES_PATH.split('/')));
  const profiles = requireRecord(profilesRead.value, 'persona_profiles_invalid');
  if (profiles.schemaVersion !== 'dialogue-v2-persona-locale-profiles.v1'
    || profiles.status !== 'draft_not_releaseable') throw new Error('persona_profiles_not_candidate_source');
  const profilesByTarget = requireRecord(profiles.targets, 'persona_profile_targets_invalid');
  if (!exactStringKeys(profilesByTarget, DIALOGUE_V2_STUDY_TARGETS)) {
    throw new Error('persona_profile_target_coverage_invalid');
  }
  const personaProfilesSha256 = sha256Bytes(profilesRead.bytes);
  const worlds = requireArray(ledger.worlds, 'authoring_worlds_invalid');
  const scenarios = new Map<string, Readonly<{ worldId: string; value: PlainRecord }>>();
  for (const rawWorld of worlds) {
    const world = requireRecord(rawWorld, 'authoring_world_invalid');
    if (!nonEmptyText(world.id)) throw new Error('authoring_world_invalid');
    for (const rawScenario of requireArray(world.scenarios, 'authoring_scenarios_invalid')) {
      const scenario = requireRecord(rawScenario, 'authoring_scenario_invalid');
      if (!nonEmptyText(scenario.id) || scenarios.has(scenario.id)) {
        throw new Error('authoring_scenario_id_invalid');
      }
      scenarios.set(scenario.id, { worldId: world.id, value: scenario });
    }
  }
  if (scenarios.size !== DIALOGUE_V2_CATALOGUE_INDEX.length) {
    throw new Error('authoring_scenario_count_invalid');
  }

  const pins: DialogueV2ContentCandidatePin[] = [];
  for (const studyTarget of DIALOGUE_V2_STUDY_TARGETS) {
    for (const catalogue of DIALOGUE_V2_CATALOGUE_INDEX) {
      const source = scenarios.get(catalogue.id);
      if (!source || source.worldId !== catalogue.worldId
        || source.value.rankRequired !== catalogue.rankRequired
        || source.value.cefr !== catalogue.cefr) throw new Error(`authoring_catalogue_mismatch:${catalogue.id}`);
      const sourceObjectives = requireArray(source.value.objectives, `authoring_objectives_invalid:${catalogue.id}`)
        .map((value) => requireRecord(value, `authoring_objective_invalid:${catalogue.id}`));
      if (sourceObjectives.length < 6 || sourceObjectives.length > 12
        || sourceObjectives.some((objective) => !nonEmptyText(objective.id))
        || new Set(sourceObjectives.map((objective) => objective.id as string)).size !== sourceObjectives.length) {
        throw new Error(`authoring_objectives_invalid:${catalogue.id}`);
      }
      const sourcePersonas = requireArray(source.value.personas, `authoring_personas_invalid:${catalogue.id}`)
        .map((value) => requireRecord(value, `authoring_persona_invalid:${catalogue.id}`));
      if (sourcePersonas.length < 1 || sourcePersonas.some((persona) => !nonEmptyText(persona.id))) {
        throw new Error(`authoring_personas_invalid:${catalogue.id}`);
      }

      const sourceDraftPath = `${DRAFT_DIRECTORY}/${catalogue.id}.all-targets.v1.json`;
      const draftRead = readJsonWithBytes(path.join(repoRoot, ...sourceDraftPath.split('/')));
      const draft = requireRecord(draftRead.value, `locale_draft_invalid:${catalogue.id}`);
      if (draft.schemaVersion !== 'dialogue-v2-locale-draft.v1'
        || draft.status !== 'draft_not_releaseable'
        || draft.sourceScenarioId !== catalogue.id) throw new Error(`locale_draft_not_candidate_source:${catalogue.id}`);
      const targets = requireRecord(draft.targets, `locale_draft_targets_invalid:${catalogue.id}`);
      if (!exactStringKeys(targets, DIALOGUE_V2_STUDY_TARGETS)) {
        throw new Error(`locale_draft_target_coverage_invalid:${catalogue.id}`);
      }
      const target = requireRecord(targets[studyTarget], `locale_target_invalid:${studyTarget}:${catalogue.id}`);
      const content = requireRecord(target.content, `locale_content_invalid:${studyTarget}:${catalogue.id}`);
      if (!['title', 'briefing', 'completionTone'].every((key) => nonEmptyText(content[key]))) {
        throw new Error(`locale_content_invalid:${studyTarget}:${catalogue.id}`);
      }
      const targetObjectives = requireArray(target.objectives, `locale_objectives_invalid:${studyTarget}:${catalogue.id}`)
        .map((value) => requireRecord(value, `locale_objective_invalid:${studyTarget}:${catalogue.id}`));
      if (targetObjectives.length !== sourceObjectives.length
        || targetObjectives.some((objective, index) => (
          objective.id !== sourceObjectives[index].id || !nonEmptyText(objective.label)
        ))) throw new Error(`locale_objectives_mismatch:${studyTarget}:${catalogue.id}`);
      const targetPersonas = requireArray(target.personas, `locale_personas_invalid:${studyTarget}:${catalogue.id}`)
        .map((value) => requireRecord(value, `locale_persona_invalid:${studyTarget}:${catalogue.id}`));
      const targetProfiles = requireRecord(
        profilesByTarget[studyTarget],
        `persona_profiles_invalid:${studyTarget}`,
      );
      if (targetPersonas.length !== sourcePersonas.length
        || targetPersonas.some((persona, index) => (
          persona.id !== sourcePersonas[index].id
          || !plainRecord(targetProfiles[persona.id as string])
        ))) throw new Error(`locale_personas_mismatch:${studyTarget}:${catalogue.id}`);

      const normalizedPersonas = targetPersonas.map((persona) => {
        const profile = requireRecord(
          targetProfiles[persona.id as string],
          `persona_profile_invalid:${studyTarget}:${String(persona.id)}`,
        );
        const displayName = nonEmptyText(persona.displayName) ? persona.displayName : profile.displayName;
        const styleNote = nonEmptyText(persona.styleNote) ? persona.styleNote : profile.styleNote;
        if (!nonEmptyText(displayName) || !nonEmptyText(styleNote)) {
          throw new Error(`persona_profile_copy_invalid:${studyTarget}:${String(persona.id)}`);
        }
        return { id: persona.id as string, displayName, styleNote };
      });
      const normalizedTarget = {
        content,
        personas: normalizedPersonas,
        objectives: targetObjectives,
      };

      const sourceDraftSha256 = sha256Bytes(draftRead.bytes);
      const targetPayloadSha256 = hashDialogueV2CandidateValue(normalizedTarget);
      const candidatePacketSha256 = hashDialogueV2CandidateValue(immutableCandidatePacket(
        studyTarget,
        catalogue.id,
        sourceDraftSha256,
        ledgerSha256,
        {
          worldId: catalogue.worldId,
          rankRequired: catalogue.rankRequired,
          cefr: catalogue.cefr,
        },
        normalizedTarget,
      ));
      pins.push(Object.freeze({
        key: `${studyTarget}:${catalogue.id}`,
        studyTarget,
        sourceScenarioId: catalogue.id,
        worldId: catalogue.worldId,
        rankRequired: catalogue.rankRequired,
        cefr: catalogue.cefr,
        objectiveCount: targetObjectives.length,
        sourceDraftPath,
        sourceDraftSha256,
        sourceLedgerSha256: ledgerSha256,
        targetPayloadSha256,
        candidatePacketSha256,
      }));
    }
  }
  if (pins.length !== 304) throw new Error('candidate_packet_count_invalid');

  const withoutHash = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    status: PENDING_STATUS,
    candidateId: CANDIDATE_ID,
    source: {
      ledgerPath: AUTHORING_LEDGER_PATH,
      ledgerSha256,
      personaProfilesPath: PERSONA_PROFILES_PATH,
      personaProfilesSha256,
      draftDirectory: DRAFT_DIRECTORY,
    },
    summary: {
      sourceScenarioCount: 76 as const,
      targetPacketCount: 304 as const,
      studyTargets: [...DIALOGUE_V2_STUDY_TARGETS],
    },
    packets: pins,
  } as const;
  return Object.freeze({
    ...withoutHash,
    manifestSha256: hashDialogueV2CandidateValue(withoutHash),
  });
}

function jsonEqual(left: unknown, right: unknown): boolean {
  try {
    return canonicalJson(left) === canonicalJson(right);
  } catch {
    return false;
  }
}

export function validateDialogueV2CandidateReplacement(
  existing: unknown,
  next: unknown,
): DialogueV2CandidateValidation {
  const current = plainRecord(existing);
  const replacement = plainRecord(next);
  if (!current || !replacement
    || current.candidateId !== CANDIDATE_ID
    || replacement.candidateId !== CANDIDATE_ID
    || typeof current.manifestSha256 !== 'string'
    || typeof replacement.manifestSha256 !== 'string'
    || !SHA256_RE.test(current.manifestSha256)
    || !SHA256_RE.test(replacement.manifestSha256)
    || computeDialogueV2CandidateManifestSha256(current) !== current.manifestSha256
    || computeDialogueV2CandidateManifestSha256(replacement) !== replacement.manifestSha256) {
    return { ok: false, error: 'existing_or_replacement_candidate_invalid' };
  }
  return jsonEqual(current, replacement)
    ? { ok: true }
    : { ok: false, error: 'candidate_id_immutable_conflict' };
}

export function validateDialogueV2ContentCandidate(
  manifest: unknown,
  repoRoot: string,
): DialogueV2CandidateValidation {
  try {
    const value = requireRecord(manifest, 'candidate_manifest_invalid');
    if (value.schemaVersion !== MANIFEST_SCHEMA_VERSION
      || value.status !== PENDING_STATUS
      || value.candidateId !== CANDIDATE_ID
      || typeof value.manifestSha256 !== 'string'
      || !SHA256_RE.test(value.manifestSha256)
      || computeDialogueV2CandidateManifestSha256(value) !== value.manifestSha256) {
      return { ok: false, error: 'candidate_manifest_invalid' };
    }
    const rebuilt = buildDialogueV2ContentCandidate(repoRoot);
    return jsonEqual(value, rebuilt)
      ? { ok: true }
      : { ok: false, error: 'candidate_sources_or_hashes_changed' };
  } catch {
    return { ok: false, error: 'candidate_sources_or_hashes_changed' };
  }
}

function buildPendingReceipt(manifest: DialogueV2ContentCandidateManifest): JsonValue {
  return {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    status: 'pending_authorized_review',
    candidateId: manifest.candidateId,
    candidateManifestSha256: manifest.manifestSha256,
    requiredReviewRoles: [...DIALOGUE_V2_REVIEW_ROLES],
    review: {
      decision: 'PENDING',
      reviewerId: null,
      authorityReference: null,
      reviewedAt: null,
      packetCountReviewed: 0,
      roleVerdicts: {},
    },
  };
}

function validIsoInstant(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function validApprovedReview(review: PlainRecord): boolean {
  if (!exactStringKeys(review, [
    'decision',
    'reviewerId',
    'authorityReference',
    'reviewedAt',
    'packetCountReviewed',
    'roleVerdicts',
  ])) return false;
  const verdicts = plainRecord(review.roleVerdicts);
  return review.decision === 'APPROVE'
    && typeof review.reviewerId === 'string'
    && TOKEN_RE.test(review.reviewerId)
    && nonEmptyText(review.authorityReference)
    && validIsoInstant(review.reviewedAt)
    && review.packetCountReviewed === 304
    && Boolean(verdicts)
    && exactStringKeys(verdicts as PlainRecord, DIALOGUE_V2_REVIEW_ROLES)
    && DIALOGUE_V2_REVIEW_ROLES.every((role) => verdicts?.[role] === 'PASS');
}

function validPendingReview(review: PlainRecord): boolean {
  return exactStringKeys(review, [
    'decision',
    'reviewerId',
    'authorityReference',
    'reviewedAt',
    'packetCountReviewed',
    'roleVerdicts',
  ])
    && review.decision === 'PENDING'
    && review.reviewerId === null
    && review.authorityReference === null
    && review.reviewedAt === null
    && review.packetCountReviewed === 0
    && jsonEqual(review.roleVerdicts, {});
}

export function evaluateDialogueV2ContentPromotionGate(
  manifest: unknown,
  receipt: unknown,
  repoRoot: string,
): DialogueV2CandidateValidation {
  const candidateValidation = validateDialogueV2ContentCandidate(manifest, repoRoot);
  if (!candidateValidation.ok) return candidateValidation;
  const candidate = manifest as DialogueV2ContentCandidateManifest;
  const value = plainRecord(receipt);
  if (!value || value.schemaVersion !== RECEIPT_SCHEMA_VERSION
    || value.candidateId !== candidate.candidateId
    || typeof value.candidateManifestSha256 !== 'string') {
    return { ok: false, error: 'authorized_review_invalid' };
  }
  if (value.candidateManifestSha256 !== candidate.manifestSha256) {
    return { ok: false, error: 'review_candidate_mismatch' };
  }
  if (!Array.isArray(value.requiredReviewRoles)
    || !jsonEqual(value.requiredReviewRoles, DIALOGUE_V2_REVIEW_ROLES)) {
    return { ok: false, error: 'authorized_review_invalid' };
  }
  const review = plainRecord(value.review);
  if (value.status === 'pending_authorized_review') {
    return review && validPendingReview(review)
      ? { ok: false, error: 'authorized_review_pending' }
      : { ok: false, error: 'authorized_review_invalid' };
  }
  if (value.status !== 'approved_for_promotion' || !review || !validApprovedReview(review)) {
    return { ok: false, error: 'authorized_review_invalid' };
  }
  return { ok: true };
}

/**
 * Local deterministic soak check for the approved content structure. It never
 * calls a provider and deliberately reports that it cannot judge live-model
 * semantic quality. Each synthetic turn is confined to its packet's target,
 * objective list and persona list, which catches cross-packet authoring drift.
 */
export function simulateDialogueV2DeterministicStress(
  manifest: unknown,
  repoRoot: string,
  turnsPerPacket: number,
): Readonly<{
  packetCount: number;
  turnsPerPacket: number;
  totalTurns: number;
  violations: readonly string[];
  semanticModelChecked: false;
}> {
  if (!Number.isSafeInteger(turnsPerPacket) || turnsPerPacket < 1 || turnsPerPacket > 10_000) {
    throw new Error('stress_turn_count_invalid');
  }
  const validation = validateDialogueV2ContentCandidate(manifest, repoRoot);
  if (!validation.ok) throw new Error(validation.error);
  const candidate = manifest as DialogueV2ContentCandidateManifest;
  const violations: string[] = [];
  const profiles = requireRecord(
    JSON.parse(fs.readFileSync(path.join(repoRoot, ...PERSONA_PROFILES_PATH.split('/')), 'utf8')) as unknown,
    'stress_persona_profiles_invalid',
  );
  const profilesByTarget = requireRecord(profiles.targets, 'stress_persona_profile_targets_invalid');

  for (const packet of candidate.packets) {
    const draftPath = path.resolve(repoRoot, packet.sourceDraftPath);
    const draft = requireRecord(JSON.parse(fs.readFileSync(draftPath, 'utf8')) as unknown, 'stress_draft_invalid');
    const targets = requireRecord(draft.targets, 'stress_targets_invalid');
    const target = requireRecord(targets[packet.studyTarget], 'stress_target_invalid');
    const objectives = requireArray(target.objectives, 'stress_objectives_invalid')
      .map((item) => requireRecord(item, 'stress_objective_invalid'));
    const personas = requireArray(target.personas, 'stress_personas_invalid')
      .map((item) => requireRecord(item, 'stress_persona_invalid'));
    const targetProfiles = requireRecord(
      profilesByTarget[packet.studyTarget],
      `stress_persona_profile_target_invalid:${packet.studyTarget}`,
    );

    for (let turn = 0; turn < turnsPerPacket; turn += 1) {
      const objective = objectives[turn % objectives.length];
      const persona = personas[turn % personas.length];
      if (!nonEmptyText(objective.id) || !nonEmptyText(objective.label)) {
        violations.push(`${packet.key}:objective:${turn}`);
      }
      const profile = nonEmptyText(persona.id) ? targetProfiles[persona.id] : undefined;
      const profileRecord: PlainRecord = plainRecord(profile) ?? {};
      // Locale drafts can override either field, otherwise they inherit it
      // from the target-specific persona profile used by the candidate build.
      const displayName = nonEmptyText(persona.displayName) ? persona.displayName : profileRecord.displayName;
      const styleNote = nonEmptyText(persona.styleNote) ? persona.styleNote : profileRecord.styleNote;
      if (!nonEmptyText(persona.id) || !nonEmptyText(displayName) || !nonEmptyText(styleNote)) {
        violations.push(`${packet.key}:persona:${turn}`);
      }
    }
  }

  return Object.freeze({
    packetCount: candidate.packets.length,
    turnsPerPacket,
    totalTurns: candidate.packets.length * turnsPerPacket,
    violations: Object.freeze(violations),
    semanticModelChecked: false,
  });
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function outputPaths(repoRoot: string): Readonly<{
  manifest: string;
  pendingReceipt: string;
  receiptSchema: string;
}> {
  return {
    manifest: path.join(repoRoot, ...MANIFEST_PATH.split('/')),
    pendingReceipt: path.join(repoRoot, ...PENDING_RECEIPT_PATH.split('/')),
    receiptSchema: path.join(repoRoot, ...RECEIPT_SCHEMA_PATH.split('/')),
  };
}

function writeCandidateArtifacts(repoRoot: string): void {
  const candidate = buildDialogueV2ContentCandidate(repoRoot);
  const paths = outputPaths(repoRoot);
  if (fs.existsSync(paths.manifest)) {
    const existingCandidate = JSON.parse(fs.readFileSync(paths.manifest, 'utf8')) as unknown;
    const replacement = validateDialogueV2CandidateReplacement(existingCandidate, candidate);
    if (!replacement.ok) throw new Error(replacement.error);
  }
  const expectedPendingReceipt = buildPendingReceipt(candidate);
  if (fs.existsSync(paths.pendingReceipt)) {
    const currentReceipt = requireRecord(
      JSON.parse(fs.readFileSync(paths.pendingReceipt, 'utf8')) as unknown,
      'existing_review_receipt_invalid',
    );
    if (!jsonEqual(currentReceipt, expectedPendingReceipt)) {
      throw new Error('refusing_to_overwrite_modified_review_receipt');
    }
  }
  writeJson(paths.manifest, candidate);
  writeJson(paths.receiptSchema, CONTENT_REVIEW_RECEIPT_SCHEMA);
  writeJson(paths.pendingReceipt, expectedPendingReceipt);
  process.stdout.write(`WROTE candidate=${candidate.candidateId} packets=304 status=${candidate.status}\n`);
}

function checkCandidateArtifacts(repoRoot: string): void {
  const paths = outputPaths(repoRoot);
  const manifest = JSON.parse(fs.readFileSync(paths.manifest, 'utf8')) as unknown;
  const receipt = JSON.parse(fs.readFileSync(paths.pendingReceipt, 'utf8')) as unknown;
  const schema = JSON.parse(fs.readFileSync(paths.receiptSchema, 'utf8')) as unknown;
  const candidateValidation = validateDialogueV2ContentCandidate(manifest, repoRoot);
  if (!candidateValidation.ok) throw new Error(candidateValidation.error);
  if (!jsonEqual(schema, CONTENT_REVIEW_RECEIPT_SCHEMA)) throw new Error('review_receipt_schema_changed');
  const promotion = evaluateDialogueV2ContentPromotionGate(manifest, receipt, repoRoot);
  if (promotion.ok || promotion.error !== 'authorized_review_pending') {
    throw new Error(promotion.ok ? 'pending_receipt_unexpectedly_promotable' : promotion.error);
  }
  const candidate = manifest as DialogueV2ContentCandidateManifest;
  process.stdout.write(
    `PASS candidate=${candidate.candidateId} packets=${candidate.summary.targetPacketCount} status=${candidate.status} promotion=blocked_pending_authorized_review\n`,
  );
}

function checkPromotionReceipt(repoRoot: string, receiptPath?: string): void {
  const paths = outputPaths(repoRoot);
  const manifest = JSON.parse(fs.readFileSync(paths.manifest, 'utf8')) as unknown;
  const selectedReceiptPath = receiptPath ? path.resolve(repoRoot, receiptPath) : paths.pendingReceipt;
  const receipt = JSON.parse(fs.readFileSync(selectedReceiptPath, 'utf8')) as unknown;
  const result = evaluateDialogueV2ContentPromotionGate(manifest, receipt, repoRoot);
  if (!result.ok) {
    process.stderr.write(`BLOCKED ${result.error}\n`);
    process.exitCode = 2;
    return;
  }
  process.stdout.write('PASS authorized_review_receipt_matches_candidate; promotion may be performed by a separate owner-authorized workflow\n');
}

function runCli(): void {
  const repoRoot = path.resolve(__dirname, '..');
  const [command = '--check', receiptPath] = process.argv.slice(2);
  if (command === '--write-candidate') {
    writeCandidateArtifacts(repoRoot);
    return;
  }
  if (command === '--check') {
    checkCandidateArtifacts(repoRoot);
    return;
  }
  if (command === '--promotion-gate') {
    checkPromotionReceipt(repoRoot, receiptPath);
    return;
  }
  throw new Error(`unknown_command:${command}`);
}

if (require.main === module) {
  try {
    runCli();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`FAIL ${message}\n`);
    process.exitCode = 1;
  }
}
