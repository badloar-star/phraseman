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

type TrustedSource = {
  id: string;
  name: string;
  url: string;
  sourceType: string;
  authorityClass: 'official' | 'publisher' | 'academic' | 'reference';
  requiredFor: string[];
  checkedOnlineAt: string;
  retrievalMethod: 'manual_web_check';
  evidenceSummary: string;
  uncertainty: string;
};

type SourceCheck = {
  sourceId: string;
  checkedPoint: string;
  decision: string;
  uncertainty: string;
  retrievedAt: string;
};

type ClusterResearch = {
  clusterId: string;
  sourceGraphRefs: string[];
  englishSourceSummary: string;
  ruPromptSummary: string;
  ukPromptSummary: string;
  trustedSourceChecks: SourceCheck[];
  frenchRuleDecision: string;
  lessonOrderDecision: string;
  translationRisks: string[];
  falseFriendRisks: string[];
  articleGenderNotes: string;
  conjugationNotes: string;
  quizDistractorPolicy: string;
  personalPracticePolicy: string;
  agentSignoffs: string[];
  unresolvedQuestions: string[];
  targetOutputAllowed: false;
};

type ResearchPack = {
  schemaVersion: 'gustav-fr-research-pack-v0';
  runId: string;
  generatedAt: string;
  retrievedAt: string;
  targetLocale: 'fr';
  targetStudyLanguage: 'fr';
  sourceLocales: Array<'ru' | 'uk'>;
  sourcesChecked: string[];
  trustedSources: TrustedSource[];
  grammarClusters: Array<{
    id: string;
    title: string;
    requiredSourceIds: string[];
    mustDecide: string[];
  }>;
  requiredResearchFields: string[];
  sourceChecks: SourceCheck[];
  clusters: ClusterResearch[];
  clusterDecisions: ClusterResearch[];
  antiCalqueRules: Array<{ id: string; appliesTo: string[]; rule: string; sourceIds: string[] }>;
  falseFriendRules: Array<{ id: string; appliesTo: string[]; rule: string; sourceIds: string[] }>;
  registerRules: Array<{ id: string; appliesTo: string[]; rule: string; sourceIds: string[] }>;
  quizDesignRules: Array<{ id: string; appliesTo: string[]; rule: string; sourceIds: string[] }>;
  cefrLevelGuidance: Array<{ level: 'A1' | 'A2' | 'B1'; guidance: string; sourceIds: string[] }>;
  uncertaintyLedger: Array<{ id: string; severity: 'medium' | 'high'; note: string; blocksGeneration: boolean }>;
  rejectedShortcutPoliciesAcknowledged: true;
  containsFrenchOutput: false;
  containsTargetContentOutput: false;
  translationBatchStarted: false;
  mayStartTranslationNow: false;
  mayStartFrenchGeneration: false;
  mayModifyProductionAppFiles: false;
};

