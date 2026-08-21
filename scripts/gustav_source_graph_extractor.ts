import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'high' | 'medium' | 'low';

type SourceRef = {
  file: string;
  line: number;
  exportName?: string;
  provenance: 'canonical' | 'runtime_generated' | 'runtime' | 'derived' | 'audit';
};

type LessonNode = {
  id: string;
  lessonId: number;
  titles: Record<string, string>;
  phraseIds: string[];
  introScreenIds: string[];
  quizIds: string[];
  prepositionPackIds: string[];
  wordIds: string[];
  sourceRefs: SourceRef[];
};

type PhraseNode = {
  id: string;
  lessonId: number;
  targetText: string;
  sourcePrompts: Record<string, string>;
  alternatives: string[];
  wordIds: string[];
  sourceRefs: SourceRef[];
  qualityFlags: string[];
};

type WordNode = {
  id: string;
  lessonId: number;
  phraseId: string;
  order: number;
  text: string;
  correct: string;
  distractors: string[];
  category: string;
  sourceRefs: SourceRef[];
};

type IntroNode = {
  id: string;
  lessonId: number;
  order: number;
  kind: string;
  titles: Record<string, string>;
  texts: Record<string, string>;
  sourceRefs: SourceRef[];
  extractionMode: 'object_literal' | 'bundle_call' | 'synthetic';
};

type QuizNode = {
  id: string;
  pool: string;
  order: number;
  lessonNum: number;
  level: string;
  sourcePrompts: Record<string, string>;
  choices: string[];
  answer: string;
  correct: unknown;
  sourceRefs: SourceRef[];
};

type PrepositionPackNode = {
  id: string;
  lessonId: number;
  prepositions: string[];
  derivedFromPhraseIds: string[];
  sourceRefs: SourceRef[];
};

type FlashcardNode = {
  id: string;
  targetText: string;
  sourcePrompts: Record<string, string>;
  categoryId: string;
  sourceRefs: SourceRef[];
};

type DailyPhraseNode = {
  id: string;
  targetText: string;
  sourcePrompts: Record<string, string>;
  sourceRefs: SourceRef[];
};

type PersonalPracticeNode = {
  id: string;
  exportName: string;
  sourceFile: string;
  sourceRefs: SourceRef[];
};

type SurfaceNode = {
  id: string;
  path: string;
  kind: string;
  domain: string;
  risk: string;
  targetSensitive: boolean;
  sourceRefs: SourceRef[];
};

type UnresolvedItem = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  sourceRefs: SourceRef[];
};

type ValidationSummary = {
  verdict: Status;
  totalLessons: number;
  totalPhrases: number;
  totalWords: number;
  totalIntroScreens: number;
  totalQuizzes: number;
  totalPrepositionPacks: number;
  totalFlashcards: number;
  totalDailyPhrases: number;
  totalPersonalPracticeNodes: number;
  totalSurfaces: number;
  unresolvedBlockers: number;
  unresolvedHighRisks: number;
  generatedFileUnknowns: number;
  sourceLocaleTargetConfusions: number;
  notes: string[];
};

type SourceGraph = {
  schemaVersion: 'gustav-source-graph-v0';
  runId: string;
  graphId: string;
  status: Status;
  generatedAt: string;
  repoRoot: string;
  inputRef: Record<string, unknown>;
  baseStudyTarget: 'en';
  requestedStudyTarget: string;
  supportedSourceLocalesObserved: string[];
  studyTargetsObserved: string[];
  sourceFiles: Array<{
    file: string;
    provenance: SourceRef['provenance'];
    purpose: string;
    generated: boolean;
    exists: boolean;
  }>;
  generatedFiles: Array<{
    file: string;
    purpose: string;
    risk: string;
  }>;
  lessons: LessonNode[];
  introScreens: IntroNode[];
  phrases: PhraseNode[];
  words: WordNode[];
  quizzes: QuizNode[];
  prepositionPacks: PrepositionPackNode[];
  flashcards: FlashcardNode[];
  dailyPhrases: DailyPhraseNode[];
  personalPractice: PersonalPracticeNode[];
  surfaces: SurfaceNode[];
  unresolved: UnresolvedItem[];
  validation: ValidationSummary;
};

type SourceFileMeta = {
  file: string;
  provenance: SourceRef['provenance'];
  purpose: string;
};

type ApprovedPhraseDraft = {
  lessonId: number;
  id: string;
  english: string;
  russian: string;
  ukrainian: string;
  words: Array<{
    text: string;
    correct: string;
    distractors: string[];
    category?: string;
  }>;
};

const SOURCE_FILE_PLAN: SourceFileMeta[] = [
  { file: 'constants/lessons.ts', provenance: 'canonical', purpose: 'Lesson titles by source locale.' },
  { file: 'app/lesson_data_1_8_phrases_source.ts', provenance: 'canonical', purpose: 'Canonical English phrase base for lessons 1-8.' },
  { file: 'app/lesson_data_9_16_phrases_es.gen.ts', provenance: 'runtime_generated', purpose: 'Runtime phrase base for lessons 9-16; used only when no approved clean canonical draft exists.' },
  { file: 'app/lesson_data_17_24.ts', provenance: 'runtime', purpose: 'Runtime phrase base for lessons 17-24.' },
  { file: 'app/lesson_data_25_32.ts', provenance: 'runtime', purpose: 'Runtime phrase base for lessons 25-32.' },
  { file: 'app/lesson_intro_screens_lesson1_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 1.' },
  { file: 'app/lesson_intro_screens_lesson2_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 2.' },
  { file: 'app/lesson_intro_screens_lesson3_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 3.' },
  { file: 'app/lesson_intro_screens_lesson4_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 4.' },
  { file: 'app/lesson_intro_screens_lesson5_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 5.' },
  { file: 'app/lesson_intro_screens_lesson6_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 6.' },
  { file: 'app/lesson_intro_screens_lesson7_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 7.' },
  { file: 'app/lesson_intro_screens_lesson8_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 8.' },
  { file: 'app/lesson_intro_screens_lesson9_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 9.' },
  { file: 'app/lesson_intro_screens_lesson10_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 10.' },
  { file: 'app/lesson_intro_screens_lesson11_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 11.' },
  { file: 'app/lesson_intro_screens_lesson12_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 12.' },
  { file: 'app/lesson_intro_screens_lesson13_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 13.' },
  { file: 'app/lesson_intro_screens_lesson14_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 14.' },
  { file: 'app/lesson_intro_screens_lesson15_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 15.' },
  { file: 'app/lesson_intro_screens_lesson16_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 16.' },
  { file: 'app/lesson_intro_screens_lesson17_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 17.' },
  { file: 'app/lesson_intro_screens_lesson18_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 18.' },
  { file: 'app/lesson_intro_screens_lesson19_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 19.' },
  { file: 'app/lesson_intro_screens_lesson20_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 20.' },
  { file: 'app/lesson_intro_screens_lesson21_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 21.' },
  { file: 'app/lesson_intro_screens_lesson22_v2.ts', provenance: 'canonical', purpose: 'Intro screens for lesson 22.' },
  { file: 'app/lesson_intro_screens_en_17_32.ts', provenance: 'runtime', purpose: 'Bundle-call intro definitions used for lessons 23-32.' },
  { file: 'app/quiz_data.ts', provenance: 'runtime', purpose: 'Quiz pool source.' },
  { file: 'app/flashcards/system-cards.ts', provenance: 'runtime', purpose: 'System flashcards.' },
  { file: 'app/idioms_data.ts', provenance: 'runtime', purpose: 'Daily phrase idioms.' },
  { file: 'app/diagnosis_trainings.ts', provenance: 'runtime', purpose: 'Personal practice diagnosis registry.' },
  { file: 'app/lesson_prepositions.ts', provenance: 'derived', purpose: 'Preposition pack runtime builder; graph derives pack seeds from phrase tokens.' },
  { file: 'app/source_locales.ts', provenance: 'runtime', purpose: 'Observed source locale contract.' },
];

