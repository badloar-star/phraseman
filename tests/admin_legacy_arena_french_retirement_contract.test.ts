import fs from 'node:fs';
import path from 'node:path';

const legacy = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'legacy.html'), 'utf8');

function block(startMarker: string, endMarker: string): string {
  const start = legacy.indexOf(startMarker);
  const end = legacy.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return legacy.slice(start, end);
}

describe('Legacy admin French and Arena retirement', () => {
  test('keeps French Daily Phrases separate from the retired French Quizzes surface', () => {
    expect(legacy).not.toContain("'french-quizzes'");
    expect(legacy).toContain('data-gustav-admin-surface="french-daily-phrases"');
    expect(legacy).toContain('french-daily-phrases-workflow.js');
    expect(legacy).toContain('french-daily-phrases-admin.js');
    expect(legacy).toContain('renderFrenchDailyPhrasesAdmin');
    expect(legacy).toContain('frenchDailyPhraseAdminCreateDraft');
    expect(legacy).toContain('window.loadDailyPhrases = async function loadDailyPhrases(force)');
  });

  test('removes active Arena controls, options, navigation, and metrics', () => {
    const forbidden = [
      'data-admin-group="arena"',
      "arena: 'Arena'",
      "clubs: 'arena'",
      "tournaments: 'arena'",
      'arena_results_review',
      'open_lessons, open_arena',
      'arena_bots_enabled',
      'arena_daily_max',
      'arena_shard_refill_cost',
      'arena_shard_refill_slots',
      'arena_sr_win',
      'arena_sr_loss',
      'arena_sr_bot_win',
      'arena_season_rollback_steps',
      'gate_arena_premium',
      'arenaXpThresholds',
      '🏟 Arena · Top',
      '⚔️ Arena · Live',
      '🎯 Apuestas Arena',
      'Fuente: arena_profiles',
      'Fuente: arena_rooms_live',
      '⚔️ Арена — ранговое распределение',
      '🏆 Топ-10 игроков Арены',
      'Жалобы пользователей друг на друга (в арене,',
      '// ── ARENA RANKS',
      '// ── ARENA LIVE TAB',
    ];
    for (const value of forbidden) expect(legacy).not.toContain(value);

    const auditFilter = block('<select id="audit-filter-action"', '</select>');
    expect(auditFilter).not.toContain('arena_');
  });

  test('retains only the named historical and compatibility seams', () => {
    expect(legacy).toContain('rewardGroup:"arena-queue-decommissioned"');
    expect(legacy).toContain("arena_queue_delete: '🗑 Удаление из очереди'");
    expect(legacy).toContain("arena_queue_delete:'#fb923c'");
    expect(legacy).toContain("arena_win: '⚔️ Победа в Арене'");
    expect(legacy).toContain('(arena_extra_5 снят вместе с Ареной');
  });
});