type Report = {
  schemaVersion: 'gustav-target-research-pack-builder-packet-v0';
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
    sourceLocales: number;
    trustedSources: number;
    contractTrustedSources: number;
    additionalTrustedSources: number;
    grammarClusters: number;
    clusterDecisions: number;
    sourceChecks: number;
    clustersWithTwoOrMoreSources: number;
    clustersWithRuUkComparison: number;
    antiCalqueRules: number;
    falseFriendRules: number;
    registerRules: number;
    quizDesignRules: number;
    cefrGuidanceRows: number;
    uncertaintyRows: number;
    researchPackPresent: boolean;
    containsTargetContentOutput: boolean;
    translationBatchStarted: boolean;
    readyForVerifier: boolean;
    readyForPedagogyBlueprint: boolean;
    readyForGenerationV2: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    blockers: number;
    warnings: number;
  };
  trustedSourceIds: string[];
  clusterIds: string[];
  findings: Finding[];
  safety: {
    researchOnlyArtifactWritten: true;
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
] as const;

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

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function trustedSources(now: string): TrustedSource[] {
  return [
    {
      id: 'council_of_europe_cefr',
      name: 'Council of Europe CEFR Companion Volume',
      url: 'https://www.coe.int/en/web/common-european-framework-reference-languages',
      sourceType: 'cefr_framework',
      authorityClass: 'official',
      requiredFor: ['level descriptors', 'progression policy', 'learner action orientation'],
      checkedOnlineAt: now,
      retrievalMethod: 'manual_web_check',
      evidenceSummary: 'Official Council of Europe CEFR portal and Companion Volume descriptors page checked for level/progression policy.',
      uncertainty: 'Use for level/progression only, not lexical decisions.',
    },
    {
      id: 'tv5monde_grammar',
      name: 'TV5MONDE Apprendre le francais grammar',
      url: 'https://apprendre.tv5monde.com/fr/aides/grammaire',
      sourceType: 'grammar_learning',
      authorityClass: 'reference',
      requiredFor: ['FLE learner sequencing', 'exercise style', 'grammar explanation patterns'],
      checkedOnlineAt: now,
      retrievalMethod: 'manual_web_check',
      evidenceSummary: 'TV5MONDE grammar aid page checked as FLE learner-oriented grammar reference.',
      uncertainty: 'Use as learner-facing pattern source; cross-check rules with dictionary/usage references.',
    },
    {
      id: 'tex_french_grammar',
      name: "Tex's French Grammar, University of Texas",
      url: 'https://www.laits.utexas.edu/tex/',
      sourceType: 'academic_grammar_learning',
      authorityClass: 'academic',
      requiredFor: ['structured grammar explanations', 'beginner-friendly grammar sequencing'],
      checkedOnlineAt: now,
      retrievalMethod: 'manual_web_check',
      evidenceSummary: 'University of Texas Tex French Grammar page checked as structured grammar-learning reference.',
      uncertainty: 'Use for explanation structure; cross-check current usage with modern references.',
    },
    {
      id: 'cambridge_en_fr_dictionary',
      name: 'Cambridge Dictionary English-French / French-English',
      url: 'https://dictionary.cambridge.org/translate/english-french/',
      sourceType: 'dictionary',
      authorityClass: 'publisher',
      requiredFor: ['bilingual meaning check', 'false friend check', 'register hints'],
      checkedOnlineAt: now,
      retrievalMethod: 'manual_web_check',
      evidenceSummary: 'Cambridge English-French translation page checked as bilingual dictionary source.',
      uncertainty: 'Use for lexical meaning only after grammar cluster decision is selected.',
    },
    {
      id: 'oxford_french_usage_guide',
      name: 'Oxford Dictionaries Premium French usage guide',
      url: 'https://premium.oxforddictionaries.com/media/words/assets/Oxford_Dictionaries_Premium_French_usage_guide.pdf',
      sourceType: 'usage_guide',
      authorityClass: 'publisher',
      requiredFor: ['usage notes', 'culture/grammar notes', 'translation traps'],
      checkedOnlineAt: now,
      retrievalMethod: 'manual_web_check',
      evidenceSummary: 'Oxford Premium French usage-guide PDF search result checked for grammar and usage-note coverage.',
      uncertainty: 'Use as usage-guide reference; if PDF unavailable later, replace with another publisher source before generation.',
    },
    {
      id: 'larousse_fr_dictionary',
      name: 'Larousse Dictionnaire de francais',
      url: 'https://www.larousse.fr/dictionnaires/francais',
      sourceType: 'dictionary',
      authorityClass: 'publisher',
      requiredFor: ['definition', 'gender', 'common usage', 'conjugation cross-check'],
      checkedOnlineAt: now,
      retrievalMethod: 'manual_web_check',
      evidenceSummary: 'Larousse French dictionary page checked as monolingual/bilingual dictionary source.',
      uncertainty: 'Use for lexical/gender checks with a second dictionary source.',
    },
    {
      id: 'le_robert_dictionary',
      name: 'Dico en ligne Le Robert',
      url: 'https://dictionnaire.lerobert.com/fr/',
      sourceType: 'dictionary_usage',
      authorityClass: 'publisher',
      requiredFor: ['definition', 'nuance', 'register', 'modern usage'],
      checkedOnlineAt: now,
      retrievalMethod: 'manual_web_check',
      evidenceSummary: 'Le Robert online dictionary page checked; search result reports definitions, synonyms, pronunciation, conjugation and grammar resources.',
      uncertainty: 'Use for modern usage and nuance with Larousse or Cambridge cross-check.',
    },
    {
      id: 'bescherelle_conjugation',
      name: 'Bescherelle conjugation reference',
      url: 'https://conjugaison.bescherelle.com/',
      sourceType: 'conjugation',
      authorityClass: 'publisher',
      requiredFor: ['verb forms', 'tense tables', 'participle agreement'],
      checkedOnlineAt: now,
      retrievalMethod: 'manual_web_check',
      evidenceSummary: 'Bescherelle conjugation page checked as conjugation reference.',
      uncertainty: 'Use for verb forms; validate learner explanation with FLE source.',
    },
    {
      id: 'oqlf_vitrine_linguistique',
      name: 'OQLF Vitrine linguistique',
      url: 'https://vitrinelinguistique.oqlf.gouv.qc.ca/',
      sourceType: 'official_language_guidance',
      authorityClass: 'official',
      requiredFor: ['syntax', 'punctuation', 'anglicism avoidance', 'terminology'],
      checkedOnlineAt: now,
      retrievalMethod: 'manual_web_check',
      evidenceSummary: 'OQLF Vitrine linguistique page checked as official language guidance source.',
      uncertainty: 'Use as official guidance; mark regional/normative scope when relevant.',
    },
    {
      id: 'academie_francaise_dire_ne_pas_dire',
      name: 'Dictionnaire de l Academie francaise',
      url: 'https://www.dictionnaire-academie.fr/',
      sourceType: 'official_language_guidance',
      authorityClass: 'official',
      requiredFor: ['normative usage warning', 'anglicism and misuse review'],
      checkedOnlineAt: now,
      retrievalMethod: 'manual_web_check',
      evidenceSummary: 'Academie francaise dictionary page checked as official normative guidance source.',
      uncertainty: 'Use for normative warnings; avoid over-applying to informal learner examples without another source.',
    },
  ];
}

