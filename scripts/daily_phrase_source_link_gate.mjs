import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  dailyPhraseTargetLexicalSignature,
  evaluateDailyPhraseTargetSurface,
} from './daily_phrase_target_surface.mjs';
import { exactDailyPhraseRowId } from './daily_phrase_row_selection.mjs';
import { isStrictUtcInstant } from './daily_phrase_time.mjs';

export const SOURCE_LINK_CONTRACT_VERSION = 'daily-phrase-source-link-v1';

function issue(rowId, code, message) {
  return { rowId: rowId || '__unknown__', code, message };
}

function same(left, right) {
  return left === right;
}

const REQUIRED_TRANSLATION_FIELDS = ['literal_ru', 'meaning_ru', 'literal_uk', 'meaning_uk'];
const FACTORY_TRANSLATION_PLACEHOLDER = /(?:будет\s+(?:написан\p{L}*|сформулирован\p{L}*)\s+после[\s\S]*провер\p{L}*|буде\s+(?:написан\p{L}*|сформульован\p{L}*)\s+після[\s\S]*перевір\p{L}*)/iu;

function isBlank(value) {
  return typeof value !== 'string' || value.trim().length === 0;
}

function validSourceAliases(ledger, issues) {
  const aliases = ledger?.sourceAliases;
  if (aliases === undefined) return [];
  const valid = Array.isArray(aliases)
    && aliases.every((alias) => typeof alias === 'string'
      && alias.length > 0
      && alias.trim() === alias
      && alias !== ledger?.source
      && typeof ledger?.source === 'string'
      && ledger.source.startsWith(`${alias}; `))
    && new Set(aliases).size === aliases.length;
  if (!valid) {
    issues.push(issue(
      '__batch__',
      'ledger.source_aliases_invalid',
      'sourceAliases must contain unique exact nonblank prior append-only prefixes of source',
    ));
    return [];
  }
  return aliases;
}

function sameExactArrayOrAbsent(left, right) {
  if (left === undefined || right === undefined) return left === right;
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((value, index) => same(value, right[index]));
}

function authoritativeCheckedAt(input, authority) {
  return authority?.checkedAt === undefined
    ? input?.ledger?.checkedAt
    : authority.checkedAt;
}

function validateRequiredEvidence(input, authority, evidence, rowId, issues) {
  const commonStringFields = [
    ['sourceId', 'source_id'],
    ['sourceUrl', 'source_url'],
    ['definitionQuote', 'definition_quote'],
    ['usageMarker', 'usage_marker'],
  ];
  for (const [field, code] of commonStringFields) {
    if (isBlank(authority?.[field])) {
      issues.push(issue(rowId, `authority.${code}_invalid`, `${field} is required on the authoritative source row`));
    }
    if (isBlank(evidence?.[field])) {
      issues.push(issue(rowId, `evidence.${code}_invalid`, `${field} is required in candidate sourceEvidence`));
    }
  }
  if (!Number.isInteger(authority?.httpStatus)
    || authority.httpStatus < 100 || authority.httpStatus > 599) {
    issues.push(issue(rowId, 'authority.http_status_invalid', 'Authoritative httpStatus must be an integer from 100 through 599'));
  }
  if (!Number.isInteger(evidence?.httpStatus)
    || evidence.httpStatus < 100 || evidence.httpStatus > 599) {
    issues.push(issue(rowId, 'evidence.http_status_invalid', 'Candidate httpStatus must be an integer from 100 through 599'));
  }
  if (input?.ledger?.schemaVersion === 'daily-phrase-authoritative-source-ledger-v1') {
    for (const [field, code] of [['sourceName', 'source_name'], ['retrievalMethod', 'retrieval_method']]) {
      if (isBlank(authority?.[field])) {
        issues.push(issue(rowId, `authority.${code}_invalid`, `${field} is required by the dictionary-ledger schema`));
      }
      if (isBlank(evidence?.[field])) {
        issues.push(issue(rowId, `evidence.${code}_invalid`, `${field} is required in candidate dictionary sourceEvidence`));
      }
    }
  }
  if (isBlank(input?.ledger?.source)) {
    issues.push(issue(rowId, 'ledger.source_invalid', 'The authoritative ledger source label is required'));
  }
  if (isBlank(evidence?.sourceType)) {
    issues.push(issue(rowId, 'evidence.source_type_invalid', 'sourceType is required in candidate sourceEvidence'));
  }
  const expectedCheckedAt = authoritativeCheckedAt(input, authority);
  if (!isStrictUtcInstant(expectedCheckedAt)) {
    issues.push(issue(rowId, 'authority.checked_at_invalid', 'A row or ledger checkedAt timestamp is required'));
  }
  if (!isStrictUtcInstant(evidence?.checkedAt)) {
    issues.push(issue(rowId, 'evidence.checked_at_invalid', 'checkedAt is required in candidate sourceEvidence'));
  }
}

