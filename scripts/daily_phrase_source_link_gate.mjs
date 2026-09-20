import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_LINK_CONTRACT_VERSION = 'daily-phrase-source-link-v1';

function issue(rowId, code, message) {
  return { rowId: rowId || '__unknown__', code, message };
}

function same(left, right) {
  return left === right;
}

function lexicalTarget(value) {
  return (String(value).normalize('NFKC').toLocaleLowerCase('und').match(/[\p{L}\p{N}]+/gu) ?? []).join(' ');
}

function containsLexicalTarget(example, target) {
  const exampleWords = lexicalTarget(example).split(' ').filter(Boolean);
  const targetWords = lexicalTarget(target).split(' ').filter(Boolean);
  if (targetWords.length === 0) return false;
  return exampleWords.some((_, start) => targetWords.every((word, index) => exampleWords[start + index] === word));
}

const REQUIRED_TRANSLATION_FIELDS = ['literal_ru', 'meaning_ru', 'literal_uk', 'meaning_uk'];
const FACTORY_TRANSLATION_PLACEHOLDER = /(?:будет\s+(?:написан\p{L}*|сформулирован\p{L}*)\s+после[\s\S]*провер\p{L}*|буде\s+(?:написан\p{L}*|сформульован\p{L}*)\s+після[\s\S]*перевір\p{L}*)/iu;

function isBlank(value) {
  return typeof value !== 'string' || value.trim().length === 0;
}

