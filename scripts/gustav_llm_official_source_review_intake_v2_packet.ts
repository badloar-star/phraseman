import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type IntakeState = 'blocked_by_findings' | 'llm_official_source_review_ready';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
};

type Probe = {
  id: string;
  expectedAccept: boolean;
  accepted: boolean;
  blockers: number;
  passed: boolean;
};

type JsonObject = Record<string, unknown>;

type SourceFamily = {
  id: string;
  role: 'dictionary' | 'grammar_reference' | 'cefr_reference';
  required: boolean;
  aliases: string[];
};

type ReviewPolicy = {
  reviewFunctionOwner: 'llm_official_source_reviewer';
  nonLlmReviewDependencyRequired: false;
  llmReviewRequired: true;
  officialSourceVerificationRequired: true;
  minimumTrustedSourceFamilies: number;
  llmMayApproveWithoutOfficialSources: false;
  llmMayUseUnofficialSourcesForApproval: false;
  llmMustCiteEvidenceIds: true;
  llmMustCiteOfficialSourceUrlsOrIds: true;
  llmMustVerifySourceMeaningParity: true;
  llmMustVerifyLanguageIsolation: true;
  llmMustVerifyFrenchNaturalnessAndAntiCalque: true;
  llmMustRejectWrongLanguageBeforeReturnCache: true;
};

type Evaluation = {
  reviewFunctionOwner: 'llm_official_source_reviewer';
  nonLlmReviewDependencyRequired: false;
  llmReviewRequired: true;
  officialSourceVerificationRequired: true;
  trustedSourceFamilies: string[];
  trustedSourceFamilyCount: number;
  requiredTrustedSourceFamiliesPresent: number;
  minimumTrustedSourceFamilies: number;
  cambridgeSourceFamilyPresent: boolean;
  frenchAuthoritySourceFamilyPresent: boolean;
  grammarReferenceSourceFamilyPresent: boolean;
  llmMayApproveWithoutOfficialSources: false;
  llmMayUseUnofficialSourcesForApproval: false;
  llmMustCiteEvidenceIds: true;
  llmMustCiteOfficialSourceUrlsOrIds: true;
  llmMustVerifySourceMeaningParity: true;
  llmMustVerifyLanguageIsolation: true;
  llmMustVerifyFrenchNaturalnessAndAntiCalque: true;
  llmMustRejectWrongLanguageBeforeReturnCache: true;
  rowDecisionRows: number;
  aiDecisionRows: number;
  llmReviewedRowDecisionRows: number;
  llmReviewedAiDecisionRows: number;
  llmAcceptedRowDecisionRows: number;
  llmAcceptedAiDecisionRows: number;
  rowLlmAcceptedCoveragePct: number;
  aiLlmAcceptedCoveragePct: number;
  rowLlmReviewCoveragePct: number;
  aiLlmReviewCoveragePct: number;
  automatedRowQualityGateCoverage: number;
  automatedAiQualityGateCoverage: number;
  automatedHighRiskAiGateCoverage: number;
  rowsWithLanguageIsolationGate: number;
  rowsWithResearchEvidenceGate: number;
  rowsWithAntiCalqueGate: number;
  rowsWithGrammarGate: number;
  rowsWithNaturalnessGate: number;
  rowsWithSourceMeaningParityGate: number;
  rowsWithQuizGate: number;
  aiWithWrongLanguageGate: number;
  aiWithCacheLanguageKeyGate: number;
  aiRejectBeforeReturn: number;
  aiRejectBeforeCache: number;
  p13DryRunReady: boolean;
  p17OpeningPreflightReady: boolean;
  p17OpeningState: string;
  p17ReviewerImportAllowedNow: boolean;
  llmOfficialSourceReviewCanStart: boolean;
  llmOfficialSourceReviewComplete: boolean;
  llmOfficialSourceAcceptedReviewComplete: boolean;
  reviewerDecisionImportAllowedNow: false;
  generatedLedgerWritesAllowed: false;
  payloadCreationAllowed: false;
  serverUploadAllowed: false;
  firebaseUploadAllowed: false;
  runtimeDownloadsEnabled: false;
  activationApproved: false;
  readyForDecisionImportExecutionGate: boolean;
  readyForPayloadCreationApprovalPreflight: boolean;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
  intakeState: IntakeState;
  blockers: number;
  warnings: number;
};

