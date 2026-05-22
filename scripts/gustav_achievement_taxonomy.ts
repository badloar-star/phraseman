import fs from 'node:fs';
import path from 'node:path';

type AchievementScope = 'global' | 'study_target' | 'mixed' | 'unknown';
type Risk = 'low' | 'medium' | 'high' | 'blocker';
type Confidence = 'high' | 'medium' | 'low';

type AchievementEntry = {
  id: string;
  category: string;
  line: number;
  scope: AchievementScope;
  risk: Risk;
  confidence: Confidence;
  migrationAction: 'keep_global' | 'move_to_target' | 'split_or_policy_decision' | 'block_unknown';
  targetPath?: string;
  legacyTarget?: 'en';
  reason: string;
  requiredBeforeFrench: string[];
};

type Report = {
  schemaVersion: 'gustav-achievement-taxonomy-v0';
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
    exportName: 'ALL_ACHIEVEMENTS';
  };
  summary: {
    total: number;
    global: number;
    studyTarget: number;
    mixed: number;
    unknown: number;
    blockers: number;
    categories: Record<string, number>;
  };
  entries: AchievementEntry[];
  notes: string[];
};

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

function extractArrayBody(text: string): { body: string; bodyStart: number } {
  const marker = 'export const ALL_ACHIEVEMENTS';
  const start = text.indexOf(marker);
  if (start < 0) throw new Error('Could not find ALL_ACHIEVEMENTS export.');
  const assignment = text.indexOf('=', start);
  if (assignment < 0) throw new Error('Could not find ALL_ACHIEVEMENTS assignment.');
  const arrayStart = text.indexOf('[', assignment);
  if (arrayStart < 0) throw new Error('Could not find ALL_ACHIEVEMENTS array start.');
  let depth = 0;
  let inString: string | null = null;
  let escape = false;
  for (let i = arrayStart; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === inString) {
        inString = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      continue;
    }
    if (ch === '[') depth += 1;
    if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        return {
          body: text.slice(arrayStart + 1, i),
          bodyStart: arrayStart + 1,
        };
      }
    }
  }
  throw new Error('Could not find ALL_ACHIEVEMENTS array end.');
}

function splitObjectEntries(body: string, bodyStart: number): Array<{ objectText: string; startIndex: number }> {
  const entries: Array<{ objectText: string; startIndex: number }> = [];
  let depth = 0;
  let start: number | null = null;
  let inString: string | null = null;
  let escape = false;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === inString) {
        inString = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      continue;
    }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0 && start !== null) {
        entries.push({ objectText: body.slice(start, i + 1), startIndex: bodyStart + start });
        start = null;
      }
    }
  }
  return entries;
}

function extractStringProperty(objectText: string, prop: string): string | null {
  const re = new RegExp(`${prop}\\s*:\\s*(['"\`])((?:\\\\.|(?!\\1)[\\s\\S])*?)\\1`);
  const match = re.exec(objectText);
  return match ? (match[2] ?? null) : null;
}

