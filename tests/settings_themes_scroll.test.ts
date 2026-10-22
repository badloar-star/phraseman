// зачем (6 · СВЕРКА §44 через координатора): выбранная тема не должна оставаться за краем экрана при открытии списка тем — «Ирис» видно сразу.
// Проверяем чистую функцию смещения: выбранная строка целиком в видимой области для любой строки и любой высоты экрана, прокрутка не уходит за конец
// и не нужна, если строка и так видна.
import { selectedRowScrollY } from '../app/settings_themes_scroll';

const ROW = 58;
const HEAD = 230; // заголовок + ползунок над первой карточкой
const COUNTS = { main: 13, gradient: 10 } as const;

function geometry(card: 'main' | 'gradient') {
  const mainH = COUNTS.main * ROW;
  const cardY = card === 'main' ? HEAD : HEAD + mainH + 14;
  const rowCount = COUNTS[card];
  const contentHeight = HEAD + mainH + 14 + COUNTS.gradient * ROW + 24;
  return { cardY, cardHeight: rowCount * ROW, rowCount, contentHeight };
}

describe('selectedRowScrollY', () => {
  it('выбранная строка целиком видна для любой строки обеих карточек и экранов 560–900', () => {
    const bad: string[] = [];
    for (const viewportHeight of [560, 640, 720, 800, 900]) {
      for (const card of ['main', 'gradient'] as const) {
        const g = geometry(card);
        for (let rowIndex = 0; rowIndex < g.rowCount; rowIndex += 1) {
          const y = selectedRowScrollY({ ...g, rowIndex, viewportHeight });
          const top = g.cardY + ROW * rowIndex;
          if (top < y || top + ROW > y + viewportHeight) bad.push(`${card}#${rowIndex} vp${viewportHeight}: y=${y} строка ${top}–${top + ROW}`);
          if (y < 0 || y > Math.max(0, g.contentHeight - viewportHeight)) bad.push(`${card}#${rowIndex} vp${viewportHeight}: y=${y} вне [0, конец]`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('строка, которая и так видна, не прокручивает список', () => {
    const g = geometry('main');
    expect(selectedRowScrollY({ ...g, rowIndex: 0, viewportHeight: 800 })).toBe(0);
  });

  it('«Ирис»-подобный случай: строка за краем — список прокручивается вниз', () => {
    const g = geometry('gradient');
    expect(selectedRowScrollY({ ...g, rowIndex: 3, viewportHeight: 700 })).toBeGreaterThan(0);
  });

  it('неизвестные размеры и неверный индекс — без прокрутки', () => {
    const g = geometry('main');
    expect(selectedRowScrollY({ ...g, rowIndex: -1, viewportHeight: 700 })).toBe(0);
    expect(selectedRowScrollY({ ...g, rowIndex: 99, viewportHeight: 700 })).toBe(0);
    expect(selectedRowScrollY({ ...g, rowIndex: 2, viewportHeight: 0 })).toBe(0);
  });
});
