import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateDailyPhraseQuizContent } from './daily_phrase_quiz_content_gate.mjs';
import { evaluateDailyPhraseSourceLinks } from './daily_phrase_source_link_gate.mjs';
import { evaluateDailyPhraseBatchStyle } from './daily_phrase_style_gate.mjs';
import { evaluateDailyPhraseEnglishBaseline } from './daily_phrase_english_baseline.mjs';
import { exactDailyPhraseRowId } from './daily_phrase_row_selection.mjs';
import {
  DAILY_PHRASE_OPTIONAL_AUTHOR_FIELDS,
  DAILY_PHRASE_REQUIRED_AUTHOR_FIELDS,
  unsupportedDailyPhrasePacketRowFields,
} from './daily_phrase_authoring_packet_contract.mjs';
import { validateTargetDailyPhraseSubset } from './validate_target_daily_phrase_bank.mjs';

function string(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function exactSourceLink(linkage, rowId) {
  const links = Array.isArray(linkage?.linkedCandidateRows)
    ? linkage.linkedCandidateRows.filter((link) => exactDailyPhraseRowId(link?.rowId) === rowId)
    : [];
  if (links.length !== 1) {
    throw new Error(`Packet row ${rowId} must have exactly one source link; received ${links.length}`);
  }
  const link = links[0];
  const hasLedgerRow = Object.prototype.hasOwnProperty.call(link, 'ledgerRow');
  const hasCvcRow = Object.prototype.hasOwnProperty.call(link, 'cvcRow');
  if (hasLedgerRow && hasCvcRow && link.ledgerRow !== link.cvcRow) {
    throw new Error(`Packet row ${rowId} has conflicting source-ledger pointers`);
  }
  const ledgerRow = hasLedgerRow ? link.ledgerRow : link.cvcRow;
  if (!Number.isInteger(ledgerRow) || ledgerRow < 0) {
    throw new Error(`Packet row ${rowId} has an invalid source-ledger pointer`);
  }
  return { link, ledgerRow };
}

function sourceEvidence({ ledger, linkage, authority, link, ledgerRow }) {
  if (!authority || link.sourceId !== authority.sourceId) {
    throw new Error(`Source link ${String(link?.sourceId)} does not match authoritative ledger row ${ledgerRow}`);
  }
  const ledgerPath = string(linkage?.authoritativeLedger?.path);
  if (!ledgerPath) throw new Error('authoritativeLedger.path is required before applying learner-facing content');
  const checkedAt = string(authority?.checkedAt) || string(ledger?.checkedAt);
  if (!string(ledger?.source) || !checkedAt) {
    throw new Error('Authoritative ledger source and linked-row checkedAt are required');
  }

  return {
    sourceType: ledger.source,
    sourceLedgerRef: `${ledgerPath}#rows[${ledgerRow}]`,
    sourceId: authority.sourceId,
    sourceName: authority.sourceName,
    sourceUrl: authority.sourceUrl,
    httpStatus: authority.httpStatus,
    definitionQuote: authority.definitionQuote,
    usageMarker: authority.usageMarker,
    checkedAt,
    retrievalMethod: authority.retrievalMethod,
  };
}

function assertEnvelope({ bank, ledger, linkage, packet }) {
  if (packet?.schemaVersion !== 'daily-phrase-authoring-packet-v1') {
    throw new Error('Unsupported authoring packet schemaVersion');
  }
  if (packet?.status !== 'DRAFT_REQUIRES_INDEPENDENT_REVIEW') {
    throw new Error('Authoring packet status must remain DRAFT_REQUIRES_INDEPENDENT_REVIEW');
  }
  const target = string(bank?.studyTarget);
  if (!['es', 'fr', 'de'].includes(target)
    || packet?.studyTarget !== target || ledger?.studyTarget !== target || linkage?.studyTarget !== target) {
    throw new Error('Authoring packet, bank, ledger and linkage studyTarget must match');
  }
  if (bank?.sourceLocale !== 'ru'
    || packet?.sourceLocale !== bank.sourceLocale || linkage?.sourceLocale !== bank.sourceLocale) {
    throw new Error('Authoring packet, bank and linkage sourceLocale must match');
  }
  if (bank?.surface !== 'daily_phrase' || linkage?.surface !== 'daily_phrase') {
    throw new Error('Bank and linkage must stay inside the Daily Phrase surface');
  }
  const expectedLedgerSchema = target === 'es'
    ? 'daily-phrase-cvc-source-ledger-v1'
    : 'daily-phrase-authoritative-source-ledger-v1';
  const expectedLedgerPath = target === 'es'
    ? 'cvc-source-ledger.json'
    : 'authoritative-source-ledger.json';
  if (ledger?.schemaVersion !== expectedLedgerSchema) {
    throw new Error(`Authoritative ledger schema must equal ${expectedLedgerSchema}`);
  }
  if (linkage?.schemaVersion !== 'daily-phrase-source-linkage-v2') {
    throw new Error('Source linkage schema must equal daily-phrase-source-linkage-v2');
  }
  if (linkage?.authoritativeLedger?.path !== expectedLedgerPath
    || linkage?.authoritativeLedger?.schemaVersion !== expectedLedgerSchema) {
    throw new Error('Source linkage authority descriptor must match the canonical ledger');
  }
  if (bank?.activationApproved !== false) throw new Error('Bank activation must remain closed');
  if (!Array.isArray(bank?.rows) || !Array.isArray(ledger?.rows) || !Array.isArray(packet?.rows) || packet.rows.length === 0) {
    throw new Error('Bank, ledger and non-empty packet rows are required');
  }
  if (packet.rows.length > 10) {
    throw new Error('Authoring packets may contain at most 10 contiguous rows');
  }
}

export function applyDailyPhraseAuthoringPacket({
  bank,
  ledger,
  linkage,
  packet,
  englishRows,
  ledgerFileName,
}) {
  assertEnvelope({ bank, ledger, linkage, packet });
  const baseline = evaluateDailyPhraseEnglishBaseline(englishRows, { requireCanonical: true });
  if (baseline.verdict !== 'PASS') {
    const error = new Error('A complete canonical English Daily Phrase baseline is required');
    error.diagnostics = { englishBaseline: baseline };
    throw error;
  }
  if (ledgerFileName !== undefined
    && (typeof ledgerFileName !== 'string'
      || linkage?.authoritativeLedger?.path !== ledgerFileName)) {
    throw new Error('Supplied ledger filename must match the linkage authority path descriptor');
  }
  const packetIds = packet.rows.map((row) => exactDailyPhraseRowId(row?.id));
  if (packetIds.some((id) => !id)) throw new Error('Every packet row needs a stable id');
  if (new Set(packetIds).size !== packetIds.length) throw new Error('Authoring packet contains a duplicate row id');
  for (const [index, row] of packet.rows.entries()) {
    const unsupportedFields = unsupportedDailyPhrasePacketRowFields(row);
    if (unsupportedFields.length > 0) {
      throw new Error(
        `Packet row ${packetIds[index]} contains unsupported field(s) outside the authoring allowlist: ${unsupportedFields.join(', ')}`,
      );
    }
  }

  const nextBank = structuredClone(bank);
  const bankIds = nextBank.rows.map((row) => exactDailyPhraseRowId(row?.id));
  if (bankIds.some((rowId) => !rowId)) throw new Error('Every bank row needs an exact nonblank string id');
  if (new Set(bankIds).size !== bankIds.length) throw new Error('Target bank contains a duplicate row id');
  const bankIndex = new Map(bankIds.map((rowId, index) => [rowId, index]));
  for (const rowId of packetIds) {
    if (!bankIndex.has(rowId)) throw new Error(`Packet row ${rowId} does not exist in the target bank`);
  }
  for (let index = 1; index < packetIds.length; index += 1) {
    if (bankIndex.get(packetIds[index]) !== bankIndex.get(packetIds[index - 1]) + 1) {
      throw new Error('Authoring packet rows must follow canonical bank order as one contiguous canonical bank range');
    }
  }

  for (const authored of packet.rows) {
    const rowId = string(authored.id);
    const index = bankIndex.get(rowId);
    if (index === undefined) throw new Error(`Packet row ${rowId} does not exist in the target bank`);
    const current = nextBank.rows[index];
    if (current?.active !== false || current?.activationApproved !== false) {
      throw new Error(`Packet row ${rowId} is not safely closed`);
    }
    if (authored?.targetText !== current?.targetText) {
      throw new Error(`Packet row ${rowId} targetText does not exactly match the bank target`);
    }

    const { link, ledgerRow } = exactSourceLink(linkage, rowId);
    if (ledgerRow >= ledger.rows.length) throw new Error(`Packet row ${rowId} points outside the authoritative ledger`);
    const evidence = sourceEvidence({
      ledger,
      linkage,
      authority: ledger.rows[ledgerRow],
      link,
      ledgerRow,
    });

    const learnerFields = Object.fromEntries(
      DAILY_PHRASE_REQUIRED_AUTHOR_FIELDS.map((field) => [field, structuredClone(authored?.[field])]),
    );
    for (const field of DAILY_PHRASE_OPTIONAL_AUTHOR_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(authored, field)) {
        learnerFields[field] = structuredClone(authored[field]);
      }
    }
    const nextRow = {
      ...current,
      ...learnerFields,
      sourceEvidence: evidence,
      allowSave: true,
      active: false,
      activationApproved: false,
      candidateStatus: 'CANDIDATE_PENDING_INDEPENDENT_REVIEW',
    };
    for (const field of DAILY_PHRASE_OPTIONAL_AUTHOR_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(authored, field)) delete nextRow[field];
    }
    nextBank.rows[index] = nextRow;
  }

  const appliedRows = packetIds.map((id) => nextBank.rows[bankIndex.get(id)]);
  const source = evaluateDailyPhraseSourceLinks({
    bank: nextBank,
    ledger,
    linkage,
    ledgerFileName: ledgerFileName ?? linkage.authoritativeLedger.path,
  }, packetIds);
  const style = evaluateDailyPhraseBatchStyle(appliedRows);
  const quiz = evaluateDailyPhraseQuizContent(appliedRows, {
    targetRows: nextBank.rows,
    englishRows: baseline.rows,
  });
  const structural = validateTargetDailyPhraseSubset(nextBank, packetIds);

  const failed = [source, style, quiz].filter((result) => result.verdict !== 'PASS');
  if (structural.status !== 'STRUCTURAL_PASS') failed.push(structural);
  if (failed.length > 0) {
    const error = new Error(`Authoring packet failed ${failed.length} mandatory content gate(s)`);
    error.diagnostics = { source, style, quiz, structural };
    throw error;
  }

  return { bank: nextBank, appliedIds: packetIds, source, style, quiz, structural };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8'));
}

