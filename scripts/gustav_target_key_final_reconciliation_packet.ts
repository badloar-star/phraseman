import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD';

type DomainCoverage = {
  domain: string;
  originalStatus: string;
  originalRisk: string;
  blockers: string[];
  coveredBy: string[];
  coverageRule: string;
};

type Packet = {
  schemaVersion: 'gustav-target-key-final-reconciliation-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    targetKeyIntegrationPlan: string;
    targetKeySlicePacket: string;
    tk1UnknownTargetStorageClassificationPacket: string;
    tk2LocalCloudDecisionContractsPacket: string;
    tk3P3StoreContractsPacket: string;
    tk4AchievementStatsCloudPolicyPacket: string;
    tk5SurfaceRawGuardsPacket: string;
  };
  summary: {
    targetKeyPlanStatus: string;
    targetKeyDomains: number;
    targetKeyBlockerDomains: number;
    targetKeyBlockers: number;
    rawTargetStorageRecords: number;
    tk1UnknownClassificationClean: boolean;
    tk2LocalCloudContractsClean: boolean;
    tk3P3StoreContractsClean: boolean;
    tk4AchievementStatsCloudPolicyClean: boolean;
    tk5SurfaceRawGuardsClean: boolean;
    coveredDomains: number;
    coveredBlockerDomains: number;
    coveredBlockers: number;
    uncoveredBlockers: number;
    finalReconciliationClean: boolean;
    recommendedNextSafeSlice: string;
    canPassRDY050Now: boolean;
    canContinueArchitectureWork: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  domainCoverage: DomainCoverage[];
  requiredNextActions: string[];
  forbiddenActions: string[];
  notes: string[];
};

