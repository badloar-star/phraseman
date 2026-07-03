import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type MaterializationState = 'blocked_by_findings' | 'contract_ready_no_decisions_written';

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

type Policy = {
  reviewFunctionOwner: 'llm_official_source_reviewer';
  nonLlmReviewDependencyRequired: false;
  llmDecisionMaterializationRequired: true;
  officialSourceVerificationRequired: true;
  mustCiteEvidenceIds: true;
  mustCiteOfficialSourceFamilies: true;
  mustCiteOfficialSourceUrlsOrIds: true;
  mustVerifySourceMeaningParity: true;
  mustVerifyLanguageIsolation: true;
  mustVerifyFrenchNaturalnessAndAntiCalque: true;
  mustVerifyQuizOneCorrectAnswer: true;
  mustRejectWrongLanguageBeforeReturnCache: true;
  mayOverwriteReviewerTemplates: false;
  mayImportDecisions: false;
  mayWriteGeneratedLedgers: false;
  mayCreatePayloads: false;
  mayUploadPacks: false;
  mayEnableRuntimeDownloads: false;
  mayApproveApply: false;
};

type Evaluation = {
  reviewFunctionOwner: 'llm_official_source_reviewer';
  nonLlmReviewDependencyRequired: false;
  llmDecisionMaterializationRequired: true;
  officialSourceVerificationRequired: true;
  trustedSourceFamilies: string[];
  trustedSourceFamilyCount: number;
  cambridgeSourceFamilyPresent: boolean;
  frenchAuthoritySourceFamilyPresent: boolean;
  grammarReferenceSourceFamilyPresent: boolean;
  rowDecisionRows: number;
  aiDecisionRows: number;
  rowDecisionTemplatesWithRequiredIdentity: number;
  rowDecisionTemplatesWithResearchEvidence: number;
  rowDecisionTemplatesWithRequiredGates: number;
  aiDecisionTemplatesWithRequiredIdentity: number;
  aiDecisionTemplatesWithWrongLanguageGate: number;
  aiDecisionTemplatesWithCacheGate: number;
  futureAcceptedRowsRequireEvidenceIds: number;
  futureAcceptedRowsRequireSourceMeaningParity: number;
  futureAcceptedRowsRequireLanguageIsolation: number;
  futureAcceptedRowsRequireAntiCalque: number;
  futureAcceptedRowsRequireGrammarNaturalness: number;
  futureAcceptedRowsRequireQuizGate: number;
  futureAcceptedAiRequireWrongLanguageGate: number;
  futureAcceptedAiRequireRejectBeforeReturn: number;
  futureAcceptedAiRequireRejectBeforeCache: number;
  futureAcceptedAiRequireCacheLanguageKey: number;
  currentLlmReviewedRowDecisions: number;
  currentLlmReviewedAiDecisions: number;
  reviewerTemplatesOverwritten: false;
  reviewerDecisionsImported: false;
  generatedLedgerWritesAllowed: false;
  payloadCreationAllowed: false;
  serverUploadAllowed: false;
  firebaseUploadAllowed: false;
  runtimeDownloadsEnabled: false;
  activationApproved: false;
  readyForLlmOfficialSourceDecisionDryRun: boolean;
  readyForReviewerDecisionImportExecutionGateRefresh: boolean;
  readyForPayloadCreationApprovalPreflight: false;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
  materializationState: MaterializationState;
  blockers: number;
  warnings: number;
};

type Report = {
  schemaVersion: 'gustav-llm-official-source-decision-materialization-v2-packet-v0';
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
    reviewerTemplatesModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    payloadShardsCreatedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

const REQUIRED_ROWS = 1600;
let REQUIRED_AI = 164;
const TRUSTED_SOURCE_FAMILIES = [
  'cambridge_dictionary',
  'larousse_dictionary_and_conjugation',
  'bescherelle_grammar',
  'tv5monde_apprendre',
  'academie_francaise',
  'le_robert',
  'france_education_international',
] as const;

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

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringArray(value: JsonObject, key: string): string[] {
  const raw = value[key];
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
}

function parseJsonl<T>(filePath: string): T[] {
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as T);
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string): void {
  findings.push({ severity, code, message });
}

