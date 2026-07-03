import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type JsonObject = Record<string, unknown>;

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  expectedSafe: boolean;
  safe: boolean;
  blockers: number;
  passed: boolean;
};

type SafetyInput = {
  p33Ready: boolean;
  p33NextSafeItemIsNp01: boolean;
  intakePass: boolean;
  promotedPass: boolean;
  languageIsolationPass: boolean;
  runValidatorPass: boolean;
  brainGatePass: boolean;
  countsMatch: boolean;
  coverageComplete: boolean;
  officialSourcesPresent: boolean;
  noLegacyReviewResidue: boolean;
  noNonLlmReviewDependency: boolean;
  outputConfined: boolean;
  reviewerImportAllowed: boolean;
  reviewerDecisionsImported: boolean;
  generatedLedgerWritesAllowed: boolean;
  payloadCreationAllowed: boolean;
  serverUploadAllowed: boolean;
  firebaseUploadAllowed: boolean;
  runtimeDownloadsEnabled: boolean;
  activationApproved: boolean;
  readyForApply: boolean;
  mayModifyProductionAppFiles: boolean;
};

type Report = {
  schemaVersion: 'gustav-nonproduction-evidence-refresh-v2-packet-v0';
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
  summary: {
    targetLocale: 'fr';
    sourceLocales: ['ru', 'uk'];
    refreshState: 'llm_official_source_evidence_fresh' | 'blocked_by_findings';
    p33Ready: boolean;
    p33RecommendedNextSafeItem: string;
    intakeStatus: string;
    intakeState: string;
    promotedStatus: string;
    promotedState: string;
    rowDecisionRows: number;
    aiDecisionRows: number;
    llmReviewedRowDecisionRows: number;
    llmReviewedAiDecisionRows: number;
    acceptedRowDecisionRows: number;
    acceptedAiDecisionRows: number;
    rowCoveragePct: number;
    aiCoveragePct: number;
    sourceFamilies: number;
    requiredSourceFamiliesPresent: number;
    minimumTrustedSourceFamilies: number;
    cambridgeSourceFamilyPresent: boolean;
    frenchAuthoritySourceFamilyPresent: boolean;
    grammarReferenceSourceFamilyPresent: boolean;
    noNonLlmReviewDependency: boolean;
    legacyReviewResidueMatches: number;
    outputTargetsConfinedToPromotedDir: boolean;
    reviewerTemplatesOverwritten: boolean;
    reviewerDecisionsImported: boolean;
    generatedLedgerWritesAllowed: boolean;
    payloadCreationAllowed: boolean;
    serverUploadAllowed: boolean;
    firebaseUploadAllowed: boolean;
    runtimeDownloadsEnabled: boolean;
    activationApproved: boolean;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
    languageIsolationPass: boolean;
    runValidatorPass: boolean;
    brainGateDecision: string;
    brainGateReadinessPercent: number;
    readyForNextNonProductionManifestRecheck: boolean;
    fixtureProbesPassed: number;
    fixtureProbes: number;
    blockers: number;
    warnings: number;
  };
  legacyReviewResidue: Array<{ path: string; pattern: string }>;
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    approvalReceiptCreatedByThisScript: false;
    activeHashLockCreatedByThisScript: false;
    serverManifestPublishedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    storageOrCloudMigrationStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

const REQUIRED_ROWS = 1600;
const REQUIRED_AI = 178;

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
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
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

function summaryOf(report: JsonObject): JsonObject {
  return object(report.summary);
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function latestBrainGateReport(repoRoot: string): { relativePath: string; report: JsonObject } {
  const docsDir = path.join(repoRoot, 'docs', 'gustav');
  if (!fs.existsSync(docsDir)) return { relativePath: '', report: {} };
  const entries = fs.readdirSync(docsDir)
    .filter((name) => /^GUSTAV_BRAIN_GATE_REPORT_.*\.json$/.test(name))
    .map((name) => {
      const filePath = path.join(docsDir, name);
      return { filePath, mtimeMs: fs.statSync(filePath).mtimeMs };
    })
    .sort((a, bEntry) => bEntry.mtimeMs - a.mtimeMs);
  if (entries.length === 0) return { relativePath: '', report: {} };
  return {
    relativePath: rel(repoRoot, entries[0].filePath),
    report: readJson<JsonObject>(entries[0].filePath),
  };
}

function findLegacyReviewResidue(repoRoot: string, files: string[]): Array<{ path: string; pattern: string }> {
  const patterns = [
    `human${' '}review`,
    `human${'_'}review`,
    `manual${' '}review`,
    `manual${'_'}review`,
    `manual${'Reviewer'}`,
    `Manual${'Review'}`,
    `rows_need_${'human'}_review`,
    `reviewer${'NameRequired'}`,
    `reviewed${'AtRequired'}`,
  ];
  const matches: Array<{ path: string; pattern: string }> = [];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const lower = text.toLowerCase();
    for (const pattern of patterns) {
      const found = pattern === pattern.toLowerCase()
        ? lower.includes(pattern)
        : text.includes(pattern);
      if (found) matches.push({ path: rel(repoRoot, file), pattern });
    }
  }
  return matches;
}

function evaluateSafety(input: SafetyInput): Finding[] {
  const findings: Finding[] = [];
  if (!input.p33Ready) addFinding(findings, 'blocker', 'P33_NOT_READY', 'P33 non-production closure plan must be ready before P34.');
  if (!input.p33NextSafeItemIsNp01) addFinding(findings, 'blocker', 'P33_NEXT_SAFE_ITEM_NOT_NP01', 'P34 must only run when P33 recommends NP-01.');
  if (!input.intakePass) addFinding(findings, 'blocker', 'LLM_INTAKE_NOT_PASSING', 'LLM official-source intake must be PASS with zero blockers.');
  if (!input.promotedPass) addFinding(findings, 'blocker', 'PROMOTED_DECISION_GENERATION_NOT_PASSING', 'Promoted decision file generation must be PASS with zero blockers.');
  if (!input.languageIsolationPass) addFinding(findings, 'blocker', 'LANGUAGE_ISOLATION_NOT_PASSING', 'French language isolation must pass.');
  if (!input.runValidatorPass) addFinding(findings, 'blocker', 'RUN_VALIDATOR_NOT_PASSING', 'Run validator must pass.');
  if (!input.brainGatePass) addFinding(findings, 'blocker', 'BRAIN_GATE_NOT_PASSING', 'Latest Gustav brain gate must pass.');
  if (!input.countsMatch) addFinding(findings, 'blocker', 'LLM_COUNTS_MISMATCH', `Expected ${REQUIRED_ROWS} row decisions and ${REQUIRED_AI} AI decisions through review/promotion.`);
  if (!input.coverageComplete) addFinding(findings, 'blocker', 'LLM_COVERAGE_INCOMPLETE', 'LLM review and accepted coverage must be 100%.');
  if (!input.officialSourcesPresent) addFinding(findings, 'blocker', 'OFFICIAL_SOURCE_COVERAGE_INCOMPLETE', 'Required official/trusted source families are not complete.');
  if (!input.noLegacyReviewResidue) addFinding(findings, 'blocker', 'LEGACY_REVIEW_RESIDUE_PRESENT', 'Legacy non-LLM review residue remains in P34 scoped artifacts.');
  if (!input.noNonLlmReviewDependency) addFinding(findings, 'blocker', 'NON_LLM_REVIEW_DEPENDENCY_PRESENT', 'Non-LLM review dependency must not be required.');
  if (!input.outputConfined) addFinding(findings, 'blocker', 'PROMOTED_OUTPUT_NOT_CONFINED', 'Promoted decision outputs must stay confined to promoted reviewer directory.');
  if (
    input.reviewerImportAllowed ||
    input.reviewerDecisionsImported ||
    input.generatedLedgerWritesAllowed ||
    input.payloadCreationAllowed ||
    input.serverUploadAllowed ||
    input.firebaseUploadAllowed ||
    input.runtimeDownloadsEnabled ||
    input.activationApproved ||
    input.readyForApply ||
    input.mayModifyProductionAppFiles
  ) {
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_OR_IMPORT_FLAG_OPEN', 'P34 must not open import, ledger writes, payload creation, upload, downloads, activation, apply or production file writes.');
  }
  return findings;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runProbes(base: SafetyInput): Probe[] {
  const tests: Array<{ id: string; expectedSafe: boolean; mutate: (input: SafetyInput) => void }> = [
    { id: 'current_refresh_is_safe', expectedSafe: true, mutate: () => undefined },
    { id: 'p33_missing_rejected', expectedSafe: false, mutate: (input) => { input.p33Ready = false; } },
    { id: 'wrong_next_safe_item_rejected', expectedSafe: false, mutate: (input) => { input.p33NextSafeItemIsNp01 = false; } },
    { id: 'coverage_incomplete_rejected', expectedSafe: false, mutate: (input) => { input.coverageComplete = false; } },
    { id: 'legacy_review_residue_rejected', expectedSafe: false, mutate: (input) => { input.noLegacyReviewResidue = false; } },
    { id: 'non_llm_review_dependency_rejected', expectedSafe: false, mutate: (input) => { input.noNonLlmReviewDependency = false; } },
    { id: 'reviewer_import_allowed_rejected', expectedSafe: false, mutate: (input) => { input.reviewerImportAllowed = true; } },
    { id: 'generated_ledger_writes_rejected', expectedSafe: false, mutate: (input) => { input.generatedLedgerWritesAllowed = true; } },
    { id: 'server_upload_rejected', expectedSafe: false, mutate: (input) => { input.serverUploadAllowed = true; } },
    { id: 'runtime_downloads_rejected', expectedSafe: false, mutate: (input) => { input.runtimeDownloadsEnabled = true; } },
    { id: 'activation_approved_rejected', expectedSafe: false, mutate: (input) => { input.activationApproved = true; } },
    { id: 'ready_for_apply_rejected', expectedSafe: false, mutate: (input) => { input.readyForApply = true; } },
  ];
  return tests.map((test) => {
    const fixture = clone(base);
    test.mutate(fixture);
    const blockers = evaluateSafety(fixture).filter((finding) => finding.severity === 'blocker').length;
    const safe = blockers === 0;
    return {
      id: test.id,
      expectedSafe: test.expectedSafe,
      safe,
      blockers,
      passed: safe === test.expectedSafe,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Non-Production Evidence Refresh V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Refresh state: ${report.summary.refreshState}`,
    `- P33 ready: ${report.summary.p33Ready ? 'yes' : 'no'}`,
    `- P33 recommended next safe item: ${report.summary.p33RecommendedNextSafeItem}`,
    `- Intake: ${report.summary.intakeStatus} / ${report.summary.intakeState}`,
    `- Promoted decision generation: ${report.summary.promotedStatus} / ${report.summary.promotedState}`,
    `- Row decisions reviewed/accepted: ${report.summary.llmReviewedRowDecisionRows}/${report.summary.acceptedRowDecisionRows}/${report.summary.rowDecisionRows}`,
    `- AI decisions reviewed/accepted: ${report.summary.llmReviewedAiDecisionRows}/${report.summary.acceptedAiDecisionRows}/${report.summary.aiDecisionRows}`,
    `- Coverage row/AI: ${report.summary.rowCoveragePct}%/${report.summary.aiCoveragePct}%`,
    `- Source families present/minimum: ${report.summary.requiredSourceFamiliesPresent}/${report.summary.minimumTrustedSourceFamilies}`,
    `- Cambridge/French authority/grammar sources: ${report.summary.cambridgeSourceFamilyPresent ? 'yes' : 'no'}/${report.summary.frenchAuthoritySourceFamilyPresent ? 'yes' : 'no'}/${report.summary.grammarReferenceSourceFamilyPresent ? 'yes' : 'no'}`,
    `- Non-LLM review dependency: ${report.summary.noNonLlmReviewDependency ? 'no' : 'yes'}`,
    `- Legacy review residue matches: ${report.summary.legacyReviewResidueMatches}`,
    `- Output confined to promoted dir: ${report.summary.outputTargetsConfinedToPromotedDir ? 'yes' : 'no'}`,
    `- Reviewer decisions imported: ${report.summary.reviewerDecisionsImported ? 'yes' : 'no'}`,
    `- Generated ledger writes allowed: ${report.summary.generatedLedgerWritesAllowed ? 'yes' : 'no'}`,
    `- Payload creation allowed: ${report.summary.payloadCreationAllowed ? 'yes' : 'no'}`,
    `- Server/Firebase upload allowed: ${report.summary.serverUploadAllowed ? 'yes' : 'no'}/${report.summary.firebaseUploadAllowed ? 'yes' : 'no'}`,
    `- Runtime downloads/activation: ${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}/${report.summary.activationApproved ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Language isolation/run validator: ${report.summary.languageIsolationPass ? 'PASS' : 'BLOCK'}/${report.summary.runValidatorPass ? 'PASS' : 'BLOCK'}`,
    `- Brain gate: ${report.summary.brainGateDecision} (${report.summary.brainGateReadinessPercent}%)`,
    `- Ready for next non-production manifest recheck: ${report.summary.readyForNextNonProductionManifestRecheck ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Legacy Review Residue',
    '',
  ];
  if (report.legacyReviewResidue.length === 0) lines.push('- none');
  else for (const hit of report.legacyReviewResidue) lines.push(`- ${hit.pattern}: \`${hit.path}\``);

  lines.push('', '## Findings', '');
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);

  lines.push(
    '',
    '## Safety',
    '',
    '- This packet is audit-only.',
    '- It does not import reviewer decisions, write generated ledgers, create payloads, publish server manifests, enable runtime downloads or approve production apply.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);

  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');

  const p33Path = path.join(auditsDir, 'nonproduction_blocker_closure_plan_v2_packet.json');
  const intakePath = path.join(auditsDir, 'llm_official_source_review_intake_v2_packet.json');
  const intakeMdPath = path.join(auditsDir, 'llm_official_source_review_intake_v2_packet.md');
  const promotedPath = path.join(auditsDir, 'llm_official_source_promoted_decision_file_generation_v2_packet.json');
  const promotedMdPath = path.join(auditsDir, 'llm_official_source_promoted_decision_file_generation_v2_packet.md');
  const languagePath = path.join(auditsDir, 'french_language_isolation_audit.json');
  const validatorPath = path.join(auditsDir, 'run_validator_report.json');
  const intakeScriptPath = path.join(repoRoot, 'scripts', 'gustav_llm_official_source_review_intake_v2_packet.ts');
  const promotedScriptPath = path.join(repoRoot, 'scripts', 'gustav_llm_official_source_promoted_decision_file_generation_v2_packet.ts');
  const outputJsonPath = path.join(auditsDir, 'nonproduction_evidence_refresh_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'nonproduction_evidence_refresh_v2_packet.md');

  const p33 = fs.existsSync(p33Path) ? readJson<JsonObject>(p33Path) : {};
  const intake = fs.existsSync(intakePath) ? readJson<JsonObject>(intakePath) : {};
  const promoted = fs.existsSync(promotedPath) ? readJson<JsonObject>(promotedPath) : {};
  const language = fs.existsSync(languagePath) ? readJson<JsonObject>(languagePath) : {};
  const validator = fs.existsSync(validatorPath) ? readJson<JsonObject>(validatorPath) : {};
  const latestBrain = latestBrainGateReport(repoRoot);

  const p33Summary = summaryOf(p33);
  const intakeSummary = summaryOf(intake);
  const promotedSummary = summaryOf(promoted);
  const languageSummary = summaryOf(language);
  const validatorSummary = summaryOf(validator);
  const legacyReviewResidue = findLegacyReviewResidue(repoRoot, [
    intakeScriptPath,
    promotedScriptPath,
    intakePath,
    intakeMdPath,
    promotedPath,
    promotedMdPath,
  ]);

  const countsMatch =
    n(intakeSummary, 'rowDecisionRows') === REQUIRED_ROWS &&
    n(intakeSummary, 'aiDecisionRows') === REQUIRED_AI &&
    n(intakeSummary, 'llmReviewedRowDecisionRows') === REQUIRED_ROWS &&
    n(intakeSummary, 'llmReviewedAiDecisionRows') === REQUIRED_AI &&
    n(intakeSummary, 'llmAcceptedRowDecisionRows') === REQUIRED_ROWS &&
    n(intakeSummary, 'llmAcceptedAiDecisionRows') === REQUIRED_AI &&
    n(promotedSummary, 'acceptedRowDecisionRows') === REQUIRED_ROWS &&
    n(promotedSummary, 'acceptedAiDecisionRows') === REQUIRED_AI;
  const coverageComplete =
    n(intakeSummary, 'rowLlmReviewCoveragePct') === 100 &&
    n(intakeSummary, 'aiLlmReviewCoveragePct') === 100 &&
    n(intakeSummary, 'rowLlmAcceptedCoveragePct') === 100 &&
    n(intakeSummary, 'aiLlmAcceptedCoveragePct') === 100;
  const officialSourcesPresent =
    n(intakeSummary, 'requiredTrustedSourceFamiliesPresent') >= n(intakeSummary, 'minimumTrustedSourceFamilies') &&
    b(intakeSummary, 'cambridgeSourceFamilyPresent') &&
    b(intakeSummary, 'frenchAuthoritySourceFamilyPresent') &&
    b(intakeSummary, 'grammarReferenceSourceFamilyPresent');
  const noNonLlmReviewDependency =
    !b(intakeSummary, 'nonLlmReviewDependencyRequired') &&
    !b(promotedSummary, 'nonLlmReviewDependencyRequired');
  const outputConfined =
    b(promotedSummary, 'outputTargetsConfinedToPromotedDir') &&
    !b(promotedSummary, 'reviewerTemplatesOverwritten');
  const languageIsolationPass = s(language, 'status') === 'PASS' && n(languageSummary, 'blockers') === 0 && n(languageSummary, 'warnings') === 0;
  const runValidatorPass = s(validator, 'status') === 'PASS' && n(validatorSummary, 'blockers') === 0;
  const brainGateDecision = s(latestBrain.report, 'decision');
  const brainGatePass = brainGateDecision === 'PASS' && !b(latestBrain.report, 'generationBlocked');
  const p33Ready =
    s(p33, 'status') === 'PASS' &&
    n(p33Summary, 'blockers') === 0 &&
    b(p33Summary, 'readyForNextNonProductionPass') &&
    s(p33Summary, 'planState') === 'nonproduction_closure_plan_ready';
  const p33RecommendedNextSafeItem = s(p33Summary, 'recommendedNextSafeItem');

  const safetyInput: SafetyInput = {
    p33Ready,
    p33NextSafeItemIsNp01: p33RecommendedNextSafeItem === 'NP-01-LLM-OFFICIAL-SOURCE-EVIDENCE-FRESHNESS',
    intakePass: s(intake, 'status') === 'PASS' && n(intakeSummary, 'blockers') === 0,
    promotedPass: s(promoted, 'status') === 'PASS' && n(promotedSummary, 'blockers') === 0,
    languageIsolationPass,
    runValidatorPass,
    brainGatePass,
    countsMatch,
    coverageComplete,
    officialSourcesPresent,
    noLegacyReviewResidue: legacyReviewResidue.length === 0,
    noNonLlmReviewDependency,
    outputConfined,
    reviewerImportAllowed: b(intakeSummary, 'reviewerDecisionImportAllowedNow'),
    reviewerDecisionsImported: b(promotedSummary, 'reviewerDecisionsImported'),
    generatedLedgerWritesAllowed: b(intakeSummary, 'generatedLedgerWritesAllowed') || b(promotedSummary, 'generatedLedgerWritesAllowed'),
    payloadCreationAllowed: b(intakeSummary, 'payloadCreationAllowed') || b(promotedSummary, 'payloadCreationAllowed'),
    serverUploadAllowed: b(intakeSummary, 'serverUploadAllowed') || b(promotedSummary, 'serverUploadAllowed'),
    firebaseUploadAllowed: b(intakeSummary, 'firebaseUploadAllowed') || b(promotedSummary, 'firebaseUploadAllowed'),
    runtimeDownloadsEnabled: b(intakeSummary, 'runtimeDownloadsEnabled') || b(promotedSummary, 'runtimeDownloadsEnabled'),
    activationApproved: b(intakeSummary, 'activationApproved') || b(promotedSummary, 'activationApproved'),
    readyForApply: b(intakeSummary, 'readyForApply') || b(promotedSummary, 'readyForApply'),
    mayModifyProductionAppFiles: b(intakeSummary, 'mayModifyProductionAppFiles') || b(promotedSummary, 'mayModifyProductionAppFiles'),
  };

  const findings = evaluateSafety(safetyInput);
  const probes = runProbes(safetyInput);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;

  const report: Report = {
    schemaVersion: 'gustav-nonproduction-evidence-refresh-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      nonproductionBlockerClosurePlanV2Packet: rel(repoRoot, p33Path),
      llmOfficialSourceReviewIntakeV2Packet: rel(repoRoot, intakePath),
      llmOfficialSourcePromotedDecisionFileGenerationV2Packet: rel(repoRoot, promotedPath),
      frenchLanguageIsolationAudit: rel(repoRoot, languagePath),
      runValidatorReport: rel(repoRoot, validatorPath),
      latestBrainGateReport: latestBrain.relativePath,
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
    },
    summary: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      refreshState: blockers > 0 ? 'blocked_by_findings' : 'llm_official_source_evidence_fresh',
      p33Ready,
      p33RecommendedNextSafeItem,
      intakeStatus: s(intake, 'status'),
      intakeState: s(intakeSummary, 'intakeState'),
      promotedStatus: s(promoted, 'status'),
      promotedState: s(promotedSummary, 'generationState'),
      rowDecisionRows: n(intakeSummary, 'rowDecisionRows'),
      aiDecisionRows: n(intakeSummary, 'aiDecisionRows'),
      llmReviewedRowDecisionRows: n(intakeSummary, 'llmReviewedRowDecisionRows'),
      llmReviewedAiDecisionRows: n(intakeSummary, 'llmReviewedAiDecisionRows'),
      acceptedRowDecisionRows: n(promotedSummary, 'acceptedRowDecisionRows'),
      acceptedAiDecisionRows: n(promotedSummary, 'acceptedAiDecisionRows'),
      rowCoveragePct: n(intakeSummary, 'rowLlmReviewCoveragePct'),
      aiCoveragePct: n(intakeSummary, 'aiLlmReviewCoveragePct'),
      sourceFamilies: n(intakeSummary, 'trustedSourceFamilyCount'),
      requiredSourceFamiliesPresent: n(intakeSummary, 'requiredTrustedSourceFamiliesPresent'),
      minimumTrustedSourceFamilies: n(intakeSummary, 'minimumTrustedSourceFamilies'),
      cambridgeSourceFamilyPresent: b(intakeSummary, 'cambridgeSourceFamilyPresent'),
      frenchAuthoritySourceFamilyPresent: b(intakeSummary, 'frenchAuthoritySourceFamilyPresent'),
      grammarReferenceSourceFamilyPresent: b(intakeSummary, 'grammarReferenceSourceFamilyPresent'),
      noNonLlmReviewDependency,
      legacyReviewResidueMatches: legacyReviewResidue.length,
      outputTargetsConfinedToPromotedDir: b(promotedSummary, 'outputTargetsConfinedToPromotedDir'),
      reviewerTemplatesOverwritten: b(promotedSummary, 'reviewerTemplatesOverwritten'),
      reviewerDecisionsImported: b(promotedSummary, 'reviewerDecisionsImported'),
      generatedLedgerWritesAllowed: safetyInput.generatedLedgerWritesAllowed,
      payloadCreationAllowed: safetyInput.payloadCreationAllowed,
      serverUploadAllowed: safetyInput.serverUploadAllowed,
      firebaseUploadAllowed: safetyInput.firebaseUploadAllowed,
      runtimeDownloadsEnabled: safetyInput.runtimeDownloadsEnabled,
      activationApproved: safetyInput.activationApproved,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      languageIsolationPass,
      runValidatorPass,
      brainGateDecision,
      brainGateReadinessPercent: n(latestBrain.report, 'readinessPercent'),
      readyForNextNonProductionManifestRecheck: blockers === 0,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
      blockers,
      warnings,
    },
    legacyReviewResidue,
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      approvalReceiptCreatedByThisScript: false,
      activeHashLockCreatedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV non-production evidence refresh V2 packet: ${report.status}`);
  console.log(`Refresh state: ${report.summary.refreshState}`);
  console.log(`Legacy review residue matches: ${report.summary.legacyReviewResidueMatches}`);
  console.log(`Ready for next non-production manifest recheck: ${report.summary.readyForNextNonProductionManifestRecheck ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
