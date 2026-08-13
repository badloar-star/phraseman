import fs from 'node:fs';
import path from 'node:path';

type CloudSyncAction =
  | 'keep_global'
  | 'map_to_target'
  | 'map_to_source_locale'
  | 'map_to_source_and_target'
  | 'drop_from_cloud'
  | 'block_unknown';

type Scope =
  | 'global'
  | 'source_locale'
  | 'study_target'
  | 'source_locale_and_study_target'
  | 'mixed'
  | 'unknown';

type Risk = 'low' | 'medium' | 'high' | 'blocker';
type Confidence = 'high' | 'medium' | 'low';

type CloudSyncMappingEntry = {
  key?: string;
  keyPattern?: string;
  sourcePath: string;
  line: number;
  action: CloudSyncAction;
  scope: Scope;
  risk: Risk;
  confidence: Confidence;
  targetPath?: string;
  legacyTarget?: 'en';
  reason: string;
  requiredBeforeFrench: string[];
  localUsageCount?: number;
};

type StorageInventory = {
  records?: Array<{
    key?: string;
    keyPattern?: string;
    sourcePath?: string;
    targetNamespaceRequired?: boolean;
    scope?: string;
  }>;
};

type MappingReport = {
  schemaVersion: 'gustav-cloud-sync-mapping-v0';
  runId: string;
  generatedAt: string;
  status: 'PASS' | 'HOLD' | 'BLOCK';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  source: {
    file: string;
    syncKeysExport: 'SYNC_KEYS';
  };
  summary: {
    entries: number;
    literalKeys: number;
    keyPatterns: number;
    keepGlobal: number;
    mapToTarget: number;
    mapToSourceLocale: number;
    mapToSourceAndTarget: number;
    dropFromCloud: number;
    blockUnknown: number;
    blockers: number;
    highRisks: number;
    targetBucketRequired: number;
    entriesWithLocalUsage: number;
    entriesWithoutLocalUsage: number;
    targetSensitiveLocalKeysMissingFromCloud: number;
  };
  entries: CloudSyncMappingEntry[];
  storageComparison: {
    available: boolean;
    targetSensitiveLocalKeysMissingFromCloud: string[];
    notes: string[];
  };
  notes: string[];
};

const STRING_ARGUMENT_LITERALS = new Set(['en', 'fr', 'ru', 'uk', 'A1', 'A2', 'B1', 'B2']);

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function lineNumber(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function normalizeTemplate(raw: string): string {
  return raw.replace(/\$\{[^}]+\}/g, '${...}');
}

function stableId(entry: Pick<CloudSyncMappingEntry, 'key' | 'keyPattern'>): string {
  return entry.key ?? entry.keyPattern ?? '';
}

function targetPathFor(key: string): string {
  return `progress/targets/{studyTarget}/${key}`;
}

function sourceLocalePathFor(key: string): string {
  return `progress/sourceLocales/{sourceLocale}/${key}`;
}

function sourceTargetPathFor(key: string): string {
  return `progress/targets/{studyTarget}/sourceLocales/{sourceLocale}/${key}`;
}

const LOCAL_ONLY_TARGET_SENSITIVE_KEYS = new Set([
  'flashcards_market_built_cards_v1',
  'flashcards_market_dev_active_pack_v1',
  'flashcards_opened_packs_v1',
  'hidden_community_pack_ids_v1',
]);

function isTargetLearningKey(entry: Pick<CloudSyncMappingEntry, 'key' | 'keyPattern'>): boolean {
  const key = stableId(entry).toLowerCase();
  return (
    key.includes('lesson${') ||
    /^lesson\d+_/.test(key) ||
    key.startsWith('achievement_lesson_') ||
    key === 'unlocked_lessons' ||
    key.startsWith('level_exam_') ||
    key === 'lingman_certificate_v1' ||
    key === 'active_recall_items' ||
    key.includes('trainer') ||
    key.includes('active_recall') ||
    key.includes('diagnostic') ||
    key.includes('irregular_verbs') ||
    key === 'flashcards' ||
    key === 'flashcards_v1' ||
    key === 'custom_flashcards_v2' ||
    key === 'community_owned_pack_ids_v1' ||
    key === 'flashcards_owned_packs_v1' ||
    key === 'flashcards_market_dev_owned_v1' ||
    key === 'flashcards_progress_v1'
  );
}

