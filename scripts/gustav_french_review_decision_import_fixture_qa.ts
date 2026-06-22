import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

type DecisionRow = {
  sourceQueueIndex: number;
  batchId: string;
  lessonId: number;
  phraseId: string;
  englishBase: string;
  russianMeaning: string;
  ukrainianMeaning: string;
  proposedFrench: string;
  quizBlank: string;
  quizCorrect: string;
  quizDistractors: string[];
  quizCategory: string;
  currentReviewerStatus: string;
  currentActivationStatus: string;
  reviewerDecision: string;
  correctedFrench: string;
  correctedQuizBlank: string;
  correctedQuizCorrect: string;
  correctedQuizDistractors: string;
  reviewerNotes: string;
  reviewerName: string;
  reviewedAt: string;
};

type Finding = {
  severity: 'blocker' | 'warning' | 'info';
  code: string;
  message: string;
  fixtureId?: string;
};

type FixtureResult = {
  fixtureId: string;
  fixturePath: string;
  reportPath: string;
  expectedExitCode: number;
  actualExitCode: number;
  expectedReadyForDecisionImport: boolean;
  actualReadyForDecisionImport: boolean;
  expectedBlockers: 'zero' | 'nonzero';
  actualBlockers: number;
  expectedReviewedRows: number;
  reviewedRows: number;
  expectedImportCandidateRows: number;
  importCandidateRows: number;
  expectedNoOpRows: number;
  noOpRows: number;
  readyForApply: boolean;
  wouldModifyGeneratedLedgers: boolean;
  passed: boolean;
};

