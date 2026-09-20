import {
  ARENA_DIFFICULTIES,
  ARENA_GENERATOR_PROFILES,
  ARENA_POOL_TASK_COUNT,
  arenaCanonicalSha256,
  type ArenaDifficulty,
} from './arena_content_generation';
import {
  ARENA_TASK_MODES,
  resolveArenaStudyTarget,
  type ArenaStudyTarget,
  type ArenaTaskMode,
} from './arena_target_registry';

const HASH = /^[a-f0-9]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const JSON_POINTER = /^(?:\/(?:[^~/]|~0|~1)*)+$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function normalized(value: unknown): string {
  return String(value ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase('und');
}

export type ArenaQualityRole =
  | 'mode_guardian'
  | 'target_linguist_primary'
  | 'ambiguity_adversary'
  | 'pedagogy_judge'
  | 'nonsense_judge'
  | 'target_isolation_judge'
  | 'pool_diversity_auditor'
  | 'release_guardian';

export const ARENA_TASK_REQUIRED_RECEIPT_COUNTS = Object.freeze({
  mode_guardian: 1,
  target_linguist_primary: 2,
  ambiguity_adversary: 2,
  pedagogy_judge: 1,
  nonsense_judge: 2,
  target_isolation_judge: 1,
} as const);

export const ARENA_POOL_REQUIRED_RECEIPT_COUNTS = Object.freeze({
  pool_diversity_auditor: 1,
  release_guardian: 1,
} as const);

export type ArenaDraftIdentity = Readonly<{
  taskId: string;
  studyTarget: ArenaStudyTarget;
  mode: ArenaTaskMode | 'pool';
  difficulty: ArenaDifficulty | 0;
  poolVersion: string;
  draftSha256: string;
  profileSha256: string;
  generatorPromptSha256: string;
  evidencePackSha256: string;
  approvedExemplarSha256: string;
  semanticLedgerSha256: string;
  deterministicFactsSha256: string;
}>;

export type ArenaReceiptCheck = Readonly<{ code: string; verdict: 'PASS' | 'BLOCK' }>;
export type ArenaReceiptEvidence = Readonly<{
  jsonPointer: string;
  exactQuote: string;
  factIds: readonly string[];
}>;
export type ArenaQualityReceipt = ArenaDraftIdentity & Readonly<{
  schemaVersion: 'arena-quality-receipt-v1';
  role: ArenaQualityRole;
  verdict: 'PASS' | 'BLOCK';
  issuedAt: string;
  runId: string;
  checks: readonly ArenaReceiptCheck[];
  evidence: readonly ArenaReceiptEvidence[];
  findings: readonly string[];
  mustFix: readonly string[];
  independence: Readonly<{
    authorRunIdDifferent: true;
    freshContext: true;
    selfIssued: false;
  }>;
}>;

export type ArenaDeterministicFacts = Readonly<{
  schemaVersion: 'arena-deterministic-facts-v1';
  ok: boolean;
  studyTarget: ArenaStudyTarget | null;
  mode: ArenaTaskMode | null;
  taskId: string;
  facts: Readonly<Record<string, boolean | number | string>>;
  findings: readonly string[];
  factsSha256: string;
}>;

const TARGET_MARKERS: Readonly<Record<ArenaStudyTarget, readonly string[]>> = Object.freeze({
  en: Object.freeze(['the', 'is', 'are', 'am', 'have', 'has', 'today', 'home', 'with', 'from']),
  es: Object.freeze(['el', 'la', 'los', 'las', 'estoy', 'está', 'soy', 'hoy', 'casa', 'con', 'desde']),
  fr: Object.freeze(['le', 'la', 'les', 'je', 'suis', 'est', 'aujourd’hui', "aujourd'hui", 'maison', 'avec']),
  de: Object.freeze(['der', 'die', 'das', 'ich', 'bin', 'ist', 'heute', 'haus', 'mit', 'aus']),
});

function wordSet(values: readonly string[]): Set<string> {
  return new Set(values.flatMap((value) => normalized(value).match(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu) ?? []));
}

function targetIdentityMatches(target: ArenaStudyTarget, values: readonly string[]): boolean {
  const words = wordSet(values);
  const score = (candidate: ArenaStudyTarget) => TARGET_MARKERS[candidate]
    .filter((marker) => words.has(normalized(marker))).length;
  const own = score(target);
  const strongestOther = Math.max(...(['en', 'es', 'fr', 'de'] as const)
    .filter((candidate) => candidate !== target).map(score));
  return own > 0 && own > strongestOther;
}

function choiceModeFacts(draft: Record<string, unknown>, mode: ArenaTaskMode, findings: string[]): Record<string, boolean | number | string> {
  const options = Array.isArray(draft.options) ? draft.options : [];
  const optionStrings = options.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  const correctIndex = Number(draft.correctIndex);
  const explanation = isRecord(draft.explanation) ? draft.explanation : {};
  const reasons = Array.isArray(explanation.wrongOptionReasons) ? explanation.wrongOptionReasons : [];
  const expectedOptions = mode === 'guess_phrase' || mode === 'fill_gap' || mode === 'find_oddity' ? 4 : 0;
  if (optionStrings.length !== expectedOptions) findings.push('mode_option_count_invalid');
  if (new Set(optionStrings.map(normalized)).size !== optionStrings.length) findings.push('options_not_unique');
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= optionStrings.length) {
    findings.push('correct_index_invalid');
  }
  if (reasons.length !== optionStrings.length || reasons.some((reason, index) => (
    index === correctIndex ? normalized(reason).length !== 0 : normalized(reason).length === 0
  ))) findings.push('distractor_proof_missing');
  return {
    optionCount: optionStrings.length,
    uniqueOptionCount: new Set(optionStrings.map(normalized)).size,
    correctIndex,
    distractorProofCount: reasons.filter((reason, index) => index !== correctIndex && normalized(reason)).length,
  };
}

