import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const RUNTIME_SOURCE_ROOTS = ['app', 'components', 'constants', 'hooks', 'lib', 'modules', 'config', 'store'] as const;
const LEGACY_RUNTIME_TOKENS = [
  'settings_testers',
  '_admin_settings_testers',
  'admin_review_test',
  'admin_premium_delivery_test',
  'admin_celebration_lab',
  'admin_speaking_lab',
  'admin_tasks_lab',
  'admin_referral_lab',
  'admin_sound_lab',
  'anim_demo_lab',
  'components/admin_panel',
] as const;

function collectRuntimeSourceFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectRuntimeSourceFiles(absolutePath);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [absolutePath] : [];
  });
}

function normalizeLegacyToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const retiredFiles = [
  'app/settings_testers.tsx',
  'app/_admin_settings_testers.tsx',
  'app/admin_review_test.tsx',
  'app/_admin_review_test.tsx',
  'app/admin_premium_delivery_test.tsx',
  'app/_admin_premium_delivery_test.tsx',
  'app/admin_celebration_lab.tsx',
  'app/_admin_celebration_lab.tsx',
  'app/admin_speaking_lab.tsx',
  'app/_admin_speaking_lab.tsx',
  'app/admin_tasks_lab.tsx',
  'app/_admin_tasks_lab.tsx',
  'app/admin_referral_lab.tsx',
  'app/_admin_referral_lab.tsx',
  'app/admin_sound_lab.tsx',
  'app/_admin_sound_lab.tsx',
  'app/anim_demo_lab.tsx',
  'app/_anim_demo_lab.tsx',
] as const;

const retiredOrphanFiles = [
  'app/vip_revoke_client.ts',
  'components/AccordionChevronIonicons.tsx',
  'components/CertificatePreviewAdminModal.tsx',
  'components/ConsentReverifyHost.tsx',
  'components/EnergyRefillShardModal.tsx',
  'components/EnvelopeFlightDemo.tsx',
  'components/LevelGiftArt.tsx',
  'components/RankChangeTestModal.tsx',
  'components/ReleaseWaveBonusModal.tsx',
  'components/ShardRewardModal.tsx',
  'components/UserWarningModal.tsx',
  'components/reward_v2/RewardStackV2.tsx',
] as const;

const retiredAdminOnlySymbols: Record<string, readonly string[]> = {
  'app/achievements.ts': ['unlockAllAchievements', 'devSeedAchievementsSmoke'],
  'app/active_recall.ts': ['seedAdminTestReviewSession', 'ADMIN_TEST_BENCH'],
  'app/activity_365_analytics.ts': ['devSeedActivity365Scenario'],
  'app/app_messages.ts': ['seedLocalVipSurveyTestMessage'],
  'app/daily_tasks.ts': ['DailyTaskAdminPack', 'seedDailyTasksAdminPack', 'dailyTasksAdminOverrideKey'],
  'app/intro_full_access.ts': ['resetIntroFullAccessForAdmin'],
  'app/leaderboard_stats.ts': ['injectMockLeaderboardStats', 'clearMockLeaderboardStats'],
  'app/lifetime_profile_stats.ts': ['devSeedLifetimeStatsScenario'],
  'app/platform_ui_preview.ts': ['setPlatformUiPreviewMode', 'usePlatformUiPreviewMode'],
  'app/premium_trial_eligibility.ts': ['resetTrialCooldownForTesting', 'getTrialStatusLineForTesters'],
  'app/services/league_chest_rewards.ts': ['revokeLeagueGoldThemeReward'],
  'app/survey_client.ts': ['adminWriteShardSurvey', 'TEST_SHARD_SURVEYS'],
  'app/trainer_store.ts': ['devSeedTrainerScenario', 'TrainerDevScenario'],
  'constants/avatars.ts': ['unlockAllFrames'],
  'components/SpeakingPanel.tsx': ['previewStatus', 'previewScore', 'previewHoldMode'],
};

describe('mobile dev admin panel retirement', () => {
  it('removes the Settings entry, root-stack registration and retired route constants', () => {
    const settings = read('app/(tabs)/settings.tsx');
    const layout = read('app/_layout.tsx');
    const devRoutes = read('constants/devRoutes.ts');

    expect(settings).not.toContain('SETTINGS_TESTERS_ROUTE');
    expect(settings).not.toContain('settings-open-testers');
    expect(layout).not.toContain('name="settings_testers"');
    expect(layout).not.toContain('SETTINGS_TESTERS_ROUTE_NAME');
    expect(devRoutes).not.toMatch(/SETTINGS_TESTERS|ADMIN_(?:REVIEW_TEST|PREMIUM_DELIVERY_TEST|CELEBRATION_LAB|SPEAKING_LAB|TASKS_LAB|REFERRAL_LAB|SOUND_LAB)/);
  });

  it('deletes every retired mobile route and the panel implementation', () => {
    for (const relativePath of retiredFiles) {
      expect(fs.existsSync(path.join(ROOT, relativePath))).toBe(false);
    }
    const adminPanelDir = path.join(ROOT, 'components', 'admin_panel');
    const remainingPanelFiles = fs.existsSync(adminPanelDir)
      ? fs.readdirSync(adminPanelDir, { recursive: true }).filter((entry) => {
          const absolutePath = path.join(adminPanelDir, String(entry));
          return fs.statSync(absolutePath).isFile();
        })
      : [];
    expect(remainingPanelFiles).toEqual([]);
    for (const relativePath of retiredOrphanFiles) {
      expect(fs.existsSync(path.join(ROOT, relativePath))).toBe(false);
    }
  });

  it('removes panel-only helpers from retained production modules', () => {
    for (const [relativePath, symbols] of Object.entries(retiredAdminOnlySymbols)) {
      const source = read(relativePath);
      for (const symbol of symbols) expect(source).not.toContain(symbol);
    }
  });

  it('blocks legacy panel routes, imports and component paths from returning to runtime source', () => {
    const runtimeFiles = RUNTIME_SOURCE_ROOTS.flatMap((sourceRoot) =>
      collectRuntimeSourceFiles(path.join(ROOT, sourceRoot)),
    );
    const violations: string[] = [];

    for (const absolutePath of runtimeFiles) {
      const relativePath = path.relative(ROOT, absolutePath).replaceAll(path.sep, '/').toLowerCase();
      const source = fs.readFileSync(absolutePath, 'utf8');
      const sourceLower = source.toLowerCase();
      const normalizedSource = normalizeLegacyToken(source);
      for (const token of LEGACY_RUNTIME_TOKENS) {
        const tokenLower = token.toLowerCase();
        if (
          relativePath.includes(tokenLower)
          || sourceLower.includes(tokenLower)
          || normalizedSource.includes(normalizeLegacyToken(token))
        ) {
          violations.push(`${relativePath}: ${token}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('retains independent dev surfaces', () => {
    const devRoutes = read('constants/devRoutes.ts');

    expect(devRoutes).toContain('POS_ANALYTICS_AUDIT_ROUTE_NAME');
    expect(devRoutes).toContain('FLASHCARDS_MARKET_DEV_ROUTE_NAME');
    expect(devRoutes).toContain('PERSONAL_PLAN_RUNTIME_DEV_ROUTE_NAME');
    expect(fs.existsSync(path.join(ROOT, 'app', 'pos_analytics_audit.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'app', 'flashcards_market_dev.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'app', 'personal_plan_runtime_dev.tsx'))).toBe(true);
  });
});
