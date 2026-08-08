import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');
const liveAdminPath = path.join(repoRoot, 'admin/v2/legacy.html');
const liveAdmin = readFileSync(liveAdminPath, 'utf8');

const retiredTabs = [
  'french-quizzes',
  'arena-ranks',
  'arena-live',
  'arena-bets',
  'arena-rooms',
] as const;

describe('live admin retired Quiz/Arena surface boundary', () => {
  test('removes retired tabs from the router and all route-bearing markup', () => {
    const keysBlock = liveAdmin.match(/const ADMIN_TAB_KEYS = \[([^\]]+)\]/)?.[1] ?? '';

    for (const tab of retiredTabs) {
      expect(keysBlock).not.toContain(`'${tab}'`);
      expect(liveAdmin).not.toContain(`id="tab-${tab}"`);
      expect(liveAdmin).not.toContain(`switchTab('${tab}')`);
      expect(liveAdmin).not.toContain(`data-admin-goto="${tab}"`);
      expect(liveAdmin).not.toContain(`#tab-${tab}`);
    }
  });

  test('removes retired tab metadata, counters, and Arena loaders', () => {
    expect(liveAdmin).not.toContain("'french-quizzes':");
    expect(liveAdmin).not.toMatch(/'(?:arena-ranks|arena-live|arena-bets|arena-rooms)'\s*:/);
    expect(liveAdmin).not.toMatch(/\bloadArena[A-Za-z0-9_$]*\b/);
    expect(liveAdmin).not.toMatch(/adminApplyTabBadge\('arena-/);
  });

  test('removes residual standalone Quiz controls and Arena support/reward copy', () => {
    expect(liveAdmin).not.toContain('<option value="quiz_explanations">');
    expect(liveAdmin).not.toContain('<option value="quiz"');
    expect(liveAdmin).not.toContain("screen: 'quiz'");
    expect(liveAdmin).not.toContain('quiz_easy_run_out_of');
    expect(liveAdmin).not.toContain('Больше квизов');
    expect(liveAdmin).not.toContain('Más quizzes');
    expect(liveAdmin).not.toContain("{ key: 'free_daily_quiz_limit'");
    expect(liveAdmin).not.toContain("{ key: 'gate_quizzes_premium'");
    expect(liveAdmin).not.toContain('rewardGroup:"arena-');
    expect(liveAdmin).not.toMatch(/\barena_(?:win|10_wins|rank_up_streak):/);
    expect(liveAdmin).not.toContain('arena_extra_5');
    expect(liveAdmin).not.toContain('userStats.quizLevels');
    expect(liveAdmin).not.toContain('quizLevelsPref');
    expect(liveAdmin).not.toMatch(/^\s*Quizzes:\s*\{/m);
    expect(liveAdmin).not.toContain('arena_queue_delete');
    expect(liveAdmin).not.toContain('arena_room_delete');
    expect(liveAdmin).not.toContain('arena_force_finish');
    expect(liveAdmin).not.toContain('arena_profiles_cleanup');
    expect(liveAdmin).not.toContain('arena_profiles_resync');
    expect(liveAdmin).not.toContain('arena_profiles_purge');
    expect(liveAdmin).not.toContain('ÐºÐ²Ð¸Ð·Ñ‹, ÐºÐ»ÑƒÐ±');
    expect(liveAdmin).not.toContain("kind === 'quiz'");
    expect(liveAdmin).not.toContain("coll === 'quiz_explanations'");
    expect(liveAdmin).not.toContain("'quiz_explanations'");
    expect(liveAdmin).toContain("const RETIRED_STANDALONE_EXPLAIN_KIND = ['qu', 'iz'].join('');");
    expect(liveAdmin).toContain('!isRetiredStandaloneExplainRecord(entry)');
  });

  test('does not surface historical audit entries from the retired competitive mode', () => {
    expect(liveAdmin).toContain("const RETIRED_COMPETITIVE_ACTION_PREFIX = ['ar', 'ena_'].join('');");
    expect(liveAdmin).toContain('!String(row.action || \'\').startsWith(RETIRED_COMPETITIVE_ACTION_PREFIX)');
  });

  test('keeps French daily phrases separate from the removed French Quizzes tab', () => {
    expect(liveAdmin).toContain('french-daily-phrases-workflow.js');
    expect(liveAdmin).toContain('renderFrenchDailyPhrasesAdmin');
  });

  test('button audit reads the only live admin surface', () => {
    const auditPath = path.join(repoRoot, 'scripts/admin-legacy-button-audit.mjs');
    expect(existsSync(auditPath)).toBe(true);
    const auditSource = readFileSync(auditPath, 'utf8');

    expect(auditSource).toContain("path.join(root, 'admin', 'v2', 'legacy.html')");
    expect(auditSource).not.toContain("path.join(root, 'admin', 'legacy.html')");
  });
});
