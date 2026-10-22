// ЗАМОК ВЛАДЕЛЬЦА 22.10: «старый курс назвать» (плитка «Старый курс») + Сверка §41: подписи трёх плиток хаба («Все главы», «Все уроки», «Старый курс») не рвутся посреди слова на 360 dp ни на одном из 9 языков,
// а шрифт при этом не ужимается (запрет владельца на adjustsFontSizeToFit). Сторож меряет самое длинное слово каждой подписи реальным шрифтом (Inter Bold — он не уже системных Roboto / SF)
// и сравнивает с шириной, которую плитка даёт подписи по тем же числам, что и сам экран.
import * as fs from 'fs';
import * as path from 'path';

import { seasonCardText } from '../components/learning-v2/season/season_copy_card';
import { SEASON_NAV_GAP, SEASON_NAV_LABEL_SIZE, SEASON_NAV_ROW_PAD_H, SEASON_NAV_TILE_PAD_H } from '../components/learning-v2/season/season_nav_tiles_metrics';
import type { Lang } from '../constants/i18n';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadAdvance } = require('../scripts/ttf_advance.cjs') as { loadAdvance: (file: string) => (text: string, size: number) => number };

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const KEYS = ['allChapters', 'allLessons', 'classicCourse'] as const;
const SCREEN = 360;
// запас на разницу в метриках шрифтов и округление, dp
const SAFETY = 2;
// строки Переводчика (d16d294c5), слова владельца для ru/uk
const OLD_COURSE = ['Старый курс', 'Старий курс', 'Old course', 'Curso anterior', 'Curso antigo', 'Khóa học cũ', 'Kursus lama', 'Eski kurs', 'Stary kurs'];

describe('Плитки хаба: подписи, «Старый курс», самое длинное слово помещается при 360 dp без ужатия шрифта', () => {
  const advance = loadAdvance(path.join(__dirname, '..', 'docs', 'design', 'v2-app', 'fonts', 'Inter-Bold.ttf'));
  const tileWidth = (SCREEN - 2 * SEASON_NAV_ROW_PAD_H - 2 * SEASON_NAV_GAP) / 3;
  const inner = tileWidth - 2 * SEASON_NAV_TILE_PAD_H;

  for (const lang of LANGS) {
    for (const key of KEYS) {
      const label = seasonCardText(lang, key);
      const longest = label.split(/\s+/u).reduce((a, w) => (advance(w, SEASON_NAV_LABEL_SIZE) > advance(a, SEASON_NAV_LABEL_SIZE) ? w : a), '');
      it(`${lang} · ${key}: «${longest}» ≤ ${inner.toFixed(0)} dp`, () => {
        const w = advance(longest, SEASON_NAV_LABEL_SIZE);
        if (w + SAFETY > inner) console.warn(`[SEASON-NAV-FIT] ${lang}/${key} «${longest}» ${w.toFixed(1)} dp > ${inner.toFixed(1)} − ${SAFETY}`);
        expect(w + SAFETY).toBeLessThanOrEqual(inner);
      });
    }
  }

  it('третья плитка называется «Старый курс» на всех 9 языках и берёт свой ключ, а не название вкладки', () => {
    LANGS.forEach((lang, i) => expect(seasonCardText(lang, 'classicCourse')).toBe(OLD_COURSE[i]));
    const root = path.join(__dirname, '..', 'components', 'learning-v2', 'season');
    const view = fs.readFileSync(path.join(root, 'SeasonCourseView.tsx'), 'utf8');
    const wire = fs.readFileSync(path.join(root, 'SeasonCourseConnected.tsx'), 'utf8');
    expect(view).toContain("classicLabel={seasonCardText(lang, 'classicCourse')}");
    expect(wire).not.toContain('classicLabel=');
  });

  it('подпись переносится только по словам и не ужимается', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'learning-v2', 'season', 'SeasonNavTiles.tsx'), 'utf8');
    expect(src).toContain('textBreakStrategy="simple"');
    expect(src).toContain('android_hyphenationFrequency="none"');
    expect(src).not.toMatch(/adjustsFontSizeToFit|minimumFontScale/u);
  });
});
