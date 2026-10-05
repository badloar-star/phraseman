import fs from 'fs';
import path from 'path';
import { normalizeEol } from './helpers/read_source';

const root = path.resolve(__dirname, '..');
const source = (relativePath: string) => normalizeEol(fs.readFileSync(path.join(root, relativePath), 'utf8'));

describe('ordinary PhoneState failures stay out of user flows', () => {
  test('ordinary startup and language selection contain no network-save message', () => {
    expect(source('app/_layout.tsx')).not.toContain('Облако сейчас недоступно');
    expect(source('app/language_welcome.tsx')).not.toContain('Проверь соединение');
    expect(source('app/language_welcome.tsx')).toContain('commitPhoneStateDurableAction');
  });

  test('retired friend gift intent no longer runs from the friends screen', () => {
    const friends = source('app/(tabs)/friends.tsx');
    expect(friends).not.toContain('enqueueFriendGiftSend');
  });

  test('persisted flashcards remain visible when background refresh fails', () => {
    const collection = source('app/flashcards/useCollectionData.ts');
    expect(collection).not.toContain('Не удалось загрузить карточки.');
    expect(collection).not.toContain('setOwnedPackIdList([]);\n      setCommunityOwnedIdList([]);');
  });

});
