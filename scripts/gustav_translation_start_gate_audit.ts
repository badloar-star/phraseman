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

type TranslationAgent = {
  id: string;
  department: string;
  responsibility: string;
  prompt: string;
  blocksIfMissing: boolean;
};

type TranslationUnitPlan = {
  domain: string;
  count: number;
  sourceGraphField: string;
  requiredChecks: string[];
};

type Audit = {
  schemaVersion: 'gustav-translation-start-gate-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    readinessGate: string;
    sourceGraph: string;
    sourceGraphQualityAudit: string;
    sourceGraphApprovalAudit: string;
    generatedContentAudit: string;
  };
  summary: {
    targetStudyLanguage: 'fr';
    sourceLocales: number;
    approvedSourceLocales: number;
    translationDomains: number;
    translationAgents: number;
    blockedReadinessChecks: number;
    generationBlockedReadinessChecks: number;
    requiredPreTranslationGates: number;
    forbiddenEarlyActions: number;
    blockers: number;
    warnings: number;
    sourceGraphApprovedForInput: boolean;
    sourceGraphQualityPassed: boolean;
    ruUkSourceLocaleCoveragePassed: boolean;
    generatedContentAuditPresent: boolean;
    targetIsolationReady: boolean;
    researchPackRequired: boolean;
    translationQueueReadyAfterArchitecture: boolean;
    translationStartBlocked: boolean;
    mayStartTranslationNow: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
    noFrenchContentGenerated: boolean;
  };
  translationScope: {
    targetStudyLanguage: 'fr';
    sourceLocales: Array<'ru' | 'uk'>;
    baseStudyTarget: 'en';
    unitPlans: TranslationUnitPlan[];
  };
  blockedReadinessChecks: Array<{
    id: string;
    title: string;
    blocks: string[];
    detail: string;
  }>;
  requiredPreTranslationGates: string[];
  forbiddenEarlyActions: string[];
  translationAgents: TranslationAgent[];
  researchPackContract: {
    required: boolean;
    timing: 'before_first_translation_batch';
    sourcePolicy: string[];
    comparisonPolicy: string[];
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

function arr<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function n(summary: Record<string, unknown>, key: string): number {
  return typeof summary[key] === 'number' ? summary[key] as number : 0;
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV Translation Start Gate Audit',
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
    `- Approved source locales: ${audit.summary.approvedSourceLocales}`,
    `- Translation domains: ${audit.summary.translationDomains}`,
    `- Translation agents: ${audit.summary.translationAgents}`,
    `- Blocked readiness checks: ${audit.summary.blockedReadinessChecks}`,
    `- Generation-blocking readiness checks: ${audit.summary.generationBlockedReadinessChecks}`,
    `- Source graph approved for input: ${audit.summary.sourceGraphApprovedForInput ? 'yes' : 'no'}`,
    `- Source graph quality passed: ${audit.summary.sourceGraphQualityPassed ? 'yes' : 'no'}`,
    `- RU/UK source-locale coverage passed: ${audit.summary.ruUkSourceLocaleCoveragePassed ? 'yes' : 'no'}`,
    `- Generated content audit present: ${audit.summary.generatedContentAuditPresent ? 'yes' : 'no'}`,
    `- Target isolation ready: ${audit.summary.targetIsolationReady ? 'yes' : 'no'}`,
    `- Research pack required: ${audit.summary.researchPackRequired ? 'yes' : 'no'}`,
    `- Translation start blocked: ${audit.summary.translationStartBlocked ? 'yes' : 'no'}`,
    `- May start translation now: ${audit.summary.mayStartTranslationNow ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Translation Units',
    '',
  ];

  for (const unit of audit.translationScope.unitPlans) {
    lines.push(`- \`${unit.domain}\`: ${unit.count} from \`${unit.sourceGraphField}\``);
  }

  lines.push('', '## Blocked Readiness Checks', '');
  for (const check of audit.blockedReadinessChecks) {
    lines.push(`- \`${check.id}\`: ${check.title}`);
  }

  lines.push('', '## Required Pre-Translation Gates', '');
  for (const gate of audit.requiredPreTranslationGates) lines.push(`- ${gate}`);

  lines.push('', '## Forbidden Early Actions', '');
  for (const action of audit.forbiddenEarlyActions) lines.push(`- ${action}`);

  lines.push('', '## Translation Agents', '');
  for (const agent of audit.translationAgents) {
    lines.push(`- \`${agent.id}\` (${agent.department}): ${agent.responsibility}`);
  }

  lines.push('', '## Research Pack Contract', '');
  lines.push(`Required: ${audit.researchPackContract.required ? 'yes' : 'no'}`);
  lines.push(`Timing: \`${audit.researchPackContract.timing}\``);
  lines.push('');
  lines.push('Source policy:');
  for (const rule of audit.researchPackContract.sourcePolicy) lines.push(`- ${rule}`);
  lines.push('');
  lines.push('Comparison policy:');
  for (const rule of audit.researchPackContract.comparisonPolicy) lines.push(`- ${rule}`);

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
    console.error('Usage: npx tsx scripts/gustav_translation_start_gate_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const readinessPath = path.join(runDir, 'audits', 'gustav_readiness_gate.json');
  const sourceGraphPath = path.join(runDir, 'source_graph', 'source_graph.json');
  const sourceGraphQualityPath = path.join(runDir, 'audits', 'source_graph_quality_audit.json');
  const sourceGraphApprovalPath = path.join(runDir, 'audits', 'source_graph_approval_audit.json');
  const generatedContentAuditPath = path.join(runDir, 'audits', 'generated_content_audit.json');
  const readiness = readJson<Record<string, unknown>>(readinessPath);
  const sourceGraph = readJson<Record<string, unknown>>(sourceGraphPath);
  const sourceGraphQuality = readJson<Record<string, unknown>>(sourceGraphQualityPath);
  const sourceGraphApproval = readJson<Record<string, unknown>>(sourceGraphApprovalPath);
  const findings: Finding[] = [];

  const readinessSummary = object(readiness.summary);
  const sourceGraphQualitySummary = object(sourceGraphQuality.summary);
  const sourceGraphApprovalSummary = object(sourceGraphApproval.summary);
  const readinessObject = object(readiness.readiness);
  const inputRef = object(sourceGraph.inputRef);
  const allowedSourceLocales = arr<string>(inputRef.allowedSourceLocales).filter((entry) => entry === 'ru' || entry === 'uk');
  const checks = arr<Record<string, unknown>>(readiness.checks);
  const failedChecks = checks.filter((check) => check.status === 'FAIL');
  const generationFailedChecks = failedChecks.filter((check) => arr<string>(check.blocks).includes('generation'));
  const targetIsolationReady =
    readinessObject.canStartFrenchGeneration === true &&
    n(readinessSummary, 'generationBlockers') === 0 &&
    failedChecks.length === 0;
  const sourceGraphApprovedForInput =
    sourceGraphApproval.status === 'PASS' &&
    sourceGraphApprovalSummary.canApproveSourceGraphForFrenchGenerationInput === true &&
    sourceGraphApprovalSummary.mayStartFrenchGeneration === false;
  const sourceGraphQualityPassed =
    sourceGraphQuality.status === 'PASS' &&
    sourceGraphQualitySummary.canApproveForFrenchGeneration === true &&
    n(sourceGraphQualitySummary, 'blockers') === 0 &&
    n(sourceGraphQualitySummary, 'highRisks') === 0;
  const ruUkSourceLocaleCoveragePassed =
    sourceGraphApprovedForInput &&
    sourceGraphApprovalSummary.ruUkPromptCoveragePass === true &&
    allowedSourceLocales.length === 2;
  const generatedContentAuditPresent = fs.existsSync(generatedContentAuditPath);

  if (!sourceGraphApprovedForInput) {
    findings.push({
      severity: 'blocker',
      code: 'source_graph_not_approved_for_translation_input',
      message: 'Translation start gate requires the source graph to be approved as read-only French input.',
      filePath: path.relative(repoRoot, sourceGraphApprovalPath),
    });
  }
  if (!sourceGraphQualityPassed) {
    findings.push({
      severity: 'blocker',
      code: 'source_graph_quality_not_pass',
      message: 'Translation start gate requires source graph quality to be PASS.',
      filePath: path.relative(repoRoot, sourceGraphQualityPath),
    });
  }
  if (!ruUkSourceLocaleCoveragePassed) {
    findings.push({
      severity: 'blocker',
      code: 'ru_uk_source_locale_coverage_missing',
      message: 'Translation start gate requires RU and UK source-locale coverage before French can be prepared.',
      filePath: path.relative(repoRoot, sourceGraphPath),
    });
  }
  if (targetIsolationReady) {
    findings.push({
      severity: 'blocker',
      code: 'translation_gate_unexpectedly_unblocked',
      message: 'Translation start gate expected target isolation to remain blocked in this architecture-only step.',
      filePath: path.relative(repoRoot, readinessPath),
    });
  }
  if (generatedContentAuditPresent) {
    findings.push({
      severity: 'blocker',
      code: 'generated_content_audit_exists_before_translation',
      message: 'Generated content audit exists before translation has been approved; this gate expects no French generation yet.',
      filePath: path.relative(repoRoot, generatedContentAuditPath),
    });
  }

  const unitPlans: TranslationUnitPlan[] = [
    {
      domain: 'lessons',
      count: n(sourceGraphQualitySummary, 'lessons'),
      sourceGraphField: 'lessons',
      requiredChecks: ['lesson_order_preserved', 'grammar_sequence_rebuilt_for_french'],
    },
    {
      domain: 'phrases',
      count: n(sourceGraphQualitySummary, 'phrases'),
      sourceGraphField: 'phrases',
      requiredChecks: ['meaning_preserved', 'natural_fr_expression', 'ru_uk_prompt_alignment'],
    },
    {
      domain: 'words',
      count: n(sourceGraphQualitySummary, 'words'),
      sourceGraphField: 'words',
      requiredChecks: ['lemma_gender_number', 'article_policy', 'audio_text_ready'],
    },
    {
      domain: 'intro_screens',
      count: n(sourceGraphQualitySummary, 'introScreens'),
      sourceGraphField: 'introScreens',
      requiredChecks: ['french_grammar_accuracy', 'source_locale_explanations_ru_uk'],
    },
    {
      domain: 'quizzes',
      count: n(sourceGraphQualitySummary, 'quizzes'),
      sourceGraphField: 'quizzes',
      requiredChecks: ['single_correct_answer', 'distractor_quality', 'no_english_calque'],
    },
    {
      domain: 'preposition_packs',
      count: 12,
      sourceGraphField: 'prepositionPacks',
      requiredChecks: ['french_preposition_research', 'example_naturalness'],
    },
    {
      domain: 'flashcards',
      count: n(sourceGraphQualitySummary, 'flashcards'),
      sourceGraphField: 'flashcards',
      requiredChecks: ['deck_isolation', 'source_locale_prompt_parity'],
    },
    {
      domain: 'daily_phrases',
      count: n(sourceGraphQualitySummary, 'dailyPhrases'),
      sourceGraphField: 'dailyPhrases',
      requiredChecks: ['natural_fr_usage', 'register_tagging'],
    },
    {
      domain: 'personal_practice',
      count: n(sourceGraphQualitySummary, 'personalPracticeNodes'),
      sourceGraphField: 'personalPracticeNodes',
      requiredChecks: ['diagnosis_mapping', 'personalized_lesson_policy', 'no_cross_target_state'],
    },
  ];

  const requiredPreTranslationGates = [
    'Readiness generation blockers must be zero.',
    'Target-safe storage architecture must be implemented and verified.',
    'Cloud sync must separate global, source-locale and study-target state.',
    'Achievement, stats, trainer, quiz, flashcard and My Practice state must be target-scoped.',
    'Generated French content audit schema must exist before any production apply.',
    'Research pack must be attached before first French translation batch.',
    'Per-domain translation agents must sign off on grammar, naturalness, source-locale parity and runtime shape.',
    'Translation output must stay inside the Gustav run container until explicit apply approval.',
  ];
  const forbiddenEarlyActions = [
    'Generate French lesson files.',
    'Translate phrases, words, quizzes, flashcards or My Practice nodes.',
    'Create generated_content_audit.json as if French exists.',
    'Modify production app files.',
    'Create production test files in tests/.',
    'Attach French content to routes or storage.',
    'Reuse English storage keys for French progress.',
    'Mix French target state with English or Spanish state.',
    'Skip research comparison for French-specific grammar and usage.',
    'Treat RU/UK prompts as target-language content.',
  ];
  const translationAgents: TranslationAgent[] = [
    {
      id: 'translation_director',
      department: 'Translation Office',
      responsibility: 'Owns the batch plan and refuses work until readiness permits generation.',
      prompt: 'You are the Gustav Translation Director. Use the approved English source graph as read-only input, keep source locales RU/UK separate, and block translation until readiness generation blockers are zero.',
      blocksIfMissing: true,
    },
    {
      id: 'french_grammar_researcher',
      department: 'Research Desk',
      responsibility: 'Compares each grammar point against trusted French-learning references before translation.',
      prompt: 'You are the French Grammar Researcher. Before any French output, prepare a research note for the grammar point, identify French-specific structures, and reject English calques.',
      blocksIfMissing: true,
    },
    {
      id: 'ru_source_locale_editor',
      department: 'RU Source Locale',
      responsibility: 'Checks Russian explanations, prompts and quiz wording for source-locale clarity.',
      prompt: 'You are the Russian Source-Locale Editor. Ensure every French learning item is understandable from Russian without mixing Russian text into French target fields.',
      blocksIfMissing: true,
    },
    {
      id: 'uk_source_locale_editor',
      department: 'UK Source Locale',
      responsibility: 'Checks Ukrainian explanations, prompts and quiz wording for source-locale clarity.',
      prompt: 'You are the Ukrainian Source-Locale Editor. Ensure every French learning item is understandable from Ukrainian without mixing Ukrainian text into French target fields.',
      blocksIfMissing: true,
    },
    {
      id: 'quiz_distractor_auditor',
      department: 'Assessment',
      responsibility: 'Validates single-answer quizzes and rejects weak distractors.',
      prompt: 'You are the Quiz Distractor Auditor. Verify every quiz has one correct answer, plausible wrong answers, no duplicate answers, and no answer leaked by wording.',
      blocksIfMissing: true,
    },
    {
      id: 'my_practice_personalization_auditor',
      department: 'My Practice',
      responsibility: 'Maps personal-practice diagnosis nodes to French-safe remediation lessons.',
      prompt: 'You are the My Practice Personalization Auditor. Keep diagnosis state target-scoped and reject any personalized lesson that cannot be traced to a French grammar or usage need.',
      blocksIfMissing: true,
    },
    {
      id: 'runtime_shape_auditor',
      department: 'Runtime QA',
      responsibility: 'Checks IDs, placeholders, file shapes, source refs and app container boundaries.',
      prompt: 'You are the Runtime Shape Auditor. Reject any output with unstable IDs, missing source refs, placeholder drift, route coupling, or cross-language container leakage.',
      blocksIfMissing: true,
    },
    {
      id: 'final_native_quality_gate',
      department: 'Linguistic QA',
      responsibility: 'Final pass for natural French, register, grammar, spelling and learner suitability.',
      prompt: 'You are the Final Native Quality Gate. Approve only natural, grammatical French that matches the lesson goal, source meaning, learner level and app runtime constraints.',
      blocksIfMissing: true,
    },
  ];

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const translationQueueReadyAfterArchitecture =
    blockers === 0 &&
    sourceGraphApprovedForInput &&
    sourceGraphQualityPassed &&
    ruUkSourceLocaleCoveragePassed &&
    unitPlans.length === 9 &&
    translationAgents.length === 8 &&
    requiredPreTranslationGates.length === 8 &&
    forbiddenEarlyActions.length === 10;
  const translationStartBlocked = !targetIsolationReady;

  const audit: Audit = {
    schemaVersion: 'gustav-translation-start-gate-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      readinessGate: path.relative(repoRoot, readinessPath),
      sourceGraph: path.relative(repoRoot, sourceGraphPath),
      sourceGraphQualityAudit: path.relative(repoRoot, sourceGraphQualityPath),
      sourceGraphApprovalAudit: path.relative(repoRoot, sourceGraphApprovalPath),
      generatedContentAudit: path.relative(repoRoot, generatedContentAuditPath),
    },
    summary: {
      targetStudyLanguage: 'fr',
      sourceLocales: 2,
      approvedSourceLocales: allowedSourceLocales.length,
      translationDomains: unitPlans.length,
      translationAgents: translationAgents.length,
      blockedReadinessChecks: failedChecks.length,
      generationBlockedReadinessChecks: generationFailedChecks.length,
      requiredPreTranslationGates: requiredPreTranslationGates.length,
      forbiddenEarlyActions: forbiddenEarlyActions.length,
      blockers,
      warnings,
      sourceGraphApprovedForInput,
      sourceGraphQualityPassed,
      ruUkSourceLocaleCoveragePassed,
      generatedContentAuditPresent,
      targetIsolationReady,
      researchPackRequired: true,
      translationQueueReadyAfterArchitecture,
      translationStartBlocked,
      mayStartTranslationNow: false,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
      noFrenchContentGenerated: true,
    },
    translationScope: {
      targetStudyLanguage: 'fr',
      sourceLocales: ['ru', 'uk'],
      baseStudyTarget: 'en',
      unitPlans,
    },
    blockedReadinessChecks: failedChecks.map((check) => ({
      id: String(check.id || ''),
      title: String(check.title || ''),
      blocks: arr<string>(check.blocks).filter((entry) => typeof entry === 'string'),
      detail: String(check.detail || ''),
    })),
    requiredPreTranslationGates,
    forbiddenEarlyActions,
    translationAgents,
    researchPackContract: {
      required: true,
      timing: 'before_first_translation_batch',
      sourcePolicy: [
        'Use trusted French grammar and learner-reference sources for each grammar cluster before producing French.',
        'Record source name, checked point, decision and uncertainty for every research-backed rule.',
        'Do not rely only on the English base when French grammar requires a different lesson order or explanation.',
      ],
      comparisonPolicy: [
        'Compare English source meaning, Russian prompt and Ukrainian prompt before writing French.',
        'Flag English calques, false friends, article/gender drift, pronoun order drift and tense/aspect mismatches.',
        'Require a separate generated-content audit before any translated batch can be considered app-ready.',
      ],
    },
    findings,
    notes: [
      'This audit prepares the translation start gate only; it does not generate French content.',
      'The English source graph is approved as read-only input, but target-isolation readiness still blocks translation.',
      'RU and UK are source locales for learning French; they must stay separate from French target fields.',
      'The next safe work is still architecture/research preparation, not French generation.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'translation_start_gate_audit.json');
  const outMd = path.join(runDir, 'audits', 'translation_start_gate_audit.md');
  const outReadme = path.join(runDir, 'audits', 'translation_start_gate', 'README.md');
  ensureDir(path.dirname(outReadme));
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));
  fs.writeFileSync(outReadme, renderMarkdown(audit));

  console.log(`GUSTAV translation start gate audit: ${audit.status}`);
  console.log(`Target study language: ${audit.summary.targetStudyLanguage}`);
  console.log(`Source locales: ${audit.summary.approvedSourceLocales}/${audit.summary.sourceLocales}`);
  console.log(`Translation domains: ${audit.summary.translationDomains}`);
  console.log(`Translation agents: ${audit.summary.translationAgents}`);
  console.log(`Generation-blocking readiness checks: ${audit.summary.generationBlockedReadinessChecks}`);
  console.log(`Translation start blocked: ${audit.summary.translationStartBlocked ? 'yes' : 'no'}`);
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