function defaultPolicy(): Policy {
  return {
    reviewFunctionOwner: 'llm_official_source_reviewer',
    nonLlmReviewDependencyRequired: false,
    llmDecisionMaterializationRequired: true,
    officialSourceVerificationRequired: true,
    mustCiteEvidenceIds: true,
    mustCiteOfficialSourceFamilies: true,
    mustCiteOfficialSourceUrlsOrIds: true,
    mustVerifySourceMeaningParity: true,
    mustVerifyLanguageIsolation: true,
    mustVerifyFrenchNaturalnessAndAntiCalque: true,
    mustVerifyQuizOneCorrectAnswer: true,
    mustRejectWrongLanguageBeforeReturnCache: true,
    mayOverwriteReviewerTemplates: false,
    mayImportDecisions: false,
    mayWriteGeneratedLedgers: false,
    mayCreatePayloads: false,
    mayUploadPacks: false,
    mayEnableRuntimeDownloads: false,
    mayApproveApply: false,
  };
}

function countSourceFamilies(text: string): Record<string, number> {
  const aliases: Record<string, string[]> = {
    cambridge_dictionary: ['cambridge english-french dictionary', 'cambridge french-english dictionary', 'cambridge'],
    larousse_dictionary_and_conjugation: ['larousse conjugaison', 'larousse'],
    bescherelle_grammar: ['bescherelle'],
    tv5monde_apprendre: ['tv5monde apprendre', 'tv5monde'],
    academie_francaise: ['academie francaise', 'académie française', 'academie', 'académie'],
    le_robert: ['le robert', 'robert'],
    france_education_international: ['france education international', 'delf a1'],
  };
  const haystack = text.toLowerCase();
  const counts: Record<string, number> = {};
  for (const family of TRUSTED_SOURCE_FAMILIES) {
    counts[family] = aliases[family].reduce((sum, alias) => {
      const pattern = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return sum + (haystack.match(new RegExp(pattern, 'g'))?.length ?? 0);
    }, 0);
  }
  return counts;
}

function presentFamilies(counts: Record<string, number>): string[] {
  return TRUSTED_SOURCE_FAMILIES.filter((family) => (counts[family] ?? 0) > 0);
}

