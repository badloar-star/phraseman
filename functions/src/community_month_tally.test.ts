// зачем (владелец 29.10 ~07:50, 4 ответа по конкурсу): сторож правил подсчёта «Набора месяца» —
// урок = классика ИЛИ Learning V2; возраст = created_at, иначе Firebase Auth; 10 действующих голосов, снятый лайк
// возвращает голос; пересчёт раз в 3 ч, в последние сутки месяца — каждый час. Плюс правила 26.10: только наборы месяца.
import {
  CONTEST_MAX_VOTES_PER_MONTH,
  CONTEST_WIN_STORY_FIELD,
  contestWinStoryValue,
  contestAccountCreatedAtMs,
  contestLessonsCompleted,
  contestStandingsShouldRefresh,
  learningV2CompletedFromMasks,
  tallyContestMonth,
  type TallyPack,
  type TallyVote,
  type TallyVoter,
} from './community_month_tally';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const month = { id: '2026-11', startMs: Date.UTC(2026, 10, 1), endMs: Date.UTC(2026, 11, 1) };
const t = (day: number, hour = 12) => month.startMs + (day - 1) * DAY + hour * HOUR;
const pack = (id: string, over: Partial<TallyPack> = {}): TallyPack => ({
  id, authorId: `author_${id}`, title: `Pack ${id}`, publishedAtMs: t(1, 1), status: 'published', ...over,
});
const vote = (packId: string, voterId: string, atMs: number, liked = true, voteId = `${month.id}_${voterId}`): TallyVote =>
  ({ packId, voterId, liked, atMs, voteId });
const oldVoter: TallyVoter = { createdAtMs: Date.UTC(2026, 0, 1), lessonsCompleted: 3 };
const heartsOf = (r: ReturnType<typeof tallyContestMonth>, id: string) => r.entries.find((e) => e.id === id)?.hearts;

describe('tallyContestMonth — правила 26.10', () => {
  it('участвуют только наборы, опубликованные в этом месяце', () => {
    const r = tallyContestMonth({
      month,
      packs: [pack('old', { publishedAtMs: month.startMs - 1 }), pack('new'), pack('next', { publishedAtMs: month.endMs })],
      votes: [vote('old', 'v1', t(2)), vote('new', 'v1', t(2))],
      voters: new Map([['v1', oldVoter]]),
    });
    expect(r.entries.map((e) => e.id)).toEqual(['new']);
    expect(heartsOf(r, 'new')).toBe(1);
    expect(r.stats.excluded.packNotEligible).toBe(1);
  });

  it('свой набор и голос вне месяца не засчитываются', () => {
    const r = tallyContestMonth({
      month,
      packs: [pack('a')],
      votes: [vote('a', 'author_a', t(2)), vote('a', 'v1', month.endMs + 1)],
      voters: new Map([['author_a', oldVoter], ['v1', oldVoter]]),
    });
    expect(heartsOf(r, 'a')).toBe(0);
    expect(r.stats.excluded.self).toBe(1);
    expect(r.stats.excluded.outsideMonth).toBe(1);
  });
});

