import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const retiredNames = [['ar', 'ena'].join(''), ['qu', 'iz'].join('')];
const allowedPersonalPlanQuizFiles = new Set([
  'app/personal_plan_quiz.tsx',
  'app/personal_plan_quizzes.ts',
  'app/personal_plan_quiz_mistake_adapter.ts',
  'app/personal_plan_quiz_runtime.ts',
  'app/personal_plan_quiz_session.ts',
  'app/personal_plan_quiz_types.ts',
]);
const exists = (relativePath: string): boolean => fs.existsSync(path.join(ROOT, relativePath));
const read = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const listFiles = (relativeRoot: string): string[] => {
  const absoluteRoot = path.join(ROOT, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const child = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(child);
      else files.push(path.relative(ROOT, child).replace(/\\/g, '/'));
    }
  };
  visit(absoluteRoot);
  return files;
};

describe('retired competitive mode full removal', () => {
  test('removes every owned runtime module and source artifact', () => {
    const ownedPathPattern = new RegExp(retiredNames.join('|'), 'i');
    const roots = ['app', 'components', 'constants', 'functions/src', 'functions/scripts', 'scripts', 'assets', 'asset_sources', 'SSIU', 'specs'];
    const retiredProductFiles = roots
      .flatMap(listFiles)
      .filter((file) => ownedPathPattern.test(file))
      .filter((file) => !file.includes('assets/images/personal_plan_tasks_fit/'))
      .filter((file) => !allowedPersonalPlanQuizFiles.has(file));
    expect(retiredProductFiles).toEqual([]);
  });

  test('removes owned runtime identifiers and reward/catalog seams', () => {
    const sources = [
      'app/_layout.tsx', 'app/(tabs)/home.tsx', 'app/achievements.ts', 'app/daily_tasks.ts',
      'app/daily_tasks_screen.tsx', 'app/feature_gates.ts', 'app/remote_flags.ts',
      'app/personal_plan_task_visuals.ts', 'app/trainer_phrases_session.tsx',
      'app/level_gift_system.ts', 'app/global_broadcast_modal.ts', 'modules/audio/sound_events.ts',
      'functions/src/index.ts', 'functions/src/community_packs.ts', 'functions/package.json',
    ].filter(exists).map(read).join('\n');
    for (const retiredName of retiredNames) {
      [
        `${retiredName}_extra_5`, `flashcards_${retiredName}`, `${retiredName}Quiz`,
        `${retiredName}Progress`, `${retiredName}_question_pool`, `/${retiredName}_`,
      ].forEach((token) => expect(sources).not.toContain(token));
    }
    for (const token of ['/quizzes', 'quiz_easy', 'gate_quizzes_premium', 'pm.arena.', 'quiz.webp']) {
      expect(sources).not.toContain(token);
    }
  });

  test('keeps historical sync cleanup keys without restoring an active product', () => {
    const cloudSync = read('app/cloud_sync.ts');
    const targetStorageKeys = read('app/target_storage_keys.ts');
    expect(cloudSync).toContain('retiredCompetitiveModeStorageKeysForWipe');
    expect(targetStorageKeys).toContain("'quiz_achievements'");
    expect(cloudSync).not.toContain("pathname: '/quizzes");
    expect(targetStorageKeys).not.toContain("pathname: '/quizzes");
  });

  test('removes retired daily-task and premium-gate contracts', () => {
    const dailyTasks = read('app/daily_tasks.ts');
    const featureGates = read('app/feature_gates.ts');
    const remoteFlags = read('app/remote_flags.ts');

    for (const type of ['quiz_easy', 'quiz_medium', 'quiz_hard', 'quiz_score', 'quiz_perfect', 'quiz_hard_perfect']) {
      expect(dailyTasks).not.toContain(`'${type}'`);
    }
    expect(featureGates).not.toContain("| 'quizzes'");
    expect(featureGates).not.toContain("quizzes: 'gate_quizzes_premium'");
    expect(remoteFlags).not.toContain("| 'free_daily_quiz_limit'");
    expect(remoteFlags).not.toContain("| 'gate_quizzes_premium'");
  });

  test('preserves tournaments as a separate product', () => {
    for (const file of ['app/tournament_round.tsx', 'app/tournament_results.tsx', 'functions/src/tournaments.ts']) {
      expect(exists(file)).toBe(true);
    }
    expect(read('app/tournament_round.tsx')).toContain('export default function');
    expect(read('functions/src/tournaments.ts')).toMatch(/export const tournament/);
  });

  test('keeps the league and generic completion copy independent from the retired product', () => {
    const activeLeagueSources = [
      read('app/club_screen.tsx'),
      read('app/completion/progress_completion_copy.ts'),
    ].join('\n');
    expect(activeLeagueSources).not.toMatch(/arenaClub|arenaChest|arenaNextStep/i);
  });

  test('removes retired backend product contracts while preserving required compatibility seams', () => {
    const backendProductSources = [
      'functions/src/openai_jobs_config.ts',
      'functions/src/ai_language_contract.ts',
      'functions/src/progress_events.ts',
      'functions/src/weekly_review.ts',
      'functions/src/vip_survey.ts',
      'functions/src/admin_translate.ts',
    ].map(read).join('\n');

    for (const token of [
      "| 'quiz'", "'quiz_answer'", 'quiz_answer:', 'quizzes7d', "'quizzes'",
      "job 'quiz'", 'arena7d',
    ]) {
      expect(backendProductSources).not.toContain(token);
    }

    const accountDelete = read('functions/src/account_delete.ts');
    expect(accountDelete).toContain("collection: 'arena_profiles'");
    expect(accountDelete).toContain('deleteArenaSessionsAndMatchHistory');

    const broadcast = read('functions/src/global_broadcast_claim.ts');
    expect(broadcast).not.toContain(`${retiredNames[0]}_extra_5`);
    expect(broadcast).not.toContain('legacyCompensation');
  });

  test('removes retired competitive fields from live weekly-review contracts', () => {
    const weeklyReviewSources = [
      'app/weekly_review_types.ts',
      'app/weekly_review_snapshot.ts',
      'app/weekly_review_briefing.ts',
    ].map(read).join('\n');

    expect(weeklyReviewSources).not.toMatch(/quizzes7d|arena7d/);
  });

  test('removes retired Quiz promises from Plus copy while preserving plan-only quizzes', () => {
    const langContext = read('components/LangContext.tsx');
    for (const staleCopy of [
      'Вызовы без дневного лимита', 'Квізи без денного ліміту',
      'Cuestionarios sin límite diario', 'Quizzes sem limite diário',
      'Quiz không giới hạn mỗi ngày', 'Kuis tanpa batas harian',
      'Günlük limitsiz quizler', 'Quizy bez dziennego limitu',
    ]) expect(langContext).not.toContain(staleCopy);
    const personalPlanSources = [
      'app/personal_plan_catalog.ts',
      'app/personal_plan_navigation.ts',
      'app/personal_plan_engine_contracts.ts',
      'app/personal_plan_quality.ts',
      'app/personal_plan_day_open_actions.ts',
      'app/personal_plan_attempt_event_adapter.ts',
    ].map(read).join('\n');
    expect(personalPlanSources).toContain('plan_quiz');
    expect(personalPlanSources).not.toContain("pathname: '/quizzes'");
    expect(read('app/_layout.tsx')).toContain('name="personal_plan_quiz"');
  });

  test('removes retired competitive products from live client state and user-visible copy', () => {
    const liveProductSources = [
      'app/notifications.ts',
      'app/paywall_personalization.ts',
      'app/user_stats.ts',
      'app/stats_daily_breakdown.ts',
      'app/progress_events_client.ts',
      'app/xp_manager.ts',
    ].map(read).join('\n');
    expect(liveProductSources).not.toMatch(/quiz_answer|trackQuizLevel|quizLevels:\s*\{|quizzes_completed|generic_quizhard|hardPaywallBlocks/i);
    expect(read('app/notifications.ts')).not.toMatch(/quizzes?|quizler|quizy|kuis|cuestionarios/i);

    const analytics = read('app/analytics.ts');
    expect(analytics).not.toContain("'quiz_start'");
    expect(analytics).not.toContain("'quiz_complete'");
    expect(analytics).not.toContain("context: 'quiz_limit'");

    const targetStorageKeys = read('app/target_storage_keys.ts');
    expect(targetStorageKeys).not.toMatch(/export function quiz(?:Nav|Lifetime|Achievement|Perfect)/);
    expect(targetStorageKeys).toContain('retiredCompetitiveModeStorageKeysForWipe');

    const cloudSync = read('app/cloud_sync.ts');
    expect(cloudSync).not.toMatch(/quiz(?:Nav|Lifetime|Achievement|Perfect)/);
    expect(cloudSync).not.toMatch(/achievement_quiz_total_count|quiz_hard_count|achievement_quiz_hard_perfect_count/);
    expect(cloudSync).toContain('retiredCompetitiveModeStorageKeysForWipe');
  });

  test('removes retired Quiz from Plus surveys in every locale', () => {
    const survey = read('app/vip_survey_content.ts');
    expect(survey).not.toMatch(/\bquizzes\s*:/);
    expect(survey).not.toContain("id: 'quizzes'");
    expect(survey).not.toMatch(/Вызовы|Виклики|Retos|Desafios|Thử thách|Tantangan|Görevler|Wyzwania/);

    const liveAdmin = read('admin/v2/legacy.html');
    expect(liveAdmin).not.toMatch(/options:\s*\{[^}]*quizzes:\s*'Квизы'/);
  });

  test('removes retired factory fixtures and admin/developer entry points', () => {
    const retiredProductToken = new RegExp(retiredNames.join('|'), 'i');
    for (const fixture of [
      'functions/src/content_factory/fixtures/r7/legacy_job_release.json',
      'functions/src/content_factory/fixtures/r7/v3_staged_release.json',
    ]) {
      expect(read(fixture)).not.toMatch(retiredProductToken);
    }

    expect(fs.existsSync(path.join(ROOT, 'admin/v2/index.html'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'admin/v2/scripts/admin-capabilities.js'))).toBe(false);

    const scripts = JSON.parse(read('package.json')).scripts as Record<string, string>;
    expect(Object.keys(scripts).filter((key) => retiredProductToken.test(key))).toEqual([]);
    expect(Object.values(scripts).filter((command) => retiredProductToken.test(command))).toEqual([]);
  });

  test('keeps only non-product website lead quiz semantics', () => {
    const siteStats = read('functions/src/site_stats.ts');
    const checkout = read('functions/src/web_checkout.ts');
    const leads = read('functions/src/web_leads.ts');

    expect(siteStats).toContain("quiz_start: 'quiz_starts'");
    expect(siteStats).toContain('Воронка /start/');
    expect(checkout).toContain('quizAnswers: input.answers');
    expect(leads).toContain("provider: 'quiz_lead'");
  });

  test('removes retired product promises from the current marketing brief', () => {
    const brief = read('docs/AI_MARKETING_BRIEF.md');
    expect(brief).not.toMatch(/\bArena\b|арена/i);
    expect(brief).not.toMatch(/дополнительн\w*\s+квиз/i);
  });
});
