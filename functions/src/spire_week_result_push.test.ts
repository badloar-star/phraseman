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
    expect(shouldSendSpireWeekResultPush({ expoPushToken: 'ExponentPushToken[abc]', pushPrefs: null })).toBe(true);
  });
  it('нет токена — нет', () => {
    expect(shouldSendSpireWeekResultPush({ expoPushToken: null })).toBe(false);
  });
  it('категория «Лига» выключена — нет', () => {
    expect(shouldSendSpireWeekResultPush({ expoPushToken: 'ExponentPushToken[abc]', pushPrefs: { league: false } })).toBe(false);
  });
});

describe('buildSpireWeekResultCandidates', () => {
  it('собирает только тех, у кого есть в usersByUid и прошли проверку', () => {
    const users = new Map<string, SpireWeekResultPushUser>([
      ['u1', { expoPushToken: 'ExponentPushToken[a]', pushTokenLang: 'ru' }],
      ['u2', { expoPushToken: null }], // без токена — отсеян
    ]);
    const out = buildSpireWeekResultCandidates(
      [RESULT, { ...RESULT, uid: 'u2' }, { ...RESULT, uid: 'u3' }], // u3 вообще не в users
      users,
    );
    expect(out).toHaveLength(1);
    expect(out[0].uid).toBe('u1');
    expect(out[0].token).toBe('ExponentPushToken[a]');
  });

  it('пустой pushTokenLang падает на ru', () => {
    const users = new Map<string, SpireWeekResultPushUser>([['u1', { expoPushToken: 'ExponentPushToken[a]', pushTokenLang: null }]]);
    const out = buildSpireWeekResultCandidates([RESULT], users);
    expect(out[0].uiLang).toBe('ru');
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
