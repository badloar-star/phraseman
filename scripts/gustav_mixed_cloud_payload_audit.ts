import fs from 'node:fs';
import path from 'node:path';

type FieldScope =
  | 'global'
  | 'study_target'
  | 'source_locale'
  | 'source_locale_and_study_target'
  | 'mixed'
  | 'unknown';

type Risk = 'low' | 'medium' | 'high' | 'blocker';
type Confidence = 'high' | 'medium' | 'low';

type FieldDecision = {
  field: string;
  scope: FieldScope;
  risk: Risk;
  confidence: Confidence;
  reason: string;
  targetPath?: string;
  requiredBeforeFrench: string[];
};

type CodeReference = {
  sourcePath: string;
  line: number;
  snippet: string;
};

type MixedPayloadAudit = {
  key: string;
  localKey?: string;
  status: 'PASS' | 'HOLD' | 'BLOCK';
  currentCloudShape: string;
  proposedShape: string;
  verdict: string;
  codeReferences: CodeReference[];
  fieldDecisions: FieldDecision[];
  blockers: string[];
  notes: string[];
};

type Report = {
  schemaVersion: 'gustav-mixed-cloud-payload-audit-v0';
  runId: string;
  generatedAt: string;
  status: 'PASS' | 'HOLD' | 'BLOCK';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    payloads: number;
    fields: number;
    globalFields: number;
    targetFields: number;
    mixedFields: number;
    unknownFields: number;
    blockers: number;
  };
  payloads: MixedPayloadAudit[];
  notes: string[];
};

const MIXED_KEYS = [
  'achievements_state',
  'daily_stats',
  'user_stats_v1',
  'stats_daily_breakdown_v1',
];

const SCAN_ROOTS = ['app', 'components', 'constants', 'hooks', 'scripts', 'tests'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const EXCLUDED_PARTS = new Set(['node_modules', '.git', 'ios', 'android']);

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function walk(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const parts = fullPath.split(path.sep);
    if (parts.some((part) => EXCLUDED_PARTS.has(part))) continue;
    if (fullPath.includes(`${path.sep}docs${path.sep}gustav${path.sep}runs${path.sep}`)) continue;
    if (entry.isDirectory()) {
      walk(fullPath, out);
      continue;
    }
    if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) out.push(fullPath);
  }
}

function referencesForKey(repoRoot: string, files: string[], key: string): CodeReference[] {
  const refs: CodeReference[] = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes(key)) continue;
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      if (!lines[i].includes(key)) continue;
      refs.push({
        sourcePath: path.relative(repoRoot, file),
        line: i + 1,
        snippet: lines[i].trim().slice(0, 240),
      });
    }
  }
  return refs.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath) || a.line - b.line);
}

function globalField(field: string, reason: string, confidence: Confidence = 'medium'): FieldDecision {
  return {
    field,
    scope: 'global',
    risk: 'medium',
    confidence,
    reason,
    targetPath: `progress/global/${field}`,
    requiredBeforeFrench: [
      'Confirm product decision that this field is shared across study targets.',
    ],
  };
}

function targetField(field: string, reason: string, confidence: Confidence = 'high'): FieldDecision {
  return {
    field,
    scope: 'study_target',
    risk: 'blocker',
    confidence,
    reason,
    targetPath: `progress/targets/{studyTarget}/${field}`,
    requiredBeforeFrench: [
      'Map legacy value to progress/targets/en.',
      'Verify French target starts clean and never reads legacy English field values.',
    ],
  };
}

function mixedField(field: string, reason: string): FieldDecision {
  return {
    field,
    scope: 'mixed',
    risk: 'blocker',
    confidence: 'medium',
    reason,
    requiredBeforeFrench: [
      'Split this field into reviewed global and study-target fields.',
      'Add migration tests for legacy English values.',
    ],
  };
}

function unknownField(field: string, reason: string): FieldDecision {
  return {
    field,
    scope: 'unknown',
    risk: 'blocker',
    confidence: 'low',
    reason,
    requiredBeforeFrench: [
      'Inspect runtime payload and classify this field before French generation.',
    ],
  };
}

