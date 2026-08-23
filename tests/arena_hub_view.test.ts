import {
  ARENA_HUB_FRIENDS_LIMIT,
  arenaHubFriends,
  arenaHubActionBlock,
  arenaHubModel,
} from '../modules/arena/hub_view';
import { arenaText } from '../modules/arena/copy';
import { ARENA_GOAL_TARGETS } from '../modules/arena/daily_goals';

/**
 * Главный экран Арены.
 *
 * Владелец (D-31): живой и информативный, а не список ссылок. Список ссылок
 * плох тем, что не меняется: игрок видит одно и то же в понедельник и в
 * пятницу и перестаёт открывать. Живой экран отвечает на «что у меня сейчас».
 */

const today = '2026-08-13';

const receipt = (over: Record<string, unknown> = {}) => ({
  matchId: 'm1',
  mode: 'ranked',
  outcome: 'win',
  settledAtMs: 1_700_000_000_000,
  reward: { starsEarned: 12, xpEarned: 40, ratingDelta: 20, rankAfter: 3 },
  ...over,
});

const friend = (stableUid: string, rating: number, you = false) => ({ stableUid, rating, you });

describe('карточка ранга', () => {
  it('показывает звёзды ранга и победы до следующего', () => {
    // Звёздная шкала (2026-08-23): 4 звезды = второй ранг, одна из трёх горит.
    const model = arenaHubModel({ rating: 4 });
    expect(model.rank!.starsInRank).toBe(1);
    expect(model.rank!.starsPerRank).toBe(3);
    expect(model.rank!.progress).toBeCloseTo(1 / 3, 3);
    expect(model.rank!.winsToNextRank).toBe(2);
  });

  it('на вершине не обещает следующего деления', () => {
    const model = arenaHubModel({ rating: 999_999 });
    expect(model.rank!.top).toBe(true);
    expect(model.rank!.winsToNextRank).toBe(0);
  });

  it('не выдумывает Bronze и ноль звёзд из неизвестного рейтинга', () => {
    for (const rating of [null, undefined, NaN, -100, 'много']) {
      const model = arenaHubModel({ rating });
      expect(model.rank).toBeNull();
    }
  });

  it('сохраняет реальный нулевой рейтинг известным', () => {
    const model = arenaHubModel({ rating: 0 });
    expect(model.rank).not.toBeNull();
    expect(model.rank!.starsInRank).toBe(0);
  });
});

describe('цели дня на главном', () => {
  it('считаются от сегодняшних счётчиков', () => {
    const model = arenaHubModel({
      dailyDayKey: today, todayKey: today,
      dailyMatches: ARENA_GOAL_TARGETS.play, dailyFirstAnswers: 0, dailyWins: 0,
    });
    expect(model.goals!.goals[0].complete).toBe(true);
    expect(model.goals!.allComplete).toBe(false);
  });

  it('вчерашние счётчики сегодня не считаются', () => {
    const model = arenaHubModel({
      dailyDayKey: '2026-08-12', todayKey: today, dailyMatches: 99, dailyFirstAnswers: 99, dailyWins: 99,
    });
    expect(model.goals!.completedCount).toBe(0);
  });

  it('не выдумывает дневные цели без ключа сегодняшнего дня', () => {
    expect(arenaHubModel({ todayKey: '' }).goals).toBeNull();
    expect(arenaHubModel({}).goals).toBeNull();
  });

  it('не подменяет отсутствующие счётчики нулевыми целями', () => {
    expect(arenaHubModel({ dailyDayKey: today, todayKey: today }).goals).toBeNull();
  });
});

describe('последний матч и серия', () => {
  it('отдаёт плотную сводку только из реальных расписок', () => {
    const model = arenaHubModel({
      wins: 14,
      losses: 6,
      historyKnown: true,
      historyRaw: [
        receipt({ matchId: 'w', outcome: 'win', settledAtMs: 300 }),
        receipt({ matchId: 'l', outcome: 'loss', settledAtMs: 200 }),
        receipt({ matchId: 'd', outcome: 'draw', settledAtMs: 100 }),
      ],
    });
    expect(model.stats).toEqual({ wins: 14, losses: 6 });
    expect(arenaHubModel({}).stats).toBeNull();
  });

  it('берётся самый свежий', () => {
    const model = arenaHubModel({
      historyRaw: [
        receipt({ matchId: 'old', settledAtMs: 100 }),
        receipt({ matchId: 'fresh', settledAtMs: 900 }),
      ],
    });
    expect(model.lastMatch!.matchId).toBe('fresh');
  });

  it('без матчей ничего не выдумывает', () => {
    const model = arenaHubModel({});
    expect(model.lastMatch).toBeNull();
    expect(model.streak).toBeNull();
  });

  it('битые расписки не становятся последним матчем', () => {
    const model = arenaHubModel({ historyRaw: [null, { matchId: 'broken' }, 'мусор'] });
    expect(model.lastMatch).toBeNull();
  });

  it('серия побед считается от свежего', () => {
    const model = arenaHubModel({
      historyKnown: true,
      historyRaw: [
        receipt({ matchId: 'a', outcome: 'win', settledAtMs: 300 }),
        receipt({ matchId: 'b', outcome: 'win', settledAtMs: 200 }),
        receipt({ matchId: 'c', outcome: 'loss', settledAtMs: 100 }),
      ],
    });
    expect(model.streak).toBe(2);
  });
});

