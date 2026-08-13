import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD';

type CloudTargetKey = {
  key: string;
  targetPath: string;
  sourcePath: string;
  line: number;
  localUsageCount: number;
  isPattern: boolean;
};

type StoreContract = {
  id: string;
  domain: string;
  adapter: string;
  contractState: 'CONTRACT_DRAFTED';
  implementationStatus: 'LOCKED';
  storageScope: 'study_target';
  domainStatus: string;
  adapterStatus: string;
  blockerCount: number;
  adapterBlockerCount: number;
  sourceFiles: string[];
  cloudTargetKeys: CloudTargetKey[];
  unresolvedBlockers: string[];
  apiContract: string[];
  legacyEnglishCompatibility: string;
  frenchFailClosedBehavior: string;
  acceptanceTests: string[];
  blockedImplementationActions: string[];
};

type Packet = {
  schemaVersion: 'gustav-tk3-p3-store-contracts-packet-v0';
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
    migrationAdapterPlan: string;
    cloudSyncMapping: string;
    targetKeySlicePacket: string;
    tk2LocalCloudDecisionContractsPacket: string;
  };
  summary: {
    targetKeyPlanStatus: string;
    targetKeyBlockerDomains: number;
    targetKeyBlockers: number;
    rawTargetStorageRecords: number;
    tk1UnknownClassificationClean: boolean;
    tk2LocalCloudContractsClean: boolean;
    contracts: number;
    contractsDrafted: number;
    contractBlockersCovered: number;
    sourceFilesCovered: number;
    cloudTargetKeysAssigned: number;
    unassignedCloudTargetKeys: number;
    tk3ContractsClean: boolean;
    recommendedNextSafeSlice: string;
    canContinueArchitectureWork: boolean;
    targetKeyPlanCanPassRDY050Now: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  contracts: StoreContract[];
  unassignedCloudTargetKeys: CloudTargetKey[];
  requiredNextActions: string[];
  forbiddenActions: string[];
  notes: string[];
};

const CONTRACT_SPECS = [
  {
    id: 'lesson_progress_store',
    domain: 'lesson_progress',
    adapter: 'lesson_progress_store',
    keyPattern: /lesson|unlocked_lessons|irregular_verbs/,
    apiContract: [
      'readLessonProgress(studyTarget)',
      'writeLessonProgress(studyTarget, patch)',
      'readLessonUnlocks(studyTarget)',
      'writeLessonUnlocks(studyTarget, unlockedLessons)',
    ],
    legacyEnglishCompatibility:
      'Legacy flat lesson progress keys remain the English compatibility bucket until a separately approved migration exists.',
    frenchFailClosedBehavior:
      'French must read and write only through the study-target bucket and must not fall back to legacy English flat lesson keys.',
    acceptanceTests: [
      'English legacy lesson progress remains readable without changing existing keys.',
      'French lesson progress starts empty when no French target bucket exists.',
      'Writing French lesson progress does not mutate English lesson progress.',
      'Cloud restore reads progress/targets/{studyTarget} for lesson progress keys.',
    ],
  },
  {
    id: 'trainer_practice_store',
    domain: 'trainer_practice',
    adapter: 'trainer_practice_store',
    keyPattern: /active_recall|mistake|trainer/,
    apiContract: [
      'readTrainerPracticeState(studyTarget)',
      'writeTrainerPracticeState(studyTarget, patch)',
      'readMistakeLog(studyTarget)',
      'appendMistakeLogEntry(studyTarget, entry)',
    ],
    legacyEnglishCompatibility:
      'Legacy trainer and active recall state remains English-only compatibility state until an approved adapter exists.',
    frenchFailClosedBehavior:
      'French trainer, active recall and mistake diagnosis state must not reuse English buckets or English word diagnostics.',
    acceptanceTests: [
      'English trainer state remains readable from legacy storage.',
      'French trainer state starts empty when its study-target bucket is absent.',
      'French mistake entries do not appear in English trainer or My Practice diagnostics.',
      'Cloud restore maps active recall state to progress/targets/{studyTarget}.',
    ],
  },
  {
    id: 'personal_practice_store',
    domain: 'personal_practice',
    adapter: 'personal_practice_store',
    keyPattern: /diagnostic|practice|problem_coach/,
    apiContract: [
      'readPersonalPracticeState(studyTarget, sourceLocale)',
      'writePersonalPracticeState(studyTarget, sourceLocale, patch)',
      'readDiagnosticState(studyTarget)',
      'writeDiagnosticState(studyTarget, patch)',
    ],
    legacyEnglishCompatibility:
      'Legacy diagnostic and recommendation state remains English compatibility state and cannot be treated as target-neutral.',
    frenchFailClosedBehavior:
      'French personal practice must isolate target-specific diagnosis while preserving source-locale-specific explanations.',
    acceptanceTests: [
      'English diagnostic state remains readable from legacy storage.',
      'French diagnostic state starts empty when its target bucket is absent.',
      'French recommendations do not reuse English diagnosis results.',
      'Source-locale explanation data does not collide with study-target progress data.',
    ],
  },
  {
    id: 'flashcards_target_store',
    domain: 'flashcards',
    adapter: 'flashcards_target_store',
    keyPattern: /flashcard|community_owned_pack/,
    apiContract: [
      'readFlashcards(studyTarget)',
      'writeFlashcards(studyTarget, cards)',
      'readFlashcardProgress(studyTarget)',
      'writeFlashcardProgress(studyTarget, progress)',
    ],
    legacyEnglishCompatibility:
      'Legacy flashcard keys remain English compatibility data until a separately approved migration exists.',
    frenchFailClosedBehavior:
      'French flashcards and progress must use the French study-target bucket and must not display English cards as French state.',
    acceptanceTests: [
      'English flashcards remain readable from legacy storage.',
      'French flashcards start empty unless a French bucket exists.',
      'French flashcard progress does not mutate English flashcard progress.',
      'Community pack ownership is target-scoped when cloud-restored.',
    ],
  },
  {
    id: 'level_exam_certificate_store',
    domain: 'level_exams',
    adapter: 'level_exam_certificate_store',
    keyPattern: /level_exam|certificate/,
    apiContract: [
      'readLevelExamState(studyTarget, level)',
      'writeLevelExamState(studyTarget, level, patch)',
      'readCertificateState(studyTarget)',
      'writeCertificateState(studyTarget, certificate)',
    ],
    legacyEnglishCompatibility:
      'Legacy level exam and certificate proof keys remain English proof state until an approved migration exists.',
    frenchFailClosedBehavior:
      'French level exam and certificate proof state must be absent until passed in the French study target.',
    acceptanceTests: [
      'English exam passes and certificates remain readable from legacy storage.',
      'French exam pass state starts empty when no French target bucket exists.',
      'Passing a French exam does not unlock English certificates or medals.',
      'Cloud restore maps every level_exam and certificate key under progress/targets/{studyTarget}.',
    ],
  },
] as const;

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

