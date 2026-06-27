import * as fs from 'node:fs';
import * as path from 'node:path';

type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
};

type Report = {
  schemaVersion: 'gustav-master-next-pass-consistency-refresh-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: 'PASS' | 'BLOCK';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  summary: {
    targetLocale: 'fr';
    consistencyState: string;
    p37Ready: boolean;
    p37State: string;
    p37SafeClosed: number;
    p37SafeRemaining: number;
    p37ReadyForApply: boolean;
    nextPassStatus: string;
    nextPassPrepared: boolean;
    nextPassGoalId: string;
    nextPassP37Ready: boolean;
    nextPassReadyForApply: boolean;
    nextPassMayModifyProductionAppFiles: boolean;
    masterStatus: string;
    masterBlockers: number;
    masterActionableBlockers: number;
    masterExpectedFutureBlockers: number;
    masterWarnings: number;
    masterP37Present: boolean;
    masterP37State: string;
    masterP37ReadyForApply: boolean;
    masterReadyForApply: boolean;
    masterMayModifyProductionAppFiles: boolean;
    readyForOfficialSourceContentCoverageGateV2: boolean;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    runtimeDownloadsEnabled: false;
    storageMigrationAllowed: false;
    cloudSyncMigrationAllowed: false;
    productionWritesAllowed: false;
    fixtureProbesPassed: number;
    fixtureProbes: number;
    blockers: number;
    warnings: number;
  };
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    serverManifestPublishedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    storageOrCloudMigrationStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      args[arg.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    }
  }
  return args;
}

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonOrEmpty(filePath: string): any {
  if (!fs.existsSync(filePath)) return {};
  return readJson(filePath);
}

function summaryOf(value: any): Record<string, unknown> {
  return value && typeof value === 'object' && value.summary && typeof value.summary === 'object'
    ? value.summary
    : {};
}

