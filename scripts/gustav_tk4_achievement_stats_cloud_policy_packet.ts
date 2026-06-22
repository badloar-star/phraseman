import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD';

type MixedAchievementPolicy = {
  id: string;
  category: string;
  line: number;
  originalScope: string;
  policyScope: 'global_account_gamification';
  achievementStateBucket: 'progress/global/achievements_state';
  sourceEvidenceRule: string;
  frenchSafetyRule: string;
};

type StatsPolicy = {
  key: string;
  cloudPath: string;
  policyScope: 'global' | 'study_target';
  rule: string;
};

type Packet = {
  schemaVersion: 'gustav-tk4-achievement-stats-cloud-policy-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    achievementTaxonomy: string;
    mixedCloudPayloadAudit: string;
    cloudSyncMapping: string;
    targetKeyIntegrationPlan: string;
    targetKeySlicePacket: string;
    tk3P3StoreContractsPacket: string;
  };
  summary: {
    achievementTaxonomyStatus: string;
    achievementTotal: number;
    achievementGlobal: number;
    achievementStudyTarget: number;
    achievementMixed: number;
    achievementBlockers: number;
    mixedPolicies: number;
    mixedPoliciesCovered: number;
    mixedPolicyCategories: number;
    mixedCloudPayloadStatus: string;
    mixedCloudPayloadBlockers: number;
    mixedCloudPayloadMixedFields: number;
    statsPolicies: number;
    cloudGlobalGamificationKeys: number;
    cloudGlobalStatsKeys: number;
    tk3P3StoreContractsClean: boolean;
    tk4PolicyClean: boolean;
    recommendedNextSafeSlice: string;
    canPassRDY030Now: boolean;
    canContinueArchitectureWork: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  mixedAchievementPolicies: MixedAchievementPolicy[];
  statsPolicies: StatsPolicy[];
  requiredNextActions: string[];
  forbiddenActions: string[];
  notes: string[];
};

const GLOBAL_GAMIFICATION_KEYS = new Set([
  'user_total_xp',
  'weekly_xp',
  'streak_count',
  'achievements_state',
]);

const STATS_KEYS = new Set([
  'daily_stats',
  'user_stats_v1',
  'stats_daily_breakdown_v1',
]);

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

function cloudEntryPolicy(entry: Record<string, unknown>): StatsPolicy {
  const key = String(entry.key || '');
  const cloudPath = String(entry.targetPath || '');
  return {
    key,
    cloudPath,
    policyScope: String(entry.scope || '') === 'study_target' ? 'study_target' : 'global',
    rule: key === 'daily_stats'
      ? 'Daily XP/streak stays account-global; target learning evidence stays in scoped lesson/quiz/trainer/stat buckets.'
      : key === 'user_stats_v1'
        ? 'Legacy user_stats_v1 stays global compatibility; learning counters route to target_stats_v2::{studyTarget}.'
        : 'Legacy stats_daily_breakdown_v1 stays global compatibility; learning metrics route to target_stats_v2::{studyTarget}.',
  };
}

