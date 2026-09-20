import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function lexicalTarget(value) {
  return (String(value).normalize('NFKC').toLocaleLowerCase('und').match(/[\p{L}\p{N}]+/gu) ?? []).join(' ');
}

function expectedId(index) {
  return `es-${String(index + 1).padStart(3, '0')}`;
}

function holdCopy(targetText, locale) {
  if (locale === 'uk') {
    return {
      literal: `Буквальний переклад «${targetText}» буде написано після редакційної перевірки.`,
      meaning: `Точне значення «${targetText}» буде сформульовано після незалежної перевірки джерела.`,
      text: `Картка «${targetText}» залишається закритою, доки не пройде авторинг і всі незалежні перевірки.`,
    };
  }
  return {
    literal: `Буквальный перевод «${targetText}» будет написан после редакционной проверки.`,
    meaning: `Точное значение «${targetText}» будет сформулировано после независимой проверки источника.`,
    text: `Карточка «${targetText}» остаётся закрытой, пока не пройдёт авторинг и все независимые проверки.`,
  };
}

export function buildSpanishCvcScaffold(input, options = {}) {
  const fromOrder = Number(options.fromOrder ?? 1);
  const bank = structuredClone(input?.bank);
  const ledger = structuredClone(input?.ledger);
  const linkage = structuredClone(input?.linkage);
  const bankRows = Array.isArray(bank?.rows) ? bank.rows : [];
  const ledgerRows = Array.isArray(ledger?.rows) ? ledger.rows : [];

  if (!Number.isInteger(fromOrder) || fromOrder < 1) throw new Error('fromOrder must be a positive integer');
  if (bank?.studyTarget !== 'es') throw new Error('Spanish scaffold requires studyTarget=es');
  if (bankRows.length !== ledgerRows.length) {
    throw new Error(`Bank/ledger row count mismatch: ${bankRows.length}/${ledgerRows.length}`);
  }

  for (let index = 0; index < bankRows.length; index += 1) {
    const row = bankRows[index];
    if (row?.order !== index + 1) throw new Error(`Bank row ${row?.id ?? index} has order ${String(row?.order)}; expected ${index + 1}`);
    if (row?.id !== expectedId(index)) throw new Error(`Bank row ${index} has id ${String(row?.id)}; expected ${expectedId(index)}`);
    if (row?.candidateStatus !== 'HOLD'
      && lexicalTarget(row?.targetText) !== lexicalTarget(ledgerRows[index]?.targetText)) {
      throw new Error(`Authored row ${row.id} conflicts with CVC ledger row ${index}`);
    }
  }

  let scaffoldedRows = 0;
  const existingLinks = new Map((linkage?.linkedCandidateRows ?? []).map((link) => [String(link.rowId), link]));
  const ledgerPath = String(linkage?.authoritativeLedger?.path || 'cvc-source-ledger.json');

  for (let index = fromOrder - 1; index < bankRows.length; index += 1) {
    const row = bankRows[index];
    const authority = ledgerRows[index];
    const mapping = { rowId: row.id, cvcRow: index, sourceId: authority.sourceId };
    existingLinks.set(row.id, mapping);

    if (row.candidateStatus !== 'HOLD') continue;
    const ru = holdCopy(authority.targetText, 'ru');
    const uk = holdCopy(authority.targetText, 'uk');
    bankRows[index] = {
      ...row,
      targetText: authority.targetText,
      targetExample: `La ficha de «${authority.targetText}» permanece cerrada hasta completar la revisión editorial.`,
      literal_ru: ru.literal,
      meaning_ru: ru.meaning,
      text_ru: ru.text,
      literal_uk: uk.literal,
      meaning_uk: uk.meaning,
      text_uk: uk.text,
      allowSave: true,
      active: false,
      activationApproved: false,
      candidateStatus: 'HOLD',
      sourceEvidence: {
        sourceType: ledger.source,
        sourceLedgerRef: `${ledgerPath}#rows[${index}]`,
        sourceId: authority.sourceId,
        sourceUrl: authority.sourceUrl,
        httpStatus: authority.httpStatus,
        definitionQuote: authority.definitionQuote,
        usageMarker: authority.usageMarker,
        checkedAt: ledger.checkedAt,
      },
    };
    scaffoldedRows += 1;
  }

  linkage.linkedCandidateRows = [...existingLinks.values()].sort((left, right) => left.cvcRow - right.cvcRow);
  return { bank, ledger, linkage, scaffoldedRows };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(path.resolve(process.cwd(), filePath), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseCliArgs(argv) {
  const [bankPath, ledgerPath, linkagePath, ...rest] = argv;
  let fromOrder = 1;
  let write = false;
  for (let index = 0; index < rest.length; index += 1) {
    if (rest[index] === '--from-order') {
      fromOrder = Number(rest[index + 1]);
      index += 1;
    } else if (rest[index] === '--write') {
      write = true;
    }
  }
  return { bankPath, ledgerPath, linkagePath, fromOrder, write };
}

function runCli() {
  const args = parseCliArgs(process.argv.slice(2));
  if (!args.bankPath || !args.ledgerPath || !args.linkagePath) {
    console.error('Usage: node scripts/sync_spanish_daily_phrase_cvc_scaffold.mjs <bank.json> <cvc-ledger.json> <source-ledger.json> [--from-order N] [--write]');
    process.exitCode = 2;
    return;
  }
  const result = buildSpanishCvcScaffold({
    bank: readJson(args.bankPath),
    ledger: readJson(args.ledgerPath),
    linkage: readJson(args.linkagePath),
  }, { fromOrder: args.fromOrder });
  if (args.write) {
    writeJson(args.bankPath, result.bank);
    writeJson(args.linkagePath, result.linkage);
  }
  console.log(JSON.stringify({ mode: args.write ? 'write' : 'dry-run', scaffoldedRows: result.scaffoldedRows }));
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) runCli();
