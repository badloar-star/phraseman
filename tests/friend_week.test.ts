// зачем (идея 6 «Итог недели друга», закон владельца «телефон решает и выдаёт сразу, сервер только хранит записи»): своя неделя
// считается на телефоне и кладётся одной записью friends_week_v1; друг видит прошлую неделю — даже если я уже открыл новую.
import {
  addWeekDays,
  friendWeekToShow,
  isoWeekKeyUtc,
  nextMyFriendWeekRecord,
  parseFriendWeekRecord,
  serializeFriendWeekRecord,
  streakEndingAt,
  summarizeFriendWeek,
  weekStartOf,
  type FriendWeekRecord,
} from '../app/friends_together/friend_week';

describe('friend week arithmetic', () => {
  it('понедельник недели — для любого дня, через границы месяца и года', () => {
    expect(weekStartOf('2026-10-19')).toBe('2026-10-19'); // понедельник
    expect(weekStartOf('2026-10-25')).toBe('2026-10-19'); // воскресенье
    expect(weekStartOf('2026-11-01')).toBe('2026-10-26');
    expect(weekStartOf('2027-01-01')).toBe('2026-12-28');
    expect(addWeekDays('2026-10-26', -7)).toBe('2026-10-19');
    expect(addWeekDays('2026-03-29', 1)).toBe('2026-03-30'); // перевод часов в Европе
  });

  it('итог недели: сумма занятий, дни с занятиями или активностью, лучший день (при равенстве — более поздний)', () => {
    const week = summarizeFriendWeek({
      week: '2026-10-19',
      lessonsByDay: { '2026-10-18': 9, '2026-10-19': 2, '2026-10-23': 3, '2026-10-25': 3, '2026-10-26': 7 },
      activeDays: new Set(['2026-10-20', '2026-10-23']),
      streak: 48,
      floor: 7,
    });
    expect(week).toEqual({ week: '2026-10-19', streak: 48, lessons: 8, days: 4, floor: 7, best: { dow: 6, lessons: 3 } });
  });

  it('серия на конец дня — подряд идущие активные дни назад', () => {
    const days = new Set(['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-21']);
    expect(streakEndingAt(days, '2026-10-25')).toBe(3);
    expect(streakEndingAt(days, '2026-10-22')).toBe(0);
  });

  it('новая неделя: идущая становится закрытой — пересчитана по дням, серия и этаж — из прежней записи', () => {
    const stored: FriendWeekRecord = {
      v: 1,
      hidden: true,
      cur: { week: '2026-10-19', streak: 40, lessons: 5, days: 3, floor: 6, best: { dow: 2, lessons: 3 } },
      prev: null,
    };
    const next = nextMyFriendWeekRecord({
      todayKey: '2026-10-26',
      stored,
      // в воскресенье после последнего обновления — ещё 4 занятия
      lessonsByDay: { '2026-10-19': 1, '2026-10-21': 3, '2026-10-22': 1, '2026-10-25': 4, '2026-10-26': 2 },
      activeDays: new Set(['2026-10-19', '2026-10-21', '2026-10-22', '2026-10-25', '2026-10-26']),
      streakNow: 2,
      floorThisWeek: 1,
    });
    expect(next.hidden).toBe(true);
    expect(next.cur).toEqual({ week: '2026-10-26', streak: 2, lessons: 2, days: 1, floor: 1, best: { dow: 0, lessons: 2 } });
    expect(next.prev).toEqual({ week: '2026-10-19', streak: 40, lessons: 9, days: 4, floor: 6, best: { dow: 6, lessons: 4 } });
  });

  it('пропущенная неделя целиком — закрытой нет, старая запись не выдаётся за прошлую неделю', () => {
    const next = nextMyFriendWeekRecord({
      todayKey: '2026-11-02',
      stored: { v: 1, hidden: false, cur: { week: '2026-10-19', streak: 9, lessons: 4, days: 2, floor: null, best: null }, prev: null },
      lessonsByDay: {},
      activeDays: new Set(),
      streakNow: 0,
      floorThisWeek: null,
    });
    expect(next.prev).toBeNull();
    expect(friendWeekToShow(next, '2026-11-02')).toBeNull();
  });

  it('что видит друг: его прошлая неделя из prev, а если друг ещё не открывал новую — из cur; скрытая — ничего', () => {
    const w = (week: string) => ({ week, streak: 3, lessons: 2, days: 2, floor: null, best: null });
    expect(friendWeekToShow({ v: 1, hidden: false, cur: w('2026-10-26'), prev: w('2026-10-19') }, '2026-10-27')?.week).toBe('2026-10-19');
    expect(friendWeekToShow({ v: 1, hidden: false, cur: w('2026-10-19'), prev: null }, '2026-10-26')?.week).toBe('2026-10-19');
    expect(friendWeekToShow({ v: 1, hidden: true, cur: w('2026-10-26'), prev: w('2026-10-19') }, '2026-10-27')).toBeNull();
    expect(friendWeekToShow({ v: 1, hidden: false, cur: w('2026-10-12'), prev: w('2026-10-05') }, '2026-10-27')).toBeNull();
  });

  it('чужая запись разбирается строго: не понедельник, мусор и чужая версия — отброшены, числа в границах', () => {
    const good = { week: '2026-10-19', streak: 48, lessons: 9, days: 5, floor: 7, best: { dow: 4, lessons: 3 } };
    expect(parseFriendWeekRecord(JSON.stringify({ v: 1, cur: good, prev: null }))?.cur).toEqual(good);
    expect(parseFriendWeekRecord({ v: 1, cur: { ...good, week: '2026-10-20' }, prev: null })).toBeNull();
    expect(parseFriendWeekRecord({ v: 2, cur: good })).toBeNull();
    expect(parseFriendWeekRecord('{oops')).toBeNull();
    const clamped = parseFriendWeekRecord({ v: 1, cur: { ...good, days: 40, streak: -5, lessons: 1e9, floor: 0, best: { dow: 9, lessons: 2 } } });
    expect(clamped?.cur).toEqual({ week: '2026-10-19', streak: 0, lessons: 2000, days: 7, floor: null, best: null });
  });

  it('одинаковая запись — одинаковая строка: без лишних записей в хранилище и синхронизацию', () => {
    const a: FriendWeekRecord = { v: 1, hidden: false, cur: { week: '2026-10-19', streak: 1, lessons: 1, days: 1, floor: null, best: { dow: 0, lessons: 1 } }, prev: null };
    const b = parseFriendWeekRecord(serializeFriendWeekRecord(a));
    expect(b && serializeFriendWeekRecord(b)).toBe(serializeFriendWeekRecord(a));
  });

  it('ключ недели Пика — ISO-неделя UTC, как у сервера', () => {
    expect(isoWeekKeyUtc(Date.UTC(2026, 9, 22, 12))).toBe('2026-W43');
    expect(isoWeekKeyUtc(Date.UTC(2027, 0, 1, 12))).toBe('2026-W53');
  });
});