function classify(id: string, category: string): Omit<AchievementEntry, 'id' | 'category' | 'line'> {
  const target = (reason: string, confidence: Confidence = 'high'): Omit<AchievementEntry, 'id' | 'category' | 'line'> => ({
    scope: 'study_target',
    risk: 'blocker',
    confidence,
    migrationAction: 'move_to_target',
    targetPath: `progress/targets/{studyTarget}/achievements/${id}`,
    legacyTarget: 'en',
    reason,
    requiredBeforeFrench: [
      'Move this achievement state under studyTarget.',
      'Map legacy flat achievement state to English only.',
      'Verify French starts without inherited English unlock/notified/shardClaimed state.',
    ],
  });

  const implementedTarget = (reason: string, confidence: Confidence = 'high'): Omit<AchievementEntry, 'id' | 'category' | 'line'> => ({
    scope: 'study_target',
    risk: 'low',
    confidence,
    migrationAction: 'move_to_target',
    targetPath: `progress/targets/{studyTarget}/achievements/${id}`,
    legacyTarget: 'en',
    reason,
    requiredBeforeFrench: [],
  });

  const global = (reason: string, confidence: Confidence = 'medium'): Omit<AchievementEntry, 'id' | 'category' | 'line'> => ({
    scope: 'global',
    risk: 'medium',
    confidence,
    migrationAction: 'keep_global',
    targetPath: `progress/global/achievements/${id}`,
    reason,
    requiredBeforeFrench: [
      'Confirm product decision that this achievement is shared across all study targets.',
    ],
  });

  const mixed = (reason: string): Omit<AchievementEntry, 'id' | 'category' | 'line'> => ({
    scope: 'mixed',
    risk: 'blocker',
    confidence: 'medium',
    migrationAction: 'split_or_policy_decision',
    reason,
    requiredBeforeFrench: [
      'Make an explicit product policy decision or split this achievement into global and target variants.',
      'Add migration tests for legacy English flat achievement state.',
    ],
  });

  const unknown = (reason: string): Omit<AchievementEntry, 'id' | 'category' | 'line'> => ({
    scope: 'unknown',
    risk: 'blocker',
    confidence: 'low',
    migrationAction: 'block_unknown',
    reason,
    requiredBeforeFrench: [
      'Manually classify this achievement id before French generation.',
    ],
  });

  if (category === 'quiz' || id.startsWith('quiz_')) {
    return implementedTarget('Quiz achievement state, counters, perfect-day evidence and perfect-streak evidence are scoped by studyTarget; quiz routes pass studyTarget before unlock.');
  }

  if (category === 'medal' || id.startsWith('gem_')) {
    return implementedTarget('Medal/gem achievement state is scoped by studyTarget; level exam and lesson completion routes pass studyTarget before gem unlock.');
  }

  if (id.startsWith('exam_')) {
    return implementedTarget('Exam achievement state is scoped by studyTarget; Lingman and level exam routes pass studyTarget before exam unlock.');
  }

  if (id.startsWith('flashcards_')) {
    return implementedTarget('Flashcard achievement state and saved/flip/view/source evidence are scoped by studyTarget; flashcard collection, audio and save controls pass studyTarget before unlock.');
  }

  if (category === 'lessons' || id.startsWith('lesson_')) {
    return implementedTarget('Lesson achievement state is scoped by studyTarget; lesson completion, perfect-pass, pass-count, progress and marathon-day evidence use target-aware helpers before unlock.');
  }

  if (id.startsWith('combo_')) {
    return implementedTarget('Combo achievement state and best-count evidence are scoped by studyTarget; lesson runtime passes studyTarget before unlock.');
  }

  if (id.startsWith('recall_') || id.startsWith('trainer_')) {
    return implementedTarget('Trainer/recall achievement state and correct-count, streak and perfect-session evidence are scoped by studyTarget; trainer and SRS routes pass studyTarget before unlock.');
  }

  if (id.startsWith('daily_phrase')) {
    return implementedTarget('Daily phrase achievement state and read/save counters are scoped by studyTarget; read/save controls pass studyTarget before unlock.');
  }

  if (id === 'diagnosis') {
    return implementedTarget('Diagnosis achievement state is scoped by studyTarget; diagnostic completion passes studyTarget before unlock.');
  }

  if (
    id.startsWith('daily_task') ||
    id.startsWith('daily_all') ||
    id.startsWith('daily_no_reroll') ||
    id === 'all_daily'
  ) {
    return implementedTarget('Daily task achievement state and all-done/no-reroll streak evidence are scoped by studyTarget; daily task claim flow passes studyTarget before unlock.');
  }

  if (
    id.startsWith('pack_') ||
    id.startsWith('share_achievement')
  ) {
    return implementedTarget('Pack/share achievement state is scoped by studyTarget; pack acquisition and achievement share events pass studyTarget, and share counters use target-aware storage.');
  }

  if (
    id.startsWith('streak') ||
    id.startsWith('xp_') ||
    id.startsWith('weekly_xp') ||
    id === 'personal_best' ||
    id === 'level_50' ||
    id === 'perfect_week' ||
    id === 'perfect_month' ||
    id === 'night_owl' ||
    id === 'early_bird' ||
    id === 'night_week' ||
    id === 'early_week'
  ) {
    return mixed('Achievement is based on account XP/streak policy, but XP is currently generated by target-language learning activity.');
  }

  if (
    id.startsWith('login_') ||
    id === 'comeback' ||
    id.startsWith('arena_') ||
    id.startsWith('league_') ||
    id.startsWith('social_') ||
    id.startsWith('shards_') ||
    id.startsWith('energy_') ||
    id.startsWith('avatar_') ||
    id.startsWith('profile_') ||
    id.startsWith('wager_win')
  ) {
    return global('Achievement is account/product/social/economy/arena state rather than target-language learning content.');
  }

  return unknown('No taxonomy rule matched this achievement id.');
}

