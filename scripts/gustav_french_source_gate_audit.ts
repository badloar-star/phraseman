import * as fs from 'node:fs';
import * as path from 'node:path';
import { LESSON_1_PHRASES } from '../app/lesson_data_1_8';
import { LESSON_19_PHRASES } from '../app/lesson_data_17_24';
import { FRENCH_CONTENT_SOURCE_GATE } from '../app/french_content_source_gate';
import { FRENCH_DRAFT_INTRO_LESSON_IDS, FRENCH_INTRO_LESSON_IDS } from '../app/lesson_intro_screens_fr';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  filePath?: string;
};

type EvidenceClaim = {
  claimId: string;
  sourceType: string;
  sourceName: string;
  sourceUrl?: string;
  accessDate?: string;
  directQuote?: string;
  reviewerStatus: string;
};

type EvidenceLedger = {
  schemaVersion: string;
  runId: string;
  studyTarget: string;
  sourceLocales: string[];
  claims: EvidenceClaim[];
};

type LessonRowLedgerRow = {
  phraseId: string;
  englishBase: string;
  russianMeaning: string;
  ukrainianMeaning: string;
  proposedFrench: null;
  wordsFr: null;
  evidenceClaimIds: string[];
  requiredEvidence: string[];
  reviewerStatus: 'blocked_pending_source_review';
  activationStatus: 'blocked';
};

type LessonRowLedger = {
  schemaVersion: 'gustav-french-lesson-row-ledger-v0';
  runId: string;
  lessonId: number;
  studyTarget: 'fr';
  sourceLocales: ['ru', 'uk'];
  sourceFile: string;
  activationStatus: 'blocked_pending_source_review';
  activeAppSeedAllowed: false;
  rows: LessonRowLedgerRow[];
};

type Audit = {
  schemaVersion: 'gustav-french-source-gate-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    activeSeedLessonLimit: number;
    draftSeedLessonLimit: number;
    nextBlockedLessonId: number;
    evidenceClaims: number;
    acceptedClaims: number;
    rowLedgerRows: number;
    rowLedgerProposedFrenchRows: number;
    blockers: number;
    warnings: number;
    mayActivateNextLesson: boolean;
  };
  artifacts: {
    evidenceLedger: string;
    lessonSourceGate: string;
    lessonRowLedger: string;
    appSeedFile: string;
    introScreenFile: string;
  };
  findings: Finding[];
};

const NEXT_LESSON_PHRASES = new Map<number, typeof LESSON_1_PHRASES | typeof LESSON_19_PHRASES>([
  [1, LESSON_1_PHRASES],
  [19, LESSON_19_PHRASES],
]);

function lessonSourceGateFileName(lessonId: number): string {
  if (lessonId === 1) return 'lesson1_starter_source_gate.md';
  return `lesson${lessonId}_place_prepositions_source_gate.md`;
}

function lessonSourceFileName(lessonId: number): string {
  if (lessonId <= 8) return 'app/lesson_data_1_8.ts';
  if (lessonId <= 16) return 'app/lesson_data_9_16.ts';
  if (lessonId <= 24) return 'app/lesson_data_17_24.ts';
  return 'app/lesson_data_25_32.ts';
}

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function readJson<T>(filePath: string, findings: Finding[]): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch (error) {
    findings.push({
      severity: 'blocker',
      code: 'json_parse_failed',
      message: `${filePath}: ${(error as Error).message}`,
      filePath,
    });
    return null;
  }
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function buildBlockedRowLedger(runId: string, lessonId: number): LessonRowLedger {
  const phrases = NEXT_LESSON_PHRASES.get(lessonId);
  if (!phrases) throw new Error(`No English base phrase export registered for lesson ${lessonId}`);
  return {
    schemaVersion: 'gustav-french-lesson-row-ledger-v0',
    runId,
    lessonId,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    sourceFile: lessonSourceFileName(lessonId),
    activationStatus: 'blocked_pending_source_review',
    activeAppSeedAllowed: false,
    rows: phrases.map((phrase) => ({
      phraseId: String(phrase.id),
      englishBase: phrase.english,
      russianMeaning: phrase.russian,
      ukrainianMeaning: phrase.ukrainian,
      proposedFrench: null,
      wordsFr: null,
      evidenceClaimIds: [],
      requiredEvidence: [
        'bilingual_dictionary_or_parallel_source',
        'french_grammar_reference',
        'ru_uk_meaning_review',
      ],
      reviewerStatus: 'blocked_pending_source_review',
      activationStatus: 'blocked',
    })),
  };
}

