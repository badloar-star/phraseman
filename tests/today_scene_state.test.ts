// зачем (эталон today-scene-concepts.html, таблица «Что когда на экране»): пять состояний «Сегодня» в стиле «Сцена» считаются чистой функцией из заданий дня и часов.
import { pickTodaySceneState, type TodaySceneTaskInput } from '../components/home/v2/today_scene/today_scene_state';

const task = (kind: TodaySceneTaskInput['kind'], progress: number, target: number): TodaySceneTaskInput => ({ kind, progress, target, done: progress >= target });
const three = (a: number, b: number, c: number, mid: TodaySceneTaskInput['kind'] = 'dialog') => [task('lesson', a, 1), task(mid, b, mid === 'video' ? 10 : 1), task('cards', c, 10)];

describe('pickTodaySceneState', () => {
  it('утро: ничего не выполнено, до 20:00 → «0 из 3», кнопка на первое задание', () => {
    const d = pickTodaySceneState({ tasks: three(0, 0, 0), hour: 9, streakDays: 5, dayCounted: false });
    expect(d).toMatchObject({ state: 'morning', doneCount: 0, total: 3, nextIndex: 0, hasVideoTask: false });
  });
  it('день: часть выполнена → «1 из 3», кнопка на следующее невыполненное', () => {
    const d = pickTodaySceneState({ tasks: three(1, 0, 6), hour: 14, streakDays: 5, dayCounted: true });
    expect(d).toMatchObject({ state: 'day', doneCount: 1, nextIndex: 1 });
  });
  it('вечер: после 20:00, серия от 1 дня, сегодня занятия не было → серия под угрозой', () => {
    const d = pickTodaySceneState({ tasks: three(0, 0, 0), hour: 21, streakDays: 5, dayCounted: false });
    expect(d.state).toBe('evening');
    expect(d.nextIndex).toBe(0);
    expect(d.reason).toContain('hour=21');
  });
  it('вечер без серии, или день уже засчитан, или статус неизвестен — это обычное утро/день', () => {
    expect(pickTodaySceneState({ tasks: three(0, 0, 0), hour: 21, streakDays: 0, dayCounted: false }).state).toBe('morning');
    expect(pickTodaySceneState({ tasks: three(1, 0, 0), hour: 21, streakDays: 5, dayCounted: true }).state).toBe('day');
    expect(pickTodaySceneState({ tasks: three(0, 0, 0), hour: 21, streakDays: 5, dayCounted: null }).state).toBe('morning');
  });
  it('граница вечера — ровно 20:00', () => {
    expect(pickTodaySceneState({ tasks: three(0, 0, 0), hour: 19, streakDays: 3, dayCounted: false }).state).toBe('morning');
    expect(pickTodaySceneState({ tasks: three(0, 0, 0), hour: 20, streakDays: 3, dayCounted: false }).state).toBe('evening');
  });
  it('все задания выполнены → готово, кнопки нет, даже вечером', () => {
    const d = pickTodaySceneState({ tasks: three(1, 1, 10), hour: 22, streakDays: 5, dayCounted: false });
    expect(d).toMatchObject({ state: 'done', doneCount: 3, nextIndex: null });
  });
  it('видео вместо диалога: состояние как у дня, кнопка на видео, флаг hasVideoTask', () => {
    const d = pickTodaySceneState({ tasks: three(1, 4, 6, 'video'), hour: 16, streakDays: 5, dayCounted: true });
    expect(d).toMatchObject({ state: 'day', nextIndex: 1, hasVideoTask: true });
  });
  it('нет заданий вовсе — не «готово» (пустой набор не поздравляем)', () => {
    const d = pickTodaySceneState({ tasks: [], hour: 10, streakDays: 0, dayCounted: null });
    expect(d.state).toBe('morning');
    expect(d.nextIndex).toBeNull();
  });
  it('задание с done=true считается выполненным, даже если счётчик не дошёл до цели', () => {
    const d = pickTodaySceneState({ tasks: [{ kind: 'lesson', progress: 0, target: 1, done: true }, task('dialog', 0, 1), task('cards', 0, 10)], hour: 10, streakDays: 1, dayCounted: false });
    expect(d).toMatchObject({ state: 'day', doneCount: 1, nextIndex: 1 });
  });
});
