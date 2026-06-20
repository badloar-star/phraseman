import * as fs from 'node:fs';
import * as path from 'node:path';

type Audit = {
  schemaVersion: 'gustav-target-key-plan-regeneration-audit-v0';
  runId: string;
  generatedAt: string;
  status: 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    targetKeyIntegrationPlan: string;
    tk1UnknownTargetStorageClassificationPacket: string;
    targetKeySlicePacket: string;
  };
  summary: {
    targetKeyPlanStatus: string;
    rawTargetStorageRecords: number;
    blockerDomains: number;
    blockers: number;
    unknownDomainStatus: string;
    unknownDomainRisk: string;
    unknownDomainBlockers: number;
    unknownDomainTouchpoints: number;
    tk1TargetPlanUnknownRecords: number;
    tk1CurrentUnknownTargetRecords: number;
    tk1StaleEvidenceDetected: boolean;
    tk1UnknownClassificationClean: boolean;
    recommendedNextSafeSlice: string;
    readinessCanPassRDY050Now: boolean;
    canContinueArchitectureWork: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  remainingTargetKeyBlockers: Array<{
    domain: string;
    status: string;
    risk: string;
    blockers: number;
  }>;
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

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV Target Key Plan Regeneration Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Target key plan status: \`${audit.summary.targetKeyPlanStatus}\``,
    `- Raw target storage records: ${audit.summary.rawTargetStorageRecords}`,
    `- Blocker domains: ${audit.summary.blockerDomains}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Unknown domain status: \`${audit.summary.unknownDomainStatus}\``,
    `- Unknown domain risk: \`${audit.summary.unknownDomainRisk}\``,
    `- Unknown domain blockers: ${audit.summary.unknownDomainBlockers}`,
    `- Unknown domain touchpoints: ${audit.summary.unknownDomainTouchpoints}`,
    `- TK1 target plan unknown records: ${audit.summary.tk1TargetPlanUnknownRecords}`,
    `- TK1 current unknown target records: ${audit.summary.tk1CurrentUnknownTargetRecords}`,
    `- TK1 stale evidence detected: ${audit.summary.tk1StaleEvidenceDetected ? 'yes' : 'no'}`,
    `- TK1 unknown classification clean: ${audit.summary.tk1UnknownClassificationClean ? 'yes' : 'no'}`,
    `- Recommended next safe slice: \`${audit.summary.recommendedNextSafeSlice}\``,
    `- Readiness can pass RDY-050 now: ${audit.summary.readinessCanPassRDY050Now ? 'yes' : 'no'}`,
    `- Can continue architecture work: ${audit.summary.canContinueArchitectureWork ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Remaining Target-Key Blockers',
    '',
  ];

  for (const blocker of audit.remainingTargetKeyBlockers) {
    lines.push(`- \`${blocker.domain}\`: status=\`${blocker.status}\`, risk=\`${blocker.risk}\`, blockers=${blocker.blockers}`);
  }

  lines.push('', '## Required Next Actions', '');
  for (const action of audit.requiredNextActions) lines.push(`- ${action}`);
  lines.push('', '## Forbidden Actions', '');
  for (const action of audit.forbiddenActions) lines.push(`- ${action}`);
  lines.push('', '## Notes', '');
  for (const note of audit.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_target_key_plan_regeneration_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditDir = path.join(runDir, 'audits');
  const targetKeyPath = path.join(auditDir, 'target_key_integration_plan.json');
  const tk1Path = path.join(auditDir, 'tk1_unknown_target_storage_classification_packet.json');
  const slicePath = path.join(auditDir, 'target_key_slice_packet.json');
  const targetKey = readJson<Record<string, unknown>>(targetKeyPath);
  const tk1 = readJson<Record<string, unknown>>(tk1Path);
  const slice = readJson<Record<string, unknown>>(slicePath);
  const targetSummary = object(targetKey.summary);
  const tk1Summary = object(tk1.summary);
  const sliceSummary = object(slice.summary);
  const domains = arr<Record<string, unknown>>(targetKey.domains);
  const unknownDomain = domains.find((domain) => domain.domain === 'unknown_target_storage') ?? {};
  const remainingTargetKeyBlockers = domains
    .map((domain) => ({
      domain: String(domain.domain || ''),
      status: String(domain.status || ''),
      risk: String(domain.risk || ''),
      blockers: arr(domain.blockers).length,
    }))
    .filter((domain) => domain.status !== 'PASS' || domain.risk === 'blocker' || domain.blockers > 0);
  const readinessCanPassRDY050Now =
    targetKey.status === 'PASS' &&
    n(targetSummary, 'blockers') === 0 &&
    n(targetSummary, 'blockerDomains') === 0;

  const audit: Audit = {
    schemaVersion: 'gustav-target-key-plan-regeneration-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      targetKeyIntegrationPlan: artifactPath(repoRoot, targetKeyPath),
      tk1UnknownTargetStorageClassificationPacket: artifactPath(repoRoot, tk1Path),
      targetKeySlicePacket: artifactPath(repoRoot, slicePath),
    },
    summary: {
      targetKeyPlanStatus: String(targetKey.status || ''),
      rawTargetStorageRecords: n(targetSummary, 'rawTargetStorageRecords'),
      blockerDomains: n(targetSummary, 'blockerDomains'),
      blockers: n(targetSummary, 'blockers'),
      unknownDomainStatus: String(unknownDomain.status || ''),
      unknownDomainRisk: String(unknownDomain.risk || ''),
      unknownDomainBlockers: arr(unknownDomain.blockers).length,
      unknownDomainTouchpoints: arr(unknownDomain.fileTouchpoints).length,
      tk1TargetPlanUnknownRecords: n(tk1Summary, 'targetPlanUnknownRecords'),
      tk1CurrentUnknownTargetRecords: n(tk1Summary, 'currentUnknownTargetRecordsInPlanFiles'),
      tk1StaleEvidenceDetected: b(tk1Summary, 'staleEvidenceDetected'),
      tk1UnknownClassificationClean: b(sliceSummary, 'tk1UnknownClassificationClean'),
      recommendedNextSafeSlice: String(sliceSummary.recommendedNextSafeSlice || ''),
      readinessCanPassRDY050Now,
      canContinueArchitectureWork: b(sliceSummary, 'canContinueArchitectureWork'),
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    remainingTargetKeyBlockers,
    requiredNextActions: [
      'Continue with TK2 local/cloud decision contracts as audit-only work.',
      'Do not start implementation while target_key_integration_plan is HOLD.',
      'Keep P1A/P1B approval gates separate from target-key architecture packets.',
      'Rerun readiness gate after each target-key architecture amendment.',
    ],
    forbiddenActions: [
      'Do not treat DALSHE as approval.',
      'Do not modify production app files from this audit.',
      'Do not create migration adapters from this audit.',
      'Do not start French generation while RDY-050 is still failing.',
    ],
    notes: [
      'This audit records progress inside RDY-050: raw target storage and unknown target storage are now clean in current artifacts.',
      'RDY-050 still cannot pass because target_key_integration_plan remains HOLD with remaining architectural blocker domains.',
      'The next safe blocker-reduction slice is local/cloud decision contracts.',
    ],
  };

  const outJson = path.join(auditDir, 'target_key_plan_regeneration_audit.json');
  const outMd = path.join(auditDir, 'target_key_plan_regeneration_audit.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV target key plan regeneration audit: ${audit.status}`);
  console.log(`Raw target storage records: ${audit.summary.rawTargetStorageRecords}`);
  console.log(`Unknown domain status: ${audit.summary.unknownDomainStatus}`);
  console.log(`Blocker domains: ${audit.summary.blockerDomains}`);
  console.log(`Recommended next safe slice: ${audit.summary.recommendedNextSafeSlice}`);
  console.log(`Readiness can pass RDY-050 now: ${audit.summary.readinessCanPassRDY050Now ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