export function evaluateDailyPhraseSourceLinks(input, requestedIds = null) {
  const bankRows = Array.isArray(input?.bank?.rows) ? input.bank.rows : [];
  const ledgerRows = Array.isArray(input?.ledger?.rows) ? input.ledger.rows : [];
  const links = Array.isArray(input?.linkage?.linkedCandidateRows)
    ? input.linkage.linkedCandidateRows
    : [];
  const issues = [];
  const requested = requestedIds ? new Set(requestedIds.map(String)) : null;
  const rows = requested
    ? bankRows.filter((row) => requested.has(String(row?.id)))
    : bankRows.filter((row) => row?.candidateStatus === 'CANDIDATE_PENDING_INDEPENDENT_REVIEW');

  if (requested && rows.length !== requested.size) {
    const found = new Set(rows.map((row) => String(row?.id)));
    for (const id of requested) {
      if (!found.has(id)) issues.push(issue(id, 'candidate.missing', 'Requested bank row does not exist'));
    }
  }

  const linkGroups = new Map();
  for (const link of links) {
    const id = String(link?.rowId ?? '');
    const group = linkGroups.get(id) ?? [];
    group.push(link);
    linkGroups.set(id, group);
  }

  const ledgerPath = String(input?.linkage?.authoritativeLedger?.path || 'cvc-source-ledger.json');

  for (const row of rows) {
    const rowId = String(row?.id ?? '');
    if (row?.candidateStatus !== 'CANDIDATE_PENDING_INDEPENDENT_REVIEW') {
      issues.push(issue(rowId, 'candidate.not_authored', 'Requested row is still HOLD or has an unsupported status'));
    } else {
      for (const field of REQUIRED_TRANSLATION_FIELDS) {
        if (isBlank(row?.[field])) {
          issues.push(issue(rowId, `translation.${field}_missing`, `${field} is required for an authored candidate row`));
        } else if (FACTORY_TRANSLATION_PLACEHOLDER.test(row[field])) {
          issues.push(issue(rowId, `translation.${field}_factory_placeholder`, `${field} still contains factory placeholder language`));
        }
      }
    }

    const matchingLinks = linkGroups.get(rowId) ?? [];
    if (matchingLinks.length === 0) {
      issues.push(issue(rowId, 'linkage.missing', 'No explicit source-ledger linkage exists for this row'));
      continue;
    }
    if (matchingLinks.length > 1) {
      issues.push(issue(rowId, 'linkage.duplicate', 'More than one source-ledger linkage exists for this row'));
      continue;
    }

    const link = matchingLinks[0];
    const cvcRow = link?.cvcRow;
    if (!Number.isInteger(cvcRow) || cvcRow < 0 || cvcRow >= ledgerRows.length) {
      issues.push(issue(rowId, 'linkage.invalid_ledger_row', `Invalid CVC row index: ${String(cvcRow)}`));
      continue;
    }

    const authority = ledgerRows[cvcRow];
    const evidence = row?.sourceEvidence ?? {};
    const expectedRef = `${ledgerPath}#rows[${cvcRow}]`;

    if (lexicalTarget(row?.targetText) !== lexicalTarget(authority?.targetText)) {
      issues.push(issue(rowId, 'target.mismatch', 'targetText does not preserve the exact lexical sequence from the linked CVC row'));
    }
    if (!containsLexicalTarget(row?.targetExample, row?.targetText)) {
      issues.push(issue(rowId, 'target_example.target_missing', 'targetExample must include the exact lexical sequence from targetText'));
    }
    if (!same(link?.sourceId, authority?.sourceId)) {
      issues.push(issue(rowId, 'linkage.source_id_mismatch', 'Link manifest sourceId does not match the CVC row'));
    }
    if (!same(evidence?.sourceLedgerRef, expectedRef)) {
      issues.push(issue(rowId, 'evidence.ledger_ref_mismatch', `Expected sourceLedgerRef ${expectedRef}`));
    }

    const exactFields = [
      ['sourceId', 'source_id_mismatch'],
      ['sourceUrl', 'source_url_mismatch'],
      ['httpStatus', 'http_status_mismatch'],
      ['definitionQuote', 'definition_quote_mismatch'],
      ['usageMarker', 'usage_marker_mismatch'],
    ];
    for (const [field, suffix] of exactFields) {
      if (!same(evidence?.[field], authority?.[field])) {
        issues.push(issue(rowId, `evidence.${suffix}`, `${field} does not exactly match the linked CVC row`));
      }
    }

    if (input?.ledger?.source && !same(evidence?.sourceType, input.ledger.source)) {
      issues.push(issue(rowId, 'evidence.source_type_mismatch', 'sourceType does not match the authoritative ledger source'));
    }
    if (input?.ledger?.checkedAt && !same(evidence?.checkedAt, input.ledger.checkedAt)) {
      issues.push(issue(rowId, 'evidence.checked_at_mismatch', 'checkedAt does not match the authoritative ledger snapshot'));
    }
  }

  if (rows.length === 0 && issues.length === 0) {
    issues.push(issue('__batch__', 'batch.empty', 'At least one authored Daily Phrase row is required'));
  }

  return {
    contractVersion: SOURCE_LINK_CONTRACT_VERSION,
    verdict: issues.length === 0 ? 'PASS' : 'HOLD',
    checkedRows: rows.map((row) => String(row?.id ?? '__unknown__')),
    issues,
  };
}

function parseCliArgs(argv) {
  const [bankPath, ledgerPath, linkagePath, ...rest] = argv;
  let ids = null;
  for (let index = 0; index < rest.length; index += 1) {
    if (rest[index] === '--ids') {
      ids = String(rest[index + 1] ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      index += 1;
    }
  }
  return { bankPath, ledgerPath, linkagePath, ids };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8'));
}

function runCli() {
  const { bankPath, ledgerPath, linkagePath, ids } = parseCliArgs(process.argv.slice(2));
  if (!bankPath || !ledgerPath || !linkagePath) {
    console.error('Usage: node scripts/daily_phrase_source_link_gate.mjs <bank.json> <source-ledger.json> <linkage.json> [--ids id1,id2]');
    process.exitCode = 2;
    return;
  }

  const result = evaluateDailyPhraseSourceLinks({
    bank: readJson(bankPath),
    ledger: readJson(ledgerPath),
    linkage: readJson(linkagePath),
  }, ids);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.verdict === 'PASS' ? 0 : 1;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) runCli();
