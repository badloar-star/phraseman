// зачем (владелец 12.10, стиль «Тень»: контейнеры без обводок; сверка снимков 6b3890202): у нижней капсулы, колокольчика и карточки «Фраза дня» Главной нет рамок —
// их отделяют тон фона и тень. Убирая borderColor, убирали и borderWidth.
import { readFileSync } from 'fs';
import { join } from 'path';

const read = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8').replace(/\r\n/g, '\n');

function styleBlock(src: string, name: string): string {
  const start = src.indexOf(`  ${name}: {`);
  expect(start).toBeGreaterThan(-1);
  return src.slice(start, src.indexOf('\n  },', start) + 5);
}

describe('Главная: обводки сняты', () => {
  it('таб-бар: нет SVG-ободка, второй кромки и рамки активной вкладки', () => {
    const src = read('components', 'v2', 'V2TabBar.tsx');
    expect(src).not.toMatch(/v2TabRim|v2TabCapRim|BarRim|innerRim/);
    expect(src).not.toMatch(/stroke="url\(#/);
    expect(src).not.toMatch(/borderColor: 'rgba\(255,255,255,0\.045\)'/);
  });

  it('колокольчик: у кнопки нет borderWidth и borderColor, отделение — малая тень', () => {
    const src = read('components', 'NotificationCenterButton.tsx');
    expect(styleBlock(src, 'headerButton')).not.toMatch(/borderWidth|borderColor/);
    const usage = src.slice(src.indexOf('contentStyle={[styles.headerButton'), src.indexOf('contentStyle={[styles.headerButton') + 260);
    expect(usage).not.toMatch(/borderColor|stroke/);
    expect(usage).toMatch(/nestedBoxShadow\(shadowGlass\)/);
  });

  // зачем (владелец через координатора 18.10): на карточке «Фраза дня» круглых кнопок (звезда, «Озвучить») больше нет — проверяем, что рамки у карточки нет и кнопки не вернулись молча
  it('«Фраза дня»: у v2Card нет рамки; круглых кнопок на карточке нет', () => {
    const src = read('components', 'DailyPhraseCard.tsx');
    expect(styleBlock(src, 'v2Card')).not.toMatch(/borderWidth|borderColor/);
    expect(src).not.toContain('styles.v2Round');
    expect(src).not.toContain('testID="home-v2-phrase-play"');
    expect(src).not.toContain('testID="home-v2-phrase-save"');
  });
});
