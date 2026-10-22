// зачем (идея 6 «Итог недели друга», макет docs/design/v2-app/friends-full.html #week): кого показать в ленте «Итоги недели» —
// чистая функция над снапшотом пар (0 чтений). Итоги «выходят» в понедельник 9:00; карточка занятий — у друга была активность на
// прошлой неделе; «без занятий · Позвать» — раньше занимался, а прошлую неделю пропустил; без записи и новичков — не выдумываем.
import { buildFriendWeekRail, FRIEND_WEEK_RAIL_HOUR } from '../app/friends_together/friend_week_rail';
import { encodeActiveDays } from '../app/friends_together/together_days';
import type { FriendWeekRecord, FriendWeekSummary } from '../app/friends_together/friend_week';
import type { FriendTogetherPairState } from '../app/friends_together/together_store';
import {
  bestDayValue,
  factLessons,
  factStreakDays,
  lineFloorsUp,
  weekCopy,
  weekDetailTitle,
  weekRangeLabel,
  weekdayName,
} from '../app/friends_together/friend_week_copy';

const friend = (uid: string) => ({ uid, name: uid, coinRank: 3, isPlus: false });
const week = (w: string, patch: Partial<FriendWeekSummary> = {}): FriendWeekSummary => ({
  week: w, streak: 9, lessons: 6, days: 4, floor: 7, rise: 2, best: { dow: 4, lessons: 3 }, ...patch,
});
const pair = (uid: string, record: FriendWeekRecord | null, activeDays: readonly string[]): FriendTogetherPairState => ({
  friendUid: uid, days: 10, level: 2, todayCommon: false, week: record, friendActiveDays: encodeActiveDays(activeDays, '2026-10-27'),
});

// вторник 27.10.2026 — показываемая неделя 19–25 октября
const TUE = new Date(2026, 9, 27, 12, 0, 0);

describe('buildFriendWeekRail', () => {
  it('до понедельника 9:00 итогов нет, с 9:00 — есть', () => {
    const pairs = { a: pair('a', { v: 1, hidden: false, cur: null, prev: week('2026-10-19') }, ['2026-10-20']) };
    expect(buildFriendWeekRail([friend('a')], pairs, new Date(2026, 9, 26, FRIEND_WEEK_RAIL_HOUR - 1, 59)).open).toBe(false);
    const rail = buildFriendWeekRail([friend('a')], pairs, new Date(2026, 9, 26, FRIEND_WEEK_RAIL_HOUR, 0));
    expect(rail.open).toBe(true);
    expect(rail.week).toBe('2026-10-19');
    expect(rail.cards.map((c) => c.kind)).toEqual(['active']);
  });

  it('занимался → карточка; пропустил прошлую неделю, а раньше занимался → «без занятий»; без записи и новичок — нет', () => {
    const pairs = {
      active: pair('active', { v: 1, hidden: false, cur: week('2026-10-19'), prev: null }, ['2026-10-21']),
      rested: pair('rested', { v: 1, hidden: false, cur: week('2026-10-26', { lessons: 1, days: 1 }), prev: null }, ['2026-10-10', '2026-10-26']),
      noRecord: pair('noRecord', null, ['2026-10-21']),
      newbie: pair('newbie', { v: 1, hidden: false, cur: week('2026-10-26', { lessons: 1, days: 1 }), prev: null }, ['2026-10-26']),
    };
    const rail = buildFriendWeekRail([friend('active'), friend('rested'), friend('noRecord'), friend('newbie')], pairs, TUE);
    expect(rail.cards.map((c) => `${c.uid}:${c.kind}`)).toEqual(['active:active', 'rested:rested']);
  });
});

describe('friend week copy', () => {
  it('числа склоняются по-славянски, en — ед. и мн. число', () => {
    expect([1, 3, 5, 21].map((n) => factLessons('ru', n))).toEqual(['занятие', 'занятия', 'занятий', 'занятие']);
    expect([1, 2, 5].map((n) => factStreakDays('ru', n))).toEqual(['день серии', 'дня серии', 'дней серии']);
    expect([1, 2, 5].map((n) => factLessons('pl', n))).toEqual(['zajęcie', 'zajęcia', 'zajęć']);
    expect(factLessons('en', 1)).toBe('lesson');
    expect(lineFloorsUp('ru', 2)).toBe('+2 этажа Пика за неделю');
    expect(lineFloorsUp('en', 1)).toBe('+1 Peak floor this week');
  });

  it('даты недели и день недели — через Intl, имя не склоняется', () => {
    expect(weekRangeLabel('ru', '2026-10-19')).toBe('19–25 октября');
    expect(weekRangeLabel('en', '2026-10-19')).toBe('October 19–25');
    expect(weekRangeLabel('ru', '2026-10-26')).toBe('26 октября – 1 ноября');
    expect(weekdayName('ru', '2026-10-19', 4)).toBe('Пятница');
    expect(bestDayValue('ru', 'Пятница', 3)).toBe('Пятница · 3 занятия');
    expect(weekDetailTitle('ru', 'Ирина')).toBe('Неделя · Ирина');
  });

  it('все тексты есть на 9 языках', () => {
    const langs = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
    for (const lang of langs) {
      for (const key of ['railTitle', 'railWhen', 'rested', 'factPeakFloor', 'bestDay', 'challengeDuel', 'highFiveToast', 'emptyTitle', 'emptySub', 'noGaps'] as const) {
        expect({ lang, key, text: weekCopy(lang, key).trim().length > 0 }).toEqual({ lang, key, text: true });
      }
    }
  });
});
