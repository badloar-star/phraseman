import { HttpsError } from 'firebase-functions/v2/https';
import {
  globalBroadcastFingerprint,
  normalizeGlobalBroadcastDeactivateInput,
  normalizeGlobalBroadcastListInput,
  normalizeGlobalBroadcastPublishInput,
  projectGlobalBroadcastRow,
} from './admin_global_broadcast';

describe('admin global broadcast contracts', () => {
  test('normalizes a bounded publish command and fills missing translations from Russian', () => {
    const input = normalizeGlobalBroadcastPublishInput({
      rewardType: 'shards',
      rewardAmount: 25,
      titles: { ru: 'ÐÐ¾Ð´Ð°ÑÐ¾Ðº', uk: 'ÐÐ¾Ð´Ð°ÑÑÐ½Ð¾Ðº' },
      messages: { ru: 'Ð¡Ð¿Ð°ÑÐ¸Ð±Ð¾, ÑÑÐ¾ ÑÑÐ¸ÑÐµÑÑ Ñ Ð½Ð°Ð¼Ð¸.', uk: 'ÐÑÐºÑÑÐ¼Ð¾, ÑÐ¾ Ð½Ð°Ð²ÑÐ°ÑÑÐµÑÑ Ð· Ð½Ð°Ð¼Ð¸.' },
      reason: 'ÐÐ¾Ð¼Ð¿ÐµÐ½ÑÐ°ÑÐ¸Ñ Ð¿Ð¾ÑÐ»Ðµ Ð¿Ð¾Ð´ÑÐ²ÐµÑÐ¶Ð´ÐµÐ½Ð½Ð¾Ð³Ð¾ ÑÐ±Ð¾Ñ',
      idempotencyKey: 'broadcast-publish-1',
      requestId: 'request-1',
    });

    expect(input).toMatchObject({
      rewardType: 'shards',
      rewardAmount: 25,
      reason: 'ÐÐ¾Ð¼Ð¿ÐµÐ½ÑÐ°ÑÐ¸Ñ Ð¿Ð¾ÑÐ»Ðµ Ð¿Ð¾Ð´ÑÐ²ÐµÑÐ¶Ð´ÐµÐ½Ð½Ð¾Ð³Ð¾ ÑÐ±Ð¾Ñ',
      idempotencyKey: 'broadcast-publish-1',
      requestId: 'request-1',
    });
    expect(input.titles).toEqual({
      ru: 'ÐÐ¾Ð´Ð°ÑÐ¾Ðº',
      uk: 'ÐÐ¾Ð´Ð°ÑÑÐ½Ð¾Ðº',
      es: 'ÐÐ¾Ð´Ð°ÑÐ¾Ðº',
      ptBr: 'ÐÐ¾Ð´Ð°ÑÐ¾Ðº',
      vi: 'ÐÐ¾Ð´Ð°ÑÐ¾Ðº',
      id: 'ÐÐ¾Ð´Ð°ÑÐ¾Ðº',
      tr: 'ÐÐ¾Ð´Ð°ÑÐ¾Ðº',
      pl: 'ÐÐ¾Ð´Ð°ÑÐ¾Ðº',
    });
    expect(input.messages.es).toBe(input.messages.ru);
  });

  test('rejects unknown rewards, unsafe shard amounts, missing preview content and malformed command ids', () => {
    const valid = {
      rewardType: 'none',
      rewardAmount: 0,
      titles: { ru: 'ÐÐ°Ð¶Ð½Ð¾Ðµ ÑÐ¾Ð¾Ð±ÑÐµÐ½Ð¸Ðµ' },
      messages: { ru: 'ÐÑÐ¾Ð²ÐµÑÑÑÐµ Ð¾Ð±Ð½Ð¾Ð²Ð»ÐµÐ½Ð¸Ðµ Ð¿ÑÐ¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ñ.' },
      reason: 'ÐÐ¿ÐµÑÐ°ÑÐ¸Ð¾Ð½Ð½Ð¾Ðµ ÑÐ²ÐµÐ´Ð¾Ð¼Ð»ÐµÐ½Ð¸Ðµ',
      idempotencyKey: 'broadcast-publish-1',
      requestId: 'request-1',
    };

    expect(() => normalizeGlobalBroadcastPublishInput({ ...valid, rewardType: 'cash' })).toThrow(HttpsError);
    expect(() => normalizeGlobalBroadcastPublishInput({ ...valid, rewardType: 'arena_extra_5' })).toThrow(HttpsError);
    expect(() => normalizeGlobalBroadcastPublishInput({ ...valid, rewardType: 'shards', rewardAmount: 1001 })).toThrow(HttpsError);
    expect(() => normalizeGlobalBroadcastPublishInput({ ...valid, titles: { ru: '' } })).toThrow(HttpsError);
    expect(() => normalizeGlobalBroadcastPublishInput({ ...valid, idempotencyKey: '../reuse' })).toThrow(HttpsError);
  });

  test('forces rewardAmount to zero for fixed rewards and keeps fingerprints stable across retry time', () => {
    const input = normalizeGlobalBroadcastPublishInput({
      rewardType: 'xp_boost_2x_24h',
      rewardAmount: 999,
      titles: { ru: 'Ð£ÑÐºÐ¾ÑÐµÐ½Ð¸Ðµ' },
      messages: { ru: 'ÐÐ°Ð±ÐµÑÐ¸ÑÐµ Ð´Ð²Ð¾Ð¹Ð½Ð¾Ð¹ Ð¾Ð¿ÑÑ.' },
      reason: 'ÐÐ¾Ð´Ð°ÑÐ¾Ðº Ð°ÐºÑÐ¸Ð²Ð½ÑÐ¼ ÑÑÐµÐ½Ð¸ÐºÐ°Ð¼',
      idempotencyKey: 'broadcast-publish-2',
      requestId: 'request-2',
    });

    expect(input.rewardAmount).toBe(0);
    expect(globalBroadcastFingerprint('publish', input)).toBe(globalBroadcastFingerprint('publish', input));
  });

  test('requires a reason and idempotency for bulk deactivation and bounds history reads', () => {
    expect(normalizeGlobalBroadcastDeactivateInput({
      reason: 'ÐÐ°Ð¼Ð¿Ð°Ð½Ð¸Ñ Ð·Ð°Ð²ÐµÑÑÐµÐ½Ð°',
      idempotencyKey: 'broadcast-off-1',
      requestId: 'request-off-1',
    })).toEqual({
      reason: 'ÐÐ°Ð¼Ð¿Ð°Ð½Ð¸Ñ Ð·Ð°Ð²ÐµÑÑÐµÐ½Ð°',
      idempotencyKey: 'broadcast-off-1',
      requestId: 'request-off-1',
    });
    expect(() => normalizeGlobalBroadcastDeactivateInput({ reason: '', idempotencyKey: 'x', requestId: 'y' })).toThrow(HttpsError);
    expect(normalizeGlobalBroadcastListInput({ limit: 999 })).toEqual({ limit: 50 });
    expect(normalizeGlobalBroadcastListInput({ limit: -10 })).toEqual({ limit: 1 });
  });

  test('projects only allowlisted broadcast history fields', () => {
    const row = projectGlobalBroadcastRow('broadcast-1', {
      active: true,
      rewardType: 'shards',
      rewardAmount: 10,
      titleRu: 'ÐÐ°Ð³Ð¾Ð»Ð¾Ð²Ð¾Ðº',
      messageRu: 'Ð¢ÐµÐºÑÑ',
      createdAt: '2026-07-17T12:00:00.000Z',
      createdByUid: 'admin-1',
      secret: 'drop-me',
      nested: { token: 'drop-me-too' },
    });

    expect(row).toMatchObject({
      id: 'broadcast-1',
      active: true,
      rewardType: 'shards',
      rewardAmount: 10,
      titleRu: 'ÐÐ°Ð³Ð¾Ð»Ð¾Ð²Ð¾Ðº',
      messageRu: 'Ð¢ÐµÐºÑÑ',
      createdByUid: 'admin-1',
    });
    expect(JSON.stringify(row)).not.toContain('secret');
    expect(JSON.stringify(row)).not.toContain('token');
  });
});

