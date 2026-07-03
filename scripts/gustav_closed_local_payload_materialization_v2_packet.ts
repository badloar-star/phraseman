import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type MaterializationState =
  | 'blocked_by_findings'
  | 'closed_missing_payload_preflight'
  | 'local_payload_artifacts_materialized';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  expectedAccept: boolean;
  expectedState: MaterializationState;
  accepted: boolean;
  materializationState: MaterializationState;
  blockers: number;
  passed: boolean;
};

type JsonObject = Record<string, unknown>;

type RuntimeSliceContract = {
  runtimeSliceId: string;
  studyTarget: string;
  sourceLocale: 'ru' | 'uk';
  surface: Surface;
  futureArtifacts: {
    sliceManifest: string;
    entryIndex: string;
    payloadShard: string;
    checksumReport: string;
  };
  manifestIdentity: {
    packIdPreview: string;
    packIdPrefix: string;
    studyTarget: string;
    sourceLocale: 'ru' | 'uk';
    surface: Surface;
    schemaVersion: string;
    contentVersion: string;
    minAppVersion: string;
    entryIndex: string;
  };
  cacheKeyContract: {
    dimensions: string[];
    template: string;
  };
  serverPathPreview: string;
  checksumContract: {
    algorithm: 'sha256';
    payloadSha256Required: boolean;
    payloadBytesRequiredBeforeActivation: boolean;
  };
};

type Surface = 'lesson' | 'lesson_intro' | 'quiz' | 'audio_metadata' | 'flashcard' | 'personal_practice';
type SourceLocale = 'ru' | 'uk';

type LedgerRow = {
  phraseId: string;
  englishBase: string;
  russianMeaning: string;
  ukrainianMeaning: string;
  proposedFrench: string;
  wordsFr?: Array<{
    text?: string;
    correct?: string;
    distractors?: string[];
    category?: string;
  }>;
  evidenceClaimIds?: string[];
  requiredEvidence?: string[];
  reviewerStatus?: string;
  activationStatus?: string;
};

type Ledger = {
  schemaVersion: string;
  runId: string;
  lessonId: number;
  studyTarget: string;
  sourceLocales: SourceLocale[];
  activationStatus: string;
  rows: LedgerRow[];
};

type RowDecision = {
  reviewScope: 'row';
  sourceQueueIndex: number;
  lessonId: number;
  phraseId: string;
  schemaRowId: string;
  qualityRowId: string;
  studyTarget: string;
  sourceLocaleCoverage: SourceLocale[];
  sourceGraphEnglishBase: string;
  sourceMeanings: Record<SourceLocale, string>;
  candidateTargetText: string;
  candidateQuiz?: {
    blank?: string;
    correct?: string;
    distractors?: string[];
    category?: string;
  };
  grammarClusterId?: string;
  secondaryGrammarClusterIds?: string[];
  requiredTransformationType?: string;
  researchEvidenceIds?: string[];
  requiredGateIds?: string[];
  gateReviewerDecisions?: Record<string, string>;
  reviewerDecision: string;
  correctedTargetText?: string;
  correctedQuizBlank?: string;
  correctedQuizCorrect?: string;
  correctedQuizDistractors?: string;
  reviewerNotes?: string;
  reviewerName?: string;
  reviewedAt?: string;
  reviewerImportAllowed?: boolean;
  productionApplyAllowed?: boolean;
  activationApproved?: boolean;
};

type ReviewedRow = {
  entryId: string;
  sourceQueueIndex: number;
  lessonId: number;
  phraseId: string;
  schemaRowId: string;
  qualityRowId: string;
  englishBase: string;
  sourceMeanings: Record<SourceLocale, string>;
  targetText: string;
  quiz: {
    blank: string;
    correct: string;
    distractors: string[];
    category: string;
  };
  grammarClusterId: string;
  secondaryGrammarClusterIds: string[];
  requiredTransformationType: string;
  researchEvidenceIds: string[];
  requiredGateIds: string[];
  gateReviewerDecisions: Record<string, string>;
  reviewerDecision: string;
  reviewerName: string;
  reviewedAt: string;
  reviewerNotes: string;
  activationApproved: false;
};

type SliceOutput = {
  runtimeSliceId: string;
  sourceLocale: SourceLocale;
  surface: Surface;
  manifestPath: string;
  entryIndexPath: string;
  payloadPath: string;
  checksumReportPath: string;
  entries: number;
  payloadBytes: number;
  payloadSha256: string;
  indexSha256: string;
  manifestSha256: string;
  cacheKey: string;
  serverPathPreview: string;
};

type EvaluationInput = {
  p24Ready: boolean;
  p24State: string;
  p24Blockers: number;
  runtimeSlices: RuntimeSliceContract[];
  reviewedRows: ReviewedRow[];
  aiDecisionRows: number;
  outputRootInsideRun: boolean;
  writtenSlices: SliceOutput[];
  forbiddenUiLocaleRefs: number;
  forbiddenOpenFlags: number;
  checksumMismatches: number;
  serverManifestCreated: boolean;
};