function classify(entry: Pick<CloudSyncMappingEntry, 'key' | 'keyPattern'>): Omit<CloudSyncMappingEntry, 'key' | 'keyPattern' | 'sourcePath' | 'line' | 'localUsageCount'> {
  const id = stableId(entry);
  const key = id.toLowerCase();

  const target = (reason: string, confidence: Confidence = 'high'): Omit<CloudSyncMappingEntry, 'key' | 'keyPattern' | 'sourcePath' | 'line' | 'localUsageCount'> => ({
    action: 'map_to_target',
    scope: 'study_target',
    risk: 'blocker',
    confidence,
    targetPath: targetPathFor(id),
    legacyTarget: 'en',
    reason,
    requiredBeforeFrench: [
      'Map legacy flat cloud value to progress/targets/en only.',
      'Add target bucket read/write/merge tests.',
      'Verify French never restores this value from legacy English cloud state.',
    ],
  });

  const global = (reason: string, risk: Risk = 'low', confidence: Confidence = 'medium'): Omit<CloudSyncMappingEntry, 'key' | 'keyPattern' | 'sourcePath' | 'line' | 'localUsageCount'> => ({
    action: 'keep_global',
    scope: 'global',
    risk,
    confidence,
    targetPath: `progress/global/${id}`,
    reason,
    requiredBeforeFrench: risk === 'high'
      ? ['Confirm this learning-derived value is intentionally shared across all study targets.']
      : [],
  });

  const sourceLocale = (reason: string): Omit<CloudSyncMappingEntry, 'key' | 'keyPattern' | 'sourcePath' | 'line' | 'localUsageCount'> => ({
    action: 'map_to_source_locale',
    scope: 'source_locale',
    risk: 'high',
    confidence: 'high',
    targetPath: sourceLocalePathFor(id),
    reason,
    requiredBeforeFrench: [
      'Keep source/interface language separate from studyTarget.',
      'Verify changing Russian/Ukrainian explanations does not switch French progress.',
    ],
  });

  const sourceAndTarget = (reason: string): Omit<CloudSyncMappingEntry, 'key' | 'keyPattern' | 'sourcePath' | 'line' | 'localUsageCount'> => ({
    action: 'map_to_source_and_target',
    scope: 'source_locale_and_study_target',
    risk: 'blocker',
    confidence: 'medium',
    targetPath: sourceTargetPathFor(id),
    legacyTarget: 'en',
    reason,
    requiredBeforeFrench: [
      'Persist payloads under both studyTarget and sourceLocale.',
      'Verify Russian and Ukrainian feedback histories do not overwrite each other.',
    ],
  });

  const unknown = (reason: string): Omit<CloudSyncMappingEntry, 'key' | 'keyPattern' | 'sourcePath' | 'line' | 'localUsageCount'> => ({
    action: 'block_unknown',
    scope: 'unknown',
    risk: 'blocker',
    confidence: 'low',
    reason,
    requiredBeforeFrench: [
      'Manually classify this cloud key before French generation.',
      'Add it to a reviewed cloud sync allowlist.',
    ],
  });

  if (key === 'lang' || key === 'app_lang') {
    return sourceLocale('Interface/source locale preference; must not be treated as study target.');
  }

  if (
    key.includes('achievement_quiz') ||
    key.includes('quiz_hard') ||
    key.includes('achievement_flashcards') ||
    key.includes('achievement_daily_phrase') ||
    key.includes('achievement_trainer') ||
    key.includes('achievement_active_recall') ||
    key === 'achievements_state'
  ) {
    return global(
      'Achievement state is account-level; target-specific lesson evidence is read from isolated stores before unlock/backfill.',
      'medium',
      'high',
    );
  }

  if (key === 'daily_stats' || key === 'stats_daily_breakdown_v1' || key === 'user_stats_v1') {
    return global('Stats and daily activity are shared account-level product metrics for English and French.', 'medium', 'high');
  }

  if (isTargetLearningKey(entry)) {
    return target('Lesson, unlock, exam or certificate state is target-language progress.');
  }

  if (key.includes('lifetime_quiz')) {
    return global('Lifetime profile quiz counters are shared account-level statistics.', 'medium', 'high');
  }

  if (
    key.includes('user_total_xp') ||
    key.includes('user_prev_xp') ||
    key.includes('weekly_xp') ||
    key.includes('week_points') ||
    key.includes('streak') ||
    key.includes('last_active_date') ||
    key.includes('login_bonus')
  ) {
    return global('Gamification/account continuity state. Confirm product decision to share it across study targets.', 'medium');
  }

  if (
    key.includes('premium') ||
    key.includes('vip') ||
    key.includes('rc_') ||
    key.includes('gift') ||
    key.includes('wager') ||
    key.includes('league') ||
    key.includes('leaderboard') ||
    key.includes('club') ||
    key.includes('shards') ||
    key.includes('energy') ||
    key.includes('arena') ||
    key.includes('chain_shield')
  ) {
    return global('Commerce, league, arena or currency state is account-level.');
  }

  if (key.includes('foreground_usage') || key.includes('foreground_daily')) {
    return global('Foreground usage metrics are app-level engagement telemetry.');
  }

  if (
    key.includes('user_') ||
    key.includes('avatar') ||
    key.includes('profile') ||
    key.includes('owned_pack') ||
    key.includes('community_owned_pack') ||
    key === 'onboarding_done' ||
    key === 'user_settings' ||
    key === 'device_platform' ||
    key === 'app_version' ||
    key.includes('migration')
  ) {
    return global('Profile, ownership, settings or migration metadata is account-level.');
  }

  if (key.includes('source_locale_payload') || key.includes('localized') || key.includes('feedback_history')) {
    return sourceAndTarget('Persisted localized learning payload requires both sourceLocale and studyTarget.');
  }

  return unknown('No reviewed cloud sync classification rule matched this key.');
}