type Report = {
  schemaVersion: 'gustav-llm-official-source-review-intake-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  summary: Evaluation & {
    targetLocale: 'fr';
    sourceLocales: number;
    sourceFamilyEvidenceCounts: Record<string, number>;
    fixtureProbesPassed: number;
    fixtureProbes: number;
  };
  artifactHashes: Record<string, string>;
  findings: Finding[];
  probes: Probe[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    manualReviewGateCreatedByThisScript: false;
    payloadShardsCreatedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

const REQUIRED_ROWS = 1600;
const REQUIRED_AI = 164;

const SOURCE_FAMILIES: SourceFamily[] = [
  {
    id: 'cambridge_dictionary',
    role: 'dictionary',
    required: true,
    aliases: ['cambridge english-french dictionary', 'cambridge french-english dictionary', 'cambridge'],
  },
  {
    id: 'larousse_dictionary_and_conjugation',
    role: 'dictionary',
    required: true,
    aliases: ['larousse conjugaison', 'larousse'],
  },
  {
    id: 'bescherelle_grammar',
    role: 'grammar_reference',
    required: true,
    aliases: ['bescherelle'],
  },
  {
    id: 'tv5monde_apprendre',
    role: 'grammar_reference',
    required: true,
    aliases: ['tv5monde apprendre', 'tv5monde'],
  },
  {
    id: 'academie_francaise',
    role: 'grammar_reference',
    required: true,
    aliases: ['academie francaise', 'académie française', 'academie', 'académie'],
  },
  {
    id: 'le_robert',
    role: 'dictionary',
    required: false,
    aliases: ['le robert', 'robert'],
  },
  {
    id: 'france_education_international',
    role: 'cefr_reference',
    required: false,
    aliases: ['france education international', 'delf a1'],
  },
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function readTextIfExists(filePath: string): string {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
  return 0;
}

function b(value: JsonObject, key: string): boolean {
  const raw = value[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
  return false;
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string): void {
  findings.push({ severity, code, message });
}

function defaultPolicy(): ReviewPolicy {
  return {
    reviewFunctionOwner: 'llm_official_source_reviewer',
    nonLlmReviewDependencyRequired: false,
    llmReviewRequired: true,
    officialSourceVerificationRequired: true,
    minimumTrustedSourceFamilies: 5,
    llmMayApproveWithoutOfficialSources: false,
    llmMayUseUnofficialSourcesForApproval: false,
    llmMustCiteEvidenceIds: true,
    llmMustCiteOfficialSourceUrlsOrIds: true,
    llmMustVerifySourceMeaningParity: true,
    llmMustVerifyLanguageIsolation: true,
    llmMustVerifyFrenchNaturalnessAndAntiCalque: true,
    llmMustRejectWrongLanguageBeforeReturnCache: true,
  };
}

function countSourceFamilies(...texts: string[]): Record<string, number> {
  const haystack = texts.join('\n').toLowerCase();
  const counts: Record<string, number> = {};
  for (const family of SOURCE_FAMILIES) {
    counts[family.id] = family.aliases.reduce((sum, alias) => {
      const pattern = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return sum + (haystack.match(new RegExp(pattern, 'g'))?.length ?? 0);
    }, 0);
  }
  return counts;
}

function presentSourceFamilies(counts: Record<string, number>): string[] {
  return SOURCE_FAMILIES.filter((family) => (counts[family.id] ?? 0) > 0).map((family) => family.id);
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 10000) / 100;
}

function evaluate(
  quality: JsonObject,
  ai: JsonObject,
  dryRun: JsonObject,
  preflight: JsonObject,
  sourceFamilyCounts: Record<string, number>,
  policy: ReviewPolicy,
): { metrics: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  const p13DryRunReady = n(dryRun, 'blockers') === 0 && b(dryRun, 'readyForReviewerDecisionImportV2DryRun');
  const p17OpeningPreflightReady = n(preflight, 'blockers') === 0 && b(preflight, 'readyForReviewerDecisionImportOpeningPreflight');
  const p17ReviewerImportAllowedNow = b(preflight, 'reviewerDecisionImportAllowedNow');
  const rowCoverage = n(quality, 'rowQualityGateRequirements');
  const aiCoverage = n(quality, 'aiQualityGateRequirements');
  const highRiskAiCoverage = n(quality, 'highRiskAiGateRequirements');
  const trustedFamilies = presentSourceFamilies(sourceFamilyCounts);
  const requiredTrustedSourceFamiliesPresent = SOURCE_FAMILIES.filter((family) => family.required && (sourceFamilyCounts[family.id] ?? 0) > 0).length;
  const cambridgeSourceFamilyPresent = (sourceFamilyCounts.cambridge_dictionary ?? 0) > 0;
  const frenchAuthoritySourceFamilyPresent =
    (sourceFamilyCounts.larousse_dictionary_and_conjugation ?? 0) > 0 ||
    (sourceFamilyCounts.academie_francaise ?? 0) > 0 ||
    (sourceFamilyCounts.le_robert ?? 0) > 0;
  const grammarReferenceSourceFamilyPresent =
    (sourceFamilyCounts.bescherelle_grammar ?? 0) > 0 ||
    (sourceFamilyCounts.tv5monde_apprendre ?? 0) > 0 ||
    (sourceFamilyCounts.academie_francaise ?? 0) > 0;
  const llmReviewedRowDecisionRows = n(dryRun, 'reviewedRowDecisionRows');
  const llmReviewedAiDecisionRows = n(dryRun, 'reviewedAiDecisionRows');
  const llmAcceptedRowDecisionRows = n(dryRun, 'acceptedRowDecisionRows');
  const llmAcceptedAiDecisionRows = n(dryRun, 'acceptedAiDecisionRows');
  const llmOfficialSourceReviewComplete =
    llmReviewedRowDecisionRows === REQUIRED_ROWS &&
    llmReviewedAiDecisionRows === REQUIRED_AI &&
    p13DryRunReady &&
    p17OpeningPreflightReady;
  const llmOfficialSourceAcceptedReviewComplete =
    llmOfficialSourceReviewComplete &&
    llmAcceptedRowDecisionRows === REQUIRED_ROWS &&
    llmAcceptedAiDecisionRows === REQUIRED_AI;

  if (policy.reviewFunctionOwner !== 'llm_official_source_reviewer') {
    addFinding(findings, 'blocker', 'review_function_owner_not_llm', 'Review function owner must be llm_official_source_reviewer.');
  }
  if (policy.nonLlmReviewDependencyRequired !== false) addFinding(findings, 'blocker', 'llm_official_source_reviewer_required', 'Non-LLM review dependency must not be a required gate.');
  if (!policy.llmReviewRequired) addFinding(findings, 'blocker', 'llm_review_not_required', 'LLM official-source review must be required.');
  if (!policy.officialSourceVerificationRequired) addFinding(findings, 'blocker', 'official_source_verification_not_required', 'LLM review must require official/trusted source verification.');
  if (policy.llmMayApproveWithoutOfficialSources !== false) addFinding(findings, 'blocker', 'llm_may_approve_without_official_sources', 'LLM must not approve without official/trusted source evidence.');
  if (policy.llmMayUseUnofficialSourcesForApproval !== false) addFinding(findings, 'blocker', 'llm_may_use_unofficial_sources_for_approval', 'Unofficial sources may not be approval evidence.');
  if (!policy.llmMustCiteEvidenceIds || !policy.llmMustCiteOfficialSourceUrlsOrIds) {
    addFinding(findings, 'blocker', 'llm_source_citation_not_required', 'LLM review must cite evidence ids and official source ids/URLs.');
  }
  if (!policy.llmMustVerifySourceMeaningParity) addFinding(findings, 'blocker', 'source_meaning_parity_not_required', 'LLM review must verify source meaning parity.');
  if (!policy.llmMustVerifyLanguageIsolation) addFinding(findings, 'blocker', 'language_isolation_not_required', 'LLM review must verify language isolation.');
  if (!policy.llmMustVerifyFrenchNaturalnessAndAntiCalque) addFinding(findings, 'blocker', 'naturalness_anticalque_not_required', 'LLM review must verify French naturalness and anti-calque constraints.');
  if (!policy.llmMustRejectWrongLanguageBeforeReturnCache) {
    addFinding(findings, 'blocker', 'wrong_language_reject_not_required', 'LLM review must preserve reject-before-return/cache for wrong-language output.');
  }
  if (trustedFamilies.length < policy.minimumTrustedSourceFamilies) {
    addFinding(findings, 'blocker', 'trusted_source_family_coverage_incomplete', `Expected at least ${policy.minimumTrustedSourceFamilies} trusted source families, found ${trustedFamilies.length}.`);
  }
  if (requiredTrustedSourceFamiliesPresent < 5) addFinding(findings, 'blocker', 'required_trusted_source_family_missing', 'Required Cambridge/Larousse/Bescherelle/TV5MONDE/Academie source families must be present.');
  if (!cambridgeSourceFamilyPresent) addFinding(findings, 'blocker', 'cambridge_source_family_missing', 'Cambridge dictionary evidence must remain available for lexical parity checks.');
  if (!frenchAuthoritySourceFamilyPresent) addFinding(findings, 'blocker', 'french_authority_source_family_missing', 'At least one French authority dictionary/source family must be present.');
  if (!grammarReferenceSourceFamilyPresent) addFinding(findings, 'blocker', 'grammar_reference_source_family_missing', 'At least one grammar reference source family must be present.');
  if (!p13DryRunReady) addFinding(findings, 'blocker', 'p13_dry_run_not_ready', 'P13 decision import dry-run must be blocker-free.');
  if (!p17OpeningPreflightReady) addFinding(findings, 'blocker', 'p17_opening_preflight_not_ready', 'P17 opening preflight must be blocker-free.');
  if (p17ReviewerImportAllowedNow) addFinding(findings, 'blocker', 'p17_import_allowed_now', 'P17 must not open reviewerDecisionImportAllowedNow.');
  if (n(quality, 'blockers') !== 0 || n(ai, 'blockers') !== 0) addFinding(findings, 'blocker', 'quality_or_ai_contract_blockers', 'Content quality and AI prompt contracts must be blocker-free.');
  if (rowCoverage !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_quality_gate_coverage_incomplete', `Expected ${REQUIRED_ROWS} automated row quality gates.`);
  if (aiCoverage !== REQUIRED_AI) addFinding(findings, 'blocker', 'ai_quality_gate_coverage_incomplete', `Expected ${REQUIRED_AI} automated AI quality gates.`);
  if (n(quality, 'rowsWithLanguageIsolationGate') !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'language_isolation_gate_coverage_incomplete', 'Every row must have language isolation gate coverage.');
  if (n(quality, 'rowsWithResearchEvidenceGate') !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'research_gate_coverage_incomplete', 'Every row must have research evidence gate coverage.');
  if (n(quality, 'rowsWithSourceMeaningParityGate') !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'source_meaning_parity_gate_incomplete', 'Every row must have source meaning parity gate coverage.');
  if (n(quality, 'rowsWithAntiCalqueGate') !== REQUIRED_ROWS || n(quality, 'rowsWithNaturalnessGate') !== REQUIRED_ROWS) {
    addFinding(findings, 'blocker', 'naturalness_or_anticalque_gate_incomplete', 'Every row must have naturalness and anti-calque gate coverage.');
  }
  if (n(quality, 'rowsWithQuizGate') !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'quiz_gate_coverage_incomplete', 'Every row must have quiz gate coverage.');
  if (n(quality, 'aiRejectBeforeReturn') !== REQUIRED_AI || n(quality, 'aiRejectBeforeCache') !== REQUIRED_AI) {
    addFinding(findings, 'blocker', 'ai_reject_before_return_or_cache_incomplete', 'Every AI contract must reject wrong fresh output before return/cache.');
  }
  if (
    b(quality, 'readyForApply') ||
    b(ai, 'readyForApply') ||
    b(dryRun, 'runtimeDownloadsEnabled') ||
    n(dryRun, 'activationApprovedFlags') !== 0
  ) {
    addFinding(findings, 'blocker', 'production_transition_open', 'LLM official-source intake must not open apply/download/activation.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const ready = blockers === 0;
  return {
    metrics: {
      reviewFunctionOwner: policy.reviewFunctionOwner,
      nonLlmReviewDependencyRequired: false,
      llmReviewRequired: true,
      officialSourceVerificationRequired: true,
      trustedSourceFamilies: trustedFamilies,
      trustedSourceFamilyCount: trustedFamilies.length,
      requiredTrustedSourceFamiliesPresent,
      minimumTrustedSourceFamilies: policy.minimumTrustedSourceFamilies,
      cambridgeSourceFamilyPresent,
      frenchAuthoritySourceFamilyPresent,
      grammarReferenceSourceFamilyPresent,
      llmMayApproveWithoutOfficialSources: false,
      llmMayUseUnofficialSourcesForApproval: false,
      llmMustCiteEvidenceIds: true,
      llmMustCiteOfficialSourceUrlsOrIds: true,
      llmMustVerifySourceMeaningParity: true,
      llmMustVerifyLanguageIsolation: true,
      llmMustVerifyFrenchNaturalnessAndAntiCalque: true,
      llmMustRejectWrongLanguageBeforeReturnCache: true,
      rowDecisionRows: n(dryRun, 'rowDecisionRows'),
      aiDecisionRows: n(dryRun, 'aiDecisionRows'),
      llmReviewedRowDecisionRows,
      llmReviewedAiDecisionRows,
      llmAcceptedRowDecisionRows,
      llmAcceptedAiDecisionRows,
      rowLlmReviewCoveragePct: pct(llmReviewedRowDecisionRows, REQUIRED_ROWS),
      aiLlmReviewCoveragePct: pct(llmReviewedAiDecisionRows, REQUIRED_AI),
      rowLlmAcceptedCoveragePct: pct(llmAcceptedRowDecisionRows, REQUIRED_ROWS),
      aiLlmAcceptedCoveragePct: pct(llmAcceptedAiDecisionRows, REQUIRED_AI),
      automatedRowQualityGateCoverage: rowCoverage,
      automatedAiQualityGateCoverage: aiCoverage,
      automatedHighRiskAiGateCoverage: highRiskAiCoverage,
      rowsWithLanguageIsolationGate: n(quality, 'rowsWithLanguageIsolationGate'),
      rowsWithResearchEvidenceGate: n(quality, 'rowsWithResearchEvidenceGate'),
      rowsWithAntiCalqueGate: n(quality, 'rowsWithAntiCalqueGate'),
      rowsWithGrammarGate: n(quality, 'rowsWithGrammarGate'),
      rowsWithNaturalnessGate: n(quality, 'rowsWithNaturalnessGate'),
      rowsWithSourceMeaningParityGate: n(quality, 'rowsWithSourceMeaningParityGate'),
      rowsWithQuizGate: n(quality, 'rowsWithQuizGate'),
      aiWithWrongLanguageGate: n(quality, 'aiWithWrongLanguageGate'),
      aiWithCacheLanguageKeyGate: n(quality, 'aiWithCacheLanguageKeyGate'),
      aiRejectBeforeReturn: n(quality, 'aiRejectBeforeReturn'),
      aiRejectBeforeCache: n(quality, 'aiRejectBeforeCache'),
      p13DryRunReady,
      p17OpeningPreflightReady,
      p17OpeningState: s(preflight, 'openingState'),
      p17ReviewerImportAllowedNow,
      llmOfficialSourceReviewCanStart: ready,
      llmOfficialSourceReviewComplete,
      llmOfficialSourceAcceptedReviewComplete,
      reviewerDecisionImportAllowedNow: false,
      generatedLedgerWritesAllowed: false,
      payloadCreationAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForDecisionImportExecutionGate: ready,
      readyForPayloadCreationApprovalPreflight: ready && llmOfficialSourceAcceptedReviewComplete,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      intakeState: ready ? 'llm_official_source_review_ready' : 'blocked_by_findings',
      blockers,
      warnings,
    },
    findings,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeProbe(
  id: string,
  expectedAccept: boolean,
  quality: JsonObject,
  ai: JsonObject,
  dryRun: JsonObject,
  preflight: JsonObject,
  counts: Record<string, number>,
  policy: ReviewPolicy,
  mutate?: (draft: {
    quality: JsonObject;
    ai: JsonObject;
    dryRun: JsonObject;
    preflight: JsonObject;
    counts: Record<string, number>;
    policy: ReviewPolicy;
  }) => void,
): Probe {
  const draft = {
    quality: clone(quality),
    ai: clone(ai),
    dryRun: clone(dryRun),
    preflight: clone(preflight),
    counts: clone(counts),
    policy: clone(policy),
  };
  mutate?.(draft);
  const result = evaluate(draft.quality, draft.ai, draft.dryRun, draft.preflight, draft.counts, draft.policy).metrics;
  const accepted = result.blockers === 0;
  return { id, expectedAccept, accepted, blockers: result.blockers, passed: accepted === expectedAccept };
}

function makeProbes(quality: JsonObject, ai: JsonObject, dryRun: JsonObject, preflight: JsonObject, counts: Record<string, number>, policy: ReviewPolicy): Probe[] {
  return [
    makeProbe('canonical_llm_official_source_review_contract_accepts', true, quality, ai, dryRun, preflight, counts, policy),
    makeProbe('non_llm_review_dependency_rejected', false, quality, ai, dryRun, preflight, counts, policy, (draft) => {
      (draft.policy as unknown as { nonLlmReviewDependencyRequired: boolean }).nonLlmReviewDependencyRequired = true;
    }),
    makeProbe('missing_cambridge_source_rejected', false, quality, ai, dryRun, preflight, counts, policy, (draft) => {
      draft.counts.cambridge_dictionary = 0;
    }),
    makeProbe('missing_required_source_family_rejected', false, quality, ai, dryRun, preflight, counts, policy, (draft) => {
      draft.counts.bescherelle_grammar = 0;
    }),
    makeProbe('llm_approval_without_official_sources_rejected', false, quality, ai, dryRun, preflight, counts, policy, (draft) => {
      (draft.policy as unknown as { llmMayApproveWithoutOfficialSources: boolean }).llmMayApproveWithoutOfficialSources = true;
    }),
    makeProbe('unofficial_sources_for_approval_rejected', false, quality, ai, dryRun, preflight, counts, policy, (draft) => {
      (draft.policy as unknown as { llmMayUseUnofficialSourcesForApproval: boolean }).llmMayUseUnofficialSourcesForApproval = true;
    }),
    makeProbe('missing_row_quality_gate_rejected', false, quality, ai, dryRun, preflight, counts, policy, (draft) => { draft.quality.rowQualityGateRequirements = 1599; }),
    makeProbe('missing_language_isolation_rejected', false, quality, ai, dryRun, preflight, counts, policy, (draft) => { draft.quality.rowsWithLanguageIsolationGate = 1599; }),
    makeProbe('missing_source_meaning_parity_rejected', false, quality, ai, dryRun, preflight, counts, policy, (draft) => { draft.quality.rowsWithSourceMeaningParityGate = 1599; }),
    makeProbe('missing_ai_reject_before_cache_rejected', false, quality, ai, dryRun, preflight, counts, policy, (draft) => { draft.quality.aiRejectBeforeCache = 163; }),
    makeProbe('p13_not_ready_rejected', false, quality, ai, dryRun, preflight, counts, policy, (draft) => { draft.dryRun.readyForReviewerDecisionImportV2DryRun = false; }),
    makeProbe('p17_import_open_rejected', false, quality, ai, dryRun, preflight, counts, policy, (draft) => { draft.preflight.reviewerDecisionImportAllowedNow = true; }),
    makeProbe('activation_open_rejected', false, quality, ai, dryRun, preflight, counts, policy, (draft) => { draft.dryRun.activationApprovedFlags = 1; }),
  ];
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav LLM Official-Source Review Intake V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Intake state: ${report.summary.intakeState}`,
    `- Review function owner: ${report.summary.reviewFunctionOwner}`,
    `- Non-LLM review dependency required: ${report.summary.nonLlmReviewDependencyRequired ? 'yes' : 'no'}`,
    `- LLM review required: ${report.summary.llmReviewRequired ? 'yes' : 'no'}`,
    `- Official/trusted source verification required: ${report.summary.officialSourceVerificationRequired ? 'yes' : 'no'}`,
    `- Trusted source families: ${report.summary.trustedSourceFamilies.join(', ')}`,
    `- Cambridge source family present: ${report.summary.cambridgeSourceFamilyPresent ? 'yes' : 'no'}`,
    `- French authority source family present: ${report.summary.frenchAuthoritySourceFamilyPresent ? 'yes' : 'no'}`,
    `- Grammar reference source family present: ${report.summary.grammarReferenceSourceFamilyPresent ? 'yes' : 'no'}`,
    `- LLM reviewed rows: ${report.summary.llmReviewedRowDecisionRows}/${report.summary.rowDecisionRows} (${report.summary.rowLlmReviewCoveragePct}%)`,
    `- LLM reviewed AI: ${report.summary.llmReviewedAiDecisionRows}/${report.summary.aiDecisionRows} (${report.summary.aiLlmReviewCoveragePct}%)`,
    `- LLM accepted rows: ${report.summary.llmAcceptedRowDecisionRows}/${report.summary.rowDecisionRows} (${report.summary.rowLlmAcceptedCoveragePct}%)`,
    `- LLM accepted AI: ${report.summary.llmAcceptedAiDecisionRows}/${report.summary.aiDecisionRows} (${report.summary.aiLlmAcceptedCoveragePct}%)`,
    `- Automated row quality coverage: ${report.summary.automatedRowQualityGateCoverage}/${report.summary.rowDecisionRows}`,
    `- Automated AI quality coverage: ${report.summary.automatedAiQualityGateCoverage}/${report.summary.aiDecisionRows}`,
    `- AI reject before return/cache: ${report.summary.aiRejectBeforeReturn}/${report.summary.aiRejectBeforeCache}`,
    `- Ready for decision import execution gate: ${report.summary.readyForDecisionImportExecutionGate ? 'yes' : 'no'}`,
    `- Ready for payload creation approval preflight: ${report.summary.readyForPayloadCreationApprovalPreflight ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const runArg = argValue('--run');
  const target = argValue('--target') ?? 'fr';
  if (!runArg) throw new Error('Usage: npx tsx scripts/gustav_llm_official_source_review_intake_v2_packet.ts --run <run-dir> --target fr');
  if (target !== 'fr') throw new Error('LLM official-source review intake V2 is scoped to --target fr.');

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const researchDir = path.join(runDir, 'research');
  ensureDir(auditsDir);

  const qualityPath = path.join(auditsDir, 'content_quality_gates_v2_packet.json');
  const aiPath = path.join(auditsDir, 'ai_prompt_contract_v2_packet.json');
  const dryRunPath = path.join(auditsDir, 'reviewer_decision_import_v2_dry_run.json');
  const preflightPath = path.join(auditsDir, 'reviewer_decision_import_opening_preflight_v2_packet.json');
  const researchPackPath = path.join(researchDir, 'fr_research_pack.json');
  const evidenceLedgerPath = path.join(researchDir, 'evidence_ledger.json');
  const researchVerifyPath = path.join(auditsDir, 'target_research_pack_verify_audit.json');
  const outJson = path.join(auditsDir, 'llm_official_source_review_intake_v2_packet.json');
  const outMd = path.join(auditsDir, 'llm_official_source_review_intake_v2_packet.md');
  for (const filePath of [qualityPath, aiPath, dryRunPath, preflightPath, researchPackPath, evidenceLedgerPath, researchVerifyPath]) {
    if (!fs.existsSync(filePath)) throw new Error(`Required input is missing: ${rel(repoRoot, filePath)}`);
  }

  const quality = object(readJson<JsonObject>(qualityPath).summary);
  const ai = object(readJson<JsonObject>(aiPath).summary);
  const dryRun = object(readJson<JsonObject>(dryRunPath).summary);
  const preflight = object(readJson<JsonObject>(preflightPath).summary);
  const sourceFamilyCounts = countSourceFamilies(
    readTextIfExists(researchPackPath),
    readTextIfExists(evidenceLedgerPath),
    readTextIfExists(researchVerifyPath),
  );
  const policy = defaultPolicy();
  const evaluated = evaluate(quality, ai, dryRun, preflight, sourceFamilyCounts, policy);
  const probes = makeProbes(quality, ai, dryRun, preflight, sourceFamilyCounts, policy);
  const findings = [...evaluated.findings];
  for (const probe of probes.filter((probe) => !probe.passed)) {
    addFinding(findings, 'blocker', 'fixture_probe_failed', `Fixture probe failed: ${probe.id}.`);
  }
  addFinding(findings, 'info', 'llm_official_source_review_gate_active', 'This packet keeps people-based review out of the dependency chain and assigns the review function to an LLM official-source reviewer.');
  addFinding(findings, 'info', 'llm_review_requires_trusted_sources', 'LLM review may not approve French content without Cambridge-style lexical evidence plus French authority/grammar evidence ids.');
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const summary = {
    ...evaluated.metrics,
    blockers,
    warnings,
    llmOfficialSourceReviewCanStart: blockers === 0 && evaluated.metrics.llmOfficialSourceReviewCanStart,
    readyForDecisionImportExecutionGate: blockers === 0 && evaluated.metrics.readyForDecisionImportExecutionGate,
    readyForPayloadCreationApprovalPreflight: blockers === 0 && evaluated.metrics.readyForPayloadCreationApprovalPreflight,
    intakeState: blockers === 0 ? evaluated.metrics.intakeState : 'blocked_by_findings',
  };

  const report: Report = {
    schemaVersion: 'gustav-llm-official-source-review-intake-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: { argv: process.argv.slice(2), cwd: repoRoot, nodeVersion: process.version },
    inputs: {
      contentQualityGatesV2Packet: rel(repoRoot, qualityPath),
      aiPromptContractV2Packet: rel(repoRoot, aiPath),
      reviewerDecisionImportV2DryRun: rel(repoRoot, dryRunPath),
      reviewerDecisionImportOpeningPreflightV2Packet: rel(repoRoot, preflightPath),
      frenchResearchPack: rel(repoRoot, researchPackPath),
      evidenceLedger: rel(repoRoot, evidenceLedgerPath),
      targetResearchPackVerifyAudit: rel(repoRoot, researchVerifyPath),
    },
    outputs: {
      llmOfficialSourceReviewIntakeV2PacketJson: rel(repoRoot, outJson),
      llmOfficialSourceReviewIntakeV2PacketMd: rel(repoRoot, outMd),
    },
    summary: {
      ...summary,
      targetLocale: 'fr',
      sourceLocales: 2,
      sourceFamilyEvidenceCounts: sourceFamilyCounts,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    artifactHashes: {
      contentQualityGatesV2Packet: sha256(qualityPath),
      aiPromptContractV2Packet: sha256(aiPath),
      reviewerDecisionImportV2DryRun: sha256(dryRunPath),
      reviewerDecisionImportOpeningPreflightV2Packet: sha256(preflightPath),
      frenchResearchPack: sha256(researchPackPath),
      evidenceLedger: sha256(evidenceLedgerPath),
      targetResearchPackVerifyAudit: sha256(researchVerifyPath),
    },
    findings,
    probes,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      manualReviewGateCreatedByThisScript: false,
      payloadShardsCreatedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outJson, report);
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV LLM official-source review intake V2 packet: ${report.status}`);
  console.log(`Intake state: ${report.summary.intakeState}`);
  console.log(`Review function owner: ${report.summary.reviewFunctionOwner}`);
  console.log(`Non-LLM review dependency required: ${report.summary.nonLlmReviewDependencyRequired ? 'yes' : 'no'}`);
  console.log(`Trusted source families: ${report.summary.trustedSourceFamilies.join(', ')}`);
  console.log(`LLM reviewed rows: ${report.summary.llmReviewedRowDecisionRows}/${report.summary.rowDecisionRows}`);
  console.log(`LLM reviewed AI: ${report.summary.llmReviewedAiDecisionRows}/${report.summary.aiDecisionRows}`);
  console.log(`LLM accepted rows: ${report.summary.llmAcceptedRowDecisionRows}/${report.summary.rowDecisionRows}`);
  console.log(`LLM accepted AI: ${report.summary.llmAcceptedAiDecisionRows}/${report.summary.aiDecisionRows}`);
  console.log(`Ready for decision import execution gate: ${report.summary.readyForDecisionImportExecutionGate ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);
  if (blockers > 0) process.exitCode = 1;
}

main();
