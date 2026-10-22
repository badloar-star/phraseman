// зачем (эталон today-scene-concepts.html): тексты «Сегодня» в стиле «Сцена» — заголовок «N из 3», «До полуночи …», «Осталось: …», серия со склонением; на всех 9 языках без пустых строк.
import type { Lang } from '../constants/i18n';
import { buildTodaySceneCopy, todaySceneRemainingLine } from '../components/home/v2/today_scene/today_scene_copy';
import { pickTodaySceneState, type TodaySceneTaskInput } from '../components/home/v2/today_scene/today_scene_state';

const t = (kind: TodaySceneTaskInput['kind'], progress: number, target: number): TodaySceneTaskInput => ({ kind, progress, target, done: progress >= target });
const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

function copy(lang: Lang, tasks: TodaySceneTaskInput[], hour: number, streakDays = 5, dayCounted: boolean | null = false, minutes = 140) {
  const decision = pickTodaySceneState({ tasks, hour, streakDays, dayCounted });
  const remainingKinds = tasks.filter((x) => !x.done).map((x) => x.kind);
  return buildTodaySceneCopy({ lang, decision, remainingKinds, streakDays, minutesToMidnight: minutes, dateLabel: 'Вторник, 21 октября' });
}

describe('buildTodaySceneCopy · русский', () => {
  it('утро: «0 из 3», строка про три задания, дата над заголовком', () => {
    const c = copy('ru', [t('lesson', 0, 1), t('dialog', 0, 1), t('cards', 0, 10)], 9);
    expect(c).toMatchObject({ kicker: 'Вторник, 21 октября', title: '0 из 3', line: 'Заданий на сегодня: 3', warm: null, panelTitle: 'Задания дня', panelCount: '0 из 3' });
  });
  it('день: «1 из 3» и «Осталось: диалог и карточки»', () => {
    const c = copy('ru', [t('lesson', 1, 1), t('dialog', 0, 1), t('cards', 6, 10)], 14, 5, true);
    expect(c).toMatchObject({ title: '1 из 3', line: 'Осталось: диалог и карточки' });
  });
  it('вечер: «До полуночи 2 ч 20 мин», серия с правильным склонением, тёплая строка', () => {
    const c = copy('ru', [t('lesson', 0, 1), t('dialog', 0, 1), t('cards', 0, 10)], 21);
    expect(c).toMatchObject({ kicker: 'Серия 5 дней', title: 'До\u00A0полуночи 2\u00A0ч\u00A020\u00A0мин', line: null, warm: 'Одно занятие сохранит серию' });
  });
  it('вечер, ровно часы и ровно минуты — без «0 мин» и «0 ч»', () => {
    expect(copy('ru', [t('lesson', 0, 1)], 22, 1, false, 120).title).toBe('До\u00A0полуночи 2\u00A0ч');
    expect(copy('ru', [t('lesson', 0, 1)], 23, 1, false, 45).title).toBe('До\u00A0полуночи 45\u00A0мин');
    expect(copy('ru', [t('lesson', 0, 1)], 23, 1, false, 45).kicker).toBe('Серия 1 день');
    expect(copy('ru', [t('lesson', 0, 1)], 23, 2, false, 45).kicker).toBe('Серия 2 дня');
    expect(copy('ru', [t('lesson', 0, 1)], 23, 11, false, 45).kicker).toBe('Серия 11 дней');
  });
  it('все выполнено: «3 из 3», «Все кольца замкнуты», без тёплой строки', () => {
    const c = copy('ru', [t('lesson', 1, 1), t('dialog', 1, 1), t('cards', 10, 10)], 22);
    expect(c).toMatchObject({ title: '3 из 3', line: 'Все кольца замкнуты', warm: null });
  });
  it('видео вместо диалога: «Осталось: видео и карточки»', () => {
    const c = copy('ru', [t('lesson', 1, 1), t('video', 4, 10), t('cards', 6, 10)], 16, 5, true);
    expect(c.line).toBe('Осталось: видео и карточки');
  });
});

describe('buildTodaySceneCopy · все 9 языков', () => {
  it.each(LANGS)('%s: ни одной пустой строки в заголовке, подписях и вечерней строке', (lang) => {
    const morning = copy(lang, [t('lesson', 0, 1), t('dialog', 0, 1), t('cards', 0, 10)], 9);
    const day = copy(lang, [t('lesson', 1, 1), t('dialog', 0, 1), t('cards', 6, 10)], 14, 5, true);
    const evening = copy(lang, [t('lesson', 0, 1), t('dialog', 0, 1), t('cards', 0, 10)], 21);
    const done = copy(lang, [t('lesson', 1, 1), t('dialog', 1, 1), t('cards', 10, 10)], 21);
    for (const c of [morning, day, evening, done]) {
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.panelTitle.length).toBeGreaterThan(0);
      expect(c.panelCount).toMatch(/\d/);
    }
    expect(morning.line).toMatch(/3/);
    expect(day.line && day.line.length).toBeGreaterThan(3);
    expect(evening.kicker).toMatch(/5/);
    expect(evening.title).toMatch(/2/);
    expect(evening.warm && evening.warm.length).toBeGreaterThan(3);
    expect(done.line && done.line.length).toBeGreaterThan(3);
  });
});

describe('todaySceneRemainingLine', () => {
  it('нет невыполненных — строки нет', () => {
    expect(todaySceneRemainingLine('ru', [])).toBeNull();
  });
  it('одно, два и три задания склеиваются через запятую и союз', () => {
    expect(todaySceneRemainingLine('ru', ['cards'])).toBe('Осталось: карточки');
    expect(todaySceneRemainingLine('en', ['lesson', 'cards'])).toBe('Left: lesson and cards');
    expect(todaySceneRemainingLine('ru', ['lesson', 'dialog', 'cards'])).toBe('Осталось: урок, диалог и карточки');
  });
});
