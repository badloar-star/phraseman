import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

type Status = 'PASS' | 'BLOCK';
type FindingSeverity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: FindingSeverity;
  code: string;
  message: string;
  path?: string;
};

type PlanId = 'echo' | 'gavan' | 'impuls';

type PlanConfig = {
  planId: PlanId;
  filePath: string;
  arrayExport: string;
  dayExportPrefix: string;
  expectedDays: number;
};

type PlanValidationSummary = {
  planId: PlanId;
  sourcePath: string;
  expectedDays: number;
  individualDayExports: number;
  aggregateDays: number;
  uniqueDayIndices: number;
  duplicateDayIndices: number[];
  missingDayIndices: number[];
  phrases: number;
  introScreens: number;
  vocabularyWords: number;
  phraseWords: number;
  distractors: number;
  daysWithMissingExplanation: number;
  phrasesWithMissingWords: number;
  wordsWithMissingDistractors: number;
  wordsWithWrongDistractorCount: number;
  daysWithMissingVocabulary: number;
  daysWithMissingIntro: number;
  blockers: number;
  warnings: number;
};

type RuntimeAdapterContract = {
  sourcePath: string;
  requiredExports: string[];
  presentExports: string[];
  missingExports: string[];
  sourceLocaleFallback: string[];
};

type Report = {
  schemaVersion: 'gustav-personal-plan-content-contract-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: {
    p2DomainRegistryPacket: string;
    sourceFiles: string[];
  };
  summary: {
    expectedPlanDays: number;
    aggregatePlanDays: number;
    individualDayExports: number;
    uniqueDayIndices: number;
    phrases: number;
    introScreens: number;
    vocabularyWords: number;
    phraseWords: number;
    distractors: number;
    runtimeAdapterRequiredExports: number;
    runtimeAdapterMissingExports: number;
    plansWithExpectedDayCount: number;
    blockers: number;
    warnings: number;
    readyForP8ReadinessExtension: boolean;
    readyForFrenchPlanGeneration: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  planSummaries: PlanValidationSummary[];
  localizedTextContract: {
    requiredLocale: 'ru';
    optionalLocales: string[];
    allowedFallbackBehavior: string[];
    frenchGenerationSeparation: string[];
  };
  runtimeAdapterContract: RuntimeAdapterContract;
  blockersByCode: Record<string, number>;
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    frenchPlanContentGeneratedByThisScript: false;
    productionApplyApproved: false;
  };
};

const PLANS: PlanConfig[] = [
  {
    planId: 'echo',
    filePath: 'app/plan_content_echo.ts',
    arrayExport: 'ECHO_CONTENT_DAYS',
    dayExportPrefix: 'ECHO_DAY_',
    expectedDays: 84,
  },
  {
    planId: 'gavan',
    filePath: 'app/plan_content_gavan.ts',
    arrayExport: 'GAVAN_CONTENT_DAYS',
    dayExportPrefix: 'GAVAN_DAY_',
    expectedDays: 126,
  },
  {
    planId: 'impuls',
    filePath: 'app/plan_content_impuls.ts',
    arrayExport: 'IMPULS_CONTENT_DAYS',
    dayExportPrefix: 'IMPULS_DAY_',
    expectedDays: 140,
  },
];

const SOURCE_FILES = [
  'app/plan_content_schema.ts',
  'app/plan_content_echo.ts',
  'app/plan_content_gavan.ts',
  'app/plan_content_impuls.ts',
  'app/plan_content_runtime_adapter.ts',
  'app/personal_plan_phrase_explanation.ts',
  'app/personal_plan_quizzes.ts',
  'tests/plan_content_runtime_adapter.test.ts',
];

