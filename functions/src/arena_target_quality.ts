import {
  validateTournamentTaskForNewRoom,
  type TournamentTask,
  type TournamentTaskKind,
} from './tournament_core';
import {
  ARENA_TASK_MODES,
  arenaStudyTargetMeta,
  resolveArenaStudyTarget,
  type ArenaStudyTarget,
  type ArenaTaskMode,
} from './arena_target_registry';

export type ArenaTargetTask = Pick<
  TournamentTask,
  'taskId' | 'mode' | 'difficulty' | 'payload' | 'explanation'
> & { studyTarget?: unknown };
export type ArenaTargetEvidence = Readonly<{
  schemaVersion: 'arena-target-evidence-v1';
  profileId: string;
  factPack: Readonly<{ version: string; sha256: string }>;
  familyCode: string;
  modeProof: Readonly<Record<string, unknown>>;
}>;
export type ArenaTargetNewRoomTask = Omit<
  TournamentTask,
  'studyTarget' | 'sourceFactIds' | 'arenaEvidence'
> & Readonly<{
  studyTarget: ArenaStudyTarget;
  sourceFactIds: readonly string[];
  arenaEvidence: ArenaTargetEvidence;
}>;
export type ArenaTargetNewRoomExpectation = Readonly<{
  studyTarget: ArenaStudyTarget;
  factPackVersion: string;
  factPackSha256: string;
}>;
export type ArenaTargetNewRoomValidation = Readonly<{
  ok: true;
  kind: TournamentTaskKind;
}> | Readonly<{
  ok: false;
  reason: string;
}>;
export type ArenaTargetTaskValidation = Readonly<{
  ok: true;
}> | Readonly<{
  ok: false;
  reason:
    | 'arena_task_target_missing'
    | 'arena_task_target_mismatch'
    | 'arena_task_mode_invalid'
    | 'arena_task_options_invalid'
    | 'arena_task_options_duplicate'
    | 'arena_task_correct_index_invalid'
    | 'arena_task_distractor_reason_missing';
}>;

function normalizedChoice(value: unknown): string {
  return String(value ?? '').normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('und');
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function validateChoiceEvidence(task: ArenaTargetTask): ArenaTargetTaskValidation {
  const options = Array.isArray(task.payload?.options) ? task.payload.options : null;
  if (!options) return { ok: true };
  if (options.length < 2 || options.some((option) => typeof option !== 'string' || !option.trim())) {
    return { ok: false, reason: 'arena_task_options_invalid' };
  }
  const normalized = options.map(normalizedChoice);
  if (new Set(normalized).size !== normalized.length) {
    return { ok: false, reason: 'arena_task_options_duplicate' };
  }
  const correctIndex = Number(task.payload.correctIndex);
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
    return { ok: false, reason: 'arena_task_correct_index_invalid' };
  }
  const reasons = task.explanation?.wrongOptionReasons;
  if (!Array.isArray(reasons) || reasons.length !== options.length
    || reasons.some((reason, index) => index === correctIndex
      ? String(reason ?? '').trim().length !== 0
      : String(reason ?? '').trim().length === 0)) {
    return { ok: false, reason: 'arena_task_distractor_reason_missing' };
  }
  return { ok: true };
}

/** Deterministic first gate. It validates identity/evidence and never rewrites content. */
export function validateArenaTargetTask(
  task: ArenaTargetTask,
  expectedTarget: ArenaStudyTarget,
): ArenaTargetTaskValidation {
  const actualTarget = resolveArenaStudyTarget(task?.studyTarget);
  if (!actualTarget) return { ok: false, reason: 'arena_task_target_missing' };
  if (actualTarget !== expectedTarget) return { ok: false, reason: 'arena_task_target_mismatch' };
  if (!(ARENA_TASK_MODES as readonly string[]).includes(String(task.mode))) {
    return { ok: false, reason: 'arena_task_mode_invalid' };
  }
  return validateChoiceEvidence(task);
}