function extractAchievements(sourceText: string): AchievementEntry[] {
  const { body, bodyStart } = extractArrayBody(sourceText);
  const objects = splitObjectEntries(body, bodyStart);
  const entries: AchievementEntry[] = [];
  for (const object of objects) {
    const id = extractStringProperty(object.objectText, 'id');
    const category = extractStringProperty(object.objectText, 'category');
    if (!id || !category) continue;
    entries.push({
      id,
      category,
      line: lineNumber(sourceText, object.startIndex),
      ...classify(id, category),
    });
  }
  return entries.sort((a, b) => a.line - b.line || a.id.localeCompare(b.id));
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Achievement Taxonomy',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Total achievements: ${report.summary.total}`,
    `- Global: ${report.summary.global}`,
    `- Study target: ${report.summary.studyTarget}`,
    `- Mixed: ${report.summary.mixed}`,
    `- Unknown: ${report.summary.unknown}`,
    `- Blockers: ${report.summary.blockers}`,
    '',
    '## Categories',
    '',
  ];
  for (const [category, count] of Object.entries(report.summary.categories).sort()) {
    lines.push(`- \`${category}\`: ${count}`);
  }
  lines.push('', '## Blockers', '');
  const blockers = report.entries.filter((entry) => entry.risk === 'blocker');
  for (const entry of blockers.slice(0, 120)) {
    lines.push(`- \`${entry.id}\` (${entry.category}) -> \`${entry.scope}\` at app/achievements.ts:${entry.line}`);
    lines.push(`  Reason: ${entry.reason}`);
  }
  if (blockers.length === 0) lines.push('No blocker achievement entries found.');
  lines.push('', '## Notes', '');
  for (const note of report.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_achievement_taxonomy.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const sourceFile = path.join(repoRoot, 'app', 'achievements.ts');
  const sourceText = fs.readFileSync(sourceFile, 'utf8');
  const entries = extractAchievements(sourceText);
  const categories: Record<string, number> = {};
  for (const entry of entries) {
    categories[entry.category] = (categories[entry.category] ?? 0) + 1;
  }
  const blockers = entries.filter((entry) => entry.risk === 'blocker').length;
  const report: Report = {
    schemaVersion: 'gustav-achievement-taxonomy-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: entries.length === 0 ? 'BLOCK' : blockers > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    source: {
      file: 'app/achievements.ts',
      exportName: 'ALL_ACHIEVEMENTS',
    },
    summary: {
      total: entries.length,
      global: entries.filter((entry) => entry.scope === 'global').length,
      studyTarget: entries.filter((entry) => entry.scope === 'study_target').length,
      mixed: entries.filter((entry) => entry.scope === 'mixed').length,
      unknown: entries.filter((entry) => entry.scope === 'unknown').length,
      blockers,
      categories,
    },
    entries,
    notes: [
      'This taxonomy is generated from ALL_ACHIEVEMENTS in app/achievements.ts.',
      'Target and mixed achievements cannot remain in one flat achievements_state cloud payload.',
      'French generation remains blocked until achievement state is split or an explicit product policy is approved for mixed achievements.',
    ],
  };

  const jsonPath = path.join(runDir, 'audits', 'achievement_taxonomy.json');
  const mdPath = path.join(runDir, 'audits', 'achievement_taxonomy.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, renderMarkdown(report));
  console.log(`GUSTAV achievement taxonomy: ${report.status}`);
  console.log(`Achievements: ${entries.length}`);
  console.log(`Report: ${path.relative(repoRoot, mdPath)}`);
}

void main();