export function buildArenaDeterministicFacts(value: unknown): ArenaDeterministicFacts {
  const draft = isRecord(value) ? value : {};
  const findings: string[] = [];
  const target = resolveArenaStudyTarget(draft.studyTarget);
  const mode = (ARENA_TASK_MODES as readonly unknown[]).includes(draft.mode) ? draft.mode as ArenaTaskMode : null;
  const taskId = typeof draft.taskId === 'string' && ID.test(draft.taskId) ? draft.taskId : '';
  if (!target) findings.push('target_invalid');
  if (!mode) findings.push('mode_invalid');
  if (!taskId) findings.push('task_id_invalid');
  if (!(ARENA_DIFFICULTIES as readonly unknown[]).includes(draft.difficulty)) findings.push('difficulty_invalid');
  if (typeof draft.poolVersion !== 'string' || !ID.test(draft.poolVersion)) findings.push('pool_version_invalid');
  const options = Array.isArray(draft.options)
    ? draft.options.filter((item): item is string => typeof item === 'string') : [];
  if (target && !targetIdentityMatches(target, options)) findings.push('target_script_or_lexicon_mismatch');

  let modeFacts: Record<string, boolean | number | string> = {};
  if (mode === 'guess_phrase' || mode === 'fill_gap' || mode === 'find_oddity') {
    modeFacts = choiceModeFacts(draft, mode, findings);
  } else if (mode === 'translate_build') {
    const tokenBank = Array.isArray(draft.tokenBank) ? draft.tokenBank : [];
    const requiredTokens = Array.isArray(draft.requiredTokens) ? draft.requiredTokens : [];
    if (tokenBank.length < 2 || requiredTokens.length < 1 || tokenBank.length !== requiredTokens.length + 1) {
      findings.push('translate_build_token_contract_invalid');
    }
    if (new Set(tokenBank.map(normalized)).size !== tokenBank.length) findings.push('options_not_unique');
    if (draft.tokenizationProof !== true) findings.push('tokenization_proof_missing');
    modeFacts = { tokenBankCount: tokenBank.length, requiredTokenCount: requiredTokens.length };
  } else if (mode === 'speed_match') {
    const pairs = Array.isArray(draft.pairs) ? draft.pairs : [];
    const left = pairs.map((pair) => isRecord(pair) ? normalized(pair.left) : '');
    const right = pairs.map((pair) => isRecord(pair) ? normalized(pair.right) : '');
    if (pairs.length !== 6 || left.includes('') || right.includes('')
      || new Set(left).size !== pairs.length || new Set(right).size !== pairs.length) {
      findings.push('speed_match_bijection_invalid');
    }
    modeFacts = { pairCount: pairs.length };
  }
  const facts = Object.freeze({
    identityValid: Boolean(target && mode && taskId),
    targetIdentityValid: !findings.includes('target_script_or_lexicon_mismatch'),
    modeContractValid: !findings.some((item) => item.includes('invalid') || item.includes('missing')),
    ...modeFacts,
  });
  const body = Object.freeze({
    schemaVersion: 'arena-deterministic-facts-v1' as const,
    ok: findings.length === 0,
    studyTarget: target,
    mode,
    taskId,
    facts,
    findings: Object.freeze(findings),
  });
  return Object.freeze({ ...body, factsSha256: arenaCanonicalSha256(body) });
}

