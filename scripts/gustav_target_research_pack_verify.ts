import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
  jsonPath?: string;
};

type Probe = {
  id: string;
  expectedAccept: boolean;
  accepted: boolean;
  blockers: number;
  passed: boolean;
};

type ValidationResult = {
  findings: Finding[];
  metrics: Metrics;
};

type Metrics = {
  trustedSources: number;
  contractTrustedSources: number;
  additionalTrustedSources: number;
  requiredSourcesCovered: number;
  sourceChecks: number;
  grammarClusters: number;
  clusters: number;
  clusterDecisions: number;
  clustersWithTwoOrMoreSources: number;
  clustersWithRuUkComparison: number;
  clustersWithSourceGraphRefs: number;
  clustersTargetOutputBlocked: number;
  antiCalqueRules: number;
  falseFriendRules: number;
  registerRules: number;
  quizDesignRules: number;
  cefrGuidanceRows: number;
  forbiddenOutputKeys: number;
  forbiddenPermissionFlags: number;
  falseApprovalFlags: number;
};

type Report = {
  schemaVersion: 'gustav-target-research-pack-verify-audit-v0';
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
    targetLocale: 'fr';
    sourceLocales: number;
    researchPackPresent: boolean;
    canonicalResearchPackPath: boolean;
    builderPacketPresent: boolean;
    builderPacketPassed: boolean;
    generationHistoryRows: number;
    generatedRowsMissingResearchEvidenceIds: number;
    legacyGeneratedWithoutResearchPackRows: number;
    fixtureProbes: number;
    fixtureProbesPassed: number;
    readyForPedagogyBlueprint: boolean;
    readyForGenerationV2: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    blockers: number;
    warnings: number;
  };
  requiredSourceIds: string[];
  trustedSourceIds: string[];
  clusterIds: string[];
  probes: Probe[];
  findings: Finding[];
  safety: {
    researchOnlyAudit: true;
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    productionApplyApproved: false;
  };
};

type JsonObject = Record<string, unknown>;

const CONTRACT_SOURCE_IDS = [
  'cambridge_en_fr_dictionary',
  'oxford_french_usage_guide',
  'larousse_fr_dictionary',
  'le_robert_dictionary',
  'bescherelle_conjugation',
  'tv5monde_grammar',
  'oqlf_vitrine_linguistique',
  'academie_francaise_dire_ne_pas_dire',
];

const REQUIRED_SOURCE_IDS = [
  'council_of_europe_cefr',
  'tex_french_grammar',
  ...CONTRACT_SOURCE_IDS,
];

const REQUIRED_RESEARCH_FIELDS = [
  'clusterId',
  'sourceGraphRefs',
  'englishSourceSummary',
  'ruPromptSummary',
  'ukPromptSummary',
  'trustedSourceChecks',
  'frenchRuleDecision',
  'lessonOrderDecision',
  'translationRisks',
  'falseFriendRisks',
  'articleGenderNotes',
  'conjugationNotes',
  'quizDistractorPolicy',
  'personalPracticePolicy',
  'agentSignoffs',
  'unresolvedQuestions',
];

const FORBIDDEN_OUTPUT_KEYS = new Set([
  'proposedFrench',
  'wordsFr',
  'french',
  'introExamples',
  'quizPrompts',
  'examRows',
]);

const PERMISSION_FLAGS = new Set([
  'mayWriteAppSeed',
  'mayWriteIntroExamples',
  'mayWriteQuizOrExam',
  'mayDraftTargetText',
  'mayStartTranslationNow',
  'mayStartFrenchGeneration',
  'mayModifyProductionAppFiles',
]);

const APPROVAL_FLAGS = new Set([
  'approvedForApply',
  'approvedByReviewer',
  'approvedForDrafting',
  'appSeedApproved',
  'introApproved',
  'appSeedRuntimeAllowed',
  'introRuntimeAllowed',
]);

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function array<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
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

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function summaryOf(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return object(readJson<JsonObject>(filePath).summary);
}

