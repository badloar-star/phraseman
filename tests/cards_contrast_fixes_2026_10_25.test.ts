// зачем (Темы 25.10, docs/work/cards-dialogs-contrast-2026-10-25.md; координатор): две правки контраста Карточек по замеру 174 сочетаний тем.
// 1) свайп «удалить»: фон dangerFill, значок и подпись dangerInk (было постоянный LV2_BAD + белый = 2,77 во всех темах);
// 2) видео-наборы: сильный скрим темы под значком, длительностью и дорожкой (было mediaScrim + белый = 3,36 на светлом кадре).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Карточки: контраст по замеру Тем', () => {
  it('свайп «удалить» — пара темы dangerFill/dangerInk, без постоянного красного и белого', () => {
    const src = read('app/flashcards/CollectionListView.tsx');
    expect(src).toContain('backgroundColor: g.dangerFill,');
    expect(src).toContain('<Ionicons name="trash-outline" size={24} color={g.dangerInk} />');
    expect(src).toContain("<Text style={{ color: g.dangerInk, fontSize: f.caption, fontWeight: '700', marginTop: 4 }}>");
    expect(src).not.toContain('LV2_BAD');
  });

  it('видео-набор (экран): play, длительность и дорожка прогресса на scrimStrong', () => {
    const src = read('app/flashcards/VideoSetView.tsx').replace(/^\s*\/\/.*$/gm, '');
    expect(src.match(/backgroundColor: g\.scrimStrong/g)?.length).toBe(3);
    expect(src).not.toContain('g.mediaScrim');
  });

  it('видео-набор (строка): дорожка largeProgress на scrimStrong', () => {
    const src = read('app/flashcards/VideoPackRow.tsx');
    expect(src).toContain('{ backgroundColor: g.scrimStrong }]} pointerEvents="none">');
    expect(src).not.toContain('g.mediaScrim');
  });
});
