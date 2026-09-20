import { createHash } from 'node:crypto';
import {
  ARENA_STUDY_TARGETS,
  ARENA_TASK_MODES,
  arenaStudyTargetMeta,
  resolveArenaStudyTarget,
  type ArenaStudyTarget,
  type ArenaTaskMode,
} from './arena_target_registry';

export const ARENA_POOL_TASK_COUNT = 4_000 as const;
export const ARENA_REQUIRED_GENERATION_TARGETS = Object.freeze(['es', 'fr', 'de'] as const);
export const ARENA_REQUIRED_GENERATION_PLAN = Object.freeze({ es: 4_000, fr: 4_000, de: 4_000 } as const);
export const ARENA_DIFFICULTIES = Object.freeze([1, 2, 3] as const);
export const ARENA_CEFR_BANDS = Object.freeze(['A1', 'A2', 'B1', 'B2'] as const);
export type ArenaDifficulty = typeof ARENA_DIFFICULTIES[number];
export type ArenaCefrBand = typeof ARENA_CEFR_BANDS[number];

const HASH = /^[a-f0-9]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function canonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (isRecord(value)) {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  throw new Error('arena_canonical_value_invalid');
}

export function arenaCanonicalSha256(value: unknown): string {
  return createHash('sha256').update(canonical(value), 'utf8').digest('hex');
}

export const ARENA_REFERENCE_MODE_DIFFICULTY_QUOTAS = Object.freeze({
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
} as const);

type ArenaModeDifficultyQuotas = typeof ARENA_REFERENCE_MODE_DIFFICULTY_QUOTAS;
export type ArenaGeneratorProfile = Readonly<{
  schemaVersion: 'arena-generator-profile-v1';
  studyTarget: ArenaStudyTarget;
  sourceLocale: 'ru';
  targetLocale: 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE';
  speechLocale: 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE';
  cefrBands: readonly ArenaCefrBand[];
  modes: readonly ArenaTaskMode[];
  difficulties: readonly ArenaDifficulty[];
  modeDifficultyQuotas: ArenaModeDifficultyQuotas;
  requiredNewTaskCount: 0 | 4_000;
  linguisticEvidencePolicy: 'target_specific_fact_pack_required';
  englishRole: 'structure_only_not_linguistic_authority';
  profileSha256: string;
}>;

function buildProfile(target: ArenaStudyTarget): ArenaGeneratorProfile {
  const meta = arenaStudyTargetMeta(target);
  const body = Object.freeze({
    schemaVersion: 'arena-generator-profile-v1' as const,
    studyTarget: target,
    sourceLocale: meta.sourceLocale,
    targetLocale: meta.speechLocale,
    speechLocale: meta.speechLocale,
    cefrBands: ARENA_CEFR_BANDS,
    modes: ARENA_TASK_MODES,
    difficulties: ARENA_DIFFICULTIES,
    modeDifficultyQuotas: ARENA_REFERENCE_MODE_DIFFICULTY_QUOTAS,
    requiredNewTaskCount: (target === 'en' ? 0 : ARENA_POOL_TASK_COUNT) as 0 | 4_000,
    linguisticEvidencePolicy: 'target_specific_fact_pack_required' as const,
    englishRole: 'structure_only_not_linguistic_authority' as const,
  });
  return Object.freeze({ ...body, profileSha256: arenaCanonicalSha256(body) });
}

export const ARENA_GENERATOR_PROFILES: Readonly<Record<ArenaStudyTarget, ArenaGeneratorProfile>> =
  Object.freeze(Object.fromEntries(ARENA_STUDY_TARGETS.map((target) => [target, buildProfile(target)]))) as Record<ArenaStudyTarget, ArenaGeneratorProfile>;

export type ArenaDistractorTrapPlan = Readonly<{
  optionIndex: number;
  trapType: string;
  factIds: readonly string[];
}>;