const RECEIPT_KEYS = Object.freeze([
  'schemaVersion', 'role', 'verdict', 'taskId', 'studyTarget', 'mode', 'difficulty', 'poolVersion',
  'draftSha256', 'profileSha256', 'generatorPromptSha256', 'evidencePackSha256',
  'approvedExemplarSha256', 'semanticLedgerSha256', 'deterministicFactsSha256', 'issuedAt', 'runId',
  'checks', 'evidence', 'findings', 'mustFix', 'independence',
]);
const ROLES = new Set<ArenaQualityRole>([
  'mode_guardian', 'target_linguist_primary', 'ambiguity_adversary', 'pedagogy_judge',
  'nonsense_judge', 'target_isolation_judge', 'pool_diversity_auditor', 'release_guardian',
]);

function jsonPointerValue(root: unknown, pointer: string): unknown {
  if (!JSON_POINTER.test(pointer)) return undefined;
  return pointer.slice(1).split('/').reduce<unknown>((current, token) => {
    const key = token.replace(/~1/gu, '/').replace(/~0/gu, '~');
    if (Array.isArray(current) && /^\d+$/u.test(key)) return current[Number(key)];
    if (isRecord(current)) return current[key];
    return undefined;
  }, root);
}

function factIds(evidencePack: unknown): Set<string> {
  if (!isRecord(evidencePack) || !Array.isArray(evidencePack.facts)) return new Set();
  return new Set(evidencePack.facts.flatMap((fact) => (
    isRecord(fact) && typeof fact.id === 'string' && ID.test(fact.id) ? [fact.id] : []
  )));
}

export type ArenaReceiptValidation = Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason:
    | 'receipt_schema_invalid'
    | 'receipt_identity_mismatch'
    | 'receipt_hash_mismatch'
    | 'receipt_independence_invalid'
    | 'receipt_verdict_inconsistent'
    | 'receipt_quote_mismatch'
    | 'receipt_fact_missing' }>;

export function validateArenaQualityReceipt(
  value: unknown,
  current: Readonly<{ identity: ArenaDraftIdentity; draft: unknown; evidencePack: unknown }>,
): ArenaReceiptValidation {
  if (!isRecord(value) || !exactKeys(value, RECEIPT_KEYS)
    || value.schemaVersion !== 'arena-quality-receipt-v1' || !ROLES.has(value.role as ArenaQualityRole)
    || (value.verdict !== 'PASS' && value.verdict !== 'BLOCK')
    || typeof value.issuedAt !== 'string' || !Number.isFinite(Date.parse(value.issuedAt))
    || typeof value.runId !== 'string' || !ID.test(value.runId)
    || !Array.isArray(value.checks) || value.checks.length === 0
    || value.checks.some((check) => !isRecord(check) || !exactKeys(check, ['code', 'verdict'])
      || typeof check.code !== 'string' || !ID.test(check.code)
      || (check.verdict !== 'PASS' && check.verdict !== 'BLOCK'))
    || !Array.isArray(value.evidence) || value.evidence.length === 0
    || !Array.isArray(value.findings) || !Array.isArray(value.mustFix)) {
    return { ok: false, reason: 'receipt_schema_invalid' };
  }
  const identityKeys: readonly (keyof ArenaDraftIdentity)[] = [
    'taskId', 'studyTarget', 'mode', 'difficulty', 'poolVersion', 'draftSha256', 'profileSha256',
    'generatorPromptSha256', 'evidencePackSha256', 'approvedExemplarSha256', 'semanticLedgerSha256',
    'deterministicFactsSha256',
  ];
  if (identityKeys.some((key) => value[key] !== current.identity[key])) {
    const hashKeys = new Set(['draftSha256', 'profileSha256', 'generatorPromptSha256', 'evidencePackSha256',
      'approvedExemplarSha256', 'semanticLedgerSha256', 'deterministicFactsSha256']);
    return { ok: false, reason: identityKeys.some((key) => hashKeys.has(key) && value[key] !== current.identity[key])
      ? 'receipt_hash_mismatch' : 'receipt_identity_mismatch' };
  }
  if (current.identity.draftSha256 !== arenaCanonicalSha256(current.draft)
    || current.identity.evidencePackSha256 !== arenaCanonicalSha256(current.evidencePack)
    || !HASH.test(current.identity.profileSha256)
    || !HASH.test(current.identity.generatorPromptSha256)
    || !HASH.test(current.identity.approvedExemplarSha256)
    || !HASH.test(current.identity.semanticLedgerSha256)
    || !HASH.test(current.identity.deterministicFactsSha256)) {
    return { ok: false, reason: 'receipt_hash_mismatch' };
  }
  const independence = isRecord(value.independence) ? value.independence : null;
  if (!independence || !exactKeys(independence, ['authorRunIdDifferent', 'freshContext', 'selfIssued'])
    || independence.authorRunIdDifferent !== true || independence.freshContext !== true
    || independence.selfIssued !== false) return { ok: false, reason: 'receipt_independence_invalid' };
  if ((value.verdict === 'PASS' && (value.findings.length !== 0 || value.mustFix.length !== 0
      || value.checks.some((check) => (check as Record<string, unknown>).verdict !== 'PASS')))
    || (value.verdict === 'BLOCK' && (value.findings.length === 0 || value.mustFix.length === 0))) {
    return { ok: false, reason: 'receipt_verdict_inconsistent' };
  }
  const availableFacts = factIds(current.evidencePack);
  for (const item of value.evidence) {
    if (!isRecord(item) || !exactKeys(item, ['jsonPointer', 'exactQuote', 'factIds'])
      || typeof item.jsonPointer !== 'string' || typeof item.exactQuote !== 'string'
      || !Array.isArray(item.factIds) || item.factIds.length === 0) {
      return { ok: false, reason: 'receipt_schema_invalid' };
    }
    if (jsonPointerValue(current.draft, item.jsonPointer) !== item.exactQuote) {
      return { ok: false, reason: 'receipt_quote_mismatch' };
    }
    if (item.factIds.some((id) => typeof id !== 'string' || !availableFacts.has(id))) {
      return { ok: false, reason: 'receipt_fact_missing' };
    }
  }
  return { ok: true };
}

