import fs from 'node:fs';
import path from 'node:path';

type DecisionAction =
  | 'sync_under_target'
  | 'keep_local_target_scoped'
  | 'covered_by_existing_cloud_pattern'
  | 'block_unknown';

type Risk = 'low' | 'medium' | 'high' | 'blocker';
type Confidence = 'high' | 'medium' | 'low';

type StorageInventory = {
  records?: Array<{
    key?: string;
    keyPattern?: string;
    sourcePath: string;
    line: number;
    operation: string;
    scope?: string;
    targetNamespaceRequired?: boolean;
  }>;
};

type CloudMapping = {
  storageComparison?: {
    targetSensitiveLocalKeysMissingFromCloud?: string[];
  };
  entries?: Array<{
    key?: string;
    keyPattern?: string;
    action?: string;
    targetPath?: string;
  }>;
};

type DecisionEntry = {
  key: string;
  action: DecisionAction;
  risk: Risk;
  confidence: Confidence;
  targetPath?: string;
  localKeyShape?: string;
  reason: string;
  requiredBeforeFrench: string[];
  evidence: Array<{
    sourcePath: string;
    line: number;
    operation: string;
  }>;
};

type Report = {
  schemaVersion: 'gustav-local-cloud-decision-table-v0';
  runId: string;
  generatedAt: string;
  status: 'PASS' | 'HOLD' | 'BLOCK';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    entries: number;
    syncUnderTarget: number;
    keepLocalTargetScoped: number;
    coveredByExistingCloudPattern: number;
    blockUnknown: number;
    blockers: number;
    highRisks: number;
  };
  entries: DecisionEntry[];
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

function stableRecordKey(record: { key?: string; keyPattern?: string }): string {
  return record.key ?? record.keyPattern ?? '';
}

function targetPathFor(key: string): string {
  return `progress/targets/{studyTarget}/${key}`;
}

function localShapeFor(key: string): string {
  return `${key}_v2::{studyTarget}`;
}

function actionEntry(input: {
  key: string;
  action: DecisionAction;
  risk: Risk;
  confidence: Confidence;
  targetPath?: string;
  localKeyShape?: string;
  reason: string;
  requiredBeforeFrench: string[];
  evidence: DecisionEntry['evidence'];
}): DecisionEntry {
  return input;
}

