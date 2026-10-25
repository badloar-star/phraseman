/**
 * [HOME-SCENE] Особые сцены, пачка 1 (владелец 25.10): ошибки, слова на повтор, праздник, итоги недели — тексты, неделя,
 * подключение к сцене (кнопка ведёт туда, о чём сцена говорит; срочные герои главнее; кнопку «Продолжить» не трогаем).
 */
import * as fs from 'fs';
import * as path from 'path';

import { HOME_SCENE_SPECIAL_STATES } from '../components/home/v2/scene/home_scene_special';
import { buildHomeSceneSpecialCopy } from '../components/home/v2/scene/home_scene_special_copy';
import { homeSceneLastWeekDays } from '../components/home/v2/scene/use_home_scene_special';

const read = (rel: string): string => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('[HOME-SCENE] особые сцены — тексты', () => {
  it('у всех 12 сцен на 9 языках есть заголовок и кнопка', () => {
    for (const special of HOME_SCENE_SPECIAL_STATES) {
      for (const lang of LANGS) {
        const c = buildHomeSceneSpecialCopy({ lang, special, n: 23, best: 46, today: 40, friendName: 'Аня', placeTo: 4, wrong: 'I am agree', right: 'I agree', phrase: 'We are together', phraseTr: 'Мы вместе', holiday: 'halloween', milestoneKey: 'phrases_100', weekDays: 5 });
        expect(c.title.length).toBeGreaterThan(0);
        expect(c.cta && c.cta.length).toBeTruthy();
      }
    }
  });

  it('русские формы чисел и тексты макета', () => {
    expect(buildHomeSceneSpecialCopy({ lang: 'ru', special: 'mistakes_pile', n: 23 }).title).toBe('Накопилось 23 ошибки');
    expect(buildHomeSceneSpecialCopy({ lang: 'ru', special: 'mistakes_pile', n: 15 }).title).toBe('Накопилось 15 ошибок');
    expect(buildHomeSceneSpecialCopy({ lang: 'ru', special: 'words_due', n: 12 }).title).toBe('12 слов просятся на повтор');
    expect(buildHomeSceneSpecialCopy({ lang: 'ru', special: 'words_due', n: 22 }).title).toBe('22 слова просятся на повтор');
    expect(buildHomeSceneSpecialCopy({ lang: 'ru', special: 'holiday', holiday: 'halloween' }).title).toBe('Страшно полезный урок');
    expect(buildHomeSceneSpecialCopy({ lang: 'ru', special: 'weekly_recap', weekDays: 5 })).toMatchObject({ title: '5 дней из 7', line: 'Почти без пропусков' });
    expect(buildHomeSceneSpecialCopy({ lang: 'ru', special: 'weekly_recap', weekDays: 2 }).line).toBeNull();
  });

  it('друг — без рода в тексте', () => {
    expect(buildHomeSceneSpecialCopy({ lang: 'ru', special: 'friend_nudge', friendName: 'Аня', n: 3 }).title).toBe('Аня: 3 урока сегодня');
  });
});

describe('[HOME-SCENE] итоги недели — дни прошлой недели', () => {
  it('считает только пн–вс прошлой недели, без повторов', () => {
    const mon = new Date(2026, 9, 26, 9); // понедельник 26.10.2026
    const dates = ['2026-10-18', '2026-10-19', '2026-10-19', '2026-10-21', '2026-10-25', '2026-10-26', 'bad'];
    expect(homeSceneLastWeekDays(dates, mon)).toBe(3); // 19, 21, 25
    expect(homeSceneLastWeekDays([], mon)).toBe(0);
  });
});

describe('[HOME-SCENE] подключение к сцене', () => {
  const scene = read('components/home/v2/scene/HomeScene.tsx');
  const stage = read('components/home/v2/scene/HomeSceneStage.tsx');
  const home = read('app/(tabs)/home.tsx');

  it('особая сцена только при обработчике Главной и не на заготовке', () => {
    expect(scene).toContain('special={p.onSpecial && !p.pending ? special : null}');
    expect(scene).toMatch(/if \(specialView && onSpecial && specialView\.route !== 'continue'\) \{/);
  });

  it('кнопка «Продолжить» не тронута: LessonPrepCtaBody внутри V2Pressable, слот особой сцены — текст над кнопкой', () => {
    expect(stage).toContain('<LessonPrepCtaBody source="home"');
    expect(stage).toMatch(/<Animated\.View key=\{specialKey \?\? 'base'\} entering=\{specialKey && !reduceMotion \? SPECIAL_ENTER : undefined\}>/);
    expect(stage.indexOf("key={specialKey ?? 'base'}")).toBeLessThan(stage.indexOf('testID="home-scene-cta"'));
  });

  it('Главная ведёт кнопку особой сцены через свои охраняемые переходы', () => {
    expect(home).toContain("if (route === 'mistakes') { openHomeMistakesHub('home_scene_special'); return; }");
    expect(home).toContain("if (route === 'cards') { quickItems[2]!.onPress(); return; }");
    expect(home).toContain("if (route === 'stats') { go('/streak_stats'); return; }");
  });
});
