import { ALL_TASKS, isRetiredQuizArenaTaskType, getTodayTasksSafe } from '../app/daily_tasks';
import AsyncStorage from '@react-native-async-storage/async-storage';

// зачем: Арена и Вызовы удалены из приложения вместе со своими заданиями дня.
// Раньше здесь жила политика «ровно одна Арена в дневной тройке» — проверять
// больше нечего. Тест развёрнут в обратную сторону: стережёт, чтобы задания
// удалённых фич не вернулись ни в каталог, ни в реальную выдачу пользователю.
describe('задания удалённых Арены и Вызовов не возвращаются', () => {
  it('в каталоге заданий не осталось ни одного retired-типа', () => {
    const retired = ALL_TASKS.filter((task) => isRetiredQuizArenaTaskType(task.type));
    expect(retired.map((task) => `${task.id}/${task.type}`)).toEqual([]);
  });

  it('за все дни месяца и все тиры уровня пользователю не выдаётся retired-задание', async () => {
    const leaks: string[] = [];
    // XP → тир: 0 = ур.1 (тир1), 60000 = средний (тир2), 400000 = высокий (тир3)
    const xpByTier = ['0', '60000', '400000'];

    for (const xp of xpByTier) {
      for (let dayOfMonth = 1; dayOfMonth <= 31; dayOfMonth += 1) {
        await AsyncStorage.clear();
        await AsyncStorage.setItem('user_total_xp', xp);
        jest.useFakeTimers({
          now: Date.UTC(2026, 6, dayOfMonth, 12, 0, 0),
          doNotFake: ['nextTick', 'setImmediate'],
        });

        const tasks = await getTodayTasksSafe();
        tasks.forEach((task) => {
          if (isRetiredQuizArenaTaskType(task.type)) {
            leaks.push(`xp=${xp} день${dayOfMonth}: ${task.id}/${task.type}`);
          }
        });
      }
    }

    jest.useRealTimers();
    expect(leaks).toEqual([]);
  });

  // зачем: дневная выдача — 4 задания (DAILY_TASK_BASE_COUNT), тройка из набора
  // добирается филлером. Проверяем каждый день месяца: после удаления заданий
  // Арены/Вызовов набор не «худеет» и не даёт дублей.
  it('каждый день выдаётся полный набор заданий без повторов id и типа', async () => {
    const problems: string[] = [];

    for (let dayOfMonth = 1; dayOfMonth <= 31; dayOfMonth += 1) {
      await AsyncStorage.clear();
      await AsyncStorage.setItem('user_total_xp', '0');
      jest.useFakeTimers({
        now: Date.UTC(2026, 6, dayOfMonth, 12, 0, 0),
        doNotFake: ['nextTick', 'setImmediate'],
      });

      const tasks = await getTodayTasksSafe();
      if (tasks.length !== 4) problems.push(`день${dayOfMonth}: заданий ${tasks.length}`);
      if (new Set(tasks.map((t) => t.id)).size !== tasks.length) {
        problems.push(`день${dayOfMonth}: дубль id [${tasks.map((t) => t.id).join(',')}]`);
      }
      if (new Set(tasks.map((t) => t.type)).size !== tasks.length) {
        problems.push(`день${dayOfMonth}: дубль типа [${tasks.map((t) => t.type).join(',')}]`);
      }
    }

    jest.useRealTimers();
    expect(problems).toEqual([]);
  });
});
