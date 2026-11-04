// зачем (владелец: «вибрация только на управляющих кнопках, не на строках и плитках»; координатор 05.11, дизайн-аудит): открытие и долгое нажатие
// строки набора не вибрируют. Вибрация остаётся на кнопках: ▶ на кадре видео-карточки, пункты меню строки, «+» и лайк.
import * as fs from 'fs';
import * as path from 'path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('строки наборов не вибрируют', () => {
  it('PackRow.tsx (общая строка каталога) вообще не вызывает hapticTap', () => {
    expect(read('components/packs/PackRow.tsx')).not.toMatch(/hapticTap\(/);
  });
  it('VideoPackRow: открытие строки — без вибрации; единственная вибрация — ▶ на кадре карточки (после выхода plain)', () => {
    const src = read('app/flashcards/VideoPackRow.tsx');
    expect((src.match(/hapticTap\(\)/g) ?? []).length).toBe(1);
    const play = src.indexOf('hapticTap()');
    expect(src.lastIndexOf('if (plain) { onOpen(pack); return; }', play)).toBeGreaterThan(-1);
    expect(src).not.toMatch(/onOpen\(pack\)[^\n]*hapticTap|hapticTap[^\n]*onOpen\(pack\)/);
  });
  it('каталог сообщества: долгое нажатие по строке — без вибрации, меню остаётся', () => {
    const hub = read('app/flashcards/FlashcardsCategoryHub.tsx');
    const at = hub.indexOf('setMenuPack((cur) => (cur === pack.id ? null : pack.id)); // зачем (владелец): долгое нажатие по строке — без вибрации');
    expect(at).toBeGreaterThan(-1);
    expect(hub.slice(Math.max(0, at - 120), at)).not.toContain('hapticTap');
  });
  it('«Мои наборы»: вибрация только на круглой ▶ «Тренировать» (кнопка), не на строке', () => {
    const src = read('app/flashcards/MyPacksV2.tsx');
    expect((src.match(/hapticTap\(\)/g) ?? []).length).toBe(1);
    expect(src).toMatch(/PackDeckPlayButton[^\n]*hapticTap\(\)/);
  });
});