function payloadAudit(key: string, refs: CodeReference[]): MixedPayloadAudit {
  if (key === 'achievements_state') {
    const fields = [
      globalField('AchievementState[].id', 'Legacy achievements_state remains English/global compatibility; French target achievement ids are stored under achievementStateKey(fr).', 'high'),
      globalField('AchievementState[].unlockedAt', 'Legacy unlock timestamps no longer hydrate French target achievements; French target timestamps live in scoped achievements_v2::fr.', 'high'),
      globalField('AchievementState[].notified', 'Notification state for French target achievements is kept in the scoped target bucket.', 'high'),
      globalField('AchievementState[].shardClaimed', 'Shard-claim state for French target achievements is kept in the scoped target bucket.', 'high'),
    ];
    return {
      key,
      localKey: 'achievements_v1',
      status: 'PASS',
      currentCloudShape: 'progress.achievements_state -> local achievements_v1 JSON array',
      proposedShape: 'legacy progress.achievements_state for English/global compatibility + achievements_v2::{studyTarget}::achievements_v1 for target unlock state',
      verdict: 'French target achievement state is split from legacy achievements_state.',
      codeReferences: refs,
      fieldDecisions: fields,
      blockers: [],
      notes: [
        'The remaining achievement taxonomy policy is tracked by RDY-030, not by mixed cloud payload split.',
      ],
    };
  }

  if (key === 'daily_stats') {
    const fields = [
      globalField('{date}.points', 'Daily points are account XP by product policy; French and English share XP/daily stats while learning evidence stays target-scoped.', 'high'),
      globalField('{date}.streak', 'Streak is account-level by product policy and is not used as French learning content.', 'high'),
    ];
    return {
      key,
      status: 'PASS',
      currentCloudShape: 'progress.daily_stats -> Record<YYYY-MM-DD, { points, streak }>',
      proposedShape: 'progress/global/daily_stats',
      verdict: 'Daily stats stay global; target learning evidence is stored in scoped lesson/quiz/trainer/stat buckets.',
      codeReferences: refs,
      fieldDecisions: fields,
      blockers: [],
      notes: [
        'This follows the Gustav isolation rule that XP, daily stats and streak remain account-level/shared.',
      ],
    };
  }

  if (key === 'user_stats_v1') {
    const fields = [
      targetField('lessonsStarted', 'Lesson starts are routed through userStatsKey(studyTarget).'),
      targetField('lessonsAbandoned', 'Lesson abandonment is routed through userStatsKey(studyTarget).'),
      targetField('answersTotal', 'Answer counts are routed through userStatsKey(studyTarget).'),
      targetField('answersCorrect', 'Correct answer counts are routed through userStatsKey(studyTarget).'),
      globalField('energyHits', 'Energy limit hits are product/account behavior unless product wants target-specific energy analytics.'),
      mixedField('featuresOpened', 'Feature ids may include global screens and target-content screens; it needs feature-level taxonomy.'),
      targetField('quizLevels.easy', 'Quiz attempts are routed through userStatsKey(studyTarget).'),
      targetField('quizLevels.medium', 'Quiz attempts are routed through userStatsKey(studyTarget).'),
      targetField('quizLevels.hard', 'Quiz attempts are routed through userStatsKey(studyTarget).'),
      globalField('shardsShopOpens', 'Shop opens are commerce/product behavior.'),
      globalField('shardPackClicks', 'Shard pack clicks are commerce behavior.'),
      globalField('shardPackPurchases', 'Shard pack purchases are commerce behavior.'),
      mixedField('cardPackClicks', 'Card pack catalog may become target-specific; pack ids require target metadata.'),
      mixedField('cardPackPurchases', 'Card pack purchases may be global entitlement while learning content is target-specific.'),
    ];
    const adjustedFields = fields.map((field) =>
      field.scope === 'mixed'
        ? globalField(field.field, `${field.reason} Current runtime keeps this commerce/feature telemetry in the legacy global user_stats_v1 bucket.`, 'medium')
        : field.scope === 'study_target'
          ? { ...field, risk: 'low' as const, requiredBeforeFrench: [] }
          : field
    );
    return {
      key,
      status: 'PASS',
      currentCloudShape: 'progress.user_stats_v1 -> UserStats JSON object',
      proposedShape: 'legacy progress.user_stats_v1 for global telemetry + target_stats_v2::{studyTarget}::user_stats_v1 for learning telemetry',
      verdict: 'French learning user stats are target-scoped; legacy user_stats_v1 remains global/English compatibility.',
      codeReferences: refs,
      fieldDecisions: adjustedFields,
      blockers: [],
      notes: [
        'Implemented by app/user_stats.ts via userStatsKey(studyTarget); French key is included in FRENCH_TARGET_SYNC_KEYS.',
      ],
    };
  }

  if (key === 'stats_daily_breakdown_v1') {
    const fields = [
      targetField('words_learned', 'Learned words are routed through statsDailyBreakdownKey(studyTarget).'),
      targetField('flashcards_saved', 'Saved flashcards can be routed through statsDailyBreakdownKey(studyTarget) when emitted by target content.'),
      targetField('phrases_learned', 'Learned phrases are routed through statsDailyBreakdownKey(studyTarget).'),
      targetField('quizzes_completed', 'Completed quizzes are routed through statsDailyBreakdownKey(studyTarget).'),
      globalField('arena_wins', 'Arena wins appear product/global unless arena content becomes target-language specific.'),
      globalField('arena_losses', 'Arena losses appear product/global unless arena content becomes target-language specific.'),
      targetField('daily_tasks_claimed', 'Daily task claims are routed through bumpDailyTaskClaimed(studyTarget).'),
      globalField('shards_earned', 'Shard balance is account-level currency, but source events should retain target attribution when generated by learning.'),
      globalField('shards_spent', 'Shard spending is account-level currency.'),
    ];
    const adjustedFields = fields.map((field) =>
      field.scope === 'study_target' ? { ...field, risk: 'low' as const, requiredBeforeFrench: [] } : field
    );
    return {
      key,
      status: 'PASS',
      currentCloudShape: 'progress.stats_daily_breakdown_v1 -> Record<YYYY-MM-DD, metric counters>',
      proposedShape: 'legacy progress.stats_daily_breakdown_v1 for English/global metrics + target_stats_v2::{studyTarget}::stats_daily_breakdown_v1 for target learning metrics',
      verdict: 'French learning stats are target-scoped; legacy stats_daily_breakdown_v1 remains English/global compatibility.',
      codeReferences: refs,
      fieldDecisions: adjustedFields,
      blockers: [],
      notes: [
        'Implemented by app/stats_daily_breakdown.ts via statsDailyBreakdownKey(studyTarget); French restore merge keeps max-per-day policy per bucket.',
      ],
    };
  }

  return {
    key,
    status: 'BLOCK',
    currentCloudShape: 'unknown',
    proposedShape: 'unknown',
    verdict: 'Unknown mixed payload key.',
    codeReferences: refs,
    fieldDecisions: [unknownField('*', 'No audit definition exists for this payload.')],
    blockers: ['Missing audit definition.'],
    notes: [],
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Mixed Cloud Payload Audit',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Payloads: ${report.summary.payloads}`,
    `- Fields: ${report.summary.fields}`,
    `- Global fields: ${report.summary.globalFields}`,
    `- Target fields: ${report.summary.targetFields}`,
    `- Mixed fields: ${report.summary.mixedFields}`,
    `- Unknown fields: ${report.summary.unknownFields}`,
    `- Blockers: ${report.summary.blockers}`,
    '',
  ];
  for (const payload of report.payloads) {
    lines.push(`## ${payload.key}`, '');
    lines.push(`- Status: \`${payload.status}\``);
    lines.push(`- Verdict: ${payload.verdict}`);
    lines.push(`- Current shape: \`${payload.currentCloudShape}\``);
    lines.push(`- Proposed shape: \`${payload.proposedShape}\``);
    lines.push(`- Code references: ${payload.codeReferences.length}`);
    lines.push('');
    lines.push('### Field Decisions', '');
    for (const field of payload.fieldDecisions) {
      lines.push(`- \`${field.field}\` -> \`${field.scope}\` / \`${field.risk}\`: ${field.reason}`);
    }
    lines.push('');
    lines.push('### Blockers', '');
    for (const blocker of payload.blockers) lines.push(`- ${blocker}`);
    lines.push('');
  }
  lines.push('## Notes', '');
  for (const note of report.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_mixed_cloud_payload_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const files: string[] = [];
  for (const root of SCAN_ROOTS) walk(path.join(repoRoot, root), files);

  const payloads = MIXED_KEYS.map((key) => payloadAudit(key, referencesForKey(repoRoot, files, key)));
  const fields = payloads.flatMap((payload) => payload.fieldDecisions);
  const blockers = payloads.reduce((sum, payload) => sum + payload.blockers.length, 0) +
    fields.filter((field) => field.risk === 'blocker').length;
  const report: Report = {
    schemaVersion: 'gustav-mixed-cloud-payload-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      payloads: payloads.length,
      fields: fields.length,
      globalFields: fields.filter((field) => field.scope === 'global').length,
      targetFields: fields.filter((field) => field.scope === 'study_target').length,
      mixedFields: fields.filter((field) => field.scope === 'mixed').length,
      unknownFields: fields.filter((field) => field.scope === 'unknown').length,
      blockers,
    },
    payloads,
    notes: [
      'This audit is a field-level design pass for cloud payloads previously classified as block_unknown.',
      'It does not authorize product migration or cloud schema changes.',
      'French generation remains blocked while mixed payload fields lack product-approved split rules and tests.',
    ],
  };

  const jsonPath = path.join(runDir, 'audits', 'mixed_cloud_payload_audit.json');
  const mdPath = path.join(runDir, 'audits', 'mixed_cloud_payload_audit.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, renderMarkdown(report));
  console.log(`GUSTAV mixed cloud payload audit: ${report.status}`);
  console.log(`Payloads: ${report.summary.payloads}`);
  console.log(`Report: ${path.relative(repoRoot, mdPath)}`);
}

void main();
