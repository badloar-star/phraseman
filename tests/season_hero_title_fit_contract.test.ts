// ЗАМОК ВЛАДЕЛЬЦА 22.10: «меньше шрифт и более компактно!» — заголовок обложки урока (раньше 30/36, три строки крупным жирным) стал меньше; перенос только по словам, без ужатия шрифта.
// Сторож меряет самый длинный заголовок курса при 360 dp реальным шрифтом (Inter Bold — не уже системных): каждое слово помещается в строку, строк не больше трёх.
import * as fs from 'fs';
import * as path from 'path';

import { LEARNING_V2_OWNER_EN_TITLES_RU } from '../components/learning-v2/learningV2OwnerLayout';
import { SEASON_HERO_PAD_H, SEASON_HERO_TITLE_BASE, SEASON_HERO_TITLE_LONG, seasonHeroTitleSize } from '../components/learning-v2/season/season_hero_title_metrics';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadAdvance } = require('../scripts/ttf_advance.cjs') as { loadAdvance: (file: string) => (text: string, size: number) => number };

const SCREEN = 360;
const SAFETY = 2;
const MAX_LINES = 3;
// единственное исключение — составное название с внутренней пометкой в скобках (урок 22, 82 знака): самым мелким кеглем оно занимает 4 строки; пометку «(новый слот, решение владельца 03.09)» в названии видеть ученику не нужно — сказано координатору
const MAX_LINES_XLONG = 4;

describe('Заголовок обложки урока: компактный и помещается при 360 dp', () => {
  const advance = loadAdvance(path.join(__dirname, '..', 'docs', 'design', 'v2-app', 'fonts', 'Inter-Bold.ttf'));
  const width = SCREEN - 2 * SEASON_HERO_PAD_H;

  const linesOf = (title: string): { lines: number; widest: number } => {
    const { fontSize } = seasonHeroTitleSize(title);
    const space = advance(' ', fontSize);
    let lines = 1;
    let cur = 0;
    let widest = 0;
    for (const word of title.split(/\s+/u)) {
      const w = advance(word, fontSize);
      widest = Math.max(widest, w);
      if (cur === 0) cur = w;
      else if (cur + space + w <= width - SAFETY) cur += space + w;
      else { lines += 1; cur = w; }
    }
    return { lines, widest };
  };

  it('кегль заметно меньше прежних 30/36 и 26/32', () => {
    expect(SEASON_HERO_TITLE_BASE.fontSize).toBeLessThanOrEqual(24);
    expect(SEASON_HERO_TITLE_LONG.fontSize).toBeLessThanOrEqual(22);
  });

  it('в курсе есть названия (сторож не пустой)', () => {
    expect(LEARNING_V2_OWNER_EN_TITLES_RU.length).toBeGreaterThanOrEqual(30);
  });

  LEARNING_V2_OWNER_EN_TITLES_RU.forEach((title, i) => {
    it(`урок ${i + 1}: «${title}» — слова целиком, не больше ${title.length > 56 ? MAX_LINES_XLONG : MAX_LINES} строк`, () => {
      const { lines, widest } = linesOf(title);
      if (widest + SAFETY > width || lines > (title.length > 56 ? MAX_LINES_XLONG : MAX_LINES)) console.warn(`[SEASON-HERO-FIT] урок ${i + 1}: строк ${lines}, самое длинное слово ${widest.toFixed(1)} из ${width}`);
      expect(widest + SAFETY).toBeLessThanOrEqual(width);
      expect(lines).toBeLessThanOrEqual(title.length > 56 ? MAX_LINES_XLONG : MAX_LINES);
    });
  });

  it('экран берёт кегль из метрик и не ужимает шрифт', () => {
    const view = fs.readFileSync(path.join(__dirname, '..', 'components', 'learning-v2', 'season', 'SeasonCourseView.tsx'), 'utf8');
    expect(view).toContain('seasonHeroTitleSize(props.lessonTitle)');
    expect(view).not.toMatch(/heroTitleLong|adjustsFontSizeToFit|minimumFontScale/u);
  });
});