function markLegacyEnglishCompatibility(entry: CloudSyncMappingEntry): CloudSyncMappingEntry {
  if (!isTargetLearningKey(entry) || entry.action !== 'map_to_target') return entry;
  return {
    ...entry,
    risk: 'medium',
    confidence: 'high',
    targetPath: `progress/targets/en/${stableId(entry)}`,
    legacyTarget: 'en',
    reason: entry.reason + ' Legacy flat SYNC_KEYS are retained as the English compatibility bucket; French uses FRENCH_TARGET_SYNC_KEYS.',
    requiredBeforeFrench: [
      'Keep the raw key as English-only compatibility state.',
      'Verify the French counterpart is present in FRENCH_TARGET_SYNC_KEYS.',
      'Verify French restore never falls back to this legacy English cloud key.',
    ],
  };
}

function extractSyncKeys(sourceText: string): CloudSyncMappingEntry[] {
  const match = /export const SYNC_KEYS\s*=\s*\[([\s\S]*?)\]\s*as const;/.exec(sourceText);
  if (!match || match.index === undefined) {
    throw new Error('Could not find export const SYNC_KEYS = [...] as const in app/cloud_sync.ts');
  }
  const body = match[1] ?? '';
  const bodyStart = match.index + match[0].indexOf(body);
  const entries = new Map<string, CloudSyncMappingEntry>();
  const literalRe = /(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let literal: RegExpExecArray | null;
  while ((literal = literalRe.exec(body))) {
    const quote = literal[1];
    const raw = literal[2] ?? '';
    if (!raw || raw.length > 240 || raw.includes('\n')) continue;
    if (STRING_ARGUMENT_LITERALS.has(raw)) continue;
    const keyPart = quote === '`' && raw.includes('${')
      ? { keyPattern: normalizeTemplate(raw) }
      : { key: raw };
    const id = stableId(keyPart);
    if (!id || entries.has(id)) continue;
    const classified = classify(keyPart);
    entries.set(id, {
      ...keyPart,
      sourcePath: 'app/cloud_sync.ts',
      line: lineNumber(sourceText, bodyStart + literal.index),
      ...classified,
    });
  }

  const englishHelperRe = /\b(lingmanCertificateKey|irregularVerbsGlobalKey)\(\s*(['"`])en\2\s*\)/g;
  let helper: RegExpExecArray | null;
  while ((helper = englishHelperRe.exec(body))) {
    const helperName = helper[1] ?? '';
    const key = helperName === 'lingmanCertificateKey'
      ? 'lingman_certificate_v1'
      : helperName === 'irregularVerbsGlobalKey'
        ? 'irregular_verbs_global'
        : '';
    if (!key || entries.has(key)) continue;
    entries.set(key, {
      key,
      sourcePath: 'app/cloud_sync.ts',
      line: lineNumber(sourceText, bodyStart + helper.index),
      ...classify({ key }),
    });
  }
  return [...entries.values()].sort((a, b) => a.line - b.line || stableId(a).localeCompare(stableId(b)));
}

function loadStorageInventory(runDir: string): StorageInventory | null {
  const filePath = path.join(runDir, 'inputs', 'storage_key_inventory.json');
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as StorageInventory;
}

function applyFrenchTargetSyncDecisions(entries: CloudSyncMappingEntry[], sourceText: string): CloudSyncMappingEntry[] {
  if (!sourceText.includes('...FRENCH_TARGET_SYNC_KEYS')) return entries;
  return entries.map(markLegacyEnglishCompatibility);
}

function attachStorageComparison(entries: CloudSyncMappingEntry[], storageInventory: StorageInventory | null): MappingReport['storageComparison'] {
  if (!storageInventory?.records) {
    return {
      available: false,
      targetSensitiveLocalKeysMissingFromCloud: [],
      notes: ['storage_key_inventory.json was not available for comparison.'],
    };
  }

  const cloudIds = new Set(entries.map(stableId));
  const usageCounts = new Map<string, number>();
  const targetSensitiveLocal = new Set<string>();
  for (const record of storageInventory.records) {
    const id = record.key ?? record.keyPattern;
    if (!id) continue;
    usageCounts.set(id, (usageCounts.get(id) ?? 0) + 1);
    if (record.targetNamespaceRequired && record.scope !== 'admin_or_qa') {
      targetSensitiveLocal.add(id);
    }
  }
  for (const entry of entries) {
    entry.localUsageCount = usageCounts.get(stableId(entry)) ?? 0;
  }
  const missing = [...targetSensitiveLocal]
    .filter((id) => !cloudIds.has(id))
    .filter((id) => !LOCAL_ONLY_TARGET_SENSITIVE_KEYS.has(id))
    .sort()
    .slice(0, 120);
  return {
    available: true,
    targetSensitiveLocalKeysMissingFromCloud: missing,
    notes: [
      'This comparison is heuristic because storage inventory is heuristic.',
      'A missing local target-sensitive key may be intentionally local-only, but Gustav must record that decision.',
    ],
  };
}

function renderMarkdown(report: MappingReport): string {
  const lines = [
    '# GUSTAV Cloud Sync Mapping',
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
    `- Literal keys: ${report.summary.literalKeys}`,
    `- Key patterns: ${report.summary.keyPatterns}`,
    `- Keep global: ${report.summary.keepGlobal}`,
    `- Map to target: ${report.summary.mapToTarget}`,
    `- Map to source locale: ${report.summary.mapToSourceLocale}`,
    `- Map to source and target: ${report.summary.mapToSourceAndTarget}`,
    `- Drop from cloud: ${report.summary.dropFromCloud}`,
    `- Block unknown: ${report.summary.blockUnknown}`,
    `- Blockers: ${report.summary.blockers}`,
    `- High risks: ${report.summary.highRisks}`,
    `- Target bucket required: ${report.summary.targetBucketRequired}`,
    `- Entries with local usage: ${report.summary.entriesWithLocalUsage}`,
    `- Entries without local usage: ${report.summary.entriesWithoutLocalUsage}`,
    `- Target-sensitive local keys missing from cloud: ${report.summary.targetSensitiveLocalKeysMissingFromCloud}`,
    '',
    '## Blockers And High Risks',
    '',
  ];
  const risks = report.entries.filter((entry) => entry.risk === 'blocker' || entry.risk === 'high');
  for (const entry of risks.slice(0, 80)) {
    lines.push(`- \`${entry.risk}\` \`${stableId(entry)}\` -> \`${entry.action}\` (${entry.scope}) at ${entry.sourcePath}:${entry.line}`);
    lines.push(`  Reason: ${entry.reason}`);
  }
  if (risks.length === 0) lines.push('No blocker/high-risk sync entries found.');
  lines.push('', '## Target-Sensitive Local Keys Missing From Cloud', '');
  if (report.storageComparison.targetSensitiveLocalKeysMissingFromCloud.length === 0) {
    lines.push('No missing target-sensitive local keys found by the heuristic comparison.');
  } else {
    for (const key of report.storageComparison.targetSensitiveLocalKeysMissingFromCloud.slice(0, 80)) {
      lines.push(`- \`${key}\``);
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
    console.error('Usage: npx tsx scripts/gustav_cloud_sync_mapping.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const sourcePath = path.join(repoRoot, 'app', 'cloud_sync.ts');
  const sourceText = fs.readFileSync(sourcePath, 'utf8');
  const entries = applyFrenchTargetSyncDecisions(extractSyncKeys(sourceText), sourceText);
  const storageComparison = attachStorageComparison(entries, loadStorageInventory(runDir));

  const blockUnknown = entries.filter((entry) => entry.action === 'block_unknown').length;
  const blockers = entries.filter((entry) => entry.risk === 'blocker').length;
  const highRisks = entries.filter((entry) => entry.risk === 'high').length;
  const report: MappingReport = {
    schemaVersion: 'gustav-cloud-sync-mapping-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 || blockUnknown > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    source: {
      file: 'app/cloud_sync.ts',
      syncKeysExport: 'SYNC_KEYS',
    },
    summary: {
      entries: entries.length,
      literalKeys: entries.filter((entry) => !!entry.key).length,
      keyPatterns: entries.filter((entry) => !!entry.keyPattern).length,
      keepGlobal: entries.filter((entry) => entry.action === 'keep_global').length,
      mapToTarget: entries.filter((entry) => entry.action === 'map_to_target').length,
      mapToSourceLocale: entries.filter((entry) => entry.action === 'map_to_source_locale').length,
      mapToSourceAndTarget: entries.filter((entry) => entry.action === 'map_to_source_and_target').length,
      dropFromCloud: entries.filter((entry) => entry.action === 'drop_from_cloud').length,
      blockUnknown,
      blockers,
      highRisks,
      targetBucketRequired: entries.filter((entry) => entry.action === 'map_to_target' || entry.action === 'map_to_source_and_target').length,
      entriesWithLocalUsage: entries.filter((entry) => (entry.localUsageCount ?? 0) > 0).length,
      entriesWithoutLocalUsage: entries.filter((entry) => (entry.localUsageCount ?? 0) === 0).length,
      targetSensitiveLocalKeysMissingFromCloud: storageComparison.targetSensitiveLocalKeysMissingFromCloud.length,
    },
    entries,
    storageComparison,
    notes: [
      'This is an automated heuristic mapping of app/cloud_sync.ts SYNC_KEYS.',
      'A HOLD status means French generation remains blocked until target-sensitive cloud keys are migrated or explicitly scoped.',
      'block_unknown entries require manual classification before any Gustav apply.',
    ],
  };

  const jsonPath = path.join(runDir, 'audits', 'cloud_sync_mapping.json');
  const mdPath = path.join(runDir, 'audits', 'cloud_sync_mapping.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, renderMarkdown(report));
  console.log(`GUSTAV cloud sync mapping: ${report.status}`);
  console.log(`Entries: ${entries.length}`);
  console.log(`Report: ${path.relative(repoRoot, mdPath)}`);
}

void main();
