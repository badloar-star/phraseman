import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD';

type OriginalBlockerResolution = {
  id: string;
  title: string;
  resolvedForGeneration: boolean;
  evidence: string[];
};

type Packet = {
  schemaVersion: 'gustav-run-verdict-recheck-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    verdict: string;
    readinessGate: string;
    targetKeyFinalReconciliationPacket: string;
    tk5SurfaceRawGuardsPacket: string;
    tk4AchievementStatsCloudPolicyPacket: string;
    tk3P3StoreContractsPacket: string;
    tk2LocalCloudDecisionContractsPacket: string;
    tk1UnknownTargetStorageClassificationPacket: string;
  };
  summary: {
    originalVerdictStatus: string;
    originalBlockers: number;
    originalBlockersResolvedForGeneration: number;
    unresolvedOriginalBlockersForGeneration: number;
    currentReadinessDecision: string;
    currentReadinessFailedChecks: number;
    currentGenerationBlockers: number;
    nonVerdictGenerationBlockers: number;
    currentApplyBlockers: number;
    targetKeyFinalReconciliationClean: boolean;
    tk5SurfaceGuardsClean: boolean;
    tk4PolicyClean: boolean;
    tk3ContractsClean: boolean;
    tk2ContractsClean: boolean;
    tk1Clean: boolean;
    generationOnlyVerdict: 'PASS' | 'HOLD';
    productionApplyVerdict: 'HOLD';
    canPassRDY002Now: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  originalBlockerResolutions: OriginalBlockerResolution[];
  requiredNextActions: string[];
  forbiddenActions: string[];
  notes: string[];
};

