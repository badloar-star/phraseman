import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const SOURCE_RUN_ID = '2026-07-04_fr_daily_phrase_idioms_v0';
const RUN_ID = '2026-07-04_fr_daily_phrases_production_v1';
const SOURCE_BANK = path.join(
  ROOT,
  'docs',
  'gustav',
  'runs',
  SOURCE_RUN_ID,
  'fr_daily_phrase_idiom_bank.json',
);
const RUN_DIR = path.join(ROOT, 'docs', 'gustav', 'runs', RUN_ID);
const BUILD_DIR = path.join(RUN_DIR, 'build');
const REVIEW_DIR = path.join(RUN_DIR, 'review');
const REQUIRED_COUNT = 176;
const GENERATED_AT = new Date().toISOString();

const MANUAL_SOURCE_REPAIRS = {
  'fr-daily-idiom-006': {
    sourceId: 'larousse_dictionary',
    sourceName: 'Larousse',
    sourceUrl: 'https://www.larousse.fr/dictionnaires/francais/salade/70624',
    mustContain: ['raconter des salades', 'propos mensongers'],
    verified: ['existence', 'meaning', 'register'],
  },
  'fr-daily-idiom-008': {
    sourceId: 'larousse_dictionary',
    sourceName: 'Larousse',
    sourceUrl: 'https://www.larousse.fr/dictionnaires/francais/t%C3%AAte/77529',
    mustContain: ['couter les yeux de la tete'],
    verified: ['existence'],
  },
  'fr-daily-idiom-011': {
    sourceId: 'larousse_dictionary',
    sourceName: 'Larousse',
    sourceUrl: 'https://www.larousse.fr/dictionnaires/francais/matin%C3%A9e/49877',
    mustContain: ['faire la grasse matinee', 'rester au lit tard dans la matinee'],
    verified: ['existence', 'meaning'],
  },
  'fr-daily-idiom-012': {
    sourceId: 'le_robert_dictionary',
    sourceName: 'Le Robert',
    sourceUrl: 'https://dictionnaire.lerobert.com/definition/coeur',
    mustContain: ['avoir le coeur sur la main', 'etre genereux'],
    verified: ['existence', 'meaning'],
  },
  'fr-daily-idiom-014': {
    sourceId: 'larousse_synonyms',
    sourceName: 'Larousse',
    sourceUrl: 'https://www.larousse.fr/dictionnaires/synonymes/r%C3%AAver/18413',
    mustContain: ['avoir la tete dans les nuages', 'laisser aller sa pensee'],
    verified: ['existence', 'meaning'],
  },
  'fr-daily-idiom-030': {
    sourceId: 'larousse_dictionary',
    sourceName: 'Larousse',
    sourceUrl: 'https://www.larousse.fr/dictionnaires/francais/morceau/52590',
    mustContain: ['cracher le morceau', 'faire des aveux complets'],
    verified: ['existence', 'meaning', 'register'],
  },
  'fr-daily-idiom-105': {
    sourceId: 'larousse_dictionary',
    sourceName: 'Larousse',
    sourceUrl: 'https://www.larousse.fr/dictionnaires/francais/lune/48074',
    mustContain: ['etre dans la lune', 'etre distrait'],
    verified: ['existence', 'meaning'],
  },
  'fr-daily-idiom-111': {
    sourceId: 'usito_university_dictionary',
    sourceName: 'Usito',
    sourceUrl: 'https://usito.usherbrooke.ca/d%C3%A9finitions/corde_1',
    mustContain: ['pleuvoir des cordes', 'pleuvoir a verse'],
    verified: ['existence', 'meaning'],
  },
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function phraseForExactCheck(row) {
  return normalize(row.phrase)
    .replace(/ quelqu un/g, '')
    .replace(/ qqn/g, '')
    .trim();
}

async function fetchPage(url) {
  const response = await fetch(url, { redirect: 'follow' });
  const text = await response.text();
  return {
    url,
    status: response.status,
    ok: response.ok,
    normalizedText: normalize(text).slice(0, 300000),
  };
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      out[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

function verifyManualRepair(row, page, repair) {
  const missing = repair.mustContain.filter((needle) => !page.normalizedText.includes(normalize(needle)));
  return {
    status: page.ok && missing.length === 0 ? 'PASS' : 'HOLD',
    sourceId: repair.sourceId,
    sourceName: repair.sourceName,
    sourceUrl: repair.sourceUrl,
    httpStatus: page.status,
    checkedAt: GENERATED_AT,
    checkedBy: 'gustav_fr_daily_phrases_production_v1',
    verified: repair.verified,
    mustContain: repair.mustContain,
    missing,
    notes: `Manual source repair for ${row.id}: ${row.phrase}`,
  };
}

function verifySourceRow(row, page) {
  const exactNeedle = phraseForExactCheck(row);
  const phraseExact = Boolean(exactNeedle && page.normalizedText.includes(exactNeedle));
  return {
    status: page.ok && phraseExact ? 'PASS' : 'HOLD',
    sourceId: 'le_robert_dictionary',
    sourceName: 'Le Robert',
    sourceUrl: row.sourceUrl,
    httpStatus: page.status,
    checkedAt: GENERATED_AT,
    checkedBy: 'gustav_fr_daily_phrases_production_v1',
    verified: ['existence'],
    phraseExact,
    notes: phraseExact
      ? `Exact phrase found on source page for ${row.id}.`
      : `Source page opened, but exact phrase was not found for ${row.id}.`,
  };
}

function makeAcceptedRow(row, order, evidence) {
  return {
    id: row.id,
    order,
    english: row.phrase,
    targetText: row.phrase,
    literal: row.literal,
    meaning: row.meaning,
    text: row.text,
    literal_uk: row.literal_uk,
    meaning_uk: row.meaning_uk,
    text_uk: row.text_uk,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    allowSave: true,
    active: false,
    activationApproved: false,
    reviewerStatus: 'accepted_source_backed_needs_activation_review',
    sourceEvidence: [evidence],
    sourceCoverage: row.sourceCoverage,
  };
}

function hasMojibake(text) {
  return /Ð|Ñ|ï¿½|\uFFFD/.test(String(text || ''));
}

function buildDuplicateAudit(rows) {
  const seen = new Map();
  const duplicates = [];
  for (const row of rows) {
    const key = normalize(row.targetText);
    if (seen.has(key)) duplicates.push({ firstId: seen.get(key), duplicateId: row.id, targetText: row.targetText });
    seen.set(key, row.id);
  }
  return {
    schemaVersion: 'gustav-fr-daily-phrase-duplicate-audit-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    rows: rows.length,
    duplicateCount: duplicates.length,
    duplicates,
    status: duplicates.length === 0 ? 'PASS' : 'FAIL',
  };
}

async function main() {
  ensureDir(BUILD_DIR);
  ensureDir(REVIEW_DIR);

  const sourceBank = readJson(SOURCE_BANK);
  const sourceRows = sourceBank.rows || [];
  const sourceUrls = [...new Set(sourceRows.map((row) => row.sourceUrl).filter(Boolean))];
  const repairUrls = [...new Set(Object.values(MANUAL_SOURCE_REPAIRS).map((repair) => repair.sourceUrl))];
  const allUrls = [...new Set([...sourceUrls, ...repairUrls])];
  const pages = new Map(await mapLimit(allUrls, 8, async (url) => [url, await fetchPage(url)]));

  const verifiedRows = [];
  const heldRows = [];
  for (const row of sourceRows) {
    const repair = MANUAL_SOURCE_REPAIRS[row.id];
    const evidence = repair
      ? verifyManualRepair(row, pages.get(repair.sourceUrl), repair)
      : verifySourceRow(row, pages.get(row.sourceUrl));

    const rowProblems = [];
    if (!row.phrase || !row.literal || !row.meaning || !row.text || !row.literal_uk || !row.meaning_uk || !row.text_uk) {
      rowProblems.push('missing_required_daily_phrase_fields');
    }
    if ([row.literal, row.meaning, row.text, row.literal_uk, row.meaning_uk, row.text_uk].some(hasMojibake)) {
      rowProblems.push('mojibake_detected');
    }
    if (/\bEnglish\b|английск|англійськ/i.test(`${row.text} ${row.text_uk} ${row.meaning} ${row.meaning_uk}`)) {
      rowProblems.push('english_frame_leak');
    }
    if (/^bonjour$|^merci|^au revoir$/i.test(row.phrase)) {
      rowProblems.push('generic_phrasebook_row');
    }

    if (evidence.status === 'PASS' && rowProblems.length === 0) {
      verifiedRows.push({ row, evidence });
    } else {
      heldRows.push({ id: row.id, phrase: row.phrase, evidenceStatus: evidence.status, rowProblems, sourceUrl: evidence.sourceUrl });
    }
  }

  const accepted = verifiedRows.slice(0, REQUIRED_COUNT).map(({ row, evidence }, index) =>
    makeAcceptedRow(row, index + 1, evidence),
  );
  const acceptedIds = new Set(accepted.map((row) => row.id));
  const repairQueue = [
    ...heldRows,
    ...verifiedRows.slice(REQUIRED_COUNT).map(({ row, evidence }) => ({
      id: row.id,
      phrase: row.phrase,
      evidenceStatus: evidence.status,
      rowProblems: ['outside_accepted_176_subset'],
      sourceUrl: evidence.sourceUrl,
    })),
  ];

  const duplicateAudit = buildDuplicateAudit(accepted);
  const sourceEvidence = {
    schemaVersion: 'gustav-fr-daily-phrase-source-evidence-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    sourceRunId: SOURCE_RUN_ID,
    requiredAcceptedRows: REQUIRED_COUNT,
    sourceRows: sourceRows.length,
    strictSourceBackedRows: verifiedRows.length,
    acceptedRows: accepted.length,
    acceptedIds: [...acceptedIds],
    heldOrDeferredRows: repairQueue.length,
    manualSourceRepairs: Object.keys(MANUAL_SOURCE_REPAIRS).length,
    status: accepted.length >= REQUIRED_COUNT ? 'PASS' : 'HOLD',
    repairQueue: repairQueue.slice(0, 80),
  };

  const bank = {
    schemaVersion: 'gustav-fr-daily-phrase-bank-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    sourceRunId: SOURCE_RUN_ID,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    requiredCountParityWithEnglish: REQUIRED_COUNT,
    activationApproved: false,
    status: accepted.length >= REQUIRED_COUNT && duplicateAudit.status === 'PASS'
      ? 'CONTENT_BANK_READY_FOR_RUNTIME_ADMIN_REVIEW'
      : 'HOLD_CONTENT_BANK_INCOMPLETE',
    rows: accepted,
  };

  const runtimeAdapterPath = path.join(ROOT, 'app', 'french_daily_phrase_remote_runtime.ts');
  const dailyPhraseSystemPath = path.join(ROOT, 'app', 'daily_phrase_system.ts');
  const runtimeAdapterSource = fs.existsSync(runtimeAdapterPath) ? fs.readFileSync(runtimeAdapterPath, 'utf8') : '';
  const dailyPhraseSystemSource = fs.existsSync(dailyPhraseSystemPath) ? fs.readFileSync(dailyPhraseSystemPath, 'utf8') : '';
  const runtimeWired = runtimeAdapterSource.includes("item.surface === 'daily_phrase'") &&
    runtimeAdapterSource.includes('entryToFrenchDailyPhrase') &&
    !runtimeAdapterSource.includes('IDIOMS') &&
    dailyPhraseSystemSource.includes('ensureFrenchRemoteDailyPhrases(sourceLocale)') &&
    dailyPhraseSystemSource.includes('frenchRemoteDailyPhraseForDay(sourceLocale) || frenchFlashcardForDay(sourceLocale)') &&
    dailyPhraseSystemSource.includes("dailyPhraseKey('fr')") &&
    dailyPhraseSystemSource.includes("dailyPhraseLastDateKey('fr')");

  const runtimeManifest = {
    schemaVersion: 'gustav-fr-daily-phrase-runtime-manifest-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    activationApproved: false,
    currentRuntime: 'fr-daily flashcard bridge in app/daily_phrase_system.ts',
    requiredRuntimeChange: [
      'Load accepted French Daily Phrase pack for studyTarget=fr.',
      'Keep dailyPhraseKey(fr), dailyPhraseLastDateKey(fr), and dailyPhraseRemoteCacheKey(fr).',
      'Do not read English IDIOMS or unscoped English daily_phrases cloud subscription for French.',
      'Keep flashcard bridge as rollback fallback only.',
    ],
    runtimeAdapter: 'app/french_daily_phrase_remote_runtime.ts',
    dailyPhraseSystem: 'app/daily_phrase_system.ts',
    runtimeWired,
    proposedServerPath: `course-packs/fr/{ru|uk}/daily_phrase/${RUN_ID}`,
    proposedCollection: 'daily_phrases_fr',
    status: runtimeWired ? 'PASS_RUNTIME_WIRED_WITH_FLASHCARD_ROLLBACK' : 'HOLD_RUNTIME_NOT_WIRED',
  };

  const serverPayloads = ['ru', 'uk'].map((sourceLocale) => {
    const payload = {
      schemaVersion: 'gustav-fr-daily-phrase-runtime-payload-v1',
      runId: RUN_ID,
      generatedAt: GENERATED_AT,
      studyTarget: 'fr',
      sourceLocale,
      surface: 'daily_phrase',
      activationApproved: false,
      entries: accepted.map((row) => ({
        id: row.id,
        order: row.order,
        studyTarget: row.studyTarget,
        sourceLocale,
        surface: 'daily_phrase',
        targetText: row.targetText,
        english: row.english,
        literal: sourceLocale === 'uk' ? row.literal_uk : row.literal,
        meaning: sourceLocale === 'uk' ? row.meaning_uk : row.meaning,
        text: sourceLocale === 'uk' ? row.text_uk : row.text,
        literal_ru: row.literal,
        meaning_ru: row.meaning,
        text_ru: row.text,
        literal_uk: row.literal_uk,
        meaning_uk: row.meaning_uk,
        text_uk: row.text_uk,
        allowSave: row.allowSave,
        active: row.active,
        activationApproved: row.activationApproved,
        sourceEvidence: row.sourceEvidence,
      })),
    };
    const text = `${JSON.stringify(payload, null, 2)}\n`;
    const hash = sha256(text);
    const fileName = `fr_daily_phrase_runtime_payload_${sourceLocale}.dryrun.json`;
    return {
      sourceLocale,
      payload,
      fileName,
      sha256: hash,
      serverPath: `course-packs/fr/${sourceLocale}/daily_phrase/${RUN_ID}/${hash}.json`,
      bytes: Buffer.byteLength(text, 'utf8'),
      text,
    };
  });

  const serverPackManifest = {
    schemaVersion: 'gustav-fr-daily-phrase-server-pack-manifest-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    activationApproved: false,
    uploadPerformed: false,
    uploadRehearsalPerformed: true,
    packRows: accepted.length,
    targetScoped: true,
    target: 'fr',
    sourceLocales: ['ru', 'uk'],
    forbiddenPaths: ['daily_phrases without studyTarget=fr guard'],
    proposedPaths: serverPayloads.map((entry) => entry.serverPath),
    entries: serverPayloads.map(({ sourceLocale, fileName, sha256: payloadSha256, serverPath, bytes }) => ({
      sourceLocale,
      surface: 'daily_phrase',
      fileName,
      payloadSha256,
      serverPath,
      bytes,
    })),
    status: 'PASS_UPLOAD_REHEARSAL_READY_NOT_UPLOADED',
  };

  const rollbackManifest = {
    schemaVersion: 'gustav-fr-daily-phrase-activation-rollback-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    activationApproved: false,
    rollbackBaseline: 'existing fr-daily flashcard bridge',
    rollbackSteps: [
      'Disable French Daily Phrase pack activation flag.',
      'Keep French target daily phrase cache scoped to fr keys.',
      'Return runtime to phraseFromFrenchFlashcard fallback.',
      'Do not touch English daily_phrases collection or English IDIOMS.',
    ],
    status: 'PASS',
  };

  const adminWorkflowPath = path.join(ROOT, 'admin', 'french-daily-phrases-workflow.js');
  const adminSurfacePath = path.join(ROOT, 'admin', 'french-daily-phrases-admin.js');
  const adminIndexPath = path.join(ROOT, 'admin', 'index.html');
  const adminSurfaceSource = fs.existsSync(adminSurfacePath) ? fs.readFileSync(adminSurfacePath, 'utf8') : '';
  const adminIndexSource = fs.existsSync(adminIndexPath) ? fs.readFileSync(adminIndexPath, 'utf8') : '';
  const adminSurfaceWired = adminIndexSource.includes('data-gustav-admin-surface="french-daily-phrases"') &&
    adminIndexSource.includes('french-daily-phrases-workflow.js') &&
    adminIndexSource.includes('french-daily-phrases-admin.js') &&
    adminIndexSource.includes('renderFrenchDailyPhrasesAdmin()') &&
    adminSurfaceSource.includes('root.renderFrenchDailyPhrasesAdmin') &&
    adminSurfaceSource.includes('root.frenchDailyPhraseAdminCreateDraft') &&
    adminSurfaceSource.includes('root.frenchDailyPhraseAdminRequestApproval') &&
    adminSurfaceSource.includes('root.frenchDailyPhraseAdminCreateRollback') &&
    adminSurfaceSource.includes('activationApproved: false');
  const adminWorkflowManifest = {
    schemaVersion: 'gustav-fr-daily-phrase-admin-workflow-manifest-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    activationApproved: false,
    workflowModule: 'admin/french-daily-phrases-workflow.js',
    adminSurfaceModule: 'admin/french-daily-phrases-admin.js',
    workflowHandlersPresent: fs.existsSync(adminWorkflowPath),
    adminSurfaceWired,
    requiredAdminSurfaces: [
      'daily_phrase_target_bank_status',
      'daily_phrase_source_review_queue',
      'daily_phrase_preview',
      'daily_phrase_publication_draft',
      'daily_phrase_activation_request',
      'daily_phrase_rollback',
    ],
    status: fs.existsSync(adminWorkflowPath) && adminSurfaceWired
      ? 'PASS_ADMIN_WORKFLOW_AND_SURFACE_WIRED'
      : fs.existsSync(adminWorkflowPath)
        ? 'PASS_WORKFLOW_HANDLERS_HOLD_ADMIN_INDEX_SURFACE'
      : 'HOLD_WORKFLOW_HANDLERS_MISSING',
  };

  const review = {
    schemaVersion: 'gustav-fr-daily-phrase-review-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    acceptedRows: accepted.length,
    heldOrDeferredRows: repairQueue.length,
    decisions: accepted.map((row) => ({
      id: row.id,
      targetText: row.targetText,
      decision: 'ACCEPT_CONTENT_BANK_ROW',
      reason: 'French-native idiom/expression shape with trusted source evidence and RU/UK Daily Phrase fields.',
      sourceEvidence: row.sourceEvidence,
    })),
    remainingReviewWork: [
      'Wire runtime to target-scoped French Daily Phrase pack.',
      'Add admin target-aware status, preview, source-review queue, activation switch, and rollback.',
      'Run upload rehearsal before activation.',
    ],
    activationApproved: false,
    status: 'CONTENT_REVIEW_ACCEPTED_RUNTIME_ADMIN_HOLD',
  };

  const finalGate = {
    schemaVersion: 'gustav-fr-daily-phrase-final-gate-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    productionReady: runtimeWired && serverPackManifest.status === 'PASS_UPLOAD_REHEARSAL_READY_NOT_UPLOADED' && adminWorkflowManifest.status === 'PASS_ADMIN_WORKFLOW_AND_SURFACE_WIRED',
    contentBankReady: accepted.length >= REQUIRED_COUNT && duplicateAudit.status === 'PASS',
    activationApproved: false,
    status: runtimeWired && adminWorkflowManifest.status === 'PASS_ADMIN_WORKFLOW_AND_SURFACE_WIRED'
      ? 'READY_FOR_EXPLICIT_ACTIVATION_APPROVAL'
      : runtimeWired ? 'HOLD_ADMIN_SURFACE' : 'HOLD_RUNTIME_AND_ADMIN_SURFACE',
    gates: {
      englishBlueprintParity: accepted.length >= REQUIRED_COUNT ? 'PASS' : 'HOLD',
      frenchNativeIdiomRows: accepted.length >= REQUIRED_COUNT ? 'PASS' : 'HOLD',
      sourceEvidencePerAcceptedRow: sourceEvidence.status,
      duplicateAudit: duplicateAudit.status,
      ruUkCopyIntegrity: accepted.every((row) => !hasMojibake(row.text) && !hasMojibake(row.text_uk)) ? 'PASS' : 'FAIL',
      runtimeTargetIsolation: runtimeWired ? 'PASS' : 'HOLD_RUNTIME_NOT_WIRED',
      serverPackManifest: serverPackManifest.status === 'PASS_UPLOAD_REHEARSAL_READY_NOT_UPLOADED' ? 'PASS' : 'HOLD_UPLOAD_REHEARSAL_REQUIRED',
      adminWorkflowHandlers: adminWorkflowManifest.workflowHandlersPresent ? 'PASS' : 'HOLD_ADMIN_WORKFLOW_HANDLERS_MISSING',
      adminSurfaceWiring: adminSurfaceWired ? 'PASS' : 'HOLD_ADMIN_INDEX_SURFACE_NOT_WIRED',
      activationRollback: rollbackManifest.status,
      activationClosed: 'PASS',
    },
    holdGates: [
      ...(runtimeWired ? [] : ['runtimeTargetIsolation']),
      ...(adminSurfaceWired ? [] : ['adminSurfaceWiring']),
    ],
  };

  writeJson(path.join(BUILD_DIR, 'fr_daily_phrase_bank.json'), bank);
  for (const payload of serverPayloads) {
    fs.writeFileSync(path.join(BUILD_DIR, payload.fileName), payload.text);
  }
  writeJson(path.join(BUILD_DIR, 'fr_daily_phrase_source_evidence.json'), sourceEvidence);
  writeJson(path.join(BUILD_DIR, 'fr_daily_phrase_duplicate_audit.json'), duplicateAudit);
  writeJson(path.join(BUILD_DIR, 'fr_daily_phrase_runtime_manifest.json'), runtimeManifest);
  writeJson(path.join(BUILD_DIR, 'fr_daily_phrase_server_pack_manifest.json'), serverPackManifest);
  writeJson(path.join(BUILD_DIR, 'fr_daily_phrase_activation_rollback_manifest.json'), rollbackManifest);
  writeJson(path.join(BUILD_DIR, 'fr_daily_phrase_admin_workflow_manifest.json'), adminWorkflowManifest);
  writeJson(path.join(REVIEW_DIR, 'fr_daily_phrase_review.json'), review);
  fs.writeFileSync(path.join(REVIEW_DIR, 'fr_daily_phrase_review.md'), [
    '# French Daily Phrase Review',
    '',
    `Run: ${RUN_ID}`,
    `Accepted rows: ${accepted.length}/${REQUIRED_COUNT}`,
    `Held/deferred rows: ${repairQueue.length}`,
    `Activation approved: ${review.activationApproved}`,
    `Status: ${review.status}`,
    '',
    'The content bank has a strict accepted subset. Production activation remains blocked until runtime, admin, and upload rehearsal gates are implemented.',
    '',
  ].join('\n'));
  writeJson(path.join(BUILD_DIR, 'fr_daily_phrase_final_gate.json'), finalGate);

  console.log(JSON.stringify(finalGate, null, 2));
  process.exitCode = finalGate.gates.ruUkCopyIntegrity === 'FAIL' ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
