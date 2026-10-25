/**
 * [HOME-SCENE] Особые сцены, пачка 3 (координатор 25.10, замены данных — всё локально): рубеж по снимку счётчиков,
 * «тебя обогнали» по месту при прошлом входе (одна база на день), рекорд — серии в днях, фраза дня — своя отметка показа.
 */
import * as fs from 'fs';
import * as path from 'path';

import { buildHomeSceneSpecialCopy } from '../components/home/v2/scene/home_scene_special_copy';
import { homeScenePeakStep, homeScenePickMilestone, homeSceneWeekKeyOf } from '../components/home/v2/scene/use_home_scene_more_facts';

const read = (rel: string): string => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('[HOME-SCENE] рубеж — снимок счётчиков', () => {
  it('без прошлого снимка рубежа нет', () => {
    expect(homeScenePickMilestone(null, { lessons: 10, phrases: 100, rank: 3 })).toBeNull();
  });
  it('перешли порог уроков и фраз; ранг — любое повышение (главнее)', () => {
    expect(homeScenePickMilestone({ lessons: 9, phrases: 40, rank: 2 }, { lessons: 10, phrases: 45, rank: 2 })).toEqual({ key: 'lessons_10', n: 10 });
    expect(homeScenePickMilestone({ lessons: 9, phrases: 95, rank: 2 }, { lessons: 9, phrases: 101, rank: 2 })).toEqual({ key: 'phrases_100', n: 100 });
    expect(homeScenePickMilestone({ lessons: 9, phrases: 95, rank: 2 }, { lessons: 10, phrases: 101, rank: 3 })).toEqual({ key: 'rank_3', n: 3 });
    expect(homeScenePickMilestone({ lessons: 10, phrases: 100, rank: 3 }, { lessons: 11, phrases: 120, rank: 3 })).toBeNull();
  });
});

describe('[HOME-SCENE] тебя обогнали — место при прошлом входе', () => {
  const mon = new Date(2026, 9, 26, 9);
  const tue = new Date(2026, 9, 27, 9);
  const tueLater = new Date(2026, 9, 27, 18);
  it('первый вход — базы нет; на следующий день база — вчерашнее место; весь день одна база', () => {
    const a = homeScenePeakStep(null, 3, mon);
    expect(a.overtaken).toBeNull();
    const b = homeScenePeakStep(a.memo, 4, tue);
    expect(b.overtaken).toEqual({ from: 3, to: 4 });
    const c = homeScenePeakStep(b.memo, 5, tueLater);
    expect(c.overtaken).toEqual({ from: 3, to: 5 });
  });
  it('место лучше или новая неделя — не обогнали', () => {
    const a = homeScenePeakStep(null, 4, mon);
    expect(homeScenePeakStep(a.memo, 2, tue).overtaken).toBeNull();
    const nextWeek = new Date(2026, 10, 2, 9);
    expect(homeSceneWeekKeyOf(nextWeek)).not.toBe(homeSceneWeekKeyOf(mon));
    expect(homeScenePeakStep(a.memo, 9, nextWeek).overtaken).toBeNull();
  });
});

describe('[HOME-SCENE] тексты и подключение пачки 3', () => {
  it('рекорд — серии в днях', () => {
    expect(buildHomeSceneSpecialCopy({ lang: 'ru', special: 'personal_best', best: 21, today: 15 })).toMatchObject({ kicker: 'Твой рекорд серии — 21 день', title: 'Побьёшь?', line: '15 из 21' });
  });
  it('кнопки: фраза — к карточке фразы, Пик — во вкладку Пика; карточку фразы увидели — отметка', () => {
    const home = read('app/(tabs)/home.tsx');
    expect(home).toContain("if (route === 'peak') { nav.push('/(tabs)/community?section=spire' as never); return; }");
    expect(home).toContain("if (route === 'phrase') {");
    expect(home).toContain('if (next) markHomeScenePhraseSeen();');
  });
});

describe('[HOME-SCENE] рубеж не ложный до гидрации (Ревизор 25.10 по a796ac60e)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const m = require('../components/home/v2/scene/use_home_scene_more_facts') as typeof import('../components/home/v2/scene/use_home_scene_more_facts');
  it('неизвестные счётчики не стирают снимок', () => {
    expect(m.homeSceneMergeCounters({ lessons: 120, phrases: 300, rank: 4 }, { lessons: 120, phrases: null, rank: null })).toEqual({ lessons: 120, phrases: 300, rank: 4 });
  });
  it('хук не читает и не пишет снимок, пока личный прогресс не прочитан', () => {
    const src = read('components/home/v2/scene/use_home_scene_more_facts.ts');
    expect(src).toContain("if (!i.ready) { console.log(LOG, 'special:more_skip', JSON.stringify({ reason: 'personal_progress_not_hydrated' })); return undefined; }");
    expect(read('components/home/v2/scene/HomeScene.tsx')).toContain('ready: personal.hydrated');
    expect(src).not.toMatch(/\.catch\(\(\) => null\)/);
  });
});

describe('[HOME-SCENE] остальные сцены со снимками не врут до загрузки', () => {
  it('рекорд серии — только при известной серии > 0; место в Пике — только известное', () => {
    const src = read('components/home/v2/scene/use_home_scene_more_facts.ts');
    expect(src).toContain('best !== null && best > 0 && i.streakDays > 0 ?');
    expect(src).toContain('if (i.peakPlace !== null) {');
  });
});