function addFinding(
  findings: Finding[],
  severity: Severity,
  code: string,
  message: string,
  filePath?: string,
  jsonPath?: string,
): void {
  findings.push({ severity, code, message, path: filePath, jsonPath });
}

function isHttpsUrl(value: unknown): boolean {
  return typeof value === 'string' && /^https:\/\/\S+$/i.test(value);
}

function stringArray(value: unknown): string[] {
  return array(value).filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '');
}

function emptyMetrics(): Metrics {
  return {
    trustedSources: 0,
    contractTrustedSources: 0,
    additionalTrustedSources: 0,
    requiredSourcesCovered: 0,
    sourceChecks: 0,
    grammarClusters: 0,
    clusters: 0,
    clusterDecisions: 0,
    clustersWithTwoOrMoreSources: 0,
    clustersWithRuUkComparison: 0,
    clustersWithSourceGraphRefs: 0,
    clustersTargetOutputBlocked: 0,
    antiCalqueRules: 0,
    falseFriendRules: 0,
    registerRules: 0,
    quizDesignRules: 0,
    cefrGuidanceRows: 0,
    forbiddenOutputKeys: 0,
    forbiddenPermissionFlags: 0,
    falseApprovalFlags: 0,
  };
}

function jsonPathJoin(base: string, key: string | number): string {
  return typeof key === 'number' ? `${base}[${key}]` : `${base}.${key}`;
}

function inspectForbiddenKeys(value: unknown, filePath: string, jsonPath: string, findings: Finding[], metrics: Metrics): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => inspectForbiddenKeys(entry, filePath, jsonPathJoin(jsonPath, index), findings, metrics));
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, entry] of Object.entries(value as JsonObject)) {
    const currentPath = jsonPathJoin(jsonPath, key);
    if (FORBIDDEN_OUTPUT_KEYS.has(key)) {
      metrics.forbiddenOutputKeys += 1;
      addFinding(findings, 'blocker', 'forbidden_target_output_key_present', `Research pack must not contain target-output key ${key}.`, filePath, currentPath);
    }
    if (PERMISSION_FLAGS.has(key) && entry === true) {
      metrics.forbiddenPermissionFlags += 1;
      addFinding(findings, 'blocker', 'permission_flag_open', `Research pack must not open permission flag ${key}.`, filePath, currentPath);
    }
    if (APPROVAL_FLAGS.has(key) && entry === true) {
      metrics.falseApprovalFlags += 1;
      addFinding(findings, 'blocker', 'approval_flag_open', `Research pack must not set approval flag ${key}.`, filePath, currentPath);
    }
    inspectForbiddenKeys(entry, filePath, currentPath, findings, metrics);
  }
}

