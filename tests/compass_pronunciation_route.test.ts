/**
 * Тесты прямого маршрута на «повтори вслух» из активного плана
 * (compass_pronunciation_route). Мокаем чтение плана и каталог.
 */
import { resolvePronunciationRoute } from '../app/compass/compass_pronunciation_route';
import { readPersonalPlanState } from '../app/personal_plan_state';
import { getPlanById } from '../app/personal_plan_catalog';

jest.mock('../app/personal_plan_state', () => ({
  readPersonalPlanState: jest.fn(),
}));
jest.mock('../app/personal_plan_catalog', () => ({
  getPlanById: jest.fn(),
}));

const mockState = readPersonalPlanState as jest.MockedFunction<typeof readPersonalPlanState>;
const mockPlan = getPlanById as jest.MockedFunction<typeof getPlanById>;

const pronTask = {
  id: 'task_pron_1',
  kind: 'plan_pronunciation_repeat',
  destination: {
    type: 'plan_exercise',
    exerciseType: 'plan_pronunciation_repeat',
    lessonId: 'voyazh_d003_content_unit',
    contentUnitIds: ['a', 'b', 'c', 'd'],
    requiredCorrect: 4,
  },
} as any;

const otherTask = { id: 't2', kind: 'flashcards_plan_review', destination: { type: 'flashcards', deckId: 'x' } } as any;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('resolvePronunciationRoute', () => {
  it('нет активного плана → null', async () => {
    mockState.mockResolvedValue(null);
    expect(await resolvePronunciationRoute()).toBeNull();
  });

  it('активный план с задачей произношения → план-scoped маршрут', async () => {
    mockState.mockResolvedValue({ planId: 'voyazh', planInstanceId: 'voyazh_active', currentDayIndex: 3 } as any);
    mockPlan.mockReturnValue({ id: 'voyazh', days: [
      { dayIndex: 1, tasks: [otherTask] },
      { dayIndex: 2, tasks: [otherTask] },
      { dayIndex: 3, tasks: [otherTask, pronTask] },
    ] } as any);

    const r = await resolvePronunciationRoute();
    expect(r).not.toBeNull();
    expect(r!.pathname).toBe('/personal_plan_exercise');
    expect(r!.params).toMatchObject({
      rendererType: 'plan_pronunciation_repeat',
      planId: 'voyazh',
      planInstanceId: 'voyazh_active',
      planTaskId: 'task_pron_1',
      planDayIndex: '3',
      lessonId: 'voyazh_d003_content_unit',
      contentUnitIds: 'a,b,c,d',
      requiredCorrect: '4',
    });
  });

  it('в дне нет задачи произношения → null', async () => {
    mockState.mockResolvedValue({ planId: 'voyazh', planInstanceId: 'voyazh_active', currentDayIndex: 1 } as any);
    mockPlan.mockReturnValue({ id: 'voyazh', days: [{ dayIndex: 1, tasks: [otherTask] }] } as any);
    expect(await resolvePronunciationRoute()).toBeNull();
  });

  it('день вне диапазона → null (не падает)', async () => {
    mockState.mockResolvedValue({ planId: 'voyazh', planInstanceId: 'voyazh_active', currentDayIndex: 99 } as any);
    mockPlan.mockReturnValue({ id: 'voyazh', days: [{ dayIndex: 1, tasks: [pronTask] }] } as any);
    expect(await resolvePronunciationRoute()).toBeNull();
  });
});
