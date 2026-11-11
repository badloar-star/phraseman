import fs from 'node:fs';
import path from 'node:path';

// зачем (координатор 18.10): внутренняя вкладка «Главная» путалась с главной вкладкой приложения и стала «Новое».
// Владелец 11.11 («да, перестраивай»): вкладок в разделе больше нет — над лентой ряд положений; первое называется «Все».
// Сторож держит то же правило для нового ряда: первое положение не «Главная/Home» и переведено на все 9 языков.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('ряд положений раздела «Видео»', () => {
  const chips = read('components/video/VideoFeedFilter.tsx');
  const rows = chips.split('\n').filter((l) => l.includes('all: ') && l.includes('playlists: '));

  it('первое положение — «Все» на всех 9 языках, без «Главная/Home»', () => {
    expect(rows).toHaveLength(9);
    const all = rows.join('\n');
    for (const word of ["ru: { all: 'Все'", "uk: { all: 'Усі'", "en: { all: 'All'", "es: { all: 'Todos'", "'pt-BR': { all: 'Todos'", "vi: { all: 'Tất cả'", "id: { all: 'Semua'", "tr: { all: 'Tümü'", "pl: { all: 'Wszystkie'"]) expect(all).toContain(word);
    expect(all).not.toContain('Главная');
    expect(all).not.toContain("'Home'");
  });

  it('у каждого языка подписаны все четыре положения', () => {
    for (const row of rows) for (const key of ['all: ', 'unwatched: ', 'favorites: ', 'playlists: ']) expect(row).toContain(key);
  });
});
