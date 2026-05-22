import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  filePath?: string;
};

type ResearchPackProbe = {
  id: string;
  filePath: string;
  exists: boolean;
  source: 'real_candidate' | 'temp_fixture';
  parseableJson: boolean;
  schemaValid: boolean;
  runIdMatches: boolean;
  targetMatches: boolean;
  sourceLocalesMatch: boolean;
  trustedSourcesComplete: boolean;
  requiredFieldsComplete: boolean;
  clustersComplete: boolean;
  everyClusterHasTwoSources: boolean;
  everyClusterHasRuUkComparison: boolean;
  shortcutsRejected: boolean;
  noFrenchOutput: boolean;
  acceptedPackPath: boolean;
  wouldAcceptResearchPack: boolean;
  expectedAccept: boolean;
  rejectionReason: string;
};

type Audit = {
  schemaVersion: 'gustav-french-research-pack-firewall-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    frenchResearchPackContractAudit: string;
    translationStartGate: string;
  };
  summary: {
    targetStudyLanguage: 'fr';
    realPackCandidates: number;
    realPacksPresent: number;
    exactPackMatches: number;
    tempFixtures: number;
    rejectedTempFixtures: number;
    acceptedShapeFixtures: number;
    tempExactShapeBlockedByPath: number;
    singleSourceFixtures: number;
    singleSourceFixturesRejected: number;
    missingRuUkFixtures: number;
    missingRuUkFixturesRejected: number;
    missingFieldsFixtures: number;
    missingFieldsFixturesRejected: number;
    shortcutFixtures: number;
    shortcutFixturesRejected: number;
    frenchOutputFixtures: number;
    frenchOutputFixturesRejected: number;
    blockers: number;
    warnings: number;
    firewallPassed: boolean;
    requiresCanonicalPackPath: boolean;
    requiresTwoSourceClusterEvidence: boolean;
    requiresRuUkComparison: boolean;
    requiresRequiredFields: boolean;
    requiresShortcutRejection: boolean;
    requiresNoFrenchOutput: boolean;
    researchPackStillMissing: boolean;
    mayStartTranslationNow: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
    noFrenchContentGenerated: boolean;
  };
  researchPackFirewall: {
    canonicalResearchPackPath: string;
    acceptedResearchPackPaths: string[];
    targetStudyLanguage: 'fr';
    sourceLocales: Array<'ru' | 'uk'>;
    requiredSourceIds: string[];
    requiredClusterIds: string[];
    requiredResearchFields: string[];
    rejectionOrder: string[];
  };
  tempFixtureRoot: string;
  researchPackProbes: ResearchPackProbe[];
  findings: Finding[];
  notes: string[];
};

const REQUIRED_SOURCE_IDS = [
  'cambridge_en_fr_dictionary',
  'oxford_french_usage_guide',
  'larousse_fr_dictionary',
  'le_robert_dictionary',
  'bescherelle_conjugation',
  'tv5monde_grammar',
  'oqlf_vitrine_linguistique',
  'academie_francaise_dire_ne_pas_dire',
];

const REQUIRED_CLUSTER_IDS = [
  'articles_gender_number',
  'present_tense_agreement',
  'negation',
  'questions_word_order',
  'prepositions_articles',
  'pronouns_order',
  'past_tenses',
  'future_conditionals',
  'subjunctive_modality',
  'register_and_naturalness',
  'personal_practice_mapping',
  'quiz_distractors',
];

