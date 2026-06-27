import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type TaskNode = {
  id: string;
  title: string;
  requiredBefore: string[];
  outputs: string[];
  acceptance: string[];
  productionWritesAllowed: false;
};

type WeaknessRecord = {
  weaknessId: string;
  detectedAt: string;
  detectedBy: string;
  triggerArtifact: string;
  domain: string;
  failureClass: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  escapedGate: string;
  rootCause: string;
  proposedRule: string;
  proposedGateChange: string;
  requiredRegression: string;
  status: 'open';
};

type JsonObject = Record<string, unknown>;

type Report = {
  schemaVersion: 'gustav-self-improving-pipeline-upgrade-packet-v0';
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
    planFilePresent: boolean;
    phasesDetected: number;
    taskGraphNodes: number;
    acceptanceGates: number;
    riskRegisterItems: number;
    weaknessLedgerRecords: number;
    unresolvedCriticalWeaknesses: number;
    generatedRows: number;
    researchPackPresent: boolean;
    appAtlasStale: boolean;
    generationHistoryReconciled: boolean;
    appAtlasRefreshPresent: boolean;
    domainRegistryV2Present: boolean;
    productionWritesAllowed: false;
    applyApprovalCreated: false;
    readyForP0P2: boolean;
    readyForResearchPackBuilder: boolean;
    readyForGenerationV2: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    blockers: number;
    warnings: number;
  };
  taskGraph: TaskNode[];
  acceptanceGates: string[];
  riskRegister: string[];
  weaknessLedgerSeed: WeaknessRecord[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    productionApplyApproved: false;
  };
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

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
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

