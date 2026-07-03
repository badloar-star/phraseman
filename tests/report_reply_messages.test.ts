/**
 * Ответы на репорты в инбоксе (users/{uid}/user_messages, kind 'report_reply').
 * Контракт: персональное сообщение раскладывает единый title/body во все языки,
 * живёт дольше рассылок (внутри невостребованная награда) и несёт shards/claimed
 * для кнопки «Забрать осколки».
 */
import {
  APP_MESSAGE_TTL_MS,
  REPORT_REPLY_TTL_MS,
  isAppMessageAllowedForAudience,
  mergeAppMessagesWithStates,
  normalizeUserAppMessage,
  pickAppMessageText,
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

  it('merges into the inbox snapshot next to broadcast messages', () => {
    const message = normalizeUserAppMessage('um1', baseDoc, now);
    const snapshot = mergeAppMessagesWithStates([message], [], now);
    expect(snapshot.messages).toHaveLength(1);
    expect(snapshot.messages[0].unread).toBe(true);
    expect(snapshot.unreadCount).toBe(1);
  });

  it('keeps a locally pending reward shown as claimed before the server write catches up', () => {
    const message = normalizeUserAppMessage('um1', baseDoc, now);
    const snapshot = mergeAppMessagesWithStates([message], [], now, ['um1']);
    expect(snapshot.messages[0].reportReply).toEqual({ shards: 1, claimed: true });
  });
});