describe('правило 1: пройденный урок — любой', () => {
  it('классика: lessons_completed или completed_lessons', () => {
    expect(contestLessonsCompleted({ lessons_completed: '2' })).toBe(2);
    expect(contestLessonsCompleted({ completed_lessons: [1, 2, 3] })).toBe(3);
    expect(contestLessonsCompleted({ completed_lessons: { 1: true } })).toBe(1);
  });
  it('Learning V2: облачная копия числа пройденных занятий', () => {
    expect(contestLessonsCompleted({ learning_v2_course_progress_sync_v1: '1' })).toBe(1);
    expect(contestLessonsCompleted({ learning_v2_course_progress_sync_v1: 'oops' })).toBe(0);
  });
  it('Learning V2 по маске пройденных (начал не с начала): «c» считается, «o» (открыто) — нет', () => {
    expect(learningV2CompletedFromMasks(JSON.stringify({ v: 1, c: '0400', o: 'ffff' }))).toBe(1);
    expect(learningV2CompletedFromMasks(JSON.stringify({ v: 1, c: '0000', o: 'ffff' }))).toBe(0);
    expect(learningV2CompletedFromMasks('{broken')).toBe(0);
    expect(contestLessonsCompleted({ learning_v2_course_masks_sync_v1: JSON.stringify({ v: 1, c: '80' }) })).toBe(1);
  });
  it('только V2, ни одного классического урока → голос засчитан', () => {
    const r = tallyContestMonth({
      month, packs: [pack('a')], votes: [vote('a', 'v2only', t(5))],
      voters: new Map([['v2only', { createdAtMs: Date.UTC(2026, 0, 1), lessonsCompleted: contestLessonsCompleted({ learning_v2_course_progress_sync_v1: '1' }) }]]),
    });
    expect(heartsOf(r, 'a')).toBe(1);
  });
  it('только маска «пройдено» (с середины курса) → засчитан; только «открыто» → НЕ засчитан', () => {
    const voters = new Map<string, TallyVoter>([
      ['mid', { createdAtMs: Date.UTC(2026, 0, 1), lessonsCompleted: contestLessonsCompleted({ learning_v2_course_masks_sync_v1: JSON.stringify({ v: 1, c: '00000010', o: '000000ff' }) }) }],
      ['openedOnly', { createdAtMs: Date.UTC(2026, 0, 1), lessonsCompleted: contestLessonsCompleted({ learning_v2_course_masks_sync_v1: JSON.stringify({ v: 1, c: '00000000', o: '000000ff' }) }) }],
    ]);
    const r = tallyContestMonth({ month, packs: [pack('a')], votes: [vote('a', 'mid', t(5)), vote('a', 'openedOnly', t(5))], voters });
    expect(heartsOf(r, 'a')).toBe(1);
    expect(r.stats.excluded.noLesson).toBe(1);
  });
  it('ничего не пройдено — голос не засчитан (noLesson)', () => {
    const r = tallyContestMonth({
      month, packs: [pack('a')], votes: [vote('a', 'v1', t(5))],
      voters: new Map([['v1', { createdAtMs: Date.UTC(2026, 0, 1), lessonsCompleted: contestLessonsCompleted({}) }]]),
    });
    expect(heartsOf(r, 'a')).toBe(0);
    expect(r.stats.excluded.noLesson).toBe(1);
  });
});

describe('правило 2: возраст аккаунта ≥ 3 дней на момент голоса', () => {
  it('created_at, а если пусто — дата Firebase Auth', () => {
    expect(contestAccountCreatedAtMs(1000, 5)).toBe(1000);
    expect(contestAccountCreatedAtMs(null, 5)).toBe(5);
    expect(contestAccountCreatedAtMs(null, null)).toBeNull();
  });
  it('71 ч — не засчитан, 73 ч — засчитан, неизвестный возраст — не засчитан', () => {
    const at = t(10);
    const r = tallyContestMonth({
      month, packs: [pack('a')],
      votes: [vote('a', 'young', at), vote('a', 'ok', at), vote('a', 'noage', at)],
      voters: new Map<string, TallyVoter>([
        ['young', { createdAtMs: at - 71 * HOUR, lessonsCompleted: 1 }],
        ['ok', { createdAtMs: at - 73 * HOUR, lessonsCompleted: 1 }],
        ['noage', { createdAtMs: null, lessonsCompleted: 1 }],
      ]),
    });
    expect(heartsOf(r, 'a')).toBe(1);
    expect(r.stats.excluded.tooYoung).toBe(2);
  });
});

