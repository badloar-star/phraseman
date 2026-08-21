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

type ApprovalAudit = {
  schemaVersion: 'gustav-source-graph-approval-audit-v0';
  runId: string;
  status: Status;
  generatedAt: string;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceGraphPath: string;
  dependencyArtifacts: {
    generatedSourceTruthAudit: string;
    generatedSupportIsolationAudit: string;
    lesson916ApprovalAudit: string;
  };
  summary: {
    checks: number;
    blockers: number;
    highRisks: number;
    lessons: number;
    phrases: number;
    introScreens: number;
    quizzes: number;
    flashcards: number;
    dailyPhrases: number;
    personalPracticeNodes: number;
    runtimeGeneratedPhraseRefs: number;
    sourceLocaleTargetConfusions: number;
    unsupportedUnresolvedBlockers: number;
    unsupportedHighRisks: number;
    lessonCoveragePass: boolean;
    ruUkPromptCoveragePass: boolean;
    generatedSourceTruthPass: boolean;
    generatedSupportIsolationPass: boolean;
    lesson916ApprovalPass: boolean;
    canApproveSourceGraphForFrenchGenerationInput: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  approval: {
    approved: boolean;
    scope: 'source_graph_input_only';
    approvedBy: 'Gustav Source Graph Agent';
    allowedUse: string[];
    forbiddenUse: string[];
    stillRequiredBeforeFrenchGeneration: string[];
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
  return arr<Record<string, unknown>>(item.sourceRefs).map((ref) => ({
    file: str(ref.file),
    line: num(ref.line) || 1,
    provenance: str(ref.provenance) || undefined,
    exportName: str(ref.exportName) || undefined,
  })).filter((ref) => ref.file);
}

function pushFinding(findings: Finding[], finding: Finding): void {
  findings.push(finding);
}

function renderMarkdown(audit: ApprovalAudit): string {
  const lines = [
    '# GUSTAV Source Graph Approval Audit',
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
    `- Lessons: ${audit.summary.lessons}`,
    `- Phrases: ${audit.summary.phrases}`,
    `- Intro screens: ${audit.summary.introScreens}`,
    `- Quizzes: ${audit.summary.quizzes}`,
    `- Flashcards: ${audit.summary.flashcards}`,
    `- Daily phrases: ${audit.summary.dailyPhrases}`,
    `- Mistake Practice nodes: ${audit.summary.personalPracticeNodes}`,
    `- Runtime-generated phrase refs: ${audit.summary.runtimeGeneratedPhraseRefs}`,
    `- SourceLocale/target confusions: ${audit.summary.sourceLocaleTargetConfusions}`,
    `- Unsupported unresolved blockers: ${audit.summary.unsupportedUnresolvedBlockers}`,
    `- Unsupported high risks: ${audit.summary.unsupportedHighRisks}`,
    `- Lesson coverage pass: ${audit.summary.lessonCoveragePass ? 'yes' : 'no'}`,
    `- RU/UK prompt coverage pass: ${audit.summary.ruUkPromptCoveragePass ? 'yes' : 'no'}`,
    `- Generated source-truth pass: ${audit.summary.generatedSourceTruthPass ? 'yes' : 'no'}`,
    `- Generated support isolation pass: ${audit.summary.generatedSupportIsolationPass ? 'yes' : 'no'}`,
    `- Lesson 9-16 approval pass: ${audit.summary.lesson916ApprovalPass ? 'yes' : 'no'}`,
    `- Can approve source graph for French generation input: ${audit.summary.canApproveSourceGraphForFrenchGenerationInput ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Approval',
    '',
    `- Approved: ${audit.approval.approved ? 'yes' : 'no'}`,
    `- Scope: \`${audit.approval.scope}\``,
    `- Approved by: ${audit.approval.approvedBy}`,
    '',
    'Allowed use:',
  ];
  for (const item of audit.approval.allowedUse) lines.push(`- ${item}`);
  lines.push('', 'Forbidden use:');
  for (const item of audit.approval.forbiddenUse) lines.push(`- ${item}`);
  lines.push('', 'Still required before French generation:');
  for (const item of audit.approval.stillRequiredBeforeFrenchGeneration) lines.push(`- ${item}`);
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
  lines.push('## Notes', '');
  for (const note of audit.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_source_graph_approval_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const sourceGraphPath = path.join(runDir, 'source_graph', 'source_graph.json');
  const generatedSourceTruthPath = path.join(runDir, 'audits', 'generated_source_truth_audit.json');
  const generatedSupportIsolationPath = path.join(runDir, 'audits', 'generated_support_isolation_audit.json');
  const lesson916ApprovalPath = path.join(runDir, 'audits', 'lesson_9_16_source_truth_approval_audit.json');

  const graph = readJson<Record<string, unknown>>(sourceGraphPath);
  const generatedSourceTruth = safeReadJson<Record<string, unknown>>(generatedSourceTruthPath);
  const generatedSupportIsolation = safeReadJson<Record<string, unknown>>(generatedSupportIsolationPath);
  const lesson916Approval = safeReadJson<Record<string, unknown>>(lesson916ApprovalPath);
  const validation = obj(graph.validation);
  const lessons = arr<Record<string, unknown>>(graph.lessons);
  const phrases = arr<Record<string, unknown>>(graph.phrases);
  const intros = arr<Record<string, unknown>>(graph.introScreens);
  const quizzes = arr<Record<string, unknown>>(graph.quizzes);
  const flashcards = arr<Record<string, unknown>>(graph.flashcards);
  const dailyPhrases = arr<Record<string, unknown>>(graph.dailyPhrases);
  const personalPractice = arr<Record<string, unknown>>(graph.personalPractice);
  const unresolved = arr<Record<string, unknown>>(graph.unresolved);
  const findings: Finding[] = [];

  const runtimeGeneratedPhraseRefs = phrases.filter((phrase) =>
    arr<Record<string, unknown>>(phrase.sourceRefs).some((ref) => str(ref.provenance) === 'runtime_generated'),
  );
  const phrasePromptGaps = phrases.filter((phrase) => {
    const prompts = obj(phrase.sourcePrompts);
    return !str(prompts.ru) || !str(prompts.uk);
  });
  const emptyPhraseTargets = phrases.filter((phrase) => !str(phrase.targetText));
  const quizShapeGaps = quizzes.filter((quiz) => {
    const prompts = obj(quiz.sourcePrompts);
    return !str(prompts.ru) || !str(prompts.uk) || arr(quiz.choices).length === 0 || quiz.correct === null || quiz.correct === undefined;
  });
  const flashcardPromptGaps = flashcards.filter((card) => {
    const prompts = obj(card.sourcePrompts);
    return !str(card.targetText) || !str(prompts.ru) || !str(prompts.uk);
  });
  const dailyPhrasePromptGaps = dailyPhrases.filter((phrase) => {
    const prompts = obj(phrase.sourcePrompts);
    return !str(phrase.targetText) || !str(prompts.ru) || !str(prompts.uk);
  });
  const personalPracticeGaps = personalPractice.filter((node) => !str(node.id) || !str(node.sourceFile));
  const lessonCoverageGaps = lessons.filter((lesson) =>
    arr(lesson.phraseIds).length !== 50 ||
    arr(lesson.introScreenIds).length === 0 ||
    arr(lesson.wordIds).length === 0,
  );

  const generatedSourceTruthSummary = summaryOf(generatedSourceTruth);
  const generatedSupportSummary = summaryOf(generatedSupportIsolation);
  const lesson916ApprovalSummary = summaryOf(lesson916Approval);
  const generatedSourceTruthPass =
    statusOf(generatedSourceTruth) === 'PASS' &&
    num(generatedSourceTruthSummary.blockers) === 0 &&
    num(generatedSourceTruthSummary.highRisks) === 0;
  const generatedSupportIsolationPass =
    statusOf(generatedSupportIsolation) === 'PASS' &&
    num(generatedSupportSummary.blockers) === 0 &&
    num(generatedSupportSummary.highRisks) === 0 &&
    generatedSupportSummary.canExcludeFromFrenchSourceTruth === true;
  const lesson916ApprovalPass =
    statusOf(lesson916Approval) === 'PASS' &&
    num(lesson916ApprovalSummary.blockers) === 0 &&
    num(lesson916ApprovalSummary.highRisks) === 0 &&
    lesson916ApprovalSummary.resolvesLesson916SourceTruth === true;

  const unsupportedUnresolvedBlockers = unresolved.filter((item) => str(item.severity) === 'blocker' && str(item.id) !== 'SG-008');
  const unsupportedHighRisks = unresolved.filter((item) =>
    str(item.severity) === 'high' &&
    !(str(item.id) === 'SG-004' && generatedSupportIsolationPass),
  );

  if (lessons.length !== 32 || phrases.length !== 1600) {
    pushFinding(findings, {
      id: 'SGA-001',
      severity: 'blocker',
      title: 'Source graph core coverage is incomplete',
      detail: `Expected 32 lessons and 1600 phrases, found ${lessons.length} lessons and ${phrases.length} phrases.`,
      sourceRefs: [{ file: path.relative(repoRoot, sourceGraphPath), line: 1, provenance: 'audit' }],
    });
  }
  if (lessonCoverageGaps.length > 0) {
    pushFinding(findings, {
      id: 'SGA-002',
      severity: 'blocker',
      title: 'Lesson coverage is not stable',
      detail: `${lessonCoverageGaps.length} lesson(s) do not have 50 phrases, intro screens and word links.`,
      sourceRefs: lessonCoverageGaps.slice(0, 20).flatMap((lesson) => refs(lesson)),
    });
  }
  if (runtimeGeneratedPhraseRefs.length > 0) {
    pushFinding(findings, {
      id: 'SGA-003',
      severity: 'blocker',
      title: 'Runtime-generated phrase refs remain',
      detail: `${runtimeGeneratedPhraseRefs.length} phrase(s) still use runtime_generated source refs.`,
      sourceRefs: runtimeGeneratedPhraseRefs.slice(0, 20).flatMap((phrase) => refs(phrase)),
    });
  }
  if (num(validation.sourceLocaleTargetConfusions) > 0) {
    pushFinding(findings, {
      id: 'SGA-004',
      severity: 'blocker',
      title: 'SourceLocale/target confusion remains',
      detail: `${num(validation.sourceLocaleTargetConfusions)} sourceLocale/target confusion(s) remain in the graph.`,
      sourceRefs: [{ file: path.relative(repoRoot, sourceGraphPath), line: 1, provenance: 'audit' }],
    });
  }
  if (phrasePromptGaps.length > 0 || emptyPhraseTargets.length > 0) {
    pushFinding(findings, {
      id: 'SGA-010',
      severity: 'blocker',
      title: 'Phrase source prompts are incomplete',
      detail: `${phrasePromptGaps.length} phrase(s) miss RU/UK prompts and ${emptyPhraseTargets.length} phrase(s) miss English target text.`,
      sourceRefs: [...phrasePromptGaps, ...emptyPhraseTargets].slice(0, 20).flatMap((phrase) => refs(phrase)),
    });
  }
  if (quizShapeGaps.length > 0) {
    pushFinding(findings, {
      id: 'SGA-020',
      severity: 'blocker',
      title: 'Quiz graph entries are incomplete',
      detail: `${quizShapeGaps.length} quiz item(s) miss RU/UK prompts, choices or correct answer shape.`,
      sourceRefs: quizShapeGaps.slice(0, 20).flatMap((quiz) => refs(quiz)),
    });
  }
  if (flashcardPromptGaps.length > 0 || dailyPhrasePromptGaps.length > 0 || personalPracticeGaps.length > 0) {
    pushFinding(findings, {
      id: 'SGA-030',
      severity: 'blocker',
      title: 'Practice support graph entries are incomplete',
      detail: `${flashcardPromptGaps.length} flashcard(s), ${dailyPhrasePromptGaps.length} daily phrase(s) and ${personalPracticeGaps.length} personal-practice node(s) are incomplete.`,
      sourceRefs: [
        ...flashcardPromptGaps,
        ...dailyPhrasePromptGaps,
        ...personalPracticeGaps,
      ].slice(0, 20).flatMap((item) => refs(item)),
    });
  }
  if (!generatedSourceTruthPass) {
    pushFinding(findings, {
      id: 'SGA-040',
      severity: 'blocker',
      title: 'Generated source-truth dependency is not resolved',
      detail: 'Generated source-truth audit must PASS before the source graph can be approved.',
      sourceRefs: [{ file: path.relative(repoRoot, generatedSourceTruthPath), line: 1, provenance: 'audit' }],
    });
  }
  if (!generatedSupportIsolationPass) {
    pushFinding(findings, {
      id: 'SGA-041',
      severity: 'high',
      title: 'Generated support isolation dependency is not resolved',
      detail: 'Generated ES support files must be proven evidence-only before source graph approval.',
      sourceRefs: [{ file: path.relative(repoRoot, generatedSupportIsolationPath), line: 1, provenance: 'audit' }],
    });
  }
  if (!lesson916ApprovalPass) {
    pushFinding(findings, {
      id: 'SGA-042',
      severity: 'blocker',
      title: 'Lesson 9-16 source-truth approval dependency is not resolved',
      detail: 'Lesson 9-16 clean canonical draft approval must PASS before source graph approval.',
      sourceRefs: [{ file: path.relative(repoRoot, lesson916ApprovalPath), line: 1, provenance: 'audit' }],
    });
  }
  if (unsupportedUnresolvedBlockers.length > 0 || unsupportedHighRisks.length > 0) {
    pushFinding(findings, {
      id: 'SGA-050',
      severity: 'blocker',
      title: 'Unsupported source graph unresolved items remain',
      detail: `${unsupportedUnresolvedBlockers.length} blocker(s) and ${unsupportedHighRisks.length} high risk(s) are not covered by approval dependencies.`,
      sourceRefs: [{ file: path.relative(repoRoot, sourceGraphPath), line: 1, provenance: 'audit' }],
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const highRisks = findings.filter((finding) => finding.severity === 'high').length;
  const lessonCoveragePass = lessonCoverageGaps.length === 0 && lessons.length === 32 && phrases.length === 1600;
  const ruUkPromptCoveragePass =
    phrasePromptGaps.length === 0 &&
    quizShapeGaps.length === 0 &&
    flashcardPromptGaps.length === 0 &&
    dailyPhrasePromptGaps.length === 0;
  const canApproveSourceGraphForFrenchGenerationInput = blockers === 0 && highRisks === 0;
  if (canApproveSourceGraphForFrenchGenerationInput) {
    pushFinding(findings, {
      id: 'SGA-000',
      severity: 'info',
      title: 'Source graph approved as generation input',
      detail: 'The English source graph is approved as read-only source input for future French generation, while production generation remains blocked by broader architecture gates.',
      sourceRefs: [{ file: path.relative(repoRoot, sourceGraphPath), line: 1, provenance: 'audit' }],
    });
  }

  const audit: ApprovalAudit = {
    schemaVersion: 'gustav-source-graph-approval-audit-v0',
    runId,
    status: canApproveSourceGraphForFrenchGenerationInput ? 'PASS' : 'HOLD',
    generatedAt: new Date().toISOString(),
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceGraphPath: path.relative(repoRoot, sourceGraphPath),
    dependencyArtifacts: {
      generatedSourceTruthAudit: path.relative(repoRoot, generatedSourceTruthPath),
      generatedSupportIsolationAudit: path.relative(repoRoot, generatedSupportIsolationPath),
      lesson916ApprovalAudit: path.relative(repoRoot, lesson916ApprovalPath),
    },
    summary: {
      checks: 32 + lessons.length * 3 + phrases.length + quizzes.length + flashcards.length + dailyPhrases.length + personalPractice.length,
      blockers,
      highRisks,
      lessons: lessons.length,
      phrases: phrases.length,
      introScreens: intros.length,
      quizzes: quizzes.length,
      flashcards: flashcards.length,
      dailyPhrases: dailyPhrases.length,
      personalPracticeNodes: personalPractice.length,
      runtimeGeneratedPhraseRefs: runtimeGeneratedPhraseRefs.length,
      sourceLocaleTargetConfusions: num(validation.sourceLocaleTargetConfusions),
      unsupportedUnresolvedBlockers: unsupportedUnresolvedBlockers.length,
      unsupportedHighRisks: unsupportedHighRisks.length,
      lessonCoveragePass,
      ruUkPromptCoveragePass,
      generatedSourceTruthPass,
      generatedSupportIsolationPass,
      lesson916ApprovalPass,
      canApproveSourceGraphForFrenchGenerationInput,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    approval: {
      approved: canApproveSourceGraphForFrenchGenerationInput,
      scope: 'source_graph_input_only',
      approvedBy: 'Gustav Source Graph Agent',
      allowedUse: [
        'Use the extracted English source graph as read-only source input for future French planning.',
        'Use RU and UK source prompts as sourceLocale prompts only.',
        'Use approved lesson 9-16 clean canonical draft entries as canonical source graph entries.',
      ],
      forbiddenUse: [
        'Do not start French generation until the full readiness gate permits it.',
        'Do not modify production app files from this approval.',
        'Do not treat generated ES support files as French curriculum structure.',
      ],
      stillRequiredBeforeFrenchGeneration: [
        'Resolve target-safe storage and cloud sync blockers.',
        'Implement or approve target architecture/migration adapters.',
        'Create a generated-content audit and explicit apply plan before production app writes.',
      ],
    },
    findings,
    notes: [
      'This approval resolves SG-008 only inside the Gustav run container.',
      'It is not approval to generate or apply French content.',
    ],
  };

  const auditsDir = path.join(runDir, 'audits');
  const sourceGraphDir = path.join(runDir, 'source_graph');
  ensureDir(auditsDir);
  ensureDir(sourceGraphDir);
  fs.writeFileSync(path.join(auditsDir, 'source_graph_approval_audit.json'), `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(path.join(auditsDir, 'source_graph_approval_audit.md'), renderMarkdown(audit));
  fs.writeFileSync(path.join(sourceGraphDir, 'source_graph_approval.json'), `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(path.join(sourceGraphDir, 'source_graph_approval.md'), renderMarkdown(audit));

  console.log(`GUSTAV source graph approval audit: ${audit.status}`);
  console.log(`Can approve source graph input: ${audit.summary.canApproveSourceGraphForFrenchGenerationInput ? 'yes' : 'no'}`);
  console.log(`Blockers: ${audit.summary.blockers}`);
  console.log(`High risks: ${audit.summary.highRisks}`);
  console.log(`May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, path.join(auditsDir, 'source_graph_approval_audit.json'))}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
