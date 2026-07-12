#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  buildBatchLocaleCoverageAudit,
  buildExistingLocaleAudit,
  buildExistingLocaleAuditMarkdown,
  buildLocalizationRuntimeLedger,
  buildPresentLocaleReviewCandidates,
  buildAgentReviewBoardMarkdown,
  buildResearchChecklist,
  buildRunbook,
  buildTranslationBlocks,
  guardReport,
  HEISENBERG_BATCH_SOURCE_LOCALES,
  inventoryFiles,
  listRepoFiles,
  localeSlug,
  missingTargetSourceItems,
  normalizeLocale,
  normalizePath,
  PRODUCT_SURFACES,
  timestampSlug,
} = require('./lib/heisenberg_core.cjs');

function parseArgs(argv) {
  const args = {
    lang: null,
    outRoot: path.join('docs', 'heisenberg'),
    blockSize: 40,
    surface: null,
    auditOnly: false,
    includeSupporting: false,
    runChecks: false,
    allBatch: false,
    coverageStrict: false,
    existingLocaleStrict: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      args.help = true;
    } else if (token === '--lang' || token === '-l') {
      args.lang = argv[++i];
    } else if (token === '--out-root') {
      args.outRoot = argv[++i];
    } else if (token === '--block-size') {
      args.blockSize = Number(argv[++i]);
    } else if (token === '--surface') {
      args.surface = argv[++i];
    } else if (token === '--audit-only') {
      args.auditOnly = true;
    } else if (token === '--include-supporting') {
      args.includeSupporting = true;
    } else if (token === '--run-checks') {
      args.runChecks = true;
    } else if (token === '--all-batch') {
      args.allBatch = true;
    } else if (token === '--coverage-strict') {
      args.coverageStrict = true;
    } else if (token === '--existing-locale-strict') {
      args.existingLocaleStrict = true;
    } else if (!token.startsWith('-') && !args.lang) {
      args.lang = token;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  if (!args.help) {
    if (args.allBatch) {
      if (args.lang) throw new Error('--all-batch cannot be combined with --lang');
    } else {
      args.lang = normalizeLocale(args.lang);
    }
    if (!Number.isFinite(args.blockSize) || args.blockSize < 5 || args.blockSize > 200) {
      throw new Error('--block-size must be between 5 and 200');
    }
    if (args.surface && !PRODUCT_SURFACES.has(args.surface)) {
      throw new Error(`--surface must be one of: ${[...PRODUCT_SURFACES].sort().join(', ')}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Heisenberg localization pipeline

Usage:
  npm run heisenberg -- --lang fr
  npm run heisenberg -- fr-FR
  node scripts/heisenberg_pipeline.cjs --lang de --audit-only
  node scripts/heisenberg_pipeline.cjs --all-batch --audit-only

Options:
  --lang, -l       Target source-language locale for learning English (BCP 47).
  --all-batch      Run the current Heisenberg batch locales: ${HEISENBERG_BATCH_SOURCE_LOCALES.join(', ')}.
  --out-root       Output root. Default: docs/heisenberg
  --block-size     Rows per translation block. Default: 40
  --surface        Limit work items/blocks to one product surface (for example ui-locale).
  --audit-only     Generate inventory, research checklist, and guard report only.
  --include-supporting
                  Also write docs/tests/scripts-tools localized items into blocks.
  --run-checks     Also run selected local checks after generation.
  --coverage-strict
                  Exit non-zero if batch locale coverage has partial or missing-all units.
  --existing-locale-strict
                  Exit non-zero if an existing app locale audit reports blockers.
`);
}

function writeJson(abs, value) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(abs, text) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text.endsWith('\n') ? text : `${text}\n`, 'utf8');
}

function writeJsonl(abs, rows) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
}

function packageRunner(command, args) {
  if (command !== 'npm' && command !== 'npx') return { command, args };
  const cliName = command === 'npm' ? 'npm-cli.js' : 'npx-cli.js';
  const nodeDir = path.dirname(process.execPath);
  const cliPath = path.join(nodeDir, 'node_modules', 'npm', 'bin', cliName);
  if (fs.existsSync(cliPath)) return { command: process.execPath, args: [cliPath, ...args] };
  return { command, args };
}