describe('правило 3: 10 действующих голосов, снятый лайк возвращает голос', () => {
  const packs = Array.from({ length: 12 }, (_, i) => pack(`p${String(i).padStart(2, '0')}`));
  it('12 лайков одного человека — засчитаны 10 самых ранних', () => {
    const votes = packs.map((p, i) => vote(p.id, 'v1', t(2) + i * HOUR));
    const r = tallyContestMonth({ month, packs, votes, voters: new Map([['v1', oldVoter]]) });
    expect(r.stats.counted).toBe(CONTEST_MAX_VOTES_PER_MONTH);
    expect(r.stats.excluded.overCap).toBe(2);
    expect(heartsOf(r, 'p00')).toBe(1);
    expect(heartsOf(r, 'p10')).toBe(0);
    expect(heartsOf(r, 'p11')).toBe(0);
  });
  it('снял один из ранних лайков — 11-й становится действующим', () => {
    const votes = [
      ...packs.map((p, i) => vote(p.id, 'v1', t(2) + i * HOUR)),
      vote('p03', 'v1', t(3), false), // снят позже — последнее состояние «не нравится»
    ];
    const r = tallyContestMonth({ month, packs, votes, voters: new Map([['v1', oldVoter]]) });
    expect(heartsOf(r, 'p03')).toBe(0);
    expect(heartsOf(r, 'p10')).toBe(1);
    expect(heartsOf(r, 'p11')).toBe(0);
    expect(r.stats.counted).toBe(10);
    expect(r.stats.excluded.unliked).toBe(1);
  });
  it('снял и поставил снова — голос уходит в конец очереди', () => {
    const votes = [
      ...packs.map((p, i) => vote(p.id, 'v1', t(2) + i * HOUR)),
      vote('p00', 'v1', t(4), true),
    ];
    const r = tallyContestMonth({ month, packs, votes, voters: new Map([['v1', oldVoter]]) });
    expect(heartsOf(r, 'p00')).toBe(0);
    expect(heartsOf(r, 'p10')).toBe(1);
  });
  it('лимит у каждого человека свой', () => {
    const votes = [...packs.map((p, i) => vote(p.id, 'v1', t(2) + i * HOUR)), vote('p11', 'v2', t(2))];
    const r = tallyContestMonth({ month, packs, votes, voters: new Map([['v1', oldVoter], ['v2', oldVoter]]) });
    expect(heartsOf(r, 'p11')).toBe(1);
  });
});

describe('история победителю (владелец 29.10, макет Моментов)', () => {
  it('одна строка JSON: место, месяц, месяцев Plus, название, голоса; длинное название режется', () => {
    const raw = contestWinStoryValue({ monthId: '2026-11', place: 2, plusMonths: 2, packId: 'p1', packTitle: `  ${'Я'.repeat(200)} `, hearts: 17.9, grantedAtMs: 123 });
    const parsed = JSON.parse(raw);
    expect(parsed).toMatchObject({ v: 1, monthId: '2026-11', place: 2, plusMonths: 2, packId: 'p1', hearts: 17, grantedAtMs: 123 });
    expect(parsed.packTitle).toHaveLength(120);
    expect(CONTEST_WIN_STORY_FIELD).toBe('contest_last_win');
  });
});

describe('правило 4: пересчёт раз в 3 ч, в последние сутки — каждый час', () => {
  it('обычный день: только часы, кратные 3', () => {
    expect(contestStandingsShouldRefresh(t(10, 3), month)).toBe(true);
    expect(contestStandingsShouldRefresh(t(10, 4), month)).toBe(false);
    expect(contestStandingsShouldRefresh(t(10, 5), month)).toBe(false);
    expect(contestStandingsShouldRefresh(t(10, 6), month)).toBe(true);
  });
  it.each([
    ['февраль 28 дней', 2027, 1],
    ['февраль 29 дней', 2028, 1],
    ['апрель 30 дней', 2027, 3],
    ['декабрь 31 день', 2026, 11],
  ])('граница суток: %s', (_label, year, monthIndex) => {
    const m = { id: `${year}-${String(monthIndex + 1).padStart(2, '0')}`, startMs: Date.UTC(year, monthIndex, 1), endMs: Date.UTC(year, monthIndex + 1, 1) };
    // ровно за 24 ч до конца — уже «последние сутки», час 00 UTC
    expect(contestStandingsShouldRefresh(m.endMs - 24 * HOUR, m)).toBe(true);
    // за 24 ч + 1 мин, 23:59 UTC накануне: час 23 не кратен 3 → пропуск
    expect(contestStandingsShouldRefresh(m.endMs - 24 * HOUR - 60_000, m)).toBe(false);
    // за 25 ч — 23:00 накануне → пропуск; за 27 ч — 21:00 → пересчёт (кратно 3)
    expect(contestStandingsShouldRefresh(m.endMs - 25 * HOUR, m)).toBe(false);
    expect(contestStandingsShouldRefresh(m.endMs - 27 * HOUR, m)).toBe(true);
    // последний час месяца — пересчёт
    expect(contestStandingsShouldRefresh(m.endMs - 1, m)).toBe(true);
  });
  it('последние 24 часа месяца: каждый час', () => {
    expect(contestStandingsShouldRefresh(month.endMs - 23 * HOUR, month)).toBe(true);
    expect(contestStandingsShouldRefresh(month.endMs - 1 * HOUR, month)).toBe(true);
    expect(contestStandingsShouldRefresh(month.endMs - 25 * HOUR, month)).toBe(false);
  });
});
