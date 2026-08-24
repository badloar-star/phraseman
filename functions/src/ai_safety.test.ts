/**
 * ai_safety — детектор опасных сообщений: ключевые слова + маппинг OpenAI
 * Moderation API. Мотиватор: реплика «Sex with children» в ИИ-диалоге прошла
 * мимо старого детектора (не было ни категории, ни триггеров) — админка
 * показывала «Опасных сообщений нет».
 */

jest.mock('firebase-admin', () => {
  const firestore = jest.fn();
  Object.assign(firestore, {
    FieldValue: { serverTimestamp: jest.fn(() => 'server_timestamp') },
  });
  return { firestore };
});

jest.mock('./admin_alerts', () => ({
  sendTelegramAlert: jest.fn(),
  ADMIN_ALERT_BOT_TOKEN: { value: () => '' },
}));

import * as admin from 'firebase-admin';
import { sendTelegramAlert } from './admin_alerts';
import { evaluateSafety, moderateUserText, recordMaxVoiceSafetySignal, recordSafetyFlag } from './ai_safety';

describe('evaluateSafety — keyword layer', () => {
  it('flags suicide phrases (existing behaviour intact)', () => {
    expect(evaluateSafety('I want to die').category).toBe('suicide');
    expect(evaluateSafety('не хочу жить больше').category).toBe('suicide');
  });

  it('flags sexual content about minors (the screenshot case)', () => {
    const v = evaluateSafety('Sex with children');
    expect(v.flagged).toBe(true);
    expect(v.category).toBe('sexual_minors');
    expect(evaluateSafety('секс с детьми').category).toBe('sexual_minors');
    expect(evaluateSafety('секс з дітьми').category).toBe('sexual_minors');
  });

  it('flags direct threats of violence (category used to have zero phrases)', () => {
    expect(evaluateSafety('I will kill you').category).toBe('violence');
    expect(evaluateSafety("I'll kill you").category).toBe('violence');
    expect(evaluateSafety('я тебя убью').category).toBe('violence');
  });

  it('does not flag ordinary rude roleplay (rudeness is handled in-game, not alerted)', () => {
    expect(evaluateSafety('you are fat').flagged).toBe(false);
    expect(evaluateSafety('I want a latte').flagged).toBe(false);
  });
});

describe('recordSafetyFlag — server-authoritative age evidence', () => {
  const firestoreMock = admin.firestore as unknown as jest.Mock;

  afterEach(() => {
    jest.clearAllMocks();
  });

  function configureFirestore(consentAgeBracket: unknown, consentReadError = false) {
    const setSafetyFlag = jest.fn().mockResolvedValue(undefined);
    const getConsent = consentReadError
      ? jest.fn().mockRejectedValue(new Error('consent unavailable'))
      : jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ ageBracket: consentAgeBracket }),
      });
    const collection = jest.fn((name: string) => {
      if (name === 'user_consents') {
        return { doc: jest.fn(() => ({ get: getConsent })) };
      }
      if (name === 'safety_flags') {
        return { doc: jest.fn(() => ({ set: setSafetyFlag })) };
      }
      throw new Error(`Unexpected collection ${name}`);
    });
    firestoreMock.mockReturnValue({
      collection,
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
      })),
    });
    return { setSafetyFlag };
  }

  const verdict = Object.freeze({
    flagged: true,
    category: 'self_harm' as const,
    matched: 'keyword:self_harm',
  });

  test('ignores a forged client minor string and uses the server consent row', async () => {
    const { setSafetyFlag } = configureFirestore('adult');

    await recordSafetyFlag(verdict, {
      authUid: 'auth-1',
      stableUid: 'stable-1',
      ageBracket: 'under13',
      mode: 'companion',
      userText: 'unsafe text',
    } as Parameters<typeof recordSafetyFlag>[1] & { ageBracket: string });

    expect(setSafetyFlag).toHaveBeenCalledWith(expect.objectContaining({
      ageEvidence: 'confirmed_adult',
      ageBracket: 'adult',
    }));
  });

  test('stores age_unverified for unknown consent and never invents a minor state', async () => {
    const { setSafetyFlag } = configureFirestore('unknown');

    await recordSafetyFlag(verdict, {
      authUid: 'auth-1',
      stableUid: 'stable-1',
      ageBracket: 'teen_safe',
      mode: 'companion',
      userText: 'unsafe text',
    } as Parameters<typeof recordSafetyFlag>[1] & { ageBracket: string });

    const written = setSafetyFlag.mock.calls[0]?.[0];
    expect(written).toEqual(expect.objectContaining({
      ageEvidence: 'age_unverified',
      ageBracket: null,
    }));
    expect(JSON.stringify(written)).not.toMatch(/minor|under13|teen_safe/i);
  });

  test('stores unavailable when the server consent source cannot be read', async () => {
    const { setSafetyFlag } = configureFirestore(undefined, true);

    await recordSafetyFlag(verdict, {
      authUid: 'auth-1',
      stableUid: 'stable-1',
      ageBracket: 'adult',
      mode: 'companion',
      userText: 'unsafe text',
    } as Parameters<typeof recordSafetyFlag>[1] & { ageBracket: string });

    expect(setSafetyFlag).toHaveBeenCalledWith(expect.objectContaining({
      ageEvidence: 'unavailable',
      ageBracket: null,
    }));
  });
});