function n(obj: Record<string, unknown>, key: string): number {
  const value = obj[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function s(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  return typeof value === 'string' ? value : '';
}

function b(obj: Record<string, unknown>, key: string): boolean {
  return obj[key] === true;
}

function arr(value: any, key: string): any[] {
  const next = value && typeof value === 'object' ? value[key] : undefined;
  return Array.isArray(next) ? next : [];
}

function rel(root: string, filePath: string): string {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string) {
  findings.push({ severity, code, message, path: filePath });
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function probe(name: string, passed: boolean, expected: string, actual: string): Probe {
  return { name, passed, expected, actual };
}

function renderMarkdown(report: Report): string {
  return [
    '# GUSTAV Master / Next-Pass Consistency Refresh V2',
    '',
    `Status: ${report.status}`,
    '',
    `Consistency state: ${report.summary.consistencyState}`,
    '',
    `P37 ready/state: ${report.summary.p37Ready ? 'yes' : 'no'} / ${report.summary.p37State}`,
    '',
    `P37 safe closed/remaining: ${report.summary.p37SafeClosed}/${report.summary.p37SafeRemaining}`,
    '',
    `Next pass: ${report.summary.nextPassStatus} / ${report.summary.nextPassGoalId}`,
    '',
    `Master: ${report.summary.masterStatus}, blockers=${report.summary.masterBlockers}, warnings=${report.summary.masterWarnings}`,
    '',
    `Ready for official-source content coverage gate V2: ${report.summary.readyForOfficialSourceContentCoverageGateV2 ? 'yes' : 'no'}`,
    '',
    `Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    '',
    `Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    '',
    '## Findings',
    '',
    ...(report.findings.length
      ? report.findings.map((finding) => `- ${finding.severity.toUpperCase()} ${finding.code}: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`)
      : ['- None']),
    '',
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const runId = args.run ? path.basename(path.resolve(args.run)) : '2026-05-19_fr_inventory_v0a1';
  const runDir = args.run ? path.resolve(args.run) : path.join(repoRoot, 'docs/gustav/runs', runId);
  const target = args.target || 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr, got ${target}`);

  const auditsDir = path.join(runDir, 'audits');
  const reviewerDir = path.join(runDir, 'generated/fr/reviewer');
  const p37Path = path.join(auditsDir, 'readiness_apply_blocker_map_refresh_v2_packet.json');
  const nextPath = path.join(auditsDir, 'next_pass_goal_contract_packet.json');
  const masterPath = path.join(reviewerDir, 'french_reviewer_master_manifest.json');
  const outputJsonPath = path.join(auditsDir, 'master_next_pass_consistency_refresh_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'master_next_pass_consistency_refresh_v2_packet.md');

  const findings: Finding[] = [];
  for (const filePath of [p37Path, nextPath, masterPath]) {
    if (!fs.existsSync(filePath)) addFinding(findings, 'blocker', 'REQUIRED_INPUT_MISSING', 'Required consistency input is missing.', rel(repoRoot, filePath));
  }

  const p37 = readJsonOrEmpty(p37Path);
  const next = readJsonOrEmpty(nextPath);
  const master = readJsonOrEmpty(masterPath);
  const p37Summary = summaryOf(p37);
  const nextSummary = summaryOf(next);
  const masterSummary = summaryOf(master);
  const nextGoalId = s(arr(next, 'nextPassGoals')[0] || {}, 'id');
  const expectedMasterFutureBlockersForP38 = new Set([
    'official_source_content_coverage_v2_not_ready_for_import_dry_run_refresh',
  ]);
  const masterBlockerFindings = arr(master, 'findings').filter((finding) => s(finding, 'severity') === 'blocker');
  const masterExpectedFutureBlockers = masterBlockerFindings.filter((finding) => expectedMasterFutureBlockersForP38.has(s(finding, 'code'))).length;
  const masterActionableBlockers = masterBlockerFindings.length - masterExpectedFutureBlockers;

  const p37Ready =
    s(p37, 'status') === 'PASS' &&
    n(p37Summary, 'blockers') === 0 &&
    s(p37Summary, 'blockerMapState') === 'readiness_apply_blocker_map_refreshed' &&
    n(p37Summary, 'safeNonProductionItemsClosed') === 4 &&
    n(p37Summary, 'safeNonProductionItemsRemaining') === 1 &&
    !b(p37Summary, 'readyForApply') &&
    !b(p37Summary, 'mayModifyProductionAppFiles');
  const nextRepresentsP37 =
    s(next, 'status') !== 'BLOCK' &&
    n(nextSummary, 'blockers') === 0 &&
    b(nextSummary, 'nextPassPrepared') &&
    b(nextSummary, 'readinessApplyBlockerMapRefreshV2Ready') &&
    !b(nextSummary, 'readyForApply') &&
    !b(nextSummary, 'mayModifyProductionAppFiles') &&
    (nextGoalId === 'NEXT-PASS-P38-MASTER-NEXT-PASS-CONSISTENCY-REFRESH-V2' ||
      nextGoalId === 'NEXT-PASS-P39-OFFICIAL-SOURCE-CONTENT-COVERAGE-V2' ||
      nextGoalId === 'NEXT-PASS-P40-REVIEWER-DECISION-IMPORT-DRY-RUN-REFRESH-V2' ||
      nextGoalId === 'NEXT-PASS-P41-PAYLOAD-CREATION-APPROVAL-PREFLIGHT-REFRESH-V2' ||
      nextGoalId === 'NEXT-PASS-P42-CLOSED-LOCAL-PAYLOAD-MATERIALIZATION-REFRESH-V2' ||
      nextGoalId === 'NEXT-PASS-P43-PRODUCTION-ACTIVATION-HOLD-EXACT-APPROVAL-REQUIRED-V2' ||
      nextGoalId === 'NEXT-PASS-P26-SERVER-DELIVERY-PUBLISH-PREFLIGHT-V2');
  const masterRepresentsP37 =
    s(master, 'status') === 'HOLD' &&
    masterActionableBlockers === 0 &&
    b(masterSummary, 'readinessApplyBlockerMapRefreshV2Present') &&
    s(masterSummary, 'readinessApplyBlockerMapRefreshV2State') === 'readiness_apply_blocker_map_refreshed' &&
    !b(masterSummary, 'readinessApplyBlockerMapRefreshV2ReadyForApply') &&
    !b(masterSummary, 'readyForApply') &&
    !b(masterSummary, 'mayModifyProductionAppFiles');

  if (!p37Ready) addFinding(findings, 'blocker', 'P37_NOT_READY', 'P37 readiness/apply blocker map is not ready.', rel(repoRoot, p37Path));
  if (!nextRepresentsP37) addFinding(findings, 'blocker', 'NEXT_PASS_NOT_CONSISTENT_WITH_P37', 'Next-pass contract does not consistently represent closed P37 evidence.', rel(repoRoot, nextPath));
  if (!masterRepresentsP37) addFinding(findings, 'blocker', 'MASTER_NOT_CONSISTENT_WITH_P37', 'Master manifest does not consistently represent closed P37 evidence.', rel(repoRoot, masterPath));

  const probes = [
    probe('p37-ready', p37Ready, 'P37 PASS, closed flags, safe remaining=1', `${s(p37, 'status')}/${s(p37Summary, 'blockerMapState')}/${n(p37Summary, 'safeNonProductionItemsRemaining')}`),
    probe('next-pass-represents-p37', nextRepresentsP37, 'next non-BLOCK, blockers=0 and P37 ready in summary', `${s(next, 'status')}/${n(nextSummary, 'blockers')}/${b(nextSummary, 'readinessApplyBlockerMapRefreshV2Ready')}/${nextGoalId}`),
    probe('master-represents-p37', masterRepresentsP37, 'master HOLD, actionable blockers=0, P37 state present', `${s(master, 'status')}/${n(masterSummary, 'blockers')}/${masterActionableBlockers}/${s(masterSummary, 'readinessApplyBlockerMapRefreshV2State')}`),
    probe('production-flags-closed', !b(p37Summary, 'readyForApply') && !b(nextSummary, 'readyForApply') && !b(masterSummary, 'readyForApply'), 'readyForApply false across P37/next/master', `${b(p37Summary, 'readyForApply')}/${b(nextSummary, 'readyForApply')}/${b(masterSummary, 'readyForApply')}`),
    probe('runtime-downloads-closed', !b(p37Summary, 'runtimeDownloadsEnabled'), 'runtime downloads disabled', String(b(p37Summary, 'runtimeDownloadsEnabled'))),
  ];

  const probeFailures = probes.filter((item) => !item.passed).length;
  if (probeFailures > 0) addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const accepted = blockers === 0;

  const report: Report = {
    schemaVersion: 'gustav-master-next-pass-consistency-refresh-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: accepted ? 'PASS' : 'BLOCK',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      readinessApplyBlockerMapRefreshV2Packet: rel(repoRoot, p37Path),
      nextPassGoalContractPacket: rel(repoRoot, nextPath),
      frenchReviewerMasterManifest: rel(repoRoot, masterPath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
    },
    summary: {
      targetLocale: 'fr',
      consistencyState: accepted ? 'master_next_pass_consistency_refreshed' : 'blocked_by_findings',
      p37Ready,
      p37State: s(p37Summary, 'blockerMapState'),
      p37SafeClosed: n(p37Summary, 'safeNonProductionItemsClosed'),
      p37SafeRemaining: n(p37Summary, 'safeNonProductionItemsRemaining'),
      p37ReadyForApply: b(p37Summary, 'readyForApply'),
      nextPassStatus: s(next, 'status'),
      nextPassPrepared: b(nextSummary, 'nextPassPrepared'),
      nextPassGoalId: nextGoalId,
      nextPassP37Ready: b(nextSummary, 'readinessApplyBlockerMapRefreshV2Ready'),
      nextPassReadyForApply: b(nextSummary, 'readyForApply'),
      nextPassMayModifyProductionAppFiles: b(nextSummary, 'mayModifyProductionAppFiles'),
      masterStatus: s(master, 'status'),
      masterBlockers: n(masterSummary, 'blockers'),
      masterActionableBlockers,
      masterExpectedFutureBlockers,
      masterWarnings: n(masterSummary, 'warnings'),
      masterP37Present: b(masterSummary, 'readinessApplyBlockerMapRefreshV2Present'),
      masterP37State: s(masterSummary, 'readinessApplyBlockerMapRefreshV2State'),
      masterP37ReadyForApply: b(masterSummary, 'readinessApplyBlockerMapRefreshV2ReadyForApply'),
      masterReadyForApply: b(masterSummary, 'readyForApply'),
      masterMayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
      readyForOfficialSourceContentCoverageGateV2: accepted,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
      productionWritesAllowed: false,
      fixtureProbesPassed: probes.filter((item) => item.passed).length,
      fixtureProbes: probes.length,
      blockers,
      warnings,
    },
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV master/next-pass consistency refresh V2 packet: ${report.status}`);
  console.log(`Consistency state: ${report.summary.consistencyState}`);
  console.log(`Next pass goal: ${report.summary.nextPassGoalId}`);
  console.log(`Ready for official-source content coverage gate V2: ${report.summary.readyForOfficialSourceContentCoverageGateV2 ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
