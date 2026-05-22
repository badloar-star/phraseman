import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'high' | 'medium' | 'low' | 'info';

type WordDraft = {
  text: string;
  correct: string;
  distractors: string[];
  category: string;
};

type PhraseDraft = {
  lessonId: number;
  id: string;
  english: string;
  russian: string;
  ukrainian: string;
  words: WordDraft[];
};

type Finding = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  files: string[];
};

type DraftArtifact = {
  schemaVersion: 'gustav-lesson-9-16-canonical-source-draft-v0';
  runId: string;
  status: 'needs_approval';
  generatedAt: string;
  source: {
    kind: 'current_source_graph_runtime_evidence';
    sourceGraph: string;
    runtimePhraseSource: string;
    excludedFields: string[];
  };
  studyTarget: 'en';
  intendedNextStudyTarget: 'fr';
  sourceLocales: ['ru', 'uk'];
  summary: {
    lessons: number;
    phrases: number;
    words: number;
    missingEnglish: number;
    missingRussian: number;
    missingUkrainian: number;
    invalidIds: number;
    duplicateIds: number;
    spanishFieldLeaks: number;
    spanishTokenLeakSuspects: number;
  };
  approval: {
    approvedCanonicalSourceTruth: false;
    requiredBeforeUse: string[];
  };
  phrases: PhraseDraft[];
};