function validateEvidenceLedger(
  ledger: EvidenceLedger | null,
  runId: string,
  lessonId: number,
  findings: Finding[],
  filePath: string,
): void {
  if (!ledger) return;
  if (ledger.schemaVersion !== 'gustav-evidence-ledger-v0') {
    findings.push({ severity: 'blocker', code: 'bad_evidence_schema', message: 'Evidence ledger schemaVersion mismatch.', filePath });
  }
  if (ledger.runId !== runId) {
    findings.push({ severity: 'blocker', code: 'bad_evidence_run_id', message: `Evidence ledger runId must be ${runId}.`, filePath });
  }
  if (ledger.studyTarget !== 'fr') {
    findings.push({ severity: 'blocker', code: 'bad_evidence_target', message: 'Evidence ledger must be for studyTarget=fr.', filePath });
  }
  if (JSON.stringify(ledger.sourceLocales) !== JSON.stringify(['ru', 'uk'])) {
    findings.push({ severity: 'blocker', code: 'bad_evidence_source_locales', message: 'Evidence ledger must be scoped to RU/UK source locales.', filePath });
  }
  if (!Array.isArray(ledger.claims) || ledger.claims.length === 0) {
    findings.push({ severity: 'blocker', code: 'missing_evidence_claims', message: 'Evidence ledger must contain claims before any French content work.', filePath });
    return;
  }

  const claimIds = new Set<string>();
  for (const claim of ledger.claims) {
    if (claimIds.has(claim.claimId)) {
      findings.push({ severity: 'blocker', code: 'duplicate_claim_id', message: `Duplicate evidence claimId: ${claim.claimId}`, filePath });
    }
    claimIds.add(claim.claimId);

    if (claim.sourceType !== 'manual_product_decision' && (!claim.sourceUrl || !claim.accessDate)) {
      findings.push({ severity: 'blocker', code: 'missing_source_url_or_access_date', message: `Claim ${claim.claimId} needs sourceUrl and accessDate.`, filePath });
    }
    if (claim.directQuote && words(claim.directQuote) > 25) {
      findings.push({ severity: 'blocker', code: 'quote_too_long', message: `Claim ${claim.claimId} directQuote exceeds 25 words.`, filePath });
    }
  }

  const acceptedActivationBlock = ledger.claims.some((claim) => (
    claim.claimId === `fr-l${lessonId}-app-activation-block`
    && claim.reviewerStatus === 'accepted'
  ));
  if (!acceptedActivationBlock) {
    findings.push({
      severity: 'blocker',
      code: 'missing_accepted_activation_block',
      message: `Ledger must contain accepted fr-l${lessonId}-app-activation-block.`,
      filePath,
    });
  }
}

