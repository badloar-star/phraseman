import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type ReadinessStatus = 'PASS' | 'HOLD' | 'BLOCK';
type FindingSeverity = 'blocker' | 'warning' | 'info';
type BlockedWork =
  | 'lesson-row-generation'
  | 'new-app-domain-generation'
  | 'reviewer-handoff'
  | 'app-domain-activation'
  | 'production-apply';

type Finding = {
  severity: FindingSeverity;
  code: string;
  message: string;
  path?: string;
};

type ArtifactRef = {
  id: string;
  path: string;
  exists: boolean;
  status: string | null;
  sha256: string | null;
  requiredForP8: boolean;
  summaryKeys: string[];
};

type ReadinessCheck = {
  id: string;
  phase: string;
  domain: string;
  title: string;
  sourceArtifact: string;
  currentStatus: ReadinessStatus;
  addToReadinessGate: boolean;
  blocks: BlockedWork[];
  generationScope: 'none' | 'lesson-rows' | 'new-app-domain' | 'all-french';
  applyScope: 'none' | 'app-domain' | 'production-app';
  acceptanceEvidence: string[];
  rationale: string;
};

type DomainReadiness = {
  domain: string;
  sourceArtifact: string;
  contractStatus: ReadinessStatus;
  generationStatus: ReadinessStatus;
  activationStatus: ReadinessStatus;
  applyStatus: ReadinessStatus;
  generationBlockedBy: string[];
  activationBlockedBy: string[];
  applyBlockedBy: string[];
  notes: string[];
};

type Report = {
  schemaVersion: 'gustav-current-app-readiness-extension-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: {
    p1SurfaceDeltaInventory: string;
    p2DomainRegistryPacket: string;
    aiDialogScenarioContractPacket: string;
    flashcardBundleContractPacket: string;
    dirtySurfaceStateGuardPacket: string;
    collectibleRewardAssetGate: string;
    readinessGate: string;
    readinessBlockerReductionPacket: string;
    generatedContentAudit: string;
  };
  summary: {
    requiredArtifacts: number;
    requiredArtifactsPresent: number;
    requiredArtifactsPassOrUsable: number;
    readinessChecksToAdd: number;
    checksCurrentlyPass: number;
    checksCurrentlyHold: number;
    checksCurrentlyBlock: number;
    generationBlockingChecks: number;
    applyBlockingChecks: number;
    appDomainGenerationBlockingChecks: number;
    appDomainActivationBlockingChecks: number;
    productionApplyBlockingChecks: number;
    existingReadinessChecks: number;
    existingReadinessGenerationBlockers: number;
    existingReadinessApplyBlockers: number;
    existingFrenchLessonRows: number;
    existingFrenchLessonRowsReadyForReviewer: boolean;
    existingFrenchLessonRowsReadyForApply: boolean;
    readyForP9MasterManifest: boolean;
    readyForFrenchLessonRowsGeneration: boolean;
    readyForNewAppDomainFrenchGeneration: boolean;
    readyForFrenchAppDomainActivation: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    blockers: number;
    warnings: number;
  };
  artifacts: ArtifactRef[];
  readinessChecksToAdd: ReadinessCheck[];
  domainReadiness: DomainReadiness[];
  generationVsApplyPolicy: string[];
  requiredNextArtifacts: string[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    readinessGateModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    productionApplyApproved: false;
  };
};

type JsonObject = Record<string, unknown>;

const AUDIT_FILES = {
  p1: 'current_app_surface_delta_inventory.json',
  p2: 'algorithm_domain_registry_packet.json',
  p4: 'ai_dialog_scenario_contract_packet.json',
  p5: 'flashcard_bundle_contract_packet.json',
  p6: 'dirty_surface_state_guard_packet.json',
  p7: 'collectible_reward_asset_gate.json',
  readinessGate: 'gustav_readiness_gate.json',
  blockerReduction: 'readiness_blocker_reduction_packet.json',
  generatedContentAudit: 'generated_content_audit.json',
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
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
  return typeof value[key] === 'number' ? value[key] as number : 0;
}

function b(value: JsonObject, key: string): boolean {
  return value[key] === true;
}

function s(value: JsonObject, key: string): string {
  return typeof value[key] === 'string' ? value[key] as string : '';
}