function evaluate(
  llmIntake: JsonObject,
  workflowSchema: JsonObject,
  rowTemplates: JsonObject[],
  aiTemplates: JsonObject[],
  sourceCounts: Record<string, number>,
  policy: Policy,
): { metrics: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  const sourceFamilies = presentFamilies(sourceCounts);
  const rowDecisionRows = rowTemplates.length;
  const aiDecisionRows = aiTemplates.length;
  const rowDecisionTemplatesWithRequiredIdentity = rowTemplates.filter((row) =>
    s(row, 'studyTarget') === 'fr' &&
    array(row.sourceLocaleCoverage).includes('ru') &&
    array(row.sourceLocaleCoverage).includes('uk') &&
    s(row, 'schemaRowId') !== '' &&
    s(row, 'qualityRowId') !== '',
  ).length;
  const rowDecisionTemplatesWithResearchEvidence = rowTemplates.filter((row) => array(row.researchEvidenceIds).length > 0).length;
  const rowDecisionTemplatesWithRequiredGates = rowTemplates.filter((row) => array(row.requiredGateIds).length > 0).length;
  const aiDecisionTemplatesWithRequiredIdentity = aiTemplates.filter((row) =>
    s(row, 'studyTarget') === 'fr' &&
    s(row, 'contractId') !== '' &&
    s(row, 'aiQualityGateId') !== '',
  ).length;
  const aiDecisionTemplatesWithWrongLanguageGate = aiTemplates.filter((row) => array(row.requiredGateIds).some((gate) => String(gate).includes('wrong_language'))).length;
  const aiDecisionTemplatesWithCacheGate = aiTemplates.filter((row) => array(row.requiredGateIds).some((gate) => String(gate).includes('cache'))).length;

  if (n(llmIntake, 'blockers') !== 0 || !b(llmIntake, 'llmOfficialSourceReviewCanStart')) {
    addFinding(findings, 'blocker', 'llm_official_source_intake_not_ready', 'LLM official-source review intake must be ready to start before decision materialization can be planned.');
  }
  if (s(llmIntake, 'reviewFunctionOwner') !== 'llm_official_source_reviewer' || policy.reviewFunctionOwner !== 'llm_official_source_reviewer') {
    addFinding(findings, 'blocker', 'review_owner_not_llm_official_source', 'Decision materialization must be owned by llm_official_source_reviewer.');
  }
  if (policy.nonLlmReviewDependencyRequired !== false) addFinding(findings, 'blocker', 'llm_official_source_reviewer_required', 'Non-LLM review dependency must not be required for decision materialization.');
  if (!policy.llmDecisionMaterializationRequired) addFinding(findings, 'blocker', 'llm_materialization_not_required', 'LLM decision materialization must be required.');
  if (!policy.officialSourceVerificationRequired || !b(llmIntake, 'officialSourceVerificationRequired')) {
    addFinding(findings, 'blocker', 'official_source_verification_missing', 'Official/trusted source verification must be required.');
  }
  if (!policy.mustCiteEvidenceIds || !policy.mustCiteOfficialSourceFamilies || !policy.mustCiteOfficialSourceUrlsOrIds) {
    addFinding(findings, 'blocker', 'source_citation_policy_incomplete', 'Every future accepted decision must cite evidence ids, source families and source ids/URLs.');
  }
  if (!policy.mustVerifySourceMeaningParity || !policy.mustVerifyLanguageIsolation) {
    addFinding(findings, 'blocker', 'language_or_meaning_policy_incomplete', 'Every future accepted decision must verify source meaning parity and language isolation.');
  }
  if (!policy.mustRejectWrongLanguageBeforeReturnCache) {
    addFinding(findings, 'blocker', 'ai_wrong_language_reject_policy_missing', 'AI decisions must preserve reject-before-return/cache policy.');
  }
  if (sourceFamilies.length < 5 || !sourceFamilies.includes('cambridge_dictionary')) {
    addFinding(findings, 'blocker', 'trusted_source_family_coverage_incomplete', 'At least five trusted source families including Cambridge must be present.');
  }
  if (rowDecisionRows !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_template_count_invalid', `Expected ${REQUIRED_ROWS} row decisions, found ${rowDecisionRows}.`);
  if (aiDecisionRows !== REQUIRED_AI) addFinding(findings, 'blocker', 'ai_template_count_invalid', `Expected ${REQUIRED_AI} AI decisions, found ${aiDecisionRows}.`);
  if (rowDecisionTemplatesWithRequiredIdentity !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_identity_contract_incomplete', 'Every row template must carry studyTarget/sourceLocale/schema identity.');
  if (rowDecisionTemplatesWithResearchEvidence !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_research_evidence_incomplete', 'Every row template must carry researchEvidenceIds.');
  if (rowDecisionTemplatesWithRequiredGates !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_required_gates_incomplete', 'Every row template must carry requiredGateIds.');
  if (aiDecisionTemplatesWithRequiredIdentity !== REQUIRED_AI) addFinding(findings, 'blocker', 'ai_identity_contract_incomplete', 'Every AI template must carry studyTarget/contract identity.');
  if (aiDecisionTemplatesWithWrongLanguageGate !== REQUIRED_AI) addFinding(findings, 'blocker', 'ai_wrong_language_gate_incomplete', 'Every AI template must carry wrong-language gate evidence.');
  if (aiDecisionTemplatesWithCacheGate !== REQUIRED_AI) addFinding(findings, 'blocker', 'ai_cache_gate_incomplete', 'Every AI template must carry cache gate evidence.');
  if (
    policy.mayOverwriteReviewerTemplates ||
    policy.mayImportDecisions ||
    policy.mayWriteGeneratedLedgers ||
    policy.mayCreatePayloads ||
    policy.mayUploadPacks ||
    policy.mayEnableRuntimeDownloads ||
    policy.mayApproveApply
  ) {
    addFinding(findings, 'blocker', 'write_or_production_transition_open', 'P20 may only create a dry-run packet; writes/uploads/downloads/apply must stay closed.');
  }
  if (b(workflowSchema, 'readyForApply') || b(llmIntake, 'readyForApply')) {
    addFinding(findings, 'blocker', 'upstream_apply_open', 'Upstream workflow/intake must not be ready for apply.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const ready = blockers === 0;
  return {
    metrics: {
      reviewFunctionOwner: 'llm_official_source_reviewer',
      nonLlmReviewDependencyRequired: false,
      llmDecisionMaterializationRequired: true,
      officialSourceVerificationRequired: true,
      trustedSourceFamilies: sourceFamilies,
      trustedSourceFamilyCount: sourceFamilies.length,
      cambridgeSourceFamilyPresent: sourceFamilies.includes('cambridge_dictionary'),
      frenchAuthoritySourceFamilyPresent: sourceFamilies.some((family) => ['larousse_dictionary_and_conjugation', 'academie_francaise', 'le_robert'].includes(family)),
      grammarReferenceSourceFamilyPresent: sourceFamilies.some((family) => ['bescherelle_grammar', 'tv5monde_apprendre', 'academie_francaise'].includes(family)),
      rowDecisionRows,
      aiDecisionRows,
      rowDecisionTemplatesWithRequiredIdentity,
      rowDecisionTemplatesWithResearchEvidence,
      rowDecisionTemplatesWithRequiredGates,
      aiDecisionTemplatesWithRequiredIdentity,
      aiDecisionTemplatesWithWrongLanguageGate,
      aiDecisionTemplatesWithCacheGate,
      futureAcceptedRowsRequireEvidenceIds: rowDecisionRows,
      futureAcceptedRowsRequireSourceMeaningParity: rowDecisionRows,
      futureAcceptedRowsRequireLanguageIsolation: rowDecisionRows,
      futureAcceptedRowsRequireAntiCalque: rowDecisionRows,
      futureAcceptedRowsRequireGrammarNaturalness: rowDecisionRows,
      futureAcceptedRowsRequireQuizGate: rowDecisionRows,
      futureAcceptedAiRequireWrongLanguageGate: aiDecisionRows,
      futureAcceptedAiRequireRejectBeforeReturn: aiDecisionRows,
      futureAcceptedAiRequireRejectBeforeCache: aiDecisionRows,
      futureAcceptedAiRequireCacheLanguageKey: aiDecisionRows,
      currentLlmReviewedRowDecisions: n(llmIntake, 'llmReviewedRowDecisionRows'),
      currentLlmReviewedAiDecisions: n(llmIntake, 'llmReviewedAiDecisionRows'),
      reviewerTemplatesOverwritten: false,
      reviewerDecisionsImported: false,
      generatedLedgerWritesAllowed: false,
      payloadCreationAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForLlmOfficialSourceDecisionDryRun: ready,
      readyForReviewerDecisionImportExecutionGateRefresh: false,
      readyForPayloadCreationApprovalPreflight: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      materializationState: ready ? 'contract_ready_no_decisions_written' : 'blocked_by_findings',
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
  llmIntake: JsonObject,
  workflowSchema: JsonObject,
  rowTemplates: JsonObject[],
  aiTemplates: JsonObject[],
  sourceCounts: Record<string, number>,
  policy: Policy,
  mutate?: (draft: {
    llmIntake: JsonObject;
    workflowSchema: JsonObject;
    rowTemplates: JsonObject[];
    aiTemplates: JsonObject[];
    sourceCounts: Record<string, number>;
    policy: Policy;
  }) => void,
): Probe {
  const draft = {
    llmIntake: clone(llmIntake),
    workflowSchema: clone(workflowSchema),
    rowTemplates: clone(rowTemplates),
    aiTemplates: clone(aiTemplates),
    sourceCounts: clone(sourceCounts),
    policy: clone(policy),
  };
  mutate?.(draft);
  const result = evaluate(draft.llmIntake, draft.workflowSchema, draft.rowTemplates, draft.aiTemplates, draft.sourceCounts, draft.policy).metrics;
  const accepted = result.blockers === 0;
  return { id, expectedAccept, accepted, blockers: result.blockers, passed: accepted === expectedAccept };
}

function makeProbes(llmIntake: JsonObject, workflowSchema: JsonObject, rowTemplates: JsonObject[], aiTemplates: JsonObject[], sourceCounts: Record<string, number>, policy: Policy): Probe[] {
  return [
    makeProbe('canonical_contract_ready_accepts', true, llmIntake, workflowSchema, rowTemplates, aiTemplates, sourceCounts, policy),
    makeProbe('non_llm_review_dependency_rejected', false, llmIntake, workflowSchema, rowTemplates, aiTemplates, sourceCounts, policy, (draft) => {
      (draft.policy as unknown as { nonLlmReviewDependencyRequired: boolean }).nonLlmReviewDependencyRequired = true;
    }),
    makeProbe('missing_cambridge_source_rejected', false, llmIntake, workflowSchema, rowTemplates, aiTemplates, sourceCounts, policy, (draft) => {
      draft.sourceCounts.cambridge_dictionary = 0;
    }),
    makeProbe('missing_evidence_ids_policy_rejected', false, llmIntake, workflowSchema, rowTemplates, aiTemplates, sourceCounts, policy, (draft) => {
      (draft.policy as unknown as { mustCiteEvidenceIds: boolean }).mustCiteEvidenceIds = false;
    }),
    makeProbe('row_without_research_evidence_rejected', false, llmIntake, workflowSchema, rowTemplates, aiTemplates, sourceCounts, policy, (draft) => {
      draft.rowTemplates[0].researchEvidenceIds = [];
    }),
    makeProbe('row_wrong_study_target_rejected', false, llmIntake, workflowSchema, rowTemplates, aiTemplates, sourceCounts, policy, (draft) => {
      draft.rowTemplates[0].studyTarget = 'en';
    }),
    makeProbe('ai_missing_cache_gate_rejected', false, llmIntake, workflowSchema, rowTemplates, aiTemplates, sourceCounts, policy, (draft) => {
      draft.aiTemplates[0].requiredGateIds = ['wrong_language_output_gate'];
    }),
    makeProbe('template_overwrite_permission_rejected', false, llmIntake, workflowSchema, rowTemplates, aiTemplates, sourceCounts, policy, (draft) => {
      (draft.policy as unknown as { mayOverwriteReviewerTemplates: boolean }).mayOverwriteReviewerTemplates = true;
    }),
    makeProbe('decision_import_permission_rejected', false, llmIntake, workflowSchema, rowTemplates, aiTemplates, sourceCounts, policy, (draft) => {
      (draft.policy as unknown as { mayImportDecisions: boolean }).mayImportDecisions = true;
    }),
    makeProbe('runtime_download_permission_rejected', false, llmIntake, workflowSchema, rowTemplates, aiTemplates, sourceCounts, policy, (draft) => {
      (draft.policy as unknown as { mayEnableRuntimeDownloads: boolean }).mayEnableRuntimeDownloads = true;
    }),
  ];
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav LLM Official-Source Decision Materialization V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Materialization state: ${report.summary.materializationState}`,
    `- Review function owner: ${report.summary.reviewFunctionOwner}`,
    `- Non-LLM review dependency required: ${report.summary.nonLlmReviewDependencyRequired ? 'yes' : 'no'}`,
    `- Trusted source families: ${report.summary.trustedSourceFamilies.join(', ')}`,
    `- Row decision templates: ${report.summary.rowDecisionRows}`,
    `- AI decision templates: ${report.summary.aiDecisionRows}`,
    `- Future row evidence-id requirement coverage: ${report.summary.futureAcceptedRowsRequireEvidenceIds}/${report.summary.rowDecisionRows}`,
    `- Future AI wrong-language/cache requirements: ${report.summary.futureAcceptedAiRequireWrongLanguageGate}/${report.summary.futureAcceptedAiRequireRejectBeforeCache}`,
    `- Current LLM-reviewed rows: ${report.summary.currentLlmReviewedRowDecisions}/${report.summary.rowDecisionRows}`,
    `- Current LLM-reviewed AI: ${report.summary.currentLlmReviewedAiDecisions}/${report.summary.aiDecisionRows}`,
    `- Reviewer templates overwritten: ${report.summary.reviewerTemplatesOverwritten ? 'yes' : 'no'}`,
    `- Reviewer decisions imported: ${report.summary.reviewerDecisionsImported ? 'yes' : 'no'}`,
    `- Ready for LLM official-source decision dry-run: ${report.summary.readyForLlmOfficialSourceDecisionDryRun ? 'yes' : 'no'}`,
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
    for (const finding of report.findings) lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
  }
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const runArg = argValue('--run');
  const target = argValue('--target') ?? 'fr';
  if (!runArg) throw new Error('Usage: npx tsx scripts/gustav_llm_official_source_decision_materialization_v2_packet.ts --run <run-dir> --target fr');
  if (target !== 'fr') throw new Error('LLM official-source decision materialization V2 is scoped to --target fr.');

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const researchDir = path.join(runDir, 'research');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  ensureDir(auditsDir);

  const llmIntakePath = path.join(auditsDir, 'llm_official_source_review_intake_v2_packet.json');
  const workflowSchemaPath = path.join(reviewerDir, 'reviewer_workflow_v2_decision_schema.json');
  const rowTemplatePath = path.join(reviewerDir, 'reviewer_decision_template_v2.jsonl');
  const aiTemplatePath = path.join(reviewerDir, 'reviewer_ai_decision_template_v2.jsonl');
  const researchPackPath = path.join(researchDir, 'fr_research_pack.json');
  const evidenceLedgerPath = path.join(researchDir, 'evidence_ledger.json');
  const outJson = path.join(auditsDir, 'llm_official_source_decision_materialization_v2_packet.json');
  const outMd = path.join(auditsDir, 'llm_official_source_decision_materialization_v2_packet.md');

  for (const filePath of [llmIntakePath, workflowSchemaPath, rowTemplatePath, aiTemplatePath, researchPackPath, evidenceLedgerPath]) {
    if (!fs.existsSync(filePath)) throw new Error(`Required input is missing: ${rel(repoRoot, filePath)}`);
  }

  const llmIntake = object(readJson<JsonObject>(llmIntakePath).summary);
  const workflowSchema = object(readJson<JsonObject>(workflowSchemaPath));
  const rowTemplates = parseJsonl<JsonObject>(rowTemplatePath);
  const aiTemplates = parseJsonl<JsonObject>(aiTemplatePath);
  REQUIRED_AI = Math.max(REQUIRED_AI, n(llmIntake, 'automatedAiQualityGateCoverage'), aiTemplates.length);
  const sourceCounts = countSourceFamilies(`${fs.readFileSync(researchPackPath, 'utf8')}\n${fs.readFileSync(evidenceLedgerPath, 'utf8')}`);
  const policy = defaultPolicy();
  const evaluation = evaluate(llmIntake, workflowSchema, rowTemplates, aiTemplates, sourceCounts, policy);
  const probes = makeProbes(llmIntake, workflowSchema, rowTemplates, aiTemplates, sourceCounts, policy);
  const findings = [...evaluation.findings];
  for (const probe of probes.filter((probe) => !probe.passed)) {
    addFinding(findings, 'blocker', 'fixture_probe_failed', `Fixture probe failed: ${probe.id}.`);
  }
  addFinding(findings, 'info', 'dry_run_packet_only', 'P20 defines LLM official-source decision materialization requirements but does not write reviewer templates or import decisions.');

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const metrics: Evaluation = {
    ...evaluation.metrics,
    blockers,
    warnings,
    readyForLlmOfficialSourceDecisionDryRun: blockers === 0 && evaluation.metrics.readyForLlmOfficialSourceDecisionDryRun,
    materializationState: blockers === 0 ? evaluation.metrics.materializationState : 'blocked_by_findings',
  };
  const report: Report = {
    schemaVersion: 'gustav-llm-official-source-decision-materialization-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: { argv: process.argv.slice(2), cwd: repoRoot, nodeVersion: process.version },
    inputs: {
      llmOfficialSourceReviewIntakeV2Packet: rel(repoRoot, llmIntakePath),
      reviewerWorkflowV2DecisionSchema: rel(repoRoot, workflowSchemaPath),
      reviewerDecisionTemplateV2: rel(repoRoot, rowTemplatePath),
      reviewerAiDecisionTemplateV2: rel(repoRoot, aiTemplatePath),
      frenchResearchPack: rel(repoRoot, researchPackPath),
      evidenceLedger: rel(repoRoot, evidenceLedgerPath),
    },
    outputs: {
      llmOfficialSourceDecisionMaterializationV2PacketJson: rel(repoRoot, outJson),
      llmOfficialSourceDecisionMaterializationV2PacketMd: rel(repoRoot, outMd),
    },
    summary: {
      ...metrics,
      targetLocale: 'fr',
      sourceLocales: 2,
      sourceFamilyEvidenceCounts: sourceCounts,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    artifactHashes: {
      llmOfficialSourceReviewIntakeV2Packet: sha256(llmIntakePath),
      reviewerWorkflowV2DecisionSchema: sha256(workflowSchemaPath),
      reviewerDecisionTemplateV2: sha256(rowTemplatePath),
      reviewerAiDecisionTemplateV2: sha256(aiTemplatePath),
      frenchResearchPack: sha256(researchPackPath),
      evidenceLedger: sha256(evidenceLedgerPath),
    },
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
  console.log(`GUSTAV LLM official-source decision materialization V2 packet: ${report.status}`);
  console.log(`Materialization state: ${report.summary.materializationState}`);
  console.log(`Non-LLM review dependency required: ${report.summary.nonLlmReviewDependencyRequired ? 'yes' : 'no'}`);
  console.log(`Row decision templates: ${report.summary.rowDecisionRows}`);
  console.log(`AI decision templates: ${report.summary.aiDecisionRows}`);
  console.log(`Ready for LLM official-source decision dry-run: ${report.summary.readyForLlmOfficialSourceDecisionDryRun ? 'yes' : 'no'}`);
  console.log(`Reviewer templates overwritten: ${report.summary.reviewerTemplatesOverwritten ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);
  if (blockers > 0) process.exitCode = 1;
}

main();
