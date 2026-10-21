// зачем (идея 1 «Серия вдвоём», владелец 21.10): огонь пары считается на телефоне из active_days_v1 обоих —
// сторож держит правила макета friends-full.html#streak: оба сегодня — горит; один — ждёт до полуночи; пропуск — с нуля;
// «прервалась» видна неделю и только для серии от двух дней; вехи 7 · 30 · 100.
import { encodeActiveDays } from '../app/friends_together/together_days';
import { computePairStreak, pairFlameStage, pairStreakMilestoneReached } from '../app/friends_together/pair_streak';
import { addLocalDays } from '../app/local_date';

const TODAY = '2026-10-21'; // среда
const days = (...back: number[]) => encodeActiveDays(back.map((n) => addLocalDays(TODAY, -n)), TODAY);
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('серия вдвоём', () => {
  it('оба сегодня и подряд 12 дней — горит, серия 12', () => {
    const v = computePairStreak(days(...range(0, 11)), days(...range(0, 11)), TODAY);
    expect(v.state).toBe('both_today');
    expect(v.streak).toBe(12);
    expect(v.best).toBe(12);
  });

  it('я сегодня, друг нет — огонь ждёт со вчерашней длиной, «Позвать»', () => {
    const v = computePairStreak(days(...range(0, 7)), days(...range(1, 7)), TODAY);
    expect(v.state).toBe('friend_pending');
    expect(v.streak).toBe(7);
  });

  it('друг сегодня, я нет — «Ждёт тебя»', () => {
    const v = computePairStreak(days(...range(1, 3)), days(...range(0, 3)), TODAY);
    expect(v.state).toBe('me_pending');
    expect(v.streak).toBe(3);
  });

  it('сегодня никто, но вчера оба — серия жива, ждёт', () => {
    const v = computePairStreak(days(1, 2), days(1, 2), TODAY);
    expect(v.state).toBe('none_today');
    expect(v.streak).toBe(2);
  });

  it('пропущен вчерашний день — серия с нуля, «прервалась» с длиной оборванной серии', () => {
    const v = computePairStreak(days(2, 3, 4, 5), days(2, 3, 4, 5), TODAY);
    expect(v.state).toBe('broken');
    expect(v.streak).toBe(0);
    expect(v.lostStreak).toBe(4);
  });

  it('оборвалась больше недели назад — обычная подпись', () => {
    const v = computePairStreak(days(10, 11, 12), days(10, 11, 12), TODAY);
    expect(v.state).toBe('none');
    expect(v.best).toBe(3);
  });

  it('один общий день и обрыв — не серия, «прервалась» не показываем', () => {
    expect(computePairStreak(days(3), days(3), TODAY).state).toBe('none');
  });

  it('нет данных у друга — без огня, ничего не выдумываем', () => {
    const v = computePairStreak(days(0, 1), null, TODAY);
    expect(v.state).toBe('none');
    expect(v.streak).toBe(0);
  });

  it('неделя с понедельника: оба / один / никто, сегодня и будущее', () => {
    const v = computePairStreak(days(0, 1), days(1), TODAY);
    expect(v.week.map((d) => d.dayKey)).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
    expect(v.week[1]).toMatchObject({ mine: true, friend: true, today: false, future: false });
    expect(v.week[2]).toMatchObject({ mine: true, friend: false, today: true, future: false });
    expect(v.week[3].future).toBe(true);
  });

  it('веха празднуется в момент, когда огонь зажёгся у обоих', () => {
    const v = computePairStreak(days(...range(0, 29)), days(...range(0, 29)), TODAY);
    expect(pairStreakMilestoneReached(29, v)).toBe(30);
    expect(pairStreakMilestoneReached(30, v)).toBeNull();
    const pending = computePairStreak(days(...range(0, 29)), days(...range(1, 29)), TODAY);
    expect(pairStreakMilestoneReached(28, pending)).toBeNull();
  });

  it('стадии огня как у личной серии', () => {
    expect(pairFlameStage(12)).toBe('base');
    expect(pairFlameStage(30)).toBe('blue');
    expect(pairFlameStage(100)).toBe('white');
  });
});