const GENERATED_FILE_PATTERNS = [
  'app/lesson_data_1_8_phrases_es.gen.ts',
  'app/lesson_data_9_16_phrases_es.gen.ts',
  'app/lesson_intro_screens_es_l2.ts',
  'app/quiz_data_es_l2.ts',
  'app/lesson_prepositions_es_segment01.ts',
  'app/lesson_prepositions_es_segment02.ts',
  'app/lesson_prepositions_es_segment03.ts',
];

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

function readTs(repoRoot: string, relativeFile: string): ts.SourceFile | null {
  const absolute = path.join(repoRoot, relativeFile);
  if (!fs.existsSync(absolute)) return null;
  const source = fs.readFileSync(absolute, 'utf8');
  return ts.createSourceFile(relativeFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function sourceRef(sourceFile: ts.SourceFile, node: ts.Node, provenance: SourceRef['provenance'], exportName?: string): SourceRef {
  return {
    file: sourceFile.fileName,
    line: lineOf(sourceFile, node),
    exportName,
    provenance,
  };
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function propName(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return null;
}

function objectProp(node: ts.ObjectLiteralExpression, name: string): ts.Expression | null {
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const key = propName(property.name);
    if (key === name) return property.initializer;
  }
  return null;
}

function stringValue(expr: ts.Expression | null | undefined): string | null {
  if (!expr) return null;
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text;
  if (ts.isTemplateExpression(expr)) {
    const parts = [expr.head.text, ...expr.templateSpans.map((span) => span.literal.text)];
    return normalizeText(parts.join('${...}'));
  }
  if (ts.isIdentifier(expr)) return expr.text;
  if (expr.kind === ts.SyntaxKind.TrueKeyword) return 'true';
  if (expr.kind === ts.SyntaxKind.FalseKeyword) return 'false';
  return null;
}

function numberValue(expr: ts.Expression | null | undefined): number | null {
  if (!expr) return null;
  if (ts.isNumericLiteral(expr)) return Number(expr.text);
  const stringy = stringValue(expr);
  if (stringy && /^\d+$/.test(stringy)) return Number(stringy);
  return null;
}

function arrayExpression(expr: ts.Expression | null | undefined): ts.ArrayLiteralExpression | null {
  if (!expr) return null;
  if (ts.isArrayLiteralExpression(expr)) return expr;
  if (ts.isParenthesizedExpression(expr)) return arrayExpression(expr.expression);
  if (ts.isAsExpression(expr)) return arrayExpression(expr.expression);
  if (
    ts.isCallExpression(expr) &&
    ts.isPropertyAccessExpression(expr.expression) &&
    expr.expression.name.text === 'filter'
  ) {
    return arrayExpression(expr.expression.expression);
  }
  return null;
}

function objectExpression(expr: ts.Expression | null | undefined): ts.ObjectLiteralExpression | null {
  if (!expr) return null;
  if (ts.isObjectLiteralExpression(expr)) return expr;
  if (ts.isParenthesizedExpression(expr)) return objectExpression(expr.expression);
  if (ts.isAsExpression(expr)) return objectExpression(expr.expression);
  return null;
}

function stringArray(expr: ts.Expression | null | undefined): string[] {
  const arr = arrayExpression(expr);
  if (!arr) return [];
  return arr.elements.map((element) => stringValue(element as ts.Expression)).filter((value): value is string => Boolean(value));
}

function objectArray(expr: ts.Expression | null | undefined): ts.ObjectLiteralExpression[] {
  const arr = arrayExpression(expr);
  if (!arr) return [];
  return arr.elements
    .map((element) => objectExpression(element as ts.Expression))
    .filter((value): value is ts.ObjectLiteralExpression => Boolean(value));
}

function expressionToJson(expr: ts.Expression | null | undefined): unknown {
  if (!expr) return null;
  const stringy = stringValue(expr);
  if (stringy !== null && stringy !== 'true' && stringy !== 'false') return stringy;
  if (expr.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expr.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isNumericLiteral(expr)) return Number(expr.text);
  const arr = arrayExpression(expr);
  if (arr) return arr.elements.map((element) => expressionToJson(element as ts.Expression));
  const obj = objectExpression(expr);
  if (obj) {
    const record: Record<string, unknown> = {};
    for (const property of obj.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const key = propName(property.name);
      if (key) record[key] = expressionToJson(property.initializer);
    }
    return record;
  }
  return null;
}

function exportedArrayDecls(sourceFile: ts.SourceFile, pattern: RegExp): Array<{ name: string; array: ts.ArrayLiteralExpression; node: ts.Node }> {
  const out: Array<{ name: string; array: ts.ArrayLiteralExpression; node: ts.Node }> = [];
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && pattern.test(node.name.text)) {
      const arr = arrayExpression(node.initializer);
      if (arr) out.push({ name: node.name.text, array: arr, node });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return out;
}

function allArrayDecls(sourceFile: ts.SourceFile, pattern: RegExp): Array<{ name: string; array: ts.ArrayLiteralExpression; node: ts.Node }> {
  const out: Array<{ name: string; array: ts.ArrayLiteralExpression; node: ts.Node }> = [];
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && pattern.test(node.name.text)) {
      const arr = arrayExpression(node.initializer);
      if (arr) out.push({ name: node.name.text, array: arr, node });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return out;
}

function parseLessonTitles(repoRoot: string): Record<number, Record<string, string>> {
  const titles: Record<number, Record<string, string>> = {};
  const source = readTs(repoRoot, 'constants/lessons.ts');
  if (!source) return titles;
  const localeByExport: Record<string, string> = {
    LESSON_NAMES_RU: 'ru',
    LESSON_NAMES_UK: 'uk',
    LESSON_NAMES_ES: 'es',
  };
  for (const decl of exportedArrayDecls(source, /^LESSON_NAMES_(RU|UK|ES)$/)) {
    const locale = localeByExport[decl.name];
    decl.array.elements.forEach((element, index) => {
      const value = stringValue(element as ts.Expression);
      if (!value) return;
      const lessonId = index + 1;
      titles[lessonId] = titles[lessonId] ?? {};
      titles[lessonId][locale] = value;
    });
  }
  return titles;
}

function parseWords(source: ts.SourceFile, phraseId: string, lessonId: number, phraseNode: ts.ObjectLiteralExpression, provenance: SourceRef['provenance'], exportName: string): WordNode[] {
  const wordObjects = objectArray(objectProp(phraseNode, 'wordsEn')).length > 0
    ? objectArray(objectProp(phraseNode, 'wordsEn'))
    : objectArray(objectProp(phraseNode, 'words'));
  return wordObjects.map((word, index) => {
    const text = stringValue(objectProp(word, 'text')) ?? '';
    const correct = stringValue(objectProp(word, 'correct')) ?? text;
    const category = stringValue(objectProp(word, 'category')) ?? 'unknown';
    return {
      id: `${phraseId}:word:${index + 1}`,
      lessonId,
      phraseId,
      order: index + 1,
      text,
      correct,
      distractors: stringArray(objectProp(word, 'distractors')),
      category,
      sourceRefs: [sourceRef(source, word, provenance, exportName)],
    };
  });
}

function hasApprovedLesson916Draft(runDir: string): boolean {
  const approvalPath = path.join(runDir, 'source_graph', 'recovery', 'lesson_9_16_source_truth_approval.json');
  const approval = safeReadJson<Record<string, unknown>>(approvalPath);
  const decision = approval && approval.decision && typeof approval.decision === 'object'
    ? approval.decision as Record<string, unknown>
    : null;
  return approval?.schemaVersion === 'gustav-lesson-9-16-source-truth-approval-v0' &&
    approval.status === 'approved' &&
    decision?.approvedCanonicalSourceTruth === true &&
    decision?.selectedOption === 'clean_canonical_draft';
}

function hasGeneratedSupportIsolationApproval(runDir: string): boolean {
  const auditPath = path.join(runDir, 'audits', 'generated_support_isolation_audit.json');
  const audit = safeReadJson<Record<string, unknown>>(auditPath);
  const summary = audit && audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  return audit?.schemaVersion === 'gustav-generated-support-isolation-audit-v0' &&
    audit.status === 'PASS' &&
    summary?.canExcludeFromFrenchSourceTruth === true &&
    summary?.blockers === 0 &&
    summary?.highRisks === 0;
}

function hasSourceGraphApproval(runDir: string): boolean {
  const auditPath = path.join(runDir, 'source_graph', 'source_graph_approval.json');
  const audit = safeReadJson<Record<string, unknown>>(auditPath);
  const summary = audit && audit.summary && typeof audit.summary === 'object'
    ? audit.summary as Record<string, unknown>
    : null;
  const approval = audit && audit.approval && typeof audit.approval === 'object'
    ? audit.approval as Record<string, unknown>
    : null;
  return audit?.schemaVersion === 'gustav-source-graph-approval-audit-v0' &&
    audit.status === 'PASS' &&
    summary?.canApproveSourceGraphForFrenchGenerationInput === true &&
    summary?.mayStartFrenchGeneration === false &&
    summary?.mayModifyProductionAppFiles === false &&
    approval?.approved === true &&
    approval?.scope === 'source_graph_input_only';
}

function appendApprovedLesson916Draft(runDir: string, phrases: PhraseNode[], words: WordNode[], filesRead: Set<string>): void {
  const draftRelativePath = path.join('docs/gustav/runs', path.basename(runDir), 'source_graph/recovery/lesson_9_16_canonical_source_draft.json');
  const draftPath = path.join(runDir, 'source_graph', 'recovery', 'lesson_9_16_canonical_source_draft.json');
  const draft = safeReadJson<Record<string, unknown>>(draftPath);
  if (!draft || !Array.isArray(draft.phrases)) return;
  filesRead.add(draftRelativePath);
  for (const phrase of draft.phrases as ApprovedPhraseDraft[]) {
    if (phrase.lessonId < 9 || phrase.lessonId > 16) continue;
    const sourceRefs: SourceRef[] = [{
      file: draftRelativePath,
      line: 1,
      exportName: `LESSON_${phrase.lessonId}_PHRASES_DRAFT`,
      provenance: 'canonical',
    }];
    const wordNodes: WordNode[] = (Array.isArray(phrase.words) ? phrase.words : []).map((word, index) => ({
      id: `${phrase.id}:word:${index + 1}`,
      lessonId: phrase.lessonId,
      phraseId: phrase.id,
      order: index + 1,
      text: word.text,
      correct: word.correct || word.text,
      distractors: Array.isArray(word.distractors) ? word.distractors : [],
      category: word.category || 'unknown',
      sourceRefs,
    }));
    words.push(...wordNodes);
    const qualityFlags: string[] = ['approved_clean_canonical_draft'];
    if (wordNodes.length === 0) qualityFlags.push('missing_word_tokens');
    if (!phrase.russian) qualityFlags.push('missing_ru_prompt');
    if (!phrase.ukrainian) qualityFlags.push('missing_uk_prompt');
    phrases.push({
      id: phrase.id,
      lessonId: phrase.lessonId,
      targetText: phrase.english,
      sourcePrompts: {
        ru: phrase.russian,
        uk: phrase.ukrainian,
      },
      alternatives: [],
      wordIds: wordNodes.map((word) => word.id),
      sourceRefs,
      qualityFlags,
    });
  }
}

function parsePhrases(repoRoot: string, runDir: string): { phrases: PhraseNode[]; words: WordNode[]; filesRead: Set<string> } {
  const useApprovedLesson916Draft = hasApprovedLesson916Draft(runDir);
  const phraseFiles: SourceFileMeta[] = [
    { file: 'app/lesson_data_1_8_phrases_source.ts', provenance: 'canonical', purpose: '' },
    ...(useApprovedLesson916Draft ? [] : [{ file: 'app/lesson_data_9_16_phrases_es.gen.ts', provenance: 'runtime_generated' as const, purpose: '' }]),
    { file: 'app/lesson_data_17_24.ts', provenance: 'runtime', purpose: '' },
    { file: 'app/lesson_data_25_32.ts', provenance: 'runtime', purpose: '' },
  ];
  const phrases: PhraseNode[] = [];
  const words: WordNode[] = [];
  const filesRead = new Set<string>();

  for (const meta of phraseFiles) {
    const source = readTs(repoRoot, meta.file);
    if (!source) continue;
    filesRead.add(meta.file);
    for (const decl of exportedArrayDecls(source, /^LESSON_\d+_PHRASES$/)) {
      const lessonId = Number(decl.name.match(/^LESSON_(\d+)_PHRASES$/)?.[1] ?? 0);
      for (const item of decl.array.elements) {
        const obj = objectExpression(item as ts.Expression);
        if (!obj || !lessonId) continue;
        const rawId = stringValue(objectProp(obj, 'id')) ?? `lesson${lessonId}_phrase_${phrases.length + 1}`;
        const id = String(rawId);
        const wordNodes = parseWords(source, id, lessonId, obj, meta.provenance, decl.name);
        words.push(...wordNodes);
        const qualityFlags: string[] = [];
        if (meta.provenance === 'runtime_generated') qualityFlags.push('generated_runtime_phrase_file');
        if (wordNodes.length === 0) qualityFlags.push('missing_word_tokens');
        if (!stringValue(objectProp(obj, 'russian'))) qualityFlags.push('missing_ru_prompt');
        if (!stringValue(objectProp(obj, 'ukrainian'))) qualityFlags.push('missing_uk_prompt');
        phrases.push({
          id,
          lessonId,
          targetText: stringValue(objectProp(obj, 'english')) ?? '',
          sourcePrompts: {
            ru: stringValue(objectProp(obj, 'russian')) ?? '',
            uk: stringValue(objectProp(obj, 'ukrainian')) ?? '',
            es: stringValue(objectProp(obj, 'spanish')) ?? '',
          },
          alternatives: [
            ...stringArray(objectProp(obj, 'alternatives')),
            ...stringArray(objectProp(obj, 'alternativesEs')).map((value) => `es:${value}`),
          ],
          wordIds: wordNodes.map((word) => word.id),
          sourceRefs: [sourceRef(source, obj, meta.provenance, decl.name)],
          qualityFlags,
        });
      }
    }
  }
  if (useApprovedLesson916Draft) {
    appendApprovedLesson916Draft(runDir, phrases, words, filesRead);
  }
  return { phrases, words, filesRead };
}

function parseIntroObject(source: ts.SourceFile, obj: ts.ObjectLiteralExpression, lessonIdFallback: number, orderFallback: number, provenance: SourceRef['provenance'], exportName: string, extractionMode: IntroNode['extractionMode']): IntroNode {
  const lessonId = numberValue(objectProp(obj, 'lessonId')) ?? lessonIdFallback;
  const order = numberValue(objectProp(obj, 'order')) ?? orderFallback;
  const screenId = stringValue(objectProp(obj, 'screenId')) ?? `lesson_${lessonId}_intro_${order}_${extractionMode}`;
  return {
    id: screenId,
    lessonId,
    order,
    kind: stringValue(objectProp(obj, 'kind')) ?? 'unknown',
    titles: {
      ru: stringValue(objectProp(obj, 'titleRU')) ?? '',
      uk: stringValue(objectProp(obj, 'titleUK')) ?? '',
      es: stringValue(objectProp(obj, 'titleES')) ?? '',
    },
    texts: {
      ru: stringValue(objectProp(obj, 'textRU')) ?? '',
      uk: stringValue(objectProp(obj, 'textUK')) ?? '',
      es: stringValue(objectProp(obj, 'textES')) ?? '',
    },
    sourceRefs: [sourceRef(source, obj, provenance, exportName)],
    extractionMode,
  };
}

function parseBundleIntro(source: ts.SourceFile, name: string, call: ts.CallExpression, provenance: SourceRef['provenance']): IntroNode[] {
  const lessonId = Number(name.match(/^LESSON_(\d+)_INTRO_EXTRA$/)?.[1] ?? 0);
  if (!lessonId) return [];
  const nodes: IntroNode[] = [];
  const kinds = ['why', 'how', 'trap'];
  call.arguments.slice(0, 3).forEach((arg, index) => {
    const obj = objectExpression(arg as ts.Expression);
    if (!obj) return;
    nodes.push(parseIntroObject(source, obj, lessonId, index + 1, provenance, name, 'bundle_call'));
    nodes[nodes.length - 1].id = `lesson_${lessonId}_intro_${index + 1}_${kinds[index]}`;
    nodes[nodes.length - 1].kind = nodes[nodes.length - 1].kind === 'unknown' ? kinds[index] : nodes[nodes.length - 1].kind;
  });
  nodes.push({
    id: `lesson_${lessonId}_intro_4_mechanic`,
    lessonId,
    order: 4,
    kind: 'mechanic',
    titles: { ru: 'HOW_APP_WORKS', uk: 'HOW_APP_WORKS', es: 'HOW_APP_WORKS' },
    texts: { ru: '', uk: '', es: '' },
    sourceRefs: [sourceRef(source, call, provenance, name)],
    extractionMode: 'synthetic',
  });
  return nodes;
}

function parseIntros(repoRoot: string): { introScreens: IntroNode[]; filesRead: Set<string> } {
  const introFiles = SOURCE_FILE_PLAN
    .filter((item) => item.file.includes('lesson_intro_screens_lesson') || item.file === 'app/lesson_intro_screens_en_17_32.ts')
    .map((item) => item.file);
  const introScreens: IntroNode[] = [];
  const filesRead = new Set<string>();
  const seen = new Set<string>();

  for (const file of introFiles) {
    const meta = SOURCE_FILE_PLAN.find((item) => item.file === file);
    const source = readTs(repoRoot, file);
    if (!source || !meta) continue;
    filesRead.add(file);
    for (const decl of exportedArrayDecls(source, /^LESSON_\d+_INTRO_(SCREENS|EXTRA)$/)) {
      const lessonId = Number(decl.name.match(/^LESSON_(\d+)_INTRO_(SCREENS|EXTRA)$/)?.[1] ?? 0);
      objectArray(decl.array).forEach((obj, index) => {
        const node = parseIntroObject(source, obj, lessonId, index + 1, meta.provenance, decl.name, 'object_literal');
        const dedupeId = `${node.lessonId}:${node.id}`;
        if (seen.has(dedupeId)) return;
        seen.add(dedupeId);
        introScreens.push(node);
      });
    }

    const visit = (node: ts.Node): void => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        /^LESSON_\d+_INTRO_EXTRA$/.test(node.name.text) &&
        node.initializer &&
        ts.isCallExpression(node.initializer)
      ) {
        for (const intro of parseBundleIntro(source, node.name.text, node.initializer, meta.provenance)) {
          const dedupeId = `${intro.lessonId}:${intro.id}`;
          if (seen.has(dedupeId)) continue;
          seen.add(dedupeId);
          introScreens.push(intro);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return { introScreens, filesRead };
}

function parseQuizzes(repoRoot: string): { quizzes: QuizNode[]; filesRead: Set<string> } {
  const file = 'app/quiz_data.ts';
  const source = readTs(repoRoot, file);
  const quizzes: QuizNode[] = [];
  const filesRead = new Set<string>();
  if (!source) return { quizzes, filesRead };
  filesRead.add(file);
  for (const decl of allArrayDecls(source, /^(EASY|MEDIUM|HARD)_POOL$/)) {
    objectArray(decl.array).forEach((obj, index) => {
      quizzes.push({
        id: `quiz:${decl.name}:${index + 1}`,
        pool: decl.name,
        order: index + 1,
        lessonNum: numberValue(objectProp(obj, 'lessonNum')) ?? -1,
        level: stringValue(objectProp(obj, 'level')) ?? '',
        sourcePrompts: {
          ru: stringValue(objectProp(obj, 'ru')) ?? '',
          uk: stringValue(objectProp(obj, 'uk')) ?? '',
          es: stringValue(objectProp(obj, 'es')) ?? '',
        },
        choices: stringArray(objectProp(obj, 'choices')),
        answer: stringValue(objectProp(obj, 'answer')) ?? '',
        correct: expressionToJson(objectProp(obj, 'correct')),
        sourceRefs: [sourceRef(source, obj, 'runtime', decl.name)],
      });
    });
  }
  return { quizzes, filesRead };
}

function parseFlashcards(repoRoot: string): { flashcards: FlashcardNode[]; filesRead: Set<string> } {
  const file = 'app/flashcards/system-cards.ts';
  const source = readTs(repoRoot, file);
  const flashcards: FlashcardNode[] = [];
  const filesRead = new Set<string>();
  if (!source) return { flashcards, filesRead };
  filesRead.add(file);
  for (const decl of allArrayDecls(source, /^SYSTEM_CARDS_SOURCE$/)) {
    objectArray(decl.array).forEach((obj, index) => {
      const id = stringValue(objectProp(obj, 'id')) ?? `system-card-${index + 1}`;
      flashcards.push({
        id,
        targetText: stringValue(objectProp(obj, 'en')) ?? '',
        sourcePrompts: {
          ru: stringValue(objectProp(obj, 'ru')) ?? '',
          uk: stringValue(objectProp(obj, 'uk')) ?? '',
        },
        categoryId: stringValue(objectProp(obj, 'categoryId')) ?? '',
        sourceRefs: [sourceRef(source, obj, 'runtime', decl.name)],
      });
    });
  }
  return { flashcards, filesRead };
}

function parseDailyPhrases(repoRoot: string): { dailyPhrases: DailyPhraseNode[]; filesRead: Set<string> } {
  const file = 'app/idioms_data.ts';
  const source = readTs(repoRoot, file);
  const dailyPhrases: DailyPhraseNode[] = [];
  const filesRead = new Set<string>();
  if (!source) return { dailyPhrases, filesRead };
  filesRead.add(file);
  for (const decl of exportedArrayDecls(source, /^IDIOMS$/)) {
    objectArray(decl.array).forEach((obj, index) => {
      const numericId = numberValue(objectProp(obj, 'id'));
      const id = numericId !== null ? `idiom:${numericId}` : `idiom:${index + 1}`;
      dailyPhrases.push({
        id,
        targetText: stringValue(objectProp(obj, 'english')) ?? '',
        sourcePrompts: {
          ru: stringValue(objectProp(obj, 'meaning')) ?? '',
          uk: stringValue(objectProp(obj, 'meaning_uk')) ?? '',
          es: stringValue(objectProp(obj, 'meaning_es')) ?? '',
        },
        sourceRefs: [sourceRef(source, obj, 'runtime', decl.name)],
      });
    });
  }
  return { dailyPhrases, filesRead };
}

function parsePersonalPractice(repoRoot: string): { personalPractice: PersonalPracticeNode[]; filesRead: Set<string> } {
  const file = 'app/diagnosis_trainings.ts';
  const source = readTs(repoRoot, file);
  const personalPractice: PersonalPracticeNode[] = [];
  const filesRead = new Set<string>();
  if (!source) return { personalPractice, filesRead };
  filesRead.add(file);

  const importMap = new Map<string, string>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const moduleText = ts.isStringLiteral(statement.moduleSpecifier) ? statement.moduleSpecifier.text : '';
    const namedBindings = statement.importClause?.namedBindings;
    if (!moduleText || !namedBindings || !ts.isNamedImports(namedBindings)) continue;
    for (const element of namedBindings.elements) {
      importMap.set(element.name.text, `app/${moduleText.replace(/^\.\//, '')}.ts`);
    }
  }

  const idToExport = new Map<string, { exportName: string; node: ts.Node }>();
  const visit = (node: ts.Node): void => {
    if (ts.isIfStatement(node)) {
      const text = node.expression.getText(source);
      const match = text.match(/^id === ['"]([^'"]+)['"]$/);
      if (match) {
        const returnMatch = node.thenStatement.getText(source).match(/return\s+([A-Z0-9_]+)_TRAINING|return\s+([A-Z0-9_]+)/);
        const exportName = returnMatch?.[1] ?? returnMatch?.[2] ?? '';
        if (exportName) idToExport.set(match[1], { exportName, node });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  for (const [id, info] of [...idToExport.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    personalPractice.push({
      id,
      exportName: info.exportName.endsWith('_TRAINING') ? info.exportName : `${info.exportName}_TRAINING`,
      sourceFile: importMap.get(info.exportName.endsWith('_TRAINING') ? info.exportName : `${info.exportName}_TRAINING`) ?? file,
      sourceRefs: [sourceRef(source, info.node, 'runtime', 'getDiagnosisTraining')],
    });
  }
  return { personalPractice, filesRead };
}

function derivePrepositionPacks(words: WordNode[]): PrepositionPackNode[] {
  const byLesson = new Map<number, { preps: Set<string>; phraseIds: Set<string> }>();
  for (const word of words) {
    const category = word.category.toLowerCase();
    const token = word.correct || word.text;
    if (!category.includes('preposition') && !category.includes('prep')) continue;
    if (!token || /^[.,!?;:]$/.test(token)) continue;
    const entry = byLesson.get(word.lessonId) ?? { preps: new Set<string>(), phraseIds: new Set<string>() };
    entry.preps.add(token.toLowerCase());
    entry.phraseIds.add(word.phraseId);
    byLesson.set(word.lessonId, entry);
  }
  return [...byLesson.entries()].sort((a, b) => a[0] - b[0]).map(([lessonId, entry]) => ({
    id: `lesson:${lessonId}:preposition_pack:derived`,
    lessonId,
    prepositions: [...entry.preps].sort(),
    derivedFromPhraseIds: [...entry.phraseIds].sort(),
    sourceRefs: [{
      file: 'app/lesson_prepositions.ts',
      line: 1,
      provenance: 'derived',
      exportName: 'getLessonPrepositionPack',
    }],
  }));
}

function parseSurfaces(runDir: string): SurfaceNode[] {
  const inventoryPath = path.join(runDir, 'audits', 'surface_route_inventory.json');
  if (!fs.existsSync(inventoryPath)) return [];
  const inventory = readJson<Record<string, unknown>>(inventoryPath);
  const surfaces = Array.isArray(inventory.surfaces) ? inventory.surfaces : [];
  return surfaces.map((raw, index) => {
    const item = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const file = typeof item.file === 'string' ? item.file : typeof item.path === 'string' ? item.path : `surface:${index + 1}`;
    return {
      id: typeof item.id === 'string' ? item.id : `surface:${index + 1}:${file}`,
      path: file,
      kind: typeof item.kind === 'string' ? item.kind : 'unknown',
      domain: typeof item.domain === 'string' ? item.domain : 'unknown',
      risk: typeof item.risk === 'string' ? item.risk : 'unknown',
      targetSensitive: Boolean(item.targetSensitive || item.isTargetSensitive || item.userFacingTargetSurface),
      sourceRefs: [{
        file,
        line: 1,
        provenance: 'audit',
      }],
    };
  });
}

function buildLessons(
  titles: Record<number, Record<string, string>>,
  phrases: PhraseNode[],
  words: WordNode[],
  intros: IntroNode[],
  quizzes: QuizNode[],
  prepositionPacks: PrepositionPackNode[],
): LessonNode[] {
  const lessons: LessonNode[] = [];
  for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
    const phraseIds = phrases.filter((item) => item.lessonId === lessonId).map((item) => item.id);
    const introScreenIds = intros.filter((item) => item.lessonId === lessonId).map((item) => item.id);
    const lessonQuizIds = quizzes.filter((item) => item.lessonNum === lessonId).map((item) => item.id);
    const packIds = prepositionPacks.filter((item) => item.lessonId === lessonId).map((item) => item.id);
    const wordIds = words.filter((item) => item.lessonId === lessonId).map((item) => item.id);
    lessons.push({
      id: `lesson:${lessonId}`,
      lessonId,
      titles: titles[lessonId] ?? {},
      phraseIds,
      introScreenIds,
      quizIds: lessonQuizIds,
      prepositionPackIds: packIds,
      wordIds,
      sourceRefs: [{
        file: 'constants/lessons.ts',
        line: lessonId + 8,
        provenance: 'canonical',
        exportName: 'LESSON_NAMES_RU/UK/ES',
      }],
    });
  }
  return lessons;
}

function buildUnresolved(graphParts: {
  lessons: LessonNode[];
  phrases: PhraseNode[];
  introScreens: IntroNode[];
  quizzes: QuizNode[];
  flashcards: FlashcardNode[];
  personalPractice: PersonalPracticeNode[];
  generatedFiles: SourceGraph['generatedFiles'];
  generatedSupportIsolationApproved: boolean;
  sourceGraphApproved: boolean;
}): UnresolvedItem[] {
  const unresolved: UnresolvedItem[] = [];
  const emptyLessons = graphParts.lessons.filter((lesson) => lesson.phraseIds.length === 0);
  if (emptyLessons.length > 0) {
    unresolved.push({
      id: 'SG-001',
      severity: 'blocker',
      title: 'Some lessons have no phrase nodes',
      detail: `Lessons without phrase nodes: ${emptyLessons.map((lesson) => lesson.lessonId).join(', ')}.`,
      sourceRefs: emptyLessons.flatMap((lesson) => lesson.sourceRefs),
    });
  }
  const introMissing = graphParts.lessons.filter((lesson) => lesson.introScreenIds.length === 0);
  if (introMissing.length > 0) {
    unresolved.push({
      id: 'SG-002',
      severity: 'blocker',
      title: 'Some lessons have no intro screen nodes',
      detail: `Lessons without intro nodes: ${introMissing.map((lesson) => lesson.lessonId).join(', ')}.`,
      sourceRefs: introMissing.flatMap((lesson) => lesson.sourceRefs),
    });
  }
  const generatedPhraseSourceFiles = new Set<string>();
  for (const phrase of graphParts.phrases) {
    for (const ref of phrase.sourceRefs) {
      if (ref.provenance === 'runtime_generated') generatedPhraseSourceFiles.add(ref.file);
    }
  }
  const generatedPhraseFiles = graphParts.generatedFiles.filter((item) => generatedPhraseSourceFiles.has(item.file));
  if (generatedPhraseFiles.length > 0) {
    unresolved.push({
      id: 'SG-003',
      severity: 'blocker',
      title: 'Runtime generated phrase files are part of the English source graph',
      detail: `${generatedPhraseFiles.length} generated phrase file(s) are used as extracted phrase source. Gustav can read English text from them, but French generation needs a canonical-source decision before trusting generated runtime files as base material.`,
      sourceRefs: generatedPhraseFiles.map((item) => ({
        file: item.file,
        line: 1,
        provenance: 'runtime_generated',
      })),
    });
  }
  const generatedSupportFiles = graphParts.generatedFiles.filter((item) => !generatedPhraseSourceFiles.has(item.file) && !item.file.includes('lesson_data'));
  if (generatedSupportFiles.length > 0 && !graphParts.generatedSupportIsolationApproved) {
    unresolved.push({
      id: 'SG-004',
      severity: 'high',
      title: 'Generated ES L2 support files must stay out of French source truth',
      detail: `${generatedSupportFiles.length} generated ES L2 support file(s) are present and must not be copied as French structure without target-specific design.`,
      sourceRefs: generatedSupportFiles.map((item) => ({
        file: item.file,
        line: 1,
        provenance: 'runtime_generated',
      })),
    });
  }
  const ruUkMissing = graphParts.phrases.filter((phrase) => !phrase.sourcePrompts.ru || !phrase.sourcePrompts.uk);
  if (ruUkMissing.length > 0) {
    unresolved.push({
      id: 'SG-005',
      severity: 'blocker',
      title: 'Phrase source prompts are missing RU or UK',
      detail: `${ruUkMissing.length} phrase(s) are missing required Russian or Ukrainian prompts.`,
      sourceRefs: ruUkMissing.slice(0, 20).flatMap((phrase) => phrase.sourceRefs),
    });
  }
  const quizWithoutPrompt = graphParts.quizzes.filter((quiz) => !quiz.sourcePrompts.ru || !quiz.sourcePrompts.uk || quiz.choices.length === 0);
  if (quizWithoutPrompt.length > 0) {
    unresolved.push({
      id: 'SG-006',
      severity: 'blocker',
      title: 'Quiz pool entries are incomplete',
      detail: `${quizWithoutPrompt.length} quiz item(s) are missing RU/UK prompts or choices.`,
      sourceRefs: quizWithoutPrompt.slice(0, 20).flatMap((quiz) => quiz.sourceRefs),
    });
  }
  if (graphParts.personalPractice.length === 0) {
    unresolved.push({
      id: 'SG-007',
      severity: 'blocker',
      title: 'Personal practice diagnosis registry was not extracted',
      detail: 'Mistake Practice cannot be generated or adapted until diagnosis content is linked in the source graph.',
      sourceRefs: [{ file: 'app/diagnosis_trainings.ts', line: 1, provenance: 'runtime' }],
    });
  }
  if (!graphParts.sourceGraphApproved) {
    unresolved.push({
      id: 'SG-008',
      severity: 'blocker',
      title: 'Source graph is extracted but not pedagogically approved',
      detail: 'This first graph proves extraction and links, but it still needs a LLM/agent quality pass before French curriculum generation is allowed.',
      sourceRefs: [{ file: 'docs/gustav/GUSTAV_SOURCE_GRAPH_EXTRACTOR_PLAN.md', line: 1, provenance: 'audit' }],
    });
  }
  return unresolved;
}

function renderSummary(graph: SourceGraph): string {
  const lines = [
    '# GUSTAV Source Graph Summary',
    '',
    `Run: \`${graph.runId}\``,
    '',
    `Status: \`${graph.status}\``,
    '',
    `Generated at: ${graph.generatedAt}`,
    '',
    '## Counts',
    '',
    `- Lessons: ${graph.validation.totalLessons}`,
    `- Phrases: ${graph.validation.totalPhrases}`,
    `- Words: ${graph.validation.totalWords}`,
    `- Intro screens: ${graph.validation.totalIntroScreens}`,
    `- Quizzes: ${graph.validation.totalQuizzes}`,
    `- Preposition packs: ${graph.validation.totalPrepositionPacks}`,
    `- Flashcards: ${graph.validation.totalFlashcards}`,
    `- Daily phrases: ${graph.validation.totalDailyPhrases}`,
    `- Personal practice nodes: ${graph.validation.totalPersonalPracticeNodes}`,
    `- Surfaces: ${graph.validation.totalSurfaces}`,
    '',
    '## Verdict',
    '',
    `- Unresolved blockers: ${graph.validation.unresolvedBlockers}`,
    `- High risks: ${graph.validation.unresolvedHighRisks}`,
    `- Generated file risks: ${graph.validation.generatedFileUnknowns}`,
    '',
    '## Unresolved',
    '',
  ];
  for (const item of graph.unresolved) {
    lines.push(`- \`${item.id}\` [${item.severity}] ${item.title}: ${item.detail}`);
  }
  lines.push('');
  return lines.join('\n');
}

function renderUnresolved(graph: SourceGraph): string {
  const lines = [
    '# GUSTAV Source Graph Unresolved Items',
    '',
    `Run: \`${graph.runId}\``,
    '',
  ];
  for (const item of graph.unresolved) {
    lines.push(`## ${item.id}: ${item.title}`);
    lines.push('');
    lines.push(`Severity: \`${item.severity}\``);
    lines.push('');
    lines.push(item.detail);
    lines.push('');
    lines.push('Source refs:');
    for (const ref of item.sourceRefs.slice(0, 20)) {
      lines.push(`- \`${ref.file}:${ref.line}\` (${ref.provenance}${ref.exportName ? `, ${ref.exportName}` : ''})`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_source_graph_extractor.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const manifestPath = path.join(runDir, 'manifest.json');
  const manifest = fs.existsSync(manifestPath) ? readJson<Record<string, unknown>>(manifestPath) : {};
  const sourceGraphDir = path.join(runDir, 'source_graph');
  ensureDir(sourceGraphDir);

  const titles = parseLessonTitles(repoRoot);
  const phraseResult = parsePhrases(repoRoot, runDir);
  const introResult = parseIntros(repoRoot);
  const quizResult = parseQuizzes(repoRoot);
  const flashcardResult = parseFlashcards(repoRoot);
  const dailyResult = parseDailyPhrases(repoRoot);
  const personalResult = parsePersonalPractice(repoRoot);
  const prepositionPacks = derivePrepositionPacks(phraseResult.words);
  const surfaces = parseSurfaces(runDir);
  const generatedSupportIsolationApproved = hasGeneratedSupportIsolationApproval(runDir);
  const sourceGraphApproved = hasSourceGraphApproval(runDir);

  const lessons = buildLessons(
    titles,
    phraseResult.phrases,
    phraseResult.words,
    introResult.introScreens,
    quizResult.quizzes,
    prepositionPacks,
  );

  const sourceFileReadSet = new Set<string>([
    ...phraseResult.filesRead,
    ...introResult.filesRead,
    ...quizResult.filesRead,
    ...flashcardResult.filesRead,
    ...dailyResult.filesRead,
    ...personalResult.filesRead,
    'constants/lessons.ts',
    'app/lesson_prepositions.ts',
    'app/source_locales.ts',
  ]);
  const sourceFiles = SOURCE_FILE_PLAN.map((meta) => ({
    file: meta.file,
    provenance: meta.provenance,
    purpose: meta.purpose,
    generated: meta.file.includes('.gen.') || meta.file.includes('_es_l2') || meta.file.includes('_es_segment'),
    exists: fs.existsSync(path.join(repoRoot, meta.file)),
  })).filter((item) => sourceFileReadSet.has(item.file) || item.exists);
  for (const file of sourceFileReadSet) {
    if (!file.includes('source_graph/recovery/lesson_9_16_canonical_source_draft.json')) continue;
    sourceFiles.push({
      file,
      provenance: 'canonical',
      purpose: 'Approved clean canonical source draft for lessons 9-16.',
      generated: false,
      exists: fs.existsSync(path.join(repoRoot, file)),
    });
  }

  const generatedFiles = GENERATED_FILE_PATTERNS
    .filter((file) => fs.existsSync(path.join(repoRoot, file)))
    .map((file) => ({
      file,
      purpose: file.includes('lesson_data') ? 'Generated lesson phrase/runtime support file.' : 'Generated ES L2 support file.',
      risk: file.includes('lesson_data') ? 'blocker_until_canonical_source_decision' : 'high_keep_out_of_fr_source_truth',
    }));

  const unresolved = buildUnresolved({
    lessons,
    phrases: phraseResult.phrases,
    introScreens: introResult.introScreens,
    quizzes: quizResult.quizzes,
    flashcards: flashcardResult.flashcards,
    personalPractice: personalResult.personalPractice,
    generatedFiles,
    generatedSupportIsolationApproved,
    sourceGraphApproved,
  });
  const unresolvedBlockers = unresolved.filter((item) => item.severity === 'blocker').length;
  const unresolvedHighRisks = unresolved.filter((item) => item.severity === 'high').length;
  const validation: ValidationSummary = {
    verdict: unresolvedBlockers > 0 ? 'HOLD' : 'PASS',
    totalLessons: lessons.length,
    totalPhrases: phraseResult.phrases.length,
    totalWords: phraseResult.words.length,
    totalIntroScreens: introResult.introScreens.length,
    totalQuizzes: quizResult.quizzes.length,
    totalPrepositionPacks: prepositionPacks.length,
    totalFlashcards: flashcardResult.flashcards.length,
    totalDailyPhrases: dailyResult.dailyPhrases.length,
    totalPersonalPracticeNodes: personalResult.personalPractice.length,
    totalSurfaces: surfaces.length,
    unresolvedBlockers,
    unresolvedHighRisks,
    generatedFileUnknowns: generatedSupportIsolationApproved ? 0 : generatedFiles.filter((item) => !item.file.includes('lesson_data')).length,
    sourceLocaleTargetConfusions: phraseResult.phrases.filter((phrase) => phrase.qualityFlags.includes('generated_runtime_phrase_file')).length,
    notes: [
      'The graph is read-only and does not approve French generation.',
      'RU and UK prompts are required source locales for the requested French target.',
      generatedSupportIsolationApproved
        ? 'Generated ES L2 support files are approved as isolated runtime evidence only, not French source truth.'
        : 'Generated ES L2 files are recorded as observed runtime inputs, not as French source truth.',
      sourceGraphApproved
        ? 'Source graph input approval is recorded in source_graph/source_graph_approval.json.'
        : 'Source graph input approval is not recorded yet.',
    ],
  };

  const graph: SourceGraph = {
    schemaVersion: 'gustav-source-graph-v0',
    runId,
    graphId: `${runId}:en:source_graph:v0`,
    status: validation.verdict,
    generatedAt: new Date().toISOString(),
    repoRoot,
    inputRef: {
      manifestPath: path.relative(repoRoot, manifestPath),
      requestedStudyTarget: manifest.requestedStudyTarget ?? 'fr',
      allowedSourceLocales: manifest.allowedSourceLocales ?? ['ru', 'uk'],
      gitCommit: (manifest.inputRef && typeof manifest.inputRef === 'object' ? (manifest.inputRef as Record<string, unknown>).gitCommit : null) ?? null,
    },
    baseStudyTarget: 'en',
    requestedStudyTarget: String(manifest.requestedStudyTarget ?? 'fr'),
    supportedSourceLocalesObserved: ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'],
    studyTargetsObserved: ['en', 'es'],
    sourceFiles,
    generatedFiles,
    lessons,
    introScreens: introResult.introScreens,
    phrases: phraseResult.phrases,
    words: phraseResult.words,
    quizzes: quizResult.quizzes,
    prepositionPacks,
    flashcards: flashcardResult.flashcards,
    dailyPhrases: dailyResult.dailyPhrases,
    personalPractice: personalResult.personalPractice,
    surfaces,
    unresolved,
    validation,
  };

  const graphJson = `${JSON.stringify(graph, null, 2)}\n`;
  fs.writeFileSync(path.join(sourceGraphDir, 'source_graph.json'), graphJson);
  fs.writeFileSync(path.join(sourceGraphDir, 'english_source_graph.json'), graphJson);
  fs.writeFileSync(path.join(sourceGraphDir, 'validation.json'), `${JSON.stringify(validation, null, 2)}\n`);
  fs.writeFileSync(path.join(sourceGraphDir, 'source_graph_summary.md'), renderSummary(graph));
  fs.writeFileSync(path.join(sourceGraphDir, 'unresolved.md'), renderUnresolved(graph));

  console.log(`GUSTAV source graph extractor: ${graph.status}`);
  console.log(`Lessons: ${validation.totalLessons}`);
  console.log(`Phrases: ${validation.totalPhrases}`);
  console.log(`Intro screens: ${validation.totalIntroScreens}`);
  console.log(`Quizzes: ${validation.totalQuizzes}`);
  console.log(`Personal practice nodes: ${validation.totalPersonalPracticeNodes}`);
  console.log(`Report: ${path.relative(repoRoot, path.join(sourceGraphDir, 'source_graph_summary.md'))}`);
}

void main();
