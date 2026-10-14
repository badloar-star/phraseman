// зачем (D193, владелец 14.10): вместо пейвола по возвращении — окно «С возвращением». Сторож держит правила координатора:
// порог отсутствия как у winback, окно 1 раз на возвращение, серия только живая, главная кнопка — самый лёгкий шаг
// (карточки по сроку → последние сохранённые → урок), не больше 5 карточек.
import {
  WELCOME_BACK_MAX_CARDS,
  WELCOME_BACK_MIN_AWAY_MS,
  decideWelcomeBack,
  decideWelcomeBackPrimary,
  type WelcomeBackInput,
} from '../modules/welcome_back/welcome_back_model';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 14, 12, 0, 0);

function input(over: Partial<WelcomeBackInput> = {}): WelcomeBackInput {
  return {
    nowMs: NOW,
    lastActiveMs: NOW - 10 * DAY,
    shownAtMs: null,
    phrasesLearned: 124,
    coinRank: 3,
    energy: { current: 5, max: 5 },
    aliveStreakDays: null,
    cardsDue: 0,
    cardsSaved: 0,
    currentLessonId: 7,
    ...over,
  };
}

describe('welcome back: when to show', () => {
  it('uses the same 7-day threshold as winback', () => {
    expect(WELCOME_BACK_MIN_AWAY_MS).toBe(7 * DAY);
    expect(decideWelcomeBack(input({ lastActiveMs: NOW - 7 * DAY + 1 }))).toEqual({ show: false, reason: 'recent' });
    expect(decideWelcomeBack(input({ lastActiveMs: NOW - 7 * DAY })).show).toBe(true);
  });

  it('stays hidden without a known last activity', () => {
    expect(decideWelcomeBack(input({ lastActiveMs: null }))).toEqual({ show: false, reason: 'no_last_active' });
    expect(decideWelcomeBack(input({ lastActiveMs: 0 }))).toEqual({ show: false, reason: 'no_last_active' });
  });

  it('shows once per return: already shown after the last activity → hidden', () => {
    const last = NOW - 10 * DAY;
    expect(decideWelcomeBack(input({ lastActiveMs: last, shownAtMs: last + 1000 }))).toEqual({ show: false, reason: 'already_shown' });
  });

  it('a shown mark from an earlier return does not block a new one', () => {
    const last = NOW - 10 * DAY;
    expect(decideWelcomeBack(input({ lastActiveMs: last, shownAtMs: last - 30 * DAY })).show).toBe(true);
  });
});

describe('welcome back: stats are real and honest', () => {
  it('counts whole days away and passes real numbers', () => {
    const d = decideWelcomeBack(input({ lastActiveMs: NOW - 12 * DAY - 5000 }));
    if (!d.show) throw new Error('expected show');
    expect(d.stats).toEqual({ awayDays: 12, phrasesLearned: 124, coinRank: 3, energyFull: true, aliveStreakDays: null });
  });

  it('mentions the streak only while it is alive', () => {
    const burnt = decideWelcomeBack(input({ aliveStreakDays: null }));
    const zero = decideWelcomeBack(input({ aliveStreakDays: 0 }));
    const alive = decideWelcomeBack(input({ aliveStreakDays: 9 }));
    if (!burnt.show || !zero.show || !alive.show) throw new Error('expected show');
    expect(burnt.stats.aliveStreakDays).toBeNull();
    expect(zero.stats.aliveStreakDays).toBeNull();
    expect(alive.stats.aliveStreakDays).toBe(9);
  });

  it('energy unknown stays unknown, partial energy is not full', () => {
    const none = decideWelcomeBack(input({ energy: null }));
    const part = decideWelcomeBack(input({ energy: { current: 2, max: 5 } }));
    if (!none.show || !part.show) throw new Error('expected show');
    expect(none.stats.energyFull).toBeNull();
    expect(part.stats.energyFull).toBe(false);
  });
});

describe('welcome back: primary button is the lightest step', () => {
  it('due cards first, capped at 5', () => {
    expect(decideWelcomeBackPrimary({ cardsDue: 12, cardsSaved: 40, currentLessonId: 7 })).toEqual({ kind: 'cards', count: WELCOME_BACK_MAX_CARDS, source: 'due' });
    expect(decideWelcomeBackPrimary({ cardsDue: 3, cardsSaved: 40, currentLessonId: 7 })).toEqual({ kind: 'cards', count: 3, source: 'due' });
  });

  it('no due cards → the latest saved ones, real count', () => {
    expect(decideWelcomeBackPrimary({ cardsDue: 0, cardsSaved: 2, currentLessonId: 7 })).toEqual({ kind: 'cards', count: 2, source: 'recent_saved' });
  });

  it('no cards at all → continue the lesson', () => {
    expect(decideWelcomeBackPrimary({ cardsDue: 0, cardsSaved: 0, currentLessonId: 7 })).toEqual({ kind: 'lesson', lessonId: 7 });
  });

  it('nothing to continue → home', () => {
    expect(decideWelcomeBackPrimary({ cardsDue: 0, cardsSaved: 0, currentLessonId: null })).toEqual({ kind: 'home' });
  });

  it('broken counts never produce a fake number', () => {
    expect(decideWelcomeBackPrimary({ cardsDue: Number.NaN, cardsSaved: -4, currentLessonId: 7 })).toEqual({ kind: 'lesson', lessonId: 7 });
  });
});
