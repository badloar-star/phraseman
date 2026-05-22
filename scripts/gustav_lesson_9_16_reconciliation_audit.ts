import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'high' | 'medium' | 'low' | 'info';

type Phrase = {
  lessonId: number;
  id: string;
  english: string;
  russian: string;
  ukrainian: string;
};

type LessonComparison = {
  lessonId: number;
  currentCount: number;
  candidateCount: number;
  idOverlap: number;
  englishExactMatchesById: number;
  russianExactMatchesById: number;
  ukrainianExactMatchesById: number;
  sameLessonEnglishTextOverlap: number;
  currentOnlyIdCount: number;
  candidateOnlyIdCount: number;
  candidateMissingIdCount: number;
  candidateLegacyIdCount: number;
  candidateDuplicateIdCount: number;
  candidateInvalidCanonicalIdCount: number;
  risk: 'blocker' | 'high' | 'medium' | 'low';
  examples: {
    currentOnly: Array<{ id: string; english: string }>;
    candidateOnly: Array<{ id: string; english: string }>;
    mismatchedById: Array<{ id: string; currentEnglish: string; candidateEnglish: string }>;
    textOverlap: string[];
    invalidCandidateIds: Array<{ id: string; english: string }>;
  };
  recommendation: string;
};

type Finding = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  files: string[];
};

type Audit = {
  schemaVersion: 'gustav-lesson-9-16-reconciliation-audit-v0';
  runId: string;
  status: Status;
  generatedAt: string;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    currentPhraseCount: number;
    candidatePhraseCount: number;
    lessonsCompared: number;
    totalIdOverlap: number;
    totalEnglishExactMatchesById: number;
    totalSameLessonEnglishTextOverlap: number;
    totalCurrentOnlyIds: number;
    totalCandidateOnlyIds: number;
    candidateMissingIds: number;
    candidateLegacyIds: number;
    candidateDuplicateIds: number;
    candidateInvalidCanonicalIds: number;
    blockerLessons: number;
    highRiskLessons: number;
    blockers: number;
    highRisks: number;
    canAutoPromoteHistoricalCandidate: boolean;
    recommendedPolicy: 'do_not_auto_merge' | 'manual_review_required' | 'approved';
  };
  inputArtifacts: {
    currentSourceGraph: string;
    recoveryCandidate: string;
    recoveryAudit: string;
  };
  lessonComparisons: LessonComparison[];
  findings: Finding[];
  requiredBeforeFrenchGeneration: string[];
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

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9а-яіїєґё' ]+/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalIdForLesson(lessonId: number, id: string): boolean {
  return new RegExp(`^lesson${lessonId}_phrase_\\d+$`).test(id);
}

function legacyId(id: string): boolean {
  return /^l\d+p\d+$/.test(id);
}

function asPhraseFromGraph(value: Record<string, unknown>): Phrase {
  const prompts = value.sourcePrompts && typeof value.sourcePrompts === 'object'
    ? value.sourcePrompts as Record<string, unknown>
    : {};
  return {
    lessonId: typeof value.lessonId === 'number' ? value.lessonId : 0,
    id: typeof value.id === 'string' ? value.id : '',
    english: typeof value.targetText === 'string' ? value.targetText : '',
    russian: typeof prompts.ru === 'string' ? prompts.ru : '',
    ukrainian: typeof prompts.uk === 'string' ? prompts.uk : '',
  };
}

function asPhraseFromCandidate(value: Record<string, unknown>): Phrase {
  return {
    lessonId: typeof value.lessonId === 'number' ? value.lessonId : 0,
    id: typeof value.id === 'string' ? value.id : '',
    english: typeof value.english === 'string' ? value.english : '',
    russian: typeof value.russian === 'string' ? value.russian : '',
    ukrainian: typeof value.ukrainian === 'string' ? value.ukrainian : '',
  };
}

function duplicateIdCount(phrases: Phrase[]): number {
  const counts = new Map<string, number>();
  for (const phrase of phrases) {
    if (!phrase.id) continue;
    counts.set(phrase.id, (counts.get(phrase.id) ?? 0) + 1);
  }
  let duplicates = 0;
  for (const count of counts.values()) {
    if (count > 1) duplicates += count - 1;
  }
  return duplicates;
}

