import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');
const read = (relative: string) => readFileSync(join(root, relative), 'utf8');

describe('tournaments owner lock', () => {
  test('cannot be enabled by build type, Remote Config, env or admin schedule', () => {
    const clientGate = read('app/config.ts');
    const serverGate = read('functions/src/tournament_release_gate.ts');

    expect(clientGate).toContain('export const ENABLE_TOURNAMENTS: false = false;');
    expect(serverGate).toContain('export const TOURNAMENTS_RELEASED = false as const;');
    expect(serverGate).toContain("'tournaments_disabled_by_owner'");
    expect(serverGate).not.toMatch(/process\.env|remote_config|tournamentSchedule/);
  });

  test('has no tab, swipe page, dev button or unprotected standalone route', () => {
    const tabs = read('app/(tabs)/_layout.tsx');
    const pages = read('app/tab_page_model.ts');
    const rootLayout = read('app/_layout.tsx');

    expect(tabs).not.toContain("require('./tournaments')");
    expect(tabs).not.toMatch(/key:\s*'tournaments'/);
    expect(pages).toContain("['home', 'lessons', 'friends', 'settings'] as const");
    expect(rootLayout).toContain('<Stack.Protected guard={ENABLE_TOURNAMENTS}>');
    expect(existsSync(join(root, 'components/HomeDevTournamentsButton.tsx'))).toBe(false);
  });

  test('blocks client calls, server mutations, background workers and pushes', () => {
    const client = read('app/tournament_client.ts');
    const runtime = read('functions/src/tournaments.ts');
    const push = read('functions/src/tournament_start_push.ts');
    const weekly = read('functions/src/tournament_weekly_payout.ts');
    const seasonPassServer = read('functions/src/season_pass.ts');
    const collectibles = read('functions/src/collectibles.ts');

    expect(client).toContain("throw new Error('tournaments_disabled_by_owner')");
    for (const callable of [
      'tournamentJoin',
      'tournamentLeave',
      'tournamentForfeit',
      'tournamentSubmitSpeedMatchAttempt',
      'tournamentSubmitTaskAnswer',
      'tournamentSubmitAnswers',
      'tournamentFinalize',
      'tournamentAdvanceRound',
      'tournamentClaimReward',
      'tournamentStartNow',
      'tournamentRoundReview',
    ]) {
      const start = runtime.indexOf(`export const ${callable} =`);
      const nextExport = runtime.indexOf('\nexport const ', start + 1);
      const handler = runtime.slice(start, nextExport < 0 ? runtime.length : nextExport);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(handler).toContain('assertTournamentsReleased();');
    }
    expect(runtime.match(/if \(!TOURNAMENTS_RELEASED\) return;/g)?.length).toBeGreaterThanOrEqual(3);
    expect(runtime).not.toMatch(/minInstances:\s*1/);
    expect(runtime).toContain('minInstances: TOURNAMENTS_RELEASED ? 1 : 0');
    expect(push).toContain('TOURNAMENT_START_PUSH_ENABLED = TOURNAMENTS_RELEASED');
    expect(weekly).toContain('if (!TOURNAMENTS_RELEASED) return;');
    expect(weekly).not.toContain('buildUserNotification');
    expect(weekly).not.toContain("nav: { kind: 'tournament_season' }");
    expect(seasonPassServer).toContain("if (kind === 'tournament_ticket') assertTournamentsReleased();");
    expect(collectibles).toContain("if (eventIdRaw.startsWith('tournament:')) assertTournamentsReleased();");
  });

  test('makes old notifications inert and removes tournament tickets from the active track', () => {
    const notifications = read('app/notifications.ts');
    const notificationCase = notifications.slice(
      notifications.indexOf("case 'tournament_starting':"),
      notifications.indexOf('default:', notifications.indexOf("case 'tournament_starting':")),
    );
    const center = read('app/user_notifications.ts');
    const track = read('app/season_pass_track_config.ts');
    const inventory = read('app/season_pass_gift_inventory.ts');
    const rewardApply = read('app/season_reward_apply.ts');
    const releaseNotes = read('components/release_notes_copy.ts');

    expect(notificationCase).not.toContain('navTabHome();');
    expect(notificationCase).not.toContain('router.');
    expect(center).toContain('VISIBLE_USER_NOTIFICATION_TYPES.has');
    expect(track).not.toMatch(/N\([^\n]+tournament_ticket/);
    expect(track).toContain('N(17, undefined,                          P(5))');
    expect(track).toContain('N(37, undefined,                          P(5))');
    expect(track).toContain('N(53, undefined,                          P(5))');
    expect(inventory).toContain("kind: 'pearls', amount: RETIRED_TOURNAMENT_TICKET_PEARLS");
    expect(rewardApply).toContain("return applySeasonRewardLocal({ kind: 'pearls', amount: 5 }, idempotencyKey);");
    expect(releaseNotes).toContain('RETIRED_TOURNAMENT_COPY_RE');
    expect(releaseNotes).toContain('if (ENABLE_TOURNAMENTS) return selected;');
  });
});
