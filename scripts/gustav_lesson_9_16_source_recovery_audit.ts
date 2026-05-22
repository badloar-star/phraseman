import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'high' | 'medium' | 'low' | 'info';

type PhraseEntry = {
  lessonId: number;
  id: string;
  english: string;
  russian: string;
  ukrainian: string;
  spanish: string;
  wordCount: number;
  sourceFile: string;
  sourceCommit: string;
  line: number;
};

type CandidateStatus = 'inline_source_found' | 'generated_import_only' | 'missing_blob' | 'parse_error';

type Candidate = {
  commit: string;
  file: string;
  status: CandidateStatus;
  phraseCount: number;
  lessons: number[];
  hasGeneratedImport: boolean;
  idOverlapWithCurrent: number;
  englishExactMatchesById: number;
  russianExactMatchesById: number;
  ukrainianExactMatchesById: number;
  englishTextOverlap: number;
  currentOnlyIdCount: number;
  candidateOnlyIdCount: number;
  mismatchedByIdCount: number;
  currentOnlyIds: string[];
  candidateOnlyIds: string[];
  mismatchedById: Array<{
    id: string;
    currentEnglish: string;
    candidateEnglish: string;
  }>;
  score: number;
  notes: string[];
};

type Finding = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  files: string[];
};

type Audit = {
  schemaVersion: 'gustav-lesson-9-16-source-recovery-audit-v0';
  runId: string;
  status: Status;
  generatedAt: string;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    currentGeneratedPhraseCount: number;
    historicalCommitsChecked: number;
    inlineSourceCandidates: number;
    generatedImportOnlyCandidates: number;
    bestCandidateCommit: string;
    bestCandidatePhraseCount: number;
    bestCandidateIdOverlap: number;
    bestCandidateEnglishExactMatchesById: number;
    bestCandidateEnglishTextOverlap: number;
    bestCandidateCurrentOnlyIds: number;
    bestCandidateOnlyIds: number;
    bestCandidateMismatchedIds: number;
    blockers: number;
    highRisks: number;
    recoveryCandidateWritten: boolean;
    canPromoteToCanonicalWithoutReview: boolean;
  };
  currentRuntime: {
    file: string;
    generated: boolean;
    phraseCount: number;
    lessons: number[];
  };
  candidates: Candidate[];
  bestCandidate: Candidate | null;
  findings: Finding[];
  recoveryCandidatePath: string | null;
  requiredBeforeFrenchGeneration: string[];
  notes: string[];
};

const HISTORY_COMMITS = [
  '18a666c',
  'e61e990',
  '20ee88c',
  'b35c93e',
  '6ca36b8',
];

const SOURCE_FILE = 'app/lesson_data_9_16.ts';
const CURRENT_GENERATED_FILE = 'app/lesson_data_9_16_phrases_es.gen.ts';

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function propertyNameText(name: ts.PropertyName): string {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  if (ts.isComputedPropertyName(name)) return name.expression.getText();
  return name.getText();
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    if (ts.isParenthesizedExpression(current)) current = current.expression;
    else current = current.expression;
  }
  return current;
}

function stringValue(expression: ts.Expression | undefined): string {
  if (!expression) return '';
  const value = unwrapExpression(expression);
  if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return value.text;
  return '';
}

function arrayLength(expression: ts.Expression | undefined): number {
  if (!expression) return 0;
  const value = unwrapExpression(expression);
  return ts.isArrayLiteralExpression(value) ? value.elements.length : 0;
}

function objectProperty(object: ts.ObjectLiteralExpression, key: string): ts.Expression | undefined {
  for (const prop of object.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (propertyNameText(prop.name) === key) return prop.initializer;
  }
  return undefined;
}