function validatePack(pack: JsonObject, filePath: string, canonicalPath: string, runId: string): ValidationResult {
  const findings: Finding[] = [];
  const metrics = emptyMetrics();
  const trustedSources = array<JsonObject>(pack.trustedSources);
  const trustedSourceIds = new Set(trustedSources.map((source) => s(source, 'id')).filter(Boolean));
  const sourcesChecked = new Set(stringArray(pack.sourcesChecked));
  const grammarClusters = array<JsonObject>(pack.grammarClusters);
  const clusters = array<JsonObject>(pack.clusters);
  const clusterDecisions = array<JsonObject>(pack.clusterDecisions);
  const sourceChecks = array<JsonObject>(pack.sourceChecks);

  metrics.trustedSources = trustedSources.length;
  metrics.contractTrustedSources = CONTRACT_SOURCE_IDS.filter((id) => trustedSourceIds.has(id)).length;
  metrics.additionalTrustedSources = REQUIRED_SOURCE_IDS.filter((id) => !CONTRACT_SOURCE_IDS.includes(id) && trustedSourceIds.has(id)).length;
  metrics.requiredSourcesCovered = REQUIRED_SOURCE_IDS.filter((id) => trustedSourceIds.has(id)).length;
  metrics.sourceChecks = sourceChecks.length;
  metrics.grammarClusters = grammarClusters.length;
  metrics.clusters = clusters.length;
  metrics.clusterDecisions = clusterDecisions.length;
  metrics.antiCalqueRules = array(pack.antiCalqueRules).length;
  metrics.falseFriendRules = array(pack.falseFriendRules).length;
  metrics.registerRules = array(pack.registerRules).length;
  metrics.quizDesignRules = array(pack.quizDesignRules).length;
  metrics.cefrGuidanceRows = array(pack.cefrLevelGuidance).length;

  if (path.normalize(filePath) !== path.normalize(canonicalPath)) {
    addFinding(findings, 'blocker', 'noncanonical_research_pack_path', 'Verifier only accepts the canonical research/fr_research_pack.json path.', filePath);
  }
  if (pack.schemaVersion !== 'gustav-fr-research-pack-v0') {
    addFinding(findings, 'blocker', 'schema_version_invalid', 'Research pack schemaVersion must be gustav-fr-research-pack-v0.', filePath, '$.schemaVersion');
  }
  if (pack.runId !== runId) addFinding(findings, 'blocker', 'run_id_mismatch', 'Research pack runId must match the active run.', filePath, '$.runId');
  if (pack.targetLocale !== 'fr' || pack.targetStudyLanguage !== 'fr') {
    addFinding(findings, 'blocker', 'target_locale_invalid', 'Research pack targetLocale and targetStudyLanguage must both be fr.', filePath);
  }
  if (JSON.stringify(pack.sourceLocales) !== JSON.stringify(['ru', 'uk'])) {
    addFinding(findings, 'blocker', 'source_locales_invalid', 'Research pack sourceLocales must be exactly ru,uk.', filePath, '$.sourceLocales');
  }

  if (trustedSources.length < REQUIRED_SOURCE_IDS.length) {
    addFinding(findings, 'blocker', 'trusted_source_count_low', 'Research pack must register all required trusted sources.', filePath, '$.trustedSources');
  }
  for (const id of REQUIRED_SOURCE_IDS) {
    if (!trustedSourceIds.has(id)) addFinding(findings, 'blocker', 'required_trusted_source_missing', `Required trusted source is missing: ${id}.`, filePath, '$.trustedSources');
  }
  for (const id of CONTRACT_SOURCE_IDS) {
    if (!sourcesChecked.has(id)) addFinding(findings, 'blocker', 'contract_source_not_checked', `Contract source is not listed in sourcesChecked: ${id}.`, filePath, '$.sourcesChecked');
  }
  for (const [index, source] of trustedSources.entries()) {
    if (!s(source, 'id')) addFinding(findings, 'blocker', 'trusted_source_id_missing', 'Trusted source is missing id.', filePath, `$.trustedSources[${index}].id`);
    if (!isHttpsUrl(source.url)) addFinding(findings, 'blocker', 'trusted_source_url_invalid', `Trusted source ${s(source, 'id') || index} must use an https URL.`, filePath, `$.trustedSources[${index}].url`);
    if (!s(source, 'checkedOnlineAt')) addFinding(findings, 'blocker', 'trusted_source_checked_at_missing', `Trusted source ${s(source, 'id') || index} is missing checkedOnlineAt.`, filePath, `$.trustedSources[${index}].checkedOnlineAt`);
    if (!s(source, 'evidenceSummary')) addFinding(findings, 'blocker', 'trusted_source_evidence_missing', `Trusted source ${s(source, 'id') || index} is missing evidenceSummary.`, filePath, `$.trustedSources[${index}].evidenceSummary`);
  }

  const fields = new Set(stringArray(pack.requiredResearchFields));
  for (const field of REQUIRED_RESEARCH_FIELDS) {
    if (!fields.has(field)) addFinding(findings, 'blocker', 'required_research_field_missing', `Required research field is missing: ${field}.`, filePath, '$.requiredResearchFields');
  }

  const grammarClusterIds = new Set(grammarClusters.map((cluster) => s(cluster, 'id')).filter(Boolean));
  const clusterIds = new Set(clusters.map((cluster) => s(cluster, 'clusterId')).filter(Boolean));
  const decisionIds = new Set(clusterDecisions.map((cluster) => s(cluster, 'clusterId')).filter(Boolean));
  if (grammarClusters.length < 12 || clusters.length < 12 || clusterDecisions.length < 12) {
    addFinding(findings, 'blocker', 'cluster_count_low', 'Research pack must define at least 12 grammar clusters, clusters and cluster decisions.', filePath);
  }
  for (const id of grammarClusterIds) {
    if (!clusterIds.has(id)) addFinding(findings, 'blocker', 'cluster_decision_missing_from_clusters', `Grammar cluster missing from clusters: ${id}.`, filePath, '$.clusters');
    if (!decisionIds.has(id)) addFinding(findings, 'blocker', 'cluster_decision_missing', `Grammar cluster missing from clusterDecisions: ${id}.`, filePath, '$.clusterDecisions');
  }

  for (const [index, check] of sourceChecks.entries()) {
    const sourceId = s(check, 'sourceId');
    if (!sourceId || !trustedSourceIds.has(sourceId)) {
      addFinding(findings, 'blocker', 'source_check_unregistered_source', `Source check references unregistered source: ${sourceId || '(missing)'}.`, filePath, `$.sourceChecks[${index}].sourceId`);
    }
  }

  for (const [index, cluster] of clusters.entries()) {
    const clusterId = s(cluster, 'clusterId') || `(index ${index})`;
    const clusterPath = `$.clusters[${index}]`;
    const checks = array<JsonObject>(cluster.trustedSourceChecks);
    const checkSourceIds = checks.map((check) => s(check, 'sourceId')).filter(Boolean);
    if (checks.length >= 2) metrics.clustersWithTwoOrMoreSources += 1;
    if (stringArray(cluster.sourceGraphRefs).length > 0) metrics.clustersWithSourceGraphRefs += 1;
    if (s(cluster, 'ruPromptSummary').trim() !== '' && s(cluster, 'ukPromptSummary').trim() !== '') metrics.clustersWithRuUkComparison += 1;
    if (cluster.targetOutputAllowed === false) metrics.clustersTargetOutputBlocked += 1;

    if (checks.length < 2) addFinding(findings, 'blocker', 'cluster_source_count_low', `Cluster ${clusterId} must have at least two trusted source checks.`, filePath, `${clusterPath}.trustedSourceChecks`);
    if (stringArray(cluster.sourceGraphRefs).length === 0) addFinding(findings, 'blocker', 'cluster_source_graph_refs_missing', `Cluster ${clusterId} is missing sourceGraphRefs.`, filePath, `${clusterPath}.sourceGraphRefs`);
    if (s(cluster, 'ruPromptSummary').trim() === '' || s(cluster, 'ukPromptSummary').trim() === '') {
      addFinding(findings, 'blocker', 'cluster_ru_uk_comparison_missing', `Cluster ${clusterId} must carry RU and UK source-locale comparison summaries.`, filePath, clusterPath);
    }
    if (cluster.targetOutputAllowed !== false) addFinding(findings, 'blocker', 'cluster_target_output_not_blocked', `Cluster ${clusterId} must keep targetOutputAllowed=false.`, filePath, `${clusterPath}.targetOutputAllowed`);
    for (const sourceId of checkSourceIds) {
      if (!trustedSourceIds.has(sourceId)) addFinding(findings, 'blocker', 'cluster_unregistered_source', `Cluster ${clusterId} references unregistered source ${sourceId}.`, filePath, `${clusterPath}.trustedSourceChecks`);
    }
  }

  if (metrics.antiCalqueRules < 1) addFinding(findings, 'blocker', 'anti_calque_rules_missing', 'Research pack must define anti-calque rules.', filePath, '$.antiCalqueRules');
  if (metrics.falseFriendRules < 1) addFinding(findings, 'blocker', 'false_friend_rules_missing', 'Research pack must define false-friend rules.', filePath, '$.falseFriendRules');
  if (metrics.registerRules < 1) addFinding(findings, 'blocker', 'register_rules_missing', 'Research pack must define register/naturalness rules.', filePath, '$.registerRules');
  if (metrics.quizDesignRules < 1) addFinding(findings, 'blocker', 'quiz_design_rules_missing', 'Research pack must define quiz design rules.', filePath, '$.quizDesignRules');
  if (metrics.cefrGuidanceRows < 3) addFinding(findings, 'blocker', 'cefr_guidance_missing', 'Research pack must define A1/A2/B1 CEFR guidance rows.', filePath, '$.cefrLevelGuidance');

  if (pack.containsFrenchOutput !== false || pack.containsTargetContentOutput !== false || pack.translationBatchStarted !== false) {
    addFinding(findings, 'blocker', 'target_output_shortcut_open', 'Research pack must explicitly keep target output and translation batch flags false.', filePath);
  }
  if (pack.rejectedShortcutPoliciesAcknowledged !== true) {
    addFinding(findings, 'blocker', 'shortcut_policy_not_acknowledged', 'Research pack must acknowledge rejected shortcut policies.', filePath, '$.rejectedShortcutPoliciesAcknowledged');
  }

  inspectForbiddenKeys(pack, filePath, '$', findings, metrics);
  return { findings, metrics };
}