function runCheck(command, args, cwd) {
  const startedAt = new Date().toISOString();
  const runner = packageRunner(command, args);
  const result = spawnSync(runner.command, runner.args, {
    cwd,
    encoding: 'utf8',
    shell: false,
  });
  return {
    command: [command, ...args].join(' '),
    startedAt,
    finishedAt: new Date().toISOString(),
    status: result.status,
    ok: result.status === 0,
    error: result.error ? result.error.message : null,
    stdoutTail: String(result.stdout || '').split(/\r?\n/).slice(-80).join('\n'),
    stderrTail: String(result.stderr || '').split(/\r?\n/).slice(-80).join('\n'),
  };
}

function safeBlockName(block) {
  const surface = block.surface.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  return `${surface || 'misc'}-${String(block.index).padStart(3, '0')}.jsonl`;
}

function childArgsForLocale(args, locale) {
  const out = [__filename, '--lang', locale, '--out-root', args.outRoot, '--block-size', String(args.blockSize)];
  if (args.surface) out.push('--surface', args.surface);
  if (args.auditOnly) out.push('--audit-only');
  if (args.includeSupporting) out.push('--include-supporting');
  if (args.coverageStrict) out.push('--coverage-strict');
  if (args.existingLocaleStrict) out.push('--existing-locale-strict');
  return out;
}

function runSelectedChecks(root) {
  const checks = [];
  checks.push(runCheck('npm', ['run', 'audit:translations'], root));
  checks.push(
    runCheck(
      'npm',
      [
        'test',
        '--',
        '--runTestsByPath',
        'tests/heisenberg_pipeline.test.ts',
        'tests/locale_ru_uk_es.test.ts',
        'tests/quiz_source_locale.test.ts',
        'tests/quiz_spanish_locale.test.ts',
        'tests/daily_phrase_locale.test.ts',
        '--runInBand',
      ],
      root,
    ),
  );
  checks.push(runCheck('npx', ['tsc', '--noEmit', '--pretty', 'false'], root));
  checks.push(runCheck('npm', ['run', 'heisenberg:semantic-audit:strict'], root));
  checks.push(runCheck('npm', ['run', 'heisenberg:ui-audit'], root));
  checks.push(runCheck('npm', ['run', 'heisenberg:production-readiness'], root));
  checks.push(runCheck('npm', ['run', 'heisenberg:blocker-matrix'], root));
  checks.push(runCheck('npm', ['run', 'heisenberg:raw-strings:strict'], root));
  checks.push(runCheck('npm', ['run', 'heisenberg:prompt-language-audit:strict'], root));
  checks.push(runCheck('npm', ['run', 'heisenberg:preflight:strict'], root));
  return checks;
}

function printFailedChecks(checks) {
  const failed = checks.filter((check) => !check.ok);
  if (!failed.length) return;
  console.log(`[heisenberg] failed checks: ${failed.length}`);
  for (const check of failed) {
    console.log(`[heisenberg] check failed (${check.status ?? 'no-status'}): ${check.command}`);
    if (check.error) console.log(`[heisenberg] check error: ${check.error}`);
    if (check.stdoutTail.trim()) {
      console.log('[heisenberg] check stdout tail:');
      console.log(check.stdoutTail);
    }
    if (check.stderrTail.trim()) {
      console.log('[heisenberg] check stderr tail:');
      console.log(check.stderrTail);
    }
  }
}

