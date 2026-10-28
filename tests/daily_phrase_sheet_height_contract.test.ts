// зачем (жалоба пользователя Android 28.10, через координатора): в шторке «Фраза дня» из 4 вариантов ответа были видны 2.
// Потолок высоты — от высоты окна минус верхняя безопасная зона, а не жёсткие 86 %; внутри листа прокрутка, текст переносится.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'DailyPhraseCard.tsx'), 'utf8');

describe('шторка «Фраза дня»: все варианты помещаются или прокручиваются', () => {
  it('потолок высоты считается от окна и верхней безопасной зоны, жёсткого 86 % нет', () => {
    expect(src).toContain('useWindowDimensions');
    expect(src).toContain('const sheetMaxHeight');
    expect(src).toContain('windowHeight - insets.top');
    expect(src).toContain('maxHeight: sheetMaxHeight');
    expect(src).not.toContain("maxHeight: '86%'");
  });

  it('содержимое прокручивается внутри листа, нижний отступ учитывает системную полосу', () => {
    expect(src).toContain('style={styles.sheetScroll}');
    expect(src).toMatch(/sheetScroll: \{\s*flexShrink: 1,/);
    expect(src).toContain('paddingBottom: 16 + sheetBottomInset');
  });

  it('текст вариантов переносится, а не ужимается', () => {
    expect(src).not.toContain('adjustsFontSizeToFit');
    expect(src).toMatch(/questOptionText: \{\s*flex: 1,/);
  });
});
