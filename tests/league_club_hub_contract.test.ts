import fs from 'node:fs';
import path from 'node:path';

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('league club hub composition', () => {
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
    expect(screen).toContain('<LeagueBonusMission');
    expect(screen).toContain('<LeaguePodium');
    expect(screen.indexOf('testID="league-xp-promotion-banner"')).toBeGreaterThan(-1);
    expect(screen.indexOf('testID="league-xp-promotion-banner"')).toBeLessThan(screen.indexOf('<LeaguePodium'));
    expect(screen).not.toContain('<LeagueActivityPreview');
    expect(screen).not.toContain('leaguePreviewPanResponder');
    expect(screen).not.toContain('league-current-icon');
    expect(screen).toContain('<Reanimated.FlatList');
    expect(screen).toContain('keyExtractor={leagueMemberKeyExtractor}');
  });

  it('shows active league identity in the header and podium art', () => {
    const screen = read('app/club_screen.tsx');
    const podium = read('components/league/LeaguePodium.tsx');

    expect(screen).toContain('{leagueNameForLang(myLeague, lang)}');
    expect(screen).not.toContain('Liga de la semana');
    expect(screen).toContain('leagueIcon={<LeagueIcon');
    expect(screen).toContain('league={myLeague}');
    expect(screen).toContain('alignContent={false}');
    expect(podium).toContain('leagueIcon: React.ReactNode');
    expect(podium).toContain('testID="league-current-heraldry"');
    expect(podium).not.toContain('<Ionicons name="trophy" size={24}');
    expect(podium).toContain('<Ionicons name="trophy" size={12}');
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
    expect(screen).toContain('data={publicSortedGroup}');
    expect(screen).toContain('name: leaguePublicName(member.name');
    expect(row).toContain('const displayName = leaguePublicName');
    expect(mission).toContain('leaguePublicName(model.boost.buyerName');
  });
});