type DraftAudit = {
  schemaVersion: 'gustav-lesson-9-16-canonical-source-draft-audit-v0';
  runId: string;
  status: Status;
  generatedAt: string;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: DraftArtifact['summary'] & {
    runtimeGeneratedOrigins: number;
    structurallyClean: boolean;
    approvalGranted: boolean;
    runtimeGeneratedOriginRiskAccepted: boolean;
    blockers: number;
    highRisks: number;
    canUseAsFrenchSourceTruth: boolean;
  };
  draftPath: string;
  draftTsPath: string;
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

function safeReadJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  return readJson<T>(filePath);
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeIdPattern(lessonId: number, id: string): boolean {
  return new RegExp(`^lesson${lessonId}_phrase_\\d+$`).test(id);
}

function hasSpanishSpecificChars(text: string): boolean {
  return /[¿¡ñáéíóúü]/i.test(text);
}

function extractDraftPhrases(graph: Record<string, unknown>): PhraseDraft[] {
  const phrases = asArray<Record<string, unknown>>(graph.phrases)
    .filter((phrase) => {
      const lessonId = typeof phrase.lessonId === 'number' ? phrase.lessonId : 0;
      return lessonId >= 9 && lessonId <= 16;
    })
    .sort((a, b) => {
      const lessonDelta = Number(a.lessonId) - Number(b.lessonId);
      if (lessonDelta !== 0) return lessonDelta;
      return str(a.id).localeCompare(str(b.id), undefined, { numeric: true });
    });
  const wordsByPhrase = new Map<string, WordDraft[]>();
  for (const word of asArray<Record<string, unknown>>(graph.words)) {
    const lessonId = typeof word.lessonId === 'number' ? word.lessonId : 0;
    if (lessonId < 9 || lessonId > 16) continue;
    const phraseId = str(word.phraseId);
    const words = wordsByPhrase.get(phraseId) ?? [];
    words.push({
      text: str(word.text),
      correct: str(word.correct),
      distractors: asArray<string>(word.distractors).filter((item) => typeof item === 'string'),
      category: str(word.category) || 'unknown',
    });
    wordsByPhrase.set(phraseId, words);
  }

  return phrases.map((phrase) => {
    const prompts = phrase.sourcePrompts && typeof phrase.sourcePrompts === 'object'
      ? phrase.sourcePrompts as Record<string, unknown>
      : {};
    return {
      lessonId: Number(phrase.lessonId),
      id: str(phrase.id),
      english: str(phrase.targetText),
      russian: str(prompts.ru),
      ukrainian: str(prompts.uk),
      words: wordsByPhrase.get(str(phrase.id)) ?? [],
    };
  });
}

function duplicateIdCount(phrases: PhraseDraft[]): number {
  const counts = new Map<string, number>();
  for (const phrase of phrases) counts.set(phrase.id, (counts.get(phrase.id) ?? 0) + 1);
  let duplicates = 0;
  for (const count of counts.values()) {
    if (count > 1) duplicates += count - 1;
  }
  return duplicates;
}

function countRuntimeGeneratedOrigins(graph: Record<string, unknown>): number {
  let count = 0;
  for (const phrase of asArray<Record<string, unknown>>(graph.phrases)) {
    const lessonId = typeof phrase.lessonId === 'number' ? phrase.lessonId : 0;
    if (lessonId < 9 || lessonId > 16) continue;
    const hasRuntimeOrigin = asArray<Record<string, unknown>>(phrase.sourceRefs)
      .some((ref) => ref.provenance === 'runtime_generated');
    if (hasRuntimeOrigin) count += 1;
  }
  return count;
}

function renderDraftTs(draft: DraftArtifact): string {
  const lines = [
    '// GUSTAV REVIEW-ONLY CANONICAL SOURCE DRAFT.',
    '// Generated under docs/gustav run container; do not import in production.',
    '// Contains EN/RU/UK source material only. Spanish runtime fields are intentionally excluded.',
    '',
    'export type GustavLesson916CanonicalPhraseDraft = {',
    '  lessonId: number;',
    '  id: string;',
    '  english: string;',
    '  russian: string;',
    '  ukrainian: string;',
    '  words: Array<{ text: string; correct: string; distractors: string[]; category: string }>;',
    '};',
    '',
  ];
  for (let lessonId = 9; lessonId <= 16; lessonId += 1) {
    const lessonPhrases = draft.phrases.filter((phrase) => phrase.lessonId === lessonId);
    lines.push(`export const LESSON_${lessonId}_PHRASES_DRAFT: GustavLesson916CanonicalPhraseDraft[] = ${JSON.stringify(lessonPhrases, null, 2)};`);
    lines.push('');
  }
  lines.push(`export const LESSON_9_16_PHRASES_DRAFT = [`);
  for (let lessonId = 9; lessonId <= 16; lessonId += 1) {
    lines.push(`  ...LESSON_${lessonId}_PHRASES_DRAFT,`);
  }
  lines.push('];', '');
  return lines.join('\n');
}

function renderDraftMarkdown(draft: DraftArtifact): string {
  const lines = [
    '# GUSTAV Lesson 9-16 Canonical Source Draft',
    '',
    `Run: \`${draft.runId}\``,
    '',
    `Status: \`${draft.status}\``,
    '',
    `Generated at: ${draft.generatedAt}`,
    '',
    'This is a review-only draft. It is not approved canonical source truth.',
    '',
    '## Summary',
    '',
    `- Lessons: ${draft.summary.lessons}`,
    `- Phrases: ${draft.summary.phrases}`,
    `- Words: ${draft.summary.words}`,
    `- Missing English: ${draft.summary.missingEnglish}`,
    `- Missing Russian: ${draft.summary.missingRussian}`,
    `- Missing Ukrainian: ${draft.summary.missingUkrainian}`,
    `- Invalid IDs: ${draft.summary.invalidIds}`,
    `- Duplicate IDs: ${draft.summary.duplicateIds}`,
    `- Spanish field leaks: ${draft.summary.spanishFieldLeaks}`,
    `- Spanish token leak suspects: ${draft.summary.spanishTokenLeakSuspects}`,
    '',
    '## Sample',
    '',
  ];
  for (const phrase of draft.phrases.slice(0, 24)) {
    lines.push(`- \`${phrase.id}\` L${phrase.lessonId}: ${phrase.english} / ${phrase.russian} / ${phrase.ukrainian}`);
  }
  lines.push('', '## Required Before Use', '');
  for (const item of draft.approval.requiredBeforeUse) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}

function renderAuditMarkdown(audit: DraftAudit): string {
  const lines = [
    '# GUSTAV Lesson 9-16 Canonical Source Draft Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Lessons: ${audit.summary.lessons}`,
    `- Phrases: ${audit.summary.phrases}`,
    `- Words: ${audit.summary.words}`,
    `- Runtime-generated origins: ${audit.summary.runtimeGeneratedOrigins}`,
    `- Missing English: ${audit.summary.missingEnglish}`,
    `- Missing Russian: ${audit.summary.missingRussian}`,
    `- Missing Ukrainian: ${audit.summary.missingUkrainian}`,
    `- Invalid IDs: ${audit.summary.invalidIds}`,
    `- Duplicate IDs: ${audit.summary.duplicateIds}`,
    `- Spanish field leaks: ${audit.summary.spanishFieldLeaks}`,
    `- Spanish token leak suspects: ${audit.summary.spanishTokenLeakSuspects}`,
    `- Structurally clean: ${audit.summary.structurallyClean ? 'yes' : 'no'}`,
    `- Approval granted: ${audit.summary.approvalGranted ? 'yes' : 'no'}`,
    `- Runtime-generated origin risk accepted: ${audit.summary.runtimeGeneratedOriginRiskAccepted ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- High risks: ${audit.summary.highRisks}`,
    `- Can use as French source truth: ${audit.summary.canUseAsFrenchSourceTruth ? 'yes' : 'no'}`,
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
    console.error('Usage: npx tsx scripts/gustav_lesson_9_16_canonical_draft_builder.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const sourceGraphPath = path.join(runDir, 'source_graph/source_graph.json');
  const approvalPath = path.join(runDir, 'source_graph/recovery/lesson_9_16_source_truth_approval.json');
  const graph = readJson<Record<string, unknown>>(sourceGraphPath);
  const approval = safeReadJson<Record<string, unknown>>(approvalPath);
  const approvalDecision = approval && approval.decision && typeof approval.decision === 'object'
    ? approval.decision as Record<string, unknown>
    : null;
  const approvalGranted = approval?.schemaVersion === 'gustav-lesson-9-16-source-truth-approval-v0' &&
    approval.status === 'approved' &&
    approvalDecision?.approvedCanonicalSourceTruth === true &&
    approvalDecision?.selectedOption === 'clean_canonical_draft';
  const runtimeGeneratedOriginRiskAccepted = approvalGranted;
  const phrases = extractDraftPhrases(graph);
  const generatedAt = new Date().toISOString();
  const lessons = new Set(phrases.map((phrase) => phrase.lessonId));
  const missingEnglish = phrases.filter((phrase) => !phrase.english).length;
  const missingRussian = phrases.filter((phrase) => !phrase.russian).length;
  const missingUkrainian = phrases.filter((phrase) => !phrase.ukrainian).length;
  const invalidIds = phrases.filter((phrase) => !normalizeIdPattern(phrase.lessonId, phrase.id)).length;
  const duplicateIds = duplicateIdCount(phrases);
  const spanishFieldLeaks = phrases.filter((phrase) => Object.prototype.hasOwnProperty.call(phrase, 'spanish')).length;
  const spanishTokenLeakSuspects = phrases.filter((phrase) => {
    const englishLeak = hasSpanishSpecificChars(phrase.english);
    const wordLeak = phrase.words.some((word) => hasSpanishSpecificChars(word.text) || hasSpanishSpecificChars(word.correct));
    return englishLeak || wordLeak;
  }).length;
  const words = phrases.reduce((sum, phrase) => sum + phrase.words.length, 0);
  const runtimeGeneratedOrigins = countRuntimeGeneratedOrigins(graph);

  const draft: DraftArtifact = {
    schemaVersion: 'gustav-lesson-9-16-canonical-source-draft-v0',
    runId,
    status: 'needs_approval',
    generatedAt,
    source: {
      kind: 'current_source_graph_runtime_evidence',
      sourceGraph: path.relative(repoRoot, sourceGraphPath),
      runtimePhraseSource: 'app/lesson_data_9_16_phrases_es.gen.ts',
      excludedFields: ['spanish', 'words', 'alternativesEs', 'lessonTitleES', 'sourcePrompts.es'],
    },
    studyTarget: 'en',
    intendedNextStudyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    summary: {
      lessons: lessons.size,
      phrases: phrases.length,
      words,
      missingEnglish,
      missingRussian,
      missingUkrainian,
      invalidIds,
      duplicateIds,
      spanishFieldLeaks,
      spanishTokenLeakSuspects,
    },
    approval: {
      approvedCanonicalSourceTruth: false,
      requiredBeforeUse: [
        'Review the draft phrase list against current app behavior and lesson intent.',
        'Approve whether runtime-derived EN/RU/UK data may become canonical source truth.',
        'If approved, generate a production apply plan before touching app files.',
      ],
    },
    phrases,
  };

  const findings: Finding[] = [];
  if (phrases.length !== 400 || lessons.size !== 8) {
    findings.push({
      id: 'L916D-001',
      severity: 'blocker',
      title: 'Draft does not cover all lesson 9-16 phrases',
      detail: `Expected 8 lessons and 400 phrases, found ${lessons.size} lessons and ${phrases.length} phrases.`,
      files: [path.relative(repoRoot, sourceGraphPath)],
    });
  }
  if (missingEnglish || missingRussian || missingUkrainian || invalidIds || duplicateIds) {
    findings.push({
      id: 'L916D-002',
      severity: 'blocker',
      title: 'Draft has structural source gaps',
      detail: `Missing EN/RU/UK: ${missingEnglish}/${missingRussian}/${missingUkrainian}; invalid ids: ${invalidIds}; duplicate ids: ${duplicateIds}.`,
      files: [path.relative(repoRoot, sourceGraphPath)],
    });
  }
  if (spanishFieldLeaks || spanishTokenLeakSuspects) {
    findings.push({
      id: 'L916D-003',
      severity: 'blocker',
      title: 'Draft leaks Spanish runtime fields or tokens',
      detail: `Spanish field leaks: ${spanishFieldLeaks}; Spanish token leak suspects: ${spanishTokenLeakSuspects}.`,
      files: [path.relative(repoRoot, sourceGraphPath)],
    });
  }
  if (runtimeGeneratedOrigins > 0 && !runtimeGeneratedOriginRiskAccepted) {
    findings.push({
      id: 'L916D-004',
      severity: 'high',
      title: 'Draft source originates from generated runtime evidence',
      detail: `${runtimeGeneratedOrigins} draft phrases originate from runtime_generated source graph refs. The draft is cleanly stripped, but still needs explicit source-truth approval.`,
      files: ['app/lesson_data_9_16_phrases_es.gen.ts', path.relative(repoRoot, sourceGraphPath)],
    });
  } else if (runtimeGeneratedOrigins > 0) {
    findings.push({
      id: 'L916D-004',
      severity: 'info',
      title: 'Runtime-generated origin risk is accepted by source-truth approval',
      detail: `${runtimeGeneratedOrigins} draft phrases originate from runtime_generated source graph refs, but the approved source-truth artifact accepts this risk for the clean EN/RU/UK draft.`,
      files: ['app/lesson_data_9_16_phrases_es.gen.ts', path.relative(repoRoot, approvalPath)],
    });
  }
  if (!approvalGranted) {
    findings.push({
      id: 'L916D-005',
      severity: 'blocker',
      title: 'Canonical source approval is missing',
      detail: 'This draft is a review package only. Gustav must not use it for French generation until approvedCanonicalSourceTruth is true in an explicit approval artifact.',
      files: ['docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/recovery/lesson_9_16_canonical_source_draft.json'],
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const highRisks = findings.filter((finding) => finding.severity === 'high').length;
  const structurallyClean = phrases.length === 400 &&
    lessons.size === 8 &&
    missingEnglish === 0 &&
    missingRussian === 0 &&
    missingUkrainian === 0 &&
    invalidIds === 0 &&
    duplicateIds === 0 &&
    spanishFieldLeaks === 0 &&
    spanishTokenLeakSuspects === 0;

  const recoveryDir = path.join(runDir, 'source_graph', 'recovery');
  ensureDir(recoveryDir);
  const draftJsonPath = path.join(recoveryDir, 'lesson_9_16_canonical_source_draft.json');
  const draftTsPath = path.join(recoveryDir, 'lesson_9_16_canonical_source_draft.ts');
  const draftMdPath = path.join(recoveryDir, 'lesson_9_16_canonical_source_draft.md');
  fs.writeFileSync(draftJsonPath, `${JSON.stringify(draft, null, 2)}\n`);
  fs.writeFileSync(draftTsPath, renderDraftTs(draft));
  fs.writeFileSync(draftMdPath, renderDraftMarkdown(draft));

  const audit: DraftAudit = {
    schemaVersion: 'gustav-lesson-9-16-canonical-source-draft-audit-v0',
    runId,
    status: blockers > 0 ? 'HOLD' : highRisks > 0 ? 'HOLD' : 'PASS',
    generatedAt,
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      ...draft.summary,
      runtimeGeneratedOrigins,
      structurallyClean,
      approvalGranted,
      runtimeGeneratedOriginRiskAccepted,
      blockers,
      highRisks,
      canUseAsFrenchSourceTruth: structurallyClean && approvalGranted && blockers === 0 && highRisks === 0,
    },
    draftPath: path.relative(repoRoot, draftJsonPath),
    draftTsPath: path.relative(repoRoot, draftTsPath),
    findings,
    requiredBeforeFrenchGeneration: [
      'Review and approve the canonical source draft or reject it in favor of another source-truth strategy.',
      'If approved, create a production apply plan that extracts a non-generated source file for lessons 9-16.',
      'Rerun source graph, source graph quality, generated source-truth, reconciliation, canonical draft, validator and readiness gates.',
    ],
    notes: [
      'The draft intentionally omits Spanish runtime fields and keeps only EN/RU/UK source material plus English word tokens.',
      'The draft does not modify app files.',
      'Structurally clean does not mean approved source truth.',
    ],
  };

  const auditsDir = path.join(runDir, 'audits');
  ensureDir(auditsDir);
  const auditJsonPath = path.join(auditsDir, 'lesson_9_16_canonical_source_draft_audit.json');
  const auditMdPath = path.join(auditsDir, 'lesson_9_16_canonical_source_draft_audit.md');
  fs.writeFileSync(auditJsonPath, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(auditMdPath, renderAuditMarkdown(audit));

  console.log(`GUSTAV lesson 9-16 canonical draft audit: ${audit.status}`);
  console.log(`Draft phrases: ${audit.summary.phrases}`);
  console.log(`Structurally clean: ${audit.summary.structurallyClean ? 'yes' : 'no'}`);
  console.log(`Blockers: ${audit.summary.blockers}`);
  console.log(`High risks: ${audit.summary.highRisks}`);
  console.log(`Draft: ${path.relative(repoRoot, draftJsonPath)}`);
  console.log(`Report: ${path.relative(repoRoot, auditJsonPath)}`);
}

void main();
