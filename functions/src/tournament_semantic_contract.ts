import { createHash } from 'node:crypto';
import { TOURNAMENT_TASK_LIMITS } from './tournament_core';
import {
  isOwnerApprovedTournamentMode,
  type OwnerApprovedTournamentMode,
} from './tournament_mode_contract';

export const TOURNAMENT_SEMANTIC_SCHEMA_VERSION = 'tournament-semantic-candidate-v1' as const;
export const TOURNAMENT_REVIEW_CONTRACT_VERSION = 'tournament-semantic-review-v1' as const;

export type TournamentModeKind = OwnerApprovedTournamentMode;
export type TournamentProvenanceKey = `${string}:${number}:${string}`;

export type FillGapTrapType =
  | 'morphology'
  | 'lexical_meaning'
  | 'collocation'
  | 'government'
  | 'agreement'
  | 'reference'
  | 'function_choice';

export type ReviewTrapType =
  | FillGapTrapType
  | 'minimal_phrase_change'
  | 'single_oddity_error'
  | 'build_decoy';

export type ReviewSubject = {
  readonly subjectId: string;
  readonly kind: 'choice_option' | 'build_token' | 'speed_pair';
  readonly declaredRole: 'correct' | 'distractor' | 'safe' | 'odd' | 'required' | 'decoy' | 'pair';
  readonly text: string;
  readonly completedText?: string;
  readonly trapType?: ReviewTrapType;
  readonly reason?: string;
  readonly metadata?: Readonly<Record<string, string>>;
};

export type TournamentSemanticCandidateInput = {
  readonly candidateId: string;
  readonly mode: TournamentModeKind;
  readonly difficulty: 1 | 2 | 3;
  readonly prompt: string;
  readonly context: Readonly<Record<string, unknown>>;
  readonly reviewSubjects: readonly ReviewSubject[];
  readonly provenanceKeys: readonly TournamentProvenanceKey[];
};

export type TournamentSemanticCandidate = TournamentSemanticCandidateInput & {
  readonly schemaVersion: typeof TOURNAMENT_SEMANTIC_SCHEMA_VERSION;
  readonly semanticSignature: string;
  readonly contentSha256: string;
};

export type CandidateRejectionReason =
  | 'candidate_fields_invalid'
  | 'schema_version_invalid'
  | 'candidate_id_invalid'
  | 'mode_invalid'
  | 'difficulty_invalid'
  | 'prompt_invalid'
  | 'context_invalid'
  | 'review_subjects_invalid'
  | 'subject_id_invalid'
  | 'subject_id_duplicate'
  | 'subject_kind_invalid'
  | 'subject_role_invalid'
  | 'subject_text_invalid'
  | 'subject_completed_text_invalid'
  | 'subject_trap_type_invalid'
  | 'subject_reason_invalid'
  | 'subject_reason_required'
  | 'subject_reason_forbidden'
  | 'subject_trap_required'
  | 'subject_trap_forbidden'
  | 'subject_metadata_invalid'
  | 'subject_value_duplicate'
  | 'subject_contract_invalid'
  | 'declared_key_invalid'
  | 'provenance_count_invalid'
  | 'provenance_key_invalid'
  | 'provenance_key_duplicate'
  | 'semantic_signature_invalid'
  | 'content_sha256_invalid'
  | 'semantic_signature_mismatch'
  | 'content_sha256_mismatch';

export type CandidateValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: CandidateRejectionReason };

const SUBJECT_KINDS = new Set(['choice_option', 'build_token', 'speed_pair']);
const SUBJECT_ROLES = new Set(['correct', 'distractor', 'safe', 'odd', 'required', 'decoy', 'pair']);
const TRAP_TYPES = new Set<ReviewTrapType>([
  'morphology',
  'lexical_meaning',
  'collocation',
  'government',
  'agreement',
  'reference',
  'function_choice',
  'minimal_phrase_change',
  'single_oddity_error',
  'build_decoy',
]);
const ERROR_ROLES = new Set(['distractor', 'odd', 'decoy']);
const SUBJECT_ID_BYTES = 160;
const PROVENANCE_KEY_BYTES = 256;
const METADATA_KEY_BYTES = 64;
const METADATA_VALUE_BYTES = 256;
const MAX_METADATA_ENTRIES = 16;
const MAX_METADATA_BYTES = 2_048;
const MAX_CONTEXT_BYTES = 4_096;
const MAX_CONTEXT_DEPTH = 8;
const MAX_CONTEXT_ENTRIES = 64;
const MAX_CONTEXT_KEY_BYTES = 128;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const PROVENANCE_PATTERN = /^[^:\s]+:\d+:[^:\s]+$/u;
const FORBIDDEN_CONTROLS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowlist = new Set(allowed);
  return Object.keys(value).every((key) => allowlist.has(key));
}

