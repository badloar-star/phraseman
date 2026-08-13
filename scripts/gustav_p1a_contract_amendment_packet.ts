import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';

type CurrentImplAudit = {
  schemaVersion: 'gustav-p1a-current-impl-contract-audit-v0';
  runId: string;
  status: Status;
  summary: Record<string, unknown>;
  keyBuilderProof: {
    expectedTargetDomains: string[];
    implementedTargetDomains: string[];
    missingSpecDomains: string[];
    extraImplementationDomains: string[];
  };
};

type DomainDecision = {
  domain: string;
  decision: 'replace_old_domain' | 'approve_expansion' | 'keep_existing_spec_domain';
  replaces?: string;
  status: 'ready_for_amended_contract' | 'needs_test_assertion' | 'needs_explicit_approval';
  reason: string;
  evidence: string[];
  requiredBeforeHashLock: string[];
};

type Packet = {
  schemaVersion: 'gustav-p1a-contract-amendment-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    currentImplContractAudit: string;
  };
  summary: {
    oldSpecDomains: number;
    implementedDomains: number;
    proposedAmendedDomains: number;
    unchangedDomains: number;
    replacedDomains: number;
    expansionDomains: number;
    domainsNeedingTestAssertions: number;
    canAmendContractWithoutProductionWrites: boolean;
    canCreateReplacementBaselineHashLockNow: boolean;
    canCreateReplacementBaselineHashLockAfterApproval: boolean;
    canStartP1BNow: boolean;
    canStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  oldSpecDomains: string[];
  implementedDomains: string[];
  proposedAmendedDomains: string[];
  domainDecisions: DomainDecision[];
  missingTestAssertions: Array<{
    id: string;
    file: string;
    assertion: string;
    domains: string[];
  }>;
  requiredApprovalText: string;
  allowedNextWork: string[];
  forbiddenActions: string[];
  notes: string[];
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function sourceContains(repoRoot: string, relativePath: string, needles: string[]): boolean {
  const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
  return needles.every((needle) => source.includes(needle));
}

function renderMarkdown(packet: Packet): string {
  const lines = [
    '# GUSTAV P1A Contract Amendment Packet',
    '',
    `Run: \`${packet.runId}\``,
    '',
    `Status: \`${packet.status}\``,
    '',
    `Generated at: ${packet.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Old spec domains: ${packet.summary.oldSpecDomains}`,
    `- Implemented domains: ${packet.summary.implementedDomains}`,
    `- Proposed amended domains: ${packet.summary.proposedAmendedDomains}`,
    `- Unchanged domains: ${packet.summary.unchangedDomains}`,
    `- Replaced domains: ${packet.summary.replacedDomains}`,
    `- Expansion domains: ${packet.summary.expansionDomains}`,
    `- Domains needing test assertions: ${packet.summary.domainsNeedingTestAssertions}`,
    `- Can amend contract without production writes: ${packet.summary.canAmendContractWithoutProductionWrites ? 'yes' : 'no'}`,
    `- Can create replacement baseline hash lock now: ${packet.summary.canCreateReplacementBaselineHashLockNow ? 'yes' : 'no'}`,
    `- Can create replacement baseline hash lock after approval: ${packet.summary.canCreateReplacementBaselineHashLockAfterApproval ? 'yes' : 'no'}`,
    `- Can start P1B now: ${packet.summary.canStartP1BNow ? 'yes' : 'no'}`,
    `- Can start French generation: ${packet.summary.canStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${packet.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Domains',
    '',
    `Old spec: ${packet.oldSpecDomains.map((domain) => `\`${domain}\``).join(', ')}`,
    '',
    `Implemented: ${packet.implementedDomains.map((domain) => `\`${domain}\``).join(', ')}`,
    '',
    `Proposed amended: ${packet.proposedAmendedDomains.map((domain) => `\`${domain}\``).join(', ')}`,
    '',
    '## Domain Decisions',
    '',
    ...packet.domainDecisions.flatMap((decision) => [
      `### ${decision.domain}`,
      '',
      `- Decision: \`${decision.decision}\``,
      `- Status: \`${decision.status}\``,
      decision.replaces ? `- Replaces: \`${decision.replaces}\`` : '- Replaces: none',
      `- Reason: ${decision.reason}`,
      `- Evidence: ${decision.evidence.map((item) => `\`${item}\``).join(', ') || 'none'}`,
      '',
      'Required before hash-lock:',
      ...decision.requiredBeforeHashLock.map((item) => `- ${item}`),
      '',
    ]),
    '## Missing Test Assertions',
    '',
    ...(packet.missingTestAssertions.length > 0
      ? packet.missingTestAssertions.flatMap((assertion) => [
          `### ${assertion.id}`,
          '',
          `- File: \`${assertion.file}\``,
          `- Domains: ${assertion.domains.map((domain) => `\`${domain}\``).join(', ')}`,
          `- Assertion: ${assertion.assertion}`,
          '',
        ])
      : ['No missing test assertions.']),
    '',
    '## Required Approval Text',
    '',
    `\`${packet.requiredApprovalText}\``,
    '',
    '## Allowed Next Work',
    '',
    ...packet.allowedNextWork.map((item) => `- ${item}`),
    '',
    '## Forbidden Actions',
    '',
    ...packet.forbiddenActions.map((item) => `- ${item}`),
    '',
    '## Notes',
    '',
    ...packet.notes.map((item) => `- ${item}`),
    '',
  ];
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_p1a_contract_amendment_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(1);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const currentImplAuditPath = path.join(runDir, 'audits', 'p1a_current_impl_contract_audit.json');
  const currentImplAudit = readJson<CurrentImplAudit>(currentImplAuditPath);
  const oldSpecDomains = unique(currentImplAudit.keyBuilderProof.expectedTargetDomains)
    .filter((domain) => domain !== 'daily_tasks');
  const implementedDomains = unique(currentImplAudit.keyBuilderProof.implementedTargetDomains)
    .filter((domain) => domain !== 'daily_tasks');
  const proposedAmendedDomains = implementedDomains;
  const keyTestPath = 'tests/gustav_target_storage_keys.test.ts';
  const keyBuilderPath = 'app/target_storage_keys.ts';

  const testCoverage = {
    daily_phrase: sourceContains(repoRoot, keyTestPath, ['dailyPhraseAchievementReadCountKey', 'daily_phrase_v2::fr']),
    quiz_session: sourceContains(repoRoot, keyTestPath, ['quizNavLevelKey', 'quiz_session_v2::fr']),
    quiz_achievements: sourceContains(repoRoot, keyTestPath, ['quizAchievementCounterKey', 'quiz_achievements_v2::fr']),
    target_stats: sourceContains(repoRoot, keyTestPath, ['userStatsKey', 'target_stats_v2::fr']),
  };

  const domainDecisions: DomainDecision[] = [];
  for (const domain of implementedDomains) {
    if (oldSpecDomains.includes(domain)) {
      domainDecisions.push({
        domain,
        decision: 'keep_existing_spec_domain',
        status: 'ready_for_amended_contract',
        reason: 'Domain already exists in the old P1A contract and remains implemented.',
        evidence: [domain],
        requiredBeforeHashLock: ['No amendment-specific work required for this domain.'],
      });
    }
  }

  domainDecisions.push({
    domain: 'target_stats',
    decision: 'replace_old_domain',
    replaces: 'analytics_stats',
    status: testCoverage.target_stats ? 'ready_for_amended_contract' : 'needs_test_assertion',
    reason: 'Current implementation names target-scoped app statistics as target_stats rather than the older analytics_stats contract label.',
    evidence: ['userStatsKey', 'statsDailyBreakdownKey', 'target_stats_v2::{studyTarget}'],
    requiredBeforeHashLock: testCoverage.target_stats
      ? ['Record analytics_stats -> target_stats as an explicit contract rename.']
      : ['Add/record target_stats test assertions for userStatsKey and statsDailyBreakdownKey before replacement hash-lock.'],
  });

  const expansionDecisions: Array<[string, boolean, string[], string]> = [
    [
      'daily_phrase',
      testCoverage.daily_phrase,
      ['dailyPhraseAchievementReadCountKey', 'dailyPhraseAchievementSaveCountKey', 'daily_phrase_v2::{studyTarget}'],
      'Daily phrase read/save achievement state is target-sensitive once French phrases exist.',
    ],
    [
      'quiz_session',
      testCoverage.quiz_session,
      ['quizNavLevelKey', 'quizLifetimeCounterKey', 'quiz_session_v2::{studyTarget}'],
      'Quiz navigation and lifetime counters are target-sensitive learning state.',
    ],
    [
      'quiz_achievements',
      testCoverage.quiz_achievements,
      ['quizAchievementCounterKey', 'quizPerfectStreakKey', 'quiz_achievements_v2::{studyTarget}'],
      'Quiz achievements are target-sensitive and should not share progress across study targets.',
    ],
  ];

  for (const [domain, hasCoverage, evidence, reason] of expansionDecisions) {
    domainDecisions.push({
      domain,
      decision: 'approve_expansion',
      status: hasCoverage ? 'ready_for_amended_contract' : 'needs_test_assertion',
      reason,
      evidence,
      requiredBeforeHashLock: hasCoverage
        ? ['Record as approved P1A contract expansion before replacement hash-lock.']
        : [`Add/record ${domain} target-key assertions before replacement hash-lock.`],
    });
  }

  const missingTestAssertions = [];
  if (!testCoverage.target_stats) {
    missingTestAssertions.push({
      id: 'P1A-AMEND-TARGET-STATS',
      file: keyTestPath,
      assertion: 'userStatsKey and statsDailyBreakdownKey keep English on legacy keys and scope French under target_stats_v2::fr.',
      domains: ['target_stats'],
    });
  }

  const domainsNeedingTestAssertions = domainDecisions.filter((decision) => decision.status === 'needs_test_assertion').length;
  const requiredApprovalText = [
    `User approved P1A contract amendment for ${runId}:`,
    `replace analytics_stats with target_stats and add daily_phrase, quiz_session, and quiz_achievements to the P1A target domain contract.`,
    'This amendment approval does not approve P1B, production apply, or French generation.',
  ].join(' ');

  const packet: Packet = {
    schemaVersion: 'gustav-p1a-contract-amendment-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      currentImplContractAudit: artifactPath(repoRoot, currentImplAuditPath),
    },
    summary: {
      oldSpecDomains: oldSpecDomains.length,
      implementedDomains: implementedDomains.length,
      proposedAmendedDomains: proposedAmendedDomains.length,
      unchangedDomains: implementedDomains.filter((domain) => oldSpecDomains.includes(domain)).length,
      replacedDomains: 1,
      expansionDomains: 3,
      domainsNeedingTestAssertions,
      canAmendContractWithoutProductionWrites: true,
      canCreateReplacementBaselineHashLockNow: false,
      canCreateReplacementBaselineHashLockAfterApproval: domainsNeedingTestAssertions === 0,
      canStartP1BNow: false,
      canStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    oldSpecDomains,
    implementedDomains,
    proposedAmendedDomains,
    domainDecisions,
    missingTestAssertions,
    requiredApprovalText,
    allowedNextWork: domainsNeedingTestAssertions === 0
      ? [
          'Request exact user approval for the P1A contract amendment.',
          'After approval, create amended contract/hash-lock artifacts for the current P1A implementation.',
          'Rerun P1A current implementation contract audit, P1A current apply state audit, run validator and readiness gate.',
        ]
      : [
          'Add or record the missing target_stats test assertion before requesting amendment approval.',
          'Regenerate p1a_current_impl_contract_audit and this amendment packet after the test assertion exists.',
          'Do not hash-lock the current P1A implementation until amended test coverage is complete.',
        ],
    forbiddenActions: [
      'Do not change production app files as part of this amendment packet.',
      'Do not create replacement baseline hash-lock while domainsNeedingTestAssertions is nonzero.',
      'Do not create any approval receipt without exact user approval text.',
      'Do not start P1B or French generation from this packet.',
    ],
    notes: [
      `This packet reads ${keyBuilderPath} and ${keyTestPath}; it writes only run artifacts.`,
      'The proposed amended domain set follows the current implementation, not the stale old P1A spec.',
      'The analytics_stats -> target_stats rename is a contract decision, not a production code change.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_contract_amendment_packet.json');
  const outMd = path.join(runDir, 'audits', 'p1a_contract_amendment_packet.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(packet));

  console.log(`GUSTAV P1A contract amendment packet: ${packet.status}`);
  console.log(`Proposed amended domains: ${packet.summary.proposedAmendedDomains}`);
  console.log(`Domains needing test assertions: ${packet.summary.domainsNeedingTestAssertions}`);
  console.log(`Can create replacement baseline hash lock after approval: ${packet.summary.canCreateReplacementBaselineHashLockAfterApproval ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
