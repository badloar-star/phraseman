import {
  judgePlanOutcome,
  OUTCOME_CHECK_DELAY_MS,
  summarizeTopicFeedback,
  type PlanOutcomeInput,
} from './plan_outcome';
import type { JarvisPlan } from './jarvis_plans';

const DAY = 24 * 60 * 60 * 1_000;

function plan(over: Partial<JarvisPlan> = {}): JarvisPlan {
  return {
    id: 'topic-1',
    topicKey: 'topic-1',
    contentHash: 'c1',
    department: 'quality',
    question: 'Вопрос',
    finding: '125 ошибок',
    hypothesis: 'Гипотеза',
    options: [],
    recommendation: 'Рекомендация',
    risk: 'Риск',
    cost: 0,
    successMetric: 'Метрика',
    rollback: 'Откат',
    confidence: 0.8,
    narrative: null,
    status: 'accepted',
    acceptedAtMs: 1_000,
    createdAtMs: 1_000,
    updatedAtMs: 1_000,
    ...over,
  } as JarvisPlan;
}

function input(over: Partial<PlanOutcomeInput> = {}): PlanOutcomeInput {
  return {
    plan: plan(),
    stillObserved: false,
    nowMs: 1_000 + OUTCOME_CHECK_DELAY_MS,
    ...over,
  };
}

describe('Jarvis plan outcome — проверка, сработал ли принятый совет', () => {
  test('проблема ушла после согласия — сработало', () => {
    // зачем именно так (владелец 2026-08-15, «не учится»): результат принятого
    // совета не проверялся никогда, поэтому у системы не было ни одного
    // сигнала, отличающего хороший совет от плохого.
    expect(judgePlanOutcome(input()).verdict).toBe('worked');
  });

  test('проблема осталась через неделю — не сработало', () => {
    expect(judgePlanOutcome(input({ stillObserved: true })).verdict).toBe('did_not_work');
  });

  test('неделя ещё не прошла — вердикт откладывается', () => {
    // зачем: судить назавтра нечестно — изменения не успевают проявиться.
    const early = judgePlanOutcome(input({ nowMs: 1_000 + DAY }));
    expect(early.verdict).toBe('too_early');
  });

  test('судим только принятое: открытое и отклонённое не проверяем', () => {
    for (const status of ['open', 'archived', 'resolved', 'vanished'] as const) {
      expect(judgePlanOutcome(input({ plan: plan({ status }) })).verdict).toBe('not_applicable');
    }
  });

  test('без отметки о согласии судить не по чему', () => {
    // зачем: отсчёт недели идёт от согласия. Нет времени согласия —
    // нет и точки отсчёта, выдумывать её нельзя.
    const noStamp = plan({ acceptedAtMs: undefined });
    expect(judgePlanOutcome(input({ plan: noStamp })).verdict).toBe('not_applicable');
  });

  test('вердикт несёт новый статус плана', () => {
    expect(judgePlanOutcome(input()).nextStatus).toBe('resolved');
    expect(judgePlanOutcome(input({ stillObserved: true })).nextStatus).toBe('open');
  });

  test('задержка проверки — неделя, а не часы', () => {
    expect(OUTCOME_CHECK_DELAY_MS).toBeGreaterThanOrEqual(7 * DAY);
  });
});

describe('Jarvis topic feedback — что система знает о реакции владельца', () => {
  test('три отказа подряд по теме — тема выдохлась', () => {
    // зачем: раньше считалось, сколько раз СИСТЕМА написала, а не сколько раз
    // владелец сказал «нет». Отказ давал молчание на три дня и заход на второй
    // круг — бесконечно.
    const fb = summarizeTopicFeedback({ rejections: 3, acceptances: 0, worked: 0, didNotWork: 0 });
    expect(fb.exhausted).toBe(true);
  });

  test('два отказа — ещё не выдохлась', () => {
    expect(summarizeTopicFeedback({ rejections: 2, acceptances: 0, worked: 0, didNotWork: 0 }).exhausted)
      .toBe(false);
  });

  test('согласие обнуляет счёт отказов: тема снова живая', () => {
    // зачем: владелец мог отказываться, пока было не до того, а потом принять.
    // Считать старые «нет» после этого — значит глушить тему, которая нужна.
    const fb = summarizeTopicFeedback({ rejections: 3, acceptances: 1, worked: 0, didNotWork: 0 });
    expect(fb.exhausted).toBe(false);
  });

  test('совет, который дважды не сработал, теряет доверие', () => {
    const fb = summarizeTopicFeedback({ rejections: 0, acceptances: 2, worked: 0, didNotWork: 2 });
    expect(fb.trustworthy).toBe(false);
  });

  test('сработавший совет доверие сохраняет', () => {
    const fb = summarizeTopicFeedback({ rejections: 0, acceptances: 2, worked: 2, didNotWork: 0 });
    expect(fb.trustworthy).toBe(true);
  });

  test('без истории тема считается живой и доверенной', () => {
    const fb = summarizeTopicFeedback({ rejections: 0, acceptances: 0, worked: 0, didNotWork: 0 });
    expect(fb.exhausted).toBe(false);
    expect(fb.trustworthy).toBe(true);
  });
});
