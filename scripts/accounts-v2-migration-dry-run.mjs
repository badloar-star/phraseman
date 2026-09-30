#!/usr/bin/env node
/*
 * Account V2, Пакет 5 — CLI dry-run миграции.
 *
 * зачем: прогнать чистое ядро functions/src/accounts_v2_migration/dry_run.ts на
 * ЛОКАЛЬНОМ JSON-экспорте одного пользователя и записать ЛОКАЛЬНЫЙ отчёт по
 * схеме docs/reports/accounts-v2-migration-dry-run.schema.json.
 * НИКАКОЙ сети, Firestore, Storage и Firebase Admin: импорты — только node:fs,
 * node:path, node:process, node:url и CJS-загрузчик TypeScript tsx (сторож —
 * functions/src/accounts_v2_migration/no_network.test.ts). Операции в отчёт не
 * пишутся: там только счётчики, пути полей, хэш uid и хэш операций.
 *
 * Запуск:
 *   node scripts/accounts-v2-migration-dry-run.mjs --input <export.json> --output <report.json> [--now-ms <ms>]
 * --now-ms — часы исполнителя для проверки SRS-времени «из будущего» (по умолчанию — текущее время).
 * Коды выхода: 0 — отчёт записан; 2 — неверные аргументы/вход; 1 — прочая ошибка.
 * КОНТРАКТ: применять пакеты можно ТОЛЬКО при status=ready (applyAllowed=true), при hold —
 * стоп (assertMigrationApplyAllowed). ready ≠ полный перенос: старый users/{uid} НЕ чистить,
 * пока pendingDomainCount > 0 (assertLegacyCleanupAllowed в dry_run.ts).
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { require as tsxRequire } from 'tsx/cjs/api';

const LOG = '[ACCOUNTS-V2-MIGRATION-CLI]';
const MAX_INPUT_BYTES = 64 * 1024 * 1024;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CORE = path.join(HERE, '..', 'functions', 'src', 'accounts_v2_migration', 'dry_run.ts');

function usage(message) {
  console.error(`${LOG} ${message}`);
  console.error('Usage: node scripts/accounts-v2-migration-dry-run.mjs --input <export.json> --output <report.json> [--now-ms <ms>]');
  process.exit(2);
}

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 && index + 1 < args.length ? String(args[index + 1]).trim() : '';
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) usage('help');
  const input = valueAfter(args, '--input');
  const output = valueAfter(args, '--output');
  if (!input || !output) usage('--input and --output are required');
  const inputPath = path.resolve(input);
  const outputPath = path.resolve(output);
  if (inputPath === outputPath) usage('output must differ from input');
  const nowRaw = valueAfter(args, '--now-ms');
  const nowMs = nowRaw === '' ? Date.now() : Number(nowRaw);
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) usage('--now-ms must be a positive integer');
  const size = statSync(inputPath).size;
  if (size > MAX_INPUT_BYTES) usage(`input larger than ${MAX_INPUT_BYTES} bytes`);

  let snapshot;
  try {
    snapshot = JSON.parse(readFileSync(inputPath, 'utf8'));
  } catch (error) {
    // Значения экспорта в лог не пишем — только класс ошибки.
    usage(`input is not valid JSON (${error instanceof Error ? error.name : typeof error})`);
  }

  // зачем: CJS-загрузчик tsx — исходники functions используют импорты без расширений (commonjs).
  const core = tsxRequire(CORE, import.meta.url);
  let result;
  try {
    result = core.runMigrationDryRun(snapshot, { nowMs });
  } catch (error) {
    if (error instanceof core.MigrationInputError) usage(`input rejected: ${error.code}`);
    throw error;
  }
  writeFileSync(outputPath, `${JSON.stringify(result.report, null, 2)}\n`, 'utf8');
  const { report } = result;
  console.log(`${LOG} status=${report.status} applyAllowed=${report.applyAllowed}`
    + ` operations=${report.operations.count} batches=${report.operations.batches}`
    + ` carried=${report.totals.carried} dropped=${report.totals.dropped} derived=${report.totals.derived}`
    + ` held=${report.totals.held} informational=${report.totals.informational}`
    + ` pendingDomainCount=${report.pendingDomainCount}`
    + ` runesToCoins.runes=${report.runesToCoins.runes} runesToCoins.coins=${report.runesToCoins.coins} (rate ${report.runesToCoins.rate})`);
  if (!report.applyAllowed) console.log(`${LOG} apply NOT allowed: status=${report.status}`);
  // зачем (P2-б): ready ≠ полный перенос — поля без домена V2 живут только в старом документе.
  if (report.pendingDomainCount > 0) {
    console.log(`${LOG} legacy cleanup NOT allowed: ${report.pendingDomainCount} field(s) wait for a V2 domain — do not clean users/{uid}`);
  }
  console.log(`${LOG} report written: ${outputPath}`);
}

main().catch((error) => {
  console.error(LOG, 'failed', error instanceof Error ? `${error.name}: ${error.message}` : typeof error);
  process.exit(1);
});