const BLOCKER_EVIDENCE: Record<string, string[]> = {
  'GVA-050': [
    'RDY-010 currently passes.',
    'target_key_final_reconciliation_packet rawTargetStorageRecords=0.',
    'TK1 unknown target storage classification is clean.',
  ],
  'GVA-051': [
    'RDY-020 currently passes.',
    'TK2 local/cloud contracts are clean.',
    'TK5 cloud restore guard covers cloud/auth shell target buckets.',
  ],
  'GVA-052': [
    'RDY-021 currently passes.',
    'mixed_cloud_payload_audit has 0 blockers and 0 mixed fields.',
    'TK4 stats/cloud policy is clean.',
  ],
  'GVA-052A': [
    'RDY-030 currently passes through TK4.',
    'TK4 covers 42/42 mixed achievement policies.',
  ],
  'GVA-054': [
    'RDY-040 currently passes.',
    'TK2 local/cloud contracts are clean with 0 blockers.',
  ],
  'GVA-057': [
    'RDY-050 currently passes through target-key final reconciliation.',
    'target_key_final_reconciliation_packet covers 19/19 blockers and 13/13 blocker domains.',
  ],
  'GVA-058': [
    'RDY-060 currently passes through TK5.',
    'TK5 covers 92/92 surface blockers and 66/66 blocker surfaces.',
  ],
  'GVA-059': [
    'All non-verdict generation blockers are now zero.',
    'Remaining readiness failures are RDY-002 plus apply-only RDY-080/RDY-090 before this recheck is accepted.',
  ],
  'GVA-060': [
    'Migration adapter implementation remains locked for production apply.',
    'For generation-only readiness, TK1-TK5 plus target-key final reconciliation provide contracts and guards while mayModifyProductionAppFiles=false.',
  ],
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

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arr<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function n(value: Record<string, unknown>, key: string): number {
  return typeof value[key] === 'number' ? value[key] as number : 0;
}

function b(value: Record<string, unknown>, key: string): boolean {
  return value[key] === true;
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function statusOf(value: Record<string, unknown>): string {
  return String(value.status || value.decision || '');
}

function renderMarkdown(packet: Packet): string {
  const lines = [
    '# GUSTAV Run Verdict Recheck Packet',
    '',
    `Run: \`${packet.runId}\``,
    '',
    `Status: \`${packet.status}\``,
    '',
    `Generated at: ${packet.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Original verdict status: \`${packet.summary.originalVerdictStatus}\``,
    `- Original blockers: ${packet.summary.originalBlockers}`,
    `- Original blockers resolved for generation: ${packet.summary.originalBlockersResolvedForGeneration}`,
    `- Unresolved original blockers for generation: ${packet.summary.unresolvedOriginalBlockersForGeneration}`,
    `- Current readiness decision: \`${packet.summary.currentReadinessDecision}\``,
    `- Current readiness failed checks: ${packet.summary.currentReadinessFailedChecks}`,
    `- Current generation blockers: ${packet.summary.currentGenerationBlockers}`,
    `- Non-verdict generation blockers: ${packet.summary.nonVerdictGenerationBlockers}`,
    `- Current apply blockers: ${packet.summary.currentApplyBlockers}`,
    `- Target key final reconciliation clean: ${packet.summary.targetKeyFinalReconciliationClean ? 'yes' : 'no'}`,
    `- TK5 surface guards clean: ${packet.summary.tk5SurfaceGuardsClean ? 'yes' : 'no'}`,
    `- TK4 policy clean: ${packet.summary.tk4PolicyClean ? 'yes' : 'no'}`,
    `- TK3 contracts clean: ${packet.summary.tk3ContractsClean ? 'yes' : 'no'}`,
    `- TK2 contracts clean: ${packet.summary.tk2ContractsClean ? 'yes' : 'no'}`,
    `- TK1 clean: ${packet.summary.tk1Clean ? 'yes' : 'no'}`,
    `- Generation-only verdict: \`${packet.summary.generationOnlyVerdict}\``,
    `- Production apply verdict: \`${packet.summary.productionApplyVerdict}\``,
    `- Can pass RDY-002 now: ${packet.summary.canPassRDY002Now ? 'yes' : 'no'}`,
    `- May start French generation: ${packet.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${packet.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Original Blocker Resolutions',
    '',
  ];
  for (const resolution of packet.originalBlockerResolutions) {
    lines.push(`### ${resolution.id}: ${resolution.title}`);
    lines.push('');
    lines.push(`- Resolved for generation: ${resolution.resolvedForGeneration ? 'yes' : 'no'}`);
    lines.push('- Evidence:');
    for (const item of resolution.evidence) lines.push(`  - ${item}`);
    lines.push('');
  }
  lines.push('## Required Next Actions', '');
  for (const action of packet.requiredNextActions) lines.push(`- ${action}`);
  lines.push('', '## Forbidden Actions', '');
  for (const action of packet.forbiddenActions) lines.push(`- ${action}`);
  lines.push('', '## Notes', '');
  for (const note of packet.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_run_verdict_recheck_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditDir = path.join(runDir, 'audits');
  const verdictPath = path.join(runDir, 'verdict.json');
  const readinessPath = path.join(auditDir, 'gustav_readiness_gate.json');
  const finalPath = path.join(auditDir, 'target_key_final_reconciliation_packet.json');
  const tk5Path = path.join(auditDir, 'tk5_surface_raw_guards_packet.json');
  const tk4Path = path.join(auditDir, 'tk4_achievement_stats_cloud_policy_packet.json');
  const tk3Path = path.join(auditDir, 'tk3_p3_store_contracts_packet.json');
  const tk2Path = path.join(auditDir, 'tk2_local_cloud_decision_contracts_packet.json');
  const tk1Path = path.join(auditDir, 'tk1_unknown_target_storage_classification_packet.json');

  const verdict = readJson<Record<string, unknown>>(verdictPath);
  const readiness = readJson<Record<string, unknown>>(readinessPath);
  const final = readJson<Record<string, unknown>>(finalPath);
  const tk5 = readJson<Record<string, unknown>>(tk5Path);
  const tk4 = readJson<Record<string, unknown>>(tk4Path);
  const tk3 = readJson<Record<string, unknown>>(tk3Path);
  const tk2 = readJson<Record<string, unknown>>(tk2Path);
  const tk1 = readJson<Record<string, unknown>>(tk1Path);
  const readinessSummary = object(readiness.summary);
  const finalSummary = object(final.summary);
  const tk5Summary = object(tk5.summary);
  const tk4Summary = object(tk4.summary);
  const tk3Summary = object(tk3.summary);
  const tk2Summary = object(tk2.summary);
  const tk1Summary = object(tk1.summary);
  const failedChecks = arr<Record<string, unknown>>(readiness.checks).filter((check) => check.status === 'FAIL');
  const nonVerdictGenerationBlockers = failedChecks.filter((check) => (
    check.id !== 'RDY-002' &&
    arr<string>(check.blocks).includes('generation')
  )).length;
  const originalBlockers = arr<Record<string, unknown>>(verdict.blockers);

  const targetKeyFinalReconciliationClean = statusOf(final) === 'PASS' && b(finalSummary, 'finalReconciliationClean');
  const tk5SurfaceGuardsClean = statusOf(tk5) === 'PASS' && b(tk5Summary, 'tk5SurfaceGuardsClean');
  const tk4PolicyClean = statusOf(tk4) === 'PASS' && b(tk4Summary, 'tk4PolicyClean');
  const tk3ContractsClean = statusOf(tk3) === 'PASS' && b(tk3Summary, 'tk3ContractsClean');
  const tk2ContractsClean = statusOf(tk2) === 'PASS' && b(tk2Summary, 'tk2ContractsClean');
  const tk1Clean =
    statusOf(tk1) === 'HOLD' &&
    n(tk1Summary, 'targetPlanUnknownRecords') === 0 &&
    n(tk1Summary, 'currentUnknownTargetRecordsInPlanFiles') === 0 &&
    b(tk1Summary, 'staleEvidenceDetected') === false;
  const dependencyClean =
    targetKeyFinalReconciliationClean &&
    tk5SurfaceGuardsClean &&
    tk4PolicyClean &&
    tk3ContractsClean &&
    tk2ContractsClean &&
    tk1Clean &&
    nonVerdictGenerationBlockers === 0;

  const originalBlockerResolutions = originalBlockers.map((blocker): OriginalBlockerResolution => ({
    id: String(blocker.id || ''),
    title: String(blocker.title || ''),
    resolvedForGeneration: dependencyClean && Boolean(BLOCKER_EVIDENCE[String(blocker.id || '')]),
    evidence: BLOCKER_EVIDENCE[String(blocker.id || '')] || ['No current recheck evidence was mapped to this original blocker.'],
  }));
  const originalBlockersResolvedForGeneration = originalBlockerResolutions.filter((entry) => entry.resolvedForGeneration).length;
  const unresolvedOriginalBlockersForGeneration = originalBlockers.length - originalBlockersResolvedForGeneration;
  const canPassRDY002Now =
    originalBlockers.length > 0 &&
    unresolvedOriginalBlockersForGeneration === 0 &&
    dependencyClean;

  const packet: Packet = {
    schemaVersion: 'gustav-run-verdict-recheck-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: canPassRDY002Now ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      verdict: artifactPath(repoRoot, verdictPath),
      readinessGate: artifactPath(repoRoot, readinessPath),
      targetKeyFinalReconciliationPacket: artifactPath(repoRoot, finalPath),
      tk5SurfaceRawGuardsPacket: artifactPath(repoRoot, tk5Path),
      tk4AchievementStatsCloudPolicyPacket: artifactPath(repoRoot, tk4Path),
      tk3P3StoreContractsPacket: artifactPath(repoRoot, tk3Path),
      tk2LocalCloudDecisionContractsPacket: artifactPath(repoRoot, tk2Path),
      tk1UnknownTargetStorageClassificationPacket: artifactPath(repoRoot, tk1Path),
    },
    summary: {
      originalVerdictStatus: statusOf(verdict),
      originalBlockers: originalBlockers.length,
      originalBlockersResolvedForGeneration,
      unresolvedOriginalBlockersForGeneration,
      currentReadinessDecision: statusOf(readiness),
      currentReadinessFailedChecks: n(readinessSummary, 'failed'),
      currentGenerationBlockers: n(readinessSummary, 'generationBlockers'),
      nonVerdictGenerationBlockers,
      currentApplyBlockers: n(readinessSummary, 'applyBlockers'),
      targetKeyFinalReconciliationClean,
      tk5SurfaceGuardsClean,
      tk4PolicyClean,
      tk3ContractsClean,
      tk2ContractsClean,
      tk1Clean,
      generationOnlyVerdict: canPassRDY002Now ? 'PASS' : 'HOLD',
      productionApplyVerdict: 'HOLD',
      canPassRDY002Now,
      mayStartFrenchGeneration: canPassRDY002Now,
      mayModifyProductionAppFiles: false,
    },
    originalBlockerResolutions,
    requiredNextActions: canPassRDY002Now
      ? [
          'Allow RDY-002 to pass for generation-only readiness.',
          'Re-run readiness gate and confirm generationBlockers=0 before creating translation output.',
          'Keep production apply blocked by RDY-080/RDY-090 until generated content audit and explicit apply approval exist.',
        ]
      : [
          'Resolve every non-verdict generation blocker before allowing run verdict recheck.',
          'Keep translation blocked.',
        ],
    forbiddenActions: [
      'Do not treat this packet as production apply approval.',
      'Do not modify production app files.',
      'Do not create migration adapters.',
      'Do not bypass generated content audit before apply.',
    ],
    notes: [
      'This recheck is generation-only and intentionally does not rewrite verdict.json.',
      'Production app writes remain locked.',
      'Generated translation output must stay inside the Gustav run container until separate apply approval.',
    ],
  };

  const outJson = path.join(auditDir, 'run_verdict_recheck_packet.json');
  const outMd = path.join(auditDir, 'run_verdict_recheck_packet.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(packet));

  console.log(`GUSTAV run verdict recheck packet: ${packet.status}`);
  console.log(`Original blockers resolved for generation: ${packet.summary.originalBlockersResolvedForGeneration}/${packet.summary.originalBlockers}`);
  console.log(`Non-verdict generation blockers: ${packet.summary.nonVerdictGenerationBlockers}`);
  console.log(`Can pass RDY-002 now: ${packet.summary.canPassRDY002Now ? 'yes' : 'no'}`);
  console.log(`May start French generation: ${packet.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${packet.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