const COVERAGE: Record<string, { coveredBy: string[]; coverageRule: string }> = {
  study_target_model: {
    coveredBy: ['TK5_SURFACE_AND_RAW_GUARDS'],
    coverageRule: 'Production French activation is guarded from dev StudyTargetLang/Spanish paths until implementation approval.',
  },
  target_key_builder: {
    coveredBy: ['TK1_UNKNOWN_TARGET_STORAGE_CLASSIFICATION', 'TK2_LOCAL_CLOUD_DECISION_CONTRACTS', 'TK3_P3_STORE_CONTRACTS', 'TK5_SURFACE_AND_RAW_GUARDS'],
    coverageRule: 'Raw target storage is zero, all local/cloud contracts are clean, P3 store APIs are drafted, and raw surface guards are complete.',
  },
  lesson_progress: {
    coveredBy: ['TK3_P3_STORE_CONTRACTS', 'TK5_SURFACE_AND_RAW_GUARDS'],
    coverageRule: 'Lesson progress store contract and surface guards define en compatibility and fr fail-closed behavior.',
  },
  lesson_session_local: {
    coveredBy: ['TK2_LOCAL_CLOUD_DECISION_CONTRACTS', 'TK5_SURFACE_AND_RAW_GUARDS'],
    coverageRule: 'Local-only target-scoped session policy is clean and guarded from cloud sync.',
  },
  lesson_rewards: {
    coveredBy: ['TK2_LOCAL_CLOUD_DECISION_CONTRACTS', 'TK5_SURFACE_AND_RAW_GUARDS'],
    coverageRule: 'Reward/idempotency target policy is covered by local/cloud decisions and surface guards.',
  },
  level_exams: {
    coveredBy: ['TK3_P3_STORE_CONTRACTS', 'TK5_SURFACE_AND_RAW_GUARDS'],
    coverageRule: 'Exam and certificate store contract isolates proof state by study target.',
  },
  trainer_practice: {
    coveredBy: ['TK3_P3_STORE_CONTRACTS', 'TK5_SURFACE_AND_RAW_GUARDS'],
    coverageRule: 'Trainer, active recall and mistake diagnosis contracts isolate target practice state.',
  },
  personal_practice: {
    coveredBy: ['TK3_P3_STORE_CONTRACTS', 'TK5_SURFACE_AND_RAW_GUARDS'],
    coverageRule: 'Personal practice contract separates studyTarget diagnosis from sourceLocale feedback.',
  },
  achievements: {
    coveredBy: ['TK4_ACHIEVEMENTS_STATS_CLOUD_POLICY', 'TK5_SURFACE_AND_RAW_GUARDS'],
    coverageRule: 'Mixed achievements have explicit global policy and target achievement state is guarded from English fallback.',
  },
  cloud_sync: {
    coveredBy: ['TK2_LOCAL_CLOUD_DECISION_CONTRACTS', 'TK3_P3_STORE_CONTRACTS', 'TK5_SURFACE_AND_RAW_GUARDS'],
    coverageRule: 'Cloud target bucket mapping, store contracts and restore guards cover target sync behavior.',
  },
  flashcards: {
    coveredBy: ['TK3_P3_STORE_CONTRACTS', 'TK5_SURFACE_AND_RAW_GUARDS'],
    coverageRule: 'Flashcard store contract isolates cards/progress/pack ownership by study target.',
  },
  analytics_stats: {
    coveredBy: ['TK4_ACHIEVEMENTS_STATS_CLOUD_POLICY', 'TK5_SURFACE_AND_RAW_GUARDS'],
    coverageRule: 'Stats payload policy separates global engagement from target learning metrics.',
  },
  source_locale_preferences: {
    coveredBy: ['TK5_SURFACE_AND_RAW_GUARDS'],
    coverageRule: 'Surface guards require sourceLocale changes to affect copy only, not studyTarget progress.',
  },
  unknown_target_storage: {
    coveredBy: ['TK1_UNKNOWN_TARGET_STORAGE_CLASSIFICATION'],
    coverageRule: 'Unknown target storage has zero current records and stale evidence is cleared.',
  },
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
    '# GUSTAV Target Key Final Reconciliation Packet',
    '',
    `Run: \`${packet.runId}\``,
    '',
    `Status: \`${packet.status}\``,
    '',
    `Generated at: ${packet.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Target key plan status: \`${packet.summary.targetKeyPlanStatus}\``,
    `- Target key domains: ${packet.summary.targetKeyDomains}`,
    `- Target key blocker domains: ${packet.summary.targetKeyBlockerDomains}`,
    `- Target key blockers: ${packet.summary.targetKeyBlockers}`,
    `- Raw target storage records: ${packet.summary.rawTargetStorageRecords}`,
    `- TK1 unknown classification clean: ${packet.summary.tk1UnknownClassificationClean ? 'yes' : 'no'}`,
    `- TK2 local/cloud contracts clean: ${packet.summary.tk2LocalCloudContractsClean ? 'yes' : 'no'}`,
    `- TK3 P3 store contracts clean: ${packet.summary.tk3P3StoreContractsClean ? 'yes' : 'no'}`,
    `- TK4 achievement/stats/cloud policy clean: ${packet.summary.tk4AchievementStatsCloudPolicyClean ? 'yes' : 'no'}`,
    `- TK5 surface/raw guards clean: ${packet.summary.tk5SurfaceRawGuardsClean ? 'yes' : 'no'}`,
    `- Covered blocker domains: ${packet.summary.coveredBlockerDomains}`,
    `- Covered blockers: ${packet.summary.coveredBlockers}`,
    `- Uncovered blockers: ${packet.summary.uncoveredBlockers}`,
    `- Final reconciliation clean: ${packet.summary.finalReconciliationClean ? 'yes' : 'no'}`,
    `- Can pass RDY-050 now: ${packet.summary.canPassRDY050Now ? 'yes' : 'no'}`,
    `- Recommended next safe slice: \`${packet.summary.recommendedNextSafeSlice}\``,
    `- May start French generation: ${packet.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${packet.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Domain Coverage',
    '',
  ];
  for (const coverage of packet.domainCoverage) {
    lines.push(`### ${coverage.domain}`);
    lines.push('');
    lines.push(`- Original status: \`${coverage.originalStatus}\``);
    lines.push(`- Original risk: \`${coverage.originalRisk}\``);
    lines.push(`- Blockers: ${coverage.blockers.length}`);
    lines.push(`- Covered by: ${coverage.coveredBy.map((item) => `\`${item}\``).join(', ')}`);
    lines.push(`- Coverage rule: ${coverage.coverageRule}`);
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
    console.error('Usage: npx tsx scripts/gustav_target_key_final_reconciliation_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditDir = path.join(runDir, 'audits');
  const targetKeyPath = path.join(auditDir, 'target_key_integration_plan.json');
  const slicePath = path.join(auditDir, 'target_key_slice_packet.json');
  const tk1Path = path.join(auditDir, 'tk1_unknown_target_storage_classification_packet.json');
  const tk2Path = path.join(auditDir, 'tk2_local_cloud_decision_contracts_packet.json');
  const tk3Path = path.join(auditDir, 'tk3_p3_store_contracts_packet.json');
  const tk4Path = path.join(auditDir, 'tk4_achievement_stats_cloud_policy_packet.json');
  const tk5Path = path.join(auditDir, 'tk5_surface_raw_guards_packet.json');

  const targetKey = readJson<Record<string, unknown>>(targetKeyPath);
  const slice = readJson<Record<string, unknown>>(slicePath);
  const tk1 = readJson<Record<string, unknown>>(tk1Path);
  const tk2 = readJson<Record<string, unknown>>(tk2Path);
  const tk3 = readJson<Record<string, unknown>>(tk3Path);
  const tk4 = readJson<Record<string, unknown>>(tk4Path);
  const tk5 = readJson<Record<string, unknown>>(tk5Path);

  const targetSummary = object(targetKey.summary);
  const sliceSummary = object(slice.summary);
  const tk1Summary = object(tk1.summary);
  const tk2Summary = object(tk2.summary);
  const tk3Summary = object(tk3.summary);
  const tk4Summary = object(tk4.summary);
  const tk5Summary = object(tk5.summary);
  const domains = arr<Record<string, unknown>>(targetKey.domains);
  const domainCoverage = domains.map((domain): DomainCoverage => {
    const domainName = String(domain.domain || '');
    const coverage = COVERAGE[domainName] || {
      coveredBy: [],
      coverageRule: 'No reconciliation coverage exists for this domain.',
    };
    return {
      domain: domainName,
      originalStatus: statusOf(domain),
      originalRisk: String(domain.risk || ''),
      blockers: arr<string>(domain.blockers).filter((entry) => typeof entry === 'string'),
      coveredBy: coverage.coveredBy,
      coverageRule: coverage.coverageRule,
    };
  });
  const blockedDomains = domainCoverage.filter((entry) => entry.blockers.length > 0);
  const coveredBlockerDomains = blockedDomains.filter((entry) => entry.coveredBy.length > 0).length;
  const coveredBlockers = blockedDomains.reduce((sum, entry) => (
    sum + (entry.coveredBy.length > 0 ? entry.blockers.length : 0)
  ), 0);
  const targetKeyBlockers = n(targetSummary, 'blockers');
  const tk1UnknownClassificationClean =
    statusOf(tk1) === 'HOLD' &&
    n(tk1Summary, 'targetPlanUnknownRecords') === 0 &&
    n(tk1Summary, 'currentUnknownTargetRecordsInPlanFiles') === 0 &&
    b(tk1Summary, 'staleEvidenceDetected') === false;
  const tk2LocalCloudContractsClean = statusOf(tk2) === 'PASS' && b(tk2Summary, 'tk2ContractsClean');
  const tk3P3StoreContractsClean = statusOf(tk3) === 'PASS' && b(tk3Summary, 'tk3ContractsClean');
  const tk4AchievementStatsCloudPolicyClean = statusOf(tk4) === 'PASS' && b(tk4Summary, 'tk4PolicyClean');
  const tk5SurfaceRawGuardsClean = statusOf(tk5) === 'PASS' && b(tk5Summary, 'tk5SurfaceGuardsClean');
  const uncoveredBlockers = Math.max(0, targetKeyBlockers - coveredBlockers);
  const finalReconciliationClean =
    n(targetSummary, 'rawTargetStorageRecords') === 0 &&
    coveredBlockerDomains === n(targetSummary, 'blockerDomains') &&
    coveredBlockers === targetKeyBlockers &&
    uncoveredBlockers === 0 &&
    tk1UnknownClassificationClean &&
    tk2LocalCloudContractsClean &&
    tk3P3StoreContractsClean &&
    tk4AchievementStatsCloudPolicyClean &&
    tk5SurfaceRawGuardsClean;

  const packet: Packet = {
    schemaVersion: 'gustav-target-key-final-reconciliation-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: finalReconciliationClean ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      targetKeyIntegrationPlan: artifactPath(repoRoot, targetKeyPath),
      targetKeySlicePacket: artifactPath(repoRoot, slicePath),
      tk1UnknownTargetStorageClassificationPacket: artifactPath(repoRoot, tk1Path),
      tk2LocalCloudDecisionContractsPacket: artifactPath(repoRoot, tk2Path),
      tk3P3StoreContractsPacket: artifactPath(repoRoot, tk3Path),
      tk4AchievementStatsCloudPolicyPacket: artifactPath(repoRoot, tk4Path),
      tk5SurfaceRawGuardsPacket: artifactPath(repoRoot, tk5Path),
    },
    summary: {
      targetKeyPlanStatus: statusOf(targetKey),
      targetKeyDomains: n(targetSummary, 'domains'),
      targetKeyBlockerDomains: n(targetSummary, 'blockerDomains'),
      targetKeyBlockers,
      rawTargetStorageRecords: n(targetSummary, 'rawTargetStorageRecords'),
      tk1UnknownClassificationClean,
      tk2LocalCloudContractsClean,
      tk3P3StoreContractsClean,
      tk4AchievementStatsCloudPolicyClean,
      tk5SurfaceRawGuardsClean,
      coveredDomains: domainCoverage.filter((entry) => entry.coveredBy.length > 0).length,
      coveredBlockerDomains,
      coveredBlockers,
      uncoveredBlockers,
      finalReconciliationClean,
      recommendedNextSafeSlice: finalReconciliationClean ? 'TRANSLATION_START_GATE_RECHECK' : 'TARGET_KEY_PLAN_FINAL_RECONCILIATION',
      canPassRDY050Now: finalReconciliationClean,
      canContinueArchitectureWork: b(sliceSummary, 'canContinueArchitectureWork'),
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    domainCoverage,
    requiredNextActions: finalReconciliationClean
      ? [
          'Allow RDY-050 to use this packet as final target-key architecture reconciliation.',
          'Re-run readiness gate and translation start gate.',
          'Keep production implementation and apply locked behind exact future approvals.',
        ]
      : [
          'Cover every target-key blocker domain with TK1-TK5 contract evidence.',
          'Keep final reconciliation in audit-only mode.',
        ],
    forbiddenActions: [
      'Do not treat DALSHE as approval.',
      'Do not edit production app files from this packet.',
      'Do not create migration adapters from this packet.',
      'Do not change storage keys from this packet.',
      'Do not start French generation until readiness says GO.',
    ],
    notes: [
      'This packet reconciles target-key architecture blockers against TK1-TK5 audit contracts.',
      'It does not authorize production app writes or migrations.',
      'It can clear RDY-050 only as a generation-readiness architecture contract; production apply remains separately gated.',
    ],
  };

  const outJson = path.join(auditDir, 'target_key_final_reconciliation_packet.json');
  const outMd = path.join(auditDir, 'target_key_final_reconciliation_packet.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(packet));

  console.log(`GUSTAV target key final reconciliation packet: ${packet.status}`);
  console.log(`Covered blockers: ${packet.summary.coveredBlockers}/${packet.summary.targetKeyBlockers}`);
  console.log(`Covered blocker domains: ${packet.summary.coveredBlockerDomains}/${packet.summary.targetKeyBlockerDomains}`);
  console.log(`Can pass RDY-050 now: ${packet.summary.canPassRDY050Now ? 'yes' : 'no'}`);
  console.log(`Recommended next safe slice: ${packet.summary.recommendedNextSafeSlice}`);
  console.log(`May start French generation: ${packet.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
