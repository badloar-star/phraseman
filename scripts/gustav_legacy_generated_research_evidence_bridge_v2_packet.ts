import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type JsonObject = Record<string, unknown>;

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  scope?: 'row' | 'ai' | 'manifest' | 'dry_run' | 'contract';
  identity?: string;
};

type Probe = {
  id: string;
  expectedAccept: boolean;
  accepted: boolean;
  blockers: number;
  passed: boolean;
};

type Metrics = {
  targetLocale: string;
  sourceLocales: string[];
  legacyQueueRows: number;
  uniqueLegacyQueueRows: number;
  rowDecisionRows: number;
  aiDecisionRows: number;
  rowIdentityMatched: number;
  rowDuplicateDecisions: number;
  rowIdentityMismatches: number;
  rowPayloadMismatches: number;
  rowsTargetScoped: number;
  rowsSourceLocaleScoped: number;
  rowsAcceptedByLlmOfficialSource: number;
  rowsWithResearchEvidenceIds: number;
  rowsWithRequiredGateIds: number;
  rowsWithResearchGate: number;
  rowsWithLanguageIsolationGate: number;
  rowsWithReviewerDecisionGate: number;
  rowsWithAllRequiredGatesPassed: number;
  rowsWithOfficialSourceNotes: number;
  rowActivationBlockedRows: number;
  rowReviewerImportOpenFlags: number;
  rowProductionApplyOpenFlags: number;
  rowActivationApprovedFlags: number;
  aiAcceptedByLlmOfficialSource: number;
  highRiskAiDecisionRows: number;
  highRiskAiWithResearchGate: number;
  aiTargetScoped: number;
  aiSourceLocaleScoped: number;
  aiWithRequiredGateIds: number;
  aiWithResearchGate: number;
  aiWithWrongLanguageGate: number;
  aiWithCacheLanguageGate: number;
  aiWithLiveReturnGate: number;
  aiLanguageGatesPassed: number;
  aiWithOfficialSourceNotes: number;
  aiRejectedFreshReturnOpenRows: number;
  aiRejectedFreshCacheOpenRows: number;
  aiTargetOutputBeforeQualityOpenRows: number;
  aiActivationBlockedRows: number;
  aiReviewerImportOpenFlags: number;
  aiProductionApplyOpenFlags: number;
  aiActivationApprovedFlags: number;
  manifestCountsMatch: boolean;
  manifestEvidenceContractPresent: boolean;
  manifestTrustedSourceIds: number;
  manifestTrustedSourceFamilies: number;
  manifestResearchPackCheckedOnlineAtPresent: boolean;
  manifestClosedTransitions: boolean;
  dryRunReady: boolean;
  dryRunPromotedRowFileUsed: boolean;
  dryRunPromotedAiFileUsed: boolean;
  dryRunRows: number;
  dryRunAi: number;
  dryRunAcceptedRows: number;
  dryRunAcceptedAi: number;
  dryRunRowProbesPassed: number;
  dryRunRowProbes: number;
  dryRunAiProbesPassed: number;
  dryRunAiProbes: number;
  dryRunReadyForApply: boolean;
  dryRunMayModifyProductionAppFiles: boolean;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
  activationApproved: false;
  serverUploadAllowed: false;
  firebaseUploadAllowed: false;
  runtimeDownloadsEnabled: false;
};

type Report = {
  schemaVersion: 'gustav-legacy-generated-research-evidence-bridge-v2-packet-v0';
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
  summary: Metrics & {
    bridgeState: 'legacy_generated_research_evidence_bridge_ready_no_writes' | 'blocked_by_findings';
    blockers: number;
    warnings: number;
    fixtureProbesPassed: number;
    fixtureProbes: number;
  };
  bridgeContract: {
    dryRunOnly: true;
    writesGeneratedLedgers: false;
    importsReviewerDecisions: false;
    createsPayloads: false;
    opensProductionApply: false;
    requiresLegacyRowsCoveredByPromotedOfficialSourceDecisions: true;
    requiresAiPromptDecisionsCoveredByPromotedOfficialSourceDecisions: true;
    requiresResearchEvidenceIds: true;
    requiresRequiredGateIds: true;
    requiresLanguageIsolationGates: true;
  };
  findings: Finding[];
  probes: Probe[];
  nextRequiredActions: string[];
};

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

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringArray(value: unknown): string[] {
  return arr(value).filter((item): item is string => typeof item === 'string');
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
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

function readJsonOrEmpty(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as JsonObject;
}

function readJsonl(filePath: string): JsonObject[] {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as JsonObject);
}

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function rowIdentity(row: JsonObject): string {
  return `${String(row.lessonId ?? '')}:${s(row, 'phraseId')}`;
}

function sameStringArray(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && expected.every((item) => actual.includes(item));
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, scope?: Finding['scope'], identity?: string): void {
  findings.push({ severity, code, message, scope, identity });
}