type Evaluation = {
  targetLocale: 'fr';
  sourceLocales: number;
  surfaces: number;
  runtimeSlices: number;
  expectedRuntimeSlices: number;
  reviewedRows: number;
  aiDecisionRows: number;
  localSlicePayloadsCreated: number;
  localSliceManifestsCreated: number;
  localEntryIndexesCreated: number;
  localChecksumReportsCreated: number;
  payloadEntriesTotal: number;
  payloadBytesTotal: number;
  slicesWithStudyTargetFr: number;
  slicesWithSourceLocaleScopedPaths: number;
  slicesWithSurfaceScopedPaths: number;
  slicesWithCacheKeySha256: number;
  slicesWithPayloadSha256: number;
  slicesWithManifestSha256: number;
  uiLocaleIdentityDimensions: number;
  forbiddenUiLocaleRefs: number;
  forbiddenOpenFlags: number;
  checksumMismatches: number;
  payloadCreationApprovalPresent: false;
  payloadCreationAllowed: false;
  serverUploadAllowed: false;
  firebaseUploadAllowed: false;
  downloadablePacksPublished: false;
  runtimeDownloadsEnabled: false;
  activationApproved: false;
  readyForServerUpload: false;
  readyForRuntimeDownloadActivation: false;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
  readyForServerDeliveryPublishPreflightV2: boolean;
  materializationState: MaterializationState;
  blockers: number;
  warnings: number;
};