export type ArenaReleaseDecision = Readonly<{ decision: 'PASS' }>
  | Readonly<{ decision: 'HOLD'; reason: 'required_receipts_missing' | 'receipt_invalid' | 'pool_receipts_missing' }>
  | Readonly<{ decision: 'BLOCK'; reason: 'deterministic_failure' | 'review_blocked' | 'pool_manifest_invalid' }>;

function receiptCounts(receipts: readonly ArenaQualityReceipt[]): Map<ArenaQualityRole, number> {
  const result = new Map<ArenaQualityRole, number>();
  for (const receipt of receipts) result.set(receipt.role, (result.get(receipt.role) ?? 0) + 1);
  return result;
}

export function assessArenaTaskRelease(input: Readonly<{
  identity: ArenaDraftIdentity;
  draft: unknown;
  evidencePack: unknown;
  deterministicFacts: ArenaDeterministicFacts;
  receipts: readonly ArenaQualityReceipt[];
}>): ArenaReleaseDecision {
  if (!input.deterministicFacts.ok
    || input.identity.deterministicFactsSha256 !== input.deterministicFacts.factsSha256) {
    return { decision: 'BLOCK', reason: 'deterministic_failure' };
  }
  const counts = receiptCounts(input.receipts);
  if (Object.entries(ARENA_TASK_REQUIRED_RECEIPT_COUNTS)
    .some(([role, count]) => (counts.get(role as ArenaQualityRole) ?? 0) < count)) {
    return { decision: 'HOLD', reason: 'required_receipts_missing' };
  }
  const runIds = new Set<string>();
  for (const receipt of input.receipts) {
    if (runIds.has(receipt.runId)
      || !validateArenaQualityReceipt(receipt, { identity: input.identity, draft: input.draft, evidencePack: input.evidencePack }).ok) {
      return { decision: 'HOLD', reason: 'receipt_invalid' };
    }
    runIds.add(receipt.runId);
  }
  if (input.receipts.some((receipt) => receipt.verdict === 'BLOCK')) {
    return { decision: 'BLOCK', reason: 'review_blocked' };
  }
  return { decision: 'PASS' };
}