function gateValuesPass(decision: JsonObject): boolean {
  const requiredGateIds = stringArray(decision.requiredGateIds);
  const gateDecisions = object(decision.gateReviewerDecisions);
  return requiredGateIds.length > 0 && requiredGateIds.every((gateId) => s(gateDecisions, gateId) === 'pass');
}

function notesCiteOfficialSources(decision: JsonObject): boolean {
  const notes = s(decision, 'reviewerNotes');
  return notes.includes('sourceRefs=') && notes.includes('activation=blocked');
}

function rowPayloadMatches(queueRow: JsonObject, decision: JsonObject): boolean {
  const quiz = object(decision.candidateQuiz);
  return (
    s(decision, 'sourceGraphEnglishBase') === s(queueRow, 'englishBase') &&
    s(decision, 'candidateTargetText') === s(queueRow, 'proposedFrench') &&
    s(quiz, 'blank') === s(queueRow, 'quizBlank') &&
    s(quiz, 'correct') === s(queueRow, 'quizCorrect') &&
    sameStringArray(stringArray(quiz.distractors), stringArray(queueRow.quizDistractors)) &&
    s(quiz, 'category') === s(queueRow, 'quizCategory')
  );
}

function closedTransitionsClosed(manifest: JsonObject): boolean {
  const closed = object(manifest.closedTransitions);
  const keys = [
    'reviewerTemplatesOverwritten',
    'reviewerDecisionsImported',
    'generatedLedgerWritesAllowed',
    'payloadCreationAllowed',
    'serverUploadAllowed',
    'firebaseUploadAllowed',
    'runtimeDownloadsEnabled',
    'activationApproved',
    'readyForApply',
    'mayModifyProductionAppFiles',
  ];
  return keys.every((key) => b(closed, key) === false);
}