export type ArenaPreauthoringReceipt = Readonly<{
  schemaVersion: 'arena-preauthoring-v1';
  role: 'arena_preauthoring_guardian';
  verdict: 'PASS' | 'HOLD';
  studyTarget: ArenaStudyTarget;
  sourceLocale: 'ru';
  mode: ArenaTaskMode;
  difficulty: ArenaDifficulty;
  cefrBand: ArenaCefrBand;
  poolVersion: string;
  profileSha256: string;
  generatorPromptSha256: string;
  evidencePackSha256: string;
  approvedExemplarSha256: string;
  semanticLedgerSha256: string;
  issuedAt: string;
  runId: string;
  authorRunId: string;
  authorMustNotSelfIssue: true;
  intendedAnswer: string;
  acceptedVariants: readonly string[];
  distractorTrapPlan: readonly ArenaDistractorTrapPlan[];
  inputSha256: string;
}>;

export type ArenaPreauthoringValidation = Readonly<{ ok: true; value: ArenaPreauthoringReceipt }>
  | Readonly<{ ok: false; reason:
    | 'preauthoring_schema_invalid'
    | 'preauthoring_not_pass'
    | 'preauthoring_identity_invalid'
    | 'preauthoring_hash_invalid'
    | 'preauthoring_independence_invalid'
    | 'preauthoring_trap_plan_invalid' }>;

const PREAUTHORING_KEYS = Object.freeze([
  'schemaVersion', 'role', 'verdict', 'studyTarget', 'sourceLocale', 'mode', 'difficulty', 'cefrBand',
  'poolVersion', 'profileSha256', 'generatorPromptSha256', 'evidencePackSha256',
  'approvedExemplarSha256', 'semanticLedgerSha256', 'issuedAt', 'runId', 'authorRunId',
  'authorMustNotSelfIssue', 'intendedAnswer', 'acceptedVariants', 'distractorTrapPlan', 'inputSha256',
]);

function requiredTrapCount(mode: ArenaTaskMode): number {
  if (mode === 'guess_phrase' || mode === 'fill_gap') return 3;
  if (mode === 'find_oddity' || mode === 'translate_build') return 1;
  return 0;
}

export function validateArenaPreauthoringReceipt(value: unknown): ArenaPreauthoringValidation {
  if (!isRecord(value) || !exactKeys(value, PREAUTHORING_KEYS)
    || value.schemaVersion !== 'arena-preauthoring-v1' || value.role !== 'arena_preauthoring_guardian') {
    return { ok: false, reason: 'preauthoring_schema_invalid' };
  }
  if (value.verdict !== 'PASS') return { ok: false, reason: 'preauthoring_not_pass' };
  const target = resolveArenaStudyTarget(value.studyTarget);
  const mode = (ARENA_TASK_MODES as readonly unknown[]).includes(value.mode) ? value.mode as ArenaTaskMode : null;
  if (!target || value.sourceLocale !== 'ru' || !mode
    || !(ARENA_DIFFICULTIES as readonly unknown[]).includes(value.difficulty)
    || !(ARENA_CEFR_BANDS as readonly unknown[]).includes(value.cefrBand)
    || typeof value.poolVersion !== 'string' || !ID.test(value.poolVersion)
    || typeof value.issuedAt !== 'string' || !Number.isFinite(Date.parse(value.issuedAt))
    || typeof value.runId !== 'string' || !ID.test(value.runId)
    || typeof value.authorRunId !== 'string' || !ID.test(value.authorRunId)
    || typeof value.intendedAnswer !== 'string' || value.intendedAnswer.trim() !== value.intendedAnswer
    || value.intendedAnswer.length === 0
    || !Array.isArray(value.acceptedVariants) || value.acceptedVariants.length === 0
    || value.acceptedVariants.some((item) => typeof item !== 'string' || !item.trim())) {
    return { ok: false, reason: 'preauthoring_identity_invalid' };
  }
  const hashes = [value.profileSha256, value.generatorPromptSha256, value.evidencePackSha256,
    value.approvedExemplarSha256, value.semanticLedgerSha256, value.inputSha256];
  if (hashes.some((item) => typeof item !== 'string' || !HASH.test(item))) {
    return { ok: false, reason: 'preauthoring_hash_invalid' };
  }
  if (value.authorMustNotSelfIssue !== true || value.runId === value.authorRunId) {
    return { ok: false, reason: 'preauthoring_independence_invalid' };
  }
  if (!Array.isArray(value.distractorTrapPlan)
    || value.distractorTrapPlan.length !== requiredTrapCount(mode)
    || value.distractorTrapPlan.some((item) => !isRecord(item)
      || !exactKeys(item, ['optionIndex', 'trapType', 'factIds'])
      || !Number.isInteger(item.optionIndex) || Number(item.optionIndex) < 0
      || typeof item.trapType !== 'string' || !item.trapType.trim()
      || !Array.isArray(item.factIds) || item.factIds.length === 0
      || item.factIds.some((factId) => typeof factId !== 'string' || !ID.test(factId)))) {
    return { ok: false, reason: 'preauthoring_trap_plan_invalid' };
  }
  return { ok: true, value: value as ArenaPreauthoringReceipt };
}

