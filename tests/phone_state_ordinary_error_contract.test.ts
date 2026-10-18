import fs from 'fs';
import path from 'path';
import { normalizeEol } from './helpers/read_source';

const root = path.resolve(__dirname, '..');
const source = (relativePath: string) => normalizeEol(fs.readFileSync(path.join(root, relativePath), 'utf8'));

describe('ordinary PhoneState failures stay out of user flows', () => {
  test('ordinary startup and language selection contain no network-save message', () => {
    // зачем (10.10): обычный старт молчит; единственное исключение — тост после ПРОВАЛЕННОГО восстановления
    // на переустановке (821f49048, 01.10: без него человек видел пустой прогресс без единого слова).
    // зачем (правило владельца 18.10, матрица Сайта A12): тост «Облако сейчас недоступно» отменён — ветка cloud_unavailable_toast запускает тихий повтор
    // (app/startup_restore_retry.ts); человеку — только строка «нет интернета», когда сети действительно нет.
    const layout = source('app/_layout.tsx');
    const branchAt = layout.indexOf("recoveryPresentation === 'cloud_unavailable_toast'");
    expect(layout).not.toContain('Облако сейчас недоступно');
    expect(branchAt).toBeGreaterThan(-1);
    expect(layout.slice(branchAt, branchAt + 900)).toContain('scheduleSilentStartupRestore(');
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
