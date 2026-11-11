// Governance-ID: TG-2A28E9B878A0
// Вердикты Макетов 05.11 (rev6-home-free-0): A — у героя новичка под «Урок 1» стоит название урока, а не «Начать урок 1»;
// B — в ряду из трёх плиток название не рвётся посреди слова (13/17, поля 4 dp, без сжатия шрифта).
import * as fs from 'node:fs';
import * as path from 'node:path';
import { lessonNameForStudyTarget } from '../app/lesson_titles_for_study_target';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('герой новичка: название урока 1', () => {
  it('для английского курса название урока 1 есть на ru и uk и это не «Начать урок 1»', () => {
    for (const lang of ['ru', 'uk'] as const) {
      const name = lessonNameForStudyTarget(lang, 'en', 1);
      expect(typeof name).toBe('string');
      expect((name ?? '').trim().length).toBeGreaterThan(3);
      expect(name).not.toMatch(/^(Начать|Почати)/);
    }
    expect(lessonNameForStudyTarget('ru', 'en', 1)).toBe('Местоимения и глагол To Be');
  });

  it('HomeScene подставляет название урока 1 только новичку с целью «start»; карточка «последнее место» не тронута', () => {
    const scene = read('components/home/v2/scene/HomeScene.tsx');
    expect(scene).toContain("decision.state === 'newbie' && p.place.ctaTarget === 'start'");
    expect(scene).toContain('lessonNameForStudyTarget(p.lang, p.studyTarget as StudyTargetLang, 1)');
    expect(scene).toContain('title: heroTitle');
    expect(read('app/home_continue_mark.ts')).toContain("ru: 'Начать урок 1'");
  });
});

describe('три плитки Главной: слово не рвётся', () => {
  const tiles = read('components/home/v2/HomeV2FeatureTiles.tsx');
  it('ряд из трёх плиток: кегль 13/17 и поля 4 dp', () => {
    expect(tiles).toContain('const dense = tiles.length >= 3;');
    expect(tiles).toMatch(/titleDense:\s*\{\s*fontSize:\s*13,\s*lineHeight:\s*17/);
    expect(tiles).toMatch(/tileDense:\s*\{\s*paddingHorizontal:\s*4,/); // зачем (владелец 11.11, иконки по центру и крупнее): к полям 4 dp добавились верх/низ плитки — боковые поля те же
  });
  it('без сжатия шрифта (adjustsFontSizeToFit запрещён законом владельца)', () => {
    expect(tiles).not.toMatch(/adjustsFontSizeToFit/);
  });
});
