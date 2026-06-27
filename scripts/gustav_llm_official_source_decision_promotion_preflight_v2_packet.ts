import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type PromotionState = 'blocked_by_findings' | 'contract_ready_no_promoted_decisions_written' | 'contract_superseded_by_promoted_decisions';
type PendingDecision = 'pending_llm_official_source_review';

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

type RowCandidate = {
  dryRunScope: 'row';
  candidateProposalId: string;
  sourceTemplateRef: string;
  studyTarget: string;
  sourceLocaleCoverage: string[];
  lessonId: number;
  phraseId: string;
  schemaRowId: string;
  qualityRowId: string;
  sourceMeaningHash: string;
  researchEvidenceIds: string[];
  sourceFamilyIds: string[];
  requiredGateIds: string[];
  gateDecisionStatus: Record<string, string>;
  candidateDecision: PendingDecision | 'accept_quality_gates';
  acceptedDecisionRequires: Record<string, unknown>;
  reviewerTemplateOverwriteAllowed: boolean;
  reviewerDecisionImportAllowed: boolean;
  generatedLedgerWriteAllowed: boolean;
  payloadCreationAllowed: boolean;
  productionApplyAllowed: boolean;
  activationApproved: boolean;
};

type AiCandidate = {
  dryRunScope: 'ai_prompt';
  candidateProposalId: string;
  sourceTemplateRef: string;
  studyTarget: string;
  sourceLocaleCoverage: string[];
  contractId: string;
  aiQualityGateId: string;
  domainId: string;
  riskLevel: string;
  filePath: string;
  sourceFamilyPolicy: string;
  allowedSourceFamilyIds: string[];
  requiredGateIds: string[];
  cacheKeyDimensionsRequired: string[];
  wrongLanguageGateDecision: string;
  cacheLanguageGateDecision: string;
  liveReturnGateDecision: string;
  candidateDecision: PendingDecision | 'accept_contract';
  acceptedDecisionRequires: Record<string, unknown>;
  reviewerTemplateOverwriteAllowed: boolean;
  reviewerDecisionImportAllowed: boolean;
  generatedLedgerWriteAllowed: boolean;
  payloadCreationAllowed: boolean;
  productionApplyAllowed: boolean;
  activationApproved: boolean;
};

type RowTemplate = {
  reviewScope: 'row';
  lessonId: number;
  phraseId: string;
  schemaRowId: string;
  qualityRowId: string;
  studyTarget: string;
  sourceLocaleCoverage: string[];
  sourceMeaningHash: string;
  researchEvidenceIds: string[];
  requiredGateIds: string[];
};

type AiTemplate = {
  reviewScope: 'ai_prompt';
  aiQualityGateId: string;
  contractId: string;
  domainId: string;
  filePath: string;
  studyTarget: string;
  sourceLocaleCoverage: string[];
  requiredGateIds: string[];
  cacheKeyDimensionsRequired: string[];
};

type PromotionEvaluation = {
  rowCandidateProposals: number;
  aiCandidateProposals: number;
  rowCandidatesPending: number;
  aiCandidatesPending: number;
  acceptedRowCandidates: number;
  acceptedAiCandidates: number;
  rowTemplateLines: number;
  aiTemplateLines: number;
  rowCandidatesIdentityMatchedToTemplates: number;
  aiCandidatesIdentityMatchedToTemplates: number;
  rowCandidatesWithPromotionRequirements: number;
  aiCandidatesWithPromotionRequirements: number;
  rowCandidatesWithTrustedSourceFamilies: number;
  aiCandidatesWithAllowedSourceFamilies: number;
  rowCandidatesWithAllGateStatusPending: number;
  aiCandidatesWithLanguageCacheLiveGatesPending: number;
  futureRowPromotionTargetSeparateFromTemplate: boolean;
  futureAiPromotionTargetSeparateFromTemplate: boolean;
  futurePromotionTargetsConfinedToReviewerDir: boolean;
  promotedDecisionFilesWritten: number;
  reviewerTemplatesOverwritten: false;
  reviewerDecisionsImported: false;
  generatedLedgerWritesAllowed: false;
  payloadCreationAllowed: false;
  serverUploadAllowed: false;
  firebaseUploadAllowed: false;
  runtimeDownloadsEnabled: false;
  activationApproved: false;
  nonLlmReviewDependencyRequired: false;
  llmOfficialSourceReviewerRequired: true;
  readyForPromotedDecisionFileGeneration: boolean;
  readyForReviewerDecisionImportExecutionGateRefresh: false;
  readyForPayloadCreationApprovalPreflight: false;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
  promotionState: PromotionState;
  blockers: number;
  warnings: number;
};