export function evaluateDailyPhraseSourceLinks(input, requestedIds = null) {
  const bankRows = Array.isArray(input?.bank?.rows) ? input.bank.rows : [];
  const ledgerRows = Array.isArray(input?.ledger?.rows) ? input.ledger.rows : [];
  const links = Array.isArray(input?.linkage?.linkedCandidateRows)
    ? input.linkage.linkedCandidateRows
    : [];
  const issues = [];
  const sourceAliases = validSourceAliases(input?.ledger, issues);
  const requestedList = requestedIds === null ? null : (Array.isArray(requestedIds) ? requestedIds : []);
  if (requestedList) {
    const seenRequested = new Set();
    for (const requestedId of requestedList) {
      if (!exactDailyPhraseRowId(requestedId)) {
        issues.push(issue('__batch__', 'request.invalid_id_type', 'Requested row ids must be exact nonblank strings'));
      } else if (seenRequested.has(requestedId)) {
        issues.push(issue(requestedId, 'request.duplicate_id', `Requested row id ${requestedId} occurs more than once`));
      }
      seenRequested.add(requestedId);
    }
  }
  for (const [index, row] of bankRows.entries()) {
    if (!exactDailyPhraseRowId(row?.id)) {
      issues.push(issue('__batch__', 'candidate.invalid_id_type', `Bank row ${index + 1} needs an exact nonblank string id`));
    }
  }
  const requested = requestedList
    ? new Set(requestedList.filter((rowId) => exactDailyPhraseRowId(rowId)))
    : null;
  const rows = requested
    ? bankRows.filter((row) => exactDailyPhraseRowId(row?.id) && requested.has(row.id))
    : bankRows.filter((row) => row?.candidateStatus === 'CANDIDATE_PENDING_INDEPENDENT_REVIEW');

  const target = typeof input?.bank?.studyTarget === 'string' ? input.bank.studyTarget : '';
  const expectedLedgerSchema = target === 'es'
    ? 'daily-phrase-cvc-source-ledger-v1'
    : 'daily-phrase-authoritative-source-ledger-v1';
  const expectedLedgerPath = target === 'es'
    ? 'cvc-source-ledger.json'
    : 'authoritative-source-ledger.json';
  const authorityDescriptor = input?.linkage?.authoritativeLedger;
  if (!['es', 'fr', 'de', 'it'].includes(target)
    || input?.bank?.sourceLocale !== 'ru'
    || input?.bank?.surface !== 'daily_phrase'
    || input?.ledger?.studyTarget !== target
    || input?.ledger?.schemaVersion !== expectedLedgerSchema
    || input?.linkage?.schemaVersion !== 'daily-phrase-source-linkage-v2'
    || input?.linkage?.studyTarget !== target
    || input?.linkage?.sourceLocale !== 'ru'
    || input?.linkage?.surface !== 'daily_phrase'
    || authorityDescriptor?.path !== expectedLedgerPath
    || authorityDescriptor?.schemaVersion !== expectedLedgerSchema) {
    issues.push(issue('__batch__', 'envelope.invalid_scope', 'Bank, source ledger and linkage must match the target-scoped Daily Phrase authority contract'));
  }
  if (authorityDescriptor && typeof input?.ledger?.schemaVersion === 'string'
    && authorityDescriptor.schemaVersion !== input.ledger.schemaVersion) {
    issues.push(issue('__batch__', 'linkage.authority_schema_mismatch', 'Linkage authority schemaVersion must match the supplied ledger'));
  }
  if (!sameExactArrayOrAbsent(input?.ledger?.sourceAliases, authorityDescriptor?.sourceAliases)) {
    issues.push(issue(
      '__batch__',
      'linkage.authority_source_aliases_mismatch',
      'Linkage authority sourceAliases must exactly match the supplied ledger',
    ));
  }
  if (input?.ledgerFileName !== undefined) {
    const actualLedgerFileName = input.ledgerFileName;
    if (typeof actualLedgerFileName !== 'string'
      || actualLedgerFileName.trim() !== actualLedgerFileName
      || !actualLedgerFileName
      || authorityDescriptor?.path !== actualLedgerFileName) {
      issues.push(issue('__batch__', 'linkage.authority_path_mismatch', 'Linkage authority path must name the supplied ledger file'));
    }
  }

  const selectedRowCounts = new Map();
  for (const row of rows) {
    const rowId = exactDailyPhraseRowId(row?.id);
    if (!rowId) continue;
    selectedRowCounts.set(rowId, (selectedRowCounts.get(rowId) ?? 0) + 1);
  }
  for (const [rowId, count] of selectedRowCounts) {
    if (count > 1) {
      issues.push(issue(rowId, 'candidate.duplicate', 'Selected bank row id is ambiguous because it occurs more than once'));
    }
  }
  if (requested) {
    for (const id of requested) {
      if ((selectedRowCounts.get(id) ?? 0) === 0) {
        issues.push(issue(id, 'candidate.missing', 'Requested bank row does not exist'));
      }
    }
  }

  const linkGroups = new Map();
  const authorityPointerGroups = new Map();
  for (const [index, link] of links.entries()) {
    const id = exactDailyPhraseRowId(link?.rowId);
    if (!id) {
      issues.push(issue('__batch__', 'linkage.invalid_row_id_type', `Source link ${index + 1} needs an exact nonblank string rowId`));
      continue;
    }
    const group = linkGroups.get(id) ?? [];
    group.push(link);
    linkGroups.set(id, group);

    const hasLedgerRow = Object.prototype.hasOwnProperty.call(link ?? {}, 'ledgerRow');
    const hasCvcRow = Object.prototype.hasOwnProperty.call(link ?? {}, 'cvcRow');
    if (hasLedgerRow && hasCvcRow && link.ledgerRow !== link.cvcRow) continue;
    const pointer = hasLedgerRow ? link.ledgerRow : link.cvcRow;
    if (!Number.isInteger(pointer) || pointer < 0) continue;
    const pointerRows = authorityPointerGroups.get(pointer) ?? [];
    pointerRows.push(id);
    authorityPointerGroups.set(pointer, pointerRows);
  }
  for (const [pointer, rowIds] of authorityPointerGroups) {
    if (new Set(rowIds).size > 1) {
      issues.push(issue(
        '__batch__',
        'linkage.duplicate_authority_pointer',
        `Authoritative source row ${pointer} is linked to multiple candidates: ${rowIds.join(', ')}`,
      ));
    }
  }

  const usesTargetNeutralPointers = links.some((link) => Object.prototype.hasOwnProperty.call(link ?? {}, 'ledgerRow'));
  const ledgerPath = String(
    input?.linkage?.authoritativeLedger?.path
      || (usesTargetNeutralPointers ? 'authoritative-source-ledger.json' : 'cvc-source-ledger.json'),
  );

  for (const row of rows) {
    const rowId = exactDailyPhraseRowId(row?.id) ?? '';
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
    const hasLedgerRow = Object.prototype.hasOwnProperty.call(link ?? {}, 'ledgerRow');
    const hasCvcRow = Object.prototype.hasOwnProperty.call(link ?? {}, 'cvcRow');
    if (hasLedgerRow && hasCvcRow && link.ledgerRow !== link.cvcRow) {
      issues.push(
        issue(
          rowId,
          'linkage.ledger_row_conflict',
          `ledgerRow (${String(link.ledgerRow)}) and legacy cvcRow (${String(link.cvcRow)}) must identify the same source row`,
        ),
      );
      continue;
    }

    const ledgerRow = hasLedgerRow ? link?.ledgerRow : link?.cvcRow;
    if (!Number.isInteger(ledgerRow) || ledgerRow < 0 || ledgerRow >= ledgerRows.length) {
      issues.push(issue(rowId, 'linkage.invalid_ledger_row', `Invalid source-ledger row index: ${String(ledgerRow)}`));
      continue;
    }

    const authority = ledgerRows[ledgerRow];
    const evidence = row?.sourceEvidence ?? {};
    const expectedRef = `${ledgerPath}#rows[${ledgerRow}]`;

    validateRequiredEvidence(input, authority, evidence, rowId, issues);

    const targetTypesValid = typeof row?.targetText === 'string'
      && typeof authority?.targetText === 'string';
    if (!targetTypesValid) {
      issues.push(issue(rowId, 'target.invalid_type', 'Both authored and authoritative targetText values must be strings'));
    } else if (dailyPhraseTargetLexicalSignature(row.targetText)
      !== dailyPhraseTargetLexicalSignature(authority.targetText)) {
      issues.push(issue(rowId, 'target.mismatch', 'targetText does not preserve the exact lexical and sentence-boundary sequence from the linked source-ledger row'));
    }
    const targetExampleSurface = evaluateDailyPhraseTargetSurface(row, 'targetExample');
    if (targetExampleSurface.status !== 'PASS') {
      const invalidDeclaredSurface = ['invalid_surface', 'declared_surface_missing']
        .includes(targetExampleSurface.status);
      issues.push(issue(
        rowId,
        invalidDeclaredSurface
          ? 'target_example.invalid_surface_form'
          : 'target_example.target_missing',
        invalidDeclaredSurface
          ? 'targetExample declares an invalid or absent grammatical target surface form'
          : 'targetExample must include targetText or an explicit grammatical surface form',
      ));
    }
    if (!same(link?.sourceId, authority?.sourceId)) {
      issues.push(issue(rowId, 'linkage.source_id_mismatch', 'Link manifest sourceId does not match the source-ledger row'));
    }
    if (!same(evidence?.sourceLedgerRef, expectedRef)) {
      issues.push(issue(rowId, 'evidence.ledger_ref_mismatch', `Expected sourceLedgerRef ${expectedRef}`));
    }

    const exactFields = [
      ['sourceId', 'source_id_mismatch'],
      ['sourceName', 'source_name_mismatch'],
      ['sourceUrl', 'source_url_mismatch'],
      ['httpStatus', 'http_status_mismatch'],
      ['retrievalMethod', 'retrieval_method_mismatch'],
      ['definitionQuote', 'definition_quote_mismatch'],
      ['usageMarker', 'usage_marker_mismatch'],
    ];
    for (const [field, suffix] of exactFields) {
      if (!same(evidence?.[field], authority?.[field])) {
        issues.push(issue(rowId, `evidence.${suffix}`, `${field} does not exactly match the linked source-ledger row`));
      }
    }

    if (input?.ledger?.source
      && ![input.ledger.source, ...sourceAliases].some((sourceType) => same(evidence?.sourceType, sourceType))) {
      issues.push(issue(rowId, 'evidence.source_type_mismatch', 'sourceType does not match the authoritative ledger source'));
    }
    const expectedCheckedAt = authoritativeCheckedAt(input, authority);
    if (expectedCheckedAt !== undefined && !same(evidence?.checkedAt, expectedCheckedAt)) {
      issues.push(issue(rowId, 'evidence.checked_at_mismatch', 'checkedAt does not match the linked source-ledger row'));
    }
  }

  if (rows.length === 0 && issues.length === 0) {
    issues.push(issue('__batch__', 'batch.empty', 'At least one authored Daily Phrase row is required'));
  }

  return {
    contractVersion: SOURCE_LINK_CONTRACT_VERSION,
    verdict: issues.length === 0 ? 'PASS' : 'HOLD',
    checkedRows: rows.map((row) => exactDailyPhraseRowId(row?.id) ?? '__unknown__'),
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
    ledgerFileName: path.basename(path.resolve(ledgerPath)),
  }, ids);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.verdict === 'PASS' ? 0 : 1;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) runCli();
