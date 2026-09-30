import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderAdminAlertMessages, sanitizeAdminAlertPayload } from './admin_alert_privacy';

type MilestoneModule = {
  recordCustomCardMilestone(input: {
    authUid: string | null;
    data: unknown;
    nowMs: number;
  }, store: {
    createIfAbsent(eventId: string, document: Readonly<Record<string, unknown>>): Promise<boolean>;
  }): Promise<{ accepted: true; duplicate: boolean }>;
};

function loadMilestoneModule(): MilestoneModule {
  const path = resolve(__dirname, 'custom_card_milestone_core.ts');
  expect(existsSync(path)).toBe(true);
  return require(path) as MilestoneModule;
}

function fakeStore() {
  const documents = new Map<string, Readonly<Record<string, unknown>>>();
  return {
    documents,
    store: {
      async createIfAbsent(eventId: string, document: Readonly<Record<string, unknown>>) {
        if (documents.has(eventId)) return false;
        documents.set(eventId, structuredClone(document));
        return true;
      },
    },
  };
}

describe('custom-card owner milestone', () => {
  test('requires authenticated identity and a real threshold count', async () => {
    const { recordCustomCardMilestone } = loadMilestoneModule();
    const { store } = fakeStore();
    await expect(recordCustomCardMilestone({
      authUid: null,
      data: { count: 1_500, language: 'en', expectedOwnerUid: 'uid-a' },
      nowMs: 1_700_000_000_000,
    }, store))
      .rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(recordCustomCardMilestone({
      authUid: 'uid-a', data: { count: 1_499, language: 'en', expectedOwnerUid: 'uid-a' }, nowMs: 1_700_000_000_000,
    }, store))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(recordCustomCardMilestone({
      authUid: 'uid-a', data: { count: 1_500, language: 'ru', expectedOwnerUid: 'uid-a' }, nowMs: 1_700_000_000_000,
    }, store))
      .rejects.toMatchObject({ code: 'invalid-argument' });
  });

  test('rejects a delayed A request authenticated as B before any write', async () => {
    const { recordCustomCardMilestone } = loadMilestoneModule();
    const { store, documents } = fakeStore();
    await expect(recordCustomCardMilestone({
      authUid: 'uid-b',
      data: { count: 1_500, language: 'en', expectedOwnerUid: 'uid-a' },
      nowMs: 1_700_000_000_000,
    }, store)).rejects.toMatchObject({ code: 'permission-denied' });
    expect(documents.size).toBe(0);
  });

  test('atomically deduplicates one threshold alert per account and language', async () => {
    const { recordCustomCardMilestone } = loadMilestoneModule();
    const { store, documents } = fakeStore();

    await expect(recordCustomCardMilestone({
      authUid: 'private-user-a', data: { count: 1_500, language: 'en', expectedOwnerUid: 'private-user-a' }, nowMs: 1_700_000_000_000,
    }, store)).resolves.toEqual({ accepted: true, duplicate: false });
    await expect(recordCustomCardMilestone({
      authUid: 'private-user-a', data: { count: 1_501, language: 'en', expectedOwnerUid: 'private-user-a' }, nowMs: 1_700_000_000_100,
    }, store)).resolves.toEqual({ accepted: true, duplicate: true });

    expect(documents.size).toBe(1);
    const [eventId, event] = [...documents.entries()][0];
    expect(eventId).toMatch(/^custom_cards\.milestone:[a-f0-9]{48}$/u);
    expect(event).toMatchObject({
      eventType: 'customCardMilestone',
      source: 'custom_cards.milestone',
      status: 'pending',
      payload: { count: 1_500, language: 'en' },
    });
    expect(JSON.stringify({ eventId, event })).not.toContain('private-user-a');
  });

  test('keeps account and study-language milestones independent', async () => {
    const { recordCustomCardMilestone } = loadMilestoneModule();
    const { store, documents } = fakeStore();
    await recordCustomCardMilestone({ authUid: 'uid-a', data: { count: 1_500, language: 'en', expectedOwnerUid: 'uid-a' }, nowMs: 1_700_000_000_000 }, store);
    await recordCustomCardMilestone({ authUid: 'uid-a', data: { count: 1_500, language: 'fr', expectedOwnerUid: 'uid-a' }, nowMs: 1_700_000_000_000 }, store);
    await recordCustomCardMilestone({ authUid: 'uid-b', data: { count: 1_500, language: 'en', expectedOwnerUid: 'uid-b' }, nowMs: 1_700_000_000_000 }, store);
    expect(documents.size).toBe(3);
  });

  test('allows only count and language into the Telegram event payload', () => {
    expect(sanitizeAdminAlertPayload('customCardMilestone' as never, {
      count: 1_500,
      language: 'de',
      email: 'never@example.com',
      cardText: 'private phrase',
      nickname: 'also omitted',
      details: [{ label: 'Экран', value: 'private-screen' }],
    })).toEqual({ count: 1_500, language: 'de' });

    const [message] = renderAdminAlertMessages({
      eventType: 'customCardMilestone' as never,
      occurredAtMs: 1_700_000_000_000,
      payload: {
        count: 1_500,
        language: 'de',
        details: [{ label: 'Экран', value: 'private-screen' }],
      },
    });
    expect(message).toContain('1 500 КАРТОЧЕК');
    expect(message).toContain('Количество');
    expect(message).toContain('Язык');
    expect(message).not.toContain('private-screen');
    expect(message).not.toContain('Экран');
  });
});

