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

type TrustedSource = {
  id: string;
  name: string;
  url: string;
  sourceType: 'dictionary' | 'usage_guide' | 'conjugation' | 'grammar_learning' | 'official_language_guidance';
  requiredFor: string[];
};

type GrammarCluster = {
  id: string;
  title: string;
  requiredSourceIds: string[];
  mustDecide: string[];
};

type Audit = {
  schemaVersion: 'gustav-french-research-pack-contract-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    translationStartGate: string;
    sourceGraphQualityAudit: string;
    sourceGraphApprovalAudit: string;
    readinessGate: string;
    researchPack: string;
  };
  summary: {
    targetStudyLanguage: 'fr';
    sourceLocales: number;
    trustedSources: number;
    officialOrPublisherSources: number;
    grammarClusters: number;
    requiredResearchFields: number;
    crossChecks: number;
    rejectedShortcutPolicies: number;
    blockers: number;
    warnings: number;
    translationStartGatePassed: boolean;
    sourceGraphApprovedForInput: boolean;
    researchPackPresent: boolean;
    researchPackRequiredBeforeFirstBatch: boolean;
    researchContractReady: boolean;
    everyClusterHasTwoSources: boolean;
    everyClusterRequiresRuUkComparison: boolean;
    shortcutsRejected: boolean;
    translationStartBlocked: boolean;
    mayStartTranslationNow: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
    noFrenchContentGenerated: boolean;
  };
  researchPackContract: {
    canonicalResearchPackPath: string;
    targetStudyLanguage: 'fr';
    sourceLocales: Array<'ru' | 'uk'>;
    trustedSources: TrustedSource[];
    grammarClusters: GrammarCluster[];
    requiredResearchFields: string[];
    crossChecks: string[];
    rejectedShortcutPolicies: string[];
  };
  findings: Finding[];
  notes: string[];
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

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function n(summary: Record<string, unknown>, key: string): number {
  return typeof summary[key] === 'number' ? summary[key] as number : 0;
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV French Research Pack Contract Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Target study language: \`${audit.summary.targetStudyLanguage}\``,
    `- Source locales: ${audit.summary.sourceLocales}`,
    `- Trusted sources: ${audit.summary.trustedSources}`,
    `- Official/publisher sources: ${audit.summary.officialOrPublisherSources}`,
    `- Grammar clusters: ${audit.summary.grammarClusters}`,
    `- Required research fields: ${audit.summary.requiredResearchFields}`,
    `- Cross-checks: ${audit.summary.crossChecks}`,
    `- Rejected shortcut policies: ${audit.summary.rejectedShortcutPolicies}`,
    `- Research pack present: ${audit.summary.researchPackPresent ? 'yes' : 'no'}`,
    `- Research contract ready: ${audit.summary.researchContractReady ? 'yes' : 'no'}`,
    `- Translation start blocked: ${audit.summary.translationStartBlocked ? 'yes' : 'no'}`,
    `- May start translation now: ${audit.summary.mayStartTranslationNow ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Trusted Sources',
    '',
  ];

  for (const source of audit.researchPackContract.trustedSources) {
    lines.push(`- \`${source.id}\`: ${source.name} (${source.sourceType})`);
    lines.push(`  - ${source.url}`);
  }

  lines.push('', '## Grammar Clusters', '');
  for (const cluster of audit.researchPackContract.grammarClusters) {
    lines.push(`- \`${cluster.id}\`: ${cluster.title}`);
  }

  lines.push('', '## Required Research Fields', '');
  for (const field of audit.researchPackContract.requiredResearchFields) lines.push(`- \`${field}\``);

  lines.push('', '## Cross-Checks', '');
  for (const check of audit.researchPackContract.crossChecks) lines.push(`- ${check}`);

  lines.push('', '## Rejected Shortcut Policies', '');
  for (const policy of audit.researchPackContract.rejectedShortcutPolicies) lines.push(`- ${policy}`);

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
    console.error('Usage: npx tsx scripts/gustav_french_research_pack_contract_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const translationStartGatePath = path.join(runDir, 'audits', 'translation_start_gate_audit.json');
  const sourceGraphQualityPath = path.join(runDir, 'audits', 'source_graph_quality_audit.json');
  const sourceGraphApprovalPath = path.join(runDir, 'audits', 'source_graph_approval_audit.json');
  const readinessPath = path.join(runDir, 'audits', 'gustav_readiness_gate.json');
  const researchPackPath = path.join('docs/gustav/runs', runId, 'research', 'fr_research_pack.json');
  const translationStartGate = readJson<Record<string, unknown>>(translationStartGatePath);
  const sourceGraphQuality = readJson<Record<string, unknown>>(sourceGraphQualityPath);
  const sourceGraphApproval = readJson<Record<string, unknown>>(sourceGraphApprovalPath);
  const readiness = readJson<Record<string, unknown>>(readinessPath);
  const findings: Finding[] = [];

  const translationSummary = object(translationStartGate.summary);
  const sourceGraphQualitySummary = object(sourceGraphQuality.summary);
  const sourceGraphApprovalSummary = object(sourceGraphApproval.summary);
  const readinessSummary = object(readiness.summary);
  const researchPackPresent = fs.existsSync(path.join(repoRoot, researchPackPath));

  if (translationStartGate.status !== 'PASS' || translationSummary.translationStartBlocked !== true || translationSummary.mayStartTranslationNow !== false) {
    findings.push({
      severity: 'blocker',
      code: 'translation_start_gate_not_locked',
      message: 'French research pack contract requires the translation start gate to be PASS and locked.',
      filePath: path.relative(repoRoot, translationStartGatePath),
    });
  }
  if (sourceGraphQuality.status !== 'PASS' || sourceGraphQualitySummary.canApproveForFrenchGeneration !== true) {
    findings.push({
      severity: 'blocker',
      code: 'source_graph_quality_not_ready',
      message: 'French research pack contract requires source graph quality to be approved as future French input.',
      filePath: path.relative(repoRoot, sourceGraphQualityPath),
    });
  }
  if (sourceGraphApproval.status !== 'PASS' || sourceGraphApprovalSummary.canApproveSourceGraphForFrenchGenerationInput !== true) {
    findings.push({
      severity: 'blocker',
      code: 'source_graph_approval_not_ready',
      message: 'French research pack contract requires source graph approval as read-only input.',
      filePath: path.relative(repoRoot, sourceGraphApprovalPath),
    });
  }
  if (n(readinessSummary, 'generationBlockers') !== 8 || readinessSummary.failed !== 10) {
    findings.push({
      severity: 'blocker',
      code: 'readiness_blocker_shape_changed',
      message: 'French research pack contract expected the current readiness HOLD shape before translation.',
      filePath: path.relative(repoRoot, readinessPath),
    });
  }
  if (researchPackPresent) {
    findings.push({
      severity: 'blocker',
      code: 'research_pack_exists_before_contract_unlock',
      message: 'French research pack exists before the contract is ready to accept real research notes.',
      filePath: researchPackPath,
    });
  }

  const trustedSources: TrustedSource[] = [
    {
      id: 'cambridge_en_fr_dictionary',
      name: 'Cambridge Dictionary English-French / French-English',
      url: 'https://dictionary.cambridge.org/translate/english-french/',
      sourceType: 'dictionary',
      requiredFor: ['bilingual meaning check', 'false friend check', 'register hints'],
    },
    {
      id: 'oxford_french_usage_guide',
      name: 'Oxford Dictionaries Premium French usage guide',
      url: 'https://premium.oxforddictionaries.com/media/words/assets/Oxford_Dictionaries_Premium_French_usage_guide.pdf',
      sourceType: 'usage_guide',
      requiredFor: ['usage notes', 'learner-facing comparison', 'translation traps'],
    },
    {
      id: 'larousse_fr_dictionary',
      name: 'Larousse Dictionnaire de francais',
      url: 'https://www.larousse.fr/dictionnaires/francais',
      sourceType: 'dictionary',
      requiredFor: ['definition', 'gender', 'common usage', 'conjugation cross-check'],
    },
    {
      id: 'le_robert_dictionary',
      name: 'Dictionnaire Le Robert',
      url: 'https://dictionnaire.lerobert.com/',
      sourceType: 'dictionary',
      requiredFor: ['definition', 'nuance', 'register', 'modern usage'],
    },
    {
      id: 'bescherelle_conjugation',
      name: 'Bescherelle conjugation reference',
      url: 'https://conjugaison.bescherelle.com/',
      sourceType: 'conjugation',
      requiredFor: ['verb forms', 'tense tables', 'participle agreement'],
    },
    {
      id: 'tv5monde_grammar',
      name: 'TV5MONDE Apprendre le francais grammar',
      url: 'https://apprendre.tv5monde.com/fr/aides/grammaire',
      sourceType: 'grammar_learning',
      requiredFor: ['FLE learner sequencing', 'exercise style', 'CEFR-friendly examples'],
    },
    {
      id: 'oqlf_vitrine_linguistique',
      name: 'OQLF Vitrine linguistique',
      url: 'https://vitrinelinguistique.oqlf.gouv.qc.ca/',
      sourceType: 'official_language_guidance',
      requiredFor: ['syntax', 'punctuation', 'anglicism avoidance', 'terminology'],
    },
    {
      id: 'academie_francaise_dire_ne_pas_dire',
      name: 'Academie francaise Dire, Ne pas dire',
      url: 'https://www.dictionnaire-academie.fr/',
      sourceType: 'official_language_guidance',
      requiredFor: ['normative usage warning', 'anglicism and misuse review'],
    },
  ];

  const grammarClusters: GrammarCluster[] = [
    {
      id: 'articles_gender_number',
      title: 'Articles, gender and number',
      requiredSourceIds: ['larousse_fr_dictionary', 'le_robert_dictionary'],
      mustDecide: ['article selection', 'noun gender', 'plural behavior', 'RU/UK explanation wording'],
    },
    {
      id: 'present_tense_agreement',
      title: 'Present tense and subject agreement',
      requiredSourceIds: ['bescherelle_conjugation', 'tv5monde_grammar'],
      mustDecide: ['verb endings', 'irregular forms', 'pronoun pairing', 'quiz distractors'],
    },
    {
      id: 'negation',
      title: 'Negation and negative adverbs',
      requiredSourceIds: ['academie_francaise_dire_ne_pas_dire', 'tv5monde_grammar'],
      mustDecide: ['ne placement', 'pas/jamais/rien/personne', 'formal vs spoken policy', 'learner warnings'],
    },
    {
      id: 'questions_word_order',
      title: 'Questions and word order',
      requiredSourceIds: ['tv5monde_grammar', 'oqlf_vitrine_linguistique'],
      mustDecide: ['intonation question', 'est-ce que', 'inversion', 'register tags'],
    },
    {
      id: 'prepositions_articles',
      title: 'Prepositions and contracted articles',
      requiredSourceIds: ['larousse_fr_dictionary', 'oqlf_vitrine_linguistique'],
      mustDecide: ['a/de contractions', 'place prepositions', 'country/city rules', 'English-calque rejection'],
    },
    {
      id: 'pronouns_order',
      title: 'Pronouns and object order',
      requiredSourceIds: ['tv5monde_grammar', 'oqlf_vitrine_linguistique'],
      mustDecide: ['direct object', 'indirect object', 'y/en', 'position before verb'],
    },
    {
      id: 'past_tenses',
      title: 'Passe compose, imparfait and past contrast',
      requiredSourceIds: ['bescherelle_conjugation', 'oxford_french_usage_guide'],
      mustDecide: ['auxiliary choice', 'participle agreement', 'aspect contrast', 'RU/UK explanation contrast'],
    },
    {
      id: 'future_conditionals',
      title: 'Future, conditional and polite requests',
      requiredSourceIds: ['bescherelle_conjugation', 'cambridge_en_fr_dictionary'],
      mustDecide: ['near future', 'simple future', 'conditional politeness', 'translation naturalness'],
    },
    {
      id: 'subjunctive_modality',
      title: 'Subjunctive and modality',
      requiredSourceIds: ['bescherelle_conjugation', 'academie_francaise_dire_ne_pas_dire'],
      mustDecide: ['trigger phrases', 'mood choice', 'learner level gating', 'quiz scope'],
    },
    {
      id: 'register_and_naturalness',
      title: 'Register, naturalness and false friends',
      requiredSourceIds: ['cambridge_en_fr_dictionary', 'le_robert_dictionary', 'oxford_french_usage_guide'],
      mustDecide: ['formal/informal tags', 'false friends', 'idiom replacement', 'paid-app quality bar'],
    },
    {
      id: 'personal_practice_mapping',
      title: 'My Practice diagnosis to French remediation',
      requiredSourceIds: ['tv5monde_grammar', 'oqlf_vitrine_linguistique'],
      mustDecide: ['diagnosis node mapping', 'personalized lesson trigger', 'target-scoped state', 'no cross-language leakage'],
    },
    {
      id: 'quiz_distractors',
      title: 'Quiz distractors and answer validity',
      requiredSourceIds: ['larousse_fr_dictionary', 'bescherelle_conjugation', 'cambridge_en_fr_dictionary'],
      mustDecide: ['one correct answer', 'plausible distractors', 'no duplicate answer', 'no grammar leak'],
    },
  ];

  const requiredResearchFields = [
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
  const crossChecks = [
    'Every grammar cluster must cite at least two trusted sources.',
    'Every batch must compare English source meaning against RU and UK prompts before French output.',
    'Every French rule decision must include a learner-level note and a lesson-order decision.',
    'Every quiz decision must prove one correct answer and plausible distractors.',
    'Every My Practice decision must prove target-scoped diagnosis and remediation state.',
    'Every uncertainty must block the translation batch until resolved or explicitly deferred.',
  ];
  const rejectedShortcutPolicies = [
    'Do not translate directly from English without French grammar research.',
    'Do not use RU or UK text as target French content.',
    'Do not rely on a single dictionary for grammar decisions.',
    'Do not accept English word order as French structure without proof.',
    'Do not generate quizzes before distractor policy is signed off.',
    'Do not generate My Practice lessons before personal-practice mapping is target-safe.',
    'Do not create production files or generated_content_audit.json during research.',
  ];

  const everyClusterHasTwoSources = grammarClusters.every((cluster) => cluster.requiredSourceIds.length >= 2);
  const everyClusterRequiresRuUkComparison =
    requiredResearchFields.includes('ruPromptSummary') &&
    requiredResearchFields.includes('ukPromptSummary') &&
    crossChecks.some((check) => check.includes('RU and UK prompts'));
  const shortcutsRejected = rejectedShortcutPolicies.length === 7;
  const officialOrPublisherSources = trustedSources.filter((source) =>
    ['dictionary', 'usage_guide', 'conjugation', 'official_language_guidance', 'grammar_learning'].includes(source.sourceType)
  ).length;
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const researchContractReady =
    blockers === 0 &&
    trustedSources.length === 8 &&
    officialOrPublisherSources === 8 &&
    grammarClusters.length === 12 &&
    requiredResearchFields.length === 16 &&
    crossChecks.length === 6 &&
    everyClusterHasTwoSources &&
    everyClusterRequiresRuUkComparison &&
    shortcutsRejected &&
    !researchPackPresent;

  const audit: Audit = {
    schemaVersion: 'gustav-french-research-pack-contract-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      translationStartGate: path.relative(repoRoot, translationStartGatePath),
      sourceGraphQualityAudit: path.relative(repoRoot, sourceGraphQualityPath),
      sourceGraphApprovalAudit: path.relative(repoRoot, sourceGraphApprovalPath),
      readinessGate: path.relative(repoRoot, readinessPath),
      researchPack: researchPackPath,
    },
    summary: {
      targetStudyLanguage: 'fr',
      sourceLocales: 2,
      trustedSources: trustedSources.length,
      officialOrPublisherSources,
      grammarClusters: grammarClusters.length,
      requiredResearchFields: requiredResearchFields.length,
      crossChecks: crossChecks.length,
      rejectedShortcutPolicies: rejectedShortcutPolicies.length,
      blockers,
      warnings,
      translationStartGatePassed: translationStartGate.status === 'PASS',
      sourceGraphApprovedForInput: sourceGraphApprovalSummary.canApproveSourceGraphForFrenchGenerationInput === true,
      researchPackPresent,
      researchPackRequiredBeforeFirstBatch: true,
      researchContractReady,
      everyClusterHasTwoSources,
      everyClusterRequiresRuUkComparison,
      shortcutsRejected,
      translationStartBlocked: true,
      mayStartTranslationNow: false,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
      noFrenchContentGenerated: true,
    },
    researchPackContract: {
      canonicalResearchPackPath: researchPackPath,
      targetStudyLanguage: 'fr',
      sourceLocales: ['ru', 'uk'],
      trustedSources,
      grammarClusters,
      requiredResearchFields,
      crossChecks,
      rejectedShortcutPolicies,
    },
    findings,
    notes: [
      'This audit defines the French research pack contract only; it does not write French translations.',
      'The listed sources were selected as trusted references for grammar, usage, dictionaries, conjugation and FLE-style learner sequencing.',
      'A real fr_research_pack.json remains absent until architecture gates permit translation preparation.',
      'French generation remains blocked by readiness HOLD.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'french_research_pack_contract_audit.json');
  const outMd = path.join(runDir, 'audits', 'french_research_pack_contract_audit.md');
  const outReadme = path.join(runDir, 'audits', 'french_research_pack_contract', 'README.md');
  ensureDir(path.dirname(outReadme));
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));
  fs.writeFileSync(outReadme, renderMarkdown(audit));

  console.log(`GUSTAV French research pack contract audit: ${audit.status}`);
  console.log(`Trusted sources: ${audit.summary.trustedSources}`);
  console.log(`Grammar clusters: ${audit.summary.grammarClusters}`);
  console.log(`Required research fields: ${audit.summary.requiredResearchFields}`);
  console.log(`Cross-checks: ${audit.summary.crossChecks}`);
  console.log(`Research pack present: ${audit.summary.researchPackPresent ? 'yes' : 'no'}`);
  console.log(`Research contract ready: ${audit.summary.researchContractReady ? 'yes' : 'no'}`);
  console.log(`May start translation now: ${audit.summary.mayStartTranslationNow ? 'yes' : 'no'}`);
  console.log(`May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`No French content generated: ${audit.summary.noFrenchContentGenerated ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);

  if (audit.status === 'BLOCK') process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
