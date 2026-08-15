import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type FindingSeverity = 'blocker' | 'warning' | 'info';
type ArtifactCategory =
  | 'french_reviewer_manifest_artifact'
  | 'french_reviewer_source_report'
  | 'current_app_expansion_artifact'
  | 'current_app_expansion_script'
  | 'algorithm_audit_doc'
  | 'manifest_output';

type Finding = {
  severity: FindingSeverity;
  code: string;
  message: string;
  path?: string;
};

type ArtifactEntry = {
  category: ArtifactCategory;
  kind: string;
  phase?: string;
  path: string;
  exists: boolean;
  bytes: number;
  sha256: string | null;
  sourceStatus?: string;
  required: boolean;
};

type PhaseEntry = {
  phase: string;
  title: string;
  status: Status;
  jsonArtifact?: string;
  mdArtifact?: string;
  auditDoc?: string;
  script?: string;
  blockers: number;
  warnings: number;
  readyForNext: boolean;
  readyForApply: boolean;
  mayModifyProductionAppFiles: boolean;
};

type Report = {
  schemaVersion: 'gustav-expanded-algorithm-master-manifest-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: {
    frenchReviewerMasterManifestPacket: string;
    generatedContentAudit: string;
    readinessGate: string;
    readinessBlockerReductionPacket: string;
    currentAppReadinessExtensionPacket: string;
  };
  summary: {
    frenchReviewerManifestArtifacts: number;
    frenchReviewerSourceReports: number;
    generatedLessonLedgers: number;
    generatedFrenchRows: number;
    reviewerQueueRows: number;
    reviewerDecisionTemplateRows: number;
    currentAppExpansionPhasesIndexed: number;
    currentAppExpansionArtifacts: number;
    currentAppExpansionScripts: number;
    algorithmAuditDocs: number;
    criticalArtifacts: number;
    criticalArtifactsPresent: number;
    criticalArtifactsHashed: number;
    criticalArtifactsMissing: number;
    existingReadinessChecks: number;
    existingReadinessGenerationBlockers: number;
    existingReadinessApplyBlockers: number;
    p8ReadinessChecksToAdd: number;
    p8ChecksCurrentlyPass: number;
    p8ChecksCurrentlyHold: number;
    p8ChecksCurrentlyBlock: number;
    readyForReviewer: boolean;
    readyForDecisionImport: boolean;
    readyForFrenchLessonRowsGeneration: boolean;
    readyForNewAppDomainFrenchGeneration: boolean;
    readyForFrenchAppDomainActivation: boolean;
    readyForP10DecisionPacket: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    blockers: number;
    warnings: number;
  };
  phaseIndex: PhaseEntry[];
  artifacts: ArtifactEntry[];
  readinessSeparation: {
    lessonRowGeneration: string;
    newAppDomainGeneration: string;
    appDomainActivation: string;
    productionApply: string;
  };
  outputArtifacts: {
    manifestJson: string;
    manifestMd: string;
  };
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    readinessGateModifiedByThisScript: false;
    productionApplyApproved: false;
  };
};

type JsonObject = Record<string, unknown>;

type ExpansionPhaseConfig = {
  phase: string;
  title: string;
  json?: string;
  md?: string;
  auditDoc?: string;
  script?: string;
  readyKey?: string;
};

