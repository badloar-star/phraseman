import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_COUNT = 176;
const AUTHORITY_LEDGER_FILENAME = 'authoritative-source-ledger.json';

function normalized(value) {
  return String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('de');
}

function canonicalRowId(index) {
  return `de-${String(index + 1).padStart(3, '0')}`;
}

function validateAuthorityLedger(ledger) {
  if (ledger?.schemaVersion !== 'daily-phrase-authoritative-source-ledger-v1') {
    throw new Error('German authority ledger must use daily-phrase-authoritative-source-ledger-v1');
  }
  if (ledger?.studyTarget !== 'de') throw new Error('German authority ledger must declare studyTarget=de');
  if (ledger?.requiredCount !== REQUIRED_COUNT) throw new Error('German authority ledger requiredCount must be 176');
  const rows = Array.isArray(ledger?.rows) ? ledger.rows : [];
  if (ledger?.acceptedCount !== rows.length) throw new Error('German authority ledger acceptedCount must equal rows.length');
  if (rows.length > REQUIRED_COUNT) throw new Error('German authority ledger cannot exceed 176 rows');
  if (!Array.isArray(ledger?.sourceHomes) || ledger.sourceHomes.length < 1) {
    throw new Error('German authority ledger must declare sourceHomes');
  }
  if (!Number.isFinite(Date.parse(ledger?.checkedAt))) {
    throw new Error('German authority ledger checkedAt must be ISO-8601');
  }

  const targets = new Set();
  rows.forEach((row, index) => {
    const requiredStrings = [
      'sourceId',
      'sourceName',
      'sourceUrl',
      'retrievalMethod',
      'targetText',
      'definitionQuote',
      'usageMarker',
      'checkedAt',
    ];
    for (const field of requiredStrings) {
      if (!String(row?.[field] ?? '').trim()) throw new Error(`${canonicalRowId(index)} source row is missing ${field}`);
    }
    if (!Number.isInteger(row?.httpStatus) || row.httpStatus < 100 || row.httpStatus > 599) {
      throw new Error(`${canonicalRowId(index)} source row has invalid httpStatus`);
    }
    if (!Number.isFinite(Date.parse(row.checkedAt))) {
      throw new Error(`${canonicalRowId(index)} source row checkedAt must be ISO-8601`);
    }
    const target = normalized(row.targetText);
    if (targets.has(target)) throw new Error('German authority rows must contain unique targetText values');
    targets.add(target);
  });
  return rows;
}

function scaffoldRow(sourceRow, index) {
  return {
    id: canonicalRowId(index),
    order: index + 1,
    studyTarget: 'de',
    sourceLocale: 'ru',
    surface: 'daily_phrase',
    targetText: sourceRow.targetText,
    targetExample: '',
    literal_ru: '',
    meaning_ru: '',
    text_ru: '',
    literal_uk: '',
    meaning_uk: '',
    text_uk: '',
    allowSave: true,
    active: false,
    activationApproved: false,
    candidateStatus: 'SOURCE_SCAFFOLD_HOLD',
  };
}

function unverifiedRow(index) {
  return {
    id: canonicalRowId(index),
    order: index + 1,
    studyTarget: 'de',
    sourceLocale: 'ru',
    surface: 'daily_phrase',
    targetText: '',
    targetExample: '',
    literal_ru: '',
    meaning_ru: '',
    text_ru: '',
    literal_uk: '',
    meaning_uk: '',
    text_uk: '',
    allowSave: true,
    active: false,
    activationApproved: false,
    candidateStatus: 'SOURCE_UNVERIFIED_HOLD',
  };
}

function preservableAuthoredRow(row, scaffold) {
  return row?.candidateStatus === 'CANDIDATE_PENDING_INDEPENDENT_REVIEW'
    && row?.id === scaffold.id
    && row?.order === scaffold.order
    && row?.studyTarget === 'de'
    && row?.sourceLocale === 'ru'
    && row?.surface === 'daily_phrase'
    && row?.active === false
    && row?.activationApproved === false;
}

