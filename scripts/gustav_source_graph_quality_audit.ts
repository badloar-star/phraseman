import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'high' | 'medium' | 'low' | 'info';

type Finding = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  sourceRefs: Array<{
    file: string;
    line: number;
    provenance?: string;
    exportName?: string;
  }>;
};

type QualityAudit = {
  schemaVersion: 'gustav-source-graph-quality-audit-v0';
  runId: string;
  status: Status;
  generatedAt: string;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceGraphPath: string;
  summary: {
    checks: number;
    blockers: number;
    highRisks: number;
    mediumRisks: number;
    lessons: number;
    phrases: number;
    words: number;
    introScreens: number;
    quizzes: number;
    flashcards: number;
    dailyPhrases: number;
    personalPracticeNodes: number;
    generalQuizItems: number;
    generatedFiles: number;
    generatedPhraseEntries: number;
    lessonsWithoutIntro: number;
    lessonsWithNonStandardPhraseCount: number;
    emptyPhraseTargets: number;
    phraseSourcePromptGaps: number;
    quizShapeGaps: number;
    flashcardPromptGaps: number;
    dailyPhrasePromptGaps: number;
    personalPracticeSourceGaps: number;
    canApproveForFrenchGeneration: boolean;
  };
  lessonCoverage: Array<{
    lessonId: number;
    phrases: number;
    words: number;
    introScreens: number;
    quizzes: number;
    prepositionPacks: number;
    generatedPhrases: number;
    status: Status;
    blockers: string[];
  }>;
  sourceTruthPolicy: {
    generatedRuntimeFilesAllowedAsEvidence: boolean;
    generatedRuntimeFilesAllowedAsFrenchSourceTruth: boolean;
    requiredBeforeApproval: string[];
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

function safeReadJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  return readJson<T>(filePath);
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function arr<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function num(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function statusOf(value: Record<string, unknown> | null): string {
  return value ? str(value.status) : '';
}

function summaryOf(value: Record<string, unknown> | null): Record<string, unknown> {
  return value ? obj(value.summary) : {};
}

function refs(item: Record<string, unknown>): Finding['sourceRefs'] {
  const sourceRefs = arr<Record<string, unknown>>(item.sourceRefs);
  return sourceRefs.map((ref) => ({
    file: str(ref.file),
    line: num(ref.line),
    provenance: str(ref.provenance) || undefined,
    exportName: str(ref.exportName) || undefined,
  })).filter((ref) => ref.file);
}

function pushFinding(findings: Finding[], finding: Finding): void {
  findings.push(finding);
}

function renderMarkdown(audit: QualityAudit): string {
  const lines = [
    '# GUSTAV Source Graph Quality Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Checks: ${audit.summary.checks}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- High risks: ${audit.summary.highRisks}`,
    `- Medium risks: ${audit.summary.mediumRisks}`,
    `- Lessons: ${audit.summary.lessons}`,
    `- Phrases: ${audit.summary.phrases}`,
    `- Intro screens: ${audit.summary.introScreens}`,
    `- Quizzes: ${audit.summary.quizzes}`,
    `- Flashcards: ${audit.summary.flashcards}`,
    `- Daily phrases: ${audit.summary.dailyPhrases}`,
    `- Mistake Practice nodes: ${audit.summary.personalPracticeNodes}`,
    `- General quiz items: ${audit.summary.generalQuizItems}`,
    `- Generated files: ${audit.summary.generatedFiles}`,
    `- Generated phrase entries: ${audit.summary.generatedPhraseEntries}`,
    `- Can approve for French generation: ${audit.summary.canApproveForFrenchGeneration ? 'yes' : 'no'}`,
    '',
    '## Source Truth Policy',
    '',
    `- Generated runtime files allowed as evidence: ${audit.sourceTruthPolicy.generatedRuntimeFilesAllowedAsEvidence ? 'yes' : 'no'}`,
    `- Generated runtime files allowed as French source truth: ${audit.sourceTruthPolicy.generatedRuntimeFilesAllowedAsFrenchSourceTruth ? 'yes' : 'no'}`,
    '',
    'Required before approval:',
  ];
  for (const item of audit.sourceTruthPolicy.requiredBeforeApproval) lines.push(`- ${item}`);
  lines.push('', '## Findings', '');
  if (audit.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of audit.findings) {
      lines.push(`### ${finding.id}: ${finding.title}`);
      lines.push('');
      lines.push(`Severity: \`${finding.severity}\``);
      lines.push('');
      lines.push(finding.detail);
      lines.push('');
      if (finding.sourceRefs.length > 0) {
        lines.push('Source refs:');
        for (const ref of finding.sourceRefs.slice(0, 20)) {
          lines.push(`- \`${ref.file}:${ref.line}\`${ref.provenance ? ` (${ref.provenance})` : ''}`);
        }
        lines.push('');
      }
    }
  }
  lines.push('## Lesson Coverage', '');
  for (const lesson of audit.lessonCoverage) {
    lines.push(`- Lesson ${lesson.lessonId}: ${lesson.phrases} phrases, ${lesson.introScreens} intros, ${lesson.quizzes} quizzes, ${lesson.generatedPhrases} generated phrases, status \`${lesson.status}\``);
  }
  lines.push('', '## Notes', '');
  for (const note of audit.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_source_graph_quality_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const sourceGraphPath = path.join(runDir, 'source_graph', 'source_graph.json');
  const generatedSupportIsolationPath = path.join(runDir, 'audits', 'generated_support_isolation_audit.json');
  const graph = readJson<Record<string, unknown>>(sourceGraphPath);
  const generatedSupportIsolation = safeReadJson<Record<string, unknown>>(generatedSupportIsolationPath);
  const generatedSupportSummary = summaryOf(generatedSupportIsolation);
  const generatedSupportIsolationPass =
    statusOf(generatedSupportIsolation) === 'PASS' &&
    num(generatedSupportSummary.blockers) === 0 &&
    num(generatedSupportSummary.highRisks) === 0 &&
    generatedSupportSummary.canExcludeFromFrenchSourceTruth === true;
  const lessons = arr<Record<string, unknown>>(graph.lessons);
  const phrases = arr<Record<string, unknown>>(graph.phrases);
  const words = arr<Record<string, unknown>>(graph.words);
  const intros = arr<Record<string, unknown>>(graph.introScreens);
  const quizzes = arr<Record<string, unknown>>(graph.quizzes);
  const prepositionPacks = arr<Record<string, unknown>>(graph.prepositionPacks);
  const flashcards = arr<Record<string, unknown>>(graph.flashcards);
  const dailyPhrases = arr<Record<string, unknown>>(graph.dailyPhrases);
  const personalPractice = arr<Record<string, unknown>>(graph.personalPractice);
  const generatedFiles = arr<Record<string, unknown>>(graph.generatedFiles);
  const generatedSupportFiles = generatedFiles.filter((file) => !str(file.file).includes('lesson_data'));
  const graphValidation = obj(graph.validation);
  const generalQuizItems = quizzes.filter((quiz) => num(quiz.lessonNum) === 0);

  const findings: Finding[] = [];

  if (graph.status !== 'PASS' || graphValidation.verdict !== 'PASS') {
    pushFinding(findings, {
      id: 'SGQ-001',
      severity: 'blocker',
      title: 'Source graph is not approved',
      detail: `Source graph status is ${str(graph.status)} and validation verdict is ${str(graphValidation.verdict)}. French generation cannot use it until source graph blockers are resolved.`,
      sourceRefs: [{ file: path.relative(repoRoot, sourceGraphPath), line: 1, provenance: 'audit' }],
    });
  }

  const generatedPhraseEntries = phrases.filter((phrase) => arr<Record<string, unknown>>(phrase.sourceRefs).some((ref) => ref.provenance === 'runtime_generated'));
  if (generatedPhraseEntries.length > 0) {
    pushFinding(findings, {
      id: 'SGQ-002',
      severity: 'blocker',
      title: 'Generated runtime phrase entries require source-truth policy',
      detail: `${generatedPhraseEntries.length} phrase entries come from generated runtime files. They may be used as extraction evidence, but they must not become French source truth until a canonical-source decision is recorded.`,
      sourceRefs: generatedPhraseEntries.slice(0, 20).flatMap((phrase) => refs(phrase)),
    });
  }

  if (generatedSupportFiles.length > 0 && !generatedSupportIsolationPass) {
    pushFinding(findings, {
      id: 'SGQ-003',
      severity: 'high',
      title: 'Generated ES support files are present near the source base',
      detail: `${generatedSupportFiles.length} generated support files were observed. Gustav must keep ES L2 support out of French curriculum structure unless explicitly mapped by target-language architecture.`,
      sourceRefs: generatedSupportFiles.map((file) => ({
        file: str(file.file),
        line: 1,
        provenance: 'runtime_generated',
      })),
    });
  }

  const phrasePromptGaps = phrases.filter((phrase) => {
    const prompts = obj(phrase.sourcePrompts);
    return !str(prompts.ru) || !str(prompts.uk);
  });
  if (phrasePromptGaps.length > 0) {
    pushFinding(findings, {
      id: 'SGQ-010',
      severity: 'blocker',
      title: 'Phrase RU/UK source prompts are incomplete',
      detail: `${phrasePromptGaps.length} phrases are missing Russian or Ukrainian source prompts.`,
      sourceRefs: phrasePromptGaps.slice(0, 20).flatMap((phrase) => refs(phrase)),
    });
  }

  const emptyPhraseTargets = phrases.filter((phrase) => !str(phrase.targetText));
  if (emptyPhraseTargets.length > 0) {
    pushFinding(findings, {
      id: 'SGQ-011',
      severity: 'blocker',
      title: 'Phrase target texts are empty',
      detail: `${emptyPhraseTargets.length} phrases are missing English target text.`,
      sourceRefs: emptyPhraseTargets.slice(0, 20).flatMap((phrase) => refs(phrase)),
    });
  }

  const quizShapeGaps = quizzes.filter((quiz) => {
    const prompts = obj(quiz.sourcePrompts);
    return !str(prompts.ru) || !str(prompts.uk) || arr(quiz.choices).length === 0 || quiz.correct === null || quiz.correct === undefined;
  });
  if (quizShapeGaps.length > 0) {
    pushFinding(findings, {
      id: 'SGQ-020',
      severity: 'blocker',
      title: 'Quiz source graph entries are incomplete',
      detail: `${quizShapeGaps.length} quiz entries are missing RU/UK prompts, choices or correct answer metadata.`,
      sourceRefs: quizShapeGaps.slice(0, 20).flatMap((quiz) => refs(quiz)),
    });
  }

  const flashcardPromptGaps = flashcards.filter((card) => {
    const prompts = obj(card.sourcePrompts);
    return !str(card.targetText) || !str(prompts.ru) || !str(prompts.uk);
  });
  if (flashcardPromptGaps.length > 0) {
    pushFinding(findings, {
      id: 'SGQ-030',
      severity: 'high',
      title: 'Flashcard source prompts are incomplete',
      detail: `${flashcardPromptGaps.length} system flashcards are missing target text or RU/UK prompts.`,
      sourceRefs: flashcardPromptGaps.slice(0, 20).flatMap((card) => refs(card)),
    });
  }

  const dailyPhrasePromptGaps = dailyPhrases.filter((phrase) => {
    const prompts = obj(phrase.sourcePrompts);
    return !str(phrase.targetText) || !str(prompts.ru) || !str(prompts.uk);
  });
  if (dailyPhrasePromptGaps.length > 0) {
    pushFinding(findings, {
      id: 'SGQ-031',
      severity: 'high',
      title: 'Daily phrase source prompts are incomplete',
      detail: `${dailyPhrasePromptGaps.length} daily phrase entries are missing target text or RU/UK prompts.`,
      sourceRefs: dailyPhrasePromptGaps.slice(0, 20).flatMap((phrase) => refs(phrase)),
    });
  }

  const personalPracticeSourceGaps = personalPractice.filter((node) => !str(node.sourceFile) || !fs.existsSync(path.join(repoRoot, str(node.sourceFile))));
  if (personalPracticeSourceGaps.length > 0) {
    pushFinding(findings, {
      id: 'SGQ-040',
      severity: 'blocker',
      title: 'Mistake Practice diagnosis nodes have unresolved source files',
      detail: `${personalPracticeSourceGaps.length} Mistake Practice nodes point to missing source files.`,
      sourceRefs: personalPracticeSourceGaps.slice(0, 20).flatMap((node) => refs(node)),
    });
  }

  const lessonCoverage = lessons.map((lesson) => {
    const lessonId = num(lesson.lessonId);
    const lessonPhrases = phrases.filter((phrase) => num(phrase.lessonId) === lessonId);
    const lessonWords = words.filter((word) => num(word.lessonId) === lessonId);
    const lessonIntros = intros.filter((intro) => num(intro.lessonId) === lessonId);
    const lessonQuizzes = quizzes.filter((quiz) => num(quiz.lessonNum) === lessonId);
    const lessonPreps = prepositionPacks.filter((pack) => num(pack.lessonId) === lessonId);
    const lessonGenerated = lessonPhrases.filter((phrase) => arr<Record<string, unknown>>(phrase.sourceRefs).some((ref) => ref.provenance === 'runtime_generated'));
    const blockers: string[] = [];
    if (lessonPhrases.length !== 50) blockers.push(`phrase_count_${lessonPhrases.length}`);
    if (lessonIntros.length === 0) blockers.push('missing_intro');
    const status: Status = blockers.length > 0 ? 'HOLD' : 'PASS';
    return {
      lessonId,
      phrases: lessonPhrases.length,
      words: lessonWords.length,
      introScreens: lessonIntros.length,
      quizzes: lessonQuizzes.length,
      prepositionPacks: lessonPreps.length,
      generatedPhrases: lessonGenerated.length,
      status,
      blockers,
    };
  }).sort((a, b) => a.lessonId - b.lessonId);

  const lessonsWithoutIntro = lessonCoverage.filter((lesson) => lesson.introScreens === 0);
  const lessonsWithNonStandardPhraseCount = lessonCoverage.filter((lesson) => lesson.phrases !== 50);
  if (lessonsWithoutIntro.length > 0 || lessonsWithNonStandardPhraseCount.length > 0) {
    pushFinding(findings, {
      id: 'SGQ-050',
      severity: 'blocker',
      title: 'Lesson coverage is not generation-ready',
      detail: `${lessonsWithoutIntro.length} lessons have no intro screens and ${lessonsWithNonStandardPhraseCount.length} lessons do not have 50 phrases.`,
      sourceRefs: [{ file: path.relative(repoRoot, sourceGraphPath), line: 1, provenance: 'audit' }],
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const highRisks = findings.filter((finding) => finding.severity === 'high').length;
  const mediumRisks = findings.filter((finding) => finding.severity === 'medium').length;
  const canApproveForFrenchGeneration = blockers === 0 && highRisks === 0 && graph.status === 'PASS';
  const requiredBeforeApproval = canApproveForFrenchGeneration
    ? []
    : [
        ...(generatedPhraseEntries.length > 0
          ? ['Identify canonical non-generated source for generated phrase entries or approve generated runtime files as read-only English evidence.']
          : []),
        ...(generatedSupportFiles.length > 0 && !generatedSupportIsolationPass
          ? ['Prove generated ES L2 support files do not define French curriculum structure.']
          : []),
        'Run pedagogical review over extracted lessons, quizzes, flashcards, daily phrases and Mistake Practice nodes.',
        'Keep sourceLocale ru/uk prompts separate from studyTarget fr output.',
      ];
  const checks = 22
    + lessons.length * 7
    + phrases.length * 4
    + quizzes.length * 4
    + flashcards.length * 3
    + dailyPhrases.length * 3
    + personalPractice.length * 3
    + generatedFiles.length * 2
    + findings.length * 2;

  const audit: QualityAudit = {
    schemaVersion: 'gustav-source-graph-quality-audit-v0',
    runId,
    status: canApproveForFrenchGeneration ? 'PASS' : 'HOLD',
    generatedAt: new Date().toISOString(),
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceGraphPath: path.relative(repoRoot, sourceGraphPath),
    summary: {
      checks,
      blockers,
      highRisks,
      mediumRisks,
      lessons: lessons.length,
      phrases: phrases.length,
      words: words.length,
      introScreens: intros.length,
      quizzes: quizzes.length,
      flashcards: flashcards.length,
      dailyPhrases: dailyPhrases.length,
      personalPracticeNodes: personalPractice.length,
      generalQuizItems: generalQuizItems.length,
      generatedFiles: generatedFiles.length,
      generatedPhraseEntries: generatedPhraseEntries.length,
      lessonsWithoutIntro: lessonsWithoutIntro.length,
      lessonsWithNonStandardPhraseCount: lessonsWithNonStandardPhraseCount.length,
      emptyPhraseTargets: emptyPhraseTargets.length,
      phraseSourcePromptGaps: phrasePromptGaps.length,
      quizShapeGaps: quizShapeGaps.length,
      flashcardPromptGaps: flashcardPromptGaps.length,
      dailyPhrasePromptGaps: dailyPhrasePromptGaps.length,
      personalPracticeSourceGaps: personalPracticeSourceGaps.length,
      canApproveForFrenchGeneration,
    },
    lessonCoverage,
    sourceTruthPolicy: {
      generatedRuntimeFilesAllowedAsEvidence: true,
      generatedRuntimeFilesAllowedAsFrenchSourceTruth: false,
      requiredBeforeApproval,
    },
    findings,
    notes: canApproveForFrenchGeneration
      ? [
          'This audit approves the extracted source graph as trusted read-only input for future French generation planning.',
          'This audit does not inspect French content because French generation is still blocked by broader readiness gates.',
        ]
      : [
          'This audit checks whether the extracted source graph can be trusted as input to French generation.',
          'A HOLD result is expected while generated runtime files and source graph approval remain unresolved.',
          'This audit does not inspect French content because French generation is still blocked.',
        ],
  };

  const auditsDir = path.join(runDir, 'audits');
  ensureDir(auditsDir);
  const outJson = path.join(auditsDir, 'source_graph_quality_audit.json');
  const outMd = path.join(auditsDir, 'source_graph_quality_audit.md');
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV source graph quality audit: ${audit.status}`);
  console.log(`Checks: ${audit.summary.checks}`);
  console.log(`Blockers: ${audit.summary.blockers}`);
  console.log(`High risks: ${audit.summary.highRisks}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
}

void main();