function validateEvidenceIdentity(
  task: TournamentTask,
  actualTarget: ArenaStudyTarget,
  expected: ArenaTargetNewRoomExpectation,
): ArenaTargetNewRoomValidation | null {
  const evidence = record(task.arenaEvidence);
  if (!evidence || evidence.schemaVersion !== 'arena-target-evidence-v1') {
    return { ok: false, reason: 'arena_task_evidence_missing' };
  }
  if (!hasOnlyKeys(evidence, ['schemaVersion', 'profileId', 'factPack', 'familyCode', 'modeProof'])) {
    return { ok: false, reason: 'arena_task_evidence_invalid' };
  }
  if (evidence.profileId !== arenaStudyTargetMeta(actualTarget).distractorProfile) {
    return { ok: false, reason: 'arena_task_profile_mismatch' };
  }
  const factPack = record(evidence.factPack);
  if (!factPack || !hasOnlyKeys(factPack, ['version', 'sha256'])
    || factPack.version !== expected.factPackVersion
    || factPack.sha256 !== expected.factPackSha256
    || !/^[a-f0-9]{64}$/u.test(String(factPack.sha256 ?? ''))) {
    return { ok: false, reason: 'arena_task_fact_pack_mismatch' };
  }
  const mode = String(task.mode) as ArenaTaskMode;
  const expectedFamily = `${actualTarget}:${arenaStudyTargetMeta(actualTarget).distractorProfile}:${mode}:v1`;
  if (!(ARENA_TASK_MODES as readonly string[]).includes(mode) || evidence.familyCode !== expectedFamily) {
    return { ok: false, reason: 'arena_task_family_invalid' };
  }
  if (!Array.isArray(task.sourceFactIds) || task.sourceFactIds.length === 0
    || task.sourceFactIds.length > 32
    || new Set(task.sourceFactIds).size !== task.sourceFactIds.length
    || task.sourceFactIds.some((factId) => !nonEmptyString(factId)
      || Buffer.byteLength(factId, 'utf8') > 256
      || !factId.startsWith(`${actualTarget}-`))) {
    return { ok: false, reason: 'arena_task_source_facts_invalid' };
  }
  if (!record(evidence.modeProof)) return { ok: false, reason: 'arena_task_mode_proof_invalid' };
  return null;
}

function validateChoiceForNewArenaRoom(task: TournamentTask): ArenaTargetNewRoomValidation | null {
  const options = Array.isArray(task.payload.options) ? task.payload.options : [];
  const normalized = options.map(normalizedChoice);
  if (new Set(normalized).size !== normalized.length) {
    return { ok: false, reason: 'arena_task_options_duplicate' };
  }
  const correctIndex = Number(task.payload.correctIndex);
  const proof = record(record(task.arenaEvidence)?.modeProof);
  if (!proof || !hasOnlyKeys(proof, ['kind', 'reasons'])) {
    return { ok: false, reason: 'arena_task_mode_proof_invalid' };
  }
  const reasons = Array.isArray(proof?.reasons) ? proof.reasons : [];
  const reasonIndexes = new Set<number>();
  for (const reason of reasons) {
    const entry = record(reason);
    if (!entry || !hasOnlyKeys(entry, ['optionIndex', 'reasonCode'])
      || !Number.isInteger(entry.optionIndex) || !nonEmptyString(entry.reasonCode)) {
      return { ok: false, reason: 'arena_task_distractor_reason_missing' };
    }
    reasonIndexes.add(Number(entry.optionIndex));
  }
  const expectedIndexes = options.map((_, index) => index).filter((index) => index !== correctIndex);
  if (proof?.kind !== 'choice' || reasons.length !== expectedIndexes.length
    || reasonIndexes.size !== expectedIndexes.length
    || expectedIndexes.some((index) => !reasonIndexes.has(index))) {
    return { ok: false, reason: 'arena_task_distractor_reason_missing' };
  }
  const explanationReasons = task.explanation?.wrongOptionReasons;
  if (!Array.isArray(explanationReasons) || reasons.some((reason) => {
    const entry = record(reason)!;
    return explanationReasons[Number(entry.optionIndex)] !== entry.reasonCode;
  })) {
    return { ok: false, reason: 'arena_task_distractor_reason_mismatch' };
  }
  return null;
}

function surplusWordBankIndexes(wordBank: readonly string[], correctTokens: readonly string[]): number[] {
  const remaining = new Map<string, number>();
  for (const token of correctTokens) {
    const normalized = normalizedChoice(token);
    remaining.set(normalized, (remaining.get(normalized) ?? 0) + 1);
  }
  const surplus: number[] = [];
  wordBank.forEach((token, index) => {
    const normalized = normalizedChoice(token);
    const required = remaining.get(normalized) ?? 0;
    if (required > 0) remaining.set(normalized, required - 1);
    else surplus.push(index);
  });
  if (Array.from(remaining.values()).some((count) => count !== 0)) return [];
  return surplus;
}

