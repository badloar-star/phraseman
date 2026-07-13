import fs from 'node:fs';
import path from 'node:path';

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('league club hub composition', () => {
  it('ships an accessible operational hero and quick stats', () => {
    const hero = read('components/league/LeagueClubHero.tsx');
    const stats = read('components/league/LeagueQuickStats.tsx');
    expect(hero).toContain('LeagueClubHeroModel');
    expect(hero).toContain('accessibilityRole="button"');
    expect(hero).toContain('accessibilityLabel');
    expect(hero).toContain('testID="league-club-hero-primary-action"');
    expect(hero).toContain('formatLeagueChatUnreadBadge');
    expect(stats).toContain('testID="league-quick-stats"');
    expect(stats).toContain("flexWrap: 'wrap'");
  });

  it('renders bounded activity and the team mission without live subscriptions', () => {
    const activity = read('components/league/LeagueActivityPreview.tsx');
    const mission = read('components/league/LeagueBonusMission.tsx');
    expect(activity).toContain('events.slice(0, 5)');
    expect(activity).toContain('testID="league-activity-preview"');
    expect(activity).not.toContain('subscribeLeagueChatMessages');
    expect(mission).toContain('testID="league-bonus-mission"');
    expect(mission).toContain('model.canClaim');
    expect(mission).toContain('accessibilityValue');
  });

  it('separates the top three and keeps participant profile actions', () => {
    const podium = read('components/league/LeaguePodium.tsx');
    const row = read('components/league/LeagueLeaderboardRow.tsx');
    expect(podium).toContain('orderedPodium.map');
    expect(podium).toContain('onOpenProfile');
    expect(podium).toContain('accessibilityLabel');
    expect(row).toContain('GroupMember');
    expect(row).toContain('onOpenProfile');
    expect(row).toContain('member.isMe');
  });

  it('keeps motion finite and bright surfaces readable', () => {
    const files = [
      'LeagueClubHero.tsx',
      'LeagueQuickStats.tsx',
      'LeagueActivityPreview.tsx',
      'LeagueBonusMission.tsx',
      'LeaguePodium.tsx',
      'LeagueLeaderboardRow.tsx',
    ].map((name) => read(`components/league/${name}`)).join('\n');
    expect(files).not.toContain('withRepeat(');
    expect(files).not.toContain('Animated.loop(');
    expect(files).not.toContain('setInterval(');
    expect(files).toContain('useReduceMotion');
    expect(files).toContain('accessibilityLabel');
    expect(files).toContain('accentText');
  });

  it('composes the hub from cached league state and virtualizes the member list', () => {
    const screen = read('app/club_screen.tsx');
    expect(screen).toContain('getCachedLeagueChatRoomSync');
    expect(screen).toContain('getCachedLeagueChatMessagesSync');
    expect(screen).toContain('buildLeagueActivityEvents');
    expect(screen).toContain('<LeagueClubHero');
    expect(screen).toContain('<LeagueActivityPreview');
    expect(screen).toContain('<LeagueBonusMission');
    expect(screen).toContain('<LeaguePodium');
    expect(screen).toContain('<Reanimated.FlatList');
    expect(screen).toContain('keyExtractor={leagueMemberKeyExtractor}');
    expect(screen).not.toContain('subscribeLeagueChatMessages');
  });
});