function decideKey(key: string, evidence: DecisionEntry['evidence'], cloudEntries: NonNullable<CloudMapping['entries']>): DecisionEntry {
  const lower = key.toLowerCase();
  const cloudIds = new Set(cloudEntries.map(stableRecordKey));

  const covered = (reason: string, targetPath?: string): DecisionEntry => actionEntry({
    key,
    action: 'covered_by_existing_cloud_pattern',
    risk: 'high',
    confidence: 'medium',
    targetPath,
    reason,
    requiredBeforeFrench: [
      'Verify the cloud mapping expands this family under studyTarget.',
      'Verify storage migration maps legacy values only to English target.',
    ],
    evidence,
  });

  const sync = (reason: string): DecisionEntry => actionEntry({
    key,
    action: 'sync_under_target',
    risk: 'blocker',
    confidence: 'high',
    targetPath: targetPathFor(key),
    localKeyShape: localShapeFor(key),
    reason,
    requiredBeforeFrench: [
      'Add target-scoped local key shape.',
      'Add target-scoped cloud mapping or explicit server-side idempotency.',
      'Map legacy flat values to English only.',
      'Add target switch and cloud restore tests.',
    ],
    evidence,
  });

  const localOnly = (reason: string): DecisionEntry => actionEntry({
    key,
    action: 'keep_local_target_scoped',
    risk: 'blocker',
    confidence: 'high',
    localKeyShape: localShapeFor(key),
    reason,
    requiredBeforeFrench: [
      'Keep this state out of cloud sync by explicit allowlist decision.',
      'Add target-scoped local key shape.',
      'Verify switching studyTarget cannot resume another target session.',
    ],
    evidence,
  });

  if (key === 'lesson1_progress' && cloudIds.has('lesson${...}_progress')) {
    return covered('Literal lesson progress key is covered by the existing lesson progress cloud family.', 'progress/targets/{studyTarget}/lesson${...}_progress');
  }
  if (key === 'lesson1_words' && cloudIds.has('lesson${...}_words')) {
    return covered('Literal lesson words key is covered by the existing lesson words cloud family.', 'progress/targets/{studyTarget}/lesson${...}_words');
  }
  if (lower.startsWith('level_exam_${')) {
    return covered('Dynamic level exam key family is represented in cloud sync by explicit A1/A2/B1/B2 keys.');
  }

  if (
    lower.includes('cellindex') ||
    lower.includes('phraseorder') ||
    lower.includes('errorreplay') ||
    lower === 'quiz_nav_level' ||
    lower === 'open_diagnostic'
  ) {
    return localOnly('Navigation/session/replay state should not roam across devices, but it must be isolated per study target.');
  }

  if (
    lower.includes('achievement_') ||
    lower === 'quiz_hard_count' ||
    lower.includes('mistake_practice') ||
    lower.includes('preposition_progress') ||
    lower.includes('prep_drill_perfect') ||
    lower.includes('bonus_granted') ||
    lower.includes('irregular_shards_granted')
  ) {
    return sync('Target-sensitive progress, practice, reward idempotency or achievement counter must not remain flat/local-only without a reviewed decision.');
  }

  return actionEntry({
    key,
    action: 'block_unknown',
    risk: 'blocker',
    confidence: 'low',
    reason: 'No local/cloud decision rule matched this target-sensitive key.',
    requiredBeforeFrench: [
      'Manually classify this key before French generation.',
    ],
    evidence,
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Local/Cloud Decision Table',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Entries: ${report.summary.entries}`,
    `- Sync under target: ${report.summary.syncUnderTarget}`,
    `- Keep local target-scoped: ${report.summary.keepLocalTargetScoped}`,
    `- Covered by existing cloud pattern: ${report.summary.coveredByExistingCloudPattern}`,
    `- Block unknown: ${report.summary.blockUnknown}`,
    `- Blockers: ${report.summary.blockers}`,
    `- High risks: ${report.summary.highRisks}`,
    '',
    '## Decisions',
    '',
  ];
  for (const entry of report.entries) {
    lines.push(`- \`${entry.key}\` -> \`${entry.action}\` / \`${entry.risk}\``);
    lines.push(`  Reason: ${entry.reason}`);
    if (entry.targetPath) lines.push(`  Target path: \`${entry.targetPath}\``);
    if (entry.localKeyShape) lines.push(`  Local shape: \`${entry.localKeyShape}\``);
    if (entry.evidence.length > 0) {
      const first = entry.evidence[0];
      lines.push(`  Evidence: ${first.sourcePath}:${first.line} (${first.operation})`);
    }
  }
  lines.push('', '## Notes', '');
  for (const note of report.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_local_cloud_decision_table.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const storage = readJson<StorageInventory>(path.join(runDir, 'inputs', 'storage_key_inventory.json'));
  const cloud = readJson<CloudMapping>(path.join(runDir, 'audits', 'cloud_sync_mapping.json'));
  const missing = cloud.storageComparison?.targetSensitiveLocalKeysMissingFromCloud ?? [];
  const records = storage.records ?? [];
  const entries = missing.map((key) => {
    const evidence = records
      .filter((record) => stableRecordKey(record) === key)
      .slice(0, 12)
      .map((record) => ({
        sourcePath: record.sourcePath,
        line: record.line,
        operation: record.operation,
      }));
    return decideKey(key, evidence, cloud.entries ?? []);
  }).sort((a, b) => a.action.localeCompare(b.action) || a.key.localeCompare(b.key));

  const blockers = entries.filter((entry) => entry.risk === 'blocker').length;
  const report: Report = {
    schemaVersion: 'gustav-local-cloud-decision-table-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: entries.length === 0 ? 'PASS' : blockers > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      entries: entries.length,
      syncUnderTarget: entries.filter((entry) => entry.action === 'sync_under_target').length,
      keepLocalTargetScoped: entries.filter((entry) => entry.action === 'keep_local_target_scoped').length,
      coveredByExistingCloudPattern: entries.filter((entry) => entry.action === 'covered_by_existing_cloud_pattern').length,
      blockUnknown: entries.filter((entry) => entry.action === 'block_unknown').length,
      blockers,
      highRisks: entries.filter((entry) => entry.risk === 'high').length,
    },
    entries,
    notes: [
      'This table resolves target-sensitive local keys that were absent from cloud mapping comparison.',
      'covered_by_existing_cloud_pattern means the missing entry is a literal or dynamic family already represented by a broader cloud mapping.',
      'French generation remains blocked while sync_under_target and keep_local_target_scoped keys do not have implemented target namespaces and tests.',
    ],
  };

  const jsonPath = path.join(runDir, 'audits', 'local_cloud_decision_table.json');
  const mdPath = path.join(runDir, 'audits', 'local_cloud_decision_table.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, renderMarkdown(report));
  console.log(`GUSTAV local/cloud decision table: ${report.status}`);
  console.log(`Entries: ${entries.length}`);
  console.log(`Report: ${path.relative(repoRoot, mdPath)}`);
}

void main();
