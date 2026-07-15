/**
 * Ответы на репорты в инбоксе (users/{uid}/user_messages, kind 'report_reply').
 * Контракт: персональное сообщение раскладывает единый title/body во все языки,
 * живёт дольше рассылок (внутри невостребованная награда) и несёт shards/claimed
 * для кнопки «Забрать осколки».
 */
import {
  APP_MESSAGE_TTL_MS,
  REPORT_REPLY_TTL_MS,
  applyPendingVisibilityToStates,
  isAppMessageAllowedForAudience,
  mergeAppMessagesWithStates,
  normalizeAppMessage,
  normalizeUserAppMessage,
  pickAppMessageText,
  sanitizeAppMessagesInboxSnapshot,
} from '../app/app_messages';

describe('report reply user messages', () => {
  const now = Date.UTC(2026, 6, 2, 12, 0, 0);

  const baseDoc = {
    kind: 'report_reply',
    title: 'Спасибо за репорт!',
    body: 'Ошибка исправлена — забери награду.',
    shards: 1,
    claimed: false,
    createdAtMs: now,
  };

  it('normalizes personal message with report_reply kind and reward payload', () => {
    const message = normalizeUserAppMessage('um1', baseDoc, now);
    expect(message.kind).toBe('report_reply');
    expect(message.reportReply).toEqual({ shards: 1, claimed: false });
  });

  it('spreads the single-language title/body across all languages', () => {
    const message = normalizeUserAppMessage('um1', baseDoc, now);
    (['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const).forEach((lang) => {
      const text = pickAppMessageText(message, lang);
      expect(text.title).toBe('Спасибо за репорт!');
      expect(text.body).toBe('Ошибка исправлена — забери награду.');
    });
  });

  it('outlives the broadcast TTL (unclaimed reward must not silently expire)', () => {
    const message = normalizeUserAppMessage('um1', baseDoc, now);
    expect(message.expiresAtMs).toBe(now + REPORT_REPLY_TTL_MS);
    expect(REPORT_REPLY_TTL_MS).toBeGreaterThan(APP_MESSAGE_TTL_MS);
  });

  it('is visible for every audience (free and premium)', () => {
    const message = normalizeUserAppMessage('um1', baseDoc, now);
    expect(isAppMessageAllowedForAudience(message, true)).toBe(true);
    expect(isAppMessageAllowedForAudience(message, false)).toBe(true);
  });

  it('keeps claimed flag and clamps negative shards to zero', () => {
    const claimed = normalizeUserAppMessage('um2', { ...baseDoc, claimed: true }, now);
    expect(claimed.reportReply).toEqual({ shards: 1, claimed: true });
    const broken = normalizeUserAppMessage('um3', { ...baseDoc, shards: -5 }, now);
    expect(broken.reportReply).toEqual({ shards: 0, claimed: false });
  });

  it('excludes report replies from the Messages inbox and unread count', () => {
    const message = normalizeUserAppMessage('um1', baseDoc, now);
    const snapshot = mergeAppMessagesWithStates([message], [], now);
    expect(snapshot.messages).toHaveLength(0);
    expect(snapshot.unreadCount).toBe(0);
  });

  it('sanitizes stale cached report replies without hiding ordinary messages', () => {
    const reportReply = {
      ...normalizeUserAppMessage('um1', baseDoc, now),
      readAtMs: null,
      dismissedAtMs: null,
      reaction: null,
      pollOptionId: null,
      unread: true,
    };
    const ordinary = { ...reportReply, id: 'broadcast1', kind: 'message' as const, reportReply: null };
    const snapshot = sanitizeAppMessagesInboxSnapshot({
      messages: [reportReply, ordinary],
      unreadCount: 2,
    });
    expect(snapshot.messages.map((message) => message.id)).toEqual(['broadcast1']);
    expect(snapshot.unreadCount).toBe(1);
  });

  it('filters an explicitly removed team message with a current visibility revision', () => {
    const news = normalizeAppMessage('news1', {
      kind: 'message',
      active: true,
      audience: 'all',
      titleRu: 'Новость',
      messageRu: 'Текст',
      createdAtMs: now,
      expiresAtMs: now + APP_MESSAGE_TTL_MS,
    }, now);
    const poll = normalizeAppMessage('poll1', {
      kind: 'poll',
      active: true,
      audience: 'all',
      titleRu: 'Опрос',
      messageRu: 'Текст',
      createdAtMs: now + 1,
      expiresAtMs: now + APP_MESSAGE_TTL_MS,
    }, now);

    const snapshot = mergeAppMessagesWithStates([news, poll], [{
      messageId: news.id,
      readAtMs: now,
      dismissedAtMs: now,
      reaction: null,
      pollOptionId: null,
      updatedAtMs: now,
      visibilityRevision: now,
    }], now);

    expect(snapshot.messages.map((message) => message.id)).toEqual(['poll1']);
    expect(snapshot.unreadCount).toBe(1);
  });

  it('applies delete and Undo as a visibility-only LWW patch', () => {
    const original = {
      messageId: 'poll1',
      readAtMs: now - 100,
      dismissedAtMs: null,
      reaction: 'like' as const,
      pollOptionId: 'option-a',
      updatedAtMs: now - 50,
      visibilityRevision: 10,
    };
    const deleted = applyPendingVisibilityToStates([original], [{
      messageId: 'poll1',
      dismissedAtMs: now,
      revision: 11,
    }])[0];
    expect(deleted).toMatchObject({
      readAtMs: now - 100,
      dismissedAtMs: now,
      reaction: 'like',
      pollOptionId: 'option-a',
      visibilityRevision: 11,
    });

    const restored = applyPendingVisibilityToStates([deleted], [{
      messageId: 'poll1',
      dismissedAtMs: null,
      revision: 12,
    }])[0];
    expect(restored).toMatchObject({
      readAtMs: now - 100,
      dismissedAtMs: null,
      reaction: 'like',
      pollOptionId: 'option-a',
      visibilityRevision: 12,
    });
  });

  it('ignores a delayed stale visibility operation after a newer Undo', () => {
    const restored = {
      messageId: 'news1',
      readAtMs: null,
      dismissedAtMs: null,
      reaction: null,
      pollOptionId: null,
      updatedAtMs: 102,
      visibilityRevision: 102,
    };
    const result = applyPendingVisibilityToStates([restored], [{
      messageId: 'news1',
      dismissedAtMs: 100,
      revision: 101,
    }]);
    expect(result[0]).toEqual(restored);
  });
});
