/**
 * Тесты чистой логики пуша «турнир начинается».
 * Сеть и Firestore не трогаем — только отбор, тайминг и тексты.
 */
import {
  TOURNAMENT_PUSH_COOLDOWN_MS,
  TOURNAMENT_PUSH_MAX_INACTIVE_DAYS,
  TOURNAMENT_PUSH_WINDOW_MS,
  buildTournamentPushMessage,
  chunkMessages,
  isLobbyOpeningNow,
  isValidExpoPushToken,
  parseTournamentPushUser,
  pickTournamentCopy,
  selectTournamentPushCandidates,
  shouldSendTournamentPush,
  type TournamentPushUser,
} from './tournament_start_push';

const DAY_MS = 24 * 60 * 60 * 1000;
const TOKEN = 'ExponentPushToken[abc123]';

/** Полдень в Москве — заведомо вне тихих часов для этой таймзоны. */
const NOON_MSK = Date.parse('2026-08-03T09:00:00.000Z');

function user(overrides: Partial<TournamentPushUser> = {}): TournamentPushUser {
  return {
    uid: 'u1',
    expoPushToken: TOKEN,
    pushTokenLang: 'ru',
    pushTokenTimezone: 'Europe/Moscow',
    lastActiveAt: NOON_MSK - DAY_MS,
    lastTournamentPushAt: null,
    pushPrefs: null,
    ...overrides,
  };
}

describe('shouldSendTournamentPush', () => {
  it('шлёт активному юзеру с валидным токеном в дневное время', () => {
    expect(shouldSendTournamentPush(user(), NOON_MSK)).toBe(true);
  });

  it('не шлёт без валидного токена', () => {
    expect(shouldSendTournamentPush(user({ expoPushToken: null }), NOON_MSK)).toBe(false);
    expect(shouldSendTournamentPush(user({ expoPushToken: 'garbage' }), NOON_MSK)).toBe(false);
  });

  it('не шлёт, если юзер выключил категорию «Лига»', () => {
    expect(shouldSendTournamentPush(user({ pushPrefs: { league: false } }), NOON_MSK)).toBe(false);
  });

  it('шлёт, если поле league отсутствует (старый клиент)', () => {
    expect(shouldSendTournamentPush(user({ pushPrefs: null }), NOON_MSK)).toBe(true);
  });

  it('не шлёт тем, кто пропал дольше окна — за них отвечает re_engage_push', () => {
    const longGone = user({
      lastActiveAt: NOON_MSK - (TOURNAMENT_PUSH_MAX_INACTIVE_DAYS + 1) * DAY_MS,
    });
    expect(shouldSendTournamentPush(longGone, NOON_MSK)).toBe(false);
  });

  it('не шлёт дважды в сутки', () => {
    const justPushed = user({ lastTournamentPushAt: NOON_MSK - 1000 });
    expect(shouldSendTournamentPush(justPushed, NOON_MSK)).toBe(false);
  });

  it('шлёт снова после истечения cooldown', () => {
    const old = user({ lastTournamentPushAt: NOON_MSK - TOURNAMENT_PUSH_COOLDOWN_MS - 1000 });
    expect(shouldSendTournamentPush(old, NOON_MSK)).toBe(true);
  });

  it('не будит ночью: слот 12:00 МСК не улетает в Бразилию в 6 утра', () => {
    // Тот же момент времени, но таймзона Сан-Паулу — там 06:00.
    const brazilian = user({ pushTokenTimezone: 'America/Sao_Paulo' });
    expect(shouldSendTournamentPush(brazilian, NOON_MSK)).toBe(false);
  });

  it('не шлёт без известной последней активности', () => {
    expect(shouldSendTournamentPush(user({ lastActiveAt: null }), NOON_MSK)).toBe(false);
  });
});

describe('selectTournamentPushCandidates', () => {
  it('оставляет только подходящих и подставляет язык по умолчанию', () => {
    const users = [
      user({ uid: 'ok', pushTokenLang: null }),
      user({ uid: 'no_token', expoPushToken: null }),
      user({ uid: 'opted_out', pushPrefs: { league: false } }),
    ];
    const picked = selectTournamentPushCandidates(users, NOON_MSK);
    expect(picked).toHaveLength(1);
    expect(picked[0].uid).toBe('ok');
    expect(picked[0].lang).toBe('ru');
  });
});