function runCli() {
  const [bankPath, packetPath, ledgerPath, linkagePath, englishPath = 'admin/daily_phrases_seed.json'] = process.argv.slice(2);
  if (!bankPath || !packetPath || !ledgerPath || !linkagePath) {
    console.error('Usage: node scripts/apply_daily_phrase_authoring_packet.mjs <bank.json> <packet.json> <authoritative-ledger.json> <source-linkage.json> [english-baseline.json]');
    process.exitCode = 2;
    return;
  }

  try {
    const result = applyDailyPhraseAuthoringPacket({
      bank: readJson(bankPath),
      packet: readJson(packetPath),
      ledger: readJson(ledgerPath),
      linkage: readJson(linkagePath),
      englishRows: readJson(englishPath),
      ledgerFileName: path.basename(path.resolve(ledgerPath)),
    });
    fs.writeFileSync(path.resolve(process.cwd(), bankPath), `${JSON.stringify(result.bank, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({
      status: 'AUTHORING_PACKET_APPLIED',
      appliedIds: result.appliedIds,
      source: result.source.verdict,
      style: result.style.verdict,
      quiz: result.quiz.verdict,
      structural: result.structural.status,
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      status: 'AUTHORING_PACKET_HOLD',
      message: error instanceof Error ? error.message : String(error),
      diagnostics: error?.diagnostics ?? null,
    }, null, 2));
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) runCli();