function parsePhraseEntries(sourceText: string, sourceFile: string, sourceCommit: string): PhraseEntry[] {
  const source = ts.createSourceFile(`${sourceCommit}:${sourceFile}`, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const phrases: PhraseEntry[] = [];

  function visit(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const match = /^LESSON_(\d+)_PHRASES$/.exec(node.name.text);
      if (match) {
        const lessonId = Number(match[1]);
        const initializer = unwrapExpression(node.initializer);
        if (lessonId >= 9 && lessonId <= 16 && ts.isArrayLiteralExpression(initializer)) {
          for (const element of initializer.elements) {
            const object = unwrapExpression(element as ts.Expression);
            if (!ts.isObjectLiteralExpression(object)) continue;
            const id = stringValue(objectProperty(object, 'id'));
            const english = stringValue(objectProperty(object, 'english'));
            if (!id && !english) continue;
            const wordsEnCount = arrayLength(objectProperty(object, 'wordsEn'));
            const wordsCount = arrayLength(objectProperty(object, 'words'));
            phrases.push({
              lessonId,
              id,
              english,
              russian: stringValue(objectProperty(object, 'russian')),
              ukrainian: stringValue(objectProperty(object, 'ukrainian')),
              spanish: stringValue(objectProperty(object, 'spanish')),
              wordCount: wordsEnCount || wordsCount,
              sourceFile,
              sourceCommit,
              line: source.getLineAndCharacterOfPosition(object.getStart(source)).line + 1,
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return phrases;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9а-яіїєґё' ]+/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueLessons(phrases: PhraseEntry[]): number[] {
  return Array.from(new Set(phrases.map((phrase) => phrase.lessonId))).sort((a, b) => a - b);
}

function readGitBlob(repoRoot: string, commit: string, file: string): string | null {
  try {
    return execFileSync('git', ['show', `${commit}:${file}`], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 24 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

function compareCandidate(current: PhraseEntry[], candidate: PhraseEntry[], commit: string, sourceText: string | null): Candidate {
  const currentById = new Map(current.map((phrase) => [phrase.id, phrase]));
  const candidateById = new Map(candidate.map((phrase) => [phrase.id, phrase]));
  const currentEnglishSet = new Set(current.map((phrase) => normalizeText(phrase.english)).filter(Boolean));
  const candidateEnglishSet = new Set(candidate.map((phrase) => normalizeText(phrase.english)).filter(Boolean));
  const currentOnlyIds = current
    .filter((phrase) => !candidateById.has(phrase.id))
    .map((phrase) => phrase.id);
  const candidateOnlyIds = candidate
    .filter((phrase) => !currentById.has(phrase.id))
    .map((phrase) => phrase.id);
  const mismatchedById: Candidate['mismatchedById'] = [];
  let idOverlapWithCurrent = 0;
  let englishExactMatchesById = 0;
  let russianExactMatchesById = 0;
  let ukrainianExactMatchesById = 0;

  for (const phrase of candidate) {
    const currentPhrase = currentById.get(phrase.id);
    if (!currentPhrase) continue;
    idOverlapWithCurrent += 1;
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

  let englishTextOverlap = 0;
  for (const text of candidateEnglishSet) {
    if (currentEnglishSet.has(text)) englishTextOverlap += 1;
  }

  const hasGeneratedImport = sourceText ? /_es\.gen|lesson_data_9_16_phrases_es\.gen/.test(sourceText) : false;
  const phraseCountDelta = Math.abs(current.length - candidate.length);
  const score = idOverlapWithCurrent * 4 + englishExactMatchesById * 4 + englishTextOverlap * 2 - phraseCountDelta * 3;
  const status: CandidateStatus = !sourceText
    ? 'missing_blob'
    : candidate.length > 0
      ? 'inline_source_found'
      : hasGeneratedImport
        ? 'generated_import_only'
        : 'parse_error';

  const notes: string[] = [];
  if (status === 'inline_source_found') notes.push('Historical inline LESSON_9_PHRASES through LESSON_16_PHRASES arrays were found in this git blob.');
  if (hasGeneratedImport) notes.push('This blob imports generated runtime data and cannot be canonical by itself.');
  if (currentOnlyIds.length > 0) notes.push(`${currentOnlyIds.length} current runtime ids are missing from this candidate.`);
  if (candidateOnlyIds.length > 0) notes.push(`${candidateOnlyIds.length} candidate ids are not present in current runtime.`);
  if (mismatchedById.length > 0) notes.push(`${mismatchedById.length} overlapping ids have different English text.`);

  return {
    commit,
    file: SOURCE_FILE,
    status,
    phraseCount: candidate.length,
    lessons: uniqueLessons(candidate),
    hasGeneratedImport,
    idOverlapWithCurrent,
    englishExactMatchesById,
    russianExactMatchesById,
    ukrainianExactMatchesById,
    englishTextOverlap,
    currentOnlyIdCount: currentOnlyIds.length,
    candidateOnlyIdCount: candidateOnlyIds.length,
    mismatchedByIdCount: mismatchedById.length,
    currentOnlyIds: currentOnlyIds.slice(0, 40),
    candidateOnlyIds: candidateOnlyIds.slice(0, 40),
    mismatchedById: mismatchedById.slice(0, 40),
    score,
    notes,
  };
}

function renderAuditMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV Lesson 9-16 Source Recovery Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Current generated phrase count: ${audit.summary.currentGeneratedPhraseCount}`,
    `- Historical commits checked: ${audit.summary.historicalCommitsChecked}`,
    `- Inline source candidates: ${audit.summary.inlineSourceCandidates}`,
    `- Generated-import-only candidates: ${audit.summary.generatedImportOnlyCandidates}`,
    `- Best candidate commit: ${audit.summary.bestCandidateCommit ? `\`${audit.summary.bestCandidateCommit}\`` : '`none`'}`,
    `- Best candidate phrase count: ${audit.summary.bestCandidatePhraseCount}`,
    `- Best candidate id overlap: ${audit.summary.bestCandidateIdOverlap}`,
    `- Best candidate English exact matches by id: ${audit.summary.bestCandidateEnglishExactMatchesById}`,
    `- Best candidate English text overlap: ${audit.summary.bestCandidateEnglishTextOverlap}`,
    `- Best candidate current-only ids: ${audit.summary.bestCandidateCurrentOnlyIds}`,
    `- Best candidate-only ids: ${audit.summary.bestCandidateOnlyIds}`,
    `- Best candidate mismatched ids: ${audit.summary.bestCandidateMismatchedIds}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- High risks: ${audit.summary.highRisks}`,
    `- Recovery candidate written: ${audit.summary.recoveryCandidateWritten ? 'yes' : 'no'}`,
    `- Can promote to canonical without review: ${audit.summary.canPromoteToCanonicalWithoutReview ? 'yes' : 'no'}`,
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
  lines.push('## Candidate Comparison', '');
  for (const candidate of audit.candidates) {
    lines.push(`### ${candidate.commit}`);
    lines.push('');
    lines.push(`- Status: \`${candidate.status}\``);
    lines.push(`- Phrase count: ${candidate.phraseCount}`);
    lines.push(`- Lessons: ${candidate.lessons.join(', ') || 'none'}`);
    lines.push(`- Has generated import: ${candidate.hasGeneratedImport ? 'yes' : 'no'}`);
    lines.push(`- Id overlap: ${candidate.idOverlapWithCurrent}`);
    lines.push(`- English exact matches by id: ${candidate.englishExactMatchesById}`);
    lines.push(`- English text overlap: ${candidate.englishTextOverlap}`);
    lines.push(`- Current-only ids: ${candidate.currentOnlyIdCount} (${candidate.currentOnlyIds.length} shown)`);
    lines.push(`- Candidate-only ids: ${candidate.candidateOnlyIdCount} (${candidate.candidateOnlyIds.length} shown)`);
    lines.push(`- Mismatched ids: ${candidate.mismatchedByIdCount} (${candidate.mismatchedById.length} shown)`);
    lines.push(`- Score: ${candidate.score}`);
    if (candidate.notes.length > 0) {
      lines.push('- Notes:');
      for (const note of candidate.notes) lines.push(`  - ${note}`);
    }
    lines.push('');
  }
  lines.push('## Required Before French Generation', '');
  for (const item of audit.requiredBeforeFrenchGeneration) lines.push(`- ${item}`);
  lines.push('', '## Notes', '');
  for (const note of audit.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

function renderCandidateMarkdown(input: {
  runId: string;
  generatedAt: string;
  sourceCommit: string;
  phrases: PhraseEntry[];
  comparison: Candidate;
}): string {
  const lines = [
    '# GUSTAV Lesson 9-16 Historical Recovery Candidate',
    '',
    `Run: \`${input.runId}\``,
    '',
    `Source commit: \`${input.sourceCommit}\``,
    '',
    `Generated at: ${input.generatedAt}`,
    '',
    'This artifact is a review candidate only. It is not approved canonical source truth.',
    '',
    '## Comparison',
    '',
    `- Phrase count: ${input.phrases.length}`,
    `- Id overlap with current runtime: ${input.comparison.idOverlapWithCurrent}`,
    `- English exact matches by id: ${input.comparison.englishExactMatchesById}`,
    `- English text overlap: ${input.comparison.englishTextOverlap}`,
    `- Current-only ids: ${input.comparison.currentOnlyIdCount} (${input.comparison.currentOnlyIds.length} shown)`,
    `- Candidate-only ids: ${input.comparison.candidateOnlyIdCount} (${input.comparison.candidateOnlyIds.length} shown)`,
    `- Mismatched ids: ${input.comparison.mismatchedByIdCount} (${input.comparison.mismatchedById.length} shown)`,
    '',
    '## Phrase Sample',
    '',
  ];
  for (const phrase of input.phrases.slice(0, 24)) {
    lines.push(`- \`${phrase.id}\` L${phrase.lessonId}: ${phrase.english}`);
  }
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_lesson_9_16_source_recovery_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const generatedAt = new Date().toISOString();
  const currentPath = path.join(repoRoot, CURRENT_GENERATED_FILE);
  const currentText = fs.existsSync(currentPath) ? fs.readFileSync(currentPath, 'utf8') : '';
  const current = currentText ? parsePhraseEntries(currentText, CURRENT_GENERATED_FILE, 'working-tree') : [];

  const phraseSets = new Map<string, PhraseEntry[]>();
  const candidates = HISTORY_COMMITS.map((commit) => {
    const sourceText = readGitBlob(repoRoot, commit, SOURCE_FILE);
    const phrases = sourceText ? parsePhraseEntries(sourceText, SOURCE_FILE, commit) : [];
    phraseSets.set(commit, phrases);
    return compareCandidate(current, phrases, commit, sourceText);
  });

  const inlineCandidates = candidates.filter((candidate) => candidate.status === 'inline_source_found');
  const bestCandidate = inlineCandidates
    .slice()
    .sort((a, b) => b.score - a.score || b.phraseCount - a.phraseCount)[0] ?? null;

  const findings: Finding[] = [];
  if (current.length !== 400) {
    findings.push({
      id: 'L916-001',
      severity: 'blocker',
      title: 'Current generated lesson 9-16 runtime has unexpected phrase count',
      detail: `Expected 400 current generated phrase entries for lessons 9-16, found ${current.length}. Source graph recovery cannot be trusted until the runtime extraction is stable.`,
      files: [CURRENT_GENERATED_FILE],
    });
  }
  if (!bestCandidate) {
    findings.push({
      id: 'L916-002',
      severity: 'blocker',
      title: 'No historical inline source candidate was found',
      detail: 'Gustav could not recover a non-generated historical LESSON_9_PHRASES through LESSON_16_PHRASES source from the checked git commits.',
      files: [SOURCE_FILE],
    });
  } else if (
    bestCandidate.phraseCount !== current.length ||
    bestCandidate.idOverlapWithCurrent !== current.length ||
    bestCandidate.englishExactMatchesById !== current.length ||
    bestCandidate.currentOnlyIdCount > 0 ||
    bestCandidate.candidateOnlyIdCount > 0
  ) {
    findings.push({
      id: 'L916-003',
      severity: 'blocker',
      title: 'Historical source candidate does not exactly match current runtime',
      detail: `Best candidate ${bestCandidate.commit} has ${bestCandidate.phraseCount} phrases, ${bestCandidate.idOverlapWithCurrent} id overlaps, ${bestCandidate.englishExactMatchesById} exact English matches by id and ${bestCandidate.englishTextOverlap} English text overlaps. It is useful recovery evidence, but cannot be promoted automatically.`,
      files: [SOURCE_FILE, CURRENT_GENERATED_FILE],
    });
  }
  if (bestCandidate && bestCandidate.hasGeneratedImport) {
    findings.push({
      id: 'L916-004',
      severity: 'high',
      title: 'Best candidate imports generated runtime',
      detail: `Best candidate ${bestCandidate.commit} imports generated runtime data. It can only be evidence, not canonical source.`,
      files: [SOURCE_FILE, CURRENT_GENERATED_FILE],
    });
  }
  findings.push({
    id: 'L916-005',
    severity: 'blocker',
    title: 'Recovered candidate requires explicit source-truth approval',
    detail: 'Even if a historical candidate is strong, Gustav must not treat it as canonical source truth until a review artifact approves the diff against current runtime and English base intent.',
    files: bestCandidate ? [SOURCE_FILE, CURRENT_GENERATED_FILE] : [SOURCE_FILE],
  });

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const highRisks = findings.filter((finding) => finding.severity === 'high').length;
  const canPromoteToCanonicalWithoutReview = false;
  const status: Status = blockers > 0 ? 'HOLD' : highRisks > 0 ? 'HOLD' : 'PASS';

  const recoveryDir = path.join(runDir, 'source_graph', 'recovery');
  ensureDir(recoveryDir);
  let recoveryCandidatePath: string | null = null;
  if (bestCandidate) {
    const bestPhrases = phraseSets.get(bestCandidate.commit) ?? [];
    const candidateArtifact = {
      schemaVersion: 'gustav-lesson-9-16-recovery-candidate-v0',
      runId,
      status: 'needs_review',
      generatedAt,
      source: {
        kind: 'git_history',
        commit: bestCandidate.commit,
        file: SOURCE_FILE,
        comparedAgainst: CURRENT_GENERATED_FILE,
      },
      summary: {
        phrases: bestPhrases.length,
        idOverlapWithCurrent: bestCandidate.idOverlapWithCurrent,
        englishExactMatchesById: bestCandidate.englishExactMatchesById,
        englishTextOverlap: bestCandidate.englishTextOverlap,
        currentOnlyIds: bestCandidate.currentOnlyIds.length,
        currentOnlyIdCount: bestCandidate.currentOnlyIdCount,
        candidateOnlyIds: bestCandidate.candidateOnlyIds.length,
        candidateOnlyIdCount: bestCandidate.candidateOnlyIdCount,
        mismatchedIds: bestCandidate.mismatchedById.length,
        mismatchedIdCount: bestCandidate.mismatchedByIdCount,
        approvedCanonicalSourceTruth: false,
      },
      phrases: bestPhrases,
    };
    const candidateJsonPath = path.join(recoveryDir, 'lesson_9_16_historical_recovery_candidate.json');
    const candidateMdPath = path.join(recoveryDir, 'lesson_9_16_historical_recovery_candidate.md');
    fs.writeFileSync(candidateJsonPath, `${JSON.stringify(candidateArtifact, null, 2)}\n`);
    fs.writeFileSync(candidateMdPath, renderCandidateMarkdown({
      runId,
      generatedAt,
      sourceCommit: bestCandidate.commit,
      phrases: bestPhrases,
      comparison: bestCandidate,
    }));
    recoveryCandidatePath = path.relative(repoRoot, candidateJsonPath);
  }

  const audit: Audit = {
    schemaVersion: 'gustav-lesson-9-16-source-recovery-audit-v0',
    runId,
    status,
    generatedAt,
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      currentGeneratedPhraseCount: current.length,
      historicalCommitsChecked: HISTORY_COMMITS.length,
      inlineSourceCandidates: inlineCandidates.length,
      generatedImportOnlyCandidates: candidates.filter((candidate) => candidate.status === 'generated_import_only').length,
      bestCandidateCommit: bestCandidate?.commit ?? '',
      bestCandidatePhraseCount: bestCandidate?.phraseCount ?? 0,
      bestCandidateIdOverlap: bestCandidate?.idOverlapWithCurrent ?? 0,
      bestCandidateEnglishExactMatchesById: bestCandidate?.englishExactMatchesById ?? 0,
      bestCandidateEnglishTextOverlap: bestCandidate?.englishTextOverlap ?? 0,
      bestCandidateCurrentOnlyIds: bestCandidate?.currentOnlyIdCount ?? 0,
      bestCandidateOnlyIds: bestCandidate?.candidateOnlyIdCount ?? 0,
      bestCandidateMismatchedIds: bestCandidate?.mismatchedByIdCount ?? 0,
      blockers,
      highRisks,
      recoveryCandidateWritten: recoveryCandidatePath !== null,
      canPromoteToCanonicalWithoutReview,
    },
    currentRuntime: {
      file: CURRENT_GENERATED_FILE,
      generated: true,
      phraseCount: current.length,
      lessons: uniqueLessons(current),
    },
    candidates,
    bestCandidate,
    findings,
    recoveryCandidatePath,
    requiredBeforeFrenchGeneration: [
      'Review the historical recovery candidate against current runtime and source graph phrase intent.',
      'Decide whether to extract a canonical non-generated lesson 9-16 source file from git history.',
      'If approved, rerun source graph extraction, source graph quality audit, generated source-truth audit, validator and readiness gate.',
      'Do not use generated Spanish runtime tokens as French curriculum source truth.',
    ],
    notes: [
      'This script reads git history and writes recovery evidence only under the Gustav run folder.',
      'It does not modify production lesson files.',
      'A recovery candidate can reduce ambiguity, but explicit approval is still required before French generation.',
    ],
  };

  const auditsDir = path.join(runDir, 'audits');
  ensureDir(auditsDir);
  const outJson = path.join(auditsDir, 'lesson_9_16_source_recovery_audit.json');
  const outMd = path.join(auditsDir, 'lesson_9_16_source_recovery_audit.md');
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderAuditMarkdown(audit));

  console.log(`GUSTAV lesson 9-16 source recovery audit: ${audit.status}`);
  console.log(`Current runtime phrases: ${audit.summary.currentGeneratedPhraseCount}`);
  console.log(`Inline historical candidates: ${audit.summary.inlineSourceCandidates}`);
  console.log(`Best candidate: ${audit.summary.bestCandidateCommit || 'none'}`);
  console.log(`Blockers: ${audit.summary.blockers}`);
  console.log(`High risks: ${audit.summary.highRisks}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
}

void main();