const REQUIRED_RUNTIME_EXPORTS = [
  'explanationToTeachingNote',
  'contentPhraseToLessonPhrase',
  'contentDayToLessonPhrases',
  'contentIntroToLessonIntroScreen',
  'contentDayToLessonIntroScreens',
  'contentVocabularyToRuntimeCards',
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function countRegex(text: string, re: RegExp): number {
  return (text.match(re) ?? []).length;
}

function hasRu(text: any): boolean {
  return Boolean(text && typeof text.ru === 'string' && text.ru.trim().length > 0);
}

function localizedComplete(text: any): boolean {
  return hasRu(text);
}

function phraseExplanationComplete(explanation: any): boolean {
  return Boolean(
    explanation &&
      localizedComplete(explanation.title) &&
      localizedComplete(explanation.rule) &&
      localizedComplete(explanation.why) &&
      localizedComplete(explanation.commonMistake),
  );
}

function countBlocker(findings: Finding[], code: string, message: string, sourcePath: string): void {
  findings.push({
    severity: 'blocker',
    code,
    message,
    path: sourcePath,
  });
}

function countWarning(findings: Finding[], code: string, message: string, sourcePath: string): void {
  findings.push({
    severity: 'warning',
    code,
    message,
    path: sourcePath,
  });
}

function uniqueNumbers(values: number[]): number[] {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

function missingRange(max: number, values: number[]): number[] {
  const set = new Set(values);
  const missing: number[] = [];
  for (let i = 1; i <= max; i += 1) {
    if (!set.has(i)) missing.push(i);
  }
  return missing;
}

async function importTsModule(repoRoot: string, relativePath: string): Promise<Record<string, any>> {
  const full = path.resolve(repoRoot, relativePath);
  return import(pathToFileURL(full).href);
}

async function validatePlan(repoRoot: string, config: PlanConfig, findings: Finding[]): Promise<PlanValidationSummary> {
  const full = path.resolve(repoRoot, config.filePath);
  const text = fs.readFileSync(full, 'utf8');
  const individualDayExports = countRegex(text, new RegExp(`export const ${config.dayExportPrefix}\\d+: PlanContentDay`, 'g'));
  const mod = await importTsModule(repoRoot, config.filePath);
  const days = Array.isArray(mod[config.arrayExport]) ? mod[config.arrayExport] : [];

  const dayIndices = days
    .map((day: any) => Number(day?.dayIndex))
    .filter((value: number) => Number.isFinite(value));
  const uniqueDayIndices = uniqueNumbers(dayIndices);
  const duplicateDayIndices = uniqueNumbers(dayIndices.filter((value, index) => dayIndices.indexOf(value) !== index));
  const missingDayIndices = missingRange(config.expectedDays, uniqueDayIndices);

  let phrases = 0;
  let introScreens = 0;
  let vocabularyWords = 0;
  let phraseWords = 0;
  let distractors = 0;
  let daysWithMissingExplanation = 0;
  let phrasesWithMissingWords = 0;
  let wordsWithMissingDistractors = 0;
  let wordsWithWrongDistractorCount = 0;
  let daysWithMissingVocabulary = 0;
  let daysWithMissingIntro = 0;

  if (individualDayExports !== config.expectedDays) {
    countBlocker(
      findings,
      'unexpected_individual_day_export_count',
      `${config.planId} expected ${config.expectedDays} individual day exports but found ${individualDayExports}.`,
      config.filePath,
    );
  }
  if (days.length !== config.expectedDays) {
    countBlocker(
      findings,
      'unexpected_aggregate_day_count',
      `${config.planId} expected ${config.expectedDays} aggregate days but found ${days.length}.`,
      config.filePath,
    );
  }
  if (duplicateDayIndices.length > 0) {
    countBlocker(
      findings,
      'duplicate_day_index',
      `${config.planId} has duplicate dayIndex values: ${duplicateDayIndices.join(', ')}.`,
      config.filePath,
    );
  }
  if (missingDayIndices.length > 0) {
    countBlocker(
      findings,
      'missing_day_index',
      `${config.planId} is missing dayIndex values: ${missingDayIndices.slice(0, 20).join(', ')}${missingDayIndices.length > 20 ? '...' : ''}.`,
      config.filePath,
    );
  }

  for (const day of days) {
    if (day?.planId !== config.planId) {
      countBlocker(
        findings,
        'day_plan_id_mismatch',
        `${config.planId} aggregate contains a day with planId ${String(day?.planId)}.`,
        config.filePath,
      );
    }
    if (!localizedComplete(day?.topic) || !localizedComplete(day?.outcome)) {
      countBlocker(
        findings,
        'day_missing_topic_or_outcome',
        `${config.planId} day ${String(day?.dayIndex)} is missing ru topic/outcome.`,
        config.filePath,
      );
    }
    if (!Array.isArray(day?.prerequisiteLessons) || day.prerequisiteLessons.length === 0) {
      countWarning(
        findings,
        'day_missing_prerequisites',
        `${config.planId} day ${String(day?.dayIndex)} has no prerequisiteLessons.`,
        config.filePath,
      );
    }
    if (!Array.isArray(day?.intro) || day.intro.length === 0) {
      daysWithMissingIntro += 1;
      countBlocker(
        findings,
        'missing_intro',
        `${config.planId} day ${String(day?.dayIndex)} has no intro screens.`,
        config.filePath,
      );
    } else {
      introScreens += day.intro.length;
      for (const screen of day.intro) {
        if (!localizedComplete(screen?.title) || !localizedComplete(screen?.body)) {
          countBlocker(
            findings,
            'intro_screen_incomplete',
            `${config.planId} day ${String(day?.dayIndex)} has an incomplete intro screen.`,
            config.filePath,
          );
        }
      }
    }

    if (!Array.isArray(day?.phrases) || day.phrases.length === 0) {
      countBlocker(
        findings,
        'missing_phrases',
        `${config.planId} day ${String(day?.dayIndex)} has no phrases.`,
        config.filePath,
      );
      continue;
    }
    phrases += day.phrases.length;

    for (const phrase of day.phrases) {
      if (!phrase?.id || !phrase?.english || !localizedComplete(phrase?.meaning)) {
        countBlocker(
          findings,
          'phrase_missing_core_fields',
          `${config.planId} day ${String(day?.dayIndex)} has a phrase missing id, english, or ru meaning.`,
          config.filePath,
        );
      }
      if (!Array.isArray(phrase?.constructions) || phrase.constructions.length === 0) {
        countBlocker(
          findings,
          'phrase_missing_constructions',
          `${config.planId} phrase ${String(phrase?.id)} has no constructions.`,
          config.filePath,
        );
      }
      if (!phraseExplanationComplete(phrase?.explanation)) {
        daysWithMissingExplanation += 1;
        countBlocker(
          findings,
          'phrase_missing_explanation',
          `${config.planId} phrase ${String(phrase?.id)} has incomplete title/rule/why/commonMistake explanation.`,
          config.filePath,
        );
      }
      if (!Array.isArray(phrase?.words) || phrase.words.length === 0) {
        phrasesWithMissingWords += 1;
        countBlocker(
          findings,
          'phrase_missing_words',
          `${config.planId} phrase ${String(phrase?.id)} has no word bank entries.`,
          config.filePath,
        );
      } else {
        phraseWords += phrase.words.length;
        for (const word of phrase.words) {
          if (!word?.text || !word?.partOfSpeech) {
            countBlocker(
              findings,
              'word_missing_text_or_pos',
              `${config.planId} phrase ${String(phrase?.id)} has a word without text or partOfSpeech.`,
              config.filePath,
            );
          }
          if (!Array.isArray(word?.distractors) || word.distractors.length === 0) {
            wordsWithMissingDistractors += 1;
            countBlocker(
              findings,
              'word_missing_distractors',
              `${config.planId} phrase ${String(phrase?.id)} word ${String(word?.text)} has no distractors.`,
              config.filePath,
            );
          } else {
            distractors += word.distractors.length;
            if (word.distractors.length !== 5) {
              wordsWithWrongDistractorCount += 1;
              countBlocker(
                findings,
                'word_wrong_distractor_count',
                `${config.planId} phrase ${String(phrase?.id)} word ${String(word?.text)} has ${word.distractors.length} distractors instead of 5.`,
                config.filePath,
              );
            }
          }
        }
      }
    }

    if (!Array.isArray(day?.vocabulary) || day.vocabulary.length === 0) {
      daysWithMissingVocabulary += 1;
      countBlocker(
        findings,
        'missing_vocabulary',
        `${config.planId} day ${String(day?.dayIndex)} has no vocabulary.`,
        config.filePath,
      );
    } else {
      vocabularyWords += day.vocabulary.length;
      for (const vocab of day.vocabulary) {
        if (!vocab?.word || !vocab?.partOfSpeech || !localizedComplete(vocab?.translation) || !vocab?.example) {
          countBlocker(
            findings,
            'vocab_incomplete',
            `${config.planId} day ${String(day?.dayIndex)} has incomplete vocabulary item ${String(vocab?.word)}.`,
            config.filePath,
          );
        }
      }
    }
  }

  const planFindings = findings.filter((finding) => finding.path === config.filePath);
  return {
    planId: config.planId,
    sourcePath: config.filePath,
    expectedDays: config.expectedDays,
    individualDayExports,
    aggregateDays: days.length,
    uniqueDayIndices: uniqueDayIndices.length,
    duplicateDayIndices,
    missingDayIndices,
    phrases,
    introScreens,
    vocabularyWords,
    phraseWords,
    distractors,
    daysWithMissingExplanation,
    phrasesWithMissingWords,
    wordsWithMissingDistractors,
    wordsWithWrongDistractorCount,
    daysWithMissingVocabulary,
    daysWithMissingIntro,
    blockers: planFindings.filter((finding) => finding.severity === 'blocker').length,
    warnings: planFindings.filter((finding) => finding.severity === 'warning').length,
  };
}

async function buildRuntimeAdapterContract(repoRoot: string, findings: Finding[]): Promise<RuntimeAdapterContract> {
  const sourcePath = 'app/plan_content_runtime_adapter.ts';
  const mod = await importTsModule(repoRoot, sourcePath);
  const presentExports = REQUIRED_RUNTIME_EXPORTS.filter((name) => typeof mod[name] === 'function');
  const missingExports = REQUIRED_RUNTIME_EXPORTS.filter((name) => typeof mod[name] !== 'function');
  for (const name of missingExports) {
    countBlocker(
      findings,
      'runtime_adapter_missing_export',
      `Runtime adapter does not export ${name}.`,
      sourcePath,
    );
  }

  return {
    sourcePath,
    requiredExports: REQUIRED_RUNTIME_EXPORTS,
    presentExports,
    missingExports,
    sourceLocaleFallback: [
      'LocalizedText.ru is required.',
      'uk and es adapter values fall back to ru when missing.',
      'pt-BR, vi, id, tr, and pl sourceLocales are emitted only when present and non-empty.',
      'LessonPhrase.ukrainian falls back to phrase.meaning.ru when phrase.meaning.uk is absent.',
      'Runtime adapter maps phrase explanation rule+why to the correct teaching-note side and commonMistake to the wrong side.',
    ],
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Personal Plan Content Contract Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Expected plan days: ${report.summary.expectedPlanDays}`,
    `- Aggregate plan days: ${report.summary.aggregatePlanDays}`,
    `- Individual day exports: ${report.summary.individualDayExports}`,
    `- Unique day indices: ${report.summary.uniqueDayIndices}`,
    `- Phrases: ${report.summary.phrases}`,
    `- Intro screens: ${report.summary.introScreens}`,
    `- Vocabulary words: ${report.summary.vocabularyWords}`,
    `- Phrase words: ${report.summary.phraseWords}`,
    `- Distractors: ${report.summary.distractors}`,
    `- Runtime adapter required exports: ${report.summary.runtimeAdapterRequiredExports}`,
    `- Runtime adapter missing exports: ${report.summary.runtimeAdapterMissingExports}`,
    `- Plans with expected day count: ${report.summary.plansWithExpectedDayCount}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Ready for P8 readiness extension: ${report.summary.readyForP8ReadinessExtension ? 'yes' : 'no'}`,
    `- Ready for French plan generation: ${report.summary.readyForFrenchPlanGeneration ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Plan Counts',
    '',
  ];

  for (const plan of report.planSummaries) {
    lines.push(`### ${plan.planId}`);
    lines.push('');
    lines.push(`- Expected days: ${plan.expectedDays}`);
    lines.push(`- Individual day exports: ${plan.individualDayExports}`);
    lines.push(`- Aggregate days: ${plan.aggregateDays}`);
    lines.push(`- Unique day indices: ${plan.uniqueDayIndices}`);
    lines.push(`- Phrases: ${plan.phrases}`);
    lines.push(`- Intro screens: ${plan.introScreens}`);
    lines.push(`- Vocabulary words: ${plan.vocabularyWords}`);
    lines.push(`- Phrase words: ${plan.phraseWords}`);
    lines.push(`- Distractors: ${plan.distractors}`);
    lines.push(`- Missing explanation blockers: ${plan.daysWithMissingExplanation}`);
    lines.push(`- Missing word-bank blockers: ${plan.phrasesWithMissingWords}`);
    lines.push(`- Missing distractor blockers: ${plan.wordsWithMissingDistractors}`);
    lines.push(`- Wrong distractor-count blockers: ${plan.wordsWithWrongDistractorCount}`);
    lines.push(`- Missing vocabulary blockers: ${plan.daysWithMissingVocabulary}`);
    lines.push(`- Missing intro blockers: ${plan.daysWithMissingIntro}`);
    lines.push(`- Blockers: ${plan.blockers}`);
    lines.push(`- Warnings: ${plan.warnings}`);
    lines.push('');
  }

  lines.push('## Locale Contract', '');
  lines.push(`Required locale: \`${report.localizedTextContract.requiredLocale}\``);
  lines.push(`Optional locales: ${report.localizedTextContract.optionalLocales.map((locale) => `\`${locale}\``).join(', ')}`);
  lines.push('');
  lines.push('Allowed fallback behavior:');
  for (const item of report.localizedTextContract.allowedFallbackBehavior) lines.push(`- ${item}`);
  lines.push('');
  lines.push('French generation separation:');
  for (const item of report.localizedTextContract.frenchGenerationSeparation) lines.push(`- ${item}`);

  lines.push('', '## Runtime Adapter Contract', '');
  lines.push(`Source: \`${report.runtimeAdapterContract.sourcePath}\``);
  lines.push(`Required exports: ${report.runtimeAdapterContract.requiredExports.length}`);
  lines.push(`Present exports: ${report.runtimeAdapterContract.presentExports.length}`);
  lines.push(`Missing exports: ${report.runtimeAdapterContract.missingExports.length}`);
  for (const item of report.runtimeAdapterContract.sourceLocaleFallback) lines.push(`- ${item}`);

  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of report.findings.slice(0, 120)) {
      const where = finding.path ? ` \`${finding.path}\`` : '';
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`${where}: ${finding.message}`);
    }
    if (report.findings.length > 120) lines.push(`- ... ${report.findings.length - 120} more`);
  }

  lines.push(
    '',
    '## Safety',
    '',
    '- This packet is contract-only.',
    '- It does not generate French personal plan content.',
    '- It does not modify production app files.',
    '- It does not modify generated French ledgers.',
    '- It does not write reviewer decisions.',
    '- It does not approve production app apply.',
    '',
  );

  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_personal_plan_content_contract_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const p2Path = path.join(auditsDir, 'algorithm_domain_registry_packet.json');
  const findings: Finding[] = [];

  if (!fs.existsSync(p2Path)) {
    countBlocker(
      findings,
      'missing_p2_domain_registry',
      'P3 requires the P2 algorithm domain registry packet.',
      rel(repoRoot, p2Path),
    );
  } else {
    const p2 = readJson<{ status?: string; summary?: { readyForP3P7Contracts?: boolean } }>(p2Path);
    if (p2.status !== 'PASS' || !p2.summary?.readyForP3P7Contracts) {
      countBlocker(
        findings,
        'p2_not_ready_for_p3',
        'P2 registry is not marked ready for P3-P7 contracts.',
        rel(repoRoot, p2Path),
      );
    }
  }

  for (const sourceFile of SOURCE_FILES) {
    if (!fs.existsSync(path.resolve(repoRoot, sourceFile))) {
      countBlocker(findings, 'missing_personal_plan_source_file', 'Required P3 source file is missing.', sourceFile);
    }
  }

  if (findings.some((finding) => finding.severity === 'blocker')) {
    console.error(findings.map((finding) => `${finding.code}: ${finding.message}`).join('\n'));
    process.exit(1);
  }

  const planSummaries: PlanValidationSummary[] = [];
  for (const config of PLANS) {
    planSummaries.push(await validatePlan(repoRoot, config, findings));
  }
  const runtimeAdapterContract = await buildRuntimeAdapterContract(repoRoot, findings);

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const blockersByCode = findings
    .filter((finding) => finding.severity === 'blocker')
    .reduce<Record<string, number>>((acc, finding) => {
      acc[finding.code] = (acc[finding.code] ?? 0) + 1;
      return acc;
    }, {});
  const expectedPlanDays = PLANS.reduce((sum, plan) => sum + plan.expectedDays, 0);
  const aggregatePlanDays = planSummaries.reduce((sum, plan) => sum + plan.aggregateDays, 0);

  const report: Report = {
    schemaVersion: 'gustav-personal-plan-content-contract-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      p2DomainRegistryPacket: rel(repoRoot, p2Path),
      sourceFiles: SOURCE_FILES,
    },
    summary: {
      expectedPlanDays,
      aggregatePlanDays,
      individualDayExports: planSummaries.reduce((sum, plan) => sum + plan.individualDayExports, 0),
      uniqueDayIndices: planSummaries.reduce((sum, plan) => sum + plan.uniqueDayIndices, 0),
      phrases: planSummaries.reduce((sum, plan) => sum + plan.phrases, 0),
      introScreens: planSummaries.reduce((sum, plan) => sum + plan.introScreens, 0),
      vocabularyWords: planSummaries.reduce((sum, plan) => sum + plan.vocabularyWords, 0),
      phraseWords: planSummaries.reduce((sum, plan) => sum + plan.phraseWords, 0),
      distractors: planSummaries.reduce((sum, plan) => sum + plan.distractors, 0),
      runtimeAdapterRequiredExports: runtimeAdapterContract.requiredExports.length,
      runtimeAdapterMissingExports: runtimeAdapterContract.missingExports.length,
      plansWithExpectedDayCount: planSummaries.filter((plan) => (
        plan.expectedDays === plan.aggregateDays && plan.expectedDays === plan.individualDayExports
      )).length,
      blockers,
      warnings,
      readyForP8ReadinessExtension: blockers === 0,
      readyForFrenchPlanGeneration: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    planSummaries,
    localizedTextContract: {
      requiredLocale: 'ru',
      optionalLocales: ['uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'],
      allowedFallbackBehavior: [
        'ru is the required source-locale field for plan content contract records.',
        'uk and es may fall back to ru in runtime adapter outputs when absent.',
        'pt-BR, vi, id, tr, and pl are included in runtime sourceLocales only when explicitly present.',
        'Missing optional source locale copy is not a French target-content fallback.',
      ],
      frenchGenerationSeparation: [
        'French plan target content must be generated as target-language content, not as SourceLocale UI copy.',
        'Current P3 does not generate French plan content.',
        'French plan generation requires a future generator/reviewer packet tied to personal_plan_content.',
        'UI source-locale fields remain separate from studyTarget selection and target-language exercise content.',
      ],
    },
    runtimeAdapterContract,
    blockersByCode,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      frenchPlanContentGeneratedByThisScript: false,
      productionApplyApproved: false,
    },
  };

  const outJson = path.join(auditsDir, 'personal_plan_content_contract_packet.json');
  const outMd = path.join(auditsDir, 'personal_plan_content_contract_packet.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV personal plan content contract packet: ${report.status}`);
  console.log(`Expected plan days: ${report.summary.expectedPlanDays}`);
  console.log(`Aggregate plan days: ${report.summary.aggregatePlanDays}`);
  console.log(`Phrases: ${report.summary.phrases}`);
  console.log(`Runtime adapter missing exports: ${report.summary.runtimeAdapterMissingExports}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Ready for P8 readiness extension: ${report.summary.readyForP8ReadinessExtension ? 'yes' : 'no'}`);
  console.log(`Ready for French plan generation: ${report.summary.readyForFrenchPlanGeneration ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (report.status !== 'PASS') process.exit(1);
}

void main();
