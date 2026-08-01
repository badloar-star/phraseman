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

  it('keeps the arena scene and participant rows without the floating my-position overlay', () => {
    const screen = read('app/club_screen.tsx');
    const scene = read('components/league/LeagueArenaScene.tsx');
    const row = read('components/league/LeagueLeaderboardRow.tsx');
    expect(scene).toContain('testID="league-arena-scene"');
    expect(screen).not.toContain('LeagueMyPositionBar');
    expect(screen).not.toContain('league-my-position-bar');
    expect(row).toContain('GroupMember');
    expect(row).toContain('onOpenProfile');
    expect(row).toContain('member.isMe');
    expect(row).toContain('accessibilityLabel');
  });

  it('keeps motion finite and bright surfaces readable', () => {
    const files = [
      'LeagueQuickStats.tsx',
      'LeagueBonusMission.tsx',
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
    expect(screen).toContain('<LeagueArenaScene');
    expect(screen.indexOf('testID="league-xp-promotion-banner"')).toBeGreaterThan(-1);
    expect(screen.indexOf('testID="league-xp-promotion-banner"')).toBeLessThan(screen.indexOf('<LeagueArenaScene'));
    expect(screen).not.toContain('<LeagueActivityPreview');
    expect(screen).not.toContain('leaguePreviewPanResponder');
    expect(screen).not.toContain('league-current-icon');
    expect(screen).toContain('<Reanimated.FlatList');
    expect(screen).toContain('keyExtractor={leagueMemberKeyExtractor}');
  });

  it('shows active league identity in the header and arena art', () => {
    const screen = read('app/club_screen.tsx');
    const scene = read('components/league/LeagueArenaScene.tsx');

    expect(screen).toContain('{leagueNameForLang(myLeague, lang)}');
    expect(screen).not.toContain('Liga de la semana');
    expect(screen).toContain('leagueIcon={<LeagueIcon');
    expect(screen).toContain('league={myLeague}');
    expect(screen).toContain('alignContent={false}');
    expect(scene).toContain('leagueIcon: React.ReactNode');
    expect(scene).toContain('testID="league-arena-scene"');
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
    expect(screen).toContain('data={publicListGroup}');
    expect(screen).toContain('const publicListGroup = useMemo(() => publicSortedGroup, [publicSortedGroup]);');
    expect(screen).toContain('name: leaguePublicName(member.name');
    expect(row).toContain('const displayName = leaguePublicName');
    expect(mission).toContain('leaguePublicName(model.boost.buyerName');
  });

  it('keeps rank zones aligned when the participant list includes the podium', () => {
    const screen = read('app/club_screen.tsx');

    // The FlatList receives every member, including the first three already
    // shown in the arena. Its index is therefore the member's real rank index.
    // Adding the old podium offset falsely puts safe members into relegation.
    expect(screen).toContain('const publicListGroup = useMemo(() => publicSortedGroup, [publicSortedGroup]);');
    expect(screen).toContain('const absIndex = index;');
    expect(screen).not.toContain('const absIndex = index + 3;');
    expect(screen).toContain('const idx = myLeagueRank - 1;');
    expect(screen).not.toContain('const idx = myLeagueRank - 4;');
  });

  it('labels the repeated top-three rows as a full ranking rather than a second member list', () => {
    const screen = read('app/club_screen.tsx');

    expect(screen).toContain("ru: 'Полный рейтинг'");
    expect(screen).toContain("uk: 'Повний рейтинг'");
    expect(screen).not.toContain("ru: 'Участники клуба'");
  });
});
