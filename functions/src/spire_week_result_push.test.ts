// Сторож понедельничного пуша Шпиля (PM-281). Чистые функции: отбор
// кандидата, тексты, сборка сообщения. Сеть (sendSpireExpoPushChunk через
// runSpireWeekResultPush) не мокается здесь — это purely-unit слой.
import {
  buildSpireWeekResultCandidates,
  buildSpireWeekResultCopy,
  buildSpireWeekResultMessage,
  shouldSendSpireWeekResultPush,
  type SpireWeekResultPushCandidate,
  type SpireWeekResultPushInput,
  type SpireWeekResultPushUser,
} from './spire_week_result_push';

const RESULT: SpireWeekResultPushInput = { uid: 'u1', studyLang: 'en', prevTier: 3, newTier: 4, promoted: true, demoted: false };

function candidate(overrides: Partial<SpireWeekResultPushCandidate> = {}): SpireWeekResultPushCandidate {
  return {
    uid: 'u', token: 'ExponentPushToken[a]', uiLang: 'ru',
    prevTier: 3, newTier: 4, promoted: true, demoted: false,
    ...overrides,
  };
}

describe('shouldSendSpireWeekResultPush', () => {
  it('валидный токен без запрета — да', () => {
    expect(shouldSendSpireWeekResultPush({ pushTokenLang: 'ru', expoPushToken: 'ExponentPushToken[abc]', pushPrefs: null })).toBe(true);
  });
  it('нет токена — нет', () => {
    expect(shouldSendSpireWeekResultPush({ pushTokenLang: 'ru', expoPushToken: null })).toBe(false);
  });
  it('категория «Лига» выключена — нет', () => {
    expect(shouldSendSpireWeekResultPush({ pushTokenLang: 'ru', expoPushToken: 'ExponentPushToken[abc]', pushPrefs: { league: false } })).toBe(false);
  });
});

describe('buildSpireWeekResultCandidates', () => {
  it('собирает только тех, у кого есть в usersByUid и прошли проверку', () => {
    const users = new Map<string, SpireWeekResultPushUser>([
      ['u1', { expoPushToken: 'ExponentPushToken[a]', pushTokenLang: 'ru' }],
      ['u2', { pushTokenLang: 'ru', expoPushToken: null }], // без токена — отсеян
    ]);
    const out = buildSpireWeekResultCandidates(
      [RESULT, { ...RESULT, uid: 'u2' }, { ...RESULT, uid: 'u3' }], // u3 вообще не в users
      users,
    );
    expect(out).toHaveLength(1);
    expect(out[0].uid).toBe('u1');
    expect(out[0].token).toBe('ExponentPushToken[a]');
  });

  it('пустой pushTokenLang — пропуск (Шпиль только ru/uk, владелец 11.10)', () => {
    const users = new Map<string, SpireWeekResultPushUser>([['u1', { expoPushToken: 'ExponentPushToken[a]', pushTokenLang: null }]]);
    const out = buildSpireWeekResultCandidates([RESULT], users);
    expect(out).toHaveLength(0);
  });
});

describe('buildSpireWeekResultCopy — три исхода (T30/T33)', () => {
  it('повышение называет новый шпиль', () => {
    const copy = buildSpireWeekResultCopy(candidate({ promoted: true, demoted: false, newTier: 4 }));
    expect(copy.body).toContain('Кварц'); // индекс 4 = Кварц (0=Гранит,1=Базальт,2=Мрамор,3=Нефрит,4=Кварц)
  });
  it('понижение — без злорадства, только факт + новый шпиль', () => {
    const copy = buildSpireWeekResultCopy(candidate({ promoted: false, demoted: true, prevTier: 4, newTier: 3 }));
    expect(copy.body).not.toMatch(/понизил|проиграл/i);
    expect(copy.body).toContain('Нефрит'); // индекс 3 = Нефрит
  });
  it('остался на месте — всё равно есть текст (новый шпиль недели, T33)', () => {
    const copy = buildSpireWeekResultCopy(candidate({ promoted: false, demoted: false, prevTier: 3, newTier: 3 }));
    expect(copy.body.length).toBeGreaterThan(0);
  });
  it('неизвестный язык интерфейса падает на ru', () => {
    const de = buildSpireWeekResultCopy(candidate({ uiLang: 'de' }));
    const ru = buildSpireWeekResultCopy(candidate({ uiLang: 'ru' }));
    expect(de.title).toBe(ru.title);
    expect(de.body).toBe(ru.body);
  });
  it('украинский даёт свой текст, не ru-фолбэк', () => {
    const uk = buildSpireWeekResultCopy(candidate({ uiLang: 'uk' }));
    const ru = buildSpireWeekResultCopy(candidate({ uiLang: 'ru' }));
    expect(uk.body).not.toBe(ru.body);
  });
});

