// Экран закрытого раздела по каждому разделу (макет Entry08; владелец 30.10): Видео, Диалоги, Пик, хаб Карточек → «Откроется с ранга N» + «К занятиям».
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('закрытые разделы подключают RankLockedSection (тихий возврат на Главную)', () => {
  it.each([
    ['Видео', 'app/(tabs)/video.tsx', "surface=\"video\""],
    ['Диалоги', 'app/ai_dialog_home.tsx', "surface=\"dialogues\""],
    ['Хаб Карточек', 'app/flashcards/FlashcardsHubScreen.tsx', "surface=\"cards_hub\""],
    ['Пик (ссылка ?section=spire)', 'app/(tabs)/community.tsx', "surface=\"peak\""],
  ])('%s', (_name, file, marker) => {
    const src = read(file);
    expect(src).toContain('RankLockedSection');
    expect(src).toContain(marker);
  });
  it('в сегментах «Сообщества» Пик скрыт при закрытии, но ссылка не откатывается молча', () => {
    const src = read('app/(tabs)/community.tsx');
    expect(src).toContain('spireVisible && !peakLocked');
    expect(src).toContain("peakAccess.status === 'locked'");
  });
  // зачем (СЛОВО ВЛАДЕЛЬЦА 05.11): экран-заглушка «Откроется с ранга N» убран — закрытый маршрут тихо возвращает на Главную (сторож — owner_locks_closed_sections_absent_2026_11_05)
  it('закрытый маршрут ничего не рисует и тихо возвращает на Главную с логом [RANK-GATE] closed_route_redirect', () => {
    const src = read('components/home/v2/RankLockedSection.tsx');
    expect(src).toContain("router.replace('/(tabs)/home' as never)");
    expect(src).toContain('[RANK-GATE] closed_route_redirect');
    expect(src).toContain('return null;');
  });
});