function addFinding(findings: Finding[], severity: FindingSeverity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function artifactStatus(artifact: JsonObject): string | null {
  const status = artifact.status;
  return typeof status === 'string' ? status : null;
}

function artifactSummary(artifact: JsonObject): JsonObject {
  return object(artifact.summary);
}

function artifactRef(repoRoot: string, id: string, filePath: string, requiredForP8 = true): ArtifactRef {
  if (!fs.existsSync(filePath)) {
    return {
      id,
      path: rel(repoRoot, filePath),
      exists: false,
      status: null,
      sha256: null,
      requiredForP8,
      summaryKeys: [],
    };
  }
  const artifact = readJson<JsonObject>(filePath);
  return {
    id,
    path: rel(repoRoot, filePath),
    exists: true,
    status: artifactStatus(artifact),
    sha256: sha256(filePath),
    requiredForP8,
    summaryKeys: Object.keys(artifactSummary(artifact)).sort(),
  };
}

function checkStatus(condition: boolean, holdWhenFalse = false): ReadinessStatus {
  if (condition) return 'PASS';
  return holdWhenFalse ? 'HOLD' : 'BLOCK';
}

function check(
  id: string,
  phase: string,
  domain: string,
  title: string,
  sourceArtifact: string,
  currentStatus: ReadinessStatus,
  blocks: BlockedWork[],
  generationScope: ReadinessCheck['generationScope'],
  applyScope: ReadinessCheck['applyScope'],
  acceptanceEvidence: string[],
  rationale: string,
): ReadinessCheck {
  return {
    id,
    phase,
    domain,
    title,
    sourceArtifact,
    currentStatus,
    addToReadinessGate: true,
    blocks,
    generationScope,
    applyScope,
    acceptanceEvidence,
    rationale,
  };
}

function statusFromBlockingChecks(checks: ReadinessCheck[], block: BlockedWork): ReadinessStatus {
  const related = checks.filter((entry) => entry.blocks.includes(block));
  if (related.some((entry) => entry.currentStatus === 'BLOCK')) return 'BLOCK';
  if (related.some((entry) => entry.currentStatus === 'HOLD')) return 'HOLD';
  return 'PASS';
}

function blockedBy(checks: ReadinessCheck[], block: BlockedWork): string[] {
  return checks
    .filter((entry) => entry.blocks.includes(block) && entry.currentStatus !== 'PASS')
    .map((entry) => entry.id);
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Current App Readiness Extension Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Required artifacts: ${report.summary.requiredArtifacts}`,
    `- Required artifacts present: ${report.summary.requiredArtifactsPresent}`,
    `- Required artifacts pass or usable: ${report.summary.requiredArtifactsPassOrUsable}`,
    `- Readiness checks to add: ${report.summary.readinessChecksToAdd}`,
    `- Checks currently PASS: ${report.summary.checksCurrentlyPass}`,
    `- Checks currently HOLD: ${report.summary.checksCurrentlyHold}`,
    `- Checks currently BLOCK: ${report.summary.checksCurrentlyBlock}`,
    `- Generation-blocking checks: ${report.summary.generationBlockingChecks}`,
    `- Apply-blocking checks: ${report.summary.applyBlockingChecks}`,
    `- App-domain generation-blocking checks: ${report.summary.appDomainGenerationBlockingChecks}`,
    `- App-domain activation-blocking checks: ${report.summary.appDomainActivationBlockingChecks}`,
    `- Production apply-blocking checks: ${report.summary.productionApplyBlockingChecks}`,
    `- Existing readiness checks: ${report.summary.existingReadinessChecks}`,
    `- Existing readiness generation blockers: ${report.summary.existingReadinessGenerationBlockers}`,
    `- Existing readiness apply blockers: ${report.summary.existingReadinessApplyBlockers}`,
    `- Existing French lesson rows: ${report.summary.existingFrenchLessonRows}`,
    `- Existing French lesson rows ready for reviewer: ${report.summary.existingFrenchLessonRowsReadyForReviewer ? 'yes' : 'no'}`,
    `- Existing French lesson rows ready for apply: ${report.summary.existingFrenchLessonRowsReadyForApply ? 'yes' : 'no'}`,
    `- Ready for P9 master manifest: ${report.summary.readyForP9MasterManifest ? 'yes' : 'no'}`,
    `- Ready for French lesson-row generation: ${report.summary.readyForFrenchLessonRowsGeneration ? 'yes' : 'no'}`,
    `- Ready for new app-domain French generation: ${report.summary.readyForNewAppDomainFrenchGeneration ? 'yes' : 'no'}`,
    `- Ready for French app-domain activation: ${report.summary.readyForFrenchAppDomainActivation ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Checks To Add',
    '',
  ];

  for (const readinessCheck of report.readinessChecksToAdd) {
    lines.push(`- \`${readinessCheck.id}\` ${readinessCheck.title}`);
    lines.push(`  - Phase: \`${readinessCheck.phase}\`; domain: \`${readinessCheck.domain}\`; current: \`${readinessCheck.currentStatus}\``);
    lines.push(`  - Blocks: ${readinessCheck.blocks.length > 0 ? readinessCheck.blocks.map((entry) => `\`${entry}\``).join(', ') : '`none`'}`);
    lines.push(`  - Source: \`${readinessCheck.sourceArtifact}\``);
  }

  lines.push('', '## Domain Readiness', '');
  for (const domain of report.domainReadiness) {
    lines.push(`- \`${domain.domain}\`: contract \`${domain.contractStatus}\`, generation \`${domain.generationStatus}\`, activation \`${domain.activationStatus}\`, apply \`${domain.applyStatus}\``);
    if (domain.generationBlockedBy.length > 0) lines.push(`  - Generation blocked by: ${domain.generationBlockedBy.map((entry) => `\`${entry}\``).join(', ')}`);
    if (domain.activationBlockedBy.length > 0) lines.push(`  - Activation blocked by: ${domain.activationBlockedBy.map((entry) => `\`${entry}\``).join(', ')}`);
    if (domain.applyBlockedBy.length > 0) lines.push(`  - Apply blocked by: ${domain.applyBlockedBy.map((entry) => `\`${entry}\``).join(', ')}`);
  }

  lines.push('', '## Generation vs Apply Policy', '');
  for (const policy of report.generationVsApplyPolicy) lines.push(`- ${policy}`);

  lines.push('', '## Required Next Artifacts', '');
  for (const artifact of report.requiredNextArtifacts) lines.push(`- ${artifact}`);

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
    '- This packet did not edit `scripts/gustav_readiness_gate.ts`.',
    '- This packet did not modify production app files.',
    '- This packet did not modify generated French ledgers.',
    '- This packet did not write reviewer decisions.',
    '- This packet does not authorize production app apply.',
    '',
  );

  return `${lines.join('\n')}\n`;
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_current_app_readiness_extension_packet.ts --run <run-dir>');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const auditsDir = path.join(runDir, 'audits');
  ensureDir(auditsDir);

  const artifactPaths = {
    p1: path.join(auditsDir, AUDIT_FILES.p1),
    p2: path.join(auditsDir, AUDIT_FILES.p2),
    p4: path.join(auditsDir, AUDIT_FILES.p4),
    p5: path.join(auditsDir, AUDIT_FILES.p5),
    p6: path.join(auditsDir, AUDIT_FILES.p6),
    p7: path.join(auditsDir, AUDIT_FILES.p7),
    readinessGate: path.join(auditsDir, AUDIT_FILES.readinessGate),
    blockerReduction: path.join(auditsDir, AUDIT_FILES.blockerReduction),
    generatedContentAudit: path.join(auditsDir, AUDIT_FILES.generatedContentAudit),
  };

  const findings: Finding[] = [];
  const artifacts = [
    artifactRef(repoRoot, 'p1_surface_delta_inventory', artifactPaths.p1),
    artifactRef(repoRoot, 'p2_domain_registry_packet', artifactPaths.p2),
    artifactRef(repoRoot, 'p4_ai_dialog_scenario_contract', artifactPaths.p4),
    artifactRef(repoRoot, 'p5_flashcard_bundle_contract', artifactPaths.p5),
    artifactRef(repoRoot, 'p6_dirty_surface_state_guard', artifactPaths.p6),
    artifactRef(repoRoot, 'p7_collectible_reward_asset_gate', artifactPaths.p7),
    artifactRef(repoRoot, 'readiness_gate', artifactPaths.readinessGate),
    artifactRef(repoRoot, 'readiness_blocker_reduction_packet', artifactPaths.blockerReduction),
    artifactRef(repoRoot, 'generated_content_audit', artifactPaths.generatedContentAudit),
  ];

  for (const artifact of artifacts) {
    if (artifact.requiredForP8 && !artifact.exists) {
      addFinding(findings, 'blocker', 'p8_required_artifact_missing', `Required P8 input artifact is missing: ${artifact.id}.`, artifact.path);
    }
  }

  const p1 = fs.existsSync(artifactPaths.p1) ? readJson<JsonObject>(artifactPaths.p1) : {};
  const p2 = fs.existsSync(artifactPaths.p2) ? readJson<JsonObject>(artifactPaths.p2) : {};
  const p4 = fs.existsSync(artifactPaths.p4) ? readJson<JsonObject>(artifactPaths.p4) : {};
  const p5 = fs.existsSync(artifactPaths.p5) ? readJson<JsonObject>(artifactPaths.p5) : {};
  const p6 = fs.existsSync(artifactPaths.p6) ? readJson<JsonObject>(artifactPaths.p6) : {};
  const p7 = fs.existsSync(artifactPaths.p7) ? readJson<JsonObject>(artifactPaths.p7) : {};
  const readinessGate = fs.existsSync(artifactPaths.readinessGate) ? readJson<JsonObject>(artifactPaths.readinessGate) : {};
  const blockerReduction = fs.existsSync(artifactPaths.blockerReduction) ? readJson<JsonObject>(artifactPaths.blockerReduction) : {};
  const generatedContentAudit = fs.existsSync(artifactPaths.generatedContentAudit) ? readJson<JsonObject>(artifactPaths.generatedContentAudit) : {};

  const p1Summary = artifactSummary(p1);
  const p2Summary = artifactSummary(p2);
  const p4Summary = artifactSummary(p4);
  const p5Summary = artifactSummary(p5);
  const p6Summary = artifactSummary(p6);
  const p7Summary = artifactSummary(p7);
  const readinessSummary = artifactSummary(readinessGate);
  const blockerReductionSummary = artifactSummary(blockerReduction);
  const generatedSummary = artifactSummary(generatedContentAudit);
  const p1OldInventoryDelta = object(p1.oldInventoryDelta);
  const p1NewAppTsxSurfaces = arr<JsonObject>(p1OldInventoryDelta.currentAppTsxNotInOldInventory);
  const p1NewAppTsxUnclassified = p1NewAppTsxSurfaces
    .filter((surface) => typeof surface.primaryDomain !== 'string' || surface.primaryDomain.trim().length === 0)
    .length;

  const p1Pass = artifactStatus(p1) === 'PASS';
  const p2Pass = artifactStatus(p2) === 'PASS';
  const p4Pass = artifactStatus(p4) === 'PASS';
  const p5Pass = artifactStatus(p5) === 'PASS';
  const p6Pass = artifactStatus(p6) === 'PASS';
  const p7Pass = artifactStatus(p7) === 'PASS';

  const checks = [
    check(
      'P8-RDY-001',
      'P1',
      'current_app_surface_delta',
      'Current app surface delta inventory must pass before new app-domain readiness is trusted.',
      rel(repoRoot, artifactPaths.p1),
      checkStatus(p1Pass),
      ['new-app-domain-generation', 'app-domain-activation', 'production-apply'],
      'new-app-domain',
      'production-app',
      [
        `Current app TSX files: ${n(p1Summary, 'currentAppTsxFiles')}`,
        `New app TSX not in old inventory: ${n(p1Summary, 'currentAppTsxNotInOldInventory')}`,
      ],
      'New app surfaces must be known before GUSTAV expands beyond lesson rows.',
    ),
    check(
      'P8-RDY-002',
      'P1',
      'dirty_surface_domain_map',
      'Every dirty app/component/test file must have a primary domain.',
      rel(repoRoot, artifactPaths.p1),
      checkStatus(p1Pass && n(p1Summary, 'unclassifiedDirtyAppComponentTestFiles') === 0),
      ['new-app-domain-generation', 'app-domain-activation', 'production-apply'],
      'new-app-domain',
      'production-app',
      [
        `Dirty files: ${n(p1Summary, 'dirtyFilesFromP0')}`,
        `Dirty app/component/test files: ${n(p1Summary, 'dirtyAppComponentTestFiles')}`,
        `Dirty unclassified files: ${n(p1Summary, 'unclassifiedDirtyAppComponentTestFiles')}`,
      ],
      'Dirty app work is treated as read-only; domain mapping prevents accidental overwrite.',
    ),
    check(
      'P8-RDY-003',
      'P1',
      'new_surface_domain_map',
      'Every new current-app TSX surface must map to a domain or known source-locale UI bucket.',
      rel(repoRoot, artifactPaths.p1),
      checkStatus(p1Pass && p1NewAppTsxUnclassified === 0),
      ['new-app-domain-generation', 'app-domain-activation', 'production-apply'],
      'new-app-domain',
      'production-app',
      [
        `New app TSX not in old inventory: ${n(p1Summary, 'currentAppTsxNotInOldInventory')}`,
        `New app TSX unclassified: ${p1NewAppTsxUnclassified}`,
      ],
      'Expansion must know whether new surfaces are content, UI, storage, reward, or apply-sensitive.',
    ),
    check(
      'P8-RDY-010',
      'P2',
      'domain_registry',
      'Expanded algorithm domain registry must pass.',
      rel(repoRoot, artifactPaths.p2),
      checkStatus(p2Pass && b(p2Summary, 'readyForP3P7Contracts')),
      ['new-app-domain-generation', 'app-domain-activation', 'production-apply'],
      'new-app-domain',
      'production-app',
      [
        `Registry domains: ${n(p2Summary, 'registryDomains')}`,
        `Required domains: ${n(p2Summary, 'requiredDomains')}`,
      ],
      'Readiness checks need a stable domain registry before they can be added safely.',
    ),
    check(
      'P8-RDY-011',
      'P2',
      'domain_policy_split',
      'Every registered domain must declare sourceLocale policy, studyTarget policy, and required evidence.',
      rel(repoRoot, artifactPaths.p2),
      checkStatus(
        p2Pass
        && n(p2Summary, 'domainsWithSourceLocalePolicy') === n(p2Summary, 'registryDomains')
        && n(p2Summary, 'domainsWithStudyTargetPolicy') === n(p2Summary, 'registryDomains')
        && n(p2Summary, 'domainsWithRequiredEvidence') === n(p2Summary, 'registryDomains'),
      ),
      ['new-app-domain-generation', 'app-domain-activation', 'production-apply'],
      'new-app-domain',
      'production-app',
      [
        `Domains with sourceLocale policy: ${n(p2Summary, 'domainsWithSourceLocalePolicy')}`,
        `Domains with studyTarget policy: ${n(p2Summary, 'domainsWithStudyTargetPolicy')}`,
        `Domains with required evidence: ${n(p2Summary, 'domainsWithRequiredEvidence')}`,
      ],
      'French generation must not mix UI source language with learner study target state.',
    ),
    check(
      'P8-RDY-030',
      'P4',
      'ai_dialog_scenarios',
      'AI dialog scenario contract must pass.',
      rel(repoRoot, artifactPaths.p4),
      checkStatus(p4Pass && b(p4Summary, 'readyForP8ReadinessExtension')),
      ['new-app-domain-generation', 'app-domain-activation', 'production-apply'],
      'new-app-domain',
      'production-app',
      [
        `Active scenarios: ${n(p4Summary, 'activeScenarios')}`,
        `Localized UI cells checked: ${n(p4Summary, 'localizedUiCellsChecked')}`,
        `Prompt safety findings: ${n(p4Summary, 'promptSafetyFindings')}`,
      ],
      'Dialog copy and prompts need a separate contract before locale expansion.',
    ),
    check(
      'P8-RDY-031',
      'P4',
      'ai_dialog_scenarios',
      'French dialog generation packet must exist and pass no-Cyrillic/prompt-safety checks.',
      rel(repoRoot, artifactPaths.p4),
      checkStatus(b(p4Summary, 'readyForFrenchDialogGeneration'), true),
      ['new-app-domain-generation', 'reviewer-handoff', 'app-domain-activation', 'production-apply'],
      'new-app-domain',
      'production-app',
      [
        `readyForFrenchDialogGeneration: ${b(p4Summary, 'readyForFrenchDialogGeneration') ? 'true' : 'false'}`,
      ],
      'P4 confirms the source contract only; translated dialog cells must have their own safety gate.',
    ),
    check(
      'P8-RDY-040',
      'P5',
      'flashcard_marketplace_bundles',
      'Flashcard bundle contract must pass.',
      rel(repoRoot, artifactPaths.p5),
      checkStatus(p5Pass && b(p5Summary, 'readyForP8ReadinessExtension')),
      ['new-app-domain-generation', 'app-domain-activation', 'production-apply'],
      'new-app-domain',
      'production-app',
      [
        `Bundles: ${n(p5Summary, 'bundles')}`,
        `Contract card rows: ${n(p5Summary, 'contractCardRows')}`,
        `SourceLocale cells present: ${n(p5Summary, 'sourceLocaleCellsPresent')}`,
      ],
      'Marketplace bundles must be schema-checked before target-language variants are generated.',
    ),
    check(
      'P8-RDY-041',
      'P5',
      'flashcard_marketplace_bundles',
      'French flashcard bundle generation packet must exist before bundle translations.',
      rel(repoRoot, artifactPaths.p5),
      checkStatus(b(p5Summary, 'readyForFrenchBundleGeneration'), true),
      ['new-app-domain-generation', 'reviewer-handoff', 'app-domain-activation', 'production-apply'],
      'new-app-domain',
      'production-app',
      [
        `readyForFrenchBundleGeneration: ${b(p5Summary, 'readyForFrenchBundleGeneration') ? 'true' : 'false'}`,
      ],
      'P5 does not create French bundle rows; it only validates the existing source pack contract.',
    ),
    check(
      'P8-RDY-050',
      'P6',
      'dirty_surface_state_guards',
      'Dirty surface state guard packet must pass.',
      rel(repoRoot, artifactPaths.p6),
      checkStatus(p6Pass && b(p6Summary, 'readyForP8ReadinessExtension')),
      ['app-domain-activation', 'production-apply'],
      'none',
      'production-app',
      [
        `Surface records: ${n(p6Summary, 'surfaceRecords')}`,
        `Target-sensitive or mixed surfaces: ${n(p6Summary, 'targetSensitiveOrMixedSurfaces')}`,
      ],
      'Dirty stateful surfaces must be guarded before translated app domains can be activated.',
    ),
    check(
      'P8-RDY-051',
      'P6',
      'dirty_surface_state_guards',
      'Required target-aware storage/cloud/source-locale tests must pass before French surface activation.',
      rel(repoRoot, artifactPaths.p6),
      checkStatus(b(p6Summary, 'readyForFrenchSurfaceActivation'), true),
      ['app-domain-activation', 'production-apply'],
      'none',
      'production-app',
      [
        `Required tests before French activation: ${n(p6Summary, 'requiredTestsBeforeFrenchActivation')}`,
        `readyForFrenchSurfaceActivation: ${b(p6Summary, 'readyForFrenchSurfaceActivation') ? 'true' : 'false'}`,
      ],
      'P6 lists required tests; those tests still need implementation/execution before app activation.',
    ),
    check(
      'P8-RDY-060',
      'P7',
      'collectible_reward_assets',
      'Collectible reward asset gate must pass.',
      rel(repoRoot, artifactPaths.p7),
      checkStatus(p7Pass && b(p7Summary, 'readyForP8ReadinessExtension')),
      ['app-domain-activation', 'production-apply'],
      'none',
      'production-app',
      [
        `Asset files present: ${n(p7Summary, 'assetFilesPresent')}/${n(p7Summary, 'assetFilesExpected')}`,
        `Invalid WebP files: ${n(p7Summary, 'invalidWebpFiles')}`,
      ],
      'Collectible reward assets must remain mapped and valid before app activation.',
    ),
    check(
      'P8-RDY-061',
      'P7',
      'collectible_reward_assets',
      'French collectible text/locale activation contract must exist before reward text activation.',
      rel(repoRoot, artifactPaths.p7),
      checkStatus(b(p7Summary, 'readyForFrenchAssetActivation'), true),
      ['new-app-domain-generation', 'app-domain-activation', 'production-apply'],
      'new-app-domain',
      'production-app',
      [
        `readyForFrenchAssetActivation: ${b(p7Summary, 'readyForFrenchAssetActivation') ? 'true' : 'false'}`,
        `Spanish sidecar entries for these new sets: ${n(p7Summary, 'spanishSetSidecarEntries') + n(p7Summary, 'spanishCardSidecarEntries')}`,
      ],
      'Image assets are valid, but localized collectible text still needs its own French sidecar contract.',
    ),
    check(
      'P8-RDY-062',
      'P7',
      'collectible_reward_assets',
      'Untracked collectible asset files must be committed or explicitly approved before production apply.',
      rel(repoRoot, artifactPaths.p7),
      checkStatus(n(p7Summary, 'untrackedAssetFiles') === 0, true),
      ['production-apply'],
      'none',
      'production-app',
      [
        `Untracked asset files: ${n(p7Summary, 'untrackedAssetFiles')}`,
      ],
      'Production apply cannot silently depend on untracked image files.',
    ),
    check(
      'P8-RDY-070',
      'Existing',
      'lesson_rows',
      'Existing French lesson-row readiness must have zero generation blockers.',
      rel(repoRoot, artifactPaths.readinessGate),
      checkStatus(n(readinessSummary, 'generationBlockers') === 0),
      ['lesson-row-generation'],
      'lesson-rows',
      'none',
      [
        `Existing readiness generation blockers: ${n(readinessSummary, 'generationBlockers')}`,
      ],
      'Lesson-row generation/reviewer work remains separate from current-app domain expansion.',
    ),
    check(
      'P8-RDY-071',
      'Existing',
      'lesson_rows',
      'Generated French lesson rows must remain shape-valid and ready for reviewer handoff.',
      rel(repoRoot, artifactPaths.generatedContentAudit),
      checkStatus(b(generatedSummary, 'shapeValid') && b(generatedSummary, 'readyForReviewer')),
      ['reviewer-handoff'],
      'lesson-rows',
      'none',
      [
        `Generated French rows: ${n(generatedSummary, 'rowsWithFrench')}`,
        `Ready for reviewer: ${b(generatedSummary, 'readyForReviewer') ? 'true' : 'false'}`,
      ],
      'The existing 1600-row French package is reviewer-ready but not apply-ready.',
    ),
    check(
      'P8-RDY-080',
      'Existing',
      'production_apply',
      'Existing readiness apply blockers must be resolved before production apply.',
      rel(repoRoot, artifactPaths.readinessGate),
      checkStatus(n(readinessSummary, 'applyBlockers') === 0, true),
      ['production-apply'],
      'none',
      'production-app',
      [
        `Existing readiness apply blockers: ${n(readinessSummary, 'applyBlockers')}`,
      ],
      'Apply readiness is stricter than generation readiness.',
    ),
    check(
      'P8-RDY-081',
      'Existing',
      'production_apply',
      'LLM official-source reviewer decisions must be imported before production apply.',
      rel(repoRoot, artifactPaths.generatedContentAudit),
      checkStatus(b(generatedSummary, 'readyForApply'), true),
      ['production-apply'],
      'none',
      'production-app',
      [
        `Ready for apply: ${b(generatedSummary, 'readyForApply') ? 'true' : 'false'}`,
        `Rows accepted: ${n(generatedSummary, 'rowsAccepted')}`,
        `Activation-approved rows: ${n(generatedSummary, 'activationApprovedRows')}`,
      ],
      'The French package has rows, but LLM official-source decisions are still required before activation.',
    ),
    check(
      'P8-RDY-082',
      'Existing',
      'production_apply',
      'Explicit production app write approval must exist before modifying app files.',
      rel(repoRoot, artifactPaths.blockerReduction),
      checkStatus(b(blockerReductionSummary, 'mayModifyProductionAppFiles'), true),
      ['production-apply'],
      'none',
      'production-app',
      [
        `mayModifyProductionAppFiles: ${b(blockerReductionSummary, 'mayModifyProductionAppFiles') ? 'true' : 'false'}`,
      ],
      'This session is audit-only and must not imply production write approval.',
    ),
  ];

  for (const readinessCheck of checks) {
    if (readinessCheck.currentStatus === 'BLOCK') {
      addFinding(findings, 'blocker', 'p8_readiness_check_blocked', `Proposed readiness check is blocked: ${readinessCheck.id}.`, readinessCheck.sourceArtifact);
    }
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const appDomainGenerationStatus = statusFromBlockingChecks(checks, 'new-app-domain-generation');
  const appDomainActivationStatus = statusFromBlockingChecks(checks, 'app-domain-activation');
  const productionApplyStatus = statusFromBlockingChecks(checks, 'production-apply');
  const lessonGenerationStatus = statusFromBlockingChecks(checks, 'lesson-row-generation');
  const reviewerHandoffStatus = statusFromBlockingChecks(checks, 'reviewer-handoff');

  const domainReadiness: DomainReadiness[] = [
    {
      domain: 'lesson_rows',
      sourceArtifact: rel(repoRoot, artifactPaths.generatedContentAudit),
      contractStatus: 'PASS',
      generationStatus: lessonGenerationStatus,
      activationStatus: reviewerHandoffStatus,
      applyStatus: productionApplyStatus,
      generationBlockedBy: blockedBy(checks, 'lesson-row-generation'),
      activationBlockedBy: blockedBy(checks, 'reviewer-handoff'),
      applyBlockedBy: blockedBy(checks, 'production-apply'),
      notes: [
        'Existing 1600 French lesson rows are generated and reviewer-ready.',
        'Production activation still requires LLM official-source review/import and apply approval.',
      ],
    },
    {
      domain: 'ai_dialog_scenarios',
      sourceArtifact: rel(repoRoot, artifactPaths.p4),
      contractStatus: checks.find((entry) => entry.id === 'P8-RDY-030')?.currentStatus ?? 'BLOCK',
      generationStatus: checks.find((entry) => entry.id === 'P8-RDY-031')?.currentStatus ?? 'BLOCK',
      activationStatus: appDomainActivationStatus,
      applyStatus: productionApplyStatus,
      generationBlockedBy: blockedBy(checks.filter((entry) => entry.domain === 'ai_dialog_scenarios'), 'new-app-domain-generation'),
      activationBlockedBy: blockedBy(checks, 'app-domain-activation'),
      applyBlockedBy: blockedBy(checks, 'production-apply'),
      notes: ['Contract exists; French dialog generation/safety packet does not exist yet.'],
    },
    {
      domain: 'flashcard_marketplace_bundles',
      sourceArtifact: rel(repoRoot, artifactPaths.p5),
      contractStatus: checks.find((entry) => entry.id === 'P8-RDY-040')?.currentStatus ?? 'BLOCK',
      generationStatus: checks.find((entry) => entry.id === 'P8-RDY-041')?.currentStatus ?? 'BLOCK',
      activationStatus: appDomainActivationStatus,
      applyStatus: productionApplyStatus,
      generationBlockedBy: blockedBy(checks.filter((entry) => entry.domain === 'flashcard_marketplace_bundles'), 'new-app-domain-generation'),
      activationBlockedBy: blockedBy(checks, 'app-domain-activation'),
      applyBlockedBy: blockedBy(checks, 'production-apply'),
      notes: ['Contract exists; French bundle generation packet does not exist yet.'],
    },
    {
      domain: 'collectible_reward_assets',
      sourceArtifact: rel(repoRoot, artifactPaths.p7),
      contractStatus: checks.find((entry) => entry.id === 'P8-RDY-060')?.currentStatus ?? 'BLOCK',
      generationStatus: checks.find((entry) => entry.id === 'P8-RDY-061')?.currentStatus ?? 'BLOCK',
      activationStatus: appDomainActivationStatus,
      applyStatus: productionApplyStatus,
      generationBlockedBy: blockedBy(checks.filter((entry) => entry.domain === 'collectible_reward_assets'), 'new-app-domain-generation'),
      activationBlockedBy: blockedBy(checks, 'app-domain-activation'),
      applyBlockedBy: blockedBy(checks, 'production-apply'),
      notes: ['Assets are valid; French collectible text sidecar and asset tracking/approval are still required.'],
    },
    {
      domain: 'dirty_surface_state_guards',
      sourceArtifact: rel(repoRoot, artifactPaths.p6),
      contractStatus: checks.find((entry) => entry.id === 'P8-RDY-050')?.currentStatus ?? 'BLOCK',
      generationStatus: 'PASS',
      activationStatus: checks.find((entry) => entry.id === 'P8-RDY-051')?.currentStatus ?? 'BLOCK',
      applyStatus: productionApplyStatus,
      generationBlockedBy: [],
      activationBlockedBy: blockedBy(checks.filter((entry) => entry.domain === 'dirty_surface_state_guards'), 'app-domain-activation'),
      applyBlockedBy: blockedBy(checks, 'production-apply'),
      notes: ['State guards do not create translations; they gate app activation/apply only.'],
    },
  ];

  const report: Report = {
    schemaVersion: 'gustav-current-app-readiness-extension-packet-v0',
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' : 'BLOCK',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      p1SurfaceDeltaInventory: rel(repoRoot, artifactPaths.p1),
      p2DomainRegistryPacket: rel(repoRoot, artifactPaths.p2),
      aiDialogScenarioContractPacket: rel(repoRoot, artifactPaths.p4),
      flashcardBundleContractPacket: rel(repoRoot, artifactPaths.p5),
      dirtySurfaceStateGuardPacket: rel(repoRoot, artifactPaths.p6),
      collectibleRewardAssetGate: rel(repoRoot, artifactPaths.p7),
      readinessGate: rel(repoRoot, artifactPaths.readinessGate),
      readinessBlockerReductionPacket: rel(repoRoot, artifactPaths.blockerReduction),
      generatedContentAudit: rel(repoRoot, artifactPaths.generatedContentAudit),
    },
    summary: {
      requiredArtifacts: artifacts.filter((artifact) => artifact.requiredForP8).length,
      requiredArtifactsPresent: artifacts.filter((artifact) => artifact.requiredForP8 && artifact.exists).length,
      requiredArtifactsPassOrUsable: artifacts.filter((artifact) => artifact.requiredForP8 && artifact.exists && (artifact.status === 'PASS' || artifact.status === 'HOLD' || artifact.status === null)).length,
      readinessChecksToAdd: checks.length,
      checksCurrentlyPass: checks.filter((entry) => entry.currentStatus === 'PASS').length,
      checksCurrentlyHold: checks.filter((entry) => entry.currentStatus === 'HOLD').length,
      checksCurrentlyBlock: checks.filter((entry) => entry.currentStatus === 'BLOCK').length,
      generationBlockingChecks: checks.filter((entry) => entry.blocks.includes('lesson-row-generation') || entry.blocks.includes('new-app-domain-generation')).length,
      applyBlockingChecks: checks.filter((entry) => entry.blocks.includes('production-apply')).length,
      appDomainGenerationBlockingChecks: checks.filter((entry) => entry.blocks.includes('new-app-domain-generation')).length,
      appDomainActivationBlockingChecks: checks.filter((entry) => entry.blocks.includes('app-domain-activation')).length,
      productionApplyBlockingChecks: checks.filter((entry) => entry.blocks.includes('production-apply')).length,
      existingReadinessChecks: n(readinessSummary, 'checks'),
      existingReadinessGenerationBlockers: n(readinessSummary, 'generationBlockers'),
      existingReadinessApplyBlockers: n(readinessSummary, 'applyBlockers'),
      existingFrenchLessonRows: n(generatedSummary, 'rowsWithFrench'),
      existingFrenchLessonRowsReadyForReviewer: b(generatedSummary, 'readyForReviewer'),
      existingFrenchLessonRowsReadyForApply: b(generatedSummary, 'readyForApply'),
      readyForP9MasterManifest: blockers === 0,
      readyForFrenchLessonRowsGeneration: lessonGenerationStatus === 'PASS' && b(blockerReductionSummary, 'canStartFrenchGeneration'),
      readyForNewAppDomainFrenchGeneration: appDomainGenerationStatus === 'PASS',
      readyForFrenchAppDomainActivation: appDomainActivationStatus === 'PASS',
      readyForApply: productionApplyStatus === 'PASS',
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    artifacts,
    readinessChecksToAdd: checks,
    domainReadiness,
    generationVsApplyPolicy: [
      'Existing French lesson-row generation/reviewer readiness remains separate from current-app domain readiness.',
      'P8 may recommend readiness checks, but it does not edit `scripts/gustav_readiness_gate.ts`.',
      'New app-domain French generation requires dedicated generation packets for personal plans, dialogs, flashcard bundles, and collectible text.',
      'Dirty state surfaces and collectible image assets are activation/apply gates; they do not by themselves generate translations.',
      'Production apply remains blocked until LLM official-source reviewer decisions, apply blocker resolution, clean/approved dirty overlap, and explicit app-write approval exist.',
    ],
    requiredNextArtifacts: [
      'P9 expanded algorithm master manifest indexing P0-P8 plus existing French reviewer artifacts.',
      'French personal-plan generation packet before creating Echo/Gavan/Impuls French content.',
      'French AI-dialog generation and prompt-safety packet before translating scenario UI/prompt cells.',
      'French flashcard bundle generation packet before translating marketplace bundle content.',
      'French collectible text sidecar contract before activating localized collectible reward text.',
      'Target-aware state/storage/cloud/source-locale test results before app-domain activation.',
      'LLM official-source reviewer decision import before any production apply.',
      'Explicit production app write approval before any source file mutation.',
    ],
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      readinessGateModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      productionApplyApproved: false,
    },
  };

  const outJson = path.join(auditsDir, 'current_app_readiness_extension_packet.json');
  const outMd = path.join(auditsDir, 'current_app_readiness_extension_packet.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV current app readiness extension packet: ${report.status}`);
  console.log(`Readiness checks to add: ${report.summary.readinessChecksToAdd}`);
  console.log(`Checks currently PASS: ${report.summary.checksCurrentlyPass}`);
  console.log(`Checks currently HOLD: ${report.summary.checksCurrentlyHold}`);
  console.log(`Checks currently BLOCK: ${report.summary.checksCurrentlyBlock}`);
  console.log(`Ready for P9 master manifest: ${report.summary.readyForP9MasterManifest ? 'yes' : 'no'}`);
  console.log(`Ready for French lesson-row generation: ${report.summary.readyForFrenchLessonRowsGeneration ? 'yes' : 'no'}`);
  console.log(`Ready for new app-domain French generation: ${report.summary.readyForNewAppDomainFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (report.status !== 'PASS') {
    process.exitCode = 1;
  }
}

main();