describe('recordMaxVoiceSafetySignal — content-free operator signal', () => {
  const firestoreMock = admin.firestore as unknown as jest.Mock;
  const telegramMock = sendTelegramAlert as jest.Mock;

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('does not touch Firestore and sends only bounded MAX metadata', async () => {
    telegramMock.mockResolvedValue(true);
    await expect(recordMaxVoiceSafetySignal(
      { flagged: true, category: 'self_harm', matched: 'keyword:private words' },
      { mode: 'voice_tutor', source: 'keywords' },
    )).resolves.toBe(true);

    expect(firestoreMock).not.toHaveBeenCalled();
    expect(telegramMock).toHaveBeenCalledTimes(1);
    const message = String(telegramMock.mock.calls[0]?.[1] ?? '');
    expect(message).toContain('self_harm');
    expect(message).toContain('voice_tutor');
    expect(message).not.toMatch(/private words|User:|Message:|UID|session/i);
  });

  test('propagates a false delivery result instead of claiming success', async () => {
    telegramMock.mockResolvedValue(false);
    await expect(recordMaxVoiceSafetySignal(
      { flagged: true, category: 'self_harm', matched: 'private' },
      { mode: 'voice_tutor', source: 'keywords' },
    )).resolves.toBe(false);
  });
});

describe('moderateUserText — OpenAI Moderation API layer', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  function mockModerationResponse(body: unknown, ok = true): void {
    global.fetch = jest.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 500,
      json: async () => body,
      text: async () => JSON.stringify(body),
    }) as unknown as typeof fetch;
  }

  it('maps sexual/minors to sexual_minors (highest priority)', async () => {
    mockModerationResponse({
      results: [{ flagged: true, categories: { sexual: true, 'sexual/minors': true } }],
    });
    const v = await moderateUserText('sk-test', 'bad text');
    expect(v.flagged).toBe(true);
    expect(v.category).toBe('sexual_minors');
    expect(v.matched).toBe('moderation:sexual/minors');
  });

  it('maps self-harm/intent to suicide', async () => {
    mockModerationResponse({
      results: [{ flagged: true, categories: { 'self-harm/intent': true } }],
    });
    const v = await moderateUserText('sk-test', 'bad text');
    expect(v.category).toBe('suicide');
  });

  it('ignores plain harassment (rude roleplay must not spam the admin)', async () => {
    mockModerationResponse({
      results: [{ flagged: true, categories: { harassment: true } }],
    });
    const v = await moderateUserText('sk-test', 'you are fat');
    expect(v.flagged).toBe(false);
  });

  it('returns not-flagged when API says not flagged', async () => {
    mockModerationResponse({ results: [{ flagged: false, categories: {} }] });
    const v = await moderateUserText('sk-test', 'I want a latte');
    expect(v.flagged).toBe(false);
  });

  it('NEVER throws: API error → not flagged (reply to user must not break)', async () => {
    mockModerationResponse({}, false);
    await expect(moderateUserText('sk-test', 'text')).resolves.toEqual({
      flagged: false,
      category: null,
      matched: null,
    });
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    await expect(moderateUserText('sk-test', 'text')).resolves.toMatchObject({ flagged: false });
  });

  it('skips the call entirely without api key or empty text', async () => {
    const spy = jest.fn();
    global.fetch = spy as unknown as typeof fetch;
    await moderateUserText('', 'text');
    await moderateUserText('sk-test', '   ');
    expect(spy).not.toHaveBeenCalled();
  });
});