function cloudTargetKey(entry: Record<string, unknown>): CloudTargetKey {
  const key = typeof entry.key === 'string' && entry.key
    ? entry.key
    : String(entry.targetPath || '').replace(/^progress\/targets\/en\//, '');
  return {
    key,
    targetPath: String(entry.targetPath || ''),
    sourcePath: String(entry.sourcePath || ''),
    line: n(entry, 'line'),
    localUsageCount: n(entry, 'localUsageCount'),
    isPattern: entry.key === null || String(entry.targetPath || '').includes('${...}'),
  };
}

function assignedContractId(entry: CloudTargetKey): string | null {
  const haystack = `${entry.key} ${entry.targetPath}`.toLowerCase();
  for (const spec of CONTRACT_SPECS) {
    if (spec.keyPattern.test(haystack)) return spec.id;
  }
  return null;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function renderMarkdown(packet: Packet): string {
  const lines = [
    '# GUSTAV TK3 P3 Store Contracts Packet',
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
    `- Target key blocker domains: ${packet.summary.targetKeyBlockerDomains}`,
    `- Target key blockers: ${packet.summary.targetKeyBlockers}`,
    `- Raw target storage records: ${packet.summary.rawTargetStorageRecords}`,
    `- TK1 unknown classification clean: ${packet.summary.tk1UnknownClassificationClean ? 'yes' : 'no'}`,
    `- TK2 local/cloud contracts clean: ${packet.summary.tk2LocalCloudContractsClean ? 'yes' : 'no'}`,
    `- Contracts: ${packet.summary.contracts}`,
    `- Contracts drafted: ${packet.summary.contractsDrafted}`,
    `- Contract blockers covered: ${packet.summary.contractBlockersCovered}`,
    `- Source files covered: ${packet.summary.sourceFilesCovered}`,
    `- Cloud target keys assigned: ${packet.summary.cloudTargetKeysAssigned}`,
    `- Unassigned cloud target keys: ${packet.summary.unassignedCloudTargetKeys}`,
    `- TK3 contracts clean: ${packet.summary.tk3ContractsClean ? 'yes' : 'no'}`,
    `- Recommended next safe slice: \`${packet.summary.recommendedNextSafeSlice}\``,
    `- Can continue architecture work: ${packet.summary.canContinueArchitectureWork ? 'yes' : 'no'}`,
    `- Target key plan can pass RDY-050 now: ${packet.summary.targetKeyPlanCanPassRDY050Now ? 'yes' : 'no'}`,
    `- May start French generation: ${packet.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${packet.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Contracts',
    '',
  ];

  for (const contract of packet.contracts) {
    lines.push(`### ${contract.id}`);
    lines.push('');
    lines.push(`- Domain: \`${contract.domain}\``);
    lines.push(`- Adapter: \`${contract.adapter}\``);
    lines.push(`- Contract state: \`${contract.contractState}\``);
    lines.push(`- Implementation status: \`${contract.implementationStatus}\``);
    lines.push(`- Storage scope: \`${contract.storageScope}\``);
    lines.push(`- Domain status: \`${contract.domainStatus}\``);
    lines.push(`- Adapter status: \`${contract.adapterStatus}\``);
    lines.push(`- Blockers covered: ${contract.blockerCount}`);
    lines.push(`- Adapter blockers covered: ${contract.adapterBlockerCount}`);
    lines.push(`- Source files: ${contract.sourceFiles.length}`);
    lines.push(`- Cloud target keys: ${contract.cloudTargetKeys.length}`);
    lines.push('- API contract:');
    for (const item of contract.apiContract) lines.push(`  - \`${item}\``);
    lines.push(`- Legacy English compatibility: ${contract.legacyEnglishCompatibility}`);
    lines.push(`- French fail-closed behavior: ${contract.frenchFailClosedBehavior}`);
    lines.push('- Acceptance tests:');
    for (const item of contract.acceptanceTests) lines.push(`  - ${item}`);
    if (contract.unresolvedBlockers.length > 0) {
      lines.push('- Covered blockers:');
      for (const blocker of contract.unresolvedBlockers) lines.push(`  - ${blocker}`);
    }
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
    console.error('Usage: npx tsx scripts/gustav_tk3_p3_store_contracts_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditDir = path.join(runDir, 'audits');
  const targetKeyPath = path.join(auditDir, 'target_key_integration_plan.json');
  const migrationPath = path.join(auditDir, 'migration_adapter_plan.json');
  const cloudPath = path.join(auditDir, 'cloud_sync_mapping.json');
  const slicePath = path.join(auditDir, 'target_key_slice_packet.json');
  const tk2Path = path.join(auditDir, 'tk2_local_cloud_decision_contracts_packet.json');

  const targetKey = readJson<Record<string, unknown>>(targetKeyPath);
  const migration = readJson<Record<string, unknown>>(migrationPath);
  const cloud = readJson<Record<string, unknown>>(cloudPath);
  const slice = readJson<Record<string, unknown>>(slicePath);
  const tk2 = readJson<Record<string, unknown>>(tk2Path);

  const targetSummary = object(targetKey.summary);
  const sliceSummary = object(slice.summary);
  const tk2Summary = object(tk2.summary);
  const domains = arr<Record<string, unknown>>(targetKey.domains);
  const adapters = arr<Record<string, unknown>>(migration.adapters);
  const targetCloudKeys = arr<Record<string, unknown>>(cloud.entries)
    .filter((entry) => entry.action === 'map_to_target')
    .map(cloudTargetKey);

  const unassignedCloudTargetKeys: CloudTargetKey[] = [];
  const contracts = CONTRACT_SPECS.map((spec): StoreContract => {
    const domain = domains.find((entry) => entry.domain === spec.domain) || {};
    const adapter = adapters.find((entry) => entry.id === spec.adapter || entry.adapterId === spec.adapter) || {};
    const cloudTargetKeys = targetCloudKeys.filter((entry) => assignedContractId(entry) === spec.id);
    const sourceFiles = uniqueSorted(arr<string>(adapter.sourceFiles).filter((entry) => typeof entry === 'string'));
    const domainBlockers = arr<string>(domain.blockers).filter((entry) => typeof entry === 'string');
    const adapterBlockers = arr<string>(adapter.blockers).filter((entry) => typeof entry === 'string');

    return {
      id: spec.id,
      domain: spec.domain,
      adapter: spec.adapter,
      contractState: 'CONTRACT_DRAFTED',
      implementationStatus: 'LOCKED',
      storageScope: 'study_target',
      domainStatus: statusOf(domain),
      adapterStatus: statusOf(adapter),
      blockerCount: domainBlockers.length,
      adapterBlockerCount: adapterBlockers.length,
      sourceFiles,
      cloudTargetKeys,
      unresolvedBlockers: [...domainBlockers, ...adapterBlockers],
      apiContract: [...spec.apiContract],
      legacyEnglishCompatibility: spec.legacyEnglishCompatibility,
      frenchFailClosedBehavior: spec.frenchFailClosedBehavior,
      acceptanceTests: [...spec.acceptanceTests],
      blockedImplementationActions: [
        'Do not create this store in app code from this packet.',
        'Do not replace route reads from this packet.',
        'Do not create migration adapters from this packet.',
      ],
    };
  });

  for (const entry of targetCloudKeys) {
    if (!assignedContractId(entry)) unassignedCloudTargetKeys.push(entry);
  }

  const sourceFilesCovered = uniqueSorted(contracts.flatMap((contract) => contract.sourceFiles)).length;
  const contractBlockersCovered = contracts.reduce((sum, contract) => sum + contract.blockerCount + contract.adapterBlockerCount, 0);
  const cloudTargetKeysAssigned = contracts.reduce((sum, contract) => sum + contract.cloudTargetKeys.length, 0);
  const tk1UnknownClassificationClean = b(sliceSummary, 'tk1UnknownClassificationClean');
  const tk2LocalCloudContractsClean =
    b(sliceSummary, 'tk2LocalCloudContractsClean') &&
    b(tk2Summary, 'tk2ContractsClean');
  const contractsDrafted = contracts.filter((contract) => (
    contract.contractState === 'CONTRACT_DRAFTED' &&
    contract.sourceFiles.length > 0 &&
    contract.cloudTargetKeys.length > 0 &&
    contract.acceptanceTests.length >= 4
  )).length;
  const tk3ContractsClean =
    tk1UnknownClassificationClean &&
    tk2LocalCloudContractsClean &&
    contracts.length === CONTRACT_SPECS.length &&
    contractsDrafted === CONTRACT_SPECS.length &&
    unassignedCloudTargetKeys.length === 0 &&
    cloudTargetKeysAssigned === targetCloudKeys.length;

  const packet: Packet = {
    schemaVersion: 'gustav-tk3-p3-store-contracts-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: tk3ContractsClean ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      targetKeyIntegrationPlan: artifactPath(repoRoot, targetKeyPath),
      migrationAdapterPlan: artifactPath(repoRoot, migrationPath),
      cloudSyncMapping: artifactPath(repoRoot, cloudPath),
      targetKeySlicePacket: artifactPath(repoRoot, slicePath),
      tk2LocalCloudDecisionContractsPacket: artifactPath(repoRoot, tk2Path),
    },
    summary: {
      targetKeyPlanStatus: statusOf(targetKey),
      targetKeyBlockerDomains: n(targetSummary, 'blockerDomains'),
      targetKeyBlockers: n(targetSummary, 'blockers'),
      rawTargetStorageRecords: n(targetSummary, 'rawTargetStorageRecords'),
      tk1UnknownClassificationClean,
      tk2LocalCloudContractsClean,
      contracts: contracts.length,
      contractsDrafted,
      contractBlockersCovered,
      sourceFilesCovered,
      cloudTargetKeysAssigned,
      unassignedCloudTargetKeys: unassignedCloudTargetKeys.length,
      tk3ContractsClean,
      recommendedNextSafeSlice: tk3ContractsClean ? 'TK4_ACHIEVEMENTS_STATS_CLOUD_POLICY' : 'TK3_P3_STORE_CONTRACTS',
      canContinueArchitectureWork: b(sliceSummary, 'canContinueArchitectureWork'),
      targetKeyPlanCanPassRDY050Now: false,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    contracts,
    unassignedCloudTargetKeys,
    requiredNextActions: tk3ContractsClean
      ? [
          'Proceed to TK4 achievements/stats/cloud policy as audit-only work.',
          'Keep P3 store implementation locked behind exact future apply approval.',
          'Use these contracts as acceptance criteria when implementation becomes approved.',
        ]
      : [
          'Assign every cloud target key to a P3 store contract.',
          'Add source files and acceptance tests for every P3 store contract.',
          'Keep TK3 in audit-only mode.',
        ],
    forbiddenActions: [
      'Do not treat DALSHE as approval.',
      'Do not edit production app files from this packet.',
      'Do not add store modules from this packet.',
      'Do not replace route reads from this packet.',
      'Do not create migration adapters from this packet.',
      'Do not start French generation.',
    ],
    notes: [
      'This packet prepares implementation contracts only; it is not an apply plan.',
      'The target key integration plan remains HOLD until approved implementation and tests exist.',
      'Legacy English compatibility and French fail-closed behavior are explicit acceptance criteria for every P3 store.',
      'French generation remains blocked by other readiness gates.',
    ],
  };

  const outJson = path.join(auditDir, 'tk3_p3_store_contracts_packet.json');
  const outMd = path.join(auditDir, 'tk3_p3_store_contracts_packet.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(packet));

  console.log(`GUSTAV TK3 P3 store contracts packet: ${packet.status}`);
  console.log(`Contracts drafted: ${packet.summary.contractsDrafted}/${packet.summary.contracts}`);
  console.log(`Cloud target keys assigned: ${packet.summary.cloudTargetKeysAssigned}`);
  console.log(`Unassigned cloud target keys: ${packet.summary.unassignedCloudTargetKeys}`);
  console.log(`Recommended next safe slice: ${packet.summary.recommendedNextSafeSlice}`);
  console.log(`May start French generation: ${packet.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