describe('buildSpireWeekResultMessage', () => {
  it('собирает Expo-сообщение с data.type=spire_week_result', () => {
    const msg = buildSpireWeekResultMessage(candidate({ token: 'ExponentPushToken[a]', promoted: true, demoted: false, newTier: 4 }));
    expect(msg.to).toBe('ExponentPushToken[a]');
    expect(msg.sound).toBe('default');
    expect(msg.data).toEqual({ type: 'spire_week_result', promoted: true, demoted: false, newTier: 4 });
  });
});

// ── PM-200: право на пуш и идемпотентность недели ─────────────────────────────
describe('PM-200: opt-out по существующей категории и метка недели', () => {
  const PUSH_FIXTURE = 'ExponentPushToken' + '[a]';

  it('pushPrefs.streak=false (мастер или «Серия под угрозой» выключены) — не шлём', () => {
    expect(shouldSendSpireWeekResultPush({ pushTokenLang: 'ru', expoPushToken: PUSH_FIXTURE, pushPrefs: { streak: false } })).toBe(false);
  });
  it('старый league=false по-прежнему выключает (обратная совместимость)', () => {
    expect(shouldSendSpireWeekResultPush({ pushTokenLang: 'ru', expoPushToken: PUSH_FIXTURE, pushPrefs: { league: false, streak: true } })).toBe(false);
  });
  it('метка этой недели — already_sent; метка прошлой недели не мешает', () => {
    const { spireWeekResultSkipReason } = require('./spire_week_result_push');
    expect(spireWeekResultSkipReason({ pushTokenLang: 'ru', expoPushToken: PUSH_FIXTURE, sentForWeekId: '2026-W39' }, '2026-W39')).toBe('already_sent');
    expect(spireWeekResultSkipReason({ pushTokenLang: 'ru', expoPushToken: PUSH_FIXTURE, sentForWeekId: '2026-W38' }, '2026-W39')).toBeNull();
  });
  it('один пуш на человека, даже если итогов несколько (разные языки)', () => {
    const users = new Map<string, SpireWeekResultPushUser>([['u1', { pushTokenLang: 'ru', expoPushToken: PUSH_FIXTURE }]]);
    const out = buildSpireWeekResultCandidates([RESULT, { ...RESULT, studyLang: 'es' }], users, '2026-W39');
    expect(out).toHaveLength(1);
  });
  it('spireResultPushWeekId = прошлая ISO-неделя, как spirePreviousWeek', () => {
    const { spireResultPushWeekId } = require('./spire_week_result_push');
    const { spireWeekId } = require('./spire_groups');
    // Понедельник 2026-09-28 00:01 UTC -> итог недели 21-27 сентября.
    expect(spireResultPushWeekId(Date.UTC(2026, 8, 28, 0, 1))).toBe(spireWeekId(new Date(Date.UTC(2026, 8, 21))));
    // Граница года: понедельник 2027-01-04 -> неделя 2026-12-28..2027-01-03.
    expect(spireResultPushWeekId(Date.UTC(2027, 0, 4, 0, 1))).toBe(spireWeekId(new Date(Date.UTC(2026, 11, 28))));
  });

  it('повторный прогон за ту же неделю не шлёт дубль (метка в users/{uid})', async () => {
    const { runSpireWeekResultPush } = require('./spire_week_result_push');
    const users = new Map<string, Record<string, unknown>>([
      ['u1', { expoPushToken: PUSH_FIXTURE, pushTokenLang: 'ru' }],
      ['u2', { pushTokenLang: 'ru', expoPushToken: 'ExponentPushToken' + '[b]', pushPrefs: { streak: false } }],
    ]);
    const db = {
      collection: () => ({ doc: (id: string) => ({ id }) }),
      getAll: async (...refs: Array<{ id: string }>) => refs.map((r) => ({ data: () => users.get(r.id) })),
      batch: () => {
        const ops: Array<[string, Record<string, unknown>]> = [];
        return {
          set: (ref: { id: string }, data: Record<string, unknown>) => { ops.push([ref.id, data]); },
          commit: async () => {
            for (const [id, data] of ops) users.set(id, { ...(users.get(id) ?? {}), ...data });
          },
        };
      },
    };
    const fetchMock = jest.fn(async () => ({ ok: true, status: 200 }));
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const first = await runSpireWeekResultPush(db, [RESULT, { ...RESULT, uid: 'u2' }], '2026-W39');
      expect(first).toMatchObject({ candidates: 1, sent: 1, optedOut: 1 });
      expect(users.get('u1')?.spireWeekResultPushWeekId).toBe('2026-W39');
      expect(users.get('u2')?.spireWeekResultPushWeekId).toBeUndefined();

      const second = await runSpireWeekResultPush(db, [RESULT, { ...RESULT, uid: 'u2' }], '2026-W39');
      expect(second).toMatchObject({ candidates: 0, sent: 0, alreadySent: 1 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = originalFetch;
      log.mockRestore();
    }
  });
});
