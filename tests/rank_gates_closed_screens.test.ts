// Экран закрытого раздела по каждому разделу (макет Entry08; владелец 30.10): Видео, Диалоги, Пик, хаб Карточек → «Откроется с ранга N» + «К занятиям».
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('закрытые разделы показывают RankLockedSection', () => {
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
  it('экран закрытого раздела: заголовок «Откроется с ранга N» на 9 языках и кнопка «К занятиям»', () => {
    const src = read('components/home/v2/RankLockedSection.tsx');
    for (const lang of ['ru', 'uk', 'en', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl']) expect(src).toContain(`${lang}:`);
    expect(src).toContain("router.replace('/(tabs)/lessons'");
  });
  it('вторая кнопка «Открыть все с Plus» ведёт в существующий пейвол generic с источником rank_locked', () => {
    const src = read('components/home/v2/RankLockedSection.tsx');
    expect(src).toContain("openPremiumPaywall(router as never, { context: 'generic', source: 'rank_locked' })");
    expect(read('app/paywall_entry_contract.ts')).toContain("'rank_locked'");
  });
});
