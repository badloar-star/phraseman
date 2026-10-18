import fs from 'fs';
import path from 'path';

import { LEARNING_V2_ICON_LESSONS } from '../components/learning-v2/icons/learningV2IconData.generated';
import { hexToOklch, learningV2IconPaint, oklchToHex } from '../components/learning-v2/icons/learningV2IconHue';
import {
  learningV2ChapterHueShift,
  learningV2ChapterIcon,
  learningV2ChapterPattern,
  learningV2LessonHueShift,
  learningV2LessonIcon,
} from '../components/learning-v2/icons/learningV2Icons';
import { learningV2ChapterIonIcon, learningV2LessonIonIcon } from '../components/learning-v2/icons/learningV2IonIcons';

// зачем (владелец 17.10, координатор): у КАЖДОГО урока и КАЖДОЙ главы карты V2 своя иконка, у плашки главы — свой узор;
// оттенки читаются в светлой и тёмной темах. Сторож не даёт урокам 1–8 остаться без рисунка и не даёт карте потерять подключение.

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1, 7), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe('иконки уроков и глав V2', () => {
  it('у уроков 1–8 есть иконка, у каждой из 7 глав — иконка и узор', () => {
    expect(LEARNING_V2_ICON_LESSONS.map((lesson) => lesson.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (let lesson = 1; lesson <= 8; lesson += 1) {
      expect(learningV2LessonIcon(lesson)?.length).toBeGreaterThan(0);
      for (let chapter = 1; chapter <= 7; chapter += 1) {
        expect(learningV2ChapterIcon(lesson, chapter)?.length).toBeGreaterThan(0);
        const pattern = learningV2ChapterPattern(lesson, chapter);
        expect(pattern).not.toBeNull();
        expect(pattern!.tiles.length).toBeGreaterThan(0);
      }
    }
  });

  it('урок без рисунков (9+) — null, экран оставляет прежний значок', () => {
    expect(learningV2LessonIcon(9)).toBeNull();
    expect(learningV2ChapterIcon(9, 1)).toBeNull();
    expect(learningV2ChapterPattern(9, 1)).toBeNull();
  });

  it('у каждой главы урока своя иконка (нет двух одинаковых рисунков в одном уроке)', () => {
    for (const lesson of LEARNING_V2_ICON_LESSONS) {
      const drawn = lesson.chapters.map((chapter) => JSON.stringify(chapter.icon));
      expect(new Set(drawn).size).toBe(drawn.length);
    }
  });

  it('оттенки: hex, иконка читается на своей плитке (≥ 3:1) в светлой и тёмной теме, у глав разные тона', () => {
    const accents = ['#5F5CB1', '#5CCFEB', '#7EF0C8', '#F2F1F6', '#E07A5F'];
    for (const accent of accents) {
      for (const isLight of [true, false]) {
        const inks = new Set<string>();
        for (let chapter = 1; chapter <= 7; chapter += 1) {
          const paint = learningV2IconPaint(accent, isLight, learningV2ChapterHueShift(chapter));
          expect(paint.ink).toMatch(/^#[0-9a-f]{6}$/);
          expect(paint.tile).toMatch(/^#[0-9a-f]{6}$/);
          expect(contrast(paint.ink, paint.tile)).toBeGreaterThanOrEqual(3);
          inks.add(paint.ink);
        }
        // у нейтрального акцента (#F2F1F6) насыщенность урезана — тона ближе, но всё равно не один цвет
        expect(inks.size).toBeGreaterThan(1);
      }
    }
    expect(learningV2LessonHueShift(1)).toBe(0);
  });

  // зачем (Макеты fd6d10db8, эталон learning-v2-icons.html): 8 уроков × (1 + 7) = 64 значка outline без повторов; урок 9+ — запасной book-outline
  it('значки Ionicons по эталону Макетов: 64 разных outline, у каждой главы свой', () => {
    const all: string[] = [];
    for (let lesson = 1; lesson <= 8; lesson += 1) {
      all.push(String(learningV2LessonIonIcon(lesson)));
      for (let chapter = 1; chapter <= 7; chapter += 1) all.push(String(learningV2ChapterIonIcon(lesson, chapter)));
    }
    expect(all).toHaveLength(64);
    expect(new Set(all).size).toBe(64);
    for (const icon of all) expect(icon.endsWith('-outline')).toBe(true);
    expect(learningV2LessonIonIcon(1)).toBe('briefcase-outline');
    expect(learningV2ChapterIonIcon(8, 7)).toBe('heart-outline');
    expect(learningV2LessonIonIcon(9)).toBe('book-outline');
  });

  it('OKLCH туда-обратно сохраняет цвет', () => {
    const back = hexToOklch('#5F5CB1')!;
    expect(oklchToHex(back[0], back[1], back[2]).toLowerCase()).toBe('#5f5cb1');
  });

  // зачем: владелец 18.10 — без текстур, иконки как в Диалогах, но свои: карта больше не рисует SVG-плитки и узор глав,
  // вместо них плитка тоном текста 9 % с Ionicons по смыслу главы; без замка (закрытая глава — тот же значок цветом secondary).
  it('карта V2: без текстур и SVG-плиток — плитка в стиле Диалогов со своим значком у урока и каждой главы', () => {
    const map = read('components/learning-v2/LearningV2ChaptersCourse.tsx');
    expect(map).not.toContain('<LearningV2ChapterTile');
    expect(map).not.toContain('<LearningV2ChapterPattern');
    expect(map).not.toContain('chapterPatternBand');
    expect(map).toContain('learningV2LessonIonIcon(selectedLessonOrdinal)');
    expect(map).toContain('learningV2ChapterIonIcon(selectedLessonOrdinal, chapter.chapterOrdinal)');
    expect(map).toContain('glassTone(g.text, 0.09)');
    expect(map).toMatch(/chapterTile: \{ width: 55, height: 55, borderRadius: 14/);
    expect(map).toMatch(/lessonTile: \{ width: 46, height: 46, borderRadius: 12/);
    expect(map).not.toMatch(/lock-closed" : "trophy-outline"/);
    expect(map).toContain('color: chapterState === "locked" ? g.secondary : g.text');
    const data = read('components/learning-v2/icons/learningV2IconData.generated.ts');
    expect(data).toContain('СГЕНЕРИРОВАНО scripts/gen_learning_v2_icons.mjs');
    expect(fs.existsSync(path.join(root, 'docs/design/v2-app/learning-v2-icons.html'))).toBe(true);
  });
});