export type ArenaTargetPoolManifest = Readonly<{
  schemaVersion: 'arena-target-pool-manifest-v1';
  studyTarget: ArenaStudyTarget;
  poolVersion: string;
  taskCount: 4_000;
  reviewedTaskCount: 4_000;
  profileSha256: string;
  taskReceiptLedgerSha256: string;
  taskBundleSha256: string;
  modeDifficultyCounts: typeof ARENA_GENERATOR_PROFILES.en.modeDifficultyQuotas;
  taskReceiptRoleCounts: Readonly<Record<string, number>>;
  manifestSha256: string;
}>;

function validPoolManifest(value: unknown): value is ArenaTargetPoolManifest {
  if (!isRecord(value) || !exactKeys(value, [
    'schemaVersion', 'studyTarget', 'poolVersion', 'taskCount', 'reviewedTaskCount', 'profileSha256',
    'taskReceiptLedgerSha256', 'taskBundleSha256', 'modeDifficultyCounts', 'taskReceiptRoleCounts',
    'manifestSha256',
  ]) || value.schemaVersion !== 'arena-target-pool-manifest-v1') return false;
  const target = resolveArenaStudyTarget(value.studyTarget);
  if (!target || typeof value.poolVersion !== 'string' || !ID.test(value.poolVersion)
    || value.taskCount !== ARENA_POOL_TASK_COUNT || value.reviewedTaskCount !== ARENA_POOL_TASK_COUNT
    || value.profileSha256 !== ARENA_GENERATOR_PROFILES[target].profileSha256
    || [value.taskReceiptLedgerSha256, value.taskBundleSha256, value.manifestSha256]
      .some((item) => typeof item !== 'string' || !HASH.test(item))
    || !isRecord(value.modeDifficultyCounts) || !isRecord(value.taskReceiptRoleCounts)) return false;
  const expectedQuotas = ARENA_GENERATOR_PROFILES[target].modeDifficultyQuotas;
  const modeDifficultyCounts = value.modeDifficultyCounts;
  const taskReceiptRoleCounts = value.taskReceiptRoleCounts;
  if (!exactKeys(modeDifficultyCounts, Object.keys(expectedQuotas))
    || Object.entries(expectedQuotas).some(([cell, count]) => modeDifficultyCounts[cell] !== count)) return false;
  if (Object.entries(ARENA_TASK_REQUIRED_RECEIPT_COUNTS).some(([role, count]) => (
    taskReceiptRoleCounts[role] !== count * ARENA_POOL_TASK_COUNT
  ))) return false;
  const { manifestSha256: _hash, ...body } = value;
  return value.manifestSha256 === arenaCanonicalSha256(body);
}

export function assessArenaPoolPublication(input: Readonly<{
  manifest: unknown;
  evidencePack: unknown;
  receipts: readonly ArenaQualityReceipt[];
}>): ArenaReleaseDecision {
  const manifest = input.manifest;
  if (!validPoolManifest(manifest)) return { decision: 'BLOCK', reason: 'pool_manifest_invalid' };
  const counts = receiptCounts(input.receipts);
  if (Object.entries(ARENA_POOL_REQUIRED_RECEIPT_COUNTS)
    .some(([role, count]) => (counts.get(role as ArenaQualityRole) ?? 0) < count)) {
    return { decision: 'HOLD', reason: 'pool_receipts_missing' };
  }
  const identity: ArenaDraftIdentity = {
    taskId: `pool:${manifest.poolVersion}`,
    studyTarget: manifest.studyTarget,
    mode: 'pool',
    difficulty: 0,
    poolVersion: manifest.poolVersion,
    draftSha256: manifest.manifestSha256,
    profileSha256: manifest.profileSha256,
    generatorPromptSha256: input.receipts[0]?.generatorPromptSha256 ?? '',
    evidencePackSha256: arenaCanonicalSha256(input.evidencePack),
    approvedExemplarSha256: input.receipts[0]?.approvedExemplarSha256 ?? '',
    semanticLedgerSha256: input.receipts[0]?.semanticLedgerSha256 ?? '',
    deterministicFactsSha256: manifest.taskBundleSha256,
  };
  const runIds = new Set<string>();
  for (const receipt of input.receipts) {
    if (runIds.has(receipt.runId)
      || !validateArenaQualityReceipt(receipt, { identity, draft: manifest, evidencePack: input.evidencePack }).ok) {
      return { decision: 'HOLD', reason: 'receipt_invalid' };
    }
    runIds.add(receipt.runId);
  }
  if (input.receipts.some((receipt) => receipt.verdict === 'BLOCK')) {
    return { decision: 'BLOCK', reason: 'review_blocked' };
  }
  return { decision: 'PASS' };
}