function inspectArtifacts(queueRows: JsonObject[], rowDecisions: JsonObject[], aiDecisions: JsonObject[], manifest: JsonObject, dryRun: JsonObject, findings: Finding[]): Metrics {
  const queueById = new Map<string, JsonObject>();
  for (const row of queueRows) {
    const id = rowIdentity(row);
    if (queueById.has(id)) addFinding(findings, 'blocker', 'legacy_queue_duplicate_identity', 'Legacy queue contains duplicate lesson/phrase identity.', 'row', id);
    queueById.set(id, row);
  }

  const seenDecisions = new Set<string>();
  const rowDecisionCounts = {
    matched: 0,
    duplicates: 0,
    mismatches: 0,
    payloadMatches: 0,
    targetScoped: 0,
    sourceScoped: 0,
    accepted: 0,
    evidence: 0,
    gateIds: 0,
    researchGate: 0,
    languageGate: 0,
    reviewerGate: 0,
    gatesPassed: 0,
    notes: 0,
    activationBlocked: 0,
    importOpen: 0,
    applyOpen: 0,
    activationOpen: 0,
  };

  for (const decision of rowDecisions) {
    const id = rowIdentity(decision);
    if (seenDecisions.has(id)) {
      rowDecisionCounts.duplicates += 1;
      addFinding(findings, 'blocker', 'row_decision_duplicate_identity', 'Promoted row decisions contain duplicate lesson/phrase identity.', 'row', id);
      continue;
    }
    seenDecisions.add(id);
    const queueRow = queueById.get(id);
    if (!queueRow) {
      rowDecisionCounts.mismatches += 1;
      addFinding(findings, 'blocker', 'row_decision_missing_legacy_queue_match', 'Promoted row decision does not match a legacy queue identity.', 'row', id);
      continue;
    }
    rowDecisionCounts.matched += 1;
    if (rowPayloadMatches(queueRow, decision)) rowDecisionCounts.payloadMatches += 1;
    else addFinding(findings, 'blocker', 'row_decision_payload_mismatch', 'Promoted row decision payload does not match legacy generated queue payload.', 'row', id);

    if (s(decision, 'studyTarget') === 'fr') rowDecisionCounts.targetScoped += 1;
    else addFinding(findings, 'blocker', 'row_decision_wrong_target', 'Promoted row decision must stay scoped to studyTarget=fr.', 'row', id);

    if (sameStringArray(stringArray(decision.sourceLocaleCoverage), ['ru', 'uk'])) rowDecisionCounts.sourceScoped += 1;
    else addFinding(findings, 'blocker', 'row_decision_wrong_source_locale_coverage', 'Promoted row decision must cover only sourceLocale ru/uk.', 'row', id);

    if (s(decision, 'reviewerDecision') === 'accept_quality_gates' && s(decision, 'reviewerName') === 'llm_official_source_reviewer') rowDecisionCounts.accepted += 1;
    else addFinding(findings, 'blocker', 'row_decision_not_llm_official_source_accepted', 'Promoted row decision must be accepted by the LLM official-source reviewer.', 'row', id);

    const evidenceIds = stringArray(decision.researchEvidenceIds);
    const gateIds = stringArray(decision.requiredGateIds);
    if (evidenceIds.length > 0) rowDecisionCounts.evidence += 1;
    else addFinding(findings, 'blocker', 'row_research_evidence_missing', 'Promoted row decision must include researchEvidenceIds.', 'row', id);
    if (gateIds.length > 0) rowDecisionCounts.gateIds += 1;
    else addFinding(findings, 'blocker', 'row_required_gate_ids_missing', 'Promoted row decision must include requiredGateIds.', 'row', id);
    if (gateIds.includes('research_evidence_gate')) rowDecisionCounts.researchGate += 1;
    else addFinding(findings, 'blocker', 'row_research_gate_missing', 'Promoted row decision must include research_evidence_gate.', 'row', id);
    if (gateIds.includes('language_field_isolation_gate')) rowDecisionCounts.languageGate += 1;
    else addFinding(findings, 'blocker', 'row_language_isolation_gate_missing', 'Promoted row decision must include language_field_isolation_gate.', 'row', id);
    if (gateIds.includes('reviewer_decision_gate')) rowDecisionCounts.reviewerGate += 1;
    else addFinding(findings, 'blocker', 'row_reviewer_decision_gate_missing', 'Promoted row decision must include reviewer_decision_gate.', 'row', id);
    if (gateValuesPass(decision)) rowDecisionCounts.gatesPassed += 1;
    else addFinding(findings, 'blocker', 'row_required_gate_not_passed', 'Every required row gate must be marked pass before bridge acceptance.', 'row', id);
    if (notesCiteOfficialSources(decision)) rowDecisionCounts.notes += 1;
    else addFinding(findings, 'blocker', 'row_official_source_note_missing', 'Promoted row decision must cite official source refs in reviewerNotes.', 'row', id);
    if (s(decision, 'currentActivationStatus') === 'blocked') rowDecisionCounts.activationBlocked += 1;
    else addFinding(findings, 'blocker', 'row_activation_not_blocked', 'Promoted row decision must remain activation-blocked.', 'row', id);
    if (b(decision, 'reviewerImportAllowed')) rowDecisionCounts.importOpen += 1;
    if (b(decision, 'productionApplyAllowed')) rowDecisionCounts.applyOpen += 1;
    if (b(decision, 'activationApproved')) rowDecisionCounts.activationOpen += 1;
  }

  for (const id of queueById.keys()) {
    if (!seenDecisions.has(id)) {
      rowDecisionCounts.mismatches += 1;
      addFinding(findings, 'blocker', 'legacy_queue_row_missing_promoted_decision', 'Legacy generated queue row lacks a promoted official-source decision.', 'row', id);
    }
  }

  const aiCounts = {
    accepted: 0,
    highRisk: 0,
    highRiskResearchGate: 0,
    targetScoped: 0,
    sourceScoped: 0,
    gateIds: 0,
    researchGate: 0,
    wrongLanguageGate: 0,
    cacheLanguageGate: 0,
    liveReturnGate: 0,
    languageGatesPassed: 0,
    notes: 0,
    rejectedReturnOpen: 0,
    rejectedCacheOpen: 0,
    targetOutputBeforeQualityOpen: 0,
    activationBlocked: 0,
    importOpen: 0,
    applyOpen: 0,
    activationOpen: 0,
  };

  for (const decision of aiDecisions) {
    const id = s(decision, 'contractId') || s(decision, 'aiQualityGateId') || String(decision.aiTemplateIndex ?? '');
    const gateIds = stringArray(decision.requiredGateIds);
    const isHighRisk = s(decision, 'riskLevel') === 'high';
    if (isHighRisk) aiCounts.highRisk += 1;
    if (s(decision, 'reviewerDecision') === 'accept_contract' && s(decision, 'reviewerName') === 'llm_official_source_reviewer') aiCounts.accepted += 1;
    else addFinding(findings, 'blocker', 'ai_decision_not_llm_official_source_accepted', 'AI prompt decision must be accepted by the LLM official-source reviewer.', 'ai', id);
    if (s(decision, 'studyTarget') === 'fr') aiCounts.targetScoped += 1;
    else addFinding(findings, 'blocker', 'ai_decision_wrong_target', 'AI prompt decision must stay scoped to studyTarget=fr.', 'ai', id);
    if (sameStringArray(stringArray(decision.sourceLocaleCoverage), ['ru', 'uk'])) aiCounts.sourceScoped += 1;
    else addFinding(findings, 'blocker', 'ai_decision_wrong_source_locale_coverage', 'AI prompt decision must cover only sourceLocale ru/uk.', 'ai', id);
    if (gateIds.length > 0) aiCounts.gateIds += 1;
    else addFinding(findings, 'blocker', 'ai_required_gate_ids_missing', 'AI prompt decision must include requiredGateIds.', 'ai', id);
    if (gateIds.includes('research_evidence_gate')) {
      aiCounts.researchGate += 1;
      if (isHighRisk) aiCounts.highRiskResearchGate += 1;
    } else if (isHighRisk) {
      addFinding(findings, 'blocker', 'ai_high_risk_research_gate_missing', 'High-risk AI prompt decision must include research_evidence_gate.', 'ai', id);
    }
    if (gateIds.includes('ai_wrong_language_gate')) aiCounts.wrongLanguageGate += 1;
    else addFinding(findings, 'blocker', 'ai_wrong_language_gate_missing', 'AI prompt decision must include ai_wrong_language_gate.', 'ai', id);
    if (gateIds.includes('ai_cache_language_key_gate')) aiCounts.cacheLanguageGate += 1;
    else addFinding(findings, 'blocker', 'ai_cache_language_gate_missing', 'AI prompt decision must include ai_cache_language_key_gate.', 'ai', id);
    if (gateIds.includes('reviewer_decision_gate')) aiCounts.liveReturnGate += 1;
    else addFinding(findings, 'blocker', 'ai_reviewer_decision_gate_missing', 'AI prompt decision must include reviewer_decision_gate.', 'ai', id);
    if (
      s(decision, 'wrongLanguageGateDecision') === 'pass' &&
      s(decision, 'cacheLanguageGateDecision') === 'pass' &&
      s(decision, 'liveReturnGateDecision') === 'pass'
    ) aiCounts.languageGatesPassed += 1;
    else addFinding(findings, 'blocker', 'ai_language_gate_not_passed', 'AI prompt wrong-language/cache/live-return gates must all pass.', 'ai', id);
    if (notesCiteOfficialSources(decision)) aiCounts.notes += 1;
    else addFinding(findings, 'blocker', 'ai_official_source_note_missing', 'AI prompt decision must cite official source refs in reviewerNotes.', 'ai', id);
    if (b(decision, 'rejectedFreshOutputMayReturn')) aiCounts.rejectedReturnOpen += 1;
    if (b(decision, 'rejectedFreshOutputMayBeCached')) aiCounts.rejectedCacheOpen += 1;
    if (b(decision, 'targetOutputAllowedBeforeQualityPass')) aiCounts.targetOutputBeforeQualityOpen += 1;
    if (s(decision, 'currentActivationStatus') === 'blocked') aiCounts.activationBlocked += 1;
    else addFinding(findings, 'blocker', 'ai_activation_not_blocked', 'AI prompt decision must remain activation-blocked.', 'ai', id);
    if (b(decision, 'reviewerImportAllowed')) aiCounts.importOpen += 1;
    if (b(decision, 'productionApplyAllowed')) aiCounts.applyOpen += 1;
    if (b(decision, 'activationApproved')) aiCounts.activationOpen += 1;
  }

  const evidenceContract = object(manifest.evidenceContract);
  const dryRunSummary = object(dryRun.summary);

  return {
    targetLocale: 'fr',
    sourceLocales: ['ru', 'uk'],
    legacyQueueRows: queueRows.length,
    uniqueLegacyQueueRows: queueById.size,
    rowDecisionRows: rowDecisions.length,
    aiDecisionRows: aiDecisions.length,
    rowIdentityMatched: rowDecisionCounts.matched,
    rowDuplicateDecisions: rowDecisionCounts.duplicates,
    rowIdentityMismatches: rowDecisionCounts.mismatches,
    rowPayloadMismatches: rowDecisions.length - rowDecisionCounts.payloadMatches,
    rowsTargetScoped: rowDecisionCounts.targetScoped,
    rowsSourceLocaleScoped: rowDecisionCounts.sourceScoped,
    rowsAcceptedByLlmOfficialSource: rowDecisionCounts.accepted,
    rowsWithResearchEvidenceIds: rowDecisionCounts.evidence,
    rowsWithRequiredGateIds: rowDecisionCounts.gateIds,
    rowsWithResearchGate: rowDecisionCounts.researchGate,
    rowsWithLanguageIsolationGate: rowDecisionCounts.languageGate,
    rowsWithReviewerDecisionGate: rowDecisionCounts.reviewerGate,
    rowsWithAllRequiredGatesPassed: rowDecisionCounts.gatesPassed,
    rowsWithOfficialSourceNotes: rowDecisionCounts.notes,
    rowActivationBlockedRows: rowDecisionCounts.activationBlocked,
    rowReviewerImportOpenFlags: rowDecisionCounts.importOpen,
    rowProductionApplyOpenFlags: rowDecisionCounts.applyOpen,
    rowActivationApprovedFlags: rowDecisionCounts.activationOpen,
    aiAcceptedByLlmOfficialSource: aiCounts.accepted,
    highRiskAiDecisionRows: aiCounts.highRisk,
    highRiskAiWithResearchGate: aiCounts.highRiskResearchGate,
    aiTargetScoped: aiCounts.targetScoped,
    aiSourceLocaleScoped: aiCounts.sourceScoped,
    aiWithRequiredGateIds: aiCounts.gateIds,
    aiWithResearchGate: aiCounts.researchGate,
    aiWithWrongLanguageGate: aiCounts.wrongLanguageGate,
    aiWithCacheLanguageGate: aiCounts.cacheLanguageGate,
    aiWithLiveReturnGate: aiCounts.liveReturnGate,
    aiLanguageGatesPassed: aiCounts.languageGatesPassed,
    aiWithOfficialSourceNotes: aiCounts.notes,
    aiRejectedFreshReturnOpenRows: aiCounts.rejectedReturnOpen,
    aiRejectedFreshCacheOpenRows: aiCounts.rejectedCacheOpen,
    aiTargetOutputBeforeQualityOpenRows: aiCounts.targetOutputBeforeQualityOpen,
    aiActivationBlockedRows: aiCounts.activationBlocked,
    aiReviewerImportOpenFlags: aiCounts.importOpen,
    aiProductionApplyOpenFlags: aiCounts.applyOpen,
    aiActivationApprovedFlags: aiCounts.activationOpen,
    manifestCountsMatch: n(manifest, 'acceptedRowDecisionRows') === rowDecisions.length && n(manifest, 'acceptedAiDecisionRows') === aiDecisions.length,
    manifestEvidenceContractPresent: stringArray(evidenceContract.trustedSourceIds).length > 0 && stringArray(evidenceContract.trustedSourceFamilies).length > 0,
    manifestTrustedSourceIds: stringArray(evidenceContract.trustedSourceIds).length,
    manifestTrustedSourceFamilies: stringArray(evidenceContract.trustedSourceFamilies).length,
    manifestResearchPackCheckedOnlineAtPresent: s(evidenceContract, 'researchPackCheckedOnlineAt') !== '',
    manifestClosedTransitions: closedTransitionsClosed(manifest),
    dryRunReady: dryRun.status === 'PASS' && b(dryRunSummary, 'readyForReviewerDecisionImportV2DryRun'),
    dryRunPromotedRowFileUsed: b(dryRunSummary, 'rowDecisionFilePromotedOfficialSourceUsed'),
    dryRunPromotedAiFileUsed: b(dryRunSummary, 'aiDecisionFilePromotedOfficialSourceUsed'),
    dryRunRows: n(dryRunSummary, 'rowDecisionRows'),
    dryRunAi: n(dryRunSummary, 'aiDecisionRows'),
    dryRunAcceptedRows: n(dryRunSummary, 'acceptedRowDecisionRows'),
    dryRunAcceptedAi: n(dryRunSummary, 'acceptedAiDecisionRows'),
    dryRunRowProbesPassed: n(dryRunSummary, 'rowFixtureProbesPassed'),
    dryRunRowProbes: n(dryRunSummary, 'rowFixtureProbes'),
    dryRunAiProbesPassed: n(dryRunSummary, 'aiFixtureProbesPassed'),
    dryRunAiProbes: n(dryRunSummary, 'aiFixtureProbes'),
    dryRunReadyForApply: b(dryRunSummary, 'readyForApply'),
    dryRunMayModifyProductionAppFiles: b(dryRunSummary, 'mayModifyProductionAppFiles'),
    readyForApply: false,
    mayModifyProductionAppFiles: false,
    activationApproved: false,
    serverUploadAllowed: false,
    firebaseUploadAllowed: false,
    runtimeDownloadsEnabled: false,
  };
}

