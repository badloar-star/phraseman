import { tournamentBotCardInfo } from '../components/tournament/tournament_bot_card';
import { getLevelFromXP } from '../constants/theme';
import { isSyntheticUid } from '../app/synthetic_friend_requests';

describe('tournament bot profile card info (owner 2026-08-03)', () => {
  test('card level exactly matches the bot level avatar', () => {
    for (const avatar of ['1', '7', '19', '34', '50']) {
      const info = tournamentBotCardInfo({ uid: `p_${avatar}`, name: 'Бот', avatar });
      expect(getLevelFromXP(info.totalXp ?? 0)).toBe(Number(avatar));
      expect(info.points).toBe(info.totalXp);
    }
  });

  test('never exceeds level 50, even for legacy 51..60 avatars', () => {
    for (let index = 51; index <= 60; index += 1) {
      const info = tournamentBotCardInfo({ uid: `p_legacy_${index}`, name: 'Бот', avatar: String(index) });
      expect(getLevelFromXP(info.totalXp ?? 0)).toBeLessThanOrEqual(50);
    }
    const shop = tournamentBotCardInfo({
      uid: 'p_shop',
      name: 'Бот',
      avatar: 'custom:custom-gen-41:aurora:black',
    });
    const shopLevel = getLevelFromXP(shop.totalXp ?? 0);
    expect(shopLevel).toBeGreaterThanOrEqual(5);
    expect(shopLevel).toBeLessThanOrEqual(50);
  });

  test('is deterministic and plausible: same bot → same card, no network identity', () => {
    const first = tournamentBotCardInfo({ uid: 'p_abc123', name: 'quiet_hunter', avatar: '23', aura: 'aura-mint' });
    const second = tournamentBotCardInfo({ uid: 'p_abc123', name: 'quiet_hunter', avatar: '23', aura: 'aura-mint' });
    expect(second).toEqual(first);
    // зачем (владелец 2026-08-04, решение поменялось после этого теста): uid
    // бота теперь СОЗНАТЕЛЬНО есть в карточке — иначе не было бы кнопки
    // «в друзья» и бот отличался бы от живого игрока. От похода в
    // leaderboard/лайки защищает isSyntheticUid(), а не отсутствие uid.
    expect(first.uid).toBe('p_abc123');
    expect(isSyntheticUid(first.uid)).toBe(true);
    expect(first.friendUid).toBeUndefined();
    expect(first.isMe).toBe(false);
    expect(first.avatar).toBe('23');
    expect(first.aura).toBe('aura-mint');
    expect(first.streak).toBeGreaterThanOrEqual(0);
    expect(first.streak).toBeLessThanOrEqual(34);
    expect(first.leagueId).toBeGreaterThanOrEqual(0);
    expect(first.leagueId).toBeLessThanOrEqual(8);
  });

  test('league band grows with level: rookies are not in diamond', () => {
    for (let sample = 0; sample < 40; sample += 1) {
      const rookie = tournamentBotCardInfo({ uid: `p_rookie_${sample}`, name: 'Бот', avatar: '3' });
      expect(rookie.leagueId).toBeLessThanOrEqual(1);
      const veteran = tournamentBotCardInfo({ uid: `p_vet_${sample}`, name: 'Бот', avatar: '48' });
      expect(veteran.leagueId).toBeGreaterThanOrEqual(6);
    }
  });
});