function boundedString(value: unknown, maxBytes: number): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value === value.trim()
    && !FORBIDDEN_CONTROLS.test(value)
    && Buffer.byteLength(value, 'utf8') <= maxBytes;
}

function isJsonValue(value: unknown, depth = 0): boolean {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (depth >= MAX_CONTEXT_DEPTH) return false;
  if (Array.isArray(value)) {
    return value.length <= MAX_CONTEXT_ENTRIES
      && value.every((item) => isJsonValue(item, depth + 1));
  }
  if (!isRecord(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= MAX_CONTEXT_ENTRIES
    && entries.every(([key, item]) => (
      boundedString(key, MAX_CONTEXT_KEY_BYTES) && isJsonValue(item, depth + 1)
    ));
}

function stableJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    )).join(',')}}`;
  }
  throw new Error('unsupported_canonical_json_value');
}

function sha256(value: unknown): string {
  return createHash('sha256').update(stableJson(value), 'utf8').digest('hex');
}

function compareLexically(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function canonicalSubject(subject: ReviewSubject, includeReason: boolean): Record<string, unknown> {
  return {
    subjectId: subject.subjectId,
    kind: subject.kind,
    declaredRole: subject.declaredRole,
    text: subject.text,
    completedText: subject.completedText ?? null,
    trapType: subject.trapType ?? null,
    reason: includeReason ? (subject.reason ?? null) : null,
    metadata: subject.metadata ?? null,
  };
}

function contentHash(candidate: TournamentSemanticCandidate): string {
  const reviewSubjects = [...candidate.reviewSubjects]
    .sort((left, right) => compareLexically(left.subjectId, right.subjectId))
    .map((subject) => canonicalSubject(subject, true));
  return sha256({
    schemaVersion: candidate.schemaVersion,
    reviewContractVersion: TOURNAMENT_REVIEW_CONTRACT_VERSION,
    mode: candidate.mode,
    difficulty: candidate.difficulty,
    prompt: candidate.prompt,
    context: candidate.context,
    reviewSubjects,
    provenanceKeys: [...candidate.provenanceKeys].sort(),
  });
}

function semanticHash(candidate: TournamentSemanticCandidate): string {
  const reviewSubjects = candidate.reviewSubjects
    .map((subject) => {
      const canonical = canonicalSubject(subject, false);
      delete canonical.subjectId;
      delete canonical.reason;
      return canonical;
    })
    .sort((left, right) => compareLexically(stableJson(left), stableJson(right)));
  return sha256({
    mode: candidate.mode,
    difficulty: candidate.difficulty,
    context: candidate.context,
    reviewSubjects,
  });
}

function validateContext(context: unknown): boolean {
  return isRecord(context)
    && isJsonValue(context)
    && Buffer.byteLength(stableJson(context), 'utf8') <= MAX_CONTEXT_BYTES;
}

function validateMetadata(metadata: unknown): boolean {
  if (!isRecord(metadata)) return false;
  const entries = Object.entries(metadata);
  return entries.length <= MAX_METADATA_ENTRIES
    && entries.every(([key, value]) => (
      boundedString(key, METADATA_KEY_BYTES)
      && boundedString(value, METADATA_VALUE_BYTES)
    ))
    && Buffer.byteLength(stableJson(metadata), 'utf8') <= MAX_METADATA_BYTES;
}

function normalizedSubjectText(value: string): string {
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase('en');
}

function validateSubject(subject: unknown): CandidateRejectionReason | null {
  if (!isRecord(subject) || !hasOnlyKeys(subject, [
    'subjectId', 'kind', 'declaredRole', 'text', 'completedText', 'trapType', 'reason', 'metadata',
  ])) return 'review_subjects_invalid';
  if (!boundedString(subject.subjectId, SUBJECT_ID_BYTES)) return 'subject_id_invalid';
  if (typeof subject.kind !== 'string' || !SUBJECT_KINDS.has(subject.kind)) return 'subject_kind_invalid';
  if (typeof subject.declaredRole !== 'string' || !SUBJECT_ROLES.has(subject.declaredRole)) {
    return 'subject_role_invalid';
  }
  const textBytes = subject.kind === 'build_token'
    ? TOURNAMENT_TASK_LIMITS.tokenBytes
    : TOURNAMENT_TASK_LIMITS.optionBytes;
  if (!boundedString(subject.text, textBytes)) return 'subject_text_invalid';
  if (subject.completedText !== undefined
    && !boundedString(subject.completedText, TOURNAMENT_TASK_LIMITS.referenceBytes)) {
    return 'subject_completed_text_invalid';
  }
  if (subject.trapType !== undefined
    && (typeof subject.trapType !== 'string' || !TRAP_TYPES.has(subject.trapType as ReviewTrapType))) {
    return 'subject_trap_type_invalid';
  }
  if (subject.reason !== undefined
    && !boundedString(subject.reason, TOURNAMENT_TASK_LIMITS.explanationBytes)) {
    return 'subject_reason_invalid';
  }
  if (subject.metadata !== undefined && !validateMetadata(subject.metadata)) {
    return 'subject_metadata_invalid';
  }
  if (ERROR_ROLES.has(subject.declaredRole)) {
    if (subject.reason === undefined) return 'subject_reason_required';
    if (subject.trapType === undefined) return 'subject_trap_required';
  } else {
    if (subject.reason !== undefined) return 'subject_reason_forbidden';
    if (subject.trapType !== undefined) return 'subject_trap_forbidden';
  }
  return null;
}

function countRole(subjects: readonly ReviewSubject[], role: ReviewSubject['declaredRole']): number {
  return subjects.filter((subject) => subject.declaredRole === role).length;
}

function validateModeSubjects(
  mode: TournamentModeKind,
  subjects: readonly ReviewSubject[],
): CandidateRejectionReason | null {
  if (mode === 'guess_phrase' || mode === 'fill_gap') {
    if (subjects.length !== 4 || subjects.some((subject) => subject.kind !== 'choice_option')) {
      return 'subject_contract_invalid';
    }
    const values = subjects.map((subject) => normalizedSubjectText(subject.text));
    if (new Set(values).size !== values.length) return 'subject_value_duplicate';
    const correctCount = countRole(subjects, 'correct');
    if (correctCount === 0) return 'declared_key_invalid';
    return correctCount === 1 && countRole(subjects, 'distractor') === 3
      ? null
      : 'subject_contract_invalid';
  }
  if (mode === 'find_oddity') {
    if (subjects.length !== 4 || subjects.some((subject) => subject.kind !== 'choice_option')) {
      return 'subject_contract_invalid';
    }
    const values = subjects.map((subject) => normalizedSubjectText(subject.text));
    if (new Set(values).size !== values.length) return 'subject_value_duplicate';
    const oddCount = countRole(subjects, 'odd');
    if (oddCount === 0) return 'declared_key_invalid';
    return oddCount === 1 && countRole(subjects, 'safe') === 3
      ? null
      : 'subject_contract_invalid';
  }
  if (mode === 'translate_build') {
    if (subjects.length < 2
      || subjects.length > TOURNAMENT_TASK_LIMITS.maxWordBankItems
      || subjects.some((subject) => subject.kind !== 'build_token')
      || countRole(subjects, 'decoy') !== 1
      || countRole(subjects, 'required') !== subjects.length - 1) {
      return 'subject_contract_invalid';
    }
    return null;
  }
  if (subjects.length !== 6
    || subjects.some((subject) => (
      subject.kind !== 'speed_pair'
      || subject.declaredRole !== 'pair'
      || subject.completedText === undefined
    ))) return 'subject_contract_invalid';
  const leftValues = subjects.map((subject) => normalizedSubjectText(subject.text));
  const rightValues = subjects.map((subject) => normalizedSubjectText(subject.completedText as string));
  if (new Set(leftValues).size !== leftValues.length
    || new Set(rightValues).size !== rightValues.length) return 'subject_value_duplicate';
  return null;
}

function validateStructure(candidate: unknown): CandidateRejectionReason | null {
  if (!isRecord(candidate) || !hasOnlyKeys(candidate, [
    'schemaVersion', 'candidateId', 'mode', 'difficulty', 'prompt', 'context',
    'reviewSubjects', 'provenanceKeys', 'semanticSignature', 'contentSha256',
  ])) return 'candidate_fields_invalid';
  if (candidate.schemaVersion !== TOURNAMENT_SEMANTIC_SCHEMA_VERSION) return 'schema_version_invalid';
  if (!boundedString(candidate.candidateId, TOURNAMENT_TASK_LIMITS.taskIdBytes)) {
    return 'candidate_id_invalid';
  }
  if (!isOwnerApprovedTournamentMode(candidate.mode)) return 'mode_invalid';
  if (typeof candidate.difficulty !== 'number' || !Number.isInteger(candidate.difficulty)
    || candidate.difficulty < 1 || candidate.difficulty > 3) return 'difficulty_invalid';
  if (!boundedString(candidate.prompt, TOURNAMENT_TASK_LIMITS.promptBytes)) return 'prompt_invalid';
  if (!validateContext(candidate.context)) return 'context_invalid';
  if (!Array.isArray(candidate.reviewSubjects) || candidate.reviewSubjects.length === 0) {
    return 'review_subjects_invalid';
  }
  for (const subject of candidate.reviewSubjects) {
    const reason = validateSubject(subject);
    if (reason) return reason;
  }
  const subjects = candidate.reviewSubjects as ReviewSubject[];
  const subjectIds = subjects.map((subject) => subject.subjectId.normalize('NFKC').toLocaleLowerCase('en'));
  if (new Set(subjectIds).size !== subjectIds.length) return 'subject_id_duplicate';
  const modeReason = validateModeSubjects(candidate.mode, subjects);
  if (modeReason) return modeReason;
  if (!Array.isArray(candidate.provenanceKeys)
    || candidate.provenanceKeys.length < 1 || candidate.provenanceKeys.length > 6) {
    return 'provenance_count_invalid';
  }
  if (candidate.provenanceKeys.some((key) => (
    !boundedString(key, PROVENANCE_KEY_BYTES) || !PROVENANCE_PATTERN.test(key)
  ))) return 'provenance_key_invalid';
  if (new Set(candidate.provenanceKeys).size !== candidate.provenanceKeys.length) {
    return 'provenance_key_duplicate';
  }
  return null;
}

function cloneJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneJsonValue);
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneJsonValue(item)]));
  }
  return value;
}

function cloneSubject(subject: ReviewSubject): ReviewSubject {
  if (subject.metadata !== undefined && !validateMetadata(subject.metadata)) {
    throw new Error('invalid_tournament_semantic_candidate:subject_metadata_invalid');
  }
  return Object.freeze({
    subjectId: subject.subjectId,
    kind: subject.kind,
    declaredRole: subject.declaredRole,
    text: subject.text,
    ...(subject.completedText === undefined ? {} : { completedText: subject.completedText }),
    ...(subject.trapType === undefined ? {} : { trapType: subject.trapType }),
    ...(subject.reason === undefined ? {} : { reason: subject.reason }),
    ...(subject.metadata === undefined ? {} : { metadata: Object.freeze({ ...subject.metadata }) }),
  });
}

export function createTournamentSemanticCandidate(
  input: TournamentSemanticCandidateInput,
): TournamentSemanticCandidate {
  if (!isRecord(input) || !hasOnlyKeys(input, [
    'candidateId', 'mode', 'difficulty', 'prompt', 'context', 'reviewSubjects', 'provenanceKeys',
  ])) throw new Error('invalid_tournament_semantic_candidate:candidate_fields_invalid');

  const reviewSubjects = Object.freeze(input.reviewSubjects.map(cloneSubject));
  const provenanceKeys = Object.freeze([...input.provenanceKeys]);
  const context = Object.freeze(cloneJsonValue(input.context) as Readonly<Record<string, unknown>>);
  const unhashed = {
    schemaVersion: TOURNAMENT_SEMANTIC_SCHEMA_VERSION,
    candidateId: input.candidateId,
    mode: input.mode,
    difficulty: input.difficulty,
    prompt: input.prompt,
    context,
    reviewSubjects,
    provenanceKeys,
    semanticSignature: '0'.repeat(64),
    contentSha256: '0'.repeat(64),
  } satisfies TournamentSemanticCandidate;
  const structureReason = validateStructure(unhashed);
  if (structureReason) throw new Error(`invalid_tournament_semantic_candidate:${structureReason}`);
  const semanticSignature = semanticHash(unhashed);
  const withSignature = { ...unhashed, semanticSignature };
  const candidate = Object.freeze({
    ...withSignature,
    contentSha256: contentHash(withSignature),
  });
  return candidate;
}

export function validateTournamentSemanticCandidate(
  candidate: TournamentSemanticCandidate,
): CandidateValidation {
  const structureReason = validateStructure(candidate);
  if (structureReason) return { ok: false, reason: structureReason };
  if (!HASH_PATTERN.test(candidate.semanticSignature)) {
    return { ok: false, reason: 'semantic_signature_invalid' };
  }
  if (!HASH_PATTERN.test(candidate.contentSha256)) {
    return { ok: false, reason: 'content_sha256_invalid' };
  }
  if (semanticHash(candidate) !== candidate.semanticSignature) {
    return { ok: false, reason: 'semantic_signature_mismatch' };
  }
  if (contentHash(candidate) !== candidate.contentSha256) {
    return { ok: false, reason: 'content_sha256_mismatch' };
  }
  return { ok: true };
}