function evaluateMetrics(metrics: Metrics): Finding[] {
  const findings: Finding[] = [];
  const expectedRows = 1600;
  const expectedAi = 164;
  const rowFields: Array<[keyof Metrics, string]> = [
    ['legacyQueueRows', 'legacy_queue_row_count_mismatch'],
    ['uniqueLegacyQueueRows', 'legacy_queue_unique_row_count_mismatch'],
    ['rowDecisionRows', 'row_decision_count_mismatch'],
    ['rowIdentityMatched', 'row_identity_match_count_mismatch'],
    ['rowsTargetScoped', 'row_target_scope_count_mismatch'],
    ['rowsSourceLocaleScoped', 'row_source_locale_scope_count_mismatch'],
    ['rowsAcceptedByLlmOfficialSource', 'row_llm_official_source_accept_count_mismatch'],
    ['rowsWithResearchEvidenceIds', 'row_research_evidence_count_mismatch'],
    ['rowsWithRequiredGateIds', 'row_required_gate_count_mismatch'],
    ['rowsWithResearchGate', 'row_research_gate_count_mismatch'],
    ['rowsWithLanguageIsolationGate', 'row_language_isolation_gate_count_mismatch'],
    ['rowsWithReviewerDecisionGate', 'row_reviewer_gate_count_mismatch'],
    ['rowsWithAllRequiredGatesPassed', 'row_gate_pass_count_mismatch'],
    ['rowsWithOfficialSourceNotes', 'row_official_source_note_count_mismatch'],
    ['rowActivationBlockedRows', 'row_activation_blocked_count_mismatch'],
  ];
  for (const [key, code] of rowFields) {
    if (metrics[key] !== expectedRows) addFinding(findings, 'blocker', code, `${String(key)} must be ${expectedRows}.`, 'row');
  }
  if (metrics.rowDuplicateDecisions !== 0) addFinding(findings, 'blocker', 'row_duplicate_decisions_present', 'Promoted row decisions must not duplicate identities.', 'row');
  if (metrics.rowIdentityMismatches !== 0) addFinding(findings, 'blocker', 'row_identity_mismatches_present', 'Every legacy row must match exactly one promoted decision.', 'row');
  if (metrics.rowPayloadMismatches !== 0) addFinding(findings, 'blocker', 'row_payload_mismatches_present', 'Promoted row decisions must preserve generated queue payload identity.', 'row');
  if (metrics.rowReviewerImportOpenFlags !== 0) addFinding(findings, 'blocker', 'row_reviewer_import_open', 'Bridge cannot open row reviewer import.', 'row');
  if (metrics.rowProductionApplyOpenFlags !== 0) addFinding(findings, 'blocker', 'row_production_apply_open', 'Bridge cannot open row production apply.', 'row');
  if (metrics.rowActivationApprovedFlags !== 0) addFinding(findings, 'blocker', 'row_activation_approved_open', 'Bridge cannot approve row activation.', 'row');

  const aiFields: Array<[keyof Metrics, string]> = [
    ['aiDecisionRows', 'ai_decision_count_mismatch'],
    ['aiAcceptedByLlmOfficialSource', 'ai_llm_official_source_accept_count_mismatch'],
    ['aiTargetScoped', 'ai_target_scope_count_mismatch'],
    ['aiSourceLocaleScoped', 'ai_source_locale_scope_count_mismatch'],
    ['aiWithRequiredGateIds', 'ai_required_gate_count_mismatch'],
    ['aiWithWrongLanguageGate', 'ai_wrong_language_gate_count_mismatch'],
    ['aiWithCacheLanguageGate', 'ai_cache_language_gate_count_mismatch'],
    ['aiWithLiveReturnGate', 'ai_live_return_gate_count_mismatch'],
    ['aiLanguageGatesPassed', 'ai_language_gate_pass_count_mismatch'],
    ['aiWithOfficialSourceNotes', 'ai_official_source_note_count_mismatch'],
    ['aiActivationBlockedRows', 'ai_activation_blocked_count_mismatch'],
  ];
  for (const [key, code] of aiFields) {
    if (metrics[key] !== expectedAi) addFinding(findings, 'blocker', code, `${String(key)} must be ${expectedAi}.`, 'ai');
  }
  if (metrics.highRiskAiDecisionRows <= 0) addFinding(findings, 'blocker', 'high_risk_ai_decision_count_zero', 'Bridge must observe high-risk AI prompt decisions.', 'ai');
  if (metrics.highRiskAiWithResearchGate !== metrics.highRiskAiDecisionRows) {
    addFinding(findings, 'blocker', 'high_risk_ai_research_gate_count_mismatch', 'Every high-risk AI prompt decision must include research_evidence_gate.', 'ai');
  }
  if (metrics.aiRejectedFreshReturnOpenRows !== 0) addFinding(findings, 'blocker', 'ai_rejected_fresh_return_open', 'Rejected fresh AI text must not be returnable.', 'ai');
  if (metrics.aiRejectedFreshCacheOpenRows !== 0) addFinding(findings, 'blocker', 'ai_rejected_fresh_cache_open', 'Rejected fresh AI text must not be cacheable.', 'ai');
  if (metrics.aiTargetOutputBeforeQualityOpenRows !== 0) addFinding(findings, 'blocker', 'ai_target_output_before_quality_open', 'AI target output must not be allowed before quality pass.', 'ai');
  if (metrics.aiReviewerImportOpenFlags !== 0) addFinding(findings, 'blocker', 'ai_reviewer_import_open', 'Bridge cannot open AI reviewer import.', 'ai');
  if (metrics.aiProductionApplyOpenFlags !== 0) addFinding(findings, 'blocker', 'ai_production_apply_open', 'Bridge cannot open AI production apply.', 'ai');
  if (metrics.aiActivationApprovedFlags !== 0) addFinding(findings, 'blocker', 'ai_activation_approved_open', 'Bridge cannot approve AI activation.', 'ai');

  if (!metrics.manifestCountsMatch) addFinding(findings, 'blocker', 'promoted_manifest_count_mismatch', 'Promoted decision manifest counts must match actual promoted decision files.', 'manifest');
  if (!metrics.manifestEvidenceContractPresent) addFinding(findings, 'blocker', 'promoted_manifest_evidence_contract_missing', 'Promoted decision manifest must carry trusted source evidence contract.', 'manifest');
  if (metrics.manifestTrustedSourceIds < 10) addFinding(findings, 'blocker', 'promoted_manifest_trusted_source_ids_low', 'Promoted decision manifest must carry at least 10 trusted source ids.', 'manifest');
  if (metrics.manifestTrustedSourceFamilies < 9) addFinding(findings, 'blocker', 'promoted_manifest_trusted_source_families_low', 'Promoted decision manifest must carry at least 9 trusted source families.', 'manifest');
  if (!metrics.manifestResearchPackCheckedOnlineAtPresent) addFinding(findings, 'blocker', 'research_pack_checked_online_at_missing', 'Promoted decision manifest must preserve researchPackCheckedOnlineAt.', 'manifest');
  if (!metrics.manifestClosedTransitions) addFinding(findings, 'blocker', 'promoted_manifest_closed_transition_open', 'Promoted decision generation must keep import/apply/upload/runtime/activation transitions closed.', 'manifest');

  if (!metrics.dryRunReady) addFinding(findings, 'blocker', 'official_source_import_dry_run_not_ready', 'Reviewer import dry-run must be ready and PASS.', 'dry_run');
  if (!metrics.dryRunPromotedRowFileUsed || !metrics.dryRunPromotedAiFileUsed) addFinding(findings, 'blocker', 'official_source_import_dry_run_not_using_promoted_files', 'Reviewer import dry-run must use promoted official-source row and AI files.', 'dry_run');
  if (metrics.dryRunRows !== expectedRows || metrics.dryRunAcceptedRows !== expectedRows) addFinding(findings, 'blocker', 'official_source_import_dry_run_row_count_mismatch', 'Reviewer import dry-run must cover and accept 1600 rows.', 'dry_run');
  if (metrics.dryRunAi !== expectedAi || metrics.dryRunAcceptedAi !== expectedAi) addFinding(findings, 'blocker', 'official_source_import_dry_run_ai_count_mismatch', 'Reviewer import dry-run must cover and accept 164 AI decisions.', 'dry_run');
  if (metrics.dryRunRowProbes <= 0 || metrics.dryRunRowProbesPassed !== metrics.dryRunRowProbes) addFinding(findings, 'blocker', 'official_source_import_dry_run_row_probes_failed', 'Reviewer import dry-run row probes must all pass.', 'dry_run');
  if (metrics.dryRunAiProbes <= 0 || metrics.dryRunAiProbesPassed !== metrics.dryRunAiProbes) addFinding(findings, 'blocker', 'official_source_import_dry_run_ai_probes_failed', 'Reviewer import dry-run AI probes must all pass.', 'dry_run');
  if (metrics.dryRunReadyForApply || metrics.dryRunMayModifyProductionAppFiles) addFinding(findings, 'blocker', 'official_source_import_dry_run_apply_open', 'Reviewer import dry-run must not open apply or production file writes.', 'dry_run');

  return findings;
}