type PromotionManifest = {
  schemaVersion: 'gustav-llm-official-source-decision-promotion-preflight-manifest-v2';
  runId: string;
  targetLocale: 'fr';
  studyTarget: 'fr';
  sourceLocales: Array<'ru' | 'uk'>;
  promotionMode: 'preflight_only_no_decisions_written';
  llmReviewerIdentity: 'llm_official_source_reviewer';
  futureDecisionFiles: {
    rowDecisionsReviewedV2: string;
    aiDecisionsReviewedV2: string;
  };
  futureRefreshCommands: string[];
  rowPromotionRequirements: string[];
  aiPromotionRequirements: string[];
  closedTransitions: Record<string, false>;
};

type Report = {
  schemaVersion: 'gustav-llm-official-source-decision-promotion-preflight-v2-packet-v0';
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
  summary: PromotionEvaluation & {
    targetLocale: 'fr';
    sourceLocales: number;
    fixtureProbesPassed: number;
    fixtureProbes: number;
  };
  artifactHashes: Record<string, string>;
  outputArtifactHashes: Record<string, string>;
  promotionManifest: PromotionManifest;
  findings: Finding[];
  probes: Probe[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerTemplatesModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    promotedDecisionFilesWrittenByThisScript: false;
    payloadShardsCreatedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

const REQUIRED_ROWS = 1600;
const REQUIRED_AI = 164;
const PENDING: PendingDecision = 'pending_llm_official_source_review';
const TRUSTED_SOURCE_FAMILIES = [
  'cambridge_dictionary',
  'larousse_dictionary_and_conjugation',
  'bescherelle_grammar',
  'tv5monde_apprendre',
  'academie_francaise',
  'le_robert',
  'france_education_international',
  'oqlf_vitrine_linguistique',
  'oxford_french_usage_guide',
];
const REQUIRED_ROW_PROMOTION_REQUIRES = [
  'evidenceIds',
  'officialOrTrustedSourceFamilyIds',
  'officialSourceUrlsOrIds',
  'sourceMeaningParity',
  'languageIsolation',
  'antiCalque',
  'grammarNaturalness',
  'quizOneCorrectAnswer',
];
const REQUIRED_AI_PROMOTION_REQUIRES = [
  'wrongLanguageGate',
  'cacheLanguageKeyGate',
  'rejectBeforeReturn',
  'rejectBeforeCache',
  'languageSafeFallback',
  'evidenceIdsOrDomainEvidence',
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

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function parseJsonl<T>(filePath: string): T[] {
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as T);
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

function sameSourceLocales(value: string[]): boolean {
  return JSON.stringify(value) === JSON.stringify(['ru', 'uk']);
}

function hasRequiredBooleans(record: Record<string, unknown>, required: string[]): boolean {
  return required.every((key) => record[key] === true);
}

function allGatesPending(gates: string[], statuses: Record<string, string>): boolean {
  return gates.length > 0 && gates.every((gate) => statuses[gate] === PENDING);
}

function hasOpenTransition(candidate: RowCandidate | AiCandidate): boolean {
  return Boolean(
    candidate.reviewerTemplateOverwriteAllowed ||
    candidate.reviewerDecisionImportAllowed ||
    candidate.generatedLedgerWriteAllowed ||
    candidate.payloadCreationAllowed ||
    candidate.productionApplyAllowed ||
    candidate.activationApproved,
  );
}

function expectedLineRef(scope: 'row' | 'ai_prompt', index: number): string {
  const file = scope === 'row' ? 'reviewer_decision_template_v2.jsonl' : 'reviewer_ai_decision_template_v2.jsonl';
  return `generated/fr/reviewer/${file}#L${index + 1}`;
}

function rowMatchesTemplate(candidate: RowCandidate, template: RowTemplate, index: number): boolean {
  return (
    candidate.sourceTemplateRef === expectedLineRef('row', index) &&
    candidate.lessonId === template.lessonId &&
    candidate.phraseId === template.phraseId &&
    candidate.schemaRowId === template.schemaRowId &&
    candidate.qualityRowId === template.qualityRowId &&
    candidate.sourceMeaningHash === template.sourceMeaningHash &&
    candidate.studyTarget === template.studyTarget &&
    sameSourceLocales(candidate.sourceLocaleCoverage) &&
    sameSourceLocales(template.sourceLocaleCoverage) &&
    JSON.stringify(candidate.researchEvidenceIds) === JSON.stringify(template.researchEvidenceIds) &&
    JSON.stringify(candidate.requiredGateIds) === JSON.stringify(template.requiredGateIds)
  );
}

function aiMatchesTemplate(candidate: AiCandidate, template: AiTemplate, index: number): boolean {
  return (
    candidate.sourceTemplateRef === expectedLineRef('ai_prompt', index) &&
    candidate.contractId === template.contractId &&
    candidate.aiQualityGateId === template.aiQualityGateId &&
    candidate.domainId === template.domainId &&
    candidate.filePath === template.filePath &&
    candidate.studyTarget === template.studyTarget &&
    sameSourceLocales(candidate.sourceLocaleCoverage) &&
    sameSourceLocales(template.sourceLocaleCoverage) &&
    JSON.stringify(candidate.requiredGateIds) === JSON.stringify(template.requiredGateIds) &&
    JSON.stringify(candidate.cacheKeyDimensionsRequired) === JSON.stringify(template.cacheKeyDimensionsRequired)
  );
}

function targetIsSeparateAndConfined(target: string, template: string, reviewerDir: string): boolean {
  const resolvedTarget = path.resolve(target);
  return (
    resolvedTarget.startsWith(path.resolve(reviewerDir)) &&
    resolvedTarget !== path.resolve(template) &&
    path.basename(path.dirname(resolvedTarget)) === 'llm_official_source_promoted_decisions_v2'
  );
}

function buildManifest(
  runId: string,
  repoRoot: string,
  runDir: string,
  rowReviewedPath: string,
  aiReviewedPath: string,
): PromotionManifest {
  const runArg = rel(repoRoot, runDir);
  return {
    schemaVersion: 'gustav-llm-official-source-decision-promotion-preflight-manifest-v2',
    runId,
    targetLocale: 'fr',
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    promotionMode: 'preflight_only_no_decisions_written',
    llmReviewerIdentity: 'llm_official_source_reviewer',
    futureDecisionFiles: {
      rowDecisionsReviewedV2: rel(repoRoot, rowReviewedPath),
      aiDecisionsReviewedV2: rel(repoRoot, aiReviewedPath),
    },
    futureRefreshCommands: [
      `npx tsx scripts\\gustav_reviewer_decision_import_v2_dry_run_packet.ts --run ${runArg} --target fr --row-decisions ${rel(repoRoot, rowReviewedPath)} --ai-decisions ${rel(repoRoot, aiReviewedPath)}`,
      `npx tsx scripts\\gustav_reviewer_decision_import_opening_preflight_v2_packet.ts --run ${runArg} --target fr --row-decisions ${rel(repoRoot, rowReviewedPath)} --ai-decisions ${rel(repoRoot, aiReviewedPath)}`,
      `npx tsx scripts\\gustav_llm_official_source_review_intake_v2_packet.ts --run ${runArg} --target fr`,
      `npx tsx scripts\\gustav_reviewer_decision_import_execution_gate_v2_packet.ts --run ${runArg} --target fr`,
    ],
    rowPromotionRequirements: [
      'The LLM official-source reviewer must write a separate reviewed row decision file, never overwrite reviewer_decision_template_v2.jsonl.',
      'Every accepted row must keep studyTarget=fr and sourceLocaleCoverage=ru,uk.',
      'Every accepted row must cite researchEvidenceIds, trusted sourceFamilyIds and official source URLs or IDs.',
      'Every accepted row must review every requiredGateId, including source meaning parity, language isolation, anti-calque, grammar naturalness and quiz one-correct-answer.',
      'Accepted rows may not include correction payloads; regeneration decisions require reviewerNotes and remain blocked from apply.',
    ],
    aiPromotionRequirements: [
      'The LLM official-source reviewer must write a separate reviewed AI decision file, never overwrite reviewer_ai_decision_template_v2.jsonl.',
      'Every accepted AI contract must keep studyTarget=fr and sourceLocaleCoverage=ru,uk.',
      'Every accepted AI contract must pass wrong-language, cache-language-key and live-return gates.',
      'Every accepted AI contract must keep rejected fresh output blocked before return and before cache.',
      'Every accepted AI contract must cite domain or row official-source evidence before any prompt/cache output can be trusted.',
    ],
    closedTransitions: {
      reviewerTemplatesOverwritten: false,
      reviewerDecisionsImported: false,
      generatedLedgerWritesAllowed: false,
      payloadCreationAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
  };
}

function evaluate(
  p19: JsonObject,
  p20: JsonObject,
  p21: JsonObject,
  rowCandidates: RowCandidate[],
  aiCandidates: AiCandidate[],
  rowTemplates: RowTemplate[],
  aiTemplates: AiTemplate[],
  rowReviewedPath: string,
  aiReviewedPath: string,
  rowTemplatePath: string,
  aiTemplatePath: string,
  reviewerDir: string,
): { metrics: PromotionEvaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  const rowPending = rowCandidates.filter((candidate) => candidate.candidateDecision === PENDING).length;
  const aiPending = aiCandidates.filter((candidate) => candidate.candidateDecision === PENDING).length;
  const acceptedRowCandidates = rowCandidates.length - rowPending;
  const acceptedAiCandidates = aiCandidates.length - aiPending;
  const rowIdentityMatched = rowCandidates.filter((candidate, index) => rowTemplates[index] && rowMatchesTemplate(candidate, rowTemplates[index], index)).length;
  const aiIdentityMatched = aiCandidates.filter((candidate, index) => aiTemplates[index] && aiMatchesTemplate(candidate, aiTemplates[index], index)).length;
  const rowPromotionReqs = rowCandidates.filter((candidate) => hasRequiredBooleans(candidate.acceptedDecisionRequires, REQUIRED_ROW_PROMOTION_REQUIRES)).length;
  const aiPromotionReqs = aiCandidates.filter((candidate) => hasRequiredBooleans(candidate.acceptedDecisionRequires, REQUIRED_AI_PROMOTION_REQUIRES)).length;
  const rowTrustedFamilies = rowCandidates.filter((candidate) =>
    candidate.sourceFamilyIds.length > 0 &&
    candidate.sourceFamilyIds.every((family) => TRUSTED_SOURCE_FAMILIES.includes(family)),
  ).length;
  const aiAllowedFamilies = aiCandidates.filter((candidate) =>
    TRUSTED_SOURCE_FAMILIES.every((family) => candidate.allowedSourceFamilyIds.includes(family)),
  ).length;
  const rowAllGatesPending = rowCandidates.filter((candidate) => allGatesPending(candidate.requiredGateIds, candidate.gateDecisionStatus)).length;
  const aiLanguageCacheLivePending = aiCandidates.filter((candidate) =>
    candidate.requiredGateIds.includes('ai_wrong_language_gate') &&
    candidate.requiredGateIds.includes('ai_cache_language_key_gate') &&
    candidate.wrongLanguageGateDecision === PENDING &&
    candidate.cacheLanguageGateDecision === PENDING &&
    candidate.liveReturnGateDecision === PENDING,
  ).length;
  const futureRowPromotionTargetSeparateFromTemplate = targetIsSeparateAndConfined(rowReviewedPath, rowTemplatePath, reviewerDir);
  const futureAiPromotionTargetSeparateFromTemplate = targetIsSeparateAndConfined(aiReviewedPath, aiTemplatePath, reviewerDir);
  const futurePromotionTargetsConfinedToReviewerDir =
    path.resolve(rowReviewedPath).startsWith(path.resolve(reviewerDir)) &&
    path.resolve(aiReviewedPath).startsWith(path.resolve(reviewerDir));
  const promotedDecisionFilesWritten = [rowReviewedPath, aiReviewedPath].filter((filePath) => fs.existsSync(filePath)).length;
  const downstreamAdvancedByPromotedFiles = promotedDecisionFilesWritten === 2 && b(p19, 'reviewerDecisionImportWouldRun');

  if (n(p19, 'blockers') !== 0 || s(p19, 'executionState') === 'blocked_by_findings') {
    addFinding(findings, 'blocker', 'p19_execution_gate_not_ready', 'P19 execution gate must be blocker-free before P22 promotion preflight.');
  }
  if (b(p19, 'reviewerDecisionImportWouldRun') && !downstreamAdvancedByPromotedFiles) {
    addFinding(findings, 'blocker', 'p19_already_would_run', 'P22 is only for the closed state before reviewer decision import would run.');
  }
  if (n(p20, 'blockers') !== 0 || !b(p20, 'readyForLlmOfficialSourceDecisionDryRun')) {
    addFinding(findings, 'blocker', 'p20_materialization_not_ready', 'P20 materialization contract must be ready before promotion preflight.');
  }
  if (n(p21, 'blockers') !== 0 || !b(p21, 'readyForLlmOfficialSourceDecisionPromotionPreflight')) {
    addFinding(findings, 'blocker', 'p21_dry_run_not_ready', 'P21 dry-run proposals must be ready before promotion preflight.');
  }
  if (rowCandidates.length !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_candidate_count_invalid', `Expected ${REQUIRED_ROWS} row proposals.`);
  if (aiCandidates.length !== REQUIRED_AI) addFinding(findings, 'blocker', 'ai_candidate_count_invalid', `Expected ${REQUIRED_AI} AI proposals.`);
  if (rowTemplates.length !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_template_count_invalid', `Expected ${REQUIRED_ROWS} row template lines.`);
  if (aiTemplates.length !== REQUIRED_AI) addFinding(findings, 'blocker', 'ai_template_count_invalid', `Expected ${REQUIRED_AI} AI template lines.`);
  if (acceptedRowCandidates > 0 || acceptedAiCandidates > 0) {
    addFinding(findings, 'blocker', 'accepted_candidates_before_promotion', 'P22 must start from pending proposal candidates, not accepted decisions.');
  }
  if (rowIdentityMatched !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_candidate_template_identity_mismatch', 'Every row proposal must match its source template identity and line ref.');
  if (aiIdentityMatched !== REQUIRED_AI) addFinding(findings, 'blocker', 'ai_candidate_template_identity_mismatch', 'Every AI proposal must match its source template identity and line ref.');
  if (rowPromotionReqs !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_promotion_requirements_incomplete', 'Every row proposal must carry complete future accepted-decision requirements.');
  if (aiPromotionReqs !== REQUIRED_AI) addFinding(findings, 'blocker', 'ai_promotion_requirements_incomplete', 'Every AI proposal must carry complete future accepted-contract requirements.');
  if (rowTrustedFamilies !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_trusted_source_families_incomplete', 'Every row proposal must carry trusted source family ids.');
  if (aiAllowedFamilies !== REQUIRED_AI) addFinding(findings, 'blocker', 'ai_allowed_source_families_incomplete', 'Every AI proposal must allow the full official/trusted source family set.');
  if (rowAllGatesPending !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_gate_status_not_pending', 'Every row proposal gate must still be pending at preflight.');
  if (aiLanguageCacheLivePending !== REQUIRED_AI) addFinding(findings, 'blocker', 'ai_gate_status_not_pending', 'Every AI proposal must keep wrong-language/cache/live gates pending at preflight.');
  if (!futureRowPromotionTargetSeparateFromTemplate || !futureAiPromotionTargetSeparateFromTemplate || !futurePromotionTargetsConfinedToReviewerDir) {
    addFinding(findings, 'blocker', 'future_promotion_target_not_separate_or_confined', 'Future promoted decision files must be separate from templates and confined to reviewer dir.');
  }
  if (promotedDecisionFilesWritten > 0 && !downstreamAdvancedByPromotedFiles) {
    addFinding(findings, 'blocker', 'promoted_decision_files_already_written', 'P22 preflight may not write or find promoted decision files as completed outputs.');
  }
  for (const candidate of [...rowCandidates, ...aiCandidates]) {
    if (candidate.studyTarget !== 'fr' || !sameSourceLocales(candidate.sourceLocaleCoverage)) {
      addFinding(findings, 'blocker', 'candidate_language_scope_invalid', 'Every proposal must keep studyTarget=fr and sourceLocaleCoverage=ru,uk.');
      break;
    }
    if (hasOpenTransition(candidate)) {
      addFinding(findings, 'blocker', 'candidate_transition_flag_open', 'Proposal candidates may not open overwrite/import/payload/apply/activation flags.');
      break;
    }
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const ready = blockers === 0;
  return {
    metrics: {
      rowCandidateProposals: rowCandidates.length,
      aiCandidateProposals: aiCandidates.length,
      rowCandidatesPending: rowPending,
      aiCandidatesPending: aiPending,
      acceptedRowCandidates,
      acceptedAiCandidates,
      rowTemplateLines: rowTemplates.length,
      aiTemplateLines: aiTemplates.length,
      rowCandidatesIdentityMatchedToTemplates: rowIdentityMatched,
      aiCandidatesIdentityMatchedToTemplates: aiIdentityMatched,
      rowCandidatesWithPromotionRequirements: rowPromotionReqs,
      aiCandidatesWithPromotionRequirements: aiPromotionReqs,
      rowCandidatesWithTrustedSourceFamilies: rowTrustedFamilies,
      aiCandidatesWithAllowedSourceFamilies: aiAllowedFamilies,
      rowCandidatesWithAllGateStatusPending: rowAllGatesPending,
      aiCandidatesWithLanguageCacheLiveGatesPending: aiLanguageCacheLivePending,
      futureRowPromotionTargetSeparateFromTemplate,
      futureAiPromotionTargetSeparateFromTemplate,
      futurePromotionTargetsConfinedToReviewerDir,
      promotedDecisionFilesWritten,
      reviewerTemplatesOverwritten: false,
      reviewerDecisionsImported: false,
      generatedLedgerWritesAllowed: false,
      payloadCreationAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      nonLlmReviewDependencyRequired: false,
      llmOfficialSourceReviewerRequired: true,
      readyForPromotedDecisionFileGeneration: ready,
      readyForReviewerDecisionImportExecutionGateRefresh: false,
      readyForPayloadCreationApprovalPreflight: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      promotionState: ready ? downstreamAdvancedByPromotedFiles ? 'contract_superseded_by_promoted_decisions' : 'contract_ready_no_promoted_decisions_written' : 'blocked_by_findings',
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
  p19: JsonObject,
  p20: JsonObject,
  p21: JsonObject,
  rowCandidates: RowCandidate[],
  aiCandidates: AiCandidate[],
  rowTemplates: RowTemplate[],
  aiTemplates: AiTemplate[],
  rowReviewedPath: string,
  aiReviewedPath: string,
  rowTemplatePath: string,
  aiTemplatePath: string,
  reviewerDir: string,
  mutate?: (draft: {
    p19: JsonObject;
    p20: JsonObject;
    p21: JsonObject;
    rows: RowCandidate[];
    ai: AiCandidate[];
    rowReviewedPath: string;
    aiReviewedPath: string;
  }) => void,
): Probe {
  const draft = {
    p19: clone(p19),
    p20: clone(p20),
    p21: clone(p21),
    rows: clone(rowCandidates),
    ai: clone(aiCandidates),
    rowReviewedPath,
    aiReviewedPath,
  };
  mutate?.(draft);
  const result = evaluate(
    draft.p19,
    draft.p20,
    draft.p21,
    draft.rows,
    draft.ai,
    rowTemplates,
    aiTemplates,
    draft.rowReviewedPath,
    draft.aiReviewedPath,
    rowTemplatePath,
    aiTemplatePath,
    reviewerDir,
  ).metrics;
  const accepted = result.blockers === 0;
  return { id, expectedAccept, accepted, blockers: result.blockers, passed: accepted === expectedAccept };
}

function makeProbes(
  p19: JsonObject,
  p20: JsonObject,
  p21: JsonObject,
  rowCandidates: RowCandidate[],
  aiCandidates: AiCandidate[],
  rowTemplates: RowTemplate[],
  aiTemplates: AiTemplate[],
  rowReviewedPath: string,
  aiReviewedPath: string,
  rowTemplatePath: string,
  aiTemplatePath: string,
  reviewerDir: string,
): Probe[] {
  const missingRowReviewedPath = path.join(reviewerDir, '__probe_missing_row_reviewed_decisions.jsonl');
  const missingAiReviewedPath = path.join(reviewerDir, '__probe_missing_ai_reviewed_decisions.jsonl');
  return [
    makeProbe('canonical_promotion_preflight_accepts', true, p19, p20, p21, rowCandidates, aiCandidates, rowTemplates, aiTemplates, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir),
    makeProbe('p21_not_ready_rejected', false, p19, p20, p21, rowCandidates, aiCandidates, rowTemplates, aiTemplates, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.p21.readyForLlmOfficialSourceDecisionPromotionPreflight = false;
    }),
    makeProbe('p19_would_run_without_promoted_files_rejected', false, p19, p20, p21, rowCandidates, aiCandidates, rowTemplates, aiTemplates, missingRowReviewedPath, missingAiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.p19.reviewerDecisionImportWouldRun = true;
    }),
    makeProbe('accepted_row_candidate_rejected', false, p19, p20, p21, rowCandidates, aiCandidates, rowTemplates, aiTemplates, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.rows[0].candidateDecision = 'accept_quality_gates';
    }),
    makeProbe('accepted_ai_candidate_rejected', false, p19, p20, p21, rowCandidates, aiCandidates, rowTemplates, aiTemplates, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.ai[0].candidateDecision = 'accept_contract';
    }),
    makeProbe('row_identity_drift_rejected', false, p19, p20, p21, rowCandidates, aiCandidates, rowTemplates, aiTemplates, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.rows[0].schemaRowId = 'schema-v2-fr-drift';
    }),
    makeProbe('ai_identity_drift_rejected', false, p19, p20, p21, rowCandidates, aiCandidates, rowTemplates, aiTemplates, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.ai[0].contractId = 'ai-contract-drift';
    }),
    makeProbe('row_missing_official_source_requirement_rejected', false, p19, p20, p21, rowCandidates, aiCandidates, rowTemplates, aiTemplates, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.rows[0].acceptedDecisionRequires.officialSourceUrlsOrIds = false;
    }),
    makeProbe('ai_missing_cache_requirement_rejected', false, p19, p20, p21, rowCandidates, aiCandidates, rowTemplates, aiTemplates, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.ai[0].acceptedDecisionRequires.rejectBeforeCache = false;
    }),
    makeProbe('row_unknown_source_family_rejected', false, p19, p20, p21, rowCandidates, aiCandidates, rowTemplates, aiTemplates, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.rows[0].sourceFamilyIds = ['unofficial_blog'];
    }),
    makeProbe('ai_missing_wrong_language_gate_rejected', false, p19, p20, p21, rowCandidates, aiCandidates, rowTemplates, aiTemplates, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.ai[0].requiredGateIds = draft.ai[0].requiredGateIds.filter((gate) => gate !== 'ai_wrong_language_gate');
    }),
    makeProbe('candidate_import_open_rejected', false, p19, p20, p21, rowCandidates, aiCandidates, rowTemplates, aiTemplates, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.rows[0].reviewerDecisionImportAllowed = true;
    }),
    makeProbe('future_target_overwrites_template_rejected', false, p19, p20, p21, rowCandidates, aiCandidates, rowTemplates, aiTemplates, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.rowReviewedPath = rowTemplatePath;
    }),
  ];
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav LLM Official-Source Decision Promotion Preflight V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Promotion state: ${report.summary.promotionState}`,
    `- Non-LLM review dependency required: ${report.summary.nonLlmReviewDependencyRequired ? 'yes' : 'no'}`,
    `- LLM official-source reviewer required: ${report.summary.llmOfficialSourceReviewerRequired ? 'yes' : 'no'}`,
    `- Row proposals/templates: ${report.summary.rowCandidateProposals}/${report.summary.rowTemplateLines}`,
    `- AI proposals/templates: ${report.summary.aiCandidateProposals}/${report.summary.aiTemplateLines}`,
    `- Pending row/AI candidates: ${report.summary.rowCandidatesPending}/${report.summary.aiCandidatesPending}`,
    `- Accepted row/AI candidates: ${report.summary.acceptedRowCandidates}/${report.summary.acceptedAiCandidates}`,
    `- Row identity matches: ${report.summary.rowCandidatesIdentityMatchedToTemplates}`,
    `- AI identity matches: ${report.summary.aiCandidatesIdentityMatchedToTemplates}`,
    `- Row promotion requirements: ${report.summary.rowCandidatesWithPromotionRequirements}`,
    `- AI promotion requirements: ${report.summary.aiCandidatesWithPromotionRequirements}`,
    `- Future row/AI target separate: ${report.summary.futureRowPromotionTargetSeparateFromTemplate ? 'yes' : 'no'}/${report.summary.futureAiPromotionTargetSeparateFromTemplate ? 'yes' : 'no'}`,
    `- Future targets confined: ${report.summary.futurePromotionTargetsConfinedToReviewerDir ? 'yes' : 'no'}`,
    `- Promoted decision files written: ${report.summary.promotedDecisionFilesWritten}`,
    `- Reviewer templates overwritten: ${report.summary.reviewerTemplatesOverwritten ? 'yes' : 'no'}`,
    `- Reviewer decisions imported: ${report.summary.reviewerDecisionsImported ? 'yes' : 'no'}`,
    `- Ready for promoted decision file generation: ${report.summary.readyForPromotedDecisionFileGeneration ? 'yes' : 'no'}`,
    `- Ready for payload creation approval preflight: ${report.summary.readyForPayloadCreationApprovalPreflight ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Outputs',
    '',
  ];
  for (const [key, value] of Object.entries(report.outputs)) lines.push(`- ${key}: \`${value}\``);
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
  }
  lines.push(
    '',
    '## Safety',
    '',
    '- This packet writes only a promotion preflight manifest and audit packet.',
    '- It does not write promoted decision JSONL files.',
    '- It does not overwrite reviewer templates.',
    '- It does not import decisions, mutate generated ledgers, create payloads, upload packs, enable downloads, or approve apply.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const runArg = argValue('--run');
  const target = argValue('--target') ?? 'fr';
  if (!runArg) throw new Error('Usage: npx tsx scripts/gustav_llm_official_source_decision_promotion_preflight_v2_packet.ts --run <run-dir> --target fr');
  if (target !== 'fr') throw new Error('LLM official-source decision promotion preflight V2 is scoped to --target fr.');

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  const dryRunDir = path.join(reviewerDir, 'llm_official_source_decision_dry_run_v2');
  const promotionDir = path.join(reviewerDir, 'llm_official_source_promoted_decisions_v2');
  ensureDir(auditsDir);
  ensureDir(promotionDir);

  const p19Path = path.join(auditsDir, 'reviewer_decision_import_execution_gate_v2_packet.json');
  const p20Path = path.join(auditsDir, 'llm_official_source_decision_materialization_v2_packet.json');
  const p21Path = path.join(auditsDir, 'llm_official_source_decision_dry_run_v2_packet.json');
  const rowCandidatePath = path.join(dryRunDir, 'row_decision_candidates_v2.jsonl');
  const aiCandidatePath = path.join(dryRunDir, 'ai_decision_candidates_v2.jsonl');
  const dryRunManifestPath = path.join(dryRunDir, 'llm_official_source_decision_dry_run_manifest_v2.json');
  const rowTemplatePath = path.join(reviewerDir, 'reviewer_decision_template_v2.jsonl');
  const aiTemplatePath = path.join(reviewerDir, 'reviewer_ai_decision_template_v2.jsonl');
  const rowReviewedPath = path.join(promotionDir, 'row_decisions_reviewed_v2.jsonl');
  const aiReviewedPath = path.join(promotionDir, 'ai_decisions_reviewed_v2.jsonl');
  const promotionManifestPath = path.join(promotionDir, 'llm_official_source_decision_promotion_preflight_manifest_v2.json');
  const outJson = path.join(auditsDir, 'llm_official_source_decision_promotion_preflight_v2_packet.json');
  const outMd = path.join(auditsDir, 'llm_official_source_decision_promotion_preflight_v2_packet.md');

  for (const filePath of [p19Path, p20Path, p21Path, rowCandidatePath, aiCandidatePath, dryRunManifestPath, rowTemplatePath, aiTemplatePath]) {
    if (!fs.existsSync(filePath)) throw new Error(`Required P22 input is missing: ${rel(repoRoot, filePath)}`);
  }

  const p19 = object(readJson<JsonObject>(p19Path).summary);
  const p20 = object(readJson<JsonObject>(p20Path).summary);
  const p21 = object(readJson<JsonObject>(p21Path).summary);
  const rowCandidates = parseJsonl<RowCandidate>(rowCandidatePath);
  const aiCandidates = parseJsonl<AiCandidate>(aiCandidatePath);
  const rowTemplates = parseJsonl<RowTemplate>(rowTemplatePath);
  const aiTemplates = parseJsonl<AiTemplate>(aiTemplatePath);
  const promotionManifest = buildManifest(runId, repoRoot, runDir, rowReviewedPath, aiReviewedPath);
  const evaluation = evaluate(
    p19,
    p20,
    p21,
    rowCandidates,
    aiCandidates,
    rowTemplates,
    aiTemplates,
    rowReviewedPath,
    aiReviewedPath,
    rowTemplatePath,
    aiTemplatePath,
    reviewerDir,
  );
  const probes = makeProbes(
    p19,
    p20,
    p21,
    rowCandidates,
    aiCandidates,
    rowTemplates,
    aiTemplates,
    rowReviewedPath,
    aiReviewedPath,
    rowTemplatePath,
    aiTemplatePath,
    reviewerDir,
  );
  const findings = [...evaluation.findings];
  for (const probe of probes.filter((probe) => !probe.passed)) {
    addFinding(findings, 'blocker', 'fixture_probe_failed', `Fixture probe failed: ${probe.id}.`);
  }
  addFinding(findings, 'info', 'promotion_preflight_only', 'P22 prepares or revalidates the promotion contract; if downstream promoted decision files already exist, the preflight is treated as superseded without opening import/apply flags.');

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const metrics: PromotionEvaluation = {
    ...evaluation.metrics,
    blockers,
    warnings,
    readyForPromotedDecisionFileGeneration: blockers === 0 && evaluation.metrics.readyForPromotedDecisionFileGeneration,
    promotionState: blockers === 0 ? evaluation.metrics.promotionState : 'blocked_by_findings',
  };

  if (blockers === 0) writeJson(promotionManifestPath, promotionManifest);

  const report: Report = {
    schemaVersion: 'gustav-llm-official-source-decision-promotion-preflight-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: { argv: process.argv.slice(2), cwd: repoRoot, nodeVersion: process.version },
    inputs: {
      reviewerDecisionImportExecutionGateV2Packet: rel(repoRoot, p19Path),
      llmOfficialSourceDecisionMaterializationV2Packet: rel(repoRoot, p20Path),
      llmOfficialSourceDecisionDryRunV2Packet: rel(repoRoot, p21Path),
      rowDecisionCandidatesV2: rel(repoRoot, rowCandidatePath),
      aiDecisionCandidatesV2: rel(repoRoot, aiCandidatePath),
      dryRunManifestV2: rel(repoRoot, dryRunManifestPath),
      rowDecisionTemplateV2: rel(repoRoot, rowTemplatePath),
      aiDecisionTemplateV2: rel(repoRoot, aiTemplatePath),
    },
    outputs: {
      promotionPreflightV2PacketJson: rel(repoRoot, outJson),
      promotionPreflightV2PacketMd: rel(repoRoot, outMd),
      promotionPreflightManifestV2: rel(repoRoot, promotionManifestPath),
      futureRowDecisionsReviewedV2: rel(repoRoot, rowReviewedPath),
      futureAiDecisionsReviewedV2: rel(repoRoot, aiReviewedPath),
    },
    summary: {
      ...metrics,
      targetLocale: 'fr',
      sourceLocales: 2,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    artifactHashes: {
      reviewerDecisionImportExecutionGateV2Packet: sha256(p19Path),
      llmOfficialSourceDecisionMaterializationV2Packet: sha256(p20Path),
      llmOfficialSourceDecisionDryRunV2Packet: sha256(p21Path),
      rowDecisionCandidatesV2: sha256(rowCandidatePath),
      aiDecisionCandidatesV2: sha256(aiCandidatePath),
      dryRunManifestV2: sha256(dryRunManifestPath),
      rowDecisionTemplateV2: sha256(rowTemplatePath),
      aiDecisionTemplateV2: sha256(aiTemplatePath),
    },
    outputArtifactHashes: blockers === 0 ? {
      promotionPreflightManifestV2: sha256(promotionManifestPath),
    } : {},
    promotionManifest,
    findings,
    probes,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerTemplatesModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      promotedDecisionFilesWrittenByThisScript: false,
      payloadShardsCreatedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outJson, report);
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV LLM official-source decision promotion preflight V2 packet: ${report.status}`);
  console.log(`Promotion state: ${report.summary.promotionState}`);
  console.log(`Row proposals/templates: ${report.summary.rowCandidateProposals}/${report.summary.rowTemplateLines}`);
  console.log(`AI proposals/templates: ${report.summary.aiCandidateProposals}/${report.summary.aiTemplateLines}`);
  console.log(`Accepted row/AI candidates: ${report.summary.acceptedRowCandidates}/${report.summary.acceptedAiCandidates}`);
  console.log(`Promoted decision files written: ${report.summary.promotedDecisionFilesWritten}`);
  console.log(`Reviewer templates overwritten: ${report.summary.reviewerTemplatesOverwritten ? 'yes' : 'no'}`);
  console.log(`Reviewer decisions imported: ${report.summary.reviewerDecisionsImported ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);
  if (blockers > 0) process.exitCode = 1;
}

main();