function compareLesson(lessonId: number, currentAll: Phrase[], candidateAll: Phrase[]): LessonComparison {
  const current = currentAll.filter((phrase) => phrase.lessonId === lessonId);
  const candidate = candidateAll.filter((phrase) => phrase.lessonId === lessonId);
  const currentById = new Map(current.map((phrase) => [phrase.id, phrase]));
  const candidateById = new Map(candidate.filter((phrase) => phrase.id).map((phrase) => [phrase.id, phrase]));
  const currentTextSet = new Set(current.map((phrase) => normalizeText(phrase.english)).filter(Boolean));
  const candidateTextSet = new Set(candidate.map((phrase) => normalizeText(phrase.english)).filter(Boolean));
  const currentOnly = current.filter((phrase) => !candidateById.has(phrase.id));
  const candidateOnly = candidate.filter((phrase) => !phrase.id || !currentById.has(phrase.id));
  const mismatchedById: LessonComparison['examples']['mismatchedById'] = [];
  let idOverlap = 0;
  let englishExactMatchesById = 0;
  let russianExactMatchesById = 0;
  let ukrainianExactMatchesById = 0;

  for (const phrase of candidate) {
    if (!phrase.id) continue;
    const currentPhrase = currentById.get(phrase.id);
    if (!currentPhrase) continue;
    idOverlap += 1;
    if (normalizeText(currentPhrase.english) === normalizeText(phrase.english)) {
      englishExactMatchesById += 1;
    } else {
      mismatchedById.push({
        id: phrase.id,
        currentEnglish: currentPhrase.english,
        candidateEnglish: phrase.english,
      });
    }
    if (normalizeText(currentPhrase.russian) === normalizeText(phrase.russian)) russianExactMatchesById += 1;
    if (normalizeText(currentPhrase.ukrainian) === normalizeText(phrase.ukrainian)) ukrainianExactMatchesById += 1;
  }

  const textOverlap: string[] = [];
  for (const phrase of candidate) {
    const normalized = normalizeText(phrase.english);
    if (normalized && currentTextSet.has(normalized)) textOverlap.push(phrase.english);
  }

  const candidateMissingIdCount = candidate.filter((phrase) => !phrase.id).length;
  const candidateLegacyIdCount = candidate.filter((phrase) => legacyId(phrase.id)).length;
  const candidateDuplicateIdCount = duplicateIdCount(candidate);
  const invalidCandidateIds = candidate.filter((phrase) => !canonicalIdForLesson(lessonId, phrase.id));
  const candidateInvalidCanonicalIdCount = invalidCandidateIds.length;
  const risk: LessonComparison['risk'] = candidateMissingIdCount > 0 ||
    candidateLegacyIdCount > 0 ||
    candidateInvalidCanonicalIdCount > 0 ||
    englishExactMatchesById === 0
    ? 'blocker'
    : mismatchedById.length > 0
      ? 'high'
      : 'low';

  const recommendation = risk === 'blocker'
    ? 'Do not auto-promote this lesson. It needs source-truth review against current runtime and lesson intent.'
    : risk === 'high'
      ? 'Review mismatched phrases before promotion.'
      : 'Candidate aligns with current runtime for this lesson.';

  return {
    lessonId,
    currentCount: current.length,
    candidateCount: candidate.length,
    idOverlap,
    englishExactMatchesById,
    russianExactMatchesById,
    ukrainianExactMatchesById,
    sameLessonEnglishTextOverlap: textOverlap.length,
    currentOnlyIdCount: currentOnly.length,
    candidateOnlyIdCount: candidateOnly.length,
    candidateMissingIdCount,
    candidateLegacyIdCount,
    candidateDuplicateIdCount,
    candidateInvalidCanonicalIdCount,
    risk,
    examples: {
      currentOnly: currentOnly.slice(0, 8).map((phrase) => ({ id: phrase.id, english: phrase.english })),
      candidateOnly: candidateOnly.slice(0, 8).map((phrase) => ({ id: phrase.id, english: phrase.english })),
      mismatchedById: mismatchedById.slice(0, 8),
      textOverlap: textOverlap.slice(0, 8),
      invalidCandidateIds: invalidCandidateIds.slice(0, 8).map((phrase) => ({ id: phrase.id, english: phrase.english })),
    },
    recommendation,
  };
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV Lesson 9-16 Reconciliation Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Current phrase count: ${audit.summary.currentPhraseCount}`,
    `- Candidate phrase count: ${audit.summary.candidatePhraseCount}`,
    `- Lessons compared: ${audit.summary.lessonsCompared}`,
    `- Total id overlap: ${audit.summary.totalIdOverlap}`,
    `- Total exact English matches by id: ${audit.summary.totalEnglishExactMatchesById}`,
    `- Same-lesson English text overlap: ${audit.summary.totalSameLessonEnglishTextOverlap}`,
    `- Current-only ids: ${audit.summary.totalCurrentOnlyIds}`,
    `- Candidate-only ids: ${audit.summary.totalCandidateOnlyIds}`,
    `- Candidate missing ids: ${audit.summary.candidateMissingIds}`,
    `- Candidate legacy ids: ${audit.summary.candidateLegacyIds}`,
    `- Candidate duplicate ids: ${audit.summary.candidateDuplicateIds}`,
    `- Candidate invalid canonical ids: ${audit.summary.candidateInvalidCanonicalIds}`,
    `- Blocker lessons: ${audit.summary.blockerLessons}`,
    `- High-risk lessons: ${audit.summary.highRiskLessons}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- High risks: ${audit.summary.highRisks}`,
    `- Can auto-promote historical candidate: ${audit.summary.canAutoPromoteHistoricalCandidate ? 'yes' : 'no'}`,
    `- Recommended policy: \`${audit.summary.recommendedPolicy}\``,
    '',
    '## Findings',
    '',
  ];
  for (const finding of audit.findings) {
    lines.push(`### ${finding.id}: ${finding.title}`);
    lines.push('');
    lines.push(`Severity: \`${finding.severity}\``);
    lines.push('');
    lines.push(finding.detail);
    lines.push('');
    if (finding.files.length > 0) {
      lines.push('Files:');
      for (const file of finding.files) lines.push(`- \`${file}\``);
      lines.push('');
    }
  }
  lines.push('## Lesson Breakdown', '');
  for (const lesson of audit.lessonComparisons) {
    lines.push(`### Lesson ${lesson.lessonId}`);
    lines.push('');
    lines.push(`- Risk: \`${lesson.risk}\``);
    lines.push(`- Current/candidate count: ${lesson.currentCount}/${lesson.candidateCount}`);
    lines.push(`- Id overlap: ${lesson.idOverlap}`);
    lines.push(`- Exact English matches by id: ${lesson.englishExactMatchesById}`);
    lines.push(`- Same-lesson text overlap: ${lesson.sameLessonEnglishTextOverlap}`);
    lines.push(`- Current-only ids: ${lesson.currentOnlyIdCount}`);
    lines.push(`- Candidate-only ids: ${lesson.candidateOnlyIdCount}`);
    lines.push(`- Missing ids: ${lesson.candidateMissingIdCount}`);
    lines.push(`- Legacy ids: ${lesson.candidateLegacyIdCount}`);
    lines.push(`- Duplicate ids: ${lesson.candidateDuplicateIdCount}`);
    lines.push(`- Invalid canonical ids: ${lesson.candidateInvalidCanonicalIdCount}`);
    lines.push(`- Recommendation: ${lesson.recommendation}`);
    lines.push('');
  }
  lines.push('## Required Before French Generation', '');
  for (const item of audit.requiredBeforeFrenchGeneration) lines.push(`- ${item}`);
  lines.push('', '## Notes', '');
  for (const note of audit.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_lesson_9_16_reconciliation_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const sourceGraphPath = path.join(runDir, 'source_graph/source_graph.json');
  const recoveryCandidatePath = path.join(runDir, 'source_graph/recovery/lesson_9_16_historical_recovery_candidate.json');
  const recoveryAuditPath = path.join(runDir, 'audits/lesson_9_16_source_recovery_audit.json');
  const sourceGraph = readJson<Record<string, unknown>>(sourceGraphPath);
  const recoveryCandidate = readJson<Record<string, unknown>>(recoveryCandidatePath);
  const graphPhrases = Array.isArray(sourceGraph.phrases)
    ? sourceGraph.phrases as Array<Record<string, unknown>>
    : [];
  const candidatePhrasesRaw = Array.isArray(recoveryCandidate.phrases)
    ? recoveryCandidate.phrases as Array<Record<string, unknown>>
    : [];
  const current = graphPhrases
    .map(asPhraseFromGraph)
    .filter((phrase) => phrase.lessonId >= 9 && phrase.lessonId <= 16);
  const candidate = candidatePhrasesRaw
    .map(asPhraseFromCandidate)
    .filter((phrase) => phrase.lessonId >= 9 && phrase.lessonId <= 16);
  const lessonComparisons = Array.from({ length: 8 }, (_, index) => compareLesson(index + 9, current, candidate));

  const summaryBase = lessonComparisons.reduce((summary, lesson) => {
    summary.totalIdOverlap += lesson.idOverlap;
    summary.totalEnglishExactMatchesById += lesson.englishExactMatchesById;
    summary.totalSameLessonEnglishTextOverlap += lesson.sameLessonEnglishTextOverlap;
    summary.totalCurrentOnlyIds += lesson.currentOnlyIdCount;
    summary.totalCandidateOnlyIds += lesson.candidateOnlyIdCount;
    summary.candidateMissingIds += lesson.candidateMissingIdCount;
    summary.candidateLegacyIds += lesson.candidateLegacyIdCount;
    summary.candidateDuplicateIds += lesson.candidateDuplicateIdCount;
    summary.candidateInvalidCanonicalIds += lesson.candidateInvalidCanonicalIdCount;
    summary.blockerLessons += lesson.risk === 'blocker' ? 1 : 0;
    summary.highRiskLessons += lesson.risk === 'high' ? 1 : 0;
    return summary;
  }, {
    totalIdOverlap: 0,
    totalEnglishExactMatchesById: 0,
    totalSameLessonEnglishTextOverlap: 0,
    totalCurrentOnlyIds: 0,
    totalCandidateOnlyIds: 0,
    candidateMissingIds: 0,
    candidateLegacyIds: 0,
    candidateDuplicateIds: 0,
    candidateInvalidCanonicalIds: 0,
    blockerLessons: 0,
    highRiskLessons: 0,
  });

  const findings: Finding[] = [];
  if (summaryBase.totalEnglishExactMatchesById === 0) {
    findings.push({
      id: 'L916R-001',
      severity: 'blocker',
      title: 'Historical candidate has zero exact English matches by id',
      detail: 'The recovered historical candidate cannot be treated as the source for current runtime because no overlapping id has the same English text.',
      files: [
        'docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/source_graph.json',
        'docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/recovery/lesson_9_16_historical_recovery_candidate.json',
      ],
    });
  }
  if (summaryBase.candidateInvalidCanonicalIds > 0) {
    findings.push({
      id: 'L916R-002',
      severity: 'blocker',
      title: 'Historical candidate has invalid or missing phrase ids',
      detail: `${summaryBase.candidateInvalidCanonicalIds} candidate entries do not match the current canonical lessonN_phrase_M id pattern. This includes ${summaryBase.candidateMissingIds} missing ids and ${summaryBase.candidateLegacyIds} legacy ids.`,
      files: ['docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/recovery/lesson_9_16_historical_recovery_candidate.json'],
    });
  }
  if (summaryBase.blockerLessons > 0) {
    findings.push({
      id: 'L916R-003',
      severity: 'blocker',
      title: 'Every lesson 9-16 needs manual source reconciliation',
      detail: `${summaryBase.blockerLessons} lessons have blocker-level divergence between the historical candidate and current runtime.`,
      files: [
        'app/lesson_data_9_16.ts',
        'app/lesson_data_9_16_phrases_es.gen.ts',
      ],
    });
  }
  findings.push({
    id: 'L916R-004',
    severity: 'blocker',
    title: 'Automatic source promotion is forbidden',
    detail: 'The safe policy is do_not_auto_merge: either approve a reviewed canonical extraction or keep current generated runtime as read-only evidence with explicit source-truth decision.',
    files: ['docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/lesson_9_16_source_recovery_audit.md'],
  });

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const highRisks = findings.filter((finding) => finding.severity === 'high').length;
  const audit: Audit = {
    schemaVersion: 'gustav-lesson-9-16-reconciliation-audit-v0',
    runId,
    status: blockers > 0 ? 'HOLD' : highRisks > 0 ? 'HOLD' : 'PASS',
    generatedAt: new Date().toISOString(),
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      currentPhraseCount: current.length,
      candidatePhraseCount: candidate.length,
      lessonsCompared: lessonComparisons.length,
      ...summaryBase,
      blockers,
      highRisks,
      canAutoPromoteHistoricalCandidate: false,
      recommendedPolicy: 'do_not_auto_merge',
    },
    inputArtifacts: {
      currentSourceGraph: path.relative(repoRoot, sourceGraphPath),
      recoveryCandidate: path.relative(repoRoot, recoveryCandidatePath),
      recoveryAudit: path.relative(repoRoot, recoveryAuditPath),
    },
    lessonComparisons,
    findings,
    requiredBeforeFrenchGeneration: [
      'Choose a lesson 9-16 source-truth policy: reviewed canonical extraction or explicit read-only runtime evidence approval.',
      'If canonical extraction is chosen, create a non-generated source with stable current ids and current English/RU/UK prompts.',
      'Rerun source graph, source graph quality, generated source-truth, reconciliation, validator and readiness gates.',
    ],
    notes: [
      'This audit explains why the historical recovery candidate is useful evidence but unsafe as direct source truth.',
      'It does not write to app files.',
    ],
  };

  const auditsDir = path.join(runDir, 'audits');
  ensureDir(auditsDir);
  const outJson = path.join(auditsDir, 'lesson_9_16_reconciliation_audit.json');
  const outMd = path.join(auditsDir, 'lesson_9_16_reconciliation_audit.md');
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV lesson 9-16 reconciliation audit: ${audit.status}`);
  console.log(`Blocker lessons: ${audit.summary.blockerLessons}`);
  console.log(`Exact English matches by id: ${audit.summary.totalEnglishExactMatchesById}`);
  console.log(`Candidate invalid canonical ids: ${audit.summary.candidateInvalidCanonicalIds}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
}

void main();
