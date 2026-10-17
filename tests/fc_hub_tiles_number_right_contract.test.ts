// зачем (R109, прямое слово владельца 17.10: «цифры будут СПРАВА от иконки, а не внизу»; эталон cards-section.shadow.html#hub):
// на плитках хаба Карточек число стоит в верхней строке справа от иконки (22/28, 700, tabular-nums), под ними только название;
// у «Из видео» слова «наборов» нет; при загрузке на месте числа «…».
import fs from 'fs';
import path from 'path';

const read = (rel: string): string => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

describe('хаб Карточек: число справа от иконки', () => {
  const view = read('app/flashcards/CardsHubV2.tsx');
  const screen = read('app/flashcards/FlashcardsHubScreen.tsx');

  it('верхняя строка: иконка и число в одной строке (row, space-between)', () => {
    expect(view).toMatch(/tileTop: \{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'/);
    const top = view.indexOf('<View style={styles.tileTop}>');
    const icon = view.indexOf('styles.tileIcon', top);
    const count = view.indexOf('styles.tileCount', top);
    const title = view.indexOf('styles.tileTitle', top);
    expect(top).toBeGreaterThan(-1);
    expect(icon).toBeGreaterThan(top);
    expect(count).toBeGreaterThan(icon);
    expect(title).toBeGreaterThan(count); // название — ниже строки с числом
  });

  it('число 22/28, 700, tabular-nums, цвет основного текста; «…» при загрузке', () => {
    expect(view).toMatch(/tileCount: \{[^}]*fontSize: 22, lineHeight: 28, fontWeight: '700'[^}]*fontVariant: \['tabular-nums'\]/);
    expect(view).toContain("{ color: g.text, lineHeight: lh(28) }");
    expect(view).toContain("{t.count === '' ? '…' : t.count}");
  });

  it('название 19/25, 700; строки с числом под названием больше нет', () => {
    expect(view).toMatch(/tileTitle: \{ fontSize: 19, lineHeight: 25, fontWeight: '700' \}/);
    expect(view).not.toContain("color: g.secondary, lineHeight: lh(19) }]} numberOfLines={fs > 1 ? undefined : 1}>{t.count");
  });

  it('«Из видео»: число без слова «наборов»', () => {
    expect(screen).toContain("title: copy.videoShort, count: fmt(videoPackCount)");
    expect(screen).not.toContain('fmtPacks');
  });
});