export type ArenaGeneratorRequest = Readonly<{
  schemaVersion: 'arena-generator-request-v1';
  studyTarget: ArenaStudyTarget;
  sourceLocale: 'ru';
  requestedTaskCount: 4_000;
  poolVersion: string;
  profileSha256: string;
  generatorPromptSha256: string;
  evidencePackSha256: string;
  approvedExemplarSha256: string;
  semanticLedgerSha256: string;
  preauthoringReceipt: ArenaPreauthoringReceipt;
}>;

export type ArenaGeneratorRequestValidation = Readonly<{ ok: true; value: ArenaGeneratorRequest }>
  | Readonly<{ ok: false; reason:
    | 'generator_schema_invalid'
    | 'generator_target_invalid'
    | 'generator_task_count_invalid'
    | 'generator_identity_invalid'
    | 'generator_profile_hash_mismatch'
    | 'preauthoring_identity_mismatch'
    | 'preauthoring_hash_mismatch'
    | Extract<ArenaPreauthoringValidation, { ok: false }>['reason'] }>;

const GENERATOR_KEYS = Object.freeze([
  'schemaVersion', 'studyTarget', 'sourceLocale', 'requestedTaskCount', 'poolVersion', 'profileSha256',
  'generatorPromptSha256', 'evidencePackSha256', 'approvedExemplarSha256', 'semanticLedgerSha256',
  'preauthoringReceipt',
]);

export function parseArenaGeneratorRequest(value: unknown): ArenaGeneratorRequestValidation {
  if (!isRecord(value) || !exactKeys(value, GENERATOR_KEYS)
    || value.schemaVersion !== 'arena-generator-request-v1' || value.sourceLocale !== 'ru') {
    return { ok: false, reason: 'generator_schema_invalid' };
  }
  const target = resolveArenaStudyTarget(value.studyTarget);
  if (!target) return { ok: false, reason: 'generator_target_invalid' };
  if (value.requestedTaskCount !== ARENA_POOL_TASK_COUNT) {
    return { ok: false, reason: 'generator_task_count_invalid' };
  }
  if (typeof value.poolVersion !== 'string' || !ID.test(value.poolVersion)
    || [value.profileSha256, value.generatorPromptSha256, value.evidencePackSha256,
      value.approvedExemplarSha256, value.semanticLedgerSha256]
      .some((item) => typeof item !== 'string' || !HASH.test(item))) {
    return { ok: false, reason: 'generator_identity_invalid' };
  }
  if (value.profileSha256 !== ARENA_GENERATOR_PROFILES[target].profileSha256) {
    return { ok: false, reason: 'generator_profile_hash_mismatch' };
  }
  const guardian = validateArenaPreauthoringReceipt(value.preauthoringReceipt);
  if (!guardian.ok) return guardian;
  if (guardian.value.studyTarget !== target || guardian.value.sourceLocale !== value.sourceLocale
    || guardian.value.poolVersion !== value.poolVersion) {
    return { ok: false, reason: 'preauthoring_identity_mismatch' };
  }
  if (guardian.value.profileSha256 !== value.profileSha256
    || guardian.value.generatorPromptSha256 !== value.generatorPromptSha256
    || guardian.value.evidencePackSha256 !== value.evidencePackSha256
    || guardian.value.approvedExemplarSha256 !== value.approvedExemplarSha256
    || guardian.value.semanticLedgerSha256 !== value.semanticLedgerSha256) {
    return { ok: false, reason: 'preauthoring_hash_mismatch' };
  }
  return { ok: true, value: value as ArenaGeneratorRequest };
}
