import * as fs from 'node:fs';
import * as path from 'node:path';

type StorageRecord = {
  key?: string;
  keyPattern?: string;
  keyExpression?: string;
  sourcePath: string;
  line: number;
  operation: string;
  scope?: string;
  learningState?: boolean;
  targetNamespaceRequired?: boolean;
  risk?: string;
  confidence?: string;
  notes?: string[];
};

type Classification = 'target_scoped_local' | 'target_scoped_cloud' | 'source_locale_scoped' | 'global_account_scoped' | 'reviewed_exception' | 'still_blocked';

type FileClassification = {
  sourcePath: string;
  planRecords: number;
  currentRecordsInFile: number;
  currentTargetRequiredRecords: number;
  currentUnknownTargetRecords: number;
  proposedClassification: Classification;
  confidence: 'high' | 'medium' | 'low';
  rationale: string;
  exampleLines: Array<{
    line: number;
    operation: string;
    planKey: string;
    currentKey: string;
    currentScope: string;
    currentTargetNamespaceRequired: boolean;
    currentRisk: string;
    matchStatus: 'matched' | 'missing';
  }>;
  allowedWorkNow: string[];
  blockedActions: string[];
};

type Packet = {
  schemaVersion: 'gustav-tk1-unknown-target-storage-classification-packet-v0';
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
    storageKeyInventory: string;
    targetKeySlicePacket: string;
  };
  summary: {
    targetPlanUnknownRecords: number;
    targetPlanUnknownFiles: number;
    currentInventoryRecordsInPlanFiles: number;
    currentTargetRequiredRecordsInPlanFiles: number;
    currentUnknownTargetRecordsInPlanFiles: number;
    planExampleChecks: number;
    matchedExamples: number;
    missingExamples: number;
    examplesStillTargetRequired: number;
    examplesNowNotTargetRequired: number;
    staleEvidenceDetected: boolean;
    classificationFiles: number;
    stillBlockedFiles: number;
    reviewedExceptionFiles: number;
    canContinueArchitectureWork: boolean;
    canModifyProductionAppFiles: boolean;
    mayStartFrenchGeneration: boolean;
  };
  classifications: FileClassification[];
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