const REQUIRED_FIELDS = [
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

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arr<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function sameStringArray(left: unknown, right: string[]): boolean {
  const values = arr<string>(left).filter((entry) => typeof entry === 'string');
  return values.length === right.length && values.every((entry, index) => entry === right[index]);
}

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function buildValidPack(runId: string): Record<string, unknown> {
  const clusters = REQUIRED_CLUSTER_IDS.map((clusterId) => ({
    clusterId,
    sourceGraphRefs: [`source_graph:${clusterId}:placeholder`],
    englishSourceSummary: 'English source meaning summarized for research only.',
    ruPromptSummary: 'Russian source-locale prompt summarized for research only.',
    ukPromptSummary: 'Ukrainian source-locale prompt summarized for research only.',
    trustedSourceChecks: [
      {
        sourceId: REQUIRED_SOURCE_IDS[0],
        checkedPoint: 'meaning and usage',
        decision: 'research-only decision, no target content',
      },
      {
        sourceId: REQUIRED_SOURCE_IDS[1],
        checkedPoint: 'grammar and learner risk',
        decision: 'research-only decision, no target content',
      },
    ],
    frenchRuleDecision: 'research-only rule decision, no translated output',
    lessonOrderDecision: 'keep or rebuild lesson order after architecture gate',
    translationRisks: ['calque risk must be checked before output'],
    falseFriendRisks: ['false friends must be checked before output'],
    articleGenderNotes: 'research-only note',
    conjugationNotes: 'research-only note',
    quizDistractorPolicy: 'single correct answer required',
    personalPracticePolicy: 'target-scoped remediation required',
    agentSignoffs: ['translation_director', 'french_grammar_researcher', 'runtime_shape_auditor'],
    unresolvedQuestions: [],
  }));
  return {
    schemaVersion: 'gustav-fr-research-pack-v0',
    runId,
    targetStudyLanguage: 'fr',
    sourceLocales: ['ru', 'uk'],
    sourcesChecked: REQUIRED_SOURCE_IDS,
    requiredResearchFields: REQUIRED_FIELDS,
    clusters,
    rejectedShortcutPoliciesAcknowledged: true,
    containsFrenchOutput: false,
    translationBatchStarted: false,
    generatedAt: new Date().toISOString(),
  };
}

function validateResearchPack(
  id: string,
  filePath: string,
  source: 'real_candidate' | 'temp_fixture',
  acceptedResearchPackPaths: string[],
  expectedRunId: string,
  expectedAccept: boolean,
): ResearchPackProbe {
  const acceptedPackPath = acceptedResearchPackPaths.includes(filePath);
  const exists = fs.existsSync(filePath);
  let parsedUnknown: unknown = null;
  let parseableJson = false;

  if (exists && filePath.endsWith('.json')) {
    try {
      parsedUnknown = readJson<unknown>(filePath);
      parseableJson = true;
    } catch {
      parsedUnknown = null;
    }
  }

  const parsed = object(parsedUnknown);
  const clusters = arr<Record<string, unknown>>(parsed.clusters);
  const schemaValid = parsed.schemaVersion === 'gustav-fr-research-pack-v0';
  const runIdMatches = parsed.runId === expectedRunId;
  const targetMatches = parsed.targetStudyLanguage === 'fr';
  const sourceLocalesMatch = sameStringArray(parsed.sourceLocales, ['ru', 'uk']);
  const trustedSourcesComplete = sameStringArray(parsed.sourcesChecked, REQUIRED_SOURCE_IDS);
  const requiredFieldsComplete = sameStringArray(parsed.requiredResearchFields, REQUIRED_FIELDS);
  const clustersComplete =
    clusters.length === REQUIRED_CLUSTER_IDS.length &&
    REQUIRED_CLUSTER_IDS.every((clusterId) => clusters.some((cluster) => cluster.clusterId === clusterId));
  const everyClusterHasTwoSources = clustersComplete && clusters.every((cluster) => arr(cluster.trustedSourceChecks).length >= 2);
  const everyClusterHasRuUkComparison = clustersComplete && clusters.every((cluster) =>
    typeof cluster.ruPromptSummary === 'string' &&
    String(cluster.ruPromptSummary).length > 0 &&
    typeof cluster.ukPromptSummary === 'string' &&
    String(cluster.ukPromptSummary).length > 0
  );
  const shortcutsRejected = parsed.rejectedShortcutPoliciesAcknowledged === true;
  const noFrenchOutput = parsed.containsFrenchOutput === false && parsed.translationBatchStarted === false;
  const wouldAcceptResearchPack =
    exists &&
    parseableJson &&
    schemaValid &&
    runIdMatches &&
    targetMatches &&
    sourceLocalesMatch &&
    trustedSourcesComplete &&
    requiredFieldsComplete &&
    clustersComplete &&
    everyClusterHasTwoSources &&
    everyClusterHasRuUkComparison &&
    shortcutsRejected &&
    noFrenchOutput &&
    acceptedPackPath;
  const rejectionReason = wouldAcceptResearchPack
    ? 'accepted'
    : !exists
      ? 'research_pack_absent'
      : !parseableJson
        ? 'not_parseable_json'
        : !schemaValid
          ? 'schema_mismatch'
          : !runIdMatches
            ? 'run_id_mismatch'
            : !targetMatches
              ? 'target_mismatch'
              : !sourceLocalesMatch
                ? 'source_locales_missing_or_wrong'
                : !trustedSourcesComplete
                  ? 'trusted_sources_incomplete'
                  : !requiredFieldsComplete
                    ? 'required_fields_incomplete'
                    : !clustersComplete
                      ? 'grammar_clusters_incomplete'
                      : !everyClusterHasTwoSources
                        ? 'cluster_lacks_two_sources'
                        : !everyClusterHasRuUkComparison
                          ? 'ru_uk_comparison_missing'
                          : !shortcutsRejected
                            ? 'shortcut_policy_not_rejected'
                            : !noFrenchOutput
                              ? 'french_output_started'
                              : !acceptedPackPath
                                ? 'research_pack_path_not_accepted'
                                : 'unknown';

  return {
    id,
    filePath,
    exists,
    source,
    parseableJson,
    schemaValid,
    runIdMatches,
    targetMatches,
    sourceLocalesMatch,
    trustedSourcesComplete,
    requiredFieldsComplete,
    clustersComplete,
    everyClusterHasTwoSources,
    everyClusterHasRuUkComparison,
    shortcutsRejected,
    noFrenchOutput,
    acceptedPackPath,
    wouldAcceptResearchPack,
    expectedAccept,
    rejectionReason,
  };
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV French Research Pack Firewall Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Real pack candidates: ${audit.summary.realPackCandidates}`,
    `- Real packs present: ${audit.summary.realPacksPresent}`,
    `- Exact pack matches: ${audit.summary.exactPackMatches}`,
    `- Temp fixtures: ${audit.summary.tempFixtures}`,
    `- Rejected temp fixtures: ${audit.summary.rejectedTempFixtures}`,
    `- Accepted shape fixtures: ${audit.summary.acceptedShapeFixtures}`,
    `- Temp exact shape blocked by path: ${audit.summary.tempExactShapeBlockedByPath}`,
    `- Single-source fixtures rejected: ${audit.summary.singleSourceFixturesRejected}/${audit.summary.singleSourceFixtures}`,
    `- Missing RU/UK fixtures rejected: ${audit.summary.missingRuUkFixturesRejected}/${audit.summary.missingRuUkFixtures}`,
    `- Missing fields fixtures rejected: ${audit.summary.missingFieldsFixturesRejected}/${audit.summary.missingFieldsFixtures}`,
    `- Shortcut fixtures rejected: ${audit.summary.shortcutFixturesRejected}/${audit.summary.shortcutFixtures}`,
    `- French output fixtures rejected: ${audit.summary.frenchOutputFixturesRejected}/${audit.summary.frenchOutputFixtures}`,
    `- Firewall passed: ${audit.summary.firewallPassed ? 'yes' : 'no'}`,
    `- Research pack still missing: ${audit.summary.researchPackStillMissing ? 'yes' : 'no'}`,
    `- May start translation now: ${audit.summary.mayStartTranslationNow ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Probe Results',
    '',
  ];

  for (const probe of audit.researchPackProbes) {
    lines.push(`- \`${probe.id}\`: accept=${probe.wouldAcceptResearchPack ? 'yes' : 'no'}, expected=${probe.expectedAccept ? 'yes' : 'no'}, reason=\`${probe.rejectionReason}\`, path=\`${probe.filePath}\``);
  }

  lines.push('', '## Rejection Order', '');
  for (const rule of audit.researchPackFirewall.rejectionOrder) lines.push(`- ${rule}`);

  lines.push('', '## Findings', '');
  if (audit.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of audit.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
      if (finding.filePath) lines.push(`  - file: \`${finding.filePath}\``);
    }
  }

  lines.push('', '## Notes', '');
  for (const note of audit.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_french_research_pack_firewall_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const contractPath = path.join(runDir, 'audits', 'french_research_pack_contract_audit.json');
  const translationStartGatePath = path.join(runDir, 'audits', 'translation_start_gate_audit.json');
  const contractAudit = readJson<Record<string, unknown>>(contractPath);
  const translationStartGate = readJson<Record<string, unknown>>(translationStartGatePath);
  const findings: Finding[] = [];
  const contractSummary = object(contractAudit.summary);
  const contract = object(contractAudit.researchPackContract);
  const translationSummary = object(translationStartGate.summary);
  const canonicalResearchPackPath = typeof contract.canonicalResearchPackPath === 'string'
    ? contract.canonicalResearchPackPath
    : path.join('docs/gustav/runs', runId, 'research/fr_research_pack.json');
  const acceptedResearchPackPaths = [path.join(repoRoot, canonicalResearchPackPath)];

  if (contractAudit.status !== 'PASS' || contractSummary.researchContractReady !== true || contractSummary.researchPackPresent !== false) {
    findings.push({
      severity: 'blocker',
      code: 'french_research_pack_contract_not_locked',
      message: 'French research pack firewall requires the research pack contract to be PASS and pre-pack.',
      filePath: path.relative(repoRoot, contractPath),
    });
  }
  if (translationStartGate.status !== 'PASS' || translationSummary.mayStartTranslationNow !== false) {
    findings.push({
      severity: 'blocker',
      code: 'translation_start_gate_not_locked',
      message: 'French research pack firewall requires translation start gate to remain locked.',
      filePath: path.relative(repoRoot, translationStartGatePath),
    });
  }

  const tempFixtureRoot = path.join('/private/tmp', `gustav-french-research-pack-firewall-${runId}`);
  fs.rmSync(tempFixtureRoot, { recursive: true, force: true });
  ensureDir(tempFixtureRoot);

  const exactPack = buildValidPack(runId);
  const singleSourcePack = JSON.parse(JSON.stringify(exactPack)) as Record<string, unknown>;
  const singleSourceClusters = arr<Record<string, unknown>>(singleSourcePack.clusters);
  singleSourceClusters[0].trustedSourceChecks = [arr(singleSourceClusters[0].trustedSourceChecks)[0]];

  const missingRuUkPack = JSON.parse(JSON.stringify(exactPack)) as Record<string, unknown>;
  const missingRuUkClusters = arr<Record<string, unknown>>(missingRuUkPack.clusters);
  delete missingRuUkClusters[0].ruPromptSummary;

  const missingFieldsPack = { ...exactPack, requiredResearchFields: REQUIRED_FIELDS.slice(0, 8) };
  const shortcutPack = { ...exactPack, rejectedShortcutPoliciesAcknowledged: false };
  const frenchOutputPack = { ...exactPack, containsFrenchOutput: true, translationBatchStarted: true };

  const fixtureDefinitions: Array<{ id: string; fileName: string; body: unknown; expectedAccept: boolean }> = [
    {
      id: 'TMP-IMPLICIT-DALSHE',
      fileName: 'implicit_dalshe.json',
      body: 'дальше перевод',
      expectedAccept: false,
    },
    {
      id: 'TMP-WRONG-RUN',
      fileName: 'wrong_run.json',
      body: { ...exactPack, runId: `${runId}_wrong` },
      expectedAccept: false,
    },
    {
      id: 'TMP-WRONG-TARGET',
      fileName: 'wrong_target.json',
      body: { ...exactPack, targetStudyLanguage: 'es' },
      expectedAccept: false,
    },
    {
      id: 'TMP-MISSING-SOURCE-LOCALE',
      fileName: 'missing_source_locale.json',
      body: { ...exactPack, sourceLocales: ['ru'] },
      expectedAccept: false,
    },
    {
      id: 'TMP-MISSING-TRUSTED-SOURCE',
      fileName: 'missing_trusted_source.json',
      body: { ...exactPack, sourcesChecked: REQUIRED_SOURCE_IDS.slice(0, 7) },
      expectedAccept: false,
    },
    {
      id: 'TMP-SINGLE-SOURCE-CLUSTER',
      fileName: 'single_source_cluster.json',
      body: singleSourcePack,
      expectedAccept: false,
    },
    {
      id: 'TMP-MISSING-RU-UK',
      fileName: 'missing_ru_uk.json',
      body: missingRuUkPack,
      expectedAccept: false,
    },
    {
      id: 'TMP-MISSING-FIELDS',
      fileName: 'missing_fields.json',
      body: missingFieldsPack,
      expectedAccept: false,
    },
    {
      id: 'TMP-SHORTCUT-ALLOWED',
      fileName: 'shortcut_allowed.json',
      body: shortcutPack,
      expectedAccept: false,
    },
    {
      id: 'TMP-FRENCH-OUTPUT',
      fileName: 'french_output.json',
      body: frenchOutputPack,
      expectedAccept: false,
    },
    {
      id: 'TMP-EXACT-SHAPE-WRONG-PATH',
      fileName: 'exact_shape_wrong_path.json',
      body: exactPack,
      expectedAccept: false,
    },
  ];

  const probes: ResearchPackProbe[] = [
    validateResearchPack(
      `REAL-${path.basename(canonicalResearchPackPath).toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`,
      path.join(repoRoot, canonicalResearchPackPath),
      'real_candidate',
      acceptedResearchPackPaths,
      runId,
      false,
    ),
  ];

  for (const fixture of fixtureDefinitions) {
    const fixturePath = path.join(tempFixtureRoot, fixture.fileName);
    writeJson(fixturePath, fixture.body);
    probes.push(validateResearchPack(
      fixture.id,
      fixturePath,
      'temp_fixture',
      acceptedResearchPackPaths,
      runId,
      fixture.expectedAccept,
    ));
  }

  for (const probe of probes.filter((entry) => entry.wouldAcceptResearchPack !== entry.expectedAccept)) {
    findings.push({
      severity: 'blocker',
      code: 'french_research_pack_firewall_expectation_mismatch',
      message: `${probe.id} accept result ${String(probe.wouldAcceptResearchPack)} did not match expected ${String(probe.expectedAccept)}.`,
      filePath: probe.filePath,
    });
  }

  const realProbes = probes.filter((probe) => probe.source === 'real_candidate');
  const tempProbes = probes.filter((probe) => probe.source === 'temp_fixture');
  const realPacksPresent = realProbes.filter((probe) => probe.exists).length;
  const exactPackMatches = realProbes.filter((probe) => probe.wouldAcceptResearchPack).length;
  const acceptedShapeFixtures = tempProbes.filter((probe) =>
    probe.schemaValid &&
    probe.runIdMatches &&
    probe.targetMatches &&
    probe.sourceLocalesMatch &&
    probe.trustedSourcesComplete &&
    probe.requiredFieldsComplete &&
    probe.clustersComplete &&
    probe.everyClusterHasTwoSources &&
    probe.everyClusterHasRuUkComparison &&
    probe.shortcutsRejected &&
    probe.noFrenchOutput
  ).length;
  const tempExactShapeBlockedByPath = tempProbes.filter((probe) =>
    probe.id === 'TMP-EXACT-SHAPE-WRONG-PATH' &&
    probe.rejectionReason === 'research_pack_path_not_accepted' &&
    probe.wouldAcceptResearchPack === false
  ).length;
  const singleSourceFixtures = tempProbes.filter((probe) => probe.id === 'TMP-SINGLE-SOURCE-CLUSTER').length;
  const singleSourceFixturesRejected = tempProbes.filter((probe) => probe.id === 'TMP-SINGLE-SOURCE-CLUSTER' && !probe.wouldAcceptResearchPack).length;
  const missingRuUkFixtures = tempProbes.filter((probe) => probe.id === 'TMP-MISSING-RU-UK').length;
  const missingRuUkFixturesRejected = tempProbes.filter((probe) => probe.id === 'TMP-MISSING-RU-UK' && !probe.wouldAcceptResearchPack).length;
  const missingFieldsFixtures = tempProbes.filter((probe) => probe.id === 'TMP-MISSING-FIELDS').length;
  const missingFieldsFixturesRejected = tempProbes.filter((probe) => probe.id === 'TMP-MISSING-FIELDS' && !probe.wouldAcceptResearchPack).length;
  const shortcutFixtures = tempProbes.filter((probe) => probe.id === 'TMP-SHORTCUT-ALLOWED').length;
  const shortcutFixturesRejected = tempProbes.filter((probe) => probe.id === 'TMP-SHORTCUT-ALLOWED' && !probe.wouldAcceptResearchPack).length;
  const frenchOutputFixtures = tempProbes.filter((probe) => probe.id === 'TMP-FRENCH-OUTPUT').length;
  const frenchOutputFixturesRejected = tempProbes.filter((probe) => probe.id === 'TMP-FRENCH-OUTPUT' && !probe.wouldAcceptResearchPack).length;

  if (realPacksPresent > 0 || exactPackMatches > 0) {
    findings.push({
      severity: 'blocker',
      code: 'real_french_research_pack_present',
      message: 'A real French research pack is present even though translation is still blocked.',
      filePath: canonicalResearchPackPath,
    });
  }
  if (acceptedShapeFixtures !== 1 || tempExactShapeBlockedByPath !== 1) {
    findings.push({
      severity: 'blocker',
      code: 'temp_exact_research_pack_not_path_blocked',
      message: 'The exact-shape temp research pack must be valid by shape but blocked because it is outside accepted paths.',
    });
  }
  if (
    singleSourceFixturesRejected !== singleSourceFixtures ||
    missingRuUkFixturesRejected !== missingRuUkFixtures ||
    missingFieldsFixturesRejected !== missingFieldsFixtures ||
    shortcutFixturesRejected !== shortcutFixtures ||
    frenchOutputFixturesRejected !== frenchOutputFixtures
  ) {
    findings.push({
      severity: 'blocker',
      code: 'bad_research_pack_fixture_not_rejected',
      message: 'All malformed French research pack fixtures must be rejected.',
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const firewallPassed =
    blockers === 0 &&
    realProbes.length === 1 &&
    realPacksPresent === 0 &&
    exactPackMatches === 0 &&
    tempProbes.length === 11 &&
    tempProbes.every((probe) => !probe.wouldAcceptResearchPack) &&
    acceptedShapeFixtures === 1 &&
    tempExactShapeBlockedByPath === 1 &&
    singleSourceFixturesRejected === 1 &&
    missingRuUkFixturesRejected === 1 &&
    missingFieldsFixturesRejected === 1 &&
    shortcutFixturesRejected === 1 &&
    frenchOutputFixturesRejected === 1;

  const audit: Audit = {
    schemaVersion: 'gustav-french-research-pack-firewall-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      frenchResearchPackContractAudit: path.relative(repoRoot, contractPath),
      translationStartGate: path.relative(repoRoot, translationStartGatePath),
    },
    summary: {
      targetStudyLanguage: 'fr',
      realPackCandidates: realProbes.length,
      realPacksPresent,
      exactPackMatches,
      tempFixtures: tempProbes.length,
      rejectedTempFixtures: tempProbes.filter((probe) => !probe.wouldAcceptResearchPack).length,
      acceptedShapeFixtures,
      tempExactShapeBlockedByPath,
      singleSourceFixtures,
      singleSourceFixturesRejected,
      missingRuUkFixtures,
      missingRuUkFixturesRejected,
      missingFieldsFixtures,
      missingFieldsFixturesRejected,
      shortcutFixtures,
      shortcutFixturesRejected,
      frenchOutputFixtures,
      frenchOutputFixturesRejected,
      blockers,
      warnings,
      firewallPassed,
      requiresCanonicalPackPath: true,
      requiresTwoSourceClusterEvidence: true,
      requiresRuUkComparison: true,
      requiresRequiredFields: true,
      requiresShortcutRejection: true,
      requiresNoFrenchOutput: true,
      researchPackStillMissing: realPacksPresent === 0,
      mayStartTranslationNow: false,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
      noFrenchContentGenerated: true,
    },
    researchPackFirewall: {
      canonicalResearchPackPath,
      acceptedResearchPackPaths,
      targetStudyLanguage: 'fr',
      sourceLocales: ['ru', 'uk'],
      requiredSourceIds: REQUIRED_SOURCE_IDS,
      requiredClusterIds: REQUIRED_CLUSTER_IDS,
      requiredResearchFields: REQUIRED_FIELDS,
      rejectionOrder: [
        'research_pack_absent',
        'not_parseable_json',
        'schema_mismatch',
        'run_id_mismatch',
        'target_mismatch',
        'source_locales_missing_or_wrong',
        'trusted_sources_incomplete',
        'required_fields_incomplete',
        'grammar_clusters_incomplete',
        'cluster_lacks_two_sources',
        'ru_uk_comparison_missing',
        'shortcut_policy_not_rejected',
        'french_output_started',
        'research_pack_path_not_accepted',
      ],
    },
    tempFixtureRoot,
    researchPackProbes: probes,
    findings,
    notes: [
      'This audit tests French research pack acceptance with temp fixtures only; it does not create the real research pack.',
      'An exact-shape temp research pack is rejected because only the canonical run research path can be accepted.',
      'Single-source, missing RU/UK comparison, missing required fields, shortcut-enabled and French-output fixtures are rejected.',
      'French translation remains blocked.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'french_research_pack_firewall_audit.json');
  const outMd = path.join(runDir, 'audits', 'french_research_pack_firewall_audit.md');
  const outReadme = path.join(runDir, 'audits', 'french_research_pack_firewall', 'README.md');
  ensureDir(path.dirname(outReadme));
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));
  fs.writeFileSync(outReadme, renderMarkdown(audit));

  console.log(`GUSTAV French research pack firewall audit: ${audit.status}`);
  console.log(`Real pack candidates: ${audit.summary.realPackCandidates}`);
  console.log(`Real packs present: ${audit.summary.realPacksPresent}`);
  console.log(`Exact pack matches: ${audit.summary.exactPackMatches}`);
  console.log(`Temp fixtures: ${audit.summary.tempFixtures}`);
  console.log(`Rejected temp fixtures: ${audit.summary.rejectedTempFixtures}`);
  console.log(`Temp exact shape blocked by path: ${audit.summary.tempExactShapeBlockedByPath}`);
  console.log(`Single-source fixtures rejected: ${audit.summary.singleSourceFixturesRejected}`);
  console.log(`Missing RU/UK fixtures rejected: ${audit.summary.missingRuUkFixturesRejected}`);
  console.log(`French-output fixtures rejected: ${audit.summary.frenchOutputFixturesRejected}`);
  console.log(`Firewall passed: ${audit.summary.firewallPassed ? 'yes' : 'no'}`);
  console.log(`May start translation now: ${audit.summary.mayStartTranslationNow ? 'yes' : 'no'}`);
  console.log(`May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);

  if (audit.status === 'BLOCK') process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
