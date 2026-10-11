import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isStrictUtcInstant } from './daily_phrase_time.mjs';

const REQUIRED_COUNT = 176;
const AUTHORITY_LEDGER_FILENAME = 'authoritative-source-ledger.json';
const canonicalRowId = (index) => `it-${String(index + 1).padStart(3, '0')}`;
const normalized = (value) => String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('it');
const exactText = (value) => typeof value === 'string' && value.trim() === value && value.length > 0;

function validateAuthorityLedger(ledger) {
  if (ledger?.schemaVersion !== 'daily-phrase-authoritative-source-ledger-v1') throw new Error('Italian authority ledger must use daily-phrase-authoritative-source-ledger-v1');
  if (ledger?.studyTarget !== 'it') throw new Error('Italian authority ledger must declare studyTarget=it');
  if (ledger?.requiredCount !== REQUIRED_COUNT) throw new Error('Italian authority ledger requiredCount must be 176');
  const rows = Array.isArray(ledger?.rows) ? ledger.rows : [];
  if (ledger?.acceptedCount !== rows.length) throw new Error('Italian authority ledger acceptedCount must equal rows.length');
  if (rows.length > REQUIRED_COUNT) throw new Error('Italian authority ledger cannot exceed 176 rows');
  if (!exactText(ledger?.source)) throw new Error('Italian authority ledger must declare an exact source string');
  if (!Array.isArray(ledger?.sourceHomes) || ledger.sourceHomes.length < 1 || ledger.sourceHomes.some((home) => !exactText(home))) {
    throw new Error('Italian authority ledger must declare exact string sourceHomes');
  }
  if (ledger?.sourceAliases !== undefined
    && (!Array.isArray(ledger.sourceAliases)
      || ledger.sourceAliases.some((alias) => !exactText(alias)
        || alias === ledger.source
        || !ledger.source.startsWith(`${alias}; `))
      || new Set(ledger.sourceAliases).size !== ledger.sourceAliases.length)) {
    throw new Error('Italian authority ledger sourceAliases must contain unique exact nonblank prior append-only prefixes of source');
  }
  if (!isStrictUtcInstant(ledger?.checkedAt)) throw new Error('Italian authority ledger checkedAt must be a strict UTC instant');
  const targets = new Set();
  rows.forEach((row, index) => {
    for (const field of ['sourceId', 'sourceName', 'sourceUrl', 'retrievalMethod', 'targetText', 'definitionQuote', 'usageMarker', 'checkedAt']) {
      if (!exactText(row?.[field])) throw new Error(`${canonicalRowId(index)} source row requires exact string ${field}`);
    }
    if (!Number.isInteger(row?.httpStatus) || row.httpStatus < 100 || row.httpStatus > 599) throw new Error(`${canonicalRowId(index)} source row has invalid httpStatus`);
    if (!isStrictUtcInstant(row.checkedAt)) throw new Error(`${canonicalRowId(index)} source row checkedAt must be a strict UTC instant`);
    const target = normalized(row.targetText);
    if (targets.has(target)) throw new Error('Italian authority rows must contain unique targetText values');
    targets.add(target);
  });
  return rows;
}

function closedRow(index, sourceRow = null) {
  return { id: canonicalRowId(index), order: index + 1, studyTarget: 'it', sourceLocale: 'ru', surface: 'daily_phrase', targetText: sourceRow?.targetText ?? '', targetExample: '', literal_ru: '', meaning_ru: '', text_ru: '', literal_uk: '', meaning_uk: '', text_uk: '', allowSave: true, active: false, activationApproved: false, candidateStatus: sourceRow ? 'SOURCE_SCAFFOLD_HOLD' : 'SOURCE_UNVERIFIED_HOLD' };
}

function preservableAuthoredRow(row, scaffold) {
  return row?.candidateStatus === 'CANDIDATE_PENDING_INDEPENDENT_REVIEW'
    && row?.id === scaffold.id && row?.order === scaffold.order && row?.studyTarget === 'it'
    && row?.sourceLocale === 'ru' && row?.surface === 'daily_phrase'
    && row?.active === false && row?.activationApproved === false;
}

export function buildItalianDailyPhraseScaffold({ authorityLedger, existingBank = null }) {
  const sourceRows = validateAuthorityLedger(authorityLedger);
  const existingById = new Map((Array.isArray(existingBank?.rows) ? existingBank.rows : []).map((row) => [String(row?.id ?? ''), row]));
  const rows = Array.from({ length: REQUIRED_COUNT }, (_, index) => {
    const sourceRow = sourceRows[index];
    const existing = existingById.get(canonicalRowId(index));
    if (!sourceRow) {
      if (existing?.candidateStatus === 'CANDIDATE_PENDING_INDEPENDENT_REVIEW') throw new Error(`${canonicalRowId(index)} is authored without current Italian source evidence`);
      return closedRow(index);
    }
    const scaffold = closedRow(index, sourceRow);
    if (!existing || existing.candidateStatus !== 'CANDIDATE_PENDING_INDEPENDENT_REVIEW') return scaffold;
    if (!preservableAuthoredRow(existing, scaffold) || normalized(existing.targetText) !== normalized(scaffold.targetText)) throw new Error(`${scaffold.id} no longer matches its canonical Italian source target`);
    return existing;
  });
  const status = sourceRows.length === REQUIRED_COUNT ? 'SOURCE_COMPLETE_HOLD' : 'SOURCE_PARTIAL_HOLD';
  return { bank: { version: 1, schemaVersion: 'daily-phrase-target-source-bank-v1', studyTarget: 'it', sourceLocale: 'ru', surface: 'daily_phrase', activationApproved: false, candidateStatus: 'HOLD', status, rows }, linkage: { schemaVersion: 'daily-phrase-source-linkage-v2', studyTarget: 'it', sourceLocale: 'ru', surface: 'daily_phrase', status, authoritativeLedger: { path: AUTHORITY_LEDGER_FILENAME, schemaVersion: authorityLedger.schemaVersion, source: authorityLedger.source, sourceHomes: authorityLedger.sourceHomes, ...(authorityLedger.sourceAliases === undefined ? {} : { sourceAliases: authorityLedger.sourceAliases }), checkedAt: authorityLedger.checkedAt, requiredCount: REQUIRED_COUNT, acceptedCount: sourceRows.length, status }, linkedCandidateRows: sourceRows.map((row, index) => ({ rowId: canonicalRowId(index), ledgerRow: index, sourceId: row.sourceId })), releasePolicy: 'Source linkage is not editorial approval. Italian Daily Phrase remains closed until all 176 rows and every independent hash-bound review pass.' } };
}

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
function writeJson(filePath, value) { fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function runCli() {
  const outputDirectory = path.resolve(process.cwd(), process.argv[2] || 'content/daily-phrases/it');
  const ledgerPath = path.resolve(process.cwd(), process.argv[3] || path.join(outputDirectory, AUTHORITY_LEDGER_FILENAME));
  const bankPath = path.join(outputDirectory, 'source-bank.json');
  const result = buildItalianDailyPhraseScaffold({ authorityLedger: readJson(ledgerPath), existingBank: fs.existsSync(bankPath) ? readJson(bankPath) : null });
  fs.mkdirSync(outputDirectory, { recursive: true });
  writeJson(bankPath, result.bank); writeJson(path.join(outputDirectory, 'source-ledger.json'), result.linkage);
  console.log(JSON.stringify({ status: result.bank.status, rows: result.bank.rows.length, linkedSources: result.linkage.linkedCandidateRows.length, outputDirectory }, null, 2));
}
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) runCli();
