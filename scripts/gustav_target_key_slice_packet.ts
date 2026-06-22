import * as fs from 'node:fs';
import * as path from 'node:path';

type Mode = 'approval' | 'architecture' | 'implementation-after-approval';

type SourceArtifact = {
  path: string;
  status: string;
  summary: Record<string, unknown>;
};

type DomainSlice = {
  id: string;
  title: string;
  mode: Mode;
  canDoNow: boolean;
  canModifyProductionAppFiles: false;
  requiresExactApprovalBeforeWrites: boolean;
  dependsOn: string[];
  domains: string[];
  adapters: string[];
  blockerCount: number;
  rawTargetStorageRecords: number;
  topFiles: string[];
  allowedWorkNow: string[];
  blockedActions: string[];
  exitCriteria: string[];
  rationale: string;
};

type Packet = {
  schemaVersion: 'gustav-target-key-slice-packet-v0';
  runId: string;
  generatedAt: string;
  status: 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: Record<string, SourceArtifact>;
  summary: {
    targetKeyPlanStatus: string;
    domains: number;
    blockerDomains: number;
    targetKeyBlockers: number;
    rawTargetStorageRecords: number;
    localCloudBlockers: number;
    migrationAdapters: number;
    phaseDependencyStatus: string;
    p1aApprovalReceiptExists: boolean;
    p1aActiveHashLockExists: boolean;
    p1bCanStartNow: boolean;
    staleP1BAssumptionDetected: boolean;
    implementationWritesAllowedNow: boolean;
    canContinueArchitectureWork: boolean;
    tk1UnknownClassificationClean: boolean;
    tk2LocalCloudContractsClean: boolean;
    tk3P3StoreContractsClean: boolean;
    tk4AchievementStatsCloudPolicyClean: boolean;
    tk5SurfaceRawGuardsClean: boolean;
    targetKeyFinalReconciliationClean: boolean;
    recommendedNextSafeSlice: string;
    slices: number;
  };
  slices: DomainSlice[];
  forbiddenActions: string[];
  recommendedNextOrder: string[];
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

function s(value: Record<string, unknown>, key: string): string {
  return typeof value[key] === 'string' ? value[key] as string : '';
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function loadArtifact(repoRoot: string, filePath: string): SourceArtifact {
  const raw = readJson<Record<string, unknown>>(filePath);
  return {
    path: artifactPath(repoRoot, filePath),
    status: String(raw.status || raw.decision || ''),
    summary: object(raw.summary),
  };
}

function loadOptionalArtifact(repoRoot: string, filePath: string): SourceArtifact {
  if (!fs.existsSync(filePath)) {
    return {
      path: artifactPath(repoRoot, filePath),
      status: 'MISSING',
      summary: {},
    };
  }
  return loadArtifact(repoRoot, filePath);
}

function domainBlockers(domains: Record<string, unknown>[], names: string[]): number {
  return domains
    .filter((domain) => names.includes(String(domain.domain || '')))
    .reduce((sum, domain) => sum + arr(domain.blockers).length, 0);
}

function domainRecords(domains: Record<string, unknown>[], names: string[]): number {
  return domains
    .filter((domain) => names.includes(String(domain.domain || '')))
    .reduce((sum, domain) => (
      sum + arr<Record<string, unknown>>(domain.fileTouchpoints)
        .reduce((inner, touchpoint) => inner + n(touchpoint, 'records'), 0)
    ), 0);
}

function domainTopFiles(domains: Record<string, unknown>[], names: string[], limit: number): string[] {
  const files = new Map<string, number>();
  for (const domain of domains.filter((entry) => names.includes(String(entry.domain || '')))) {
    for (const touchpoint of arr<Record<string, unknown>>(domain.fileTouchpoints)) {
      const sourcePath = String(touchpoint.sourcePath || '');
      if (!sourcePath) continue;
      files.set(sourcePath, (files.get(sourcePath) || 0) + n(touchpoint, 'records'));
    }
  }
  return Array.from(files.entries())
    .sort((a, bEntry) => bEntry[1] - a[1] || a[0].localeCompare(bEntry[0]))
    .slice(0, limit)
    .map(([sourcePath]) => sourcePath);
}

function adapterFiles(adapters: Record<string, unknown>[], ids: string[], limit: number): string[] {
  const files = new Map<string, number>();
  for (const adapter of adapters.filter((entry) => ids.includes(String(entry.id || entry.adapterId || '')))) {
    for (const sourcePath of arr<string>(adapter.sourceFiles || adapter.applyPlanFiles).filter((entry) => typeof entry === 'string')) {
      files.set(sourcePath, (files.get(sourcePath) || 0) + 1);
    }
  }
  return Array.from(files.entries())
    .sort((a, bEntry) => bEntry[1] - a[1] || a[0].localeCompare(bEntry[0]))
    .slice(0, limit)
    .map(([sourcePath]) => sourcePath);
}

function renderMarkdown(packet: Packet): string {
  const lines = [
    '# GUSTAV Target Key Slice Packet',
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
    `- Domains: ${packet.summary.domains}`,
    `- Blocker domains: ${packet.summary.blockerDomains}`,
    `- Target key blockers: ${packet.summary.targetKeyBlockers}`,
    `- Raw target storage records: ${packet.summary.rawTargetStorageRecords}`,
    `- Local/cloud blockers: ${packet.summary.localCloudBlockers}`,
    `- Migration adapters: ${packet.summary.migrationAdapters}`,
    `- Phase dependency status: \`${packet.summary.phaseDependencyStatus}\``,
    `- P1A approval receipt exists: ${packet.summary.p1aApprovalReceiptExists ? 'yes' : 'no'}`,
    `- P1A active hash-lock exists: ${packet.summary.p1aActiveHashLockExists ? 'yes' : 'no'}`,
    `- P1B can start now: ${packet.summary.p1bCanStartNow ? 'yes' : 'no'}`,
    `- Stale P1B assumption detected: ${packet.summary.staleP1BAssumptionDetected ? 'yes' : 'no'}`,
    `- Implementation writes allowed now: ${packet.summary.implementationWritesAllowedNow ? 'yes' : 'no'}`,
    `- Can continue architecture work: ${packet.summary.canContinueArchitectureWork ? 'yes' : 'no'}`,
    `- TK1 unknown classification clean: ${packet.summary.tk1UnknownClassificationClean ? 'yes' : 'no'}`,
    `- TK2 local/cloud contracts clean: ${packet.summary.tk2LocalCloudContractsClean ? 'yes' : 'no'}`,
    `- TK3 P3 store contracts clean: ${packet.summary.tk3P3StoreContractsClean ? 'yes' : 'no'}`,
    `- TK4 achievement/stats/cloud policy clean: ${packet.summary.tk4AchievementStatsCloudPolicyClean ? 'yes' : 'no'}`,
    `- TK5 surface/raw guards clean: ${packet.summary.tk5SurfaceRawGuardsClean ? 'yes' : 'no'}`,
    `- Target key final reconciliation clean: ${packet.summary.targetKeyFinalReconciliationClean ? 'yes' : 'no'}`,
    `- Recommended next safe slice: \`${packet.summary.recommendedNextSafeSlice}\``,
    `- Slices: ${packet.summary.slices}`,
    '',
    '## Slices',
    '',
  ];

  for (const slice of packet.slices) {
    lines.push(`### ${slice.id}`);
    lines.push('');
    lines.push(`- Title: ${slice.title}`);
    lines.push(`- Mode: \`${slice.mode}\``);
    lines.push(`- Can do now: ${slice.canDoNow ? 'yes' : 'no'}`);
    lines.push(`- Can modify production app files: ${slice.canModifyProductionAppFiles ? 'yes' : 'no'}`);
    lines.push(`- Requires exact approval before writes: ${slice.requiresExactApprovalBeforeWrites ? 'yes' : 'no'}`);
    lines.push(`- Depends on: ${slice.dependsOn.length ? slice.dependsOn.map((item) => `\`${item}\``).join(', ') : '`none`'}`);
    lines.push(`- Domains: ${slice.domains.map((item) => `\`${item}\``).join(', ')}`);
    lines.push(`- Adapters: ${slice.adapters.length ? slice.adapters.map((item) => `\`${item}\``).join(', ') : '`none`'}`);
    lines.push(`- Blockers: ${slice.blockerCount}`);
    lines.push(`- Raw target storage records: ${slice.rawTargetStorageRecords}`);
    if (slice.topFiles.length > 0) {
      lines.push('- Top files:');
      for (const file of slice.topFiles) lines.push(`  - \`${file}\``);
    }
    lines.push('- Allowed work now:');
    for (const item of slice.allowedWorkNow) lines.push(`  - ${item}`);
    lines.push('- Blocked actions:');
    for (const item of slice.blockedActions) lines.push(`  - ${item}`);
    lines.push('- Exit criteria:');
    for (const item of slice.exitCriteria) lines.push(`  - ${item}`);
    lines.push(`- Rationale: ${slice.rationale}`);
    lines.push('');
  }

  lines.push('## Forbidden Actions', '');
  for (const action of packet.forbiddenActions) lines.push(`- ${action}`);
  lines.push('', '## Recommended Next Order', '');
  packet.recommendedNextOrder.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
  lines.push('', '## Notes', '');
  for (const note of packet.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_target_key_slice_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditDir = path.join(runDir, 'audits');
  const artifactFiles = {
    targetKeyIntegrationPlan: path.join(auditDir, 'target_key_integration_plan.json'),
    localCloudDecisionTable: path.join(auditDir, 'local_cloud_decision_table.json'),
    migrationAdapterPlan: path.join(auditDir, 'migration_adapter_plan.json'),
    phaseDependencyAudit: path.join(auditDir, 'phase_dependency_audit.json'),
    p1ExecutionSliceAudit: path.join(auditDir, 'p1_execution_slice_audit.json'),
    p1aApprovalRequestPacket: path.join(auditDir, 'p1a_approval_request_packet.json'),
    p1bFreshReadReviewPacket: path.join(auditDir, 'p1b_fresh_read_review_packet.json'),
    readinessBlockerReductionPacket: path.join(auditDir, 'readiness_blocker_reduction_packet.json'),
    tk1UnknownTargetStorageClassificationPacket: path.join(auditDir, 'tk1_unknown_target_storage_classification_packet.json'),
    tk2LocalCloudDecisionContractsPacket: path.join(auditDir, 'tk2_local_cloud_decision_contracts_packet.json'),
    tk3P3StoreContractsPacket: path.join(auditDir, 'tk3_p3_store_contracts_packet.json'),
    tk4AchievementStatsCloudPolicyPacket: path.join(auditDir, 'tk4_achievement_stats_cloud_policy_packet.json'),
    tk5SurfaceRawGuardsPacket: path.join(auditDir, 'tk5_surface_raw_guards_packet.json'),
    targetKeyFinalReconciliationPacket: path.join(auditDir, 'target_key_final_reconciliation_packet.json'),
  };
  const optionalArtifacts = new Set([
    'tk1UnknownTargetStorageClassificationPacket',
    'tk2LocalCloudDecisionContractsPacket',
    'tk3P3StoreContractsPacket',
    'tk4AchievementStatsCloudPolicyPacket',
    'tk5SurfaceRawGuardsPacket',
    'targetKeyFinalReconciliationPacket',
  ]);

  const sourceArtifacts = Object.fromEntries(
    Object.entries(artifactFiles).map(([key, filePath]) => [
      key,
      optionalArtifacts.has(key)
        ? loadOptionalArtifact(repoRoot, filePath)
        : loadArtifact(repoRoot, filePath),
    ]),
  ) as Record<string, SourceArtifact>;

  const targetPlan = readJson<Record<string, unknown>>(artifactFiles.targetKeyIntegrationPlan);
  const migrationPlan = readJson<Record<string, unknown>>(artifactFiles.migrationAdapterPlan);
  const phaseDependency = readJson<Record<string, unknown>>(artifactFiles.phaseDependencyAudit);
  const readinessPacket = readJson<Record<string, unknown>>(artifactFiles.readinessBlockerReductionPacket);

  const domains = arr<Record<string, unknown>>(targetPlan.domains);
  const adapters = arr<Record<string, unknown>>(migrationPlan.adapters);
  const targetSummary = object(targetPlan.summary);
  const localCloudSummary = sourceArtifacts.localCloudDecisionTable.summary;
  const p1aSummary = sourceArtifacts.p1aApprovalRequestPacket.summary;
  const p1bSummary = sourceArtifacts.p1bFreshReadReviewPacket.summary;
  const readinessSummary = object(readinessPacket.summary);
  const tk1Summary = sourceArtifacts.tk1UnknownTargetStorageClassificationPacket.summary;
  const tk1UnknownClassificationClean =
    sourceArtifacts.tk1UnknownTargetStorageClassificationPacket.status !== 'MISSING' &&
    n(tk1Summary, 'targetPlanUnknownRecords') === 0 &&
    n(tk1Summary, 'currentUnknownTargetRecordsInPlanFiles') === 0 &&
    b(tk1Summary, 'staleEvidenceDetected') === false;
  const tk2Summary = sourceArtifacts.tk2LocalCloudDecisionContractsPacket.summary;
  const tk2LocalCloudContractsClean =
    sourceArtifacts.tk2LocalCloudDecisionContractsPacket.status === 'PASS' &&
    b(tk2Summary, 'tk2ContractsClean') &&
    n(tk2Summary, 'localCloudBlockers') === 0 &&
    n(tk2Summary, 'localCloudHighRisks') === 0 &&
    n(tk2Summary, 'cloudBlockUnknown') === 0 &&
    n(tk2Summary, 'cloudTargetSensitiveMissingFromCloud') === 0;
  const tk3Summary = sourceArtifacts.tk3P3StoreContractsPacket.summary;
  const tk3P3StoreContractsClean =
    sourceArtifacts.tk3P3StoreContractsPacket.status === 'PASS' &&
    b(tk3Summary, 'tk3ContractsClean') &&
    n(tk3Summary, 'contracts') === n(tk3Summary, 'contractsDrafted') &&
    n(tk3Summary, 'unassignedCloudTargetKeys') === 0;
  const tk4Summary = sourceArtifacts.tk4AchievementStatsCloudPolicyPacket.summary;
  const tk4AchievementStatsCloudPolicyClean =
    sourceArtifacts.tk4AchievementStatsCloudPolicyPacket.status === 'PASS' &&
    b(tk4Summary, 'tk4PolicyClean') &&
    b(tk4Summary, 'canPassRDY030Now') &&
    n(tk4Summary, 'mixedCloudPayloadBlockers') === 0 &&
    n(tk4Summary, 'mixedCloudPayloadMixedFields') === 0;
  const tk5Summary = sourceArtifacts.tk5SurfaceRawGuardsPacket.summary;
  const tk5SurfaceRawGuardsClean =
    sourceArtifacts.tk5SurfaceRawGuardsPacket.status === 'PASS' &&
    b(tk5Summary, 'tk5SurfaceGuardsClean') &&
    b(tk5Summary, 'canPassRDY060Now') &&
    n(tk5Summary, 'uncoveredBlockers') === 0;
  const finalReconciliationSummary = sourceArtifacts.targetKeyFinalReconciliationPacket.summary;
  const targetKeyFinalReconciliationClean =
    sourceArtifacts.targetKeyFinalReconciliationPacket.status === 'PASS' &&
    b(finalReconciliationSummary, 'finalReconciliationClean') &&
    b(finalReconciliationSummary, 'canPassRDY050Now') &&
    n(finalReconciliationSummary, 'uncoveredBlockers') === 0;
  const recommendedNextSafeSlice = !tk1UnknownClassificationClean
    ? 'TK1_UNKNOWN_TARGET_STORAGE_CLASSIFICATION'
    : tk2LocalCloudContractsClean
      ? tk3P3StoreContractsClean
        ? tk4AchievementStatsCloudPolicyClean
          ? tk5SurfaceRawGuardsClean
            ? targetKeyFinalReconciliationClean
              ? 'TRANSLATION_START_GATE_RECHECK'
              : 'TARGET_KEY_PLAN_FINAL_RECONCILIATION'
            : 'TK5_SURFACE_AND_RAW_GUARDS'
          : 'TK4_ACHIEVEMENTS_STATS_CLOUD_POLICY'
        : 'TK3_P3_STORE_CONTRACTS'
      : 'TK2_LOCAL_CLOUD_DECISION_CONTRACTS';

  const sliceDefinitions: Array<Omit<DomainSlice, 'blockerCount' | 'rawTargetStorageRecords' | 'topFiles'>> = [
    {
      id: 'TK0_P1A_AND_P1B_UNLOCK_PREREQS',
      title: 'Keep implementation locked behind exact P1A/P1B gates.',
      mode: 'approval',
      canDoNow: true,
      canModifyProductionAppFiles: false,
      requiresExactApprovalBeforeWrites: true,
      dependsOn: [],
      domains: ['study_target_model', 'target_key_builder'],
      adapters: ['production_study_target', 'target_storage_key_builder'],
      allowedWorkNow: ['Ask for exact P1A amendment approval text', 'Keep writing audit-only packets'],
      blockedActions: ['Creating approval receipts from DALSHE', 'Starting P1B', 'Modifying production app files'],
      exitCriteria: ['P1A amended approval receipt exists', 'P1A active hash-lock exists', 'P1B remains separately gated'],
      rationale: 'No target-key implementation slice can write safely until the active P1A baseline is approved and hash-locked.',
    },
    {
      id: 'TK1_UNKNOWN_TARGET_STORAGE_CLASSIFICATION',
      title: 'Classify unknown target-sensitive storage records before implementation.',
      mode: 'architecture',
      canDoNow: true,
      canModifyProductionAppFiles: false,
      requiresExactApprovalBeforeWrites: true,
      dependsOn: [],
      domains: ['unknown_target_storage'],
      adapters: ['raw_storage_guard'],
      allowedWorkNow: ['Generate a classification packet', 'Assign target/global/source scope proposals', 'Prepare reviewed exceptions'],
      blockedActions: ['Editing unknown source files', 'Changing storage keys', 'Marking French generation ready'],
      exitCriteria: ['Unknown target-sensitive storage has a reviewed scope or explicit exception', 'Raw-storage guard has test expectations'],
      rationale: 'This is the best next architecture-only blocker reducer because it does not require touching app code first.',
    },
    {
      id: 'TK2_LOCAL_CLOUD_DECISION_CONTRACTS',
      title: 'Turn local/cloud decisions into implementation contracts.',
      mode: 'architecture',
      canDoNow: true,
      canModifyProductionAppFiles: false,
      requiresExactApprovalBeforeWrites: true,
      dependsOn: ['TK1_UNKNOWN_TARGET_STORAGE_CLASSIFICATION'],
      domains: ['lesson_session_local', 'lesson_rewards', 'cloud_sync', 'analytics_stats'],
      adapters: ['lesson_session_store', 'lesson_reward_idempotency', 'target_stats_store', 'cloud_sync_target_buckets'],
      allowedWorkNow: ['Group sync_under_target and keep_local_target_scoped keys', 'Prepare cloud/local acceptance criteria'],
      blockedActions: ['Changing cloud sync code', 'Changing AsyncStorage keys', 'Creating migration writes'],
      exitCriteria: ['Every local/cloud decision has a target key shape and cloud policy', 'High-risk cloud restore cases have tests'],
      rationale: 'The decision table has blockers and high-risk cloud cases, so contracts should precede implementation.',
    },
    {
      id: 'TK3_P3_STORE_CONTRACTS',
      title: 'Prepare target-aware store contracts for learning surfaces.',
      mode: 'architecture',
      canDoNow: true,
      canModifyProductionAppFiles: false,
      requiresExactApprovalBeforeWrites: true,
      dependsOn: ['TK0_P1A_AND_P1B_UNLOCK_PREREQS', 'TK2_LOCAL_CLOUD_DECISION_CONTRACTS'],
      domains: ['lesson_progress', 'trainer_practice', 'personal_practice', 'flashcards', 'level_exams'],
      adapters: ['lesson_progress_store', 'trainer_practice_store', 'personal_practice_store', 'flashcards_target_store', 'level_exam_certificate_store'],
      allowedWorkNow: ['Draft store API contracts', 'List acceptance tests', 'Map legacy English compatibility assumptions'],
      blockedActions: ['Adding stores', 'Replacing route reads', 'Creating migration adapters'],
      exitCriteria: ['Each store contract names legacy English behavior and French fail-closed behavior', 'No route integration is bundled into store design'],
      rationale: 'P3 store work depends on the P1 key builder, but API/test contracts can be prepared now.',
    },
    {
      id: 'TK4_ACHIEVEMENTS_STATS_CLOUD_POLICY',
      title: 'Resolve achievements/stats/cloud policy after store domains are scoped.',
      mode: 'architecture',
      canDoNow: true,
      canModifyProductionAppFiles: false,
      requiresExactApprovalBeforeWrites: true,
      dependsOn: ['TK3_P3_STORE_CONTRACTS'],
      domains: ['achievements', 'analytics_stats', 'cloud_sync'],
      adapters: ['achievement_progress_store', 'target_stats_store', 'cloud_sync_target_buckets'],
      allowedWorkNow: ['Prepare mixed achievement policy matrix', 'Prepare stats field split', 'Prepare cloud bucket restore rules'],
      blockedActions: ['Changing achievements.ts', 'Changing cloud_sync.ts', 'Changing stats payloads'],
      exitCriteria: ['Mixed achievements have global/target policy', 'Stats global vs target fields are explicit', 'Cloud restore tests are named'],
      rationale: 'These are high blast-radius shared systems and must follow lower-level target stores.',
    },
    {
      id: 'TK5_SURFACE_AND_RAW_GUARDS',
      title: 'Connect target-safe stores to user-facing surfaces and raw-key guards.',
      mode: 'architecture',
      canDoNow: false,
      canModifyProductionAppFiles: false,
      requiresExactApprovalBeforeWrites: true,
      dependsOn: ['TK3_P3_STORE_CONTRACTS', 'TK4_ACHIEVEMENTS_STATS_CLOUD_POLICY'],
      domains: ['study_target_model', 'source_locale_preferences'],
      adapters: ['route_surface_integration', 'raw_storage_guard'],
      allowedWorkNow: ['Read surface inventory only after lower-level contracts are stable'],
      blockedActions: ['Route integration', 'UI changes', 'Broad test guard enforcement'],
      exitCriteria: ['Route smoke matrix is ready', 'Raw storage guard is ready to enforce before French generation'],
      rationale: 'Surface integration has the broadest file overlap and should be last, after storage semantics are stable.',
    },
  ];

  const slices: DomainSlice[] = sliceDefinitions.map((slice) => ({
    ...slice,
    blockerCount: domainBlockers(domains, slice.domains),
    rawTargetStorageRecords: domainRecords(domains, slice.domains),
    topFiles: [
      ...domainTopFiles(domains, slice.domains, 6),
      ...adapterFiles(adapters, slice.adapters, 6),
    ].filter((file, index, all) => all.indexOf(file) === index).slice(0, 8),
  }));

  const packet: Packet = {
    schemaVersion: 'gustav-target-key-slice-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts,
    summary: {
      targetKeyPlanStatus: String(targetPlan.status || ''),
      domains: n(targetSummary, 'domains'),
      blockerDomains: n(targetSummary, 'blockerDomains'),
      targetKeyBlockers: n(targetSummary, 'blockers'),
      rawTargetStorageRecords: n(targetSummary, 'rawTargetStorageRecords'),
      localCloudBlockers: n(localCloudSummary, 'blockers'),
      migrationAdapters: n(sourceArtifacts.migrationAdapterPlan.summary, 'adapters'),
      phaseDependencyStatus: String(phaseDependency.status || ''),
      p1aApprovalReceiptExists: b(p1aSummary, 'approvalReceiptExists'),
      p1aActiveHashLockExists: b(p1aSummary, 'activeHashLockExists'),
      p1bCanStartNow: b(p1bSummary, 'canStartP1BNow'),
      staleP1BAssumptionDetected: b(p1bSummary, 'stalePreP1AAssumptionDetected'),
      implementationWritesAllowedNow: false,
      canContinueArchitectureWork: b(readinessSummary, 'canContinueArchitectureWork'),
      tk1UnknownClassificationClean,
      tk2LocalCloudContractsClean,
      tk3P3StoreContractsClean,
      tk4AchievementStatsCloudPolicyClean,
      tk5SurfaceRawGuardsClean,
      targetKeyFinalReconciliationClean,
      recommendedNextSafeSlice,
      slices: slices.length,
    },
    slices,
    forbiddenActions: [
      'Do not treat DALSHE as approval.',
      'Do not start target-key implementation from this packet.',
      'Do not edit production app files.',
      'Do not create migration adapters or storage keys.',
      'Do not run broad apply_plan/file_changes.json.',
      'Do not start French generation.',
    ],
    recommendedNextOrder: [
      'Keep P1A approval/hash-lock as the only unlock path for implementation.',
      'Create TK1 unknown target storage classification packet as audit-only work.',
      'Create TK2 local/cloud decision contracts after TK1 classification.',
      'Create TK3 P3 store contracts after TK2 is clean.',
      'Prepare P3 store API contracts without file writes.',
      'Only after exact approvals and fresh current-state audits, consider narrow implementation slices.',
    ],
    notes: [
      'This packet is a sequencing aid, not an apply plan.',
      'Every slice keeps canModifyProductionAppFiles=false.',
      'Target-key readiness remains HOLD until implementation and tests exist.',
      'French generation remains blocked.',
    ],
  };

  const outJson = path.join(auditDir, 'target_key_slice_packet.json');
  const outMd = path.join(auditDir, 'target_key_slice_packet.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(packet));

  console.log(`GUSTAV target key slice packet: ${packet.status}`);
  console.log(`Domains: ${packet.summary.domains}`);
  console.log(`Raw target storage records: ${packet.summary.rawTargetStorageRecords}`);
  console.log(`Recommended next safe slice: ${packet.summary.recommendedNextSafeSlice}`);
  console.log(`Implementation writes allowed now: ${packet.summary.implementationWritesAllowedNow ? 'yes' : 'no'}`);
  console.log(`Can continue architecture work: ${packet.summary.canContinueArchitectureWork ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