function arr<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function n(value: Record<string, unknown>, key: string): number {
  return typeof value[key] === 'number' ? value[key] as number : 0;
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function stableRecordKey(record: StorageRecord): string {
  return record.key ?? record.keyPattern ?? record.keyExpression ?? '';
}

function normalizedId(record: StorageRecord): string {
  return stableRecordKey(record).toLowerCase();
}

function currentDomainForRecord(record: StorageRecord): string {
  const id = normalizedId(record);
  const file = record.sourcePath;
  if (file === 'app/cloud_sync.ts') return 'cloud_sync';
  if (id === 'lang' || id === 'app_lang' || id === 'dev_study_target_lang') return 'source_locale_preferences';
  if (id.includes('lesson') || file.includes('lesson_') || file.includes('lesson1')) {
    if (id.includes('cellindex') || id.includes('phraseorder') || id.includes('errorreplay') || id.includes('intro_shown')) return 'lesson_session_local';
    if (id.includes('bonus') || id.includes('reward') || id.includes('granted') || id.includes('shards')) return 'lesson_rewards';
    return 'lesson_progress';
  }
  if (id.includes('quiz') || file.includes('quiz')) return 'analytics_stats';
  if (id.includes('daily_phrase')) return 'achievements';
  if (id.includes('daily_task') || file.includes('daily_tasks')) return 'analytics_stats';
  if (id.includes('diagnos') || file.includes('diagnos')) return 'personal_practice';
  if (file.includes('league') || file.includes('release_wave') || id.includes('claim') || id.includes('native_build')) return 'global_account_scoped';
  return 'unknown_target_storage';
}

function proposedClassificationForFile(sourcePath: string, currentUnknownTargetRecords: number, currentTargetRequiredRecords: number): {
  classification: Classification;
  confidence: 'high' | 'medium' | 'low';
  rationale: string;
} {
  if (currentUnknownTargetRecords > 0) {
    return {
      classification: 'still_blocked',
      confidence: 'high',
      rationale: 'Current storage inventory still has target-required records that cannot be classified by key/domain heuristics.',
    };
  }
  if (sourcePath.includes('release_wave_bonus') || sourcePath.includes('league_chest_rewards')) {
    return {
      classification: 'global_account_scoped',
      confidence: 'medium',
      rationale: 'Current evidence looks like account/global reward or release flow state, not target-language learning state.',
    };
  }
  if (sourcePath.includes('daily_tasks')) {
    return {
      classification: currentTargetRequiredRecords > 0 ? 'target_scoped_cloud' : 'reviewed_exception',
      confidence: 'medium',
      rationale: 'Daily task records can mix target-learning counters and global task UI state; keep blocked until each task key is explicitly scoped.',
    };
  }
  if (sourcePath.includes('quiz')) {
    return {
      classification: currentTargetRequiredRecords > 0 ? 'target_scoped_local' : 'reviewed_exception',
      confidence: 'medium',
      rationale: 'Quiz navigation/session evidence should be target-scoped when target-required; current examples may already be reviewed.',
    };
  }
  if (sourcePath.includes('diagnosis')) {
    return {
      classification: 'target_scoped_local',
      confidence: 'medium',
      rationale: 'Diagnosis/training progress is learner-state tied to the study target and source-locale copy.',
    };
  }
  if (sourcePath.includes('lesson')) {
    return {
      classification: currentTargetRequiredRecords > 0 ? 'target_scoped_local' : 'reviewed_exception',
      confidence: 'medium',
      rationale: 'Lesson dynamic storage can include progress, session, reward, or lock state; require per-key confirmation before implementation.',
    };
  }
  return {
    classification: currentTargetRequiredRecords > 0 ? 'still_blocked' : 'reviewed_exception',
    confidence: 'low',
    rationale: 'No stronger file-level policy can be inferred from current artifacts.',
  };
}

function renderMarkdown(packet: Packet): string {
  const lines = [
    '# GUSTAV TK1 Unknown Target Storage Classification Packet',
    '',
    `Run: \`${packet.runId}\``,
    '',
    `Status: \`${packet.status}\``,
    '',
    `Generated at: ${packet.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Target plan unknown records: ${packet.summary.targetPlanUnknownRecords}`,
    `- Target plan unknown files: ${packet.summary.targetPlanUnknownFiles}`,
    `- Current inventory records in plan files: ${packet.summary.currentInventoryRecordsInPlanFiles}`,
    `- Current target-required records in plan files: ${packet.summary.currentTargetRequiredRecordsInPlanFiles}`,
    `- Current unknown target records in plan files: ${packet.summary.currentUnknownTargetRecordsInPlanFiles}`,
    `- Plan example checks: ${packet.summary.planExampleChecks}`,
    `- Matched examples: ${packet.summary.matchedExamples}`,
    `- Missing examples: ${packet.summary.missingExamples}`,
    `- Examples still target-required: ${packet.summary.examplesStillTargetRequired}`,
    `- Examples now not target-required: ${packet.summary.examplesNowNotTargetRequired}`,
    `- Stale evidence detected: ${packet.summary.staleEvidenceDetected ? 'yes' : 'no'}`,
    `- Classification files: ${packet.summary.classificationFiles}`,
    `- Still blocked files: ${packet.summary.stillBlockedFiles}`,
    `- Reviewed exception files: ${packet.summary.reviewedExceptionFiles}`,
    `- Can continue architecture work: ${packet.summary.canContinueArchitectureWork ? 'yes' : 'no'}`,
    `- Can modify production app files: ${packet.summary.canModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- May start French generation: ${packet.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    '',
    '## Classifications',
    '',
  ];

  for (const item of packet.classifications) {
    lines.push(`### ${item.sourcePath}`);
    lines.push('');
    lines.push(`- Plan records: ${item.planRecords}`);
    lines.push(`- Current records in file: ${item.currentRecordsInFile}`);
    lines.push(`- Current target-required records: ${item.currentTargetRequiredRecords}`);
    lines.push(`- Current unknown target records: ${item.currentUnknownTargetRecords}`);
    lines.push(`- Proposed classification: \`${item.proposedClassification}\``);
    lines.push(`- Confidence: \`${item.confidence}\``);
    lines.push(`- Rationale: ${item.rationale}`);
    lines.push('- Examples:');
    for (const example of item.exampleLines) {
      lines.push(`  - line ${example.line} ${example.operation}: match=${example.matchStatus}, currentScope=\`${example.currentScope || 'none'}\`, targetRequired=${example.currentTargetNamespaceRequired ? 'yes' : 'no'}, currentKey=\`${example.currentKey || example.planKey || 'unknown'}\``);
    }
    lines.push('- Allowed work now:');
    for (const action of item.allowedWorkNow) lines.push(`  - ${action}`);
    lines.push('- Blocked actions:');
    for (const action of item.blockedActions) lines.push(`  - ${action}`);
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
    console.error('Usage: npx tsx scripts/gustav_tk1_unknown_target_storage_classification_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditDir = path.join(runDir, 'audits');
  const targetKeyPlanPath = path.join(auditDir, 'target_key_integration_plan.json');
  const storageInventoryPath = path.join(runDir, 'inputs', 'storage_key_inventory.json');
  const slicePacketPath = path.join(auditDir, 'target_key_slice_packet.json');
  const targetKeyPlan = readJson<Record<string, unknown>>(targetKeyPlanPath);
  const storageInventory = readJson<Record<string, unknown>>(storageInventoryPath);
  const slicePacket = readJson<Record<string, unknown>>(slicePacketPath);

  const unknownDomain = arr<Record<string, unknown>>(targetKeyPlan.domains)
    .find((domain) => domain.domain === 'unknown_target_storage') ?? {};
  const touchpoints = arr<Record<string, unknown>>(unknownDomain.fileTouchpoints);
  const storageRecords = arr<StorageRecord>(storageInventory.records);
  const planFiles = new Set(touchpoints.map((touchpoint) => String(touchpoint.sourcePath || '')).filter(Boolean));
  const recordsInPlanFiles = storageRecords.filter((record) => planFiles.has(record.sourcePath));
  const currentTargetRequiredRecords = recordsInPlanFiles.filter((record) => record.targetNamespaceRequired === true);
  const currentUnknownTargetRecords = currentTargetRequiredRecords.filter((record) => currentDomainForRecord(record) === 'unknown_target_storage');

  let planExampleChecks = 0;
  let matchedExamples = 0;
  let missingExamples = 0;
  let examplesStillTargetRequired = 0;
  let examplesNowNotTargetRequired = 0;

  const classifications: FileClassification[] = touchpoints.map((touchpoint) => {
    const sourcePath = String(touchpoint.sourcePath || '');
    const planRecords = n(touchpoint, 'records');
    const currentInFile = storageRecords.filter((record) => record.sourcePath === sourcePath);
    const currentTargetInFile = currentInFile.filter((record) => record.targetNamespaceRequired === true);
    const currentUnknownInFile = currentTargetInFile.filter((record) => currentDomainForRecord(record) === 'unknown_target_storage');
    const proposal = proposedClassificationForFile(sourcePath, currentUnknownInFile.length, currentTargetInFile.length);
    const exampleLines = arr<Record<string, unknown>>(touchpoint.examples).map((example) => {
      planExampleChecks += 1;
      const line = n(example, 'line');
      const operation = String(example.operation || '');
      const matched = currentInFile.find((record) => record.line === line && record.operation === operation);
      if (matched) {
        matchedExamples += 1;
        if (matched.targetNamespaceRequired) examplesStillTargetRequired += 1;
        else examplesNowNotTargetRequired += 1;
      } else {
        missingExamples += 1;
      }
      return {
        line,
        operation,
        planKey: String(example.key || ''),
        currentKey: matched ? stableRecordKey(matched) : '',
        currentScope: matched?.scope || '',
        currentTargetNamespaceRequired: matched?.targetNamespaceRequired === true,
        currentRisk: matched?.risk || '',
        matchStatus: matched ? 'matched' as const : 'missing' as const,
      };
    });

    return {
      sourcePath,
      planRecords,
      currentRecordsInFile: currentInFile.length,
      currentTargetRequiredRecords: currentTargetInFile.length,
      currentUnknownTargetRecords: currentUnknownInFile.length,
      proposedClassification: proposal.classification,
      confidence: proposal.confidence,
      rationale: proposal.rationale,
      exampleLines,
      allowedWorkNow: [
        'Review classification evidence.',
        'Prepare per-key scope decisions in audit artifacts.',
        'Mark stale plan evidence for regeneration.',
      ],
      blockedActions: [
        'Do not edit this source file.',
        'Do not change AsyncStorage keys.',
        'Do not mark French generation ready from classification alone.',
      ],
    };
  }).sort((a, bEntry) => bEntry.planRecords - a.planRecords || a.sourcePath.localeCompare(bEntry.sourcePath));

  const targetPlanUnknownRecords = classifications.reduce((sum, item) => sum + item.planRecords, 0);
  const staleEvidenceDetected = examplesNowNotTargetRequired > 0 || missingExamples > 0;
  const packet: Packet = {
    schemaVersion: 'gustav-tk1-unknown-target-storage-classification-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      targetKeyIntegrationPlan: artifactPath(repoRoot, targetKeyPlanPath),
      storageKeyInventory: artifactPath(repoRoot, storageInventoryPath),
      targetKeySlicePacket: artifactPath(repoRoot, slicePacketPath),
    },
    summary: {
      targetPlanUnknownRecords,
      targetPlanUnknownFiles: classifications.length,
      currentInventoryRecordsInPlanFiles: recordsInPlanFiles.length,
      currentTargetRequiredRecordsInPlanFiles: currentTargetRequiredRecords.length,
      currentUnknownTargetRecordsInPlanFiles: currentUnknownTargetRecords.length,
      planExampleChecks,
      matchedExamples,
      missingExamples,
      examplesStillTargetRequired,
      examplesNowNotTargetRequired,
      staleEvidenceDetected,
      classificationFiles: classifications.length,
      stillBlockedFiles: classifications.filter((item) => item.proposedClassification === 'still_blocked').length,
      reviewedExceptionFiles: classifications.filter((item) => item.proposedClassification === 'reviewed_exception').length,
      canContinueArchitectureWork: object(slicePacket.summary).canContinueArchitectureWork === true,
      canModifyProductionAppFiles: false,
      mayStartFrenchGeneration: false,
    },
    classifications,
    requiredNextActions: [
      'Regenerate or amend target_key_integration_plan after reviewing stale unknown evidence.',
      'For every still target-required record, assign target/local/cloud/source/global scope before implementation.',
      'Keep TK2 local/cloud decision contracts blocked until TK1 stale evidence is reconciled.',
      'Preserve P1A/P1B approval gates; this packet is not an implementation unlock.',
    ],
    forbiddenActions: [
      'Do not treat DALSHE as approval.',
      'Do not edit source files named in this packet.',
      'Do not change storage keys from TK1 classification.',
      'Do not create migration adapters.',
      'Do not start French generation.',
    ],
    notes: [
      'This packet reconciles target-key unknown touchpoints against the current storage inventory.',
      'A stale evidence finding is useful: it prevents old unknown records from driving broad implementation work.',
      'Classification proposals are conservative and must become explicit contracts before implementation.',
    ],
  };

  const outJson = path.join(auditDir, 'tk1_unknown_target_storage_classification_packet.json');
  const outMd = path.join(auditDir, 'tk1_unknown_target_storage_classification_packet.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(packet));

  console.log(`GUSTAV TK1 unknown target storage classification packet: ${packet.status}`);
  console.log(`Target plan unknown records: ${packet.summary.targetPlanUnknownRecords}`);
  console.log(`Current target-required records in plan files: ${packet.summary.currentTargetRequiredRecordsInPlanFiles}`);
  console.log(`Current unknown target records in plan files: ${packet.summary.currentUnknownTargetRecordsInPlanFiles}`);
  console.log(`Stale evidence detected: ${packet.summary.staleEvidenceDetected ? 'yes' : 'no'}`);
  console.log(`May start French generation: ${packet.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
