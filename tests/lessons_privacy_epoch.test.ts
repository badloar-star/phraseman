// зачем (B1, §AUTH-0070, п.73): за вход в аккаунт вкладка уроков пересобирается ровно 2 раза, а не 7; крышка держится всю смену; сбой подписки закрывает вкладку.
import {
  applyLessonsReconcile, computeLessonsCover, decideLessonsEpoch, failClosedLessons, nextActivatedEpoch, type LessonsPrivacyState,
} from '../app/lessons_privacy_epoch';

type Tok = { generation: number; phase: 'uninitialized' | 'active' | 'transitioning'; stableId: string | null };
const tok = (generation: number, phase: Tok['phase'], stableId: string | null): Tok => ({ generation, phase, stableId });

/** Прогон событий через редьюсер так, как это делает LessonsPaneBoundary: возвращает число пересборок и признак крышки после каждого шага. */
function run(events: readonly Tok[], start: Tok) {
  let state: LessonsPrivacyState = { epoch: 0, phase: start.phase, failClosed: false };
  let activated = 0;
  let previous = start;
  let rebuilds = 0;
  const covers: boolean[] = [];
  const reasons: string[] = [];
  activated = nextActivatedEpoch(state, activated);
  for (const next of events) {
    const { state: after, decision } = applyLessonsReconcile(state, previous, next);
    if (after.epoch !== state.epoch) rebuilds += 1;
    reasons.push(`${decision.bump ? 'bump' : 'skip'}:${decision.reason}`);
    state = after;
    previous = next;
    activated = nextActivatedEpoch(state, activated);
    covers.push(computeLessonsCover(state, activated));
  }
  return { state, rebuilds, covers, reasons };
}

describe('эпоха вкладки уроков (B1)', () => {
  it('active → смена×5 → active(новый) = ровно 2 пересборки, крышка закрыта на всей смене и снята на новом active', () => {
    const events: Tok[] = [
      tok(2, 'transitioning', 'A'), tok(3, 'transitioning', 'A'), tok(4, 'transitioning', null), tok(5, 'transitioning', null), tok(6, 'transitioning', null),
      tok(7, 'active', 'B'),
    ];
    const r = run(events, tok(1, 'active', 'A'));
    expect(r.rebuilds).toBe(2);
    expect(r.reasons).toEqual(['bump:left_active', 'skip:transition_step', 'skip:transition_step', 'skip:transition_step', 'skip:transition_step', 'bump:new_active']);
    expect(r.covers.slice(0, 5)).toEqual([true, true, true, true, true]);
    expect(r.covers[5]).toBe(false);
  });

  it('тот же владелец после отменённой смены тоже даёт новый active (2 пересборки), старые данные не переживают', () => {
    const r = run([tok(2, 'transitioning', 'A'), tok(3, 'active', 'A')], tok(1, 'active', 'A'));
    expect(r.rebuilds).toBe(2);
    expect(r.reasons[1]).toBe('bump:new_active');
  });

  it('первое усыновление владельца и повтор того же active эпоху не растят, фазу записывают', () => {
    const r = run([tok(1, 'active', 'A'), tok(2, 'active', 'A')], tok(0, 'uninitialized', null));
    expect(r.rebuilds).toBe(0);
    expect(r.state.phase).toBe('active');
    expect(r.covers).toEqual([false, false]);
  });

  it('смена владельца напрямую (active A → active B) пересобирает один раз', () => {
    const r = run([tok(2, 'active', 'B')], tok(1, 'active', 'A'));
    expect(r.rebuilds).toBe(1);
    expect(r.reasons[0]).toBe('bump:new_active_owner');
  });

  it('смена с холодного старта (uninitialized → transitioning → active) закрыта крышкой по фазе и пересобирается один раз', () => {
    const r = run([tok(1, 'transitioning', null), tok(2, 'transitioning', null), tok(3, 'active', 'B')], tok(0, 'uninitialized', null));
    expect(r.rebuilds).toBe(1);
    expect(r.covers).toEqual([true, true, false]);
  });

  it('уход в uninitialized после active держит крышку до нового active', () => {
    const r = run([tok(2, 'uninitialized', null), tok(3, 'uninitialized', null), tok(4, 'active', 'B')], tok(1, 'active', 'A'));
    expect(r.covers).toEqual([true, true, false]);
    expect(r.rebuilds).toBe(2);
  });

  it('сбой подписки закрывает вкладку навсегда', () => {
    const closed = failClosedLessons({ epoch: 3, phase: 'active', failClosed: false });
    expect(closed).toEqual({ epoch: 4, phase: 'transitioning', failClosed: true });
    expect(computeLessonsCover(closed, 4)).toBe(true);
    expect(nextActivatedEpoch({ ...closed, phase: 'active' }, 0)).toBe(0);
  });

  it('решение для каждого перехода имеет причину (для лога [LESSONS-EPOCH])', () => {
    expect(decideLessonsEpoch(tok(1, 'active', 'A'), tok(1, 'active', 'A')).reason).toBe('same_active_owner');
    expect(decideLessonsEpoch(tok(1, 'transitioning', null), tok(1, 'transitioning', null)).reason).toBe('duplicate_event');
  });
});