function summaryOf(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return object(readJson<JsonObject>(filePath).summary);
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function task(id: string, title: string, requiredBefore: string[], outputs: string[], acceptance: string[]): TaskNode {
  return { id, title, requiredBefore, outputs, acceptance, productionWritesAllowed: false };
}

function taskGraph(): TaskNode[] {
  return [
    task('P0', 'State freeze and generation-history reconciliation', [], ['generation_history_reconciliation_audit.json'], ['Legacy rows remain reviewer candidates only.', 'No activation-approved row without research evidence.']),
    task('P1', 'App atlas auto-refresh gate', ['P0'], ['app_atlas.json', 'app_atlas_refresh_audit.json'], ['Current filesystem counts are recorded.', 'Every target-sensitive surface is classified or blocked.']),
    task('P2', 'Domain Contract Registry V2', ['P1'], ['algorithm_domain_registry_v2_packet.json'], ['Every domain declares target/source/ui fields, cache keys, evidence and activation gates.']),
    task('P3', 'Trusted research pack builder and verifier', ['P0', 'P1', 'P2'], ['research/fr_research_pack.json'], ['Every cluster has trusted sources.', 'No generation from single-source or shortcut research.']),
    task('P4', 'Target-language pedagogy blueprint', ['P3'], ['research/fr_pedagogy_blueprint.json'], ['Every content row maps to a blueprint node.', 'Resequence decisions are explicit.']),
    task('P5', 'Generation Schema V2', ['P4'], ['generation_schema_v2_audit.json'], ['Every generated row has research refs, pedagogy id, grammar cluster and transformation type.']),
    task('P6', 'Prompt and AI Contract V2', ['P2', 'P3'], ['ai_prompt_registry_audit.json', 'ai_output_language_contract_audit.json'], ['Rejected fresh AI text is never returned live or cached.', 'Cache keys include language dimensions.']),
    task('P7', 'Content Quality Gates V2', ['P5', 'P6'], ['target_content_evidence_audit.json', 'anti_calque_audit.json', 'quiz_design_quality_audit.json'], ['Meaning, naturalness, grammar and quiz quality pass before reviewer-ready.']),
    task('P8', 'Reviewer Workflow V2', ['P7'], ['reviewer_decision_template_v2.jsonl', 'review_progress_audit_v2.json'], ['Reviewer acceptance requires evidence checked and anti-calque/naturalness decisions.']),
    task('P9', 'Self-improvement loop and next-pass contract', ['P0'], ['pipeline_weakness_ledger.jsonl', 'pipeline_rule_update_packet.json', 'next_pass_goal_contract_packet.json', 'next_large_pass_plan.md'], ['Every blocker/warning produces a rule, gate, regression or accepted risk.', 'Every continue pass starts with a large goal and ends with the next large pass plan.']),
    task('P10', 'Master manifest and brain gate V2', ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9'], ['french_reviewer_master_manifest_v2.json', 'brain_gate_v2.json'], ['Brain gate proves isolation plus evidence-backed pedagogy readiness.']),
    task('P11', 'Production activation gate V2', ['P10'], ['production_activation_gate_v2.json'], ['No production writes without explicit approvals and fresh dirty-overlap proof.']),
  ];
}

function acceptanceGates(): string[] {
  return [
    'No real target-language generation may start while researchPackPresent=false.',
    'Existing generated rows without research evidence are legacy reviewer candidates only.',
    'No app-domain generation may run unless Domain Registry V2 covers the domain.',
    'Every AI feature that returns or caches generated text must have targetLocale/sourceLocale/uiLocale contracts.',
    'Every generated row must have targetLocale, sourceLocales, researchEvidenceIds, pedagogyBlueprintId, grammarClusterId and transformationType.',
    'Direct equivalents require anti-calque evidence; otherwise use adapted_expression, grammar_rebuild or needs_llm_pedagogy_design.',
    'Reviewer import requires a full decision file, evidence checked, dry-run clean and zero blockers.',
    'Production apply requires explicit approval receipts; audit-only packets cannot imply approval.',
    'Every blocker or warning must create or update a weakness-ledger record.',
    'Every continue pass must define one to three large goals, run verification, and write the next large pass plan before final response.',
  ];
}

function riskRegister(): string[] {
  return [
    'Legacy French rows exist before the real research pack; they must not be treated as app-ready content.',
    'The old surface inventory is stale relative to current app files.',
    'New AI explanations, weekly/stats insights and premium/dialog flows can leak wrong-language text if prompt/cache contracts are incomplete.',
    'Literal translation can produce bad lessons when target grammar requires different order, examples or distractors.',
    'Reviewer workflow V1 does not yet require researchEvidenceIds or anti-calque/naturalness decisions.',
    'A PASS brain gate today proves isolation/reviewer safety, not full evidence-backed unique-language pedagogy.',
  ];
}

function weaknessSeed(now: string, generatedRows: number, researchPackPresent: boolean, appAtlasStale: boolean): WeaknessRecord[] {
  const records: WeaknessRecord[] = [];
  if (!researchPackPresent && generatedRows > 0) {
    records.push({
      weaknessId: 'W-GUSTAV-0001-legacy-generated-without-real-research-pack',
      detectedAt: now,
      detectedBy: 'gustav_self_improving_pipeline_upgrade_packet',
      triggerArtifact: 'generated/fr/lessons/*_row_ledger.json',
      domain: 'lesson_rows',
      failureClass: 'research_evidence_gap',
      severity: 'critical',
      escapedGate: 'French rows were generated before Research Pack V2 became a hard pre-generation gate.',
      rootCause: 'Earlier pipeline separated reviewer safety from evidence-backed unique-language pedagogy.',
      proposedRule: 'No research pack, no generation; legacy rows can remain reviewer candidates only.',
      proposedGateChange: 'Add generation_history_reconciliation_audit and evidence coverage blockers before import/apply.',
      requiredRegression: 'Fixture with generated rows and researchPackPresent=false must keep readyForDecisionImport=false and readyForApply=false.',
      status: 'open',
    });
  }
  if (appAtlasStale) {
    records.push({
      weaknessId: 'W-GUSTAV-0002-stale-app-atlas-before-expansion',
      detectedAt: now,
      detectedBy: 'gustav_self_improving_pipeline_upgrade_packet',
      triggerArtifact: 'audits/current_app_surface_delta_inventory.json',
      domain: 'app_atlas',
      failureClass: 'stale_inventory',
      severity: 'high',
      escapedGate: 'Old surface inventory had fewer app TSX files than current filesystem.',
      rootCause: 'Pipeline did not refresh the atlas before expanding to new app domains.',
      proposedRule: 'Refresh app atlas before every new target language or major generation step.',
      proposedGateChange: 'Add app_atlas_refresh_audit and block unknown target-sensitive files.',
      requiredRegression: 'Fixture with changed app TSX count must report stale inventory and require Domain Registry V2 refresh.',
      status: 'open',
    });
  }
  records.push({
    weaknessId: 'W-GUSTAV-0003-generation-schema-v2-not-enforced',
    detectedAt: now,
    detectedBy: 'gustav_self_improving_pipeline_upgrade_packet',
    triggerArtifact: 'generated/fr/lessons/*_row_ledger.json',
    domain: 'generation_schema',
    failureClass: 'missing_contract_fields',
    severity: 'high',
    escapedGate: 'V1 generated rows can pass shape/reviewer gates without pedagogyBlueprintId, grammarClusterId or transformationType.',
    rootCause: 'Language isolation and reviewer shape checks existed before unique-language pedagogy fields were required.',
    proposedRule: 'Generated rows must satisfy Generation Schema V2 before decision import/apply.',
    proposedGateChange: 'Add generation_schema_v2 and target_content_evidence audits.',
    requiredRegression: 'Fixture row missing researchEvidenceIds or transformationType must block V2 reviewer import.',
    status: 'open',
  });
  records.push({
    weaknessId: 'W-GUSTAV-0004-ai-output-contract-v2-missing',
    detectedAt: now,
    detectedBy: 'gustav_self_improving_pipeline_upgrade_packet',
    triggerArtifact: 'app AI clients and functions/src AI features',
    domain: 'ai_prompt_contracts',
    failureClass: 'language_contract_gap',
    severity: 'high',
    escapedGate: 'New AI features can generate explanations/insights/dialogs without one central V2 prompt registry.',
    rootCause: 'Feature-level hardening exists but Gustav pipeline does not yet audit all AI prompt entrypoints from the refreshed atlas.',
    proposedRule: 'Every AI feature must declare targetLocale/sourceLocale/uiLocale and reject behavior before generation/cache.',
    proposedGateChange: 'Add ai_prompt_registry_audit and ai_output_language_contract_audit from app_atlas.json.',
    requiredRegression: 'Fixture with missing cache language dimension or rejected fresh text returned live must block.',
    status: 'open',
  });
  return records;
}

function readWeaknessJsonl(filePath: string): WeaknessRecord[] {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).map((line) => JSON.parse(line) as WeaknessRecord);
}

function writeMergedWeaknessLedger(filePath: string, seed: WeaknessRecord[]): WeaknessRecord[] {
  const existing = readWeaknessJsonl(filePath);
  const byId = new Map(existing.map((record) => [record.weaknessId, record]));
  for (const record of seed) {
    if (!byId.has(record.weaknessId)) byId.set(record.weaknessId, record);
  }
  const merged = Array.from(byId.values()).sort((a, bValue) => a.weaknessId.localeCompare(bValue.weaknessId));
  fs.writeFileSync(filePath, `${merged.map((record) => JSON.stringify(record)).join('\n')}\n`, 'utf8');
  return merged;
}

function countPlanPhases(planText: string): number {
  return (planText.match(/^### P\d+\./gm) ?? []).length;
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Self-Improving Pipeline Upgrade Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Plan file present: ${report.summary.planFilePresent ? 'yes' : 'no'}`,
    `- Phases detected: ${report.summary.phasesDetected}`,
    `- Task graph nodes: ${report.summary.taskGraphNodes}`,
    `- Acceptance gates: ${report.summary.acceptanceGates}`,
    `- Risk register items: ${report.summary.riskRegisterItems}`,
    `- Weakness ledger records: ${report.summary.weaknessLedgerRecords}`,
    `- Unresolved critical weaknesses: ${report.summary.unresolvedCriticalWeaknesses}`,
    `- Generated rows: ${report.summary.generatedRows}`,
    `- Research pack present: ${report.summary.researchPackPresent ? 'yes' : 'no'}`,
    `- App atlas stale: ${report.summary.appAtlasStale ? 'yes' : 'no'}`,
    `- Generation history reconciled: ${report.summary.generationHistoryReconciled ? 'yes' : 'no'}`,
    `- App atlas refresh present: ${report.summary.appAtlasRefreshPresent ? 'yes' : 'no'}`,
    `- Domain Registry V2 present: ${report.summary.domainRegistryV2Present ? 'yes' : 'no'}`,
    `- Ready for P0-P2: ${report.summary.readyForP0P2 ? 'yes' : 'no'}`,
    `- Ready for research pack builder: ${report.summary.readyForResearchPackBuilder ? 'yes' : 'no'}`,
    `- Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Production writes allowed: ${report.summary.productionWritesAllowed ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Task Graph',
    '',
  ];

  for (const node of report.taskGraph) {
    lines.push(`- \`${node.id}\` ${node.title}`);
    lines.push(`  - Requires: ${node.requiredBefore.length > 0 ? node.requiredBefore.map((id) => `\`${id}\``).join(', ') : '`none`'}`);
    lines.push(`  - Outputs: ${node.outputs.map((output) => `\`${output}\``).join(', ')}`);
  }

  lines.push('', '## Acceptance Gates', '');
  for (const gate of report.acceptanceGates) lines.push(`- ${gate}`);

  lines.push('', '## Weakness Ledger Seed', '');
  for (const weakness of report.weaknessLedgerSeed) {
    lines.push(`- \`${weakness.severity}\` \`${weakness.weaknessId}\`: ${weakness.proposedRule}`);
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
    '- This packet writes only Gustav run artifacts.',
    '- It does not modify production app files.',
    '- It does not modify generated French ledgers.',
    '- It does not write reviewer decisions.',
    '- It does not create apply approval.',
    '',
  );
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_self_improving_pipeline_upgrade_packet.ts --run <run-dir>');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  ensureDir(auditsDir);

  const planPath = path.join(auditsDir, 'self_improving_unique_language_pipeline_plan.md');
  const researchWorkOrderPath = path.join(auditsDir, 'french_research_work_order_audit.json');
  const currentAppDeltaPath = path.join(auditsDir, 'current_app_surface_delta_inventory.json');
  const generationHistoryPath = path.join(auditsDir, 'generation_history_reconciliation_audit.json');
  const appAtlasRefreshPath = path.join(auditsDir, 'app_atlas_refresh_audit.json');
  const domainRegistryV2Path = path.join(auditsDir, 'algorithm_domain_registry_v2_packet.json');
  const generatedContentAuditPath = path.join(auditsDir, 'generated_content_audit.json');
  const researchPackPath = path.join(runDir, 'research', 'fr_research_pack.json');
  const targetResearchPackVerifyPath = path.join(auditsDir, 'target_research_pack_verify_audit.json');
  const weaknessLedgerPath = path.join(auditsDir, 'pipeline_weakness_ledger.jsonl');
  const outJson = path.join(auditsDir, 'self_improving_pipeline_upgrade_packet.json');
  const outMd = path.join(auditsDir, 'self_improving_pipeline_upgrade_packet.md');

  const findings: Finding[] = [];
  if (!fs.existsSync(planPath)) addFinding(findings, 'blocker', 'plan_file_missing', 'Self-improving pipeline plan is missing.', rel(repoRoot, planPath));

  const planText = fs.existsSync(planPath) ? fs.readFileSync(planPath, 'utf8') : '';
  const researchSummary = summaryOf(researchWorkOrderPath);
  const currentAppSummary = summaryOf(currentAppDeltaPath);
  const generationHistorySummary = summaryOf(generationHistoryPath);
  const appAtlasSummary = summaryOf(appAtlasRefreshPath);
  const domainRegistryV2Summary = summaryOf(domainRegistryV2Path);
  const generatedContentSummary = summaryOf(generatedContentAuditPath);

  const generatedRows = n(generationHistorySummary, 'generatedRows') || n(generatedContentSummary, 'rows');
  const researchPackPresent =
    fs.existsSync(researchPackPath) ||
    b(researchSummary, 'researchPackPresent') ||
    b(generationHistorySummary, 'researchPackPresent');
  const appAtlasStale = b(appAtlasSummary, 'oldSurfaceInventoryStale') || n(currentAppSummary, 'currentAppTsxNotInOldInventory') > 0;
  const now = new Date().toISOString();
  const seed = weaknessSeed(now, generatedRows, researchPackPresent, appAtlasStale);
  const mergedWeaknesses = writeMergedWeaknessLedger(weaknessLedgerPath, seed);
  const unresolvedCriticalWeaknesses = mergedWeaknesses.filter((record) => record.status === 'open' && record.severity === 'critical').length;

  if (!researchPackPresent) {
    addFinding(findings, 'warning', 'research_pack_missing', 'Real research pack is still missing; Generation V2 remains blocked.');
  }
  if (appAtlasStale) {
    addFinding(findings, 'warning', 'app_atlas_was_stale', 'Previous app atlas/surface inventory was stale and must be refreshed before generation.');
  }
  if (!fs.existsSync(generationHistoryPath)) {
    addFinding(findings, 'warning', 'generation_history_not_yet_reconciled', 'P0 generation history reconciliation audit has not been generated yet.', rel(repoRoot, generationHistoryPath));
  }
  if (!fs.existsSync(appAtlasRefreshPath)) {
    addFinding(findings, 'warning', 'app_atlas_refresh_missing', 'P1 app atlas refresh audit has not been generated yet.', rel(repoRoot, appAtlasRefreshPath));
  }
  if (!fs.existsSync(domainRegistryV2Path)) {
    addFinding(findings, 'warning', 'domain_registry_v2_missing', 'P2 Domain Registry V2 packet has not been generated yet.', rel(repoRoot, domainRegistryV2Path));
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const graph = taskGraph();
  const gates = acceptanceGates();
  const risks = riskRegister();
  const p0p2Ready =
    blockers === 0 &&
    fs.existsSync(generationHistoryPath) &&
    fs.existsSync(appAtlasRefreshPath) &&
    fs.existsSync(domainRegistryV2Path) &&
    n(generationHistorySummary, 'blockers') === 0 &&
    n(appAtlasSummary, 'blockers') === 0 &&
    n(domainRegistryV2Summary, 'blockers') === 0;

  const report: Report = {
    schemaVersion: 'gustav-self-improving-pipeline-upgrade-packet-v0',
    runId,
    generatedAt: now,
    status: blockers > 0 ? 'BLOCK' : 'HOLD',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      plan: rel(repoRoot, planPath),
      researchWorkOrder: rel(repoRoot, researchWorkOrderPath),
      currentAppSurfaceDeltaInventory: rel(repoRoot, currentAppDeltaPath),
      generationHistoryReconciliationAudit: rel(repoRoot, generationHistoryPath),
      appAtlasRefreshAudit: rel(repoRoot, appAtlasRefreshPath),
      domainRegistryV2Packet: rel(repoRoot, domainRegistryV2Path),
      generatedContentAudit: rel(repoRoot, generatedContentAuditPath),
      researchPack: rel(repoRoot, researchPackPath),
      targetResearchPackVerifyAudit: rel(repoRoot, targetResearchPackVerifyPath),
    },
    outputs: {
      upgradePacketJson: rel(repoRoot, outJson),
      upgradePacketMd: rel(repoRoot, outMd),
      weaknessLedgerJsonl: rel(repoRoot, weaknessLedgerPath),
    },
    summary: {
      planFilePresent: fs.existsSync(planPath),
      phasesDetected: countPlanPhases(planText),
      taskGraphNodes: graph.length,
      acceptanceGates: gates.length,
      riskRegisterItems: risks.length,
      weaknessLedgerRecords: mergedWeaknesses.length,
      unresolvedCriticalWeaknesses,
      generatedRows,
      researchPackPresent,
      appAtlasStale,
      generationHistoryReconciled: fs.existsSync(generationHistoryPath) && n(generationHistorySummary, 'blockers') === 0,
      appAtlasRefreshPresent: fs.existsSync(appAtlasRefreshPath) && n(appAtlasSummary, 'blockers') === 0,
      domainRegistryV2Present: fs.existsSync(domainRegistryV2Path) && n(domainRegistryV2Summary, 'blockers') === 0,
      productionWritesAllowed: false,
      applyApprovalCreated: false,
      readyForP0P2: p0p2Ready,
      readyForResearchPackBuilder: p0p2Ready,
      readyForGenerationV2: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    taskGraph: graph,
    acceptanceGates: gates,
    riskRegister: risks,
    weaknessLedgerSeed: seed,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      productionApplyApproved: false,
    },
  };

  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV self-improving pipeline upgrade packet: ${report.status}`);
  console.log(`Task graph nodes: ${report.summary.taskGraphNodes}`);
  console.log(`Weakness ledger records: ${report.summary.weaknessLedgerRecords}`);
  console.log(`Unresolved critical weaknesses: ${report.summary.unresolvedCriticalWeaknesses}`);
  console.log(`Ready for P0-P2: ${report.summary.readyForP0P2 ? 'yes' : 'no'}`);
  console.log(`Ready for research pack builder: ${report.summary.readyForResearchPackBuilder ? 'yes' : 'no'}`);
  console.log(`Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