export function buildGermanDailyPhraseScaffold({ authorityLedger, existingBank = null }) {
  const sourceRows = validateAuthorityLedger(authorityLedger);
  const existingRows = Array.isArray(existingBank?.rows) ? existingBank.rows : [];
  const existingById = new Map(existingRows.map((row) => [String(row?.id ?? ''), row]));
  const rows = Array.from({ length: REQUIRED_COUNT }, (_, index) => {
    const sourceRow = sourceRows[index];
    if (!sourceRow) {
      const existing = existingById.get(canonicalRowId(index));
      if (existing?.candidateStatus === 'CANDIDATE_PENDING_INDEPENDENT_REVIEW') {
        throw new Error(`${canonicalRowId(index)} is authored without current German source evidence`);
      }
      return unverifiedRow(index);
    }
    const scaffold = scaffoldRow(sourceRow, index);
    const existing = existingById.get(scaffold.id);
    if (!existing || existing.candidateStatus !== 'CANDIDATE_PENDING_INDEPENDENT_REVIEW') return scaffold;
    if (!preservableAuthoredRow(existing, scaffold)
      || normalized(existing.targetText) !== normalized(scaffold.targetText)) {
      throw new Error(`${scaffold.id} no longer matches its canonical German source target`);
    }
    return existing;
  });

  const complete = sourceRows.length === REQUIRED_COUNT;
  const status = complete ? 'SOURCE_COMPLETE_HOLD' : 'SOURCE_PARTIAL_HOLD';
  return {
    bank: {
      version: 1,
      schemaVersion: 'daily-phrase-target-source-bank-v1',
      studyTarget: 'de',
      sourceLocale: 'ru',
      surface: 'daily_phrase',
      activationApproved: false,
      candidateStatus: 'HOLD',
      status,
      rows,
    },
    linkage: {
      schemaVersion: 'daily-phrase-source-linkage-v2',
      studyTarget: 'de',
      sourceLocale: 'ru',
      surface: 'daily_phrase',
      status,
      authoritativeLedger: {
        path: AUTHORITY_LEDGER_FILENAME,
        schemaVersion: authorityLedger.schemaVersion,
        source: authorityLedger.source,
        sourceHomes: authorityLedger.sourceHomes,
        checkedAt: authorityLedger.checkedAt,
        requiredCount: REQUIRED_COUNT,
        acceptedCount: sourceRows.length,
        status,
      },
      linkedCandidateRows: sourceRows.map((row, index) => ({
        rowId: canonicalRowId(index),
        ledgerRow: index,
        sourceId: row.sourceId,
      })),
      releasePolicy: 'Source linkage is not editorial approval. German Daily Phrase remains closed until all 176 rows and every independent hash-bound review pass.',
    },
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function runCli() {
  const outputDirectory = path.resolve(process.cwd(), process.argv[2] || 'content/daily-phrases/de');
  const ledgerPath = path.resolve(
    process.cwd(),
    process.argv[3] || path.join(outputDirectory, AUTHORITY_LEDGER_FILENAME),
  );
  const bankPath = path.join(outputDirectory, 'source-bank.json');
  const existingBank = fs.existsSync(bankPath) ? readJson(bankPath) : null;
  const result = buildGermanDailyPhraseScaffold({
    authorityLedger: readJson(ledgerPath),
    existingBank,
  });
  fs.mkdirSync(outputDirectory, { recursive: true });
  writeJson(bankPath, result.bank);
  writeJson(path.join(outputDirectory, 'source-ledger.json'), result.linkage);
  console.log(JSON.stringify({
    status: result.bank.status,
    rows: result.bank.rows.length,
    linkedSources: result.linkage.linkedCandidateRows.length,
    outputDirectory,
  }, null, 2));
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) runCli();
