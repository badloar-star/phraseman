// зачем (владелец 22.10): «Убрать золотое имя у друзей» — Plus у друга теперь показывает кольцо у аватара, а имя обычного цвета.
// Золотое имя (PremiumGoldUserName) было только в карточках поиска и заявок друзей; сторож не даёт ему вернуться в списки друзей.
import { readSource } from './helpers/read_source';

describe('друзья: имя без золота', () => {
  it.each(['components/friends/FriendsFoundCard.tsx', 'components/friends/FriendsRequestCard.tsx', 'components/friends_together/FriendListRow.tsx'])(
    '%s не использует PremiumGoldUserName',
    (file) => {
      const code = readSource(file).split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('{/*')).join('\n');
      expect(code).not.toContain('PremiumGoldUserName');
    },
  );

  it('имя в карточках — обычный цвет темы, а Plus виден кольцом', () => {
    const found = readSource('components/friends/FriendsFoundCard.tsx');
    const request = readSource('components/friends/FriendsRequestCard.tsx');
    expect(found).toContain('testID="friends-found-name"');
    expect(request).toContain('testID="friends-request-name"');
    expect(found).toContain('plus={isPlusProfile(profile)}');
    expect(request).toContain('plus={isPlusProfile(profile)}');
  });
});