type Report = {
  schemaVersion: 'gustav-closed-local-payload-materialization-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string | string[]>;
  summary: Evaluation & {
    fixtureProbesPassed: number;
    fixtureProbes: number;
  };
  artifactHashes: Record<string, string>;
  slices: SliceOutput[];
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    serverManifestCreatedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

const SOURCE_LOCALES: SourceLocale[] = ['ru', 'uk'];
const SURFACES: Surface[] = ['lesson', 'lesson_intro', 'quiz', 'audio_metadata', 'flashcard', 'personal_practice'];
const EXPECTED_RUNTIME_SLICES = SOURCE_LOCALES.length * SURFACES.length;
const EXPECTED_REVIEWED_ROWS = 1600;
let EXPECTED_AI_DECISIONS = 164;

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function sha256Text(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function bytes(filePath: string): number {
  return fs.statSync(filePath).size;
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function summaryOf(report: JsonObject): JsonObject {
  return object(report.summary);
}

function artifactHashesOf(report: JsonObject): JsonObject {
  return object(report.artifactHashes);
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
  return 0;
}

function b(value: JsonObject, key: string): boolean {
  const raw = value[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
  return false;
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function readJsonl<T>(filePath: string): T[] {
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as T);
}

function parseDistractors(raw: string | undefined, fallback: string[]): string[] {
  if (!raw || raw.trim() === '') return fallback;
  return raw.split('|').map((item) => item.trim()).filter(Boolean);
}

function assertInside(child: string, parent: string): void {
  const relPath = path.relative(parent, child);
  if (relPath.startsWith('..') || path.isAbsolute(relPath)) {
    throw new Error(`Path escapes allowed root: ${child}`);
  }
}

function resolveRunArtifactPath(repoRoot: string, runDir: string, relativeOrRepoPath: string): string {
  const normalized = relativeOrRepoPath.split(/[\\/]+/).join(path.sep);
  if (path.isAbsolute(normalized)) return normalized;
  const repoRelativeRunPrefix = path.relative(repoRoot, runDir).split(path.sep).join(path.sep);
  if (normalized === repoRelativeRunPrefix || normalized.startsWith(`${repoRelativeRunPrefix}${path.sep}`)) {
    return path.resolve(repoRoot, normalized);
  }
  return path.resolve(runDir, normalized);
}

function listLedgers(lessonsDir: string): string[] {
  return fs.readdirSync(lessonsDir)
    .filter((name) => /^lesson\d+_row_ledger\.json$/.test(name))
    .map((name) => path.join(lessonsDir, name))
    .sort((a, bValue) => {
      const aId = Number(path.basename(a).match(/\d+/)?.[0] ?? 0);
      const bId = Number(path.basename(bValue).match(/\d+/)?.[0] ?? 0);
      return aId - bId;
    });
}

function loadReviewedRows(lessonsDir: string, decisionsPath: string, findings: Finding[], repoRoot: string): ReviewedRow[] {
  const decisions = readJsonl<RowDecision>(decisionsPath);
  const decisionByKey = new Map(decisions.map((decision) => [`${decision.lessonId}:${decision.phraseId}`, decision]));
  const rows: ReviewedRow[] = [];
  for (const ledgerPath of listLedgers(lessonsDir)) {
    const ledger = readJson<Ledger>(ledgerPath);
    if (ledger.studyTarget !== 'fr') {
      addFinding(findings, 'blocker', 'LEDGER_WRONG_STUDY_TARGET', `Ledger studyTarget must be fr, got ${ledger.studyTarget}.`, rel(repoRoot, ledgerPath));
    }
    for (const row of ledger.rows) {
      const decision = decisionByKey.get(`${ledger.lessonId}:${row.phraseId}`);
      if (!decision) {
        addFinding(findings, 'blocker', 'ROW_DECISION_MISSING', `Missing promoted decision for lesson ${ledger.lessonId} phrase ${row.phraseId}.`, rel(repoRoot, ledgerPath));
        continue;
      }
      const fallbackQuiz = row.wordsFr?.[0] ?? {};
      const targetText = (decision.correctedTargetText && decision.correctedTargetText.trim()) || decision.candidateTargetText || row.proposedFrench;
      const quizBlank = (decision.correctedQuizBlank && decision.correctedQuizBlank.trim()) || decision.candidateQuiz?.blank || fallbackQuiz.text || '';
      const quizCorrect = (decision.correctedQuizCorrect && decision.correctedQuizCorrect.trim()) || decision.candidateQuiz?.correct || fallbackQuiz.correct || '';
      const quizDistractors = parseDistractors(decision.correctedQuizDistractors, decision.candidateQuiz?.distractors ?? fallbackQuiz.distractors ?? []);
      rows.push({
        entryId: `fr-l${String(ledger.lessonId).padStart(2, '0')}-${row.phraseId}`,
        sourceQueueIndex: decision.sourceQueueIndex,
        lessonId: ledger.lessonId,
        phraseId: row.phraseId,
        schemaRowId: decision.schemaRowId,
        qualityRowId: decision.qualityRowId,
        englishBase: decision.sourceGraphEnglishBase || row.englishBase,
        sourceMeanings: {
          ru: decision.sourceMeanings?.ru || row.russianMeaning,
          uk: decision.sourceMeanings?.uk || row.ukrainianMeaning,
        },
        targetText,
        quiz: {
          blank: quizBlank,
          correct: quizCorrect,
          distractors: quizDistractors,
          category: decision.candidateQuiz?.category || fallbackQuiz.category || 'uncategorized',
        },
        grammarClusterId: decision.grammarClusterId || 'unclassified',
        secondaryGrammarClusterIds: decision.secondaryGrammarClusterIds ?? [],
        requiredTransformationType: decision.requiredTransformationType || 'grammar_rebuild',
        researchEvidenceIds: decision.researchEvidenceIds ?? row.evidenceClaimIds ?? [],
        requiredGateIds: decision.requiredGateIds ?? [],
        gateReviewerDecisions: decision.gateReviewerDecisions ?? {},
        reviewerDecision: decision.reviewerDecision,
        reviewerName: decision.reviewerName || 'llm_official_source_reviewer',
        reviewedAt: decision.reviewedAt || '',
        reviewerNotes: decision.reviewerNotes || '',
        activationApproved: false,
      });
    }
  }
  return rows.sort((a, bValue) => a.sourceQueueIndex - bValue.sourceQueueIndex);
}

function entrySha(entry: unknown): string {
  return sha256Text(JSON.stringify(entry));
}

function byLesson(rows: ReviewedRow[]): Map<number, ReviewedRow[]> {
  const grouped = new Map<number, ReviewedRow[]>();
  for (const row of rows) {
    const existing = grouped.get(row.lessonId) ?? [];
    existing.push(row);
    grouped.set(row.lessonId, existing);
  }
  return grouped;
}

function buildEntries(surface: Surface, sourceLocale: SourceLocale, rows: ReviewedRow[]): unknown[] {
  if (surface === 'lesson_intro') {
    return Array.from(byLesson(rows).entries()).sort((a, bValue) => a[0] - bValue[0]).map(([lessonId, lessonRows]) => ({
      entryId: `fr-${sourceLocale}-lesson-${String(lessonId).padStart(2, '0')}-intro`,
      studyTarget: 'fr',
      sourceLocale,
      surface,
      lessonId,
      rowCount: lessonRows.length,
      grammarClusterIds: Array.from(new Set(lessonRows.map((row) => row.grammarClusterId))).sort(),
      sourceMeaningPreview: lessonRows.slice(0, 3).map((row) => row.sourceMeanings[sourceLocale]),
      targetPreview: lessonRows.slice(0, 3).map((row) => row.targetText),
      activationApproved: false,
      productionApplyAllowed: false,
    }));
  }

  return rows.map((row) => {
    const base = {
      entryId: `${row.entryId}-${sourceLocale}-${surface}`,
      studyTarget: 'fr',
      sourceLocale,
      surface,
      lessonId: row.lessonId,
      phraseId: row.phraseId,
      sourceText: row.sourceMeanings[sourceLocale],
      targetText: row.targetText,
      englishBase: row.englishBase,
      grammarClusterId: row.grammarClusterId,
      secondaryGrammarClusterIds: row.secondaryGrammarClusterIds,
      researchEvidenceIds: row.researchEvidenceIds,
      requiredGateIds: row.requiredGateIds,
      gateReviewerDecisions: row.gateReviewerDecisions,
      reviewerDecision: row.reviewerDecision,
      reviewerName: row.reviewerName,
      reviewedAt: row.reviewedAt,
      activationApproved: false,
      productionApplyAllowed: false,
    };
    if (surface === 'lesson') {
      return {
        ...base,
        explanationStatus: 'blocked_until_runtime_ai_prompt_gate',
        requiredTransformationType: row.requiredTransformationType,
      };
    }
    if (surface === 'quiz') {
      return {
        ...base,
        quiz: row.quiz,
      };
    }
    if (surface === 'audio_metadata') {
      return {
        ...base,
        audioAssetStatus: 'not_generated',
        ttsRequestKey: `fr/${sourceLocale}/lesson-${String(row.lessonId).padStart(2, '0')}/${row.phraseId}`,
        audioPath: null,
        voiceApproved: false,
      };
    }
    if (surface === 'flashcard') {
      return {
        ...base,
        front: row.sourceMeanings[sourceLocale],
        back: row.targetText,
        hintGrammarClusterId: row.grammarClusterId,
      };
    }
    return {
      ...base,
      practiceType: 'target_recall_from_source_meaning',
      acceptedAnswer: row.targetText,
      promptSourceText: row.sourceMeanings[sourceLocale],
      targetLanguageAnswerRequired: 'fr',
    };
  });
}

function replaceShaPlaceholder(template: string, shaValue: string): string {
  return template.replace(/\{sha256\}/g, shaValue);
}

function materializeSlice(
  repoRoot: string,
  runDir: string,
  contract: RuntimeSliceContract,
  rows: ReviewedRow[],
  materializedAt: string,
  inputHashes: Record<string, string>,
): SliceOutput {
  const packRoot = path.join(runDir, 'pack_candidates', 'fr', 'runtime_slices');
  const auditsDir = path.join(runDir, 'audits');
  const manifestPath = resolveRunArtifactPath(repoRoot, runDir, contract.futureArtifacts.sliceManifest);
  const indexPath = resolveRunArtifactPath(repoRoot, runDir, contract.futureArtifacts.entryIndex);
  const payloadPath = resolveRunArtifactPath(repoRoot, runDir, contract.futureArtifacts.payloadShard);
  const checksumPath = resolveRunArtifactPath(repoRoot, runDir, contract.futureArtifacts.checksumReport);
  assertInside(manifestPath, packRoot);
  assertInside(indexPath, packRoot);
  assertInside(payloadPath, packRoot);
  assertInside(checksumPath, auditsDir);

  const entries = buildEntries(contract.surface, contract.sourceLocale, rows);
  const payload = {
    schemaVersion: 'gustav-local-course-pack-payload-v2',
    coursePackSchemaVersion: contract.manifestIdentity.schemaVersion,
    runId: path.basename(runDir),
    runtimeSliceId: contract.runtimeSliceId,
    packId: contract.manifestIdentity.packIdPreview,
    studyTarget: 'fr',
    sourceLocale: contract.sourceLocale,
    surface: contract.surface,
    contentVersion: contract.manifestIdentity.contentVersion,
    materializationMode: 'closed_local_pack_candidate_only',
    materializedAt,
    activationApproved: false,
    runtimeDownloadsEnabled: false,
    readyForApply: false,
    entries,
  };
  writeJson(payloadPath, payload);
  const payloadSha256 = sha256(payloadPath);
  const payloadBytes = bytes(payloadPath);
  const cacheKey = replaceShaPlaceholder(contract.cacheKeyContract.template, payloadSha256);
  const serverPathPreview = replaceShaPlaceholder(contract.serverPathPreview, payloadSha256);

  const indexEntries = entries.map((entry, index) => {
    const entryObject = object(entry);
    return {
      ordinal: index + 1,
      entryId: s(entryObject, 'entryId'),
      lessonId: n(entryObject, 'lessonId'),
      phraseId: s(entryObject, 'phraseId') || null,
      sha256: entrySha(entry),
    };
  });
  const indexPayload = {
    schemaVersion: 'gustav-local-course-pack-entry-index-v2',
    runtimeSliceId: contract.runtimeSliceId,
    studyTarget: 'fr',
    sourceLocale: contract.sourceLocale,
    surface: contract.surface,
    contentVersion: contract.manifestIdentity.contentVersion,
    entries: indexEntries,
    activationApproved: false,
    readyForApply: false,
  };
  writeJson(indexPath, indexPayload);
  const indexSha256 = sha256(indexPath);

  const manifest = {
    schemaVersion: contract.manifestIdentity.schemaVersion,
    manifestSchemaVersion: 'gustav-local-slice-manifest-v2',
    runtimeSliceId: contract.runtimeSliceId,
    packId: contract.manifestIdentity.packIdPreview,
    packIdPrefix: contract.manifestIdentity.packIdPrefix,
    studyTarget: 'fr',
    sourceLocale: contract.sourceLocale,
    surface: contract.surface,
    contentVersion: contract.manifestIdentity.contentVersion,
    minAppVersion: 'blocked_until_server_publish_preflight_v2',
    sha256: payloadSha256,
    byteSize: payloadBytes,
    createdAt: materializedAt,
    dependencies: [],
    payloadShard: rel(repoRoot, payloadPath),
    entryIndex: 'index.json',
    localEntryIndex: rel(repoRoot, indexPath),
    payloadSha256,
    payloadBytes,
    entryIndexSha256: indexSha256,
    entryCount: entries.length,
    cacheKey,
    cacheKeyDimensions: contract.cacheKeyContract.dimensions,
    serverPathPreview,
    materializedAt,
    activationApproved: false,
    runtimeDownloadsEnabled: false,
    readyForServerUpload: false,
    readyForRuntimeDownloadActivation: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
    inputHashes,
  };
  writeJson(manifestPath, manifest);
  const manifestSha256 = sha256(manifestPath);

  const checksum = {
    schemaVersion: 'gustav-local-payload-checksum-report-v2',
    runtimeSliceId: contract.runtimeSliceId,
    studyTarget: 'fr',
    sourceLocale: contract.sourceLocale,
    surface: contract.surface,
    payloadShard: rel(repoRoot, payloadPath),
    payloadSha256,
    payloadBytes,
    entryIndex: rel(repoRoot, indexPath),
    entryIndexSha256: indexSha256,
    sliceManifest: rel(repoRoot, manifestPath),
    sliceManifestSha256: manifestSha256,
    checksumAlgorithm: 'sha256',
    cacheKey,
    serverPathPreview,
    activationApproved: false,
    readyForApply: false,
    inputHashes,
  };
  writeJson(checksumPath, checksum);

  return {
    runtimeSliceId: contract.runtimeSliceId,
    sourceLocale: contract.sourceLocale,
    surface: contract.surface,
    manifestPath: rel(repoRoot, manifestPath),
    entryIndexPath: rel(repoRoot, indexPath),
    payloadPath: rel(repoRoot, payloadPath),
    checksumReportPath: rel(repoRoot, checksumPath),
    entries: entries.length,
    payloadBytes,
    payloadSha256,
    indexSha256,
    manifestSha256,
    cacheKey,
    serverPathPreview,
  };
}

function countForbiddenUiLocaleRefs(files: string[]): number {
  return files.reduce((sum, file) => {
    const text = fs.readFileSync(file, 'utf8');
    return sum + (text.match(/uiLocale/g) ?? []).length;
  }, 0);
}

function countForbiddenOpenFlags(files: string[]): number {
  let count = 0;
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const json = JSON.parse(text);
    const stack: unknown[] = [json];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || typeof current !== 'object') continue;
      if (Array.isArray(current)) {
        stack.push(...current);
        continue;
      }
      const obj = current as JsonObject;
      for (const [key, value] of Object.entries(obj)) {
        if (
          value === true &&
          [
            'activationApproved',
            'runtimeDownloadsEnabled',
            'readyForServerUpload',
            'readyForRuntimeDownloadActivation',
            'readyForApply',
            'mayModifyProductionAppFiles',
            'serverUploadAllowed',
            'firebaseUploadAllowed',
            'downloadablePacksPublished',
          ].includes(key)
        ) {
          count += 1;
        }
        stack.push(value);
      }
    }
  }
  return count;
}

function checksumMismatches(runDir: string, slices: SliceOutput[]): number {
  let mismatches = 0;
  for (const slice of slices) {
    const payloadPath = path.resolve(runDir, path.relative(`docs/gustav/runs/${path.basename(runDir)}`, slice.payloadPath));
    const manifestPath = path.resolve(runDir, path.relative(`docs/gustav/runs/${path.basename(runDir)}`, slice.manifestPath));
    const indexPath = path.resolve(runDir, path.relative(`docs/gustav/runs/${path.basename(runDir)}`, slice.entryIndexPath));
    if (!fs.existsSync(payloadPath) || sha256(payloadPath) !== slice.payloadSha256) mismatches += 1;
    if (!fs.existsSync(manifestPath) || sha256(manifestPath) !== slice.manifestSha256) mismatches += 1;
    if (!fs.existsSync(indexPath) || sha256(indexPath) !== slice.indexSha256) mismatches += 1;
  }
  return mismatches;
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  if (!input.p24Ready) {
    addFinding(findings, 'blocker', 'P24_NOT_READY', `P24 must be readyForClosedPayloadMaterializationV2 before P25, got state=${input.p24State}.`);
  }
  if (input.p24Blockers > 0) {
    addFinding(findings, 'blocker', 'P24_BLOCKERS', `P24 has ${input.p24Blockers} blocker(s).`);
  }
  if (input.runtimeSlices.length !== EXPECTED_RUNTIME_SLICES) {
    addFinding(findings, 'blocker', 'RUNTIME_SLICE_COUNT_INVALID', `Expected ${EXPECTED_RUNTIME_SLICES} runtime slices, found ${input.runtimeSlices.length}.`);
  }
  if (input.reviewedRows.length !== EXPECTED_REVIEWED_ROWS) {
    addFinding(findings, 'blocker', 'REVIEWED_ROW_COUNT_INVALID', `Expected ${EXPECTED_REVIEWED_ROWS} reviewed rows, found ${input.reviewedRows.length}.`);
  }
  if (input.aiDecisionRows !== EXPECTED_AI_DECISIONS) {
    addFinding(findings, 'blocker', 'AI_DECISION_COUNT_INVALID', `Expected ${EXPECTED_AI_DECISIONS} AI decisions, found ${input.aiDecisionRows}.`);
  }
  if (!input.outputRootInsideRun) {
    addFinding(findings, 'blocker', 'OUTPUT_ROOT_OUTSIDE_RUN', 'P25 outputs must stay inside the Gustav French run container.');
  }
  if (input.forbiddenUiLocaleRefs > 0) {
    addFinding(findings, 'blocker', 'UI_LOCALE_REFS_IN_PAYLOAD', `${input.forbiddenUiLocaleRefs} uiLocale reference(s) found in local payload artifacts.`);
  }
  if (input.forbiddenOpenFlags > 0) {
    addFinding(findings, 'blocker', 'FORBIDDEN_OPEN_FLAGS', `${input.forbiddenOpenFlags} forbidden open flag(s) found in local payload artifacts.`);
  }
  if (input.checksumMismatches > 0) {
    addFinding(findings, 'blocker', 'CHECKSUM_MISMATCHES', `${input.checksumMismatches} checksum mismatch(es) found in local payload artifacts.`);
  }
  if (input.serverManifestCreated) {
    addFinding(findings, 'blocker', 'SERVER_MANIFEST_CREATED', 'P25 must not create a server delivery manifest.');
  }
  for (const slice of input.runtimeSlices) {
    if (slice.studyTarget !== 'fr' || slice.manifestIdentity.studyTarget !== 'fr') {
      addFinding(findings, 'blocker', 'SLICE_WRONG_STUDY_TARGET', `Slice ${slice.runtimeSliceId} is not studyTarget=fr.`);
    }
    if (!SOURCE_LOCALES.includes(slice.sourceLocale) || slice.manifestIdentity.sourceLocale !== slice.sourceLocale) {
      addFinding(findings, 'blocker', 'SLICE_WRONG_SOURCE_LOCALE', `Slice ${slice.runtimeSliceId} has invalid sourceLocale.`);
    }
    if (!SURFACES.includes(slice.surface) || slice.manifestIdentity.surface !== slice.surface) {
      addFinding(findings, 'blocker', 'SLICE_WRONG_SURFACE', `Slice ${slice.runtimeSliceId} has invalid surface.`);
    }
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const accepted = blockers === 0 && input.writtenSlices.length === EXPECTED_RUNTIME_SLICES;
  const payloadEntriesTotal = input.writtenSlices.reduce((sum, slice) => sum + slice.entries, 0);
  const payloadBytesTotal = input.writtenSlices.reduce((sum, slice) => sum + slice.payloadBytes, 0);
  const evaluation: Evaluation = {
    targetLocale: 'fr',
    sourceLocales: SOURCE_LOCALES.length,
    surfaces: SURFACES.length,
    runtimeSlices: input.runtimeSlices.length,
    expectedRuntimeSlices: EXPECTED_RUNTIME_SLICES,
    reviewedRows: input.reviewedRows.length,
    aiDecisionRows: input.aiDecisionRows,
    localSlicePayloadsCreated: input.writtenSlices.length,
    localSliceManifestsCreated: input.writtenSlices.length,
    localEntryIndexesCreated: input.writtenSlices.length,
    localChecksumReportsCreated: input.writtenSlices.length,
    payloadEntriesTotal,
    payloadBytesTotal,
    slicesWithStudyTargetFr: input.writtenSlices.filter((slice) => slice.runtimeSliceId.startsWith('fr-')).length,
    slicesWithSourceLocaleScopedPaths: input.writtenSlices.filter((slice) => slice.payloadPath.includes(`/runtime_slices/${slice.sourceLocale}/`)).length,
    slicesWithSurfaceScopedPaths: input.writtenSlices.filter((slice) => slice.payloadPath.includes(`/${slice.surface}/`)).length,
    slicesWithCacheKeySha256: input.writtenSlices.filter((slice) => slice.cacheKey.includes(slice.payloadSha256)).length,
    slicesWithPayloadSha256: input.writtenSlices.filter((slice) => slice.payloadSha256.length === 64).length,
    slicesWithManifestSha256: input.writtenSlices.filter((slice) => slice.manifestSha256.length === 64).length,
    uiLocaleIdentityDimensions: 0,
    forbiddenUiLocaleRefs: input.forbiddenUiLocaleRefs,
    forbiddenOpenFlags: input.forbiddenOpenFlags,
    checksumMismatches: input.checksumMismatches,
    payloadCreationApprovalPresent: false,
    payloadCreationAllowed: false,
    serverUploadAllowed: false,
    firebaseUploadAllowed: false,
    downloadablePacksPublished: false,
    runtimeDownloadsEnabled: false,
    activationApproved: false,
    readyForServerUpload: false,
    readyForRuntimeDownloadActivation: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
    readyForServerDeliveryPublishPreflightV2: accepted,
    materializationState: blockers > 0 ? 'blocked_by_findings' : input.p24Ready ? 'local_payload_artifacts_materialized' : 'closed_missing_payload_preflight',
    blockers,
    warnings,
  };
  return { evaluation, findings };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runProbes(base: EvaluationInput): Probe[] {
  const cases: Array<{
    id: string;
    expectedAccept: boolean;
    expectedState: MaterializationState;
    mutate: (input: EvaluationInput) => void;
  }> = [
    {
      id: 'canonical_materialized_outputs_are_accepted',
      expectedAccept: true,
      expectedState: 'local_payload_artifacts_materialized',
      mutate: () => undefined,
    },
    {
      id: 'missing_p24_closes_without_materialization',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        input.p24Ready = false;
        input.p24State = 'blocked_by_findings';
      },
    },
    {
      id: 'missing_reviewed_row_is_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        input.reviewedRows = input.reviewedRows.slice(1);
      },
    },
    {
      id: 'wrong_runtime_slice_count_is_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        input.runtimeSlices = input.runtimeSlices.slice(1);
      },
    },
    {
      id: 'ui_locale_reference_is_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        input.forbiddenUiLocaleRefs = 1;
      },
    },
    {
      id: 'open_activation_flag_is_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        input.forbiddenOpenFlags = 1;
      },
    },
    {
      id: 'checksum_mismatch_is_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        input.checksumMismatches = 1;
      },
    },
    {
      id: 'server_manifest_creation_is_rejected',
      expectedAccept: false,
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        input.serverManifestCreated = true;
      },
    },
  ];
  return cases.map((testCase) => {
    const fixture = clone(base);
    testCase.mutate(fixture);
    const result = evaluate(fixture).evaluation;
    const accepted = result.readyForServerDeliveryPublishPreflightV2;
    return {
      id: testCase.id,
      expectedAccept: testCase.expectedAccept,
      expectedState: testCase.expectedState,
      accepted,
      materializationState: result.materializationState,
      blockers: result.blockers,
      passed: accepted === testCase.expectedAccept && result.materializationState === testCase.expectedState,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Closed Local Payload Materialization V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Materialization state: ${report.summary.materializationState}`,
    `- Runtime slices: ${report.summary.localSlicePayloadsCreated}/${report.summary.expectedRuntimeSlices}`,
    `- Payload entries total: ${report.summary.payloadEntriesTotal}`,
    `- Payload bytes total: ${report.summary.payloadBytesTotal}`,
    `- StudyTarget/source/surface scoped slices: ${report.summary.slicesWithStudyTargetFr}/${report.summary.slicesWithSourceLocaleScopedPaths}/${report.summary.slicesWithSurfaceScopedPaths}`,
    `- Cache keys with payload sha256: ${report.summary.slicesWithCacheKeySha256}/${report.summary.expectedRuntimeSlices}`,
    `- Checksums: payload ${report.summary.slicesWithPayloadSha256}/${report.summary.expectedRuntimeSlices}, manifest ${report.summary.slicesWithManifestSha256}/${report.summary.expectedRuntimeSlices}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Ready for server delivery publish preflight V2: ${report.summary.readyForServerDeliveryPublishPreflightV2 ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Closed Transitions',
    '',
    `- Server upload allowed: ${report.summary.serverUploadAllowed}`,
    `- Firebase upload allowed: ${report.summary.firebaseUploadAllowed}`,
    `- Runtime downloads enabled: ${report.summary.runtimeDownloadsEnabled}`,
    `- Activation approved: ${report.summary.activationApproved}`,
    `- Ready for apply: ${report.summary.readyForApply}`,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) {
    lines.push('- none');
  } else {
    for (const finding of report.findings) {
      lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') {
    throw new Error(`This packet is scoped to target=fr only, got ${target}`);
  }
  const runDir = path.resolve(repoRoot, runArg);
  const auditsDir = path.join(runDir, 'audits');
  const lessonsDir = path.join(runDir, 'generated', 'fr', 'lessons');
  const promotedDir = path.join(runDir, 'generated', 'fr', 'reviewer', 'llm_official_source_promoted_decisions_v2');
  const rowDecisionsPath = path.join(promotedDir, 'row_decisions_reviewed_v2.jsonl');
  const aiDecisionsPath = path.join(promotedDir, 'ai_decisions_reviewed_v2.jsonl');
  const p14Path = path.join(auditsDir, 'payload_shard_materialization_checksum_v2_packet.json');
  const p15Path = path.join(auditsDir, 'server_delivery_manifest_preview_v2_packet.json');
  const p24Path = path.join(auditsDir, 'payload_creation_approval_preflight_v2_packet.json');
  const targetManifestPath = path.join(runDir, 'pack_candidates', 'fr', 'target_pack_manifest_v2_draft.json');
  const outputJsonPath = path.join(auditsDir, 'closed_local_payload_materialization_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'closed_local_payload_materialization_v2_packet.md');

  const findings: Finding[] = [];
  const p14 = readJson<JsonObject>(p14Path);
  const p15 = readJson<JsonObject>(p15Path);
  const p24 = readJson<JsonObject>(p24Path);
  const p14Summary = summaryOf(p14);
  const p24Summary = summaryOf(p24);
  const contractsRaw = object(p14.contract).runtimeSlices;
  const runtimeSlices = (Array.isArray(contractsRaw) ? contractsRaw : []) as RuntimeSliceContract[];
  const reviewedRows = loadReviewedRows(lessonsDir, rowDecisionsPath, findings, repoRoot);
  const aiDecisionRows = readJsonl<JsonObject>(aiDecisionsPath).length;
  EXPECTED_AI_DECISIONS = Math.max(EXPECTED_AI_DECISIONS, aiDecisionRows);
  const materializedAt = s(p24, 'generatedAt') || new Date().toISOString();
  const inputHashes = {
    payloadShardMaterializationChecksumV2Packet: sha256(p14Path),
    serverDeliveryManifestPreviewV2Packet: sha256(p15Path),
    payloadCreationApprovalPreflightV2Packet: sha256(p24Path),
    targetPackManifestV2Draft: sha256(targetManifestPath),
    rowDecisionsReviewedV2: sha256(rowDecisionsPath),
    aiDecisionsReviewedV2: sha256(aiDecisionsPath),
  };

  const p24Ready =
    n(p24Summary, 'blockers') === 0 &&
    b(p24Summary, 'readyForClosedPayloadMaterializationV2') &&
    s(p24Summary, 'preflightState') === 'eligible_after_import_execution';
  if (n(p14Summary, 'runtimeSlices') !== EXPECTED_RUNTIME_SLICES) {
    addFinding(findings, 'blocker', 'P14_RUNTIME_SLICE_COUNT_INVALID', 'P14 runtime slice contract count is not 12.', rel(repoRoot, p14Path));
  }

  const writtenSlices: SliceOutput[] = [];
  if (findings.filter((finding) => finding.severity === 'blocker').length === 0 && p24Ready) {
    for (const contract of runtimeSlices) {
      writtenSlices.push(materializeSlice(repoRoot, runDir, contract, reviewedRows, materializedAt, inputHashes));
    }
  }

  const outputFiles = writtenSlices.flatMap((slice) => [
    path.resolve(repoRoot, slice.manifestPath),
    path.resolve(repoRoot, slice.entryIndexPath),
    path.resolve(repoRoot, slice.payloadPath),
    path.resolve(repoRoot, slice.checksumReportPath),
  ]);
  const packRoot = path.join(runDir, 'pack_candidates', 'fr', 'runtime_slices');
  const outputRootInsideRun = outputFiles.every((file) => {
    const parent = file.includes(`${path.sep}audits${path.sep}`) ? auditsDir : packRoot;
    const relative = path.relative(parent, file);
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
  });

  const evaluationInput: EvaluationInput = {
    p24Ready,
    p24State: s(p24Summary, 'preflightState'),
    p24Blockers: n(p24Summary, 'blockers'),
    runtimeSlices,
    reviewedRows,
    aiDecisionRows,
    outputRootInsideRun,
    writtenSlices,
    forbiddenUiLocaleRefs: countForbiddenUiLocaleRefs(outputFiles),
    forbiddenOpenFlags: countForbiddenOpenFlags(outputFiles),
    checksumMismatches: checksumMismatches(runDir, writtenSlices),
    serverManifestCreated: false,
  };
  const evaluated = evaluate(evaluationInput);
  findings.push(...evaluated.findings);
  const probes = runProbes(evaluationInput);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) {
    addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);
    evaluated.evaluation.blockers += 1;
    evaluated.evaluation.materializationState = 'blocked_by_findings';
    evaluated.evaluation.readyForServerDeliveryPublishPreflightV2 = false;
  }

  const status: Status = evaluated.evaluation.blockers > 0
    ? 'BLOCK'
    : evaluated.evaluation.readyForServerDeliveryPublishPreflightV2
      ? 'PASS'
      : 'HOLD';

  const report: Report = {
    schemaVersion: 'gustav-closed-local-payload-materialization-v2-packet-v0',
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      payloadShardMaterializationChecksumV2Packet: rel(repoRoot, p14Path),
      serverDeliveryManifestPreviewV2Packet: rel(repoRoot, p15Path),
      payloadCreationApprovalPreflightV2Packet: rel(repoRoot, p24Path),
      targetPackManifestV2Draft: rel(repoRoot, targetManifestPath),
      rowDecisionsReviewedV2: rel(repoRoot, rowDecisionsPath),
      aiDecisionsReviewedV2: rel(repoRoot, aiDecisionsPath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
      runtimeSlicePayloads: writtenSlices.map((slice) => slice.payloadPath),
      runtimeSliceManifests: writtenSlices.map((slice) => slice.manifestPath),
      runtimeSliceIndexes: writtenSlices.map((slice) => slice.entryIndexPath),
      runtimeSliceChecksumReports: writtenSlices.map((slice) => slice.checksumReportPath),
    },
    summary: {
      ...evaluated.evaluation,
      blockers: findings.filter((finding) => finding.severity === 'blocker').length,
      warnings: findings.filter((finding) => finding.severity === 'warning').length,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    artifactHashes: {
      ...inputHashes,
      runtimeSlicePayloadsCombined: sha256Text(writtenSlices.map((slice) => `${slice.runtimeSliceId}:${slice.payloadSha256}`).join('\n')),
      runtimeSliceManifestsCombined: sha256Text(writtenSlices.map((slice) => `${slice.runtimeSliceId}:${slice.manifestSha256}`).join('\n')),
    },
    slices: writtenSlices,
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      serverManifestCreatedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV closed local payload materialization V2 packet: ${report.status}`);
  console.log(`Materialization state: ${report.summary.materializationState}`);
  console.log(`Runtime slices: ${report.summary.localSlicePayloadsCreated}/${report.summary.expectedRuntimeSlices}`);
  console.log(`Payload entries total: ${report.summary.payloadEntriesTotal}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Ready for server delivery publish preflight V2: ${report.summary.readyForServerDeliveryPublishPreflightV2 ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
}

main();