function runBatch(args) {
  const root = process.cwd();
  const batchRunId = timestampSlug();
  const relBatchDir = path.join(args.outRoot, 'batch', batchRunId);
  const batchDir = path.join(root, relBatchDir);
  fs.mkdirSync(batchDir, { recursive: true });

  console.log(`[heisenberg] batch=${HEISENBERG_BATCH_SOURCE_LOCALES.join(',')}`);
  const runs = [];
  for (const locale of HEISENBERG_BATCH_SOURCE_LOCALES) {
    const childArgs = childArgsForLocale(args, locale);
    const result = spawnSync(process.execPath, childArgs, {
      cwd: root,
      encoding: 'utf8',
      shell: false,
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    runs.push({
      locale,
      status: result.status,
      ok: result.status === 0,
      command: [process.execPath, ...childArgs].join(' '),
      stdoutTail: String(result.stdout || '').split(/\r?\n/).slice(-40).join('\n'),
      stderrTail: String(result.stderr || '').split(/\r?\n/).slice(-40).join('\n'),
    });
  }

  const checks = args.runChecks ? runSelectedChecks(root) : [];
  const manifest = {
    pipeline: 'heisenberg',
    mode: 'batch',
    runId: batchRunId,
    generatedAt: new Date().toISOString(),
    locales: HEISENBERG_BATCH_SOURCE_LOCALES,
    auditOnly: args.auditOnly,
    outputDir: normalizePath(relBatchDir),
    runs,
    checks,
  };
  writeJson(path.join(batchDir, 'manifest.json'), manifest);
  console.log(`[heisenberg] batch output: ${normalizePath(relBatchDir)}`);
  printFailedChecks(checks);

  if (runs.some((run) => !run.ok) || checks.some((check) => !check.ok)) {
    process.exitCode = 1;
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (args.allBatch) {
    runBatch(args);
    return;
  }

  const root = process.cwd();
  const locale = normalizeLocale(args.lang);
  const slug = localeSlug(locale);
  const runId = timestampSlug();
  const relOutDir = path.join(args.outRoot, slug, runId);
  const outDir = path.join(root, relOutDir);

  console.log(`[heisenberg] target=${locale}`);
  console.log('[heisenberg] scanning repository...');
  const files = listRepoFiles(root);
  const inventory = inventoryFiles(root, files);
  const guard = guardReport(inventory, locale);
  const batchLocaleCoverage = buildBatchLocaleCoverageAudit(inventory);
  const runtimeLedger = buildLocalizationRuntimeLedger(inventory, [locale]);
  const presentReviewCandidates = buildPresentLocaleReviewCandidates(inventory, locale, { surface: args.surface });
  const existingLocaleAudit = guard.knownLocaleConflict ? buildExistingLocaleAudit(inventory, locale) : null;
  const candidateBlockItems = existingLocaleAudit
    ? missingTargetSourceItems(inventory, locale)
    : args.includeSupporting
      ? inventory.items
      : inventory.items.filter((item) => PRODUCT_SURFACES.has(item.surface));
  const blockItems = args.surface
    ? candidateBlockItems.filter((item) => item.surface === args.surface)
    : candidateBlockItems;
  const blocks = args.auditOnly ? [] : buildTranslationBlocks(blockItems, locale, { blockSize: args.blockSize });

  fs.mkdirSync(outDir, { recursive: true });
  writeJson(path.join(outDir, 'inventory.json'), { totals: inventory.totals, files: inventory.files });
  writeJson(path.join(outDir, 'guard_report.json'), guard);
  writeJson(path.join(outDir, 'batch_locale_coverage.json'), batchLocaleCoverage);
  writeJson(path.join(outDir, 'runtime_ledger.json'), runtimeLedger);
  writeJsonl(path.join(outDir, 'present_review_candidates.jsonl'), presentReviewCandidates);
  if (existingLocaleAudit) {
    writeJson(path.join(outDir, 'existing_locale_audit.json'), existingLocaleAudit);
    writeText(path.join(outDir, 'existing_locale_audit.md'), buildExistingLocaleAuditMarkdown(existingLocaleAudit));
  }
  if (args.auditOnly) {
    writeJsonl(path.join(outDir, 'localized_items_sample.jsonl'), blockItems.slice(0, 200));
  } else {
    writeJsonl(path.join(outDir, 'localized_items.jsonl'), blockItems);
  }
  if (args.includeSupporting) {
    writeText(path.join(outDir, 'SUPPORTING_SURFACES_INCLUDED.txt'), 'This run includes docs/tests/scripts-tools localized items in translation blocks.');
  }
  writeText(path.join(outDir, 'research_checklist.md'), buildResearchChecklist(locale, inventory));
  writeText(path.join(outDir, 'agent_review_board.md'), buildAgentReviewBoardMarkdown(locale));

  if (!args.auditOnly) {
    const blocksDir = path.join(outDir, 'translation_blocks');
    for (const block of blocks) {
      writeJsonl(path.join(blocksDir, safeBlockName(block)), block.rows);
    }
    writeJson(path.join(outDir, 'translation_blocks_manifest.json'), {
      targetLocale: locale,
      blockSize: args.blockSize,
      blocks: blocks.map((block) => ({
        surface: block.surface,
        index: block.index,
        rows: block.rows.length,
        file: normalizePath(path.join('translation_blocks', safeBlockName(block))),
      })),
    });
  }

  const checks = [];
  if (args.runChecks) {
    console.log('[heisenberg] running selected checks...');
    checks.push(...runSelectedChecks(root));
  }

  const manifest = {
    pipeline: 'heisenberg',
    mode: existingLocaleAudit ? existingLocaleAudit.mode : 'new-locale-preflight',
    runId,
    generatedAt: new Date().toISOString(),
    targetLocale: locale,
    targetSlug: slug,
    auditOnly: args.auditOnly,
    repositoryRoot: root,
    outputDir: normalizePath(relOutDir),
    filesScanned: inventory.totals.filesScanned,
    localizedItems: inventory.totals.localizedItems,
    surfaces: inventory.totals.bySurface,
    sourceLocales: inventory.totals.byLocale,
    localizedItemsAll: inventory.totals.localizedItems,
    localizedItemsForBlocks: blockItems.length,
    includeSupporting: args.includeSupporting,
    blockSize: args.blockSize,
    requestedSurface: args.surface,
    translationBlocks: blocks.length,
    presentReviewCandidates: presentReviewCandidates.length,
    guard: {
      knownLocaleConflict: guard.knownLocaleConflict,
      targetInterfaceStatus: guard.targetInterfaceStatus,
      targetRegisteredAsAppLocale: guard.targetRegisteredAsAppLocale,
      pathCollisions: guard.pathCollisions.length,
      integrationBlockers: guard.integrationBlockers.length,
    },
    batchLocaleCoverage: batchLocaleCoverage.summary,
    runtimeLedger: runtimeLedger.summary.locales[locale] || runtimeLedger.summary.locales[localeSlug(locale)] || null,
    existingLocaleAudit: existingLocaleAudit
      ? {
          fieldCoverageGapFiles: existingLocaleAudit.summary.fieldCoverageGapFiles,
          itemCoverageGapFiles: existingLocaleAudit.summary.itemCoverageGapFiles,
          productionGateFiles: existingLocaleAudit.summary.productionGateFiles,
          isolatedStudyTargetFiles: existingLocaleAudit.summary.isolatedStudyTargetFiles,
          studyTargetRiskFiles: existingLocaleAudit.summary.studyTargetRiskFiles,
          blockers: existingLocaleAudit.blockers.length,
          studyTargetMustRemain: existingLocaleAudit.studyTargetMustRemain,
        }
      : null,
    checks,
  };
  writeJson(path.join(outDir, 'manifest.json'), manifest);
  writeText(path.join(outDir, 'RUNBOOK.md'), buildRunbook(locale, relOutDir));

  console.log(`[heisenberg] files scanned: ${manifest.filesScanned}`);
  console.log(`[heisenberg] localized items (all): ${manifest.localizedItemsAll}`);
  console.log(`[heisenberg] localized items (blocks): ${manifest.localizedItemsForBlocks}`);
  console.log(`[heisenberg] translation blocks: ${manifest.translationBlocks}`);
  console.log(`[heisenberg] batch locale coverage partial units: ${batchLocaleCoverage.summary.partialUnits}`);
  console.log(`[heisenberg] batch locale coverage missing-all units: ${batchLocaleCoverage.summary.missingAllLocaleUnits}`);
  console.log(`[heisenberg] output: ${normalizePath(relOutDir)}`);
  if (guard.integrationBlockers.length) {
    console.log(`[heisenberg] integration blockers: ${guard.integrationBlockers.length}`);
  }
  if (guard.knownLocaleConflict) {
    console.log(`[heisenberg] warning: ${locale} already maps to an existing app locale.`);
    console.log(`[heisenberg] existing-locale mode: ${existingLocaleAudit.mode}`);
    console.log(`[heisenberg] existing-locale blockers: ${existingLocaleAudit.blockers.length}`);
  }
  if (
    args.coverageStrict &&
    (batchLocaleCoverage.summary.partialUnits > 0 || batchLocaleCoverage.summary.missingAllLocaleUnits > 0)
  ) {
    process.exitCode = 1;
  }
  if (args.existingLocaleStrict && existingLocaleAudit && existingLocaleAudit.blockers.length > 0) {
    process.exitCode = 1;
  }
  if (checks.some((check) => !check.ok)) {
    printFailedChecks(checks);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(`[heisenberg] ${err && err.message ? err.message : err}`);
    process.exitCode = 1;
  }
}

module.exports = { childArgsForLocale, parseArgs };