function runProbes(base: Metrics): Probe[] {
  const cases: Array<{ id: string; expectedAccept: boolean; mutate: (metrics: Metrics) => void }> = [
    { id: 'canonical_bridge_accepted', expectedAccept: true, mutate: () => undefined },
    { id: 'missing_legacy_row_rejected', expectedAccept: false, mutate: (metrics) => { metrics.legacyQueueRows -= 1; } },
    { id: 'missing_promoted_row_decision_rejected', expectedAccept: false, mutate: (metrics) => { metrics.rowDecisionRows -= 1; metrics.rowIdentityMatched -= 1; } },
    { id: 'missing_row_research_evidence_rejected', expectedAccept: false, mutate: (metrics) => { metrics.rowsWithResearchEvidenceIds -= 1; } },
    { id: 'row_language_gate_gap_rejected', expectedAccept: false, mutate: (metrics) => { metrics.rowsWithLanguageIsolationGate -= 1; } },
    { id: 'row_import_open_rejected', expectedAccept: false, mutate: (metrics) => { metrics.rowReviewerImportOpenFlags = 1; } },
    { id: 'missing_ai_decision_rejected', expectedAccept: false, mutate: (metrics) => { metrics.aiDecisionRows -= 1; metrics.aiAcceptedByLlmOfficialSource -= 1; } },
    { id: 'ai_cache_language_gate_gap_rejected', expectedAccept: false, mutate: (metrics) => { metrics.aiWithCacheLanguageGate -= 1; } },
    { id: 'high_risk_ai_research_gate_gap_rejected', expectedAccept: false, mutate: (metrics) => { metrics.highRiskAiWithResearchGate -= 1; } },
    { id: 'ai_rejected_fresh_return_open_rejected', expectedAccept: false, mutate: (metrics) => { metrics.aiRejectedFreshReturnOpenRows = 1; } },
    { id: 'manifest_closed_transition_open_rejected', expectedAccept: false, mutate: (metrics) => { metrics.manifestClosedTransitions = false; } },
    { id: 'dry_run_not_using_promoted_files_rejected', expectedAccept: false, mutate: (metrics) => { metrics.dryRunPromotedRowFileUsed = false; } },
  ];

  return cases.map((test) => {
    const fixture = JSON.parse(JSON.stringify(base)) as Metrics;
    test.mutate(fixture);
    const findings = evaluateMetrics(fixture);
    const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
    const accepted = blockers === 0;
    return {
      id: test.id,
      expectedAccept: test.expectedAccept,
      accepted,
      blockers,
      passed: accepted === test.expectedAccept,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Legacy Generated Research Evidence Bridge V2',
    '',
    `- Status: ${report.status}`,
    `- Bridge state: ${report.summary.bridgeState}`,
    `- Legacy/promoted rows: ${report.summary.legacyQueueRows}/${report.summary.rowDecisionRows}`,
    `- Row identity matches: ${report.summary.rowIdentityMatched}`,
    `- Rows with research evidence/gates passed: ${report.summary.rowsWithResearchEvidenceIds}/${report.summary.rowsWithAllRequiredGatesPassed}`,
    `- AI decisions accepted/language gates passed: ${report.summary.aiAcceptedByLlmOfficialSource}/${report.summary.aiLanguageGatesPassed}`,
    `- Official-source dry run rows/AI accepted: ${report.summary.dryRunAcceptedRows}/${report.summary.dryRunAcceptedAi}`,
    `- Production apply: ${report.summary.readyForApply ? 'open' : 'closed'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    '',
    '## Findings',
    '',
    ...(report.findings.length === 0
      ? ['- none']
      : report.findings.map((finding) => `- ${finding.severity}: ${finding.code} - ${finding.message}${finding.identity ? ` (${finding.identity})` : ''}`)),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? path.join('docs', 'gustav', 'runs', '2026-05-19_fr_inventory_v0a1');
  const target = argValue('--target') ?? 'fr';
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  const promotedDir = path.join(reviewerDir, 'llm_official_source_promoted_decisions_v2');
  const queuePath = path.join(reviewerDir, 'french_reviewer_queue.jsonl');
  const rowDecisionsPath = path.join(promotedDir, 'row_decisions_reviewed_v2.jsonl');
  const aiDecisionsPath = path.join(promotedDir, 'ai_decisions_reviewed_v2.jsonl');
  const manifestPath = path.join(promotedDir, 'llm_official_source_promoted_decision_file_generation_manifest_v2.json');
  const dryRunPath = path.join(auditsDir, 'reviewer_decision_import_v2_dry_run.json');
  const outputJsonPath = path.join(auditsDir, 'legacy_generated_research_evidence_bridge_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'legacy_generated_research_evidence_bridge_v2_packet.md');

  const findings: Finding[] = [];
  if (target !== 'fr') addFinding(findings, 'blocker', 'target_locale_not_fr', 'This bridge is scoped only to studyTarget=fr.', 'contract');
  const queueRows = readJsonl(queuePath);
  const rowDecisions = readJsonl(rowDecisionsPath);
  const aiDecisions = readJsonl(aiDecisionsPath);
  const manifest = readJsonOrEmpty(manifestPath);
  const dryRun = readJsonOrEmpty(dryRunPath);
  const metrics = inspectArtifacts(queueRows, rowDecisions, aiDecisions, manifest, dryRun, findings);
  findings.push(...evaluateMetrics(metrics));
  const probes = runProbes(metrics);
  const failedProbes = probes.filter((probe) => !probe.passed).length;
  if (failedProbes > 0) addFinding(findings, 'blocker', 'fixture_probes_failed', `${failedProbes} fixture probe(s) failed.`, 'contract');
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;

  const report: Report = {
    schemaVersion: 'gustav-legacy-generated-research-evidence-bridge-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' : 'BLOCK',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      legacyQueue: rel(repoRoot, queuePath),
      rowDecisions: rel(repoRoot, rowDecisionsPath),
      aiDecisions: rel(repoRoot, aiDecisionsPath),
      promotedManifest: rel(repoRoot, manifestPath),
      reviewerDecisionImportDryRun: rel(repoRoot, dryRunPath),
    },
    outputs: {
      reportJson: rel(repoRoot, outputJsonPath),
      reportMarkdown: rel(repoRoot, outputMdPath),
    },
    summary: {
      ...metrics,
      bridgeState: blockers === 0 ? 'legacy_generated_research_evidence_bridge_ready_no_writes' : 'blocked_by_findings',
      blockers,
      warnings,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    bridgeContract: {
      dryRunOnly: true,
      writesGeneratedLedgers: false,
      importsReviewerDecisions: false,
      createsPayloads: false,
      opensProductionApply: false,
      requiresLegacyRowsCoveredByPromotedOfficialSourceDecisions: true,
      requiresAiPromptDecisionsCoveredByPromotedOfficialSourceDecisions: true,
      requiresResearchEvidenceIds: true,
      requiresRequiredGateIds: true,
      requiresLanguageIsolationGates: true,
    },
    findings,
    probes,
    nextRequiredActions: blockers === 0
      ? [
          'Keep this bridge as no-write evidence until explicit approval creates active approval artifacts.',
          'Use the bridge summary in the master manifest so legacy missing-research counters cannot obscure promoted official-source coverage.',
        ]
      : [
          'Fix every bridge blocker before treating legacy generated rows as officially source-backed.',
          'Do not import reviewer decisions, create payloads, upload server packs, or enable runtime downloads from this packet.',
        ],
  };

  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV legacy generated research evidence bridge V2 packet: ${report.status}`);
  console.log(`Bridge state: ${report.summary.bridgeState}`);
  console.log(`Legacy/promoted rows: ${report.summary.legacyQueueRows}/${report.summary.rowDecisionRows}`);
  console.log(`AI decisions: ${report.summary.aiDecisionRows}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (report.status === 'BLOCK') process.exitCode = 1;
}

main();