const EXPANSION_PHASES: ExpansionPhaseConfig[] = [
  {
    phase: 'P-BASE-AUDIT',
    title: 'Current app algorithm expansion audit',
    json: 'audits/current_app_algorithm_expansion_audit.json',
    md: 'audits/current_app_algorithm_expansion_audit.md',
    auditDoc: 'docs/gustav/GUSTAV_ALGORITHM_AUDIT_126.md',
  },
  {
    phase: 'P-BASE-PLAN',
    title: 'Current app algorithm expansion plan',
    json: 'audits/current_app_algorithm_expansion_plan.json',
    md: 'audits/current_app_algorithm_expansion_plan.md',
    auditDoc: 'docs/gustav/GUSTAV_ALGORITHM_AUDIT_127.md',
  },
  {
    phase: 'P0',
    title: 'Dirty baseline snapshot',
    json: 'audits/current_app_dirty_baseline_snapshot.json',
    md: 'audits/current_app_dirty_baseline_snapshot.md',
    auditDoc: 'docs/gustav/GUSTAV_ALGORITHM_AUDIT_128.md',
    script: 'scripts/gustav_current_app_dirty_baseline_snapshot.ts',
    readyKey: 'readyForP1SurfaceDeltaScanner',
  },
  {
    phase: 'P1',
    title: 'Current app surface delta inventory',
    json: 'audits/current_app_surface_delta_inventory.json',
    md: 'audits/current_app_surface_delta_inventory.md',
    auditDoc: 'docs/gustav/GUSTAV_ALGORITHM_AUDIT_129.md',
    script: 'scripts/gustav_current_app_surface_delta_inventory.ts',
    readyKey: 'readyForP2DomainRegistry',
  },
  {
    phase: 'P2',
    title: 'Expanded domain registry',
    json: 'audits/algorithm_domain_registry_packet.json',
    md: 'audits/algorithm_domain_registry_packet.md',
    auditDoc: 'docs/gustav/GUSTAV_ALGORITHM_AUDIT_130.md',
    script: 'scripts/gustav_algorithm_domain_registry_packet.ts',
    readyKey: 'readyForP3P7Contracts',
  },
  {
    phase: 'P4',
    title: 'AI dialog scenario contract',
    json: 'audits/ai_dialog_scenario_contract_packet.json',
    md: 'audits/ai_dialog_scenario_contract_packet.md',
    auditDoc: 'docs/gustav/GUSTAV_ALGORITHM_AUDIT_132.md',
    script: 'scripts/gustav_ai_dialog_scenario_contract_packet.ts',
    readyKey: 'readyForP8ReadinessExtension',
  },
  {
    phase: 'P5',
    title: 'Flashcard bundle contract',
    json: 'audits/flashcard_bundle_contract_packet.json',
    md: 'audits/flashcard_bundle_contract_packet.md',
    auditDoc: 'docs/gustav/GUSTAV_ALGORITHM_AUDIT_133.md',
    script: 'scripts/gustav_flashcard_bundle_contract_packet.ts',
    readyKey: 'readyForP8ReadinessExtension',
  },
  {
    phase: 'P6',
    title: 'Dirty surface state guards',
    json: 'audits/dirty_surface_state_guard_packet.json',
    md: 'audits/dirty_surface_state_guard_packet.md',
    auditDoc: 'docs/gustav/GUSTAV_ALGORITHM_AUDIT_134.md',
    script: 'scripts/gustav_dirty_surface_state_guard_packet.ts',
    readyKey: 'readyForP8ReadinessExtension',
  },
  {
    phase: 'P7',
    title: 'Collectible reward asset gate',
    json: 'audits/collectible_reward_asset_gate.json',
    md: 'audits/collectible_reward_asset_gate.md',
    auditDoc: 'docs/gustav/GUSTAV_ALGORITHM_AUDIT_135.md',
    script: 'scripts/gustav_collectible_reward_asset_gate.ts',
    readyKey: 'readyForP8ReadinessExtension',
  },
  {
    phase: 'P8',
    title: 'Readiness matrix extension',
    json: 'audits/current_app_readiness_extension_packet.json',
    md: 'audits/current_app_readiness_extension_packet.md',
    auditDoc: 'docs/gustav/GUSTAV_ALGORITHM_AUDIT_136.md',
    script: 'scripts/gustav_current_app_readiness_extension_packet.ts',
    readyKey: 'readyForP9MasterManifest',
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

function runPath(runDir: string, relativePath: string): string {
  return path.join(runDir, ...relativePath.split('/'));
}

function repoPath(repoRoot: string, relativePath: string): string {
  return path.join(repoRoot, ...relativePath.split('/'));
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function arr<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && Number.isFinite(Number(raw))) return Number(raw);
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

function addFinding(findings: Finding[], severity: FindingSeverity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function artifactEntry(
  repoRoot: string,
  filePath: string,
  category: ArtifactCategory,
  kind: string,
  required: boolean,
  phase?: string,
  sourceStatus?: string,
): ArtifactEntry {
  const exists = fs.existsSync(filePath);
  const stat = exists ? fs.statSync(filePath) : null;
  return {
    category,
    kind,
    phase,
    path: rel(repoRoot, filePath),
    exists,
    bytes: stat?.size ?? 0,
    sha256: exists ? sha256(filePath) : null,
    sourceStatus,
    required,
  };
}

function jsonStatusAndSummary(filePath: string): { status: Status; summary: JsonObject } {
  if (!fs.existsSync(filePath)) return { status: 'BLOCK', summary: {} };
  const body = readJson<JsonObject>(filePath);
  const status = s(body, 'status');
  const normalizedStatus: Status = status === 'PASS' || status === 'HOLD' || status === 'BLOCK' ? status : 'PASS';
  return { status: normalizedStatus, summary: object(body.summary) };
}

function phaseEntry(repoRoot: string, runDir: string, phase: ExpansionPhaseConfig): PhaseEntry {
  const jsonPath = phase.json ? runPath(runDir, phase.json) : null;
  const mdPath = phase.md ? runPath(runDir, phase.md) : null;
  const auditDocPath = phase.auditDoc ? repoPath(repoRoot, phase.auditDoc) : null;
  const scriptPath = phase.script ? repoPath(repoRoot, phase.script) : null;
  const report = jsonPath ? jsonStatusAndSummary(jsonPath) : { status: 'PASS' as Status, summary: {} };
  const readyForNext = phase.readyKey ? b(report.summary, phase.readyKey) : report.status !== 'BLOCK';

  return {
    phase: phase.phase,
    title: phase.title,
    status: report.status,
    jsonArtifact: jsonPath ? rel(repoRoot, jsonPath) : undefined,
    mdArtifact: mdPath ? rel(repoRoot, mdPath) : undefined,
    auditDoc: auditDocPath ? rel(repoRoot, auditDocPath) : undefined,
    script: scriptPath ? rel(repoRoot, scriptPath) : undefined,
    blockers: n(report.summary, 'blockers'),
    warnings: n(report.summary, 'warnings'),
    readyForNext,
    readyForApply: b(report.summary, 'readyForApply'),
    mayModifyProductionAppFiles: b(report.summary, 'mayModifyProductionAppFiles'),
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Expanded Algorithm Master Manifest',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- French reviewer manifest artifacts: ${report.summary.frenchReviewerManifestArtifacts}`,
    `- French reviewer source reports: ${report.summary.frenchReviewerSourceReports}`,
    `- Generated lesson ledgers: ${report.summary.generatedLessonLedgers}`,
    `- Generated French rows: ${report.summary.generatedFrenchRows}`,
    `- Reviewer queue rows: ${report.summary.reviewerQueueRows}`,
    `- Reviewer decision template rows: ${report.summary.reviewerDecisionTemplateRows}`,
    `- Current app expansion phases indexed: ${report.summary.currentAppExpansionPhasesIndexed}`,
    `- Current app expansion artifacts: ${report.summary.currentAppExpansionArtifacts}`,
    `- Current app expansion scripts: ${report.summary.currentAppExpansionScripts}`,
    `- Algorithm audit docs: ${report.summary.algorithmAuditDocs}`,
    `- Critical artifacts: ${report.summary.criticalArtifacts}`,
    `- Critical artifacts present: ${report.summary.criticalArtifactsPresent}`,
    `- Critical artifacts hashed: ${report.summary.criticalArtifactsHashed}`,
    `- Critical artifacts missing: ${report.summary.criticalArtifactsMissing}`,
    `- Existing readiness checks: ${report.summary.existingReadinessChecks}`,
    `- Existing readiness generation blockers: ${report.summary.existingReadinessGenerationBlockers}`,
    `- Existing readiness apply blockers: ${report.summary.existingReadinessApplyBlockers}`,
    `- P8 readiness checks to add: ${report.summary.p8ReadinessChecksToAdd}`,
    `- P8 checks currently PASS: ${report.summary.p8ChecksCurrentlyPass}`,
    `- P8 checks currently HOLD: ${report.summary.p8ChecksCurrentlyHold}`,
    `- P8 checks currently BLOCK: ${report.summary.p8ChecksCurrentlyBlock}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for decision import: ${report.summary.readyForDecisionImport ? 'yes' : 'no'}`,
    `- Ready for French lesson-row generation: ${report.summary.readyForFrenchLessonRowsGeneration ? 'yes' : 'no'}`,
    `- Ready for new app-domain French generation: ${report.summary.readyForNewAppDomainFrenchGeneration ? 'yes' : 'no'}`,
    `- Ready for French app-domain activation: ${report.summary.readyForFrenchAppDomainActivation ? 'yes' : 'no'}`,
    `- Ready for P10 decision packet: ${report.summary.readyForP10DecisionPacket ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Phase Index',
    '',
  ];

  for (const phase of report.phaseIndex) {
    lines.push(`- \`${phase.phase}\` ${phase.title}: \`${phase.status}\`, blockers ${phase.blockers}, warnings ${phase.warnings}, readyForNext ${phase.readyForNext ? 'yes' : 'no'}, readyForApply ${phase.readyForApply ? 'yes' : 'no'}`);
  }

  lines.push('', '## Readiness Separation', '');
  lines.push(`- Lesson-row generation: ${report.readinessSeparation.lessonRowGeneration}`);
  lines.push(`- New app-domain generation: ${report.readinessSeparation.newAppDomainGeneration}`);
  lines.push(`- App-domain activation: ${report.readinessSeparation.appDomainActivation}`);
  lines.push(`- Production apply: ${report.readinessSeparation.productionApply}`);

  lines.push('', '## Artifact Groups', '');
  const categoryCounts = report.artifacts.reduce<Record<string, number>>((acc, artifact) => {
    acc[artifact.category] = (acc[artifact.category] ?? 0) + 1;
    return acc;
  }, {});
  for (const [category, count] of Object.entries(categoryCounts).sort(([a], [bValue]) => a.localeCompare(bValue))) {
    lines.push(`- \`${category}\`: ${count}`);
  }

  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
    }
  }

  lines.push(
    '',
    '## Safety',
    '',
    '- This manifest did not modify production app files.',
    '- This manifest did not modify generated French ledgers.',
    '- This manifest did not write reviewer decisions.',
    '- This manifest did not edit `scripts/gustav_readiness_gate.ts`.',
    '- This manifest does not authorize production app apply.',
    '',
  );

  return `${lines.join('\n')}\n`;
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_expanded_algorithm_master_manifest.ts --run <run-dir>');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const auditsDir = path.join(runDir, 'audits');
  ensureDir(auditsDir);

  const reviewerMasterPacketPath = runPath(runDir, 'audits/french_reviewer_master_manifest_packet.json');
  const generatedContentAuditPath = runPath(runDir, 'audits/generated_content_audit.json');
  const readinessGatePath = runPath(runDir, 'audits/gustav_readiness_gate.json');
  const readinessBlockerReductionPath = runPath(runDir, 'audits/readiness_blocker_reduction_packet.json');
  const p8Path = runPath(runDir, 'audits/current_app_readiness_extension_packet.json');
  const outJson = runPath(runDir, 'audits/expanded_algorithm_master_manifest.json');
  const outMd = runPath(runDir, 'audits/expanded_algorithm_master_manifest.md');

  const findings: Finding[] = [];
  const artifacts: ArtifactEntry[] = [];

  const reviewerMasterPacket = fs.existsSync(reviewerMasterPacketPath) ? readJson<JsonObject>(reviewerMasterPacketPath) : {};
  const reviewerSummary = object(reviewerMasterPacket.summary);
  const reviewerArtifacts = arr<JsonObject>(reviewerMasterPacket.artifacts);
  const reviewerSourceReports = arr<JsonObject>(reviewerMasterPacket.sourceReports);

  if (!fs.existsSync(reviewerMasterPacketPath)) {
    addFinding(findings, 'blocker', 'french_reviewer_master_manifest_missing', 'French reviewer master manifest packet is missing.', rel(repoRoot, reviewerMasterPacketPath));
  }

  artifacts.push(artifactEntry(repoRoot, reviewerMasterPacketPath, 'french_reviewer_source_report', 'french_reviewer_master_manifest_packet', true));

  for (const sourceReport of reviewerSourceReports) {
    const sourcePath = s(sourceReport, 'path');
    if (!sourcePath) continue;
    artifacts.push(artifactEntry(
      repoRoot,
      repoPath(repoRoot, sourcePath),
      'french_reviewer_source_report',
      s(sourceReport, 'name') || path.basename(sourcePath),
      true,
      undefined,
      s(sourceReport, 'status'),
    ));
  }

  for (const reviewerArtifact of reviewerArtifacts) {
    const artifactPath = s(reviewerArtifact, 'path');
    if (!artifactPath) continue;
    artifacts.push(artifactEntry(
      repoRoot,
      repoPath(repoRoot, artifactPath),
      'french_reviewer_manifest_artifact',
      s(reviewerArtifact, 'kind') || s(reviewerArtifact, 'category') || 'reviewer_artifact',
      true,
    ));
  }

  const phaseIndex = EXPANSION_PHASES.map((phase) => phaseEntry(repoRoot, runDir, phase));
  for (const phase of EXPANSION_PHASES) {
    if (phase.json) {
      artifacts.push(artifactEntry(repoRoot, runPath(runDir, phase.json), 'current_app_expansion_artifact', 'json', true, phase.phase));
    }
    if (phase.md) {
      artifacts.push(artifactEntry(repoRoot, runPath(runDir, phase.md), 'current_app_expansion_artifact', 'markdown', true, phase.phase));
    }
    if (phase.auditDoc) {
      artifacts.push(artifactEntry(repoRoot, repoPath(repoRoot, phase.auditDoc), 'algorithm_audit_doc', 'algorithm_audit_doc', true, phase.phase));
    }
    if (phase.script) {
      artifacts.push(artifactEntry(repoRoot, repoPath(repoRoot, phase.script), 'current_app_expansion_script', 'script', true, phase.phase));
    }
  }

  for (const artifact of artifacts) {
    if (artifact.required && !artifact.exists) {
      addFinding(findings, 'blocker', 'critical_artifact_missing', 'Critical artifact is missing.', artifact.path);
    }
    if (artifact.exists && !artifact.sha256) {
      addFinding(findings, 'blocker', 'critical_artifact_hash_missing', 'Critical artifact hash was not recorded.', artifact.path);
    }
  }

  const generatedContentAudit = fs.existsSync(generatedContentAuditPath) ? readJson<JsonObject>(generatedContentAuditPath) : {};
  const readinessGate = fs.existsSync(readinessGatePath) ? readJson<JsonObject>(readinessGatePath) : {};
  const readinessBlockerReduction = fs.existsSync(readinessBlockerReductionPath) ? readJson<JsonObject>(readinessBlockerReductionPath) : {};
  const p8 = fs.existsSync(p8Path) ? readJson<JsonObject>(p8Path) : {};

  const generatedSummary = object(generatedContentAudit.summary);
  const readinessSummary = object(readinessGate.summary);
  const readinessBlockerSummary = object(readinessBlockerReduction.summary);
  const p8Summary = object(p8.summary);

  if (s(p8, 'status') !== 'PASS') {
    addFinding(findings, 'blocker', 'p8_readiness_extension_not_pass', 'P8 readiness extension packet is not PASS.', rel(repoRoot, p8Path));
  }

  const criticalArtifacts = artifacts.filter((artifact) => artifact.required);
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;

  const report: Report = {
    schemaVersion: 'gustav-expanded-algorithm-master-manifest-v0',
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' : 'BLOCK',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      frenchReviewerMasterManifestPacket: rel(repoRoot, reviewerMasterPacketPath),
      generatedContentAudit: rel(repoRoot, generatedContentAuditPath),
      readinessGate: rel(repoRoot, readinessGatePath),
      readinessBlockerReductionPacket: rel(repoRoot, readinessBlockerReductionPath),
      currentAppReadinessExtensionPacket: rel(repoRoot, p8Path),
    },
    summary: {
      frenchReviewerManifestArtifacts: reviewerArtifacts.length,
      frenchReviewerSourceReports: reviewerSourceReports.length,
      generatedLessonLedgers: n(reviewerSummary, 'generatedLessonLedgers'),
      generatedFrenchRows: n(reviewerSummary, 'generatedRows') || n(generatedSummary, 'rowsWithFrench'),
      reviewerQueueRows: n(reviewerSummary, 'queueRows'),
      reviewerDecisionTemplateRows: n(reviewerSummary, 'decisionTemplateRows'),
      currentAppExpansionPhasesIndexed: phaseIndex.length,
      currentAppExpansionArtifacts: artifacts.filter((artifact) => artifact.category === 'current_app_expansion_artifact').length,
      currentAppExpansionScripts: artifacts.filter((artifact) => artifact.category === 'current_app_expansion_script').length,
      algorithmAuditDocs: artifacts.filter((artifact) => artifact.category === 'algorithm_audit_doc').length,
      criticalArtifacts: criticalArtifacts.length,
      criticalArtifactsPresent: criticalArtifacts.filter((artifact) => artifact.exists).length,
      criticalArtifactsHashed: criticalArtifacts.filter((artifact) => artifact.sha256 !== null).length,
      criticalArtifactsMissing: criticalArtifacts.filter((artifact) => !artifact.exists).length,
      existingReadinessChecks: n(readinessSummary, 'checks'),
      existingReadinessGenerationBlockers: n(readinessSummary, 'generationBlockers'),
      existingReadinessApplyBlockers: n(readinessSummary, 'applyBlockers'),
      p8ReadinessChecksToAdd: n(p8Summary, 'readinessChecksToAdd'),
      p8ChecksCurrentlyPass: n(p8Summary, 'checksCurrentlyPass'),
      p8ChecksCurrentlyHold: n(p8Summary, 'checksCurrentlyHold'),
      p8ChecksCurrentlyBlock: n(p8Summary, 'checksCurrentlyBlock'),
      readyForReviewer: b(reviewerSummary, 'readyForReviewer') && b(generatedSummary, 'readyForReviewer'),
      readyForDecisionImport: b(reviewerSummary, 'readyForDecisionImport'),
      readyForFrenchLessonRowsGeneration: b(p8Summary, 'readyForFrenchLessonRowsGeneration') || b(readinessBlockerSummary, 'canStartFrenchGeneration'),
      readyForNewAppDomainFrenchGeneration: b(p8Summary, 'readyForNewAppDomainFrenchGeneration'),
      readyForFrenchAppDomainActivation: b(p8Summary, 'readyForFrenchAppDomainActivation'),
      readyForP10DecisionPacket: blockers === 0,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    phaseIndex,
    artifacts,
    readinessSeparation: {
      lessonRowGeneration: 'Existing French lesson rows are generated and reviewer-ready; this does not grant production apply.',
      newAppDomainGeneration: 'P8 keeps new app-domain generation on HOLD until dedicated generation packets exist for plans, dialogs, flashcard bundles, and collectible text.',
      appDomainActivation: 'Dirty surface state tests and localized collectible/app-domain contracts must pass before activation.',
      productionApply: 'Apply remains blocked by existing apply blockers, missing reviewer decisions, unapproved dirty overlap, and no production app write approval.',
    },
    outputArtifacts: {
      manifestJson: rel(repoRoot, outJson),
      manifestMd: rel(repoRoot, outMd),
    },
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      readinessGateModifiedByThisScript: false,
      productionApplyApproved: false,
    },
  };

  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV expanded algorithm master manifest: ${report.status}`);
  console.log(`French reviewer manifest artifacts: ${report.summary.frenchReviewerManifestArtifacts}`);
  console.log(`Current app expansion phases indexed: ${report.summary.currentAppExpansionPhasesIndexed}`);
  console.log(`Critical artifacts present: ${report.summary.criticalArtifactsPresent}/${report.summary.criticalArtifacts}`);
  console.log(`Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`);
  console.log(`Ready for new app-domain French generation: ${report.summary.readyForNewAppDomainFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Ready for P10 decision packet: ${report.summary.readyForP10DecisionPacket ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (report.status !== 'PASS') {
    process.exitCode = 1;
  }
}

main();