type Report = {
  schemaVersion: 'gustav-french-review-decision-import-fixture-qa-v0';
  runId: string;
  generatedAt: string;
  status: 'PASS' | 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    fixtures: number;
    fixturesPassed: number;
    fixturesFailed: number;
    blockers: number;
    warnings: number;
    readyForReviewer: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  fixtures: FixtureResult[];
  findings: Finding[];
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function parseJsonl<T>(filePath: string): T[] {
  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) return [];
  return content.split(/\r?\n/).map((line) => JSON.parse(line) as T);
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function writeJsonl(filePath: string, rows: DecisionRow[]): void {
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
}

function cloneRows(rows: DecisionRow[]): DecisionRow[] {
  return rows.map((row) => ({
    ...row,
    quizDistractors: [...row.quizDistractors],
  }));
}

function reviewedRow(row: DecisionRow, updates: Partial<DecisionRow>): DecisionRow {
  return {
    ...row,
    reviewerName: 'fixture_reviewer',
    reviewedAt: '2026-06-21T00:00:00.000Z',
    ...updates,
  };
}

function dryRunCommand(): string {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

function shellQuote(value: string): string {
  if (!/[\s"]/g.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

function runDryRun(repoRoot: string, runArg: string, fixturePath: string, outName: string): { exitCode: number; reportPath: string } {
  const reportPath = path.resolve(repoRoot, runArg, 'audits', `french_review_decision_import_dry_run_${outName}.json`);
  const args = [
    'tsx',
    'scripts/gustav_french_review_decision_import_dry_run.ts',
    '--run',
    runArg,
    '--decisions',
    artifactPath(repoRoot, fixturePath),
    '--out-name',
    outName,
  ];
  const result = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', [dryRunCommand(), ...args].map(shellQuote).join(' ')], {
      cwd: repoRoot,
      encoding: 'utf8',
    })
    : spawnSync(dryRunCommand(), args, {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return {
    exitCode: result.status ?? 1,
    reportPath,
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV French Review Decision Import Fixture QA',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Fixtures: ${report.summary.fixtures}`,
    `- Fixtures passed: ${report.summary.fixturesPassed}`,
    `- Fixtures failed: ${report.summary.fixturesFailed}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Fixtures',
    '',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`- \`${fixture.fixtureId}\`: ${fixture.passed ? 'PASS' : 'FAIL'}, exit ${fixture.actualExitCode}, blockers ${fixture.actualBlockers}, reviewed ${fixture.reviewedRows}, import candidates ${fixture.importCandidateRows}, report \`${fixture.reportPath}\``);
  }
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.fixtureId ? ` (${finding.fixtureId})` : ''}`);
    }
  }
  lines.push('', '## Safety', '');
  lines.push('- Fixture files are synthetic dry-run inputs only.');
  lines.push('- They are not reviewer decisions and must not be imported as real review state.');
  lines.push('- The fixture QA does not modify generated ledgers.');
  lines.push('- The fixture QA does not create app apply approval.');
  lines.push('- The fixture QA does not modify production app files.');
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_french_review_decision_import_fixture_qa.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  const fixtureDir = path.join(reviewerDir, 'dry_run_fixtures');
  const templatePath = path.join(reviewerDir, 'french_review_decision_template.jsonl');
  const findings: Finding[] = [];
  ensureDir(fixtureDir);

  const templateRows = parseJsonl<DecisionRow>(templatePath);
  if (templateRows.length !== 1600) {
    findings.push({
      severity: 'blocker',
      code: 'template_row_count_invalid',
      message: `Expected 1600 template rows, found ${templateRows.length}.`,
    });
  }

  const noopRows = cloneRows(templateRows);
  const acceptOneRows = cloneRows(templateRows);
  acceptOneRows[0] = reviewedRow(acceptOneRows[0], {
    reviewerDecision: 'accept_as_is',
  });
  const needsCorrectionRows = cloneRows(templateRows);
  needsCorrectionRows[1] = reviewedRow(needsCorrectionRows[1], {
    reviewerDecision: 'needs_correction',
    correctedFrench: 'Fixture corrected French',
    reviewerNotes: 'Fixture correction note.',
  });
  const rejectRows = cloneRows(templateRows);
  rejectRows[2] = reviewedRow(rejectRows[2], {
    reviewerDecision: 'reject',
    reviewerNotes: 'Fixture rejection note.',
  });
  const skipRows = cloneRows(templateRows);
  skipRows[3] = reviewedRow(skipRows[3], {
    reviewerDecision: 'skip',
    reviewerNotes: 'Fixture skip note.',
  });
  const invalidCorrectionRows = cloneRows(templateRows);
  invalidCorrectionRows[0] = reviewedRow(invalidCorrectionRows[0], {
    reviewerDecision: 'needs_correction',
    correctedFrench: 'Fixture correction',
  });
  const invalidAcceptWithCorrectionRows = cloneRows(templateRows);
  invalidAcceptWithCorrectionRows[0] = reviewedRow(invalidAcceptWithCorrectionRows[0], {
    reviewerDecision: 'accept_as_is',
    correctedFrench: 'Should not be present for accept_as_is',
  });
  const invalidUnknownDecisionRows = cloneRows(templateRows);
  invalidUnknownDecisionRows[0] = reviewedRow(invalidUnknownDecisionRows[0], {
    reviewerDecision: 'approve',
  });
  const invalidContextMismatchRows = cloneRows(templateRows);
  invalidContextMismatchRows[0] = {
    ...invalidContextMismatchRows[0],
    proposedFrench: 'Fixture context mismatch',
  };

  const fixtureSpecs = [
    {
      fixtureId: 'fixture_noop_template',
      rows: noopRows,
      expectedExitCode: 0,
      expectedReadyForDecisionImport: false,
      expectedBlockers: 'zero' as const,
      expectedReviewedRows: 0,
      expectedImportCandidateRows: 0,
      expectedNoOpRows: 1600,
    },
    {
      fixtureId: 'fixture_accept_one',
      rows: acceptOneRows,
      expectedExitCode: 0,
      expectedReadyForDecisionImport: true,
      expectedBlockers: 'zero' as const,
      expectedReviewedRows: 1,
      expectedImportCandidateRows: 1,
      expectedNoOpRows: 1599,
    },
    {
      fixtureId: 'fixture_needs_correction_one',
      rows: needsCorrectionRows,
      expectedExitCode: 0,
      expectedReadyForDecisionImport: true,
      expectedBlockers: 'zero' as const,
      expectedReviewedRows: 1,
      expectedImportCandidateRows: 1,
      expectedNoOpRows: 1599,
    },
    {
      fixtureId: 'fixture_reject_one',
      rows: rejectRows,
      expectedExitCode: 0,
      expectedReadyForDecisionImport: true,
      expectedBlockers: 'zero' as const,
      expectedReviewedRows: 1,
      expectedImportCandidateRows: 1,
      expectedNoOpRows: 1599,
    },
    {
      fixtureId: 'fixture_skip_one',
      rows: skipRows,
      expectedExitCode: 0,
      expectedReadyForDecisionImport: true,
      expectedBlockers: 'zero' as const,
      expectedReviewedRows: 1,
      expectedImportCandidateRows: 1,
      expectedNoOpRows: 1599,
    },
    {
      fixtureId: 'fixture_invalid_needs_correction_missing_notes',
      rows: invalidCorrectionRows,
      expectedExitCode: 1,
      expectedReadyForDecisionImport: false,
      expectedBlockers: 'nonzero' as const,
      expectedReviewedRows: 1,
      expectedImportCandidateRows: 1,
      expectedNoOpRows: 1599,
    },
    {
      fixtureId: 'fixture_invalid_accept_with_correction',
      rows: invalidAcceptWithCorrectionRows,
      expectedExitCode: 1,
      expectedReadyForDecisionImport: false,
      expectedBlockers: 'nonzero' as const,
      expectedReviewedRows: 1,
      expectedImportCandidateRows: 1,
      expectedNoOpRows: 1599,
    },
    {
      fixtureId: 'fixture_invalid_unknown_decision',
      rows: invalidUnknownDecisionRows,
      expectedExitCode: 1,
      expectedReadyForDecisionImport: false,
      expectedBlockers: 'nonzero' as const,
      expectedReviewedRows: 1,
      expectedImportCandidateRows: 0,
      expectedNoOpRows: 1599,
    },
    {
      fixtureId: 'fixture_invalid_context_mismatch',
      rows: invalidContextMismatchRows,
      expectedExitCode: 1,
      expectedReadyForDecisionImport: false,
      expectedBlockers: 'nonzero' as const,
      expectedReviewedRows: 0,
      expectedImportCandidateRows: 0,
      expectedNoOpRows: 1600,
    },
  ];

  const fixtures: FixtureResult[] = [];
  for (const spec of fixtureSpecs) {
    const fixturePath = path.join(fixtureDir, `${spec.fixtureId}.jsonl`);
    writeJsonl(fixturePath, spec.rows);
    const dryRun = runDryRun(repoRoot, runArg, fixturePath, spec.fixtureId);
    if (!fs.existsSync(dryRun.reportPath)) {
      findings.push({
        severity: 'blocker',
        code: 'fixture_report_missing',
        message: 'Dry-run did not produce expected fixture report.',
        fixtureId: spec.fixtureId,
      });
      fixtures.push({
        fixtureId: spec.fixtureId,
        fixturePath: artifactPath(repoRoot, fixturePath),
        reportPath: artifactPath(repoRoot, dryRun.reportPath),
        expectedExitCode: spec.expectedExitCode,
        actualExitCode: dryRun.exitCode,
        expectedReadyForDecisionImport: spec.expectedReadyForDecisionImport,
        actualReadyForDecisionImport: false,
        expectedBlockers: spec.expectedBlockers,
        actualBlockers: Number.MAX_SAFE_INTEGER,
        expectedReviewedRows: spec.expectedReviewedRows,
        reviewedRows: 0,
        expectedImportCandidateRows: spec.expectedImportCandidateRows,
        importCandidateRows: 0,
        expectedNoOpRows: spec.expectedNoOpRows,
        noOpRows: 0,
        readyForApply: false,
        wouldModifyGeneratedLedgers: true,
        passed: false,
      });
      continue;
    }

    const dryRunReport = readJson<{ summary: Record<string, unknown> }>(dryRun.reportPath);
    const actualBlockers = Number(dryRunReport.summary.blockers ?? 0);
    const actualReadyForDecisionImport = dryRunReport.summary.readyForDecisionImport === true;
    const readyForApply = dryRunReport.summary.readyForApply === true;
    const wouldModifyGeneratedLedgers = dryRunReport.summary.wouldModifyGeneratedLedgers === true;
    const reviewedRows = Number(dryRunReport.summary.reviewedRows ?? 0);
    const importCandidateRows = Number(dryRunReport.summary.importCandidateRows ?? 0);
    const noOpRows = Number(dryRunReport.summary.noOpRows ?? 0);
    const passed =
      dryRun.exitCode === spec.expectedExitCode &&
      actualReadyForDecisionImport === spec.expectedReadyForDecisionImport &&
      (spec.expectedBlockers === 'zero' ? actualBlockers === 0 : actualBlockers > 0) &&
      reviewedRows === spec.expectedReviewedRows &&
      importCandidateRows === spec.expectedImportCandidateRows &&
      noOpRows === spec.expectedNoOpRows &&
      readyForApply === false &&
      wouldModifyGeneratedLedgers === false;

    if (!passed) {
      findings.push({
        severity: 'blocker',
        code: 'fixture_expectation_failed',
        message: `Fixture expected exit ${spec.expectedExitCode}, readyForDecisionImport=${spec.expectedReadyForDecisionImport}, blockers=${spec.expectedBlockers}, reviewed=${spec.expectedReviewedRows}, importCandidates=${spec.expectedImportCandidateRows}, noOp=${spec.expectedNoOpRows}; got exit ${dryRun.exitCode}, readyForDecisionImport=${actualReadyForDecisionImport}, blockers=${actualBlockers}, reviewed=${reviewedRows}, importCandidates=${importCandidateRows}, noOp=${noOpRows}.`,
        fixtureId: spec.fixtureId,
      });
    }

    fixtures.push({
      fixtureId: spec.fixtureId,
      fixturePath: artifactPath(repoRoot, fixturePath),
      reportPath: artifactPath(repoRoot, dryRun.reportPath),
      expectedExitCode: spec.expectedExitCode,
      actualExitCode: dryRun.exitCode,
      expectedReadyForDecisionImport: spec.expectedReadyForDecisionImport,
      actualReadyForDecisionImport,
      expectedBlockers: spec.expectedBlockers,
      actualBlockers,
      expectedReviewedRows: spec.expectedReviewedRows,
      reviewedRows,
      expectedImportCandidateRows: spec.expectedImportCandidateRows,
      importCandidateRows,
      expectedNoOpRows: spec.expectedNoOpRows,
      noOpRows,
      readyForApply,
      wouldModifyGeneratedLedgers,
      passed,
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const fixturesPassed = fixtures.filter((fixture) => fixture.passed).length;
  const fixturesFailed = fixtures.length - fixturesPassed;
  const readyForReviewer = blockers === 0 && fixturesFailed === 0 && fixtures.length === fixtureSpecs.length;

  const report: Report = {
    schemaVersion: 'gustav-french-review-decision-import-fixture-qa-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: readyForReviewer ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      fixtures: fixtures.length,
      fixturesPassed,
      fixturesFailed,
      blockers,
      warnings,
      readyForReviewer,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    fixtures,
    findings,
  };

  ensureDir(auditsDir);
  const outJson = path.join(auditsDir, 'french_review_decision_import_fixture_qa.json');
  const outMd = path.join(auditsDir, 'french_review_decision_import_fixture_qa.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV French review decision import fixture QA: ${report.status}`);
  console.log(`Fixtures: ${report.summary.fixtures}`);
  console.log(`Fixtures passed: ${report.summary.fixturesPassed}`);
  console.log(`Fixtures failed: ${report.summary.fixturesFailed}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);

  if (blockers > 0) process.exit(1);
}

void main();
