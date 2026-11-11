/**
 * Пик: задания двенадцати новых механик в недельном пакете (владелец 11.11.2026, «код сейчас, пул после вычитки»).
 *
 * зачем: игра Пика должна показать и честно засчитать задание новой механики, как только оно появится в пакете.
 * Сторож держит: пакет с таким заданием читается; битое задание отбраковывает набор целиком (а не превращается на экране
 * в «нажал верно — засчитали неверно»); вердикт новой механики ведёт сердца так же, как обычный ответ; прежний ответ
 * по отпечатку к новому заданию не применяется; пакет без новых заданий читается как раньше.
 * Сработал — чинить modules/spire/{pack_plan,step_machine,expanded_pack_task}.ts, а не ослаблять сторожа.
 */
import { spireExpandedTaskFromPack } from '../modules/spire/expanded_pack_task';
import { spireDecodeWeekPack, spirePickStepPlan, spireTimerKindOf } from '../modules/spire/pack_plan';
import {
  SPIRE_STEP_MAX_HEARTS,
  SPIRE_STEP_TASK_COUNT,
  advanceAfterReveal,
  createSpireStepState,
  submitSpireAnswer,
  submitSpireVerdict,
} from '../modules/spire/step_machine';

const EXPECT = { weekId: '2026-W46', lang: 'en', tier: 1 };

const expandedTask = (index: number, exercise: Record<string, unknown> = { options: ['Yes, I do.', 'At nine.', 'It is my flat.'], key: 0 }) => ({
  taskId: `peak-expanded-en-b001-context_choice-${String(index).padStart(2, '0')}`,
  mode: 'context_choice',
  kind: 'expanded',
  difficulty: 1,
  payload: {
    exercise,
    ui: {
      en: { instruction: 'Choose the reply', prompt: 'Do you live here?', context: 'Answer the question.' },
      ru: { instruction: 'Выберите ответ', prompt: 'Do you live here?', context: 'Ответьте на вопрос.' },
    },
    feedback: {
      en: { correct: 'A yes or no question needs yes or no.', choiceReasons: ['Right.', 'This is a time.', 'This is a thing.'] },
      ru: { correct: 'На вопрос «да или нет» отвечают «да» или «нет».', choiceReasons: ['Верно.', 'Это время.', 'Это предмет.'] },
    },
  },
});

const classicTask = (index: number) => ({
  taskId: `classic-${index}`,
  mode: 'guess_phrase',
  kind: 'choice',
  difficulty: 1,
  payload: { phrase: 'Я готов', options: ['I am ready', 'I am busy', 'I am late', 'I am here'] },
});

function pack(tasks: readonly unknown[]) {
  return {
    schema: 'spire-pack-v1',
    weekId: EXPECT.weekId,
    lang: EXPECT.lang,
    tier: EXPECT.tier,
    packHash: 'hash-0001',
    saltId: 'salt-1',
    aboveCloudsCyclesFloors: [11, 12, 13, 14, 15],
    floors: [{ floor: 1, guardian: false, steps: [{ step: 1, sets: [{ tasks, answerFingerprints: tasks.map(() => ['fp']) }] }] }],
  };
}

const mixedTasks = Array.from({ length: SPIRE_STEP_TASK_COUNT }, (_unused, index) => (index % 2 === 0 ? expandedTask(index) : classicTask(index)));

function pick() {
  const decoded = spireDecodeWeekPack(pack(mixedTasks), EXPECT);
  if (!decoded.ok) throw new Error(decoded.reason);
  const picked = spirePickStepPlan(decoded.pack, { floor: 1, step: 1, attempt: 0, budgetMs: () => 60_000 });
  if (!picked) throw new Error('no plan');
  return picked;
}

describe('Пик: пакет с заданиями новых механик', () => {
  it('читается, задание вида expanded доходит до плана ступени', () => {
    const picked = pick();
    expect(picked.tasks[0].kind).toBe('expanded');
    expect(picked.plan.tasks[0].kind).toBe('expanded');
    expect(picked.tasks[1].kind).toBe('choice');
  });

  it('задание превращается в задание для экрана на языке интерфейса, чужой язык получает английский', () => {
    const task = pick().tasks[0];
    const ru = spireExpandedTaskFromPack(task, 'ru', 'en');
    const tr = spireExpandedTaskFromPack(task, 'tr', 'en');
    expect(ru.ok && ru.task.instruction).toBe('Выберите ответ');
    expect(tr.ok && tr.task.instruction).toBe('Choose the reply');
    expect(ru.ok && ru.task.exercise.format).toBe('context_choice');
  });

  it('время на новое задание берётся как на сборку перевода', () => {
    expect(spireTimerKindOf(pick().tasks[0])).toBe('translate');
  });

  it.each([
    ['ключ за пределами вариантов', { options: ['a', 'b'], key: 5 }],
    ['нет вариантов', { key: 0 }],
  ])('битое задание (%s) отбраковывает весь пакет', (_name, exercise) => {
    const tasks = mixedTasks.map((task, index) => (index === 0 ? expandedTask(0, exercise) : task));
    expect(spireDecodeWeekPack(pack(tasks), EXPECT).ok).toBe(false);
  });

  it('формат новой механики под прежним видом задания не принимается', () => {
    const tasks = mixedTasks.map((task, index) => (index === 1 ? { ...classicTask(1), mode: 'typed_word' } : task));
    expect(spireDecodeWeekPack(pack(tasks), EXPECT).ok).toBe(false);
  });

  it('пакет без новых заданий читается как раньше', () => {
    const tasks = Array.from({ length: SPIRE_STEP_TASK_COUNT }, (_unused, index) => classicTask(index));
    expect(spireDecodeWeekPack(pack(tasks), EXPECT).ok).toBe(true);
  });
});

describe('Пик: вердикт задания новой механики', () => {
  it('верно — следующее задание, сердца на месте', () => {
    const { plan } = pick();
    const next = submitSpireVerdict(createSpireStepState(plan), plan, true, 1_000);
    expect(next.taskIndex).toBe(1);
    expect(next.hearts).toBe(SPIRE_STEP_MAX_HEARTS);
    expect(next.phase).toBe('active');
  });

  it('неверно — минус сердце и показ верного ответа', () => {
    const { plan } = pick();
    const next = submitSpireVerdict(createSpireStepState(plan), plan, false, 1_000);
    expect(next.hearts).toBe(SPIRE_STEP_MAX_HEARTS - 1);
    expect(next.phase).toBe('revealing');
  });

  it('ответ по отпечатку к новому заданию не применяется — состояние не меняется', () => {
    const { plan } = pick();
    const state = createSpireStepState(plan);
    expect(submitSpireAnswer(state, plan, { selectedIndex: 0 }, 1_000)).toBe(state);
  });

  it('готовый вердикт к прежнему заданию не применяется — оно проверяется только отпечатком', () => {
    const { plan } = pick();
    const onClassic = advanceAfterReveal(submitSpireVerdict(createSpireStepState(plan), plan, true, 1_000));
    expect(onClassic.taskIndex).toBe(1);
    expect(submitSpireVerdict(onClassic, plan, true, 2_000)).toBe(onClassic);
  });
});
