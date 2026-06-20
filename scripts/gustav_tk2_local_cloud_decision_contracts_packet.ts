import * as fs from 'node:fs';
import * as path from 'node:path';

type Packet = {
  schemaVersion: 'gustav-tk2-local-cloud-decision-contracts-packet-v0';
  runId: string;
  generatedAt: string;
  status: 'PASS' | 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    localCloudDecisionTable: string;
    cloudSyncMapping: string;
    targetKeyIntegrationPlan: string;
    targetKeySlicePacket: string;
  };
  summary: {
    localCloudStatus: string;
    localCloudEntries: number;
    localCloudBlockers: number;
    localCloudHighRisks: number;
    cloudMappingStatus: string;
    cloudTargetBucketRequired: number;
    cloudBlockUnknown: number;
    cloudTargetSensitiveMissingFromCloud: number;
    targetKeyPlanStatus: string;
    targetKeyLocalCloudDecisions: number;
    targetKeyBlockerDomains: number;
    targetKeyBlockers: number;
    tk2ContractsClean: boolean;
    recommendedNextSafeSlice: string;
    canContinueArchitectureWork: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  contractState: {
    syncUnderTargetKeys: string[];
    keepLocalTargetScopedKeys: string[];
    coveredByExistingCloudPatternKeys: string[];
    blockUnknownKeys: string[];
    missingTargetSensitiveLocalKeys: string[];
  };
  requiredNextActions: string[];
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

function keysForAction(entries: Record<string, unknown>[], action: string): string[] {
  return entries
    .filter((entry) => entry.action === action)
    .map((entry) => String(entry.key || ''))
    .filter(Boolean)
    .sort();
}

function renderMarkdown(packet: Packet): string {
  const lines = [
    '# GUSTAV TK2 Local/Cloud Decision Contracts Packet',
    '',
    `Run: \`${packet.runId}\``,
    '',
    `Status: \`${packet.status}\``,
    '',
    `Generated at: ${packet.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Local/cloud status: \`${packet.summary.localCloudStatus}\``,
    `- Local/cloud entries: ${packet.summary.localCloudEntries}`,
    `- Local/cloud blockers: ${packet.summary.localCloudBlockers}`,
    `- Local/cloud high risks: ${packet.summary.localCloudHighRisks}`,
    `- Cloud mapping status: \`${packet.summary.cloudMappingStatus}\``,
    `- Cloud target bucket required: ${packet.summary.cloudTargetBucketRequired}`,
    `- Cloud block unknown: ${packet.summary.cloudBlockUnknown}`,
    `- Cloud target-sensitive missing from cloud: ${packet.summary.cloudTargetSensitiveMissingFromCloud}`,
    `- Target key plan status: \`${packet.summary.targetKeyPlanStatus}\``,
    `- Target key local/cloud decisions: ${packet.summary.targetKeyLocalCloudDecisions}`,
    `- Target key blocker domains: ${packet.summary.targetKeyBlockerDomains}`,
    `- Target key blockers: ${packet.summary.targetKeyBlockers}`,
    `- TK2 contracts clean: ${packet.summary.tk2ContractsClean ? 'yes' : 'no'}`,
    `- Recommended next safe slice: \`${packet.summary.recommendedNextSafeSlice}\``,
    `- Can continue architecture work: ${packet.summary.canContinueArchitectureWork ? 'yes' : 'no'}`,
    `- May start French generation: ${packet.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${packet.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Contract State',
    '',
    `- sync_under_target keys: ${packet.contractState.syncUnderTargetKeys.length}`,
    `- keep_local_target_scoped keys: ${packet.contractState.keepLocalTargetScopedKeys.length}`,
    `- covered_by_existing_cloud_pattern keys: ${packet.contractState.coveredByExistingCloudPatternKeys.length}`,
    `- block_unknown keys: ${packet.contractState.blockUnknownKeys.length}`,
    `- missing target-sensitive local keys: ${packet.contractState.missingTargetSensitiveLocalKeys.length}`,
    '',
    '## Required Next Actions',
    '',
  ];
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
    console.error('Usage: npx tsx scripts/gustav_tk2_local_cloud_decision_contracts_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditDir = path.join(runDir, 'audits');
  const localCloudPath = path.join(auditDir, 'local_cloud_decision_table.json');
  const cloudPath = path.join(auditDir, 'cloud_sync_mapping.json');
  const targetKeyPath = path.join(auditDir, 'target_key_integration_plan.json');
  const slicePath = path.join(auditDir, 'target_key_slice_packet.json');
  const localCloud = readJson<Record<string, unknown>>(localCloudPath);
  const cloud = readJson<Record<string, unknown>>(cloudPath);
  const targetKey = readJson<Record<string, unknown>>(targetKeyPath);
  const slice = readJson<Record<string, unknown>>(slicePath);
  const localCloudSummary = object(localCloud.summary);
  const cloudSummary = object(cloud.summary);
  const targetKeySummary = object(targetKey.summary);
  const sliceSummary = object(slice.summary);
  const localCloudEntries = arr<Record<string, unknown>>(localCloud.entries);
  const missingTargetSensitiveLocalKeys = arr<string>(object(cloud.storageComparison).targetSensitiveLocalKeysMissingFromCloud)
    .filter((entry) => typeof entry === 'string');

  const tk2ContractsClean =
    statusOf(localCloud) === 'PASS' &&
    n(localCloudSummary, 'entries') === 0 &&
    n(localCloudSummary, 'blockers') === 0 &&
    n(localCloudSummary, 'highRisks') === 0 &&
    statusOf(cloud) === 'PASS' &&
    n(cloudSummary, 'blockUnknown') === 0 &&
    n(cloudSummary, 'targetSensitiveLocalKeysMissingFromCloud') === 0 &&
    missingTargetSensitiveLocalKeys.length === 0;

  const packet: Packet = {
    schemaVersion: 'gustav-tk2-local-cloud-decision-contracts-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: tk2ContractsClean ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      localCloudDecisionTable: artifactPath(repoRoot, localCloudPath),
      cloudSyncMapping: artifactPath(repoRoot, cloudPath),
      targetKeyIntegrationPlan: artifactPath(repoRoot, targetKeyPath),
      targetKeySlicePacket: artifactPath(repoRoot, slicePath),
    },
    summary: {
      localCloudStatus: statusOf(localCloud),
      localCloudEntries: n(localCloudSummary, 'entries'),
      localCloudBlockers: n(localCloudSummary, 'blockers'),
      localCloudHighRisks: n(localCloudSummary, 'highRisks'),
      cloudMappingStatus: statusOf(cloud),
      cloudTargetBucketRequired: n(cloudSummary, 'targetBucketRequired'),
      cloudBlockUnknown: n(cloudSummary, 'blockUnknown'),
      cloudTargetSensitiveMissingFromCloud: n(cloudSummary, 'targetSensitiveLocalKeysMissingFromCloud'),
      targetKeyPlanStatus: statusOf(targetKey),
      targetKeyLocalCloudDecisions: n(targetKeySummary, 'localCloudDecisions'),
      targetKeyBlockerDomains: n(targetKeySummary, 'blockerDomains'),
      targetKeyBlockers: n(targetKeySummary, 'blockers'),
      tk2ContractsClean,
      recommendedNextSafeSlice: tk2ContractsClean ? 'TK3_P3_STORE_CONTRACTS' : 'TK2_LOCAL_CLOUD_DECISION_CONTRACTS',
      canContinueArchitectureWork: b(sliceSummary, 'canContinueArchitectureWork'),
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    contractState: {
      syncUnderTargetKeys: keysForAction(localCloudEntries, 'sync_under_target'),
      keepLocalTargetScopedKeys: keysForAction(localCloudEntries, 'keep_local_target_scoped'),
      coveredByExistingCloudPatternKeys: keysForAction(localCloudEntries, 'covered_by_existing_cloud_pattern'),
      blockUnknownKeys: keysForAction(localCloudEntries, 'block_unknown'),
      missingTargetSensitiveLocalKeys,
    },
    requiredNextActions: tk2ContractsClean
      ? [
          'Proceed to TK3 P3 store contracts as audit-only work.',
          'Do not start implementation while target_key_integration_plan remains HOLD.',
          'Keep cloud restore implementation locked behind explicit future apply approval.',
        ]
      : [
          'Resolve local/cloud decision blockers before TK3.',
          'Assign target/local/cloud/source/global scope to every missing target-sensitive local key.',
          'Keep TK2 in audit-only mode.',
        ],
    forbiddenActions: [
      'Do not treat DALSHE as approval.',
      'Do not edit app/cloud_sync.ts from this packet.',
      'Do not edit AsyncStorage call sites from this packet.',
      'Do not create migration adapters from this packet.',
      'Do not start French generation.',
    ],
    notes: [
      'This packet records TK2 contract readiness only; it is not a production apply plan.',
      'Cloud mapping may still require future target-bucket implementation, but there are no missing local/cloud decisions in the current artifacts.',
      'French generation remains blocked by other readiness gates.',
    ],
  };

  const outJson = path.join(auditDir, 'tk2_local_cloud_decision_contracts_packet.json');
  const outMd = path.join(auditDir, 'tk2_local_cloud_decision_contracts_packet.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(packet));

  console.log(`GUSTAV TK2 local/cloud decision contracts packet: ${packet.status}`);
  console.log(`Local/cloud blockers: ${packet.summary.localCloudBlockers}`);
  console.log(`Missing target-sensitive local keys: ${packet.contractState.missingTargetSensitiveLocalKeys.length}`);
  console.log(`Recommended next safe slice: ${packet.summary.recommendedNextSafeSlice}`);
  console.log(`May start French generation: ${packet.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