describe('друзья вокруг себя', () => {
  /**
   * Первые три строки полезны только тому, кто в них есть. Всем остальным они
   * говорят «ты не здесь» — и это единственное, что они говорят.
   */
  it('окно центрируется на своей строке, а не на верхушке', () => {
    const rows = [
      friend('a', 900), friend('b', 800), friend('c', 700),
      friend('me', 600, true), friend('e', 500), friend('f', 400),
    ];
    const window = arenaHubFriends(rows, 3);
    expect(window.map((row) => row.stableUid)).toEqual(['c', 'me', 'e']);
    expect(window.find((row) => row.you)!.place).toBe(4);
  });

  it('у верхнего края окно прижимается, а не обрезается', () => {
    const rows = [friend('me', 900, true), friend('b', 800), friend('c', 700), friend('d', 600)];
    const window = arenaHubFriends(rows, 3);
    expect(window.length).toBe(3);
    expect(window[0].stableUid).toBe('me');
  });

  it('у нижнего края окно тоже остаётся полным', () => {
    const rows = [friend('a', 900), friend('b', 800), friend('c', 700), friend('me', 600, true)];
    const window = arenaHubFriends(rows, 3);
    expect(window.length).toBe(3);
    expect(window[window.length - 1].stableUid).toBe('me');
  });

  it('места нумеруются по всей таблице, а не по окну', () => {
    const rows = [
      friend('a', 900), friend('b', 800), friend('c', 700),
      friend('me', 600, true), friend('e', 500),
    ];
    expect(arenaHubFriends(rows, 3).map((row) => row.place)).toEqual([3, 4, 5]);
  });

  it('одинокий игрок таблицы не видит — сравнивать не с кем', () => {
    expect(arenaHubFriends([friend('me', 600, true)])).toEqual([]);
    expect(arenaHubFriends([])).toEqual([]);
  });

  it('короткая таблица показывается целиком', () => {
    const rows = [friend('me', 600, true), friend('b', 500)];
    expect(arenaHubFriends(rows, 3).length).toBe(2);
  });

  it('окно не длиннее предела', () => {
    const rows = Array.from({ length: 40 }, (_, index) =>
      friend(`u${index}`, 1_000 - index, index === 20));
    expect(arenaHubFriends(rows).length).toBe(ARENA_HUB_FRIENDS_LIMIT);
  });

  it('таблица сортируется по очкам, а не по порядку прихода', () => {
    const rows = [friend('low', 100), friend('me', 500, true), friend('high', 900)];
    expect(arenaHubFriends(rows, 3).map((row) => row.stableUid)).toEqual(['high', 'me', 'low']);
  });
});

describe('счётчик ищущих', () => {
  /** Ноль ищущих — тоже сведение. Неизвестно — совсем другое дело. */
  it('ноль и неизвестность различаются', () => {
    expect(arenaHubModel({ searchingNow: 0 }).searchingNow).toBe(0);
    expect(arenaHubModel({ searchingNow: 4 }).searchingNow).toBe(4);
    expect(arenaHubModel({}).searchingNow).toBeNull();
    expect(arenaHubModel({ searchingNow: NaN }).searchingNow).toBeNull();
    expect(arenaHubModel({ searchingNow: -3 }).searchingNow).toBeNull();
  });
});

describe('модель целиком', () => {
  it('пустой вход даёт полную и безопасную модель', () => {
    const model = arenaHubModel({});
    expect(model.rank).toBeNull();
    expect(model.goals).toBeNull();
    expect(model.lastMatch).toBeNull();
    expect(model.friends).toEqual([]);
    expect(model.searchingNow).toBeNull();
  });
});

describe('причины блокировки действий хаба', () => {
  it('prioritizes truthful global failures over feature state', () => {
    expect(arenaHubActionBlock({ known: true, offline: true, modeEnabled: true })).toBe('offline');
    expect(arenaHubActionBlock({ known: true, server: true, modeEnabled: true })).toBe('server');
    expect(arenaHubActionBlock({ known: true, maintenance: true, modeEnabled: true })).toBe('maintenance');
    expect(arenaHubActionBlock({ known: true, reportBlocked: true, modeEnabled: true })).toBe('report_blocked');
    expect(arenaHubActionBlock({ known: false })).toBe('unknown');
    expect(arenaHubActionBlock({ known: true, modeEnabled: false })).toBe('mode_disabled');
    expect(arenaHubActionBlock({ known: true, modeEnabled: true, busy: true })).toBe('busy');
    expect(arenaHubActionBlock({ known: true, modeEnabled: true })).toBe('ok');
    expect(arenaHubActionBlock({ known: true })).toBe('ok');
  });
});

describe('неизвестные значения в интерфейсе Арены', () => {
  it('переводит неизвестное значение во всех поддерживаемых локалях', () => {
    expect(Object.fromEntries(
      (['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const)
        .map((lang) => [lang, arenaText(lang, 'valueUnknown')]),
    )).toEqual({
      ru: 'Данные пока недоступны',
      uk: 'Дані поки недоступні',
      es: 'Datos no disponibles todavía',
      'pt-BR': 'Dados ainda indisponíveis',
      vi: 'Dữ liệu hiện chưa có',
      id: 'Data belum tersedia',
      tr: 'Veri henüz kullanılamıyor',
      pl: 'Dane są chwilowo niedostępne',
    });
  });
});