function validateTranslateForNewArenaRoom(
  task: TournamentTask,
  actualTarget: ArenaStudyTarget,
): ArenaTargetNewRoomValidation | null {
  const proof = record(record(task.arenaEvidence)?.modeProof);
  if (!proof || !hasOnlyKeys(proof, [
    'kind', 'decoyIndex', 'decoyToken', 'decoyPartOfSpeech', 'reasonCode',
    'tokenizationPolicyId', 'correctTokenCount',
  ])) return { ok: false, reason: 'arena_task_mode_proof_invalid' };
  const wordBank = Array.isArray(task.payload.wordBank) ? task.payload.wordBank : [];
  const correctTokens = Array.isArray(task.payload.correctTokens) ? task.payload.correctTokens : [];
  const decoyIndex = Number(proof?.decoyIndex);
  const surplus = wordBank.every((token) => typeof token === 'string')
    && correctTokens.every((token) => typeof token === 'string')
    ? surplusWordBankIndexes(wordBank as string[], correctTokens as string[])
    : [];
  if (proof?.kind !== 'translate_build' || surplus.length !== 1
    || !Number.isInteger(decoyIndex) || decoyIndex !== surplus[0]
    || proof?.decoyToken !== wordBank[decoyIndex]
    || !nonEmptyString(proof?.decoyPartOfSpeech) || !nonEmptyString(proof?.reasonCode)) {
    return { ok: false, reason: 'arena_task_translate_decoy_invalid' };
  }
  if (proof.tokenizationPolicyId !== `${actualTarget}:arena-tokenization-v1`
    || proof.correctTokenCount !== correctTokens.length
    || proof.correctTokenCount !== task.payload.correctTokenCount) {
    return { ok: false, reason: 'arena_task_translate_tokenization_invalid' };
  }
  return null;
}

function validateSpeedMatchForNewArenaRoom(task: TournamentTask): ArenaTargetNewRoomValidation | null {
  const proof = record(record(task.arenaEvidence)?.modeProof);
  if (!proof || !hasOnlyKeys(proof, [
    'kind', 'pairCount', 'uniqueLeftCount', 'uniqueRightCount',
  ])) return { ok: false, reason: 'arena_task_mode_proof_invalid' };
  const items = Array.isArray(task.payload.items) ? task.payload.items : [];
  const rightOptions = Array.isArray(task.payload.rightOptions) ? task.payload.rightOptions : [];
  const left = items.map((item) => normalizedChoice(record(item)?.prompt));
  const right = rightOptions.map(normalizedChoice);
  const indexes = items.map((item) => Number(record(item)?.correctIndex));
  if (proof?.kind !== 'speed_match' || proof.pairCount !== 6
    || proof.uniqueLeftCount !== 6 || proof.uniqueRightCount !== 6
    || items.length !== 6 || rightOptions.length !== 6
    || new Set(left).size !== 6 || new Set(right).size !== 6
    || indexes.some((index) => !Number.isInteger(index) || index < 0 || index >= 6)
    || new Set(indexes).size !== 6) {
    return { ok: false, reason: 'arena_task_speed_match_invalid' };
  }
  return null;
}

/**
 * Fail-closed composition boundary for tasks selected into a new Arena room.
 * The legacy Tournament parser remains intentionally target-agnostic so
 * already-running rooms can still settle.
 */
export function validateArenaTaskForNewRoom(
  task: TournamentTask,
  expected: ArenaTargetNewRoomExpectation,
): ArenaTargetNewRoomValidation {
  const core = validateTournamentTaskForNewRoom(task);
  if (!core.ok) return core;

  const rawTarget = task.studyTarget;
  if (rawTarget === undefined || rawTarget === null || String(rawTarget).trim() === '') {
    return { ok: false, reason: 'arena_task_target_missing' };
  }
  const actualTarget = resolveArenaStudyTarget(rawTarget);
  if (!actualTarget) return { ok: false, reason: 'arena_task_target_unknown' };
  if (actualTarget !== expected.studyTarget) {
    return { ok: false, reason: 'arena_task_target_mismatch' };
  }

  const identityFailure = validateEvidenceIdentity(task, actualTarget, expected);
  if (identityFailure) return identityFailure;

  if (task.mode === 'translate_build') {
    const failure = validateTranslateForNewArenaRoom(task, actualTarget);
    if (failure) return failure;
  } else if (task.mode === 'speed_match') {
    const failure = validateSpeedMatchForNewArenaRoom(task);
    if (failure) return failure;
  } else {
    const failure = validateChoiceForNewArenaRoom(task);
    if (failure) return failure;
  }
  return core;
}
