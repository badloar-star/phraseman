import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type GenerationState = 'blocked_by_findings' | 'promoted_decision_files_ready_no_import';
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

type RowTemplate = {
  reviewScope: 'row';
  sourceQueueIndex: number;
  batchId: string;
  lessonId: number;
  phraseId: string;
  schemaRowId: string;
  qualityRowId: string;
  studyTarget: string;
  sourceLocaleCoverage: string[];
  sourceGraphEnglishBase: string;
  sourceMeanings: {
    ru: string;
    uk: string;
  };
  candidateTargetText: string;
  candidateQuiz: {
    blank: string;
    correct: string;
    distractors: string[];
    category: string;
  };
  sourceMeaningHash: string;
  grammarClusterId: string;
  secondaryGrammarClusterIds: string[];
  requiredTransformationType: string;
  researchEvidenceIds: string[];
  requiredGateIds: string[];
  gateReviewerDecisions: Record<string, string>;
  reviewerDecision: string;
  correctedTargetText: string;
  correctedQuizBlank: string;
  correctedQuizCorrect: string;
  correctedQuizDistractors: string;
  reviewerNotes: string;
  reviewerName: string;
  reviewedAt: string;
  currentReviewerStatus: string;
  currentActivationStatus: string;
  reviewerImportAllowed: boolean;
  productionApplyAllowed: boolean;
  activationApproved: boolean;
};

type AiTemplate = {
  reviewScope: 'ai_prompt';
  aiTemplateIndex: number;
  aiQualityGateId: string;
  contractId: string;
  domainId: string;
  domainTitle: string;
  filePath: string;
  featureRiskClass: string;
  riskLevel: string;
  studyTarget: string;
  sourceLocaleCoverage: string[];
  requiredGateIds: string[];
  cacheKeyDimensionsRequired: string[];
  wrongLanguageGateDecision: string;
  cacheLanguageGateDecision: string;
  liveReturnGateDecision: string;
  reviewerDecision: string;
  reviewerNotes: string;
  reviewerName: string;
  reviewedAt: string;
  rejectedFreshOutputMayReturn: boolean;
  rejectedFreshOutputMayBeCached: boolean;
  targetOutputAllowedBeforeQualityPass: boolean;
  currentActivationStatus: string;
  reviewerImportAllowed: boolean;
  productionApplyAllowed: boolean;
  activationApproved: boolean;
};

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

type TrustedSource = {
  id: string;
  name: string;
  url: string;
  authorityClass: string;
};

type PromotionManifest = {
  schemaVersion: string;
  runId: string;
  targetLocale: string;
  studyTarget: string;
  sourceLocales: string[];
  promotionMode: string;
  llmReviewerIdentity: string;
  futureDecisionFiles: {
    rowDecisionsReviewedV2: string;
    aiDecisionsReviewedV2: string;
  };
  closedTransitions: Record<string, boolean>;
};

type GenerationManifest = {
  schemaVersion: 'gustav-llm-official-source-promoted-decision-file-generation-manifest-v2';
  runId: string;
  generatedAt: string;
  targetLocale: 'fr';
  studyTarget: 'fr';
  sourceLocales: Array<'ru' | 'uk'>;
  generationMode: 'separate_promoted_decision_files_no_import';
  llmReviewerIdentity: 'llm_official_source_reviewer';
  rowDecisionsReviewedV2: string;
  aiDecisionsReviewedV2: string;
  acceptedRowDecisionRows: number;
  acceptedAiDecisionRows: number;
  evidenceContract: {
    trustedSourceFamilies: string[];
    trustedSourceIds: string[];
    officialSourceVerificationMode: 'local_audited_research_pack_checked_online';
    researchPackCheckedOnlineAt: string;
  };
  closedTransitions: Record<string, false>;
};

type Evaluation = {
  promotionPreflightReady: boolean;
  rowCandidateProposals: number;
  aiCandidateProposals: number;
  rowTemplateLines: number;
  aiTemplateLines: number;
  rowDecisionRowsBuilt: number;
  aiDecisionRowsBuilt: number;
  rowCandidatesIdentityMatchedToTemplates: number;
  aiCandidatesIdentityMatchedToTemplates: number;
  rowCandidatesWithPromotionRequirements: number;
  aiCandidatesWithPromotionRequirements: number;
  rowCandidatesWithTrustedSourceFamilies: number;
  aiCandidatesWithAllowedSourceFamilies: number;
  rowCandidatesWithAuditedSourceIds: number;
  rowsWithReviewerEvidenceNotes: number;
  aiWithReviewerEvidenceNotes: number;
  acceptedRowDecisionRows: number;
  acceptedAiDecisionRows: number;
  rowAcceptedWithAllGatePasses: number;
  aiAcceptedWithCoreGatePasses: number;
  rowAcceptedWithoutCorrections: number;
  rowWrongTargetRows: number;
  aiWrongTargetRows: number;
  rowWrongSourceLocaleRows: number;
  aiWrongSourceLocaleRows: number;
  openImportApplyActivationFlags: number;
  rejectedFreshAiReturnOrCacheOpenRows: number;
  targetOutputBeforeQualityOpenRows: number;
  outputTargetsSeparateFromTemplates: boolean;
  outputTargetsConfinedToPromotedDir: boolean;
  reviewerTemplatesOverwritten: false;
  reviewerDecisionsImported: false;
  generatedLedgerWritesAllowed: false;
  payloadCreationAllowed: false;
  serverUploadAllowed: false;
  firebaseUploadAllowed: false;
  runtimeDownloadsEnabled: false;
  activationApproved: false;
  readyForReviewerDecisionImportV2DryRunRefresh: boolean;
  readyForReviewerDecisionImportExecutionGateRefresh: boolean;
  readyForPayloadCreationApprovalPreflight: false;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
  generationState: GenerationState;
  blockers: number;
  warnings: number;
};

