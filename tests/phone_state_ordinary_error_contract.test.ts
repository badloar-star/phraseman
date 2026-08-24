import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const source = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('ordinary PhoneState failures stay out of user flows', () => {
  test('ordinary startup and language selection contain no network-save message', () => {
    expect(source('app/_layout.tsx')).not.toContain('Облако сейчас недоступно');
    expect(source('app/language_welcome.tsx')).not.toContain('Проверь соединение');
    expect(source('app/language_welcome.tsx')).toContain('commitPhoneStateDurableAction');
  });

  test('friend gift intent is durable before connectivity can matter', () => {
    const friends = source('app/(tabs)/friends.tsx');
    expect(friends).not.toContain("getNetStatus() === 'offline'");
    expect(friends).toContain('enqueueFriendGiftSend');
  });

  test('persisted flashcards remain visible when background refresh fails', () => {
    const collection = source('app/flashcards/useCollectionData.ts');
    expect(collection).not.toContain('Не удалось загрузить карточки.');
    expect(collection).not.toContain('setOwnedPackIdList([]);\n      setCommunityOwnedIdList([]);');
  });

  test('successful local season reward is not reverted by background bookkeeping', () => {
    const modal = source('components/SeasonGiftModal.tsx');
    expect(modal).toContain('void markSeasonPassGiftUsed(giftId).catch(() => {})');
  });

  test('account-boundary warning says phone data is durable and cloud is pending', () => {
    const logout = source('components/account/AccountLogoutFlow.tsx');
    expect(logout).toContain('На телефоне всё сохранено');
    expect(logout).not.toContain('Прогресс не сохранён');
  });
});