describe('isLobbyOpeningNow', () => {
  const lobbyOpenMs = 5 * 60 * 1000;
  const startsAt = 1_000_000_000;
  const lobbyOpensAt = startsAt - lobbyOpenMs;

  it('срабатывает ровно в момент открытия лобби', () => {
    expect(isLobbyOpeningNow(lobbyOpensAt, startsAt, lobbyOpenMs)).toBe(true);
  });

  it('срабатывает при опоздании крона внутри окна', () => {
    expect(isLobbyOpeningNow(lobbyOpensAt + 60_000, startsAt, lobbyOpenMs)).toBe(true);
  });

  it('молчит до открытия лобби', () => {
    expect(isLobbyOpeningNow(lobbyOpensAt - 1, startsAt, lobbyOpenMs)).toBe(false);
  });

  it('молчит после окна — второй пуш по тому же слоту не уходит', () => {
    expect(isLobbyOpeningNow(lobbyOpensAt + TOURNAMENT_PUSH_WINDOW_MS, startsAt, lobbyOpenMs))
      .toBe(false);
  });
});

describe('тексты', () => {
  it('никогда не упоминают «комнату» — это внутренняя кухня', () => {
    const langs = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
    for (const lang of langs) {
      for (let day = 0; day < 8; day++) {
        const copy = pickTournamentCopy(`uid${day}`, day * DAY_MS, lang);
        expect(copy.title.toLowerCase()).not.toContain('комнат');
        expect(copy.body.toLowerCase()).not.toContain('комнат');
        expect(copy.title.length).toBeGreaterThan(0);
        expect(copy.body.length).toBeGreaterThan(0);
      }
    }
  });

  it('один юзер не получает один и тот же текст два дня подряд', () => {
    const today = pickTournamentCopy('stable-uid', 100 * DAY_MS, 'ru');
    const tomorrow = pickTournamentCopy('stable-uid', 101 * DAY_MS, 'ru');
    expect(today.title).not.toBe(tomorrow.title);
  });

  it('неизвестный язык падает на русский, а не ломается', () => {
    const copy = pickTournamentCopy('u1', 0, 'klingon');
    expect(copy.title).toBeTruthy();
  });

  it('сообщение несёт тип и roomId для обработчика тапа', () => {
    const msg = buildTournamentPushMessage(
      { uid: 'u1', token: TOKEN, lang: 'ru' },
      'room-42',
      NOON_MSK,
    );
    expect(msg.to).toBe(TOKEN);
    expect(msg.data.type).toBe('tournament_starting');
    expect(msg.data.roomId).toBe('room-42');
    expect(msg.sound).toBe('default');
  });
});

describe('parseTournamentPushUser', () => {
  it('читает поля из сырого документа', () => {
    const parsed = parseTournamentPushUser('u9', {
      expoPushToken: TOKEN,
      pushTokenLang: 'pl',
      pushTokenTimezone: 'Europe/Warsaw',
      last_active_at: 123,
      lastTournamentPushAt: 456,
      pushPrefs: { league: false },
    });
    expect(parsed.uid).toBe('u9');
    expect(parsed.expoPushToken).toBe(TOKEN);
    expect(parsed.lastActiveAt).toBe(123);
    expect(parsed.lastTournamentPushAt).toBe(456);
    expect(parsed.pushPrefs?.league).toBe(false);
  });

  it('переживает пустой документ без падения', () => {
    const parsed = parseTournamentPushUser('u0', undefined);
    expect(parsed.expoPushToken).toBeNull();
    expect(parsed.pushPrefs).toBeNull();
  });
});

describe('вспомогательное', () => {
  it('валидирует формат Expo-токена', () => {
    expect(isValidExpoPushToken(TOKEN)).toBe(true);
    expect(isValidExpoPushToken('ExpoPushToken[xyz]')).toBe(true);
    expect(isValidExpoPushToken('nope')).toBe(false);
    expect(isValidExpoPushToken(null)).toBe(false);
  });

  it('режет на чанки по 100 — лимит Expo Push API', () => {
    const chunks = chunkMessages(Array.from({ length: 250 }, (_, i) => i), 100);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(100);
    expect(chunks[2]).toHaveLength(50);
  });
});