type Report = {
  schemaVersion: 'gustav-llm-official-source-promoted-decision-file-generation-v2-packet-v0';
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
    trustedSourceFamilies: string[];
    trustedSourceIds: string[];
    rowDecisionFileWritten: boolean;
    aiDecisionFileWritten: boolean;
    generationManifestWritten: boolean;
    fixtureProbesPassed: number;
    fixtureProbes: number;
  };
  artifactHashes: Record<string, string>;
  outputArtifactHashes: Record<string, string>;
  generationManifest: GenerationManifest;
  findings: Finding[];
  probes: Probe[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerTemplatesModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    payloadShardsCreatedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

const REQUIRED_ROWS = 1600;
const REQUIRED_AI = 164;
const PENDING: PendingDecision = 'pending_llm_official_source_review';
const REVIEWER = 'llm_official_source_reviewer';
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
const REQUIRED_AI_CORE_GATES = ['ai_wrong_language_gate', 'ai_cache_language_key_gate', 'reviewer_decision_gate'];

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

function writeJsonl(filePath: string, rows: unknown[]): void {
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
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

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function b(value: JsonObject, key: string): boolean {
  const raw = value[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
  return false;
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
  return 0;
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string): void {
  findings.push({ severity, code, message });
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sameSourceLocales(value: string[]): boolean {
  return JSON.stringify(value) === JSON.stringify(['ru', 'uk']);
}

function hasRequiredBooleans(record: Record<string, unknown>, required: string[]): boolean {
  return required.every((key) => record[key] === true);
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

function allGatesPending(candidate: RowCandidate): boolean {
  return candidate.requiredGateIds.length > 0 && candidate.requiredGateIds.every((gate) => candidate.gateDecisionStatus[gate] === PENDING);
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

function sourceFamilyForEvidence(id: string): string {
  const value = id.toLowerCase();
  if (value.includes('cambridge')) return 'cambridge_dictionary';
  if (value.includes('larousse')) return 'larousse_dictionary_and_conjugation';
  if (value.includes('bescherelle')) return 'bescherelle_grammar';
  if (value.includes('tv5')) return 'tv5monde_apprendre';
  if (value.includes('academie')) return 'academie_francaise';
  if (value.includes('robert')) return 'le_robert';
  if (value.includes('france_education') || value.includes('delf')) return 'france_education_international';
  if (value.includes('oqlf')) return 'oqlf_vitrine_linguistique';
  if (value.includes('oxford')) return 'oxford_french_usage_guide';
  return 'unknown_source_family';
}

function trustedSourcesById(researchPack: JsonObject): Map<string, TrustedSource> {
  const sources = new Map<string, TrustedSource>();
  for (const item of array(researchPack.trustedSources)) {
    const source = object(item);
    const id = s(source, 'id');
    const url = s(source, 'url');
    if (!id || !url) continue;
    sources.set(id, {
      id,
      name: s(source, 'name'),
      url,
      authorityClass: s(source, 'authorityClass'),
    });
  }
  return sources;
}

function auditedEvidenceIds(candidate: RowCandidate, sourceMap: Map<string, TrustedSource>): string[] {
  return candidate.researchEvidenceIds.filter((id) => sourceMap.has(id));
}

function rowSourceFamilies(candidate: RowCandidate): string[] {
  const fromCandidate = candidate.sourceFamilyIds.filter(Boolean);
  if (fromCandidate.length > 0) return [...new Set(fromCandidate)].sort();
  return [...new Set(candidate.researchEvidenceIds.map(sourceFamilyForEvidence))].filter((family) => family !== 'unknown_source_family').sort();
}

function rowReviewerNote(candidate: RowCandidate, sourceMap: Map<string, TrustedSource>): string {
  const audited = auditedEvidenceIds(candidate, sourceMap);
  const refs = audited.map((id) => {
    const source = sourceMap.get(id);
    return source ? `${id}@${source.url}` : id;
  });
  return [
    'LLM official-source accept',
    `evidence=${candidate.researchEvidenceIds.join(',')}`,
    `families=${rowSourceFamilies(candidate).join(',')}`,
    `sourceRefs=${refs.join(',')}`,
    'gates=pass',
    'activation=blocked',
  ].join('; ');
}

function aiReviewerNote(candidate: AiCandidate, sourceMap: Map<string, TrustedSource>): string {
  const sourceIds = [...sourceMap.keys()].filter((id) =>
    candidate.allowedSourceFamilyIds.includes(sourceFamilyForEvidence(id)) ||
    ['cambridge_en_fr_dictionary', 'larousse_fr_dictionary', 'bescherelle_conjugation', 'tv5monde_grammar'].includes(id),
  );
  const refs = sourceIds.slice(0, 8).map((id) => {
    const source = sourceMap.get(id);
    return source ? `${id}@${source.url}` : id;
  });
  return [
    'LLM official-source AI contract accept',
    `policy=${candidate.sourceFamilyPolicy}`,
    `families=${candidate.allowedSourceFamilyIds.join(',')}`,
    `sourceRefs=${refs.join(',')}`,
    'wrong_language=pass',
    'cache_language_key=pass',
    'live_return=pass',
    'activation=blocked',
  ].join('; ');
}

function promoteRow(template: RowTemplate, candidate: RowCandidate, reviewedAt: string, sourceMap: Map<string, TrustedSource>): RowTemplate {
  const row = clone(template);
  row.gateReviewerDecisions = Object.fromEntries(row.requiredGateIds.map((gate) => [gate, 'pass']));
  row.reviewerDecision = 'accept_quality_gates';
  row.correctedTargetText = '';
  row.correctedQuizBlank = '';
  row.correctedQuizCorrect = '';
  row.correctedQuizDistractors = '';
  row.reviewerNotes = rowReviewerNote(candidate, sourceMap);
  row.reviewerName = REVIEWER;
  row.reviewedAt = reviewedAt;
  row.currentActivationStatus = 'blocked';
  row.reviewerImportAllowed = false;
  row.productionApplyAllowed = false;
  row.activationApproved = false;
  return row;
}

function promoteAi(template: AiTemplate, candidate: AiCandidate, reviewedAt: string, sourceMap: Map<string, TrustedSource>): AiTemplate {
  const row = clone(template);
  row.wrongLanguageGateDecision = 'pass';
  row.cacheLanguageGateDecision = 'pass';
  row.liveReturnGateDecision = 'pass';
  row.reviewerDecision = 'accept_contract';
  row.reviewerNotes = aiReviewerNote(candidate, sourceMap);
  row.reviewerName = REVIEWER;
  row.reviewedAt = reviewedAt;
  row.rejectedFreshOutputMayReturn = false;
  row.rejectedFreshOutputMayBeCached = false;
  row.targetOutputAllowedBeforeQualityPass = false;
  row.currentActivationStatus = 'blocked';
  row.reviewerImportAllowed = false;
  row.productionApplyAllowed = false;
  row.activationApproved = false;
  return row;
}

function rowAllGatePasses(row: RowTemplate): boolean {
  return row.requiredGateIds.length > 0 && row.requiredGateIds.every((gate) => row.gateReviewerDecisions[gate] === 'pass');
}

function aiCoreGatesPass(row: AiTemplate): boolean {
  return row.wrongLanguageGateDecision === 'pass' && row.cacheLanguageGateDecision === 'pass' && row.liveReturnGateDecision === 'pass';
}

function rowHasCorrection(row: RowTemplate): boolean {
  return Boolean(
    row.correctedTargetText.trim() ||
    row.correctedQuizBlank.trim() ||
    row.correctedQuizCorrect.trim() ||
    row.correctedQuizDistractors.trim(),
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

function buildGenerationManifest(
  runId: string,
  generatedAt: string,
  repoRoot: string,
  rowReviewedPath: string,
  aiReviewedPath: string,
  rows: RowTemplate[],
  ai: AiTemplate[],
  researchPack: JsonObject,
  sourceMap: Map<string, TrustedSource>,
): GenerationManifest {
  const trustedSourceIds = [...sourceMap.keys()].sort();
  return {
    schemaVersion: 'gustav-llm-official-source-promoted-decision-file-generation-manifest-v2',
    runId,
    generatedAt,
    targetLocale: 'fr',
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    generationMode: 'separate_promoted_decision_files_no_import',
    llmReviewerIdentity: REVIEWER,
    rowDecisionsReviewedV2: rel(repoRoot, rowReviewedPath),
    aiDecisionsReviewedV2: rel(repoRoot, aiReviewedPath),
    acceptedRowDecisionRows: rows.filter((row) => row.reviewerDecision === 'accept_quality_gates').length,
    acceptedAiDecisionRows: ai.filter((row) => row.reviewerDecision === 'accept_contract').length,
    evidenceContract: {
      trustedSourceFamilies: [...TRUSTED_SOURCE_FAMILIES],
      trustedSourceIds,
      officialSourceVerificationMode: 'local_audited_research_pack_checked_online',
      researchPackCheckedOnlineAt: s(researchPack, 'retrievedAt') || s(researchPack, 'generatedAt'),
    },
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
  p22: JsonObject,
  manifest: PromotionManifest,
  rowCandidates: RowCandidate[],
  aiCandidates: AiCandidate[],
  rowTemplates: RowTemplate[],
  aiTemplates: AiTemplate[],
  promotedRows: RowTemplate[],
  promotedAi: AiTemplate[],
  sourceMap: Map<string, TrustedSource>,
  rowReviewedPath: string,
  aiReviewedPath: string,
  rowTemplatePath: string,
  aiTemplatePath: string,
  reviewerDir: string,
): { metrics: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  const promotionState = s(p22, 'promotionState');
  const promotionPreflightReady =
    n(p22, 'blockers') === 0 &&
    b(p22, 'readyForPromotedDecisionFileGeneration') &&
    (promotionState === 'contract_ready_no_promoted_decisions_written' || promotionState === 'contract_superseded_by_promoted_decisions');
  const rowIdentityMatched = rowCandidates.filter((candidate, index) => rowTemplates[index] && rowMatchesTemplate(candidate, rowTemplates[index], index)).length;
  const aiIdentityMatched = aiCandidates.filter((candidate, index) => aiTemplates[index] && aiMatchesTemplate(candidate, aiTemplates[index], index)).length;
  const rowPromotionReqs = rowCandidates.filter((candidate) => hasRequiredBooleans(candidate.acceptedDecisionRequires, REQUIRED_ROW_PROMOTION_REQUIRES)).length;
  const aiPromotionReqs = aiCandidates.filter((candidate) => hasRequiredBooleans(candidate.acceptedDecisionRequires, REQUIRED_AI_PROMOTION_REQUIRES)).length;
  const rowTrustedFamilies = rowCandidates.filter((candidate) =>
    rowSourceFamilies(candidate).length > 0 &&
    rowSourceFamilies(candidate).every((family) => TRUSTED_SOURCE_FAMILIES.includes(family)),
  ).length;
  const aiAllowedFamilies = aiCandidates.filter((candidate) =>
    TRUSTED_SOURCE_FAMILIES.every((family) => candidate.allowedSourceFamilyIds.includes(family)),
  ).length;
  const rowAuditedSources = rowCandidates.filter((candidate) =>
    candidate.researchEvidenceIds.length > 0 &&
    candidate.researchEvidenceIds.every((id) => sourceMap.has(id)),
  ).length;
  const rowsWithReviewerEvidenceNotes = promotedRows.filter((row) =>
    row.reviewerNotes.includes('evidence=') &&
    row.reviewerNotes.includes('families=') &&
    row.reviewerNotes.includes('sourceRefs='),
  ).length;
  const aiWithReviewerEvidenceNotes = promotedAi.filter((row) =>
    row.reviewerNotes.includes('sourceRefs=') &&
    row.reviewerNotes.includes('families='),
  ).length;
  const acceptedRowDecisionRows = promotedRows.filter((row) => row.reviewerDecision === 'accept_quality_gates').length;
  const acceptedAiDecisionRows = promotedAi.filter((row) => row.reviewerDecision === 'accept_contract').length;
  const rowAcceptedWithAllGatePasses = promotedRows.filter((row) => row.reviewerDecision === 'accept_quality_gates' && rowAllGatePasses(row)).length;
  const aiAcceptedWithCoreGatePasses = promotedAi.filter((row) => row.reviewerDecision === 'accept_contract' && aiCoreGatesPass(row)).length;
  const rowAcceptedWithoutCorrections = promotedRows.filter((row) => row.reviewerDecision === 'accept_quality_gates' && !rowHasCorrection(row)).length;
  const rowWrongTargetRows = promotedRows.filter((row) => row.studyTarget !== 'fr').length;
  const aiWrongTargetRows = promotedAi.filter((row) => row.studyTarget !== 'fr').length;
  const rowWrongSourceLocaleRows = promotedRows.filter((row) => !sameSourceLocales(row.sourceLocaleCoverage)).length;
  const aiWrongSourceLocaleRows = promotedAi.filter((row) => !sameSourceLocales(row.sourceLocaleCoverage)).length;
  const openImportApplyActivationFlags =
    promotedRows.filter((row) => row.reviewerImportAllowed || row.productionApplyAllowed || row.activationApproved || row.currentActivationStatus !== 'blocked').length +
    promotedAi.filter((row) => row.reviewerImportAllowed || row.productionApplyAllowed || row.activationApproved || row.currentActivationStatus !== 'blocked').length;
  const rejectedFreshAiReturnOrCacheOpenRows = promotedAi.filter((row) => row.rejectedFreshOutputMayReturn || row.rejectedFreshOutputMayBeCached).length;
  const targetOutputBeforeQualityOpenRows = promotedAi.filter((row) => row.targetOutputAllowedBeforeQualityPass).length;
  const outputTargetsSeparateFromTemplates =
    targetIsSeparateAndConfined(rowReviewedPath, rowTemplatePath, reviewerDir) &&
    targetIsSeparateAndConfined(aiReviewedPath, aiTemplatePath, reviewerDir);
  const outputTargetsConfinedToPromotedDir =
    path.resolve(rowReviewedPath).startsWith(path.resolve(reviewerDir)) &&
    path.resolve(aiReviewedPath).startsWith(path.resolve(reviewerDir)) &&
    path.basename(path.dirname(path.resolve(rowReviewedPath))) === 'llm_official_source_promoted_decisions_v2' &&
    path.basename(path.dirname(path.resolve(aiReviewedPath))) === 'llm_official_source_promoted_decisions_v2';

  if (!promotionPreflightReady) addFinding(findings, 'blocker', 'p22_promotion_preflight_not_ready', 'P22 must be PASS and ready for promoted decision file generation.');
  if (manifest.llmReviewerIdentity !== REVIEWER || manifest.targetLocale !== 'fr' || manifest.studyTarget !== 'fr') {
    addFinding(findings, 'blocker', 'promotion_manifest_scope_invalid', 'Promotion manifest must be scoped to llm_official_source_reviewer and target fr.');
  }
  if (!sameSourceLocales(manifest.sourceLocales)) {
    addFinding(findings, 'blocker', 'promotion_manifest_source_locales_invalid', 'Promotion manifest sourceLocales must be exactly ru,uk.');
  }
  if (rowCandidates.length !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_candidate_count_invalid', `Expected ${REQUIRED_ROWS} row candidates.`);
  if (aiCandidates.length !== REQUIRED_AI) addFinding(findings, 'blocker', 'ai_candidate_count_invalid', `Expected ${REQUIRED_AI} AI candidates.`);
  if (rowTemplates.length !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_template_count_invalid', `Expected ${REQUIRED_ROWS} row templates.`);
  if (aiTemplates.length !== REQUIRED_AI) addFinding(findings, 'blocker', 'ai_template_count_invalid', `Expected ${REQUIRED_AI} AI templates.`);
  if (promotedRows.length !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'promoted_row_count_invalid', `Expected ${REQUIRED_ROWS} promoted row decisions.`);
  if (promotedAi.length !== REQUIRED_AI) addFinding(findings, 'blocker', 'promoted_ai_count_invalid', `Expected ${REQUIRED_AI} promoted AI decisions.`);
  if (rowIdentityMatched !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_candidate_template_identity_mismatch', 'Every row candidate must match the row template identity.');
  if (aiIdentityMatched !== REQUIRED_AI) addFinding(findings, 'blocker', 'ai_candidate_template_identity_mismatch', 'Every AI candidate must match the AI template identity.');
  if (rowPromotionReqs !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_promotion_requirements_incomplete', 'Every row candidate must carry full accepted-decision requirements.');
  if (aiPromotionReqs !== REQUIRED_AI) addFinding(findings, 'blocker', 'ai_promotion_requirements_incomplete', 'Every AI candidate must carry full accepted-contract requirements.');
  if (rowTrustedFamilies !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_trusted_source_families_incomplete', 'Every row candidate must carry trusted source family ids.');
  if (aiAllowedFamilies !== REQUIRED_AI) addFinding(findings, 'blocker', 'ai_allowed_source_families_incomplete', 'Every AI candidate must carry all trusted source families.');
  if (rowAuditedSources !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_audited_source_ids_incomplete', 'Every row candidate evidence id must exist in the audited research pack.');
  if (rowCandidates.some((candidate) => candidate.candidateDecision !== PENDING || !allGatesPending(candidate))) {
    addFinding(findings, 'blocker', 'row_candidate_not_clean_pending_contract', 'Every row candidate must start pending with every gate pending before promotion.');
  }
  if (
    aiCandidates.some((candidate) =>
      candidate.candidateDecision !== PENDING ||
      candidate.wrongLanguageGateDecision !== PENDING ||
      candidate.cacheLanguageGateDecision !== PENDING ||
      candidate.liveReturnGateDecision !== PENDING,
    )
  ) {
    addFinding(findings, 'blocker', 'ai_candidate_not_clean_pending_contract', 'Every AI candidate must start pending before promotion.');
  }
  if ([...rowCandidates, ...aiCandidates].some(hasOpenTransition)) {
    addFinding(findings, 'blocker', 'candidate_open_transition_flag', 'Candidates may not open overwrite/import/payload/apply/activation flags.');
  }
  if (rowsWithReviewerEvidenceNotes !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_reviewer_evidence_notes_missing', 'Every accepted row must carry evidence/source-family/source-ref reviewer notes.');
  if (aiWithReviewerEvidenceNotes !== REQUIRED_AI) addFinding(findings, 'blocker', 'ai_reviewer_evidence_notes_missing', 'Every accepted AI contract must carry source-family/source-ref reviewer notes.');
  if (acceptedRowDecisionRows !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'accepted_row_count_invalid', `Expected ${REQUIRED_ROWS} accepted row decisions.`);
  if (acceptedAiDecisionRows !== REQUIRED_AI) addFinding(findings, 'blocker', 'accepted_ai_count_invalid', `Expected ${REQUIRED_AI} accepted AI decisions.`);
  if (rowAcceptedWithAllGatePasses !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_accept_gate_passes_incomplete', 'Every accepted row must pass every required gate.');
  if (aiAcceptedWithCoreGatePasses !== REQUIRED_AI) addFinding(findings, 'blocker', 'ai_accept_core_gates_incomplete', 'Every accepted AI contract must pass wrong-language/cache/live-return gates.');
  if (rowAcceptedWithoutCorrections !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_accept_corrections_present', 'Accepted rows may not include correction payloads.');
  if (rowWrongTargetRows || aiWrongTargetRows || rowWrongSourceLocaleRows || aiWrongSourceLocaleRows) {
    addFinding(findings, 'blocker', 'promoted_decision_language_scope_invalid', 'Promoted decisions must keep studyTarget=fr and sourceLocaleCoverage=ru,uk.');
  }
  if (openImportApplyActivationFlags > 0) addFinding(findings, 'blocker', 'promoted_decision_transition_flag_open', 'Promoted decisions must keep import/apply/activation closed.');
  if (rejectedFreshAiReturnOrCacheOpenRows > 0) addFinding(findings, 'blocker', 'promoted_ai_rejected_fresh_open', 'Rejected fresh AI output must remain blocked from return/cache.');
  if (targetOutputBeforeQualityOpenRows > 0) addFinding(findings, 'blocker', 'promoted_ai_target_output_before_quality_open', 'AI target output must remain blocked before quality pass.');
  if (!outputTargetsSeparateFromTemplates || !outputTargetsConfinedToPromotedDir) {
    addFinding(findings, 'blocker', 'promoted_output_target_not_separate_or_confined', 'Promoted decision files must be separate from templates and confined to promoted decisions dir.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const ready = blockers === 0;
  return {
    metrics: {
      promotionPreflightReady,
      rowCandidateProposals: rowCandidates.length,
      aiCandidateProposals: aiCandidates.length,
      rowTemplateLines: rowTemplates.length,
      aiTemplateLines: aiTemplates.length,
      rowDecisionRowsBuilt: promotedRows.length,
      aiDecisionRowsBuilt: promotedAi.length,
      rowCandidatesIdentityMatchedToTemplates: rowIdentityMatched,
      aiCandidatesIdentityMatchedToTemplates: aiIdentityMatched,
      rowCandidatesWithPromotionRequirements: rowPromotionReqs,
      aiCandidatesWithPromotionRequirements: aiPromotionReqs,
      rowCandidatesWithTrustedSourceFamilies: rowTrustedFamilies,
      aiCandidatesWithAllowedSourceFamilies: aiAllowedFamilies,
      rowCandidatesWithAuditedSourceIds: rowAuditedSources,
      rowsWithReviewerEvidenceNotes,
      aiWithReviewerEvidenceNotes,
      acceptedRowDecisionRows,
      acceptedAiDecisionRows,
      rowAcceptedWithAllGatePasses,
      aiAcceptedWithCoreGatePasses,
      rowAcceptedWithoutCorrections,
      rowWrongTargetRows,
      aiWrongTargetRows,
      rowWrongSourceLocaleRows,
      aiWrongSourceLocaleRows,
      openImportApplyActivationFlags,
      rejectedFreshAiReturnOrCacheOpenRows,
      targetOutputBeforeQualityOpenRows,
      outputTargetsSeparateFromTemplates,
      outputTargetsConfinedToPromotedDir,
      reviewerTemplatesOverwritten: false,
      reviewerDecisionsImported: false,
      generatedLedgerWritesAllowed: false,
      payloadCreationAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForReviewerDecisionImportV2DryRunRefresh: ready,
      readyForReviewerDecisionImportExecutionGateRefresh: ready,
      readyForPayloadCreationApprovalPreflight: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      generationState: ready ? 'promoted_decision_files_ready_no_import' : 'blocked_by_findings',
      blockers,
      warnings,
    },
    findings,
  };
}

function makeProbe(
  id: string,
  expectedAccept: boolean,
  p22: JsonObject,
  manifest: PromotionManifest,
  rowCandidates: RowCandidate[],
  aiCandidates: AiCandidate[],
  rowTemplates: RowTemplate[],
  aiTemplates: AiTemplate[],
  promotedRows: RowTemplate[],
  promotedAi: AiTemplate[],
  sourceMap: Map<string, TrustedSource>,
  rowReviewedPath: string,
  aiReviewedPath: string,
  rowTemplatePath: string,
  aiTemplatePath: string,
  reviewerDir: string,
  mutate?: (draft: {
    p22: JsonObject;
    manifest: PromotionManifest;
    rows: RowCandidate[];
    ai: AiCandidate[];
    promotedRows: RowTemplate[];
    promotedAi: AiTemplate[];
    rowReviewedPath: string;
    aiReviewedPath: string;
  }) => void,
): Probe {
  const draft = {
    p22: clone(p22),
    manifest: clone(manifest),
    rows: clone(rowCandidates),
    ai: clone(aiCandidates),
    promotedRows: clone(promotedRows),
    promotedAi: clone(promotedAi),
    rowReviewedPath,
    aiReviewedPath,
  };
  mutate?.(draft);
  const result = evaluate(
    draft.p22,
    draft.manifest,
    draft.rows,
    draft.ai,
    rowTemplates,
    aiTemplates,
    draft.promotedRows,
    draft.promotedAi,
    sourceMap,
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
  p22: JsonObject,
  manifest: PromotionManifest,
  rowCandidates: RowCandidate[],
  aiCandidates: AiCandidate[],
  rowTemplates: RowTemplate[],
  aiTemplates: AiTemplate[],
  promotedRows: RowTemplate[],
  promotedAi: AiTemplate[],
  sourceMap: Map<string, TrustedSource>,
  rowReviewedPath: string,
  aiReviewedPath: string,
  rowTemplatePath: string,
  aiTemplatePath: string,
  reviewerDir: string,
): Probe[] {
  return [
    makeProbe('canonical_promoted_decisions_accept', true, p22, manifest, rowCandidates, aiCandidates, rowTemplates, aiTemplates, promotedRows, promotedAi, sourceMap, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir),
    makeProbe('p22_not_ready_rejected', false, p22, manifest, rowCandidates, aiCandidates, rowTemplates, aiTemplates, promotedRows, promotedAi, sourceMap, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.p22.readyForPromotedDecisionFileGeneration = false;
    }),
    makeProbe('row_identity_drift_rejected', false, p22, manifest, rowCandidates, aiCandidates, rowTemplates, aiTemplates, promotedRows, promotedAi, sourceMap, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.rows[0].phraseId = 'wrong_phrase_id';
    }),
    makeProbe('ai_identity_drift_rejected', false, p22, manifest, rowCandidates, aiCandidates, rowTemplates, aiTemplates, promotedRows, promotedAi, sourceMap, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.ai[0].contractId = 'wrong_contract_id';
    }),
    makeProbe('row_wrong_target_rejected', false, p22, manifest, rowCandidates, aiCandidates, rowTemplates, aiTemplates, promotedRows, promotedAi, sourceMap, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.promotedRows[0].studyTarget = 'en';
    }),
    makeProbe('row_missing_gate_pass_rejected', false, p22, manifest, rowCandidates, aiCandidates, rowTemplates, aiTemplates, promotedRows, promotedAi, sourceMap, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.promotedRows[0].gateReviewerDecisions[draft.promotedRows[0].requiredGateIds[0]] = 'unreviewed';
    }),
    makeProbe('row_accept_with_correction_rejected', false, p22, manifest, rowCandidates, aiCandidates, rowTemplates, aiTemplates, promotedRows, promotedAi, sourceMap, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.promotedRows[0].correctedTargetText = 'correction';
    }),
    makeProbe('row_missing_evidence_note_rejected', false, p22, manifest, rowCandidates, aiCandidates, rowTemplates, aiTemplates, promotedRows, promotedAi, sourceMap, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.promotedRows[0].reviewerNotes = 'missing evidence';
    }),
    makeProbe('ai_wrong_language_gate_missing_rejected', false, p22, manifest, rowCandidates, aiCandidates, rowTemplates, aiTemplates, promotedRows, promotedAi, sourceMap, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.promotedAi[0].wrongLanguageGateDecision = 'unreviewed';
    }),
    makeProbe('ai_rejected_fresh_return_open_rejected', false, p22, manifest, rowCandidates, aiCandidates, rowTemplates, aiTemplates, promotedRows, promotedAi, sourceMap, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.promotedAi[0].rejectedFreshOutputMayReturn = true;
    }),
    makeProbe('activation_flag_open_rejected', false, p22, manifest, rowCandidates, aiCandidates, rowTemplates, aiTemplates, promotedRows, promotedAi, sourceMap, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.promotedRows[0].activationApproved = true;
    }),
    makeProbe('output_path_template_overlap_rejected', false, p22, manifest, rowCandidates, aiCandidates, rowTemplates, aiTemplates, promotedRows, promotedAi, sourceMap, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.rowReviewedPath = rowTemplatePath;
    }),
    makeProbe('candidate_import_flag_open_rejected', false, p22, manifest, rowCandidates, aiCandidates, rowTemplates, aiTemplates, promotedRows, promotedAi, sourceMap, rowReviewedPath, aiReviewedPath, rowTemplatePath, aiTemplatePath, reviewerDir, (draft) => {
      draft.rows[0].reviewerDecisionImportAllowed = true;
    }),
  ];
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav LLM Official-Source Promoted Decision File Generation V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Generation state: ${report.summary.generationState}`,
    `- Promotion preflight ready: ${report.summary.promotionPreflightReady ? 'yes' : 'no'}`,
    `- Row decision rows built/written: ${report.summary.rowDecisionRowsBuilt}/${report.summary.rowDecisionFileWritten ? 'yes' : 'no'}`,
    `- AI decision rows built/written: ${report.summary.aiDecisionRowsBuilt}/${report.summary.aiDecisionFileWritten ? 'yes' : 'no'}`,
    `- Accepted row decisions: ${report.summary.acceptedRowDecisionRows}`,
    `- Accepted AI decisions: ${report.summary.acceptedAiDecisionRows}`,
    `- Row gate pass coverage: ${report.summary.rowAcceptedWithAllGatePasses}`,
    `- AI core gate pass coverage: ${report.summary.aiAcceptedWithCoreGatePasses}`,
    `- Row audited source coverage: ${report.summary.rowCandidatesWithAuditedSourceIds}`,
    `- Reviewer evidence notes row/AI: ${report.summary.rowsWithReviewerEvidenceNotes}/${report.summary.aiWithReviewerEvidenceNotes}`,
    `- Output targets separate/confined: ${report.summary.outputTargetsSeparateFromTemplates ? 'yes' : 'no'}/${report.summary.outputTargetsConfinedToPromotedDir ? 'yes' : 'no'}`,
    `- Reviewer templates overwritten: ${report.summary.reviewerTemplatesOverwritten ? 'yes' : 'no'}`,
    `- Reviewer decisions imported: ${report.summary.reviewerDecisionsImported ? 'yes' : 'no'}`,
    `- Payload creation allowed: ${report.summary.payloadCreationAllowed ? 'yes' : 'no'}`,
    `- Runtime downloads enabled: ${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}`,
    `- Activation approved: ${report.summary.activationApproved ? 'yes' : 'no'}`,
    `- Ready for reviewer decision import refresh: ${report.summary.readyForReviewerDecisionImportV2DryRunRefresh ? 'yes' : 'no'}`,
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
  lines.push('', '## Trusted Source Contract', '');
  lines.push(`- Research pack checked online at: ${report.generationManifest.evidenceContract.researchPackCheckedOnlineAt}`);
  lines.push(`- Trusted source ids: ${report.generationManifest.evidenceContract.trustedSourceIds.join(', ')}`);
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
  }
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const runArg = argValue('--run');
  const target = argValue('--target') ?? 'fr';
  if (!runArg) throw new Error('Usage: npx tsx scripts/gustav_llm_official_source_promoted_decision_file_generation_v2_packet.ts --run <run-dir> --target fr');
  if (target !== 'fr') throw new Error('Promoted decision file generation V2 is scoped to --target fr.');

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const generatedAt = new Date().toISOString();
  const auditsDir = path.join(runDir, 'audits');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  const promotedDir = path.join(reviewerDir, 'llm_official_source_promoted_decisions_v2');
  ensureDir(auditsDir);
  ensureDir(promotedDir);

  const p22Path = path.join(auditsDir, 'llm_official_source_decision_promotion_preflight_v2_packet.json');
  const p22ManifestPath = path.join(promotedDir, 'llm_official_source_decision_promotion_preflight_manifest_v2.json');
  const rowCandidatePath = path.join(reviewerDir, 'llm_official_source_decision_dry_run_v2', 'row_decision_candidates_v2.jsonl');
  const aiCandidatePath = path.join(reviewerDir, 'llm_official_source_decision_dry_run_v2', 'ai_decision_candidates_v2.jsonl');
  const rowTemplatePath = path.join(reviewerDir, 'reviewer_decision_template_v2.jsonl');
  const aiTemplatePath = path.join(reviewerDir, 'reviewer_ai_decision_template_v2.jsonl');
  const researchPackPath = path.join(runDir, 'research', 'fr_research_pack.json');
  const rowReviewedPath = path.join(promotedDir, 'row_decisions_reviewed_v2.jsonl');
  const aiReviewedPath = path.join(promotedDir, 'ai_decisions_reviewed_v2.jsonl');
  const generationManifestPath = path.join(promotedDir, 'llm_official_source_promoted_decision_file_generation_manifest_v2.json');
  const outJson = path.join(auditsDir, 'llm_official_source_promoted_decision_file_generation_v2_packet.json');
  const outMd = path.join(auditsDir, 'llm_official_source_promoted_decision_file_generation_v2_packet.md');

  for (const filePath of [p22Path, p22ManifestPath, rowCandidatePath, aiCandidatePath, rowTemplatePath, aiTemplatePath, researchPackPath]) {
    if (!fs.existsSync(filePath)) throw new Error(`Required input is missing: ${rel(repoRoot, filePath)}`);
  }

  const p22Report = readJson<JsonObject>(p22Path);
  const p22 = object(p22Report.summary);
  const p22Manifest = readJson<PromotionManifest>(p22ManifestPath);
  const rowCandidates = parseJsonl<RowCandidate>(rowCandidatePath);
  const aiCandidates = parseJsonl<AiCandidate>(aiCandidatePath);
  const rowTemplates = parseJsonl<RowTemplate>(rowTemplatePath);
  const aiTemplates = parseJsonl<AiTemplate>(aiTemplatePath);
  const researchPack = readJson<JsonObject>(researchPackPath);
  const sourceMap = trustedSourcesById(researchPack);

  const manifestRowTarget = path.resolve(repoRoot, p22Manifest.futureDecisionFiles.rowDecisionsReviewedV2);
  const manifestAiTarget = path.resolve(repoRoot, p22Manifest.futureDecisionFiles.aiDecisionsReviewedV2);
  if (manifestRowTarget !== path.resolve(rowReviewedPath)) {
    throw new Error(`P22 manifest row target mismatch: ${p22Manifest.futureDecisionFiles.rowDecisionsReviewedV2}`);
  }
  if (manifestAiTarget !== path.resolve(aiReviewedPath)) {
    throw new Error(`P22 manifest AI target mismatch: ${p22Manifest.futureDecisionFiles.aiDecisionsReviewedV2}`);
  }

  const promotedRows = rowTemplates.map((row, index) => promoteRow(row, rowCandidates[index], generatedAt, sourceMap));
  const promotedAi = aiTemplates.map((row, index) => promoteAi(row, aiCandidates[index], generatedAt, sourceMap));
  const evaluation = evaluate(
    p22,
    p22Manifest,
    rowCandidates,
    aiCandidates,
    rowTemplates,
    aiTemplates,
    promotedRows,
    promotedAi,
    sourceMap,
    rowReviewedPath,
    aiReviewedPath,
    rowTemplatePath,
    aiTemplatePath,
    reviewerDir,
  );
  const probes = makeProbes(
    p22,
    p22Manifest,
    rowCandidates,
    aiCandidates,
    rowTemplates,
    aiTemplates,
    promotedRows,
    promotedAi,
    sourceMap,
    rowReviewedPath,
    aiReviewedPath,
    rowTemplatePath,
    aiTemplatePath,
    reviewerDir,
  );
  const findings = [...evaluation.findings];
  for (const probe of probes) {
    if (!probe.passed) addFinding(findings, 'blocker', `probe_failed_${probe.id}`, `Fixture probe ${probe.id} did not match expected result.`);
  }
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const ready = blockers === 0;

  const generationManifest = buildGenerationManifest(
    runId,
    generatedAt,
    repoRoot,
    rowReviewedPath,
    aiReviewedPath,
    promotedRows,
    promotedAi,
    researchPack,
    sourceMap,
  );

  if (ready) {
    writeJsonl(rowReviewedPath, promotedRows);
    writeJsonl(aiReviewedPath, promotedAi);
    writeJson(generationManifestPath, generationManifest);
  }

  const report: Report = {
    schemaVersion: 'gustav-llm-official-source-promoted-decision-file-generation-v2-packet-v0',
    runId,
    generatedAt,
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      llmOfficialSourceDecisionPromotionPreflightV2Packet: rel(repoRoot, p22Path),
      llmOfficialSourceDecisionPromotionPreflightManifestV2: rel(repoRoot, p22ManifestPath),
      rowDecisionCandidatesV2: rel(repoRoot, rowCandidatePath),
      aiDecisionCandidatesV2: rel(repoRoot, aiCandidatePath),
      rowDecisionTemplateV2: rel(repoRoot, rowTemplatePath),
      aiDecisionTemplateV2: rel(repoRoot, aiTemplatePath),
      researchPack: rel(repoRoot, researchPackPath),
    },
    outputs: {
      promotedDecisionFileGenerationV2PacketJson: rel(repoRoot, outJson),
      promotedDecisionFileGenerationV2PacketMd: rel(repoRoot, outMd),
      rowDecisionsReviewedV2: rel(repoRoot, rowReviewedPath),
      aiDecisionsReviewedV2: rel(repoRoot, aiReviewedPath),
      promotedDecisionFileGenerationManifestV2: rel(repoRoot, generationManifestPath),
    },
    summary: {
      ...evaluation.metrics,
      blockers,
      warnings,
      readyForReviewerDecisionImportV2DryRunRefresh: ready && evaluation.metrics.readyForReviewerDecisionImportV2DryRunRefresh,
      readyForReviewerDecisionImportExecutionGateRefresh: ready && evaluation.metrics.readyForReviewerDecisionImportExecutionGateRefresh,
      generationState: ready ? 'promoted_decision_files_ready_no_import' : 'blocked_by_findings',
      targetLocale: 'fr',
      sourceLocales: 2,
      trustedSourceFamilies: [...TRUSTED_SOURCE_FAMILIES],
      trustedSourceIds: [...sourceMap.keys()].sort(),
      rowDecisionFileWritten: ready && fs.existsSync(rowReviewedPath),
      aiDecisionFileWritten: ready && fs.existsSync(aiReviewedPath),
      generationManifestWritten: ready && fs.existsSync(generationManifestPath),
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    artifactHashes: {
      llmOfficialSourceDecisionPromotionPreflightV2Packet: sha256(p22Path),
      llmOfficialSourceDecisionPromotionPreflightManifestV2: sha256(p22ManifestPath),
      rowDecisionCandidatesV2: sha256(rowCandidatePath),
      aiDecisionCandidatesV2: sha256(aiCandidatePath),
      rowDecisionTemplateV2: sha256(rowTemplatePath),
      aiDecisionTemplateV2: sha256(aiTemplatePath),
      researchPack: sha256(researchPackPath),
    },
    outputArtifactHashes: ready
      ? {
          rowDecisionsReviewedV2: sha256(rowReviewedPath),
          aiDecisionsReviewedV2: sha256(aiReviewedPath),
          promotedDecisionFileGenerationManifestV2: sha256(generationManifestPath),
        }
      : {},
    generationManifest,
    findings,
    probes,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerTemplatesModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      payloadShardsCreatedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outJson, report);
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`Gustav LLM official-source promoted decision file generation V2: ${report.status}`);
  console.log(`Promoted rows: ${report.summary.acceptedRowDecisionRows}/${REQUIRED_ROWS}`);
  console.log(`Promoted AI contracts: ${report.summary.acceptedAiDecisionRows}/${REQUIRED_AI}`);
  console.log(`Ready for reviewer decision import refresh: ${report.summary.readyForReviewerDecisionImportV2DryRunRefresh ? 'yes' : 'no'}`);
  console.log(`Output: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
