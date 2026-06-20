import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  readPlanTaskProgress,
  savePlanTaskProgress,
  clearPlanTaskProgress,
  PLAN_TASK_PROGRESS_KEY,
} from '../app/personal_plan_task_progress';

const PLAN = 'voyazh_2026_active';
const TASK = 'voyazh_d001_choose_natural';

describe('personal_plan_task_progress (resume посреди задания)', () => {
  beforeEach(() => {
    (AsyncStorage as unknown as { __reset: () => void }).__reset();
  });

  it('возвращает null, если задание ещё не начато', async () => {
    expect(await readPlanTaskProgress(PLAN, TASK)).toBeNull();
  });

  it('сохраняет и читает позицию (index + correctIds)', async () => {
    await savePlanTaskProgress(PLAN, TASK, { index: 2, correctIds: ['a', 'b'] });
    const saved = await readPlanTaskProgress(PLAN, TASK);
    expect(saved?.index).toBe(2);
    expect(saved?.correctIds).toEqual(['a', 'b']);
    expect(typeof saved?.updatedAt).toBe('string');
  });

  it('дедуплицирует correctIds и не уходит в отрицательный индекс', async () => {
    await savePlanTaskProgress(PLAN, TASK, { index: -5, correctIds: ['a', 'a', 'b'] });
    const saved = await readPlanTaskProgress(PLAN, TASK);
    expect(saved?.index).toBe(0);
    expect(saved?.correctIds).toEqual(['a', 'b']);
  });

  it('изолирует прогресс по (planInstanceId, taskId)', async () => {
    await savePlanTaskProgress(PLAN, TASK, { index: 1, correctIds: ['x'] });
    await savePlanTaskProgress(PLAN, 'other_task', { index: 3, correctIds: ['y'] });
    expect((await readPlanTaskProgress(PLAN, TASK))?.index).toBe(1);
    expect((await readPlanTaskProgress(PLAN, 'other_task'))?.index).toBe(3);
  });

  it('clear удаляет только свою запись', async () => {
    await savePlanTaskProgress(PLAN, TASK, { index: 1, correctIds: ['x'] });
    await savePlanTaskProgress(PLAN, 'other_task', { index: 3, correctIds: ['y'] });
    await clearPlanTaskProgress(PLAN, TASK);
    expect(await readPlanTaskProgress(PLAN, TASK)).toBeNull();
    expect((await readPlanTaskProgress(PLAN, 'other_task'))?.index).toBe(3);
  });

  it('пустой taskId — no-op (ничего не пишет/не падает)', async () => {
    await savePlanTaskProgress(PLAN, '', { index: 5, correctIds: ['z'] });
    expect(await readPlanTaskProgress(PLAN, '')).toBeNull();
    const raw = await AsyncStorage.getItem(PLAN_TASK_PROGRESS_KEY);
    expect(raw === null || raw === '{}').toBe(true);
  });

  it('переживает порчу хранилища (невалидный JSON → null)', async () => {
    await AsyncStorage.setItem(PLAN_TASK_PROGRESS_KEY, 'not-json{');
    expect(await readPlanTaskProgress(PLAN, TASK)).toBeNull();
  });
});