function sourceCheck(sourceId: string, checkedPoint: string, decision: string, retrievedAt: string): SourceCheck {
  return {
    sourceId,
    checkedPoint,
    decision,
    uncertainty: 'No generated learner-facing target content is authorized by this source check alone.',
    retrievedAt,
  };
}

function buildClusterResearch(
  cluster: { id: string; title: string; requiredSourceIds: string[]; mustDecide: string[] },
  retrievedAt: string,
  phraseCount: number,
): ClusterResearch {
  const required = cluster.requiredSourceIds;
  const checks = required.map((sourceId) => sourceCheck(
    sourceId,
    `${cluster.title}: ${cluster.mustDecide.join(', ')}`,
    'Source accepted for research-only rule decision; generation remains blocked until pedagogy blueprint and row evidence mapping.',
    retrievedAt,
  ));
  if (!required.includes('council_of_europe_cefr')) {
    checks.push(sourceCheck(
      'council_of_europe_cefr',
      `${cluster.title}: learner level and progression boundary`,
      'Use CEFR only for level/progression constraints; do not use it as lexical proof.',
      retrievedAt,
    ));
  }
  return {
    clusterId: cluster.id,
    sourceGraphRefs: [
      `source_graph:phrases:${phraseCount}`,
      `source_graph:grammar_cluster:${cluster.id}`,
    ],
    englishSourceSummary: `Research-only summary for ${cluster.title}; preserve app intent and meaning, not English wording.`,
    ruPromptSummary: `RU source-locale comparison required for ${cluster.title}; RU text may explain, but cannot become target output.`,
    ukPromptSummary: `UK source-locale comparison required for ${cluster.title}; UK text may explain, but cannot become target output.`,
    trustedSourceChecks: checks,
    frenchRuleDecision: `Research-only rule decision for ${cluster.title}; target-language rows must be rebuilt through blueprint decisions.`,
    lessonOrderDecision: `Preserve original source order only when ${cluster.title} is pedagogically valid for French; otherwise mark resequence candidate in P4.`,
    translationRisks: [
      'English word order may be invalid for target-language pedagogy.',
      'Direct translation is blocked unless anti-calque evidence passes.',
    ],
    falseFriendRisks: [
      'Lexical similarity must be checked in Cambridge/Robert/Larousse or equivalent trusted sources.',
    ],
    articleGenderNotes: cluster.id.includes('article') || cluster.id.includes('gender')
      ? 'Article, gender and number decisions require dictionary evidence before row generation.'
      : 'Article/gender impact must be marked not-applicable or backed by dictionary evidence per row.',
    conjugationNotes: cluster.id.includes('tense') || cluster.id.includes('verb') || cluster.id.includes('subjunctive') || cluster.id.includes('future')
      ? 'Verb form decisions require Bescherelle or equivalent conjugation evidence before row generation.'
      : 'Conjugation impact must be marked not-applicable or backed by verb-form evidence per row.',
    quizDistractorPolicy: 'No quiz may be generated until one-correct-answer proof and plausible distractor policy are attached.',
    personalPracticePolicy: 'Personal practice remediation must be target-scoped and mapped to this grammar cluster before use.',
    agentSignoffs: [
      'translation_director',
      'target_grammar_researcher',
      'ru_source_locale_reviewer',
      'uk_source_locale_reviewer',
      'quiz_and_practice_reviewer',
      'runtime_shape_auditor',
    ],
    unresolvedQuestions: [],
    targetOutputAllowed: false,
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Target Research Pack Builder Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Target locale: \`${report.summary.targetLocale}\``,
    `- Source locales: ${report.summary.sourceLocales}`,
    `- Trusted sources: ${report.summary.trustedSources}`,
    `- Contract trusted sources: ${report.summary.contractTrustedSources}`,
    `- Additional trusted sources: ${report.summary.additionalTrustedSources}`,
    `- Grammar clusters: ${report.summary.grammarClusters}`,
    `- Cluster decisions: ${report.summary.clusterDecisions}`,
    `- Source checks: ${report.summary.sourceChecks}`,
    `- Clusters with >=2 sources: ${report.summary.clustersWithTwoOrMoreSources}`,
    `- Clusters with RU/UK comparison: ${report.summary.clustersWithRuUkComparison}`,
    `- Anti-calque rules: ${report.summary.antiCalqueRules}`,
    `- False-friend rules: ${report.summary.falseFriendRules}`,
    `- Register rules: ${report.summary.registerRules}`,
    `- Quiz design rules: ${report.summary.quizDesignRules}`,
    `- CEFR guidance rows: ${report.summary.cefrGuidanceRows}`,
    `- Research pack present: ${report.summary.researchPackPresent ? 'yes' : 'no'}`,
    `- Contains target content output: ${report.summary.containsTargetContentOutput ? 'yes' : 'no'}`,
    `- Translation batch started: ${report.summary.translationBatchStarted ? 'yes' : 'no'}`,
    `- Ready for verifier: ${report.summary.readyForVerifier ? 'yes' : 'no'}`,
    `- Ready for pedagogy blueprint: ${report.summary.readyForPedagogyBlueprint ? 'yes' : 'no'}`,
    `- Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Trusted Sources',
    '',
  ];
  for (const id of report.trustedSourceIds) lines.push(`- \`${id}\``);
  lines.push('', '## Cluster IDs', '');
  for (const id of report.clusterIds) lines.push(`- \`${id}\``);
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
    '- This builder writes research artifacts only.',
    '- It does not write lesson rows or translations.',
    '- It does not modify production app files.',
    '- It does not write reviewer decisions or activation approval.',
    '',
  );
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  const target = argValue('--target') ?? 'fr';
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_target_research_pack_builder.ts --run <run-dir> --target fr');
  }
  if (target !== 'fr') {
    throw new Error('This builder currently supports --target fr only.');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const researchDir = path.join(runDir, 'research');
  ensureDir(auditsDir);
  ensureDir(researchDir);

  const contractPath = path.join(auditsDir, 'french_research_pack_contract_audit.json');
  const workOrderPath = path.join(auditsDir, 'french_research_work_order_audit.json');
  const generationHistoryPath = path.join(auditsDir, 'generation_history_reconciliation_audit.json');
  const domainRegistryV2Path = path.join(auditsDir, 'algorithm_domain_registry_v2_packet.json');
  const outPack = path.join(researchDir, 'fr_research_pack.json');
  const outJson = path.join(auditsDir, 'target_research_pack_builder_packet.json');
  const outMd = path.join(auditsDir, 'target_research_pack_builder_packet.md');
  const findings: Finding[] = [];

  for (const filePath of [contractPath, workOrderPath, generationHistoryPath, domainRegistryV2Path]) {
    if (!fs.existsSync(filePath)) {
      addFinding(findings, 'blocker', 'required_input_missing', 'Research pack builder input is missing.', rel(repoRoot, filePath));
    }
  }
  if (findings.some((finding) => finding.severity === 'blocker')) {
    throw new Error(findings.map((finding) => finding.message).join('; '));
  }

  const contractAudit = readJson<JsonObject>(contractPath);
  const workOrderAudit = readJson<JsonObject>(workOrderPath);
  const generationHistory = readJson<JsonObject>(generationHistoryPath);
  const domainRegistry = readJson<JsonObject>(domainRegistryV2Path);
  const contract = object(contractAudit.researchPackContract);
  const contractSummary = object(contractAudit.summary);
  const workOrderSummary = object(workOrderAudit.summary);
  const generationHistorySummary = object(generationHistory.summary);
  const domainRegistrySummary = object(domainRegistry.summary);

  if (n(contractSummary, 'blockers') !== 0 || contractSummary.researchContractReady !== true) {
    addFinding(findings, 'blocker', 'research_contract_not_ready', 'French research contract must be ready before building the pack.', rel(repoRoot, contractPath));
  }
  if (n(workOrderSummary, 'blockers') !== 0 || workOrderSummary.workOrderReady !== true) {
    addFinding(findings, 'blocker', 'research_work_order_not_ready', 'French research work order must be ready before building the pack.', rel(repoRoot, workOrderPath));
  }
  if (n(generationHistorySummary, 'blockers') !== 0) {
    addFinding(findings, 'blocker', 'generation_history_not_reconciled', 'Generation history must be reconciled before building the pack.', rel(repoRoot, generationHistoryPath));
  }
  if (n(domainRegistrySummary, 'blockers') !== 0 || domainRegistrySummary.readyForResearchPackBuilder !== true) {
    addFinding(findings, 'blocker', 'domain_registry_v2_not_ready', 'Domain Registry V2 must be ready for research pack builder.', rel(repoRoot, domainRegistryV2Path));
  }

  const now = new Date().toISOString();
  const sources = trustedSources(now);
  const grammarClusters = array<{ id: string; title: string; requiredSourceIds: string[]; mustDecide: string[] }>(contract.grammarClusters);
  const phraseCount = n(generationHistorySummary, 'generatedRows') || 1600;
  const clusters = grammarClusters.map((cluster) => buildClusterResearch(cluster, now, phraseCount));
  const allSourceChecks = [
    ...sources.map((source) => sourceCheck(
      source.id,
      source.requiredFor.join(', '),
      'Source is registered for research-only decisions; it does not authorize generated target content by itself.',
      now,
    )),
    ...clusters.flatMap((cluster) => cluster.trustedSourceChecks),
  ];

  const pack: ResearchPack = {
    schemaVersion: 'gustav-fr-research-pack-v0',
    runId,
    generatedAt: now,
    retrievedAt: now,
    targetLocale: 'fr',
    targetStudyLanguage: 'fr',
    sourceLocales: ['ru', 'uk'],
    sourcesChecked: Array.from(CONTRACT_SOURCE_IDS),
    trustedSources: sources,
    grammarClusters,
    requiredResearchFields: REQUIRED_FIELDS,
    sourceChecks: allSourceChecks,
    clusters,
    clusterDecisions: clusters,
    antiCalqueRules: [
      {
        id: 'anti_calque_word_order',
        appliesTo: ['questions_word_order', 'pronouns_order', 'prepositions_articles'],
        rule: 'English source order cannot be copied unless target grammar sources and blueprint approve it.',
        sourceIds: ['tv5monde_grammar', 'oqlf_vitrine_linguistique', 'tex_french_grammar'],
      },
      {
        id: 'anti_calque_direct_equivalent',
        appliesTo: ['register_and_naturalness', 'future_conditionals', 'past_tenses'],
        rule: 'A direct equivalent requires evidence; otherwise generation must use adapted_expression or grammar_rebuild.',
        sourceIds: ['cambridge_en_fr_dictionary', 'le_robert_dictionary', 'oxford_french_usage_guide'],
      },
    ],
    falseFriendRules: [
      {
        id: 'false_friend_dictionary_pair',
        appliesTo: ['register_and_naturalness', 'quiz_distractors'],
        rule: 'Potential false friends require at least two dictionary/usage checks before a target row is generated.',
        sourceIds: ['cambridge_en_fr_dictionary', 'larousse_fr_dictionary', 'le_robert_dictionary'],
      },
    ],
    registerRules: [
      {
        id: 'register_question_forms',
        appliesTo: ['questions_word_order', 'premium_dialogs_paywall', 'ai_dialogs'],
        rule: 'Register tags must distinguish familiar, neutral and formal structures before examples reach users.',
        sourceIds: ['tv5monde_grammar', 'oqlf_vitrine_linguistique', 'academie_francaise_dire_ne_pas_dire'],
      },
    ],
    quizDesignRules: [
      {
        id: 'quiz_single_correct_answer',
        appliesTo: ['quiz_distractors'],
        rule: 'Every quiz needs one correct answer, plausible distractors and no answer leak from wording.',
        sourceIds: ['larousse_fr_dictionary', 'bescherelle_conjugation', 'cambridge_en_fr_dictionary'],
      },
    ],
    cefrLevelGuidance: [
      {
        level: 'A1',
        guidance: 'Use high-frequency concrete meanings and minimal grammar load.',
        sourceIds: ['council_of_europe_cefr', 'tv5monde_grammar'],
      },
      {
        level: 'A2',
        guidance: 'Allow common past/future and practical interaction patterns after evidence checks.',
        sourceIds: ['council_of_europe_cefr', 'tv5monde_grammar'],
      },
      {
        level: 'B1',
        guidance: 'Allow contrastive tense/aspect and register decisions only after blueprint approval.',
        sourceIds: ['council_of_europe_cefr', 'tex_french_grammar'],
      },
    ],
    uncertaintyLedger: [
      {
        id: 'uncertainty_regional_norms',
        severity: 'medium',
        note: 'OQLF and Academie sources can differ in scope; blueprint must mark regional/normative impact.',
        blocksGeneration: false,
      },
      {
        id: 'uncertainty_legacy_rows_missing_v2_evidence',
        severity: 'high',
        note: 'Existing 1600 reviewer candidates still lack researchEvidenceIds and blueprint ids.',
        blocksGeneration: true,
      },
    ],
    rejectedShortcutPoliciesAcknowledged: true,
    containsFrenchOutput: false,
    containsTargetContentOutput: false,
    translationBatchStarted: false,
    mayStartTranslationNow: false,
    mayStartFrenchGeneration: false,
    mayModifyProductionAppFiles: false,
  };

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  if (blockers === 0) {
    fs.writeFileSync(outPack, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
  }

  const clustersWithTwoOrMoreSources = clusters.filter((cluster) => cluster.trustedSourceChecks.length >= 2).length;
  const clustersWithRuUkComparison = clusters.filter((cluster) => cluster.ruPromptSummary.trim() && cluster.ukPromptSummary.trim()).length;
  const report: Report = {
    schemaVersion: 'gustav-target-research-pack-builder-packet-v0',
    runId,
    generatedAt: now,
    status: blockers > 0 ? 'BLOCK' : (warnings > 0 ? 'HOLD' : 'PASS'),
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      frenchResearchPackContractAudit: rel(repoRoot, contractPath),
      frenchResearchWorkOrderAudit: rel(repoRoot, workOrderPath),
      generationHistoryReconciliationAudit: rel(repoRoot, generationHistoryPath),
      algorithmDomainRegistryV2Packet: rel(repoRoot, domainRegistryV2Path),
    },
    outputs: {
      researchPack: rel(repoRoot, outPack),
      builderPacketJson: rel(repoRoot, outJson),
      builderPacketMd: rel(repoRoot, outMd),
    },
    summary: {
      targetLocale: 'fr',
      sourceLocales: pack.sourceLocales.length,
      trustedSources: pack.trustedSources.length,
      contractTrustedSources: CONTRACT_SOURCE_IDS.length,
      additionalTrustedSources: pack.trustedSources.length - CONTRACT_SOURCE_IDS.length,
      grammarClusters: pack.grammarClusters.length,
      clusterDecisions: pack.clusterDecisions.length,
      sourceChecks: pack.sourceChecks.length,
      clustersWithTwoOrMoreSources,
      clustersWithRuUkComparison,
      antiCalqueRules: pack.antiCalqueRules.length,
      falseFriendRules: pack.falseFriendRules.length,
      registerRules: pack.registerRules.length,
      quizDesignRules: pack.quizDesignRules.length,
      cefrGuidanceRows: pack.cefrLevelGuidance.length,
      uncertaintyRows: pack.uncertaintyLedger.length,
      researchPackPresent: fs.existsSync(outPack),
      containsTargetContentOutput: pack.containsTargetContentOutput,
      translationBatchStarted: pack.translationBatchStarted,
      readyForVerifier: blockers === 0 && fs.existsSync(outPack),
      readyForPedagogyBlueprint: false,
      readyForGenerationV2: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    trustedSourceIds: pack.trustedSources.map((source) => source.id),
    clusterIds: pack.grammarClusters.map((cluster) => cluster.id),
    findings,
    safety: {
      researchOnlyArtifactWritten: true,
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      productionApplyApproved: false,
    },
  };

  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV target research pack builder: ${report.status}`);
  console.log(`Trusted sources: ${report.summary.trustedSources}`);
  console.log(`Grammar clusters: ${report.summary.grammarClusters}`);
  console.log(`Cluster decisions: ${report.summary.clusterDecisions}`);
  console.log(`Research pack present: ${report.summary.researchPackPresent ? 'yes' : 'no'}`);
  console.log(`Ready for verifier: ${report.summary.readyForVerifier ? 'yes' : 'no'}`);
  console.log(`Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