function runProbes(pack: JsonObject, canonicalPath: string, runId: string): Probe[] {
  const probes: Array<{ id: string; expectedAccept: boolean; pack: JsonObject; filePath: string }> = [];

  probes.push({ id: 'canonical_real_pack_accepts', expectedAccept: true, pack: cloneJson(pack), filePath: canonicalPath });

  const wrongPath = cloneJson(pack);
  probes.push({ id: 'wrong_path_rejected', expectedAccept: false, pack: wrongPath, filePath: path.join(path.dirname(canonicalPath), 'not_canonical.json') });

  const singleSource = cloneJson(pack);
  const singleCluster = object(array(singleSource.clusters)[0]);
  singleCluster.trustedSourceChecks = array(singleCluster.trustedSourceChecks).slice(0, 1);
  probes.push({ id: 'single_source_cluster_rejected', expectedAccept: false, pack: singleSource, filePath: canonicalPath });

  const missingRuUk = cloneJson(pack);
  const missingCluster = object(array(missingRuUk.clusters)[0]);
  delete missingCluster.ruPromptSummary;
  delete missingCluster.ukPromptSummary;
  probes.push({ id: 'missing_ru_uk_comparison_rejected', expectedAccept: false, pack: missingRuUk, filePath: canonicalPath });

  const missingFields = cloneJson(pack);
  missingFields.requiredResearchFields = stringArray(missingFields.requiredResearchFields).filter((field) => field !== 'pedagogyBlueprintId' && field !== 'trustedSourceChecks');
  probes.push({ id: 'missing_required_field_rejected', expectedAccept: false, pack: missingFields, filePath: canonicalPath });

  const shortcutOpen = cloneJson(pack);
  shortcutOpen.translationBatchStarted = true;
  shortcutOpen.mayStartFrenchGeneration = true;
  shortcutOpen.proposedFrench = 'blocked fixture target output';
  probes.push({ id: 'shortcut_flags_rejected', expectedAccept: false, pack: shortcutOpen, filePath: canonicalPath });

  return probes.map((probe) => {
    const result = validatePack(probe.pack, probe.filePath, canonicalPath, runId);
    const blockers = result.findings.filter((finding) => finding.severity === 'blocker').length;
    const accepted = blockers === 0;
    return {
      id: probe.id,
      expectedAccept: probe.expectedAccept,
      accepted,
      blockers,
      passed: accepted === probe.expectedAccept,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Target Research Pack Verify Audit',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Research pack present: ${report.summary.researchPackPresent ? 'yes' : 'no'}`,
    `- Canonical research pack path: ${report.summary.canonicalResearchPackPath ? 'yes' : 'no'}`,
    `- Builder packet passed: ${report.summary.builderPacketPassed ? 'yes' : 'no'}`,
    `- Trusted sources: ${report.summary.trustedSources}`,
    `- Required sources covered: ${report.summary.requiredSourcesCovered}/${report.requiredSourceIds.length}`,
    `- Grammar clusters: ${report.summary.grammarClusters}`,
    `- Clusters with two or more sources: ${report.summary.clustersWithTwoOrMoreSources}`,
    `- Clusters with RU/UK comparison: ${report.summary.clustersWithRuUkComparison}`,
    `- Clusters target-output blocked: ${report.summary.clustersTargetOutputBlocked}`,
    `- Forbidden output keys: ${report.summary.forbiddenOutputKeys}`,
    `- Forbidden permission flags: ${report.summary.forbiddenPermissionFlags}`,
    `- Fixture probes passed: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Generated rows missing researchEvidenceIds: ${report.summary.generatedRowsMissingResearchEvidenceIds}`,
    `- Ready for pedagogy blueprint: ${report.summary.readyForPedagogyBlueprint ? 'yes' : 'no'}`,
    `- Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Probes',
    '',
  ];

  for (const probe of report.probes) {
    lines.push(`- \`${probe.id}\`: ${probe.passed ? 'pass' : 'fail'} (expected accept=${probe.expectedAccept ? 'yes' : 'no'}, actual accept=${probe.accepted ? 'yes' : 'no'}, blockers=${probe.blockers})`);
  }

  lines.push('', '## Trusted Sources', '');
  for (const id of report.trustedSourceIds) lines.push(`- \`${id}\``);

  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path}${finding.jsonPath ? ` ${finding.jsonPath}` : ''})` : ''}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  const targetArg = argValue('--target') ?? 'fr';
  if (!runArg || targetArg !== 'fr') {
    throw new Error('Usage: npx tsx scripts/gustav_target_research_pack_verify.ts --run <run-dir> --target fr');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const researchPackPath = path.join(runDir, 'research', 'fr_research_pack.json');
  const builderPacketPath = path.join(auditsDir, 'target_research_pack_builder_packet.json');
  const generationHistoryPath = path.join(auditsDir, 'generation_history_reconciliation_audit.json');
  const domainRegistryPath = path.join(auditsDir, 'algorithm_domain_registry_v2_packet.json');
  const outJson = path.join(auditsDir, 'target_research_pack_verify_audit.json');
  const outMd = path.join(auditsDir, 'target_research_pack_verify_audit.md');
  ensureDir(auditsDir);

  const findings: Finding[] = [];
  if (!fs.existsSync(researchPackPath)) addFinding(findings, 'blocker', 'research_pack_missing', 'Canonical research pack is missing.', rel(repoRoot, researchPackPath));
  if (!fs.existsSync(builderPacketPath)) addFinding(findings, 'blocker', 'builder_packet_missing', 'Research pack builder packet is missing.', rel(repoRoot, builderPacketPath));
  if (!fs.existsSync(generationHistoryPath)) addFinding(findings, 'blocker', 'generation_history_missing', 'Generation history reconciliation audit is missing.', rel(repoRoot, generationHistoryPath));
  if (!fs.existsSync(domainRegistryPath)) addFinding(findings, 'blocker', 'domain_registry_missing', 'Domain Registry V2 packet is missing.', rel(repoRoot, domainRegistryPath));

  const builderSummary = summaryOf(builderPacketPath);
  const generationHistorySummary = summaryOf(generationHistoryPath);
  const builderPacketPassed = fs.existsSync(builderPacketPath) && n(builderSummary, 'blockers') === 0 && b(builderSummary, 'researchPackPresent');
  if (fs.existsSync(builderPacketPath) && !builderPacketPassed) {
    addFinding(findings, 'blocker', 'builder_packet_not_passed', 'Research pack builder packet must pass before verifier can unlock P4.', rel(repoRoot, builderPacketPath));
  }

  let pack: JsonObject = {};
  let validation = { findings: [] as Finding[], metrics: emptyMetrics() };
  let probes: Probe[] = [];
  if (fs.existsSync(researchPackPath)) {
    pack = object(readJson<unknown>(researchPackPath));
    validation = validatePack(pack, researchPackPath, researchPackPath, runId);
    probes = runProbes(pack, researchPackPath, runId);
    findings.push(...validation.findings.map((finding) => ({
      ...finding,
      path: finding.path ? rel(repoRoot, finding.path) : finding.path,
    })));
    for (const probe of probes) {
      if (!probe.passed) addFinding(findings, 'blocker', 'fixture_probe_failed', `Verifier fixture probe failed: ${probe.id}.`);
    }
  }

  const metrics = validation.metrics;
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const fixtureProbesPassed = probes.filter((probe) => probe.passed).length;
  const readyForPedagogyBlueprint =
    blockers === 0 &&
    builderPacketPassed &&
    metrics.requiredSourcesCovered === REQUIRED_SOURCE_IDS.length &&
    metrics.clustersWithTwoOrMoreSources === metrics.clusters &&
    metrics.clustersWithRuUkComparison === metrics.clusters &&
    metrics.clustersTargetOutputBlocked === metrics.clusters &&
    fixtureProbesPassed === probes.length;

  const report: Report = {
    schemaVersion: 'gustav-target-research-pack-verify-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      researchPack: rel(repoRoot, researchPackPath),
      builderPacket: rel(repoRoot, builderPacketPath),
      generationHistoryReconciliationAudit: rel(repoRoot, generationHistoryPath),
      algorithmDomainRegistryV2Packet: rel(repoRoot, domainRegistryPath),
    },
    outputs: {
      verifyAuditJson: rel(repoRoot, outJson),
      verifyAuditMd: rel(repoRoot, outMd),
    },
    summary: {
      ...metrics,
      targetLocale: 'fr',
      sourceLocales: stringArray(pack.sourceLocales).length,
      researchPackPresent: fs.existsSync(researchPackPath),
      canonicalResearchPackPath: true,
      builderPacketPresent: fs.existsSync(builderPacketPath),
      builderPacketPassed,
      generationHistoryRows: n(generationHistorySummary, 'generatedRows'),
      generatedRowsMissingResearchEvidenceIds: n(generationHistorySummary, 'generatedRowsMissingResearchEvidenceIds'),
      legacyGeneratedWithoutResearchPackRows: n(generationHistorySummary, 'legacyGeneratedWithoutResearchPackRows'),
      fixtureProbes: probes.length,
      fixtureProbesPassed,
      readyForPedagogyBlueprint,
      readyForGenerationV2: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    requiredSourceIds: REQUIRED_SOURCE_IDS,
    trustedSourceIds: array<JsonObject>(pack.trustedSources).map((source) => s(source, 'id')).filter(Boolean),
    clusterIds: array<JsonObject>(pack.clusters).map((cluster) => s(cluster, 'clusterId')).filter(Boolean),
    probes,
    findings,
    safety: {
      researchOnlyAudit: true,
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      productionApplyApproved: false,
    },
  };

  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV target research pack verifier: ${report.status}`);
  console.log(`Trusted sources verified: ${report.summary.requiredSourcesCovered}/${report.requiredSourceIds.length}`);
  console.log(`Grammar clusters verified: ${report.summary.clusters}`);
  console.log(`Fixture probes passed: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Ready for pedagogy blueprint: ${report.summary.readyForPedagogyBlueprint ? 'yes' : 'no'}`);
  console.log(`Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
