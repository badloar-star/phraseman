import fs from 'node:fs';
import path from 'node:path';

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('league club hub composition', () => {
  it('ships a compact club center with an explicit accessible chat action', () => {
    const hero = read('components/league/LeagueClubHero.tsx');
    const stats = read('components/league/LeagueQuickStats.tsx');
    expect(hero).toContain('LeagueClubHeroModel');
    expect(hero).toContain('accessibilityRole="button"');
    expect(hero).toContain('accessibilityLabel');
    expect(hero).toContain('testID="league-club-chat-action"');
    expect(hero).toContain('formatLeagueChatUnreadBadge');
    expect(hero).toContain('minHeight: 48');
    expect(stats).toContain('testID="league-quick-stats"');
    expect(stats).toContain("flexWrap: 'wrap'");
  });

  it('keeps one team mission without an activity preview', () => {
    const mission = read('components/league/LeagueBonusMission.tsx');
    expect(mission).toContain('testID="league-bonus-mission"');
    expect(mission).toContain('model.canClaim');
    expect(mission).toContain('accessibilityValue');
    expect(mission).toContain('onOpenBoostBuyer');
    expect(mission).toContain('onLikeBoost');
  });

  it('separates the top three and keeps participant profile actions', () => {
    const podium = read('components/league/LeaguePodium.tsx');
    const row = read('components/league/LeagueLeaderboardRow.tsx');
    expect(podium).toContain('orderedPodium.map');
    expect(podium).toContain('onOpenProfile');
    expect(podium).toContain('accessibilityLabel');
    expect(podium).not.toContain('firstPerson');
    expect(podium).not.toContain('firstAvatar');
    expect(row).toContain('GroupMember');
    expect(row).toContain('onOpenProfile');
    expect(row).toContain('member.isMe');
  });

  it('keeps motion finite and bright surfaces readable', () => {
    const files = [
      'LeagueClubHero.tsx',
      'LeagueQuickStats.tsx',
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
    expect(screen).toContain('leaguePublicName');
    expect(screen).toContain('<LeagueClubHero');
    expect(screen).toContain('<LeagueBonusMission');
    expect(screen).toContain('<LeaguePodium');
    expect(screen.indexOf('<LeaguePodium')).toBeLessThan(screen.indexOf('<LeagueClubHero'));
    expect(screen).not.toContain('<LeagueActivityPreview');
    expect(screen).not.toContain('leaguePreviewPanResponder');
    expect(screen).not.toContain('league-current-icon');
    expect(screen).toContain('<Reanimated.FlatList');
    expect(screen).toContain('keyExtractor={leagueMemberKeyExtractor}');
    expect(screen).not.toContain('subscribeLeagueChatMessages');
  });

  it('keeps promotion direction without the textual transition pill', () => {
    const row = read('components/league/LeagueLeaderboardRow.tsx');
    expect(row).toContain("'arrow-up'");
    expect(row).toContain("'arrow-down'");
    expect(row).not.toContain('promotionPill');
    expect(row).not.toContain('promotionText');
    expect(row).not.toContain("ru: 'Переход'");
  });

  it('routes league names through one presentation-only privacy helper', () => {
    const screen = read('app/club_screen.tsx');
    const row = read('components/league/LeagueLeaderboardRow.tsx');
    const mission = read('components/league/LeagueBonusMission.tsx');
    const chat = read('components/LeagueChatPanel.tsx');
    expect(screen).toContain('data={publicSortedGroup}');
    expect(screen).toContain('name: leaguePublicName(member.name');
    expect(row).toContain('const displayName = leaguePublicName');
    expect(mission).toContain('leaguePublicName(model.boost.buyerName');
    expect(chat).toContain('const displayAuthorName = leaguePublicName');
  });
});
