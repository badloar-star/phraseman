// ЗАМОК ВЛАДЕЛЬЦА 22.10: «по заходам» — «Тебя не было N дней» на Главной только если человек правда не открывал приложение N дней;
// открывал, но не учился — надписи нет. Слова владельца: «СХУЯЛИ У МЕНЯ ТАКОЕ НАПИСАНО» (заходит каждый день, а сцена писала
// «Тебя не было 4 дня» по последнему засчитанному уроку). Реестр docs/work/OWNER_LOCKS.md. Ослабить сторож — только по новому слову
// владельца. «Серия прервалась» по-прежнему по урокам — это не отменено.
import * as fs from 'fs';
import * as path from 'path';
import { homeSceneDaysAwayByVisits, homeSceneDaysSince, homeSceneLastActivityDay, homeSceneStreakLost } from '../components/home/v2/scene/home_scene_inputs';
import { pickHomeSceneState, type HomeSceneInput } from '../components/home/v2/scene/home_scene_state';
import { __resetAppVisitGapForTests, noteAppVisit, peekAppVisitGap } from '../modules/welcome_back/welcome_back_signal';

const DAY = 86_400_000;
const at = (y: number, m: number, d: number, h: number) => new Date(y, m - 1, d, h, 0, 0).getTime();
const NOW = at(2026, 10, 22, 10);

const base: HomeSceneInput = {
  hasProgress: true, hour: 10, streakDays: 0, dayCounted: false, plus: false, energy: 5, daysAway: null,
  streakLostToday: false, chapterExamReady: false, allReleasedDone: false, offline: false,
};

describe('ЗАМОК ВЛАДЕЛЬЦА 22.10 «по заходам»', () => {
  beforeEach(() => {
    __resetAppVisitGapForTests();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('урок 4 дня назад, но заходил вчера — НЕ «С возвращением»', () => {
    const now = new Date(NOW);
    const lessonDays = homeSceneDaysSince(homeSceneLastActivityDay(['2026-10-18']), now);
    expect(lessonDays).toBe(4);
    noteAppVisit(NOW - DAY, NOW);
    const daysAway = homeSceneDaysAwayByVisits(peekAppVisitGap(), now);
    expect(daysAway).toBe(1);
    expect(pickHomeSceneState({ ...base, daysAway }).state).not.toBe('welcome_back');
  });

  it('правда не открывал 4 дня — «С возвращением», в причине те же 4 дня', () => {
    noteAppVisit(at(2026, 10, 18, 21), NOW);
    const daysAway = homeSceneDaysAwayByVisits(peekAppVisitGap(), new Date(NOW));
    expect(daysAway).toBe(4);
    expect(pickHomeSceneState({ ...base, daysAway })).toMatchObject({ state: 'welcome_back', reason: 'daysAway=4' });
  });

  it('повтор захода в тот же день не обнуляет разрыв первого захода; новый процесс в тот же день — надписи нет', () => {
    noteAppVisit(at(2026, 10, 18, 21), NOW);
    noteAppVisit(NOW + 60_000, NOW + 5 * 60_000);
    expect(homeSceneDaysAwayByVisits(peekAppVisitGap(), new Date(NOW + 5 * 60_000))).toBe(4);
    __resetAppVisitGapForTests();
    noteAppVisit(NOW, NOW + 3_600_000);
    expect(homeSceneDaysAwayByVisits(peekAppVisitGap(), new Date(NOW + 3_600_000))).toBe(0);
  });

  it('отметки нет или снимок не сегодняшний — «С возвращением» не решаем', () => {
    expect(homeSceneDaysAwayByVisits(null, new Date(NOW))).toBeNull();
    noteAppVisit(null, NOW);
    expect(homeSceneDaysAwayByVisits(peekAppVisitGap(), new Date(NOW))).toBeNull();
    noteAppVisit(NOW - DAY, NOW);
    expect(homeSceneDaysAwayByVisits(peekAppVisitGap(), new Date(NOW + DAY))).toBeNull();
  });

  it('«серия прервалась» — по-прежнему по урокам: заходил вчера, урок позавчера', () => {
    expect(homeSceneStreakLost({ daysAway: 2, streakCount: 5, plus: false })).toBe(true);
  });

  it('сцена Главной передаёт в выбор героя дни по заходам, а в «серия прервалась» — по урокам', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '..', 'components', 'home', 'v2', 'scene', 'HomeScene.tsx'), 'utf8');
    expect(src).toContain('ЗАМОК ВЛАДЕЛЬЦА 22.10: «по заходам»');
    expect(src).toMatch(/const daysAway = homeSceneDaysAwayByVisits\(visitGap, now\);/);
    expect(src).toMatch(/homeSceneStreakLost\(\{ daysAway: daysSinceLesson,/);
    expect(src).not.toMatch(/const daysAway = homeSceneDaysSince\(/);
    const winback = fs.readFileSync(path.resolve(__dirname, '..', 'app', 'winback_offer.ts'), 'utf8');
    // отметку прошлого захода отдаём ДО перезаписи текущим временем
    expect(winback.indexOf('noteAppVisit(prev, nowMs')).toBeGreaterThan(-1);
    expect(winback.indexOf('noteAppVisit(prev, nowMs')).toBeLessThan(winback.indexOf('AsyncStorage.setItem(LAST_ACTIVE_KEY'));
  });
});