function validateRowLedger(ledger: LessonRowLedger | null, runId: string, lessonId: number, findings: Finding[], filePath: string): void {
  if (!ledger) return;
  if (ledger.schemaVersion !== 'gustav-french-lesson-row-ledger-v0') {
    findings.push({ severity: 'blocker', code: 'bad_row_ledger_schema', message: 'Lesson row ledger schemaVersion mismatch.', filePath });
  }
  if (ledger.runId !== runId || ledger.lessonId !== lessonId || ledger.studyTarget !== 'fr') {
    findings.push({ severity: 'blocker', code: 'bad_row_ledger_scope', message: 'Lesson row ledger scope must match current French source gate.', filePath });
  }
  if (ledger.activationStatus !== 'blocked_pending_source_review' || ledger.activeAppSeedAllowed !== false) {
    findings.push({ severity: 'blocker', code: 'row_ledger_not_blocked', message: 'Lesson row ledger must be blocked before accepted review.', filePath });
  }
  if (!Array.isArray(ledger.rows) || ledger.rows.length !== 50) {
    findings.push({ severity: 'blocker', code: 'bad_row_count', message: 'Lesson row ledger must contain exactly 50 English base rows.', filePath });
    return;
  }

  const ids = new Set<string>();
  for (const row of ledger.rows) {
    ids.add(row.phraseId);
    if (row.proposedFrench !== null || row.wordsFr !== null) {
      findings.push({ severity: 'blocker', code: 'unsourced_french_in_row_ledger', message: `Row ${row.phraseId} has French content before accepted source review.`, filePath });
    }
    if (row.reviewerStatus !== 'blocked_pending_source_review' || row.activationStatus !== 'blocked') {
      findings.push({ severity: 'blocker', code: 'row_not_blocked', message: `Row ${row.phraseId} is not blocked.`, filePath });
    }
    for (const field of ['englishBase', 'russianMeaning', 'ukrainianMeaning'] as const) {
      if (!row[field]) {
        findings.push({ severity: 'blocker', code: 'missing_source_row_text', message: `Row ${row.phraseId} is missing ${field}.`, filePath });
      }
    }
  }
  for (let index = 1; index <= 50; index += 1) {
    if (!ids.has(`lesson${lessonId}_phrase_${index}`)) {
      findings.push({ severity: 'blocker', code: 'missing_phrase_id', message: `Missing lesson${lessonId}_phrase_${index}.`, filePath });
    }
  }
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV French Source Gate Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Active seed lesson limit: ${audit.summary.activeSeedLessonLimit}`,
    `- Draft seed lesson limit: ${audit.summary.draftSeedLessonLimit}`,
    `- Next blocked lesson id: ${audit.summary.nextBlockedLessonId}`,
    `- Evidence claims: ${audit.summary.evidenceClaims}`,
    `- Accepted claims: ${audit.summary.acceptedClaims}`,
    `- Row ledger rows: ${audit.summary.rowLedgerRows}`,
    `- Row ledger proposed French rows: ${audit.summary.rowLedgerProposedFrenchRows}`,
    `- May activate next lesson: ${audit.summary.mayActivateNextLesson ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Artifacts',
    '',
    `- Evidence ledger: \`${audit.artifacts.evidenceLedger}\``,
    `- Lesson source gate: \`${audit.artifacts.lessonSourceGate}\``,
    `- Lesson row ledger: \`${audit.artifacts.lessonRowLedger}\``,
    `- App seed file: \`${audit.artifacts.appSeedFile}\``,
    `- Intro screen file: \`${audit.artifacts.introScreenFile}\``,
    '',
    '## Findings',
    '',
  ];

  if (audit.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of audit.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
      if (finding.filePath) lines.push(`  - file: \`${finding.filePath}\``);
    }
  }
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_french_source_gate_audit.ts --run docs/gustav/runs/<runId> [--write-row-ledger]');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const findings: Finding[] = [];
  const lessonId = FRENCH_CONTENT_SOURCE_GATE.nextBlockedLessonId;
  const researchDir = path.join(runDir, 'research');
  const auditDir = path.join(runDir, 'audits');
  const evidenceLedgerPath = path.join(researchDir, 'evidence_ledger.json');
  const lessonSourceGatePath = path.join(researchDir, lessonSourceGateFileName(lessonId));
  const rowLedgerPath = path.join(researchDir, `lesson${lessonId}_row_ledger.json`);
  const appSeedPath = path.join(repoRoot, 'app', 'lesson_data_fr_seed.ts');
  const introPath = path.join(repoRoot, 'app', 'lesson_intro_screens_fr.ts');

  if (hasFlag('--write-row-ledger')) {
    writeJson(rowLedgerPath, buildBlockedRowLedger(runId, lessonId));
  }

  const appSeedSource = fs.readFileSync(appSeedPath, 'utf8');
  const introSource = fs.readFileSync(introPath, 'utf8');
  const activeSeedLessons = Array.from(appSeedSource.matchAll(/const LESSON_(\d+)_FRENCH_SEED/g))
    .map((match) => Number(match[1]));
  if (!appSeedSource.includes('assertFrenchLessonAppSeedApproved(lessonId)')) {
    findings.push({
      severity: 'blocker',
      code: 'app_seed_runtime_guard_missing',
      message: 'French lesson seed application must assert source-gate approval at runtime.',
      filePath: path.relative(repoRoot, appSeedPath),
    });
  }
  if (!introSource.includes('assertFrenchLessonIntroApproved(lessonId)')) {
    findings.push({
      severity: 'blocker',
      code: 'intro_runtime_guard_missing',
      message: 'French intro screen lookup must assert source-gate approval at runtime.',
      filePath: path.relative(repoRoot, introPath),
    });
  }
  if (!introSource.includes('assertFrenchIntroScreensRichShape(lessonId, screens)')) {
    findings.push({
      severity: 'blocker',
      code: 'intro_rich_shape_guard_missing',
      message: 'French intro screen lookup must validate the connected rich RU/UK intro shape before returning runtime screens.',
      filePath: path.relative(repoRoot, introPath),
    });
  }
  if (!introSource.includes('validateFrenchIntroScreenShape')) {
    findings.push({
      severity: 'blocker',
      code: 'intro_shape_validator_missing',
      message: 'French intro screens need a reusable validator so legacy text-only drafts cannot be activated.',
      filePath: path.relative(repoRoot, introPath),
    });
  }
  const maxSeedLesson = activeSeedLessons.length > 0 ? Math.max(...activeSeedLessons) : 0;
  if (maxSeedLesson !== FRENCH_CONTENT_SOURCE_GATE.draftSeedLessonLimit) {
    findings.push({
      severity: 'blocker',
      code: 'draft_seed_limit_mismatch',
      message: `Draft French seed max is ${maxSeedLesson}, expected ${FRENCH_CONTENT_SOURCE_GATE.draftSeedLessonLimit}.`,
      filePath: path.relative(repoRoot, appSeedPath),
    });
  }
  if (FRENCH_CONTENT_SOURCE_GATE.activeSeedLessonLimit !== FRENCH_CONTENT_SOURCE_GATE.approvedAppSeedLessonIds.length) {
    findings.push({
      severity: 'blocker',
      code: 'active_seed_approval_mismatch',
      message: 'Active French seed count must match approvedAppSeedLessonIds.',
      filePath: path.relative(repoRoot, appSeedPath),
    });
  }
  if (FRENCH_INTRO_LESSON_IDS.some((lesson) => !FRENCH_CONTENT_SOURCE_GATE.approvedIntroLessonIds.includes(lesson))) {
    findings.push({
      severity: 'blocker',
      code: 'intro_without_approval',
      message: 'Runtime French intro lesson ids must be approved before activation.',
      filePath: path.relative(repoRoot, introPath),
    });
  }
  if (FRENCH_DRAFT_INTRO_LESSON_IDS.length !== FRENCH_CONTENT_SOURCE_GATE.draftSeedLessonLimit) {
    findings.push({
      severity: 'blocker',
      code: 'draft_intro_limit_mismatch',
      message: `Draft French intro count is ${FRENCH_DRAFT_INTRO_LESSON_IDS.length}, expected ${FRENCH_CONTENT_SOURCE_GATE.draftSeedLessonLimit}.`,
      filePath: path.relative(repoRoot, introPath),
    });
  }
  if (appSeedSource.includes(`LESSON_${lessonId}_FRENCH_SEED`) || appSeedSource.includes(`...LESSON_${lessonId}_FRENCH_SEED`)) {
    findings.push({
      severity: 'blocker',
      code: 'next_lesson_seed_active',
      message: `Lesson ${lessonId} seed is active before source approval.`,
      filePath: path.relative(repoRoot, appSeedPath),
    });
  }
  if (FRENCH_INTRO_LESSON_IDS.includes(lessonId)) {
    findings.push({
      severity: 'blocker',
      code: 'next_lesson_intro_active',
      message: `Lesson ${lessonId} French intro is active before source approval.`,
      filePath: path.relative(repoRoot, introPath),
    });
  }

  const evidenceLedger = readJson<EvidenceLedger>(evidenceLedgerPath, findings);
  validateEvidenceLedger(evidenceLedger, runId, lessonId, findings, path.relative(repoRoot, evidenceLedgerPath));

  if (!fs.existsSync(lessonSourceGatePath)) {
    findings.push({
      severity: 'blocker',
      code: 'missing_lesson_source_gate',
      message: `Missing lesson ${lessonId} source gate markdown.`,
      filePath: path.relative(repoRoot, lessonSourceGatePath),
    });
  } else {
    const sourceGate = fs.readFileSync(lessonSourceGatePath, 'utf8');
    if (!sourceGate.includes('research-only, not approved for app activation')) {
      findings.push({
        severity: 'blocker',
        code: 'lesson_source_gate_not_blocked',
        message: `Lesson ${lessonId} source gate must explicitly remain research-only.`,
        filePath: path.relative(repoRoot, lessonSourceGatePath),
      });
    }
  }

  const rowLedger = fs.existsSync(rowLedgerPath)
    ? readJson<LessonRowLedger>(rowLedgerPath, findings)
    : null;
  if (!rowLedger) {
    findings.push({
      severity: 'blocker',
      code: 'missing_lesson_row_ledger',
      message: `Missing blocked row ledger for lesson ${lessonId}. Run with --write-row-ledger to create it.`,
      filePath: path.relative(repoRoot, rowLedgerPath),
    });
  }
  validateRowLedger(rowLedger, runId, lessonId, findings, path.relative(repoRoot, rowLedgerPath));

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const rowLedgerRows = rowLedger?.rows.length ?? 0;
  const rowLedgerProposedFrenchRows = rowLedger?.rows.filter((row) => row.proposedFrench !== null || row.wordsFr !== null).length ?? 0;
  const audit: Audit = {
    schemaVersion: 'gustav-french-source-gate-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      activeSeedLessonLimit: FRENCH_CONTENT_SOURCE_GATE.activeSeedLessonLimit,
      draftSeedLessonLimit: FRENCH_CONTENT_SOURCE_GATE.draftSeedLessonLimit,
      nextBlockedLessonId: lessonId,
      evidenceClaims: evidenceLedger?.claims.length ?? 0,
      acceptedClaims: evidenceLedger?.claims.filter((claim) => claim.reviewerStatus === 'accepted').length ?? 0,
      rowLedgerRows,
      rowLedgerProposedFrenchRows,
      blockers,
      warnings,
      mayActivateNextLesson: false,
    },
    artifacts: {
      evidenceLedger: path.relative(repoRoot, evidenceLedgerPath),
      lessonSourceGate: path.relative(repoRoot, lessonSourceGatePath),
      lessonRowLedger: path.relative(repoRoot, rowLedgerPath),
      appSeedFile: path.relative(repoRoot, appSeedPath),
      introScreenFile: path.relative(repoRoot, introPath),
    },
    findings,
  };

  fs.mkdirSync(auditDir, { recursive: true });
  writeJson(path.join(auditDir, 'french_source_gate_audit.json'), audit);
  fs.writeFileSync(path.join(auditDir, 'french_source_gate_audit.md'), renderMarkdown(audit));

  console.log(`GUSTAV French source gate audit: ${audit.status}`);
  console.log(`Report: ${path.relative(repoRoot, path.join(auditDir, 'french_source_gate_audit.json'))}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