function renderMarkdown(packet: Packet): string {
  const lines = [
    '# GUSTAV TK4 Achievement/Stats/Cloud Policy Packet',
    '',
    `Run: \`${packet.runId}\``,
    '',
    `Status: \`${packet.status}\``,
    '',
    `Generated at: ${packet.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Achievement taxonomy status: \`${packet.summary.achievementTaxonomyStatus}\``,
    `- Achievement total: ${packet.summary.achievementTotal}`,
    `- Achievement global: ${packet.summary.achievementGlobal}`,
    `- Achievement study target: ${packet.summary.achievementStudyTarget}`,
    `- Achievement mixed: ${packet.summary.achievementMixed}`,
    `- Achievement blockers: ${packet.summary.achievementBlockers}`,
    `- Mixed policies: ${packet.summary.mixedPolicies}`,
    `- Mixed policies covered: ${packet.summary.mixedPoliciesCovered}`,
    `- Mixed policy categories: ${packet.summary.mixedPolicyCategories}`,
    `- Mixed cloud payload status: \`${packet.summary.mixedCloudPayloadStatus}\``,
    `- Mixed cloud payload blockers: ${packet.summary.mixedCloudPayloadBlockers}`,
    `- Mixed cloud payload mixed fields: ${packet.summary.mixedCloudPayloadMixedFields}`,
    `- Stats policies: ${packet.summary.statsPolicies}`,
    `- Cloud global gamification keys: ${packet.summary.cloudGlobalGamificationKeys}`,
    `- Cloud global stats keys: ${packet.summary.cloudGlobalStatsKeys}`,
    `- TK3 P3 store contracts clean: ${packet.summary.tk3P3StoreContractsClean ? 'yes' : 'no'}`,
    `- TK4 policy clean: ${packet.summary.tk4PolicyClean ? 'yes' : 'no'}`,
    `- Can pass RDY-030 now: ${packet.summary.canPassRDY030Now ? 'yes' : 'no'}`,
    `- Recommended next safe slice: \`${packet.summary.recommendedNextSafeSlice}\``,
    `- May start French generation: ${packet.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${packet.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Policy Decision',
    '',
    '- XP, streak and time-of-day achievements remain account-global gamification achievements.',
    '- Target-language learning evidence remains isolated in target stores before any unlock/backfill calculation.',
    '- Legacy `progress/global/achievements_state` remains global compatibility state.',
    '- French target achievement state must not hydrate from English legacy achievement state.',
    '- Stats payloads keep product/global metrics global and route learning metrics through target stats buckets.',
    '',
    '## Mixed Achievement Coverage',
    '',
    `- Covered mixed achievements: ${packet.mixedAchievementPolicies.length}`,
  ];
  const byCategory = new Map<string, number>();
  for (const policy of packet.mixedAchievementPolicies) {
    byCategory.set(policy.category, (byCategory.get(policy.category) || 0) + 1);
  }
  for (const [category, count] of Array.from(byCategory.entries()).sort((a, bEntry) => a[0].localeCompare(bEntry[0]))) {
    lines.push(`- \`${category}\`: ${count}`);
  }
  lines.push('', '## Stats Policies', '');
  for (const policy of packet.statsPolicies) {
    lines.push(`- \`${policy.key}\` -> \`${policy.cloudPath}\` / \`${policy.policyScope}\`: ${policy.rule}`);
  }
  lines.push('', '## Required Next Actions', '');
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
    console.error('Usage: npx tsx scripts/gustav_tk4_achievement_stats_cloud_policy_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditDir = path.join(runDir, 'audits');
  const achievementPath = path.join(auditDir, 'achievement_taxonomy.json');
  const mixedCloudPath = path.join(auditDir, 'mixed_cloud_payload_audit.json');
  const cloudPath = path.join(auditDir, 'cloud_sync_mapping.json');
  const targetKeyPath = path.join(auditDir, 'target_key_integration_plan.json');
  const slicePath = path.join(auditDir, 'target_key_slice_packet.json');
  const tk3Path = path.join(auditDir, 'tk3_p3_store_contracts_packet.json');

  const achievements = readJson<Record<string, unknown>>(achievementPath);
  const mixedCloud = readJson<Record<string, unknown>>(mixedCloudPath);
  const cloud = readJson<Record<string, unknown>>(cloudPath);
  const targetKey = readJson<Record<string, unknown>>(targetKeyPath);
  const slice = readJson<Record<string, unknown>>(slicePath);
  const tk3 = readJson<Record<string, unknown>>(tk3Path);

  const achievementSummary = object(achievements.summary);
  const mixedCloudSummary = object(mixedCloud.summary);
  const tk3Summary = object(tk3.summary);
  const sliceSummary = object(slice.summary);
  const mixedAchievements = arr<Record<string, unknown>>(achievements.entries)
    .filter((entry) => entry.scope === 'mixed');
  const cloudEntries = arr<Record<string, unknown>>(cloud.entries);
  const globalGamificationEntries = cloudEntries.filter((entry) => (
    GLOBAL_GAMIFICATION_KEYS.has(String(entry.key || '')) &&
    entry.action === 'keep_global' &&
    entry.scope === 'global'
  ));
  const statsEntries = cloudEntries.filter((entry) => (
    STATS_KEYS.has(String(entry.key || '')) &&
    entry.action === 'keep_global'
  ));

  const mixedAchievementPolicies: MixedAchievementPolicy[] = mixedAchievements.map((entry) => ({
    id: String(entry.id || ''),
    category: String(entry.category || ''),
    line: n(entry, 'line'),
    originalScope: String(entry.scope || ''),
    policyScope: 'global_account_gamification',
    achievementStateBucket: 'progress/global/achievements_state',
    sourceEvidenceRule: 'Use target-isolated learning stores as evidence input; do not store target proof inside flat achievements_state.',
    frenchSafetyRule: 'French may contribute account XP/streak events only after target stores are isolated; it must not inherit English achievement unlock state.',
  }));
  const statsPolicies = statsEntries.map(cloudEntryPolicy);
  const categoriesCovered = new Set(mixedAchievementPolicies.map((entry) => entry.category)).size;
  const tk3P3StoreContractsClean =
    b(sliceSummary, 'tk3P3StoreContractsClean') &&
    b(tk3Summary, 'tk3ContractsClean');
  const tk4PolicyClean =
    mixedAchievementPolicies.length === n(achievementSummary, 'mixed') &&
    mixedAchievementPolicies.length === n(achievementSummary, 'blockers') &&
    globalGamificationEntries.length === GLOBAL_GAMIFICATION_KEYS.size &&
    statsPolicies.length === STATS_KEYS.size &&
    statusOf(mixedCloud) === 'PASS' &&
    n(mixedCloudSummary, 'blockers') === 0 &&
    n(mixedCloudSummary, 'mixedFields') === 0 &&
    tk3P3StoreContractsClean;

  const packet: Packet = {
    schemaVersion: 'gustav-tk4-achievement-stats-cloud-policy-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: tk4PolicyClean ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      achievementTaxonomy: artifactPath(repoRoot, achievementPath),
      mixedCloudPayloadAudit: artifactPath(repoRoot, mixedCloudPath),
      cloudSyncMapping: artifactPath(repoRoot, cloudPath),
      targetKeyIntegrationPlan: artifactPath(repoRoot, targetKeyPath),
      targetKeySlicePacket: artifactPath(repoRoot, slicePath),
      tk3P3StoreContractsPacket: artifactPath(repoRoot, tk3Path),
    },
    summary: {
      achievementTaxonomyStatus: statusOf(achievements),
      achievementTotal: n(achievementSummary, 'total'),
      achievementGlobal: n(achievementSummary, 'global'),
      achievementStudyTarget: n(achievementSummary, 'studyTarget'),
      achievementMixed: n(achievementSummary, 'mixed'),
      achievementBlockers: n(achievementSummary, 'blockers'),
      mixedPolicies: mixedAchievementPolicies.length,
      mixedPoliciesCovered: mixedAchievementPolicies.length,
      mixedPolicyCategories: categoriesCovered,
      mixedCloudPayloadStatus: statusOf(mixedCloud),
      mixedCloudPayloadBlockers: n(mixedCloudSummary, 'blockers'),
      mixedCloudPayloadMixedFields: n(mixedCloudSummary, 'mixedFields'),
      statsPolicies: statsPolicies.length,
      cloudGlobalGamificationKeys: globalGamificationEntries.length,
      cloudGlobalStatsKeys: statsEntries.length,
      tk3P3StoreContractsClean,
      tk4PolicyClean,
      recommendedNextSafeSlice: tk4PolicyClean ? 'TK5_SURFACE_AND_RAW_GUARDS' : 'TK4_ACHIEVEMENTS_STATS_CLOUD_POLICY',
      canPassRDY030Now: tk4PolicyClean,
      canContinueArchitectureWork: b(sliceSummary, 'canContinueArchitectureWork'),
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    mixedAchievementPolicies,
    statsPolicies,
    requiredNextActions: tk4PolicyClean
      ? [
          'Allow RDY-030 to use this packet as the explicit mixed-achievement product policy.',
          'Proceed to TK5 surface and raw guards as audit-only work.',
          'Keep achievement implementation locked behind exact future apply approval.',
        ]
      : [
          'Cover every mixed achievement with an explicit product policy.',
          'Ensure mixed cloud payload audit has zero blockers and zero mixed fields.',
          'Keep TK4 in audit-only mode.',
        ],
    forbiddenActions: [
      'Do not treat DALSHE as approval.',
      'Do not edit app/achievements.ts from this packet.',
      'Do not edit cloud sync code from this packet.',
      'Do not rewrite stats payloads from this packet.',
      'Do not start French generation.',
    ],
    notes: [
      'This packet is a product policy and acceptance contract, not implementation.',
      'It resolves the mixed-achievement decision by keeping XP/streak achievements global while preserving target learning evidence in scoped stores.',
      `Target key plan remains ${statusOf(targetKey)} until approved implementation and tests exist.`,
      'French generation remains blocked by other readiness gates.',
    ],
  };

  const outJson = path.join(auditDir, 'tk4_achievement_stats_cloud_policy_packet.json');
  const outMd = path.join(auditDir, 'tk4_achievement_stats_cloud_policy_packet.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(packet));

  console.log(`GUSTAV TK4 achievement/stats/cloud policy packet: ${packet.status}`);
  console.log(`Mixed policies covered: ${packet.summary.mixedPoliciesCovered}/${packet.summary.achievementMixed}`);
  console.log(`Mixed cloud payload blockers: ${packet.summary.mixedCloudPayloadBlockers}`);
  console.log(`Can pass RDY-030 now: ${packet.summary.canPassRDY030Now ? 'yes' : 'no'}`);
  console.log(`Recommended next safe slice: ${packet.summary.recommendedNextSafeSlice}`);
  console.log(`May start French generation: ${packet.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
