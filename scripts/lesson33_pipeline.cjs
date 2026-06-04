#!/usr/bin/env node
'use strict';

const {
  DEFAULT_OUT_ROOT,
  checkProtocol,
  createLesson33Run,
  runLesson33Gate,
} = require('./lib/lesson33_pipeline_core.cjs');

function parseArgs(argv) {
  const args = {
    lessonId: 33,
    mode: 'scaffold',
    outRoot: DEFAULT_OUT_ROOT,
    runId: null,
    packagePath: null,
    gateOutDir: null,
    checkProtocol: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') args.help = true;
    else if (token === '--check-protocol') args.checkProtocol = true;
    else if (token === '--mode') args.mode = argv[++i];
    else if (token === '--lesson') args.lessonId = Number(argv[++i]);
    else if (token === '--out-root') args.outRoot = argv[++i];
    else if (token === '--run-id') args.runId = argv[++i];
    else if (token === '--package') args.packagePath = argv[++i];
    else if (token === '--gate-out-dir') args.gateOutDir = argv[++i];
    else throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function printHelp() {
  console.log(`Lesson 33 pipeline

Usage:
  npm run lesson33:check
  npm run lesson33:pipeline
  npm run lesson33:gate -- --package docs/lesson33/runs/<runId>/lesson_package.json
  node scripts/lesson33_pipeline.cjs --run-id draft-001

Options:
  --mode              scaffold | gate. Default: scaffold.
  --lesson            Lesson id. Only 33 is accepted.
  --out-root          Output root. Default: ${DEFAULT_OUT_ROOT}
  --run-id            Stable run id. Default: timestamp-based.
  --package           lesson_package.json path for gate mode.
  --gate-out-dir      Optional report output dir for gate mode. Default: package dir.
  --check-protocol    Verify agent-room and docs files exist.
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (args.checkProtocol) {
    const report = checkProtocol(process.cwd());
    if (report.ok) {
      console.log('[lesson33] protocol OK');
      return;
    }
    if (report.missing.length > 0) {
      console.error('[lesson33] protocol missing files:');
      for (const file of report.missing) console.error(`- ${file}`);
    }
    if (report.contentErrors.length > 0) {
      console.error('[lesson33] protocol content errors:');
      for (const error of report.contentErrors) console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  if (args.mode === 'gate') {
    const report = runLesson33Gate({
      packagePath: args.packagePath,
      outDir: args.gateOutDir,
    });
    console.log(`[lesson33] gate ${report.ok ? 'PASS' : 'BLOCKED'}: ${report.reportMd}`);
    if (!report.ok) process.exitCode = 1;
    return;
  }

  if (args.mode !== 'scaffold') throw new Error(`Unsupported --mode: ${args.mode}`);

  const manifest = createLesson33Run({
    lessonId: args.lessonId,
    outRoot: args.outRoot,
    runId: args.runId,
  });
  console.log(`[lesson33] wrote ${manifest.outputDir}`);
}

try {
  main();
} catch (error) {
  console.error(`[lesson33] ${error && error.message ? error.message : String(error)}`);
  process.exitCode = 1;
}
