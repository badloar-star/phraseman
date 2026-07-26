"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const admin_global_broadcast_1 = require("./admin_global_broadcast");
describe('admin global broadcast contracts', () => {
    test('normalizes a bounded publish command and fills missing translations from Russian', () => {
        const input = (0, admin_global_broadcast_1.normalizeGlobalBroadcastPublishInput)({
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
        expect(() => (0, admin_global_broadcast_1.normalizeGlobalBroadcastPublishInput)({ ...valid, rewardType: 'cash' })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_global_broadcast_1.normalizeGlobalBroadcastPublishInput)({ ...valid, rewardType: 'arena_extra_5' })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_global_broadcast_1.normalizeGlobalBroadcastPublishInput)({ ...valid, rewardType: 'shards', rewardAmount: 1001 })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_global_broadcast_1.normalizeGlobalBroadcastPublishInput)({ ...valid, titles: { ru: '' } })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_global_broadcast_1.normalizeGlobalBroadcastPublishInput)({ ...valid, idempotencyKey: '../reuse' })).toThrow(https_1.HttpsError);
    });
    test('forces rewardAmount to zero for fixed rewards and keeps fingerprints stable across retry time', () => {
        const input = (0, admin_global_broadcast_1.normalizeGlobalBroadcastPublishInput)({
            rewardType: 'xp_boost_2x_24h',
            rewardAmount: 999,
            titles: { ru: 'Ð£ÑÐºÐ¾ÑÐµÐ½Ð¸Ðµ' },
            messages: { ru: 'ÐÐ°Ð±ÐµÑÐ¸ÑÐµ Ð´Ð²Ð¾Ð¹Ð½Ð¾Ð¹ Ð¾Ð¿ÑÑ.' },
            reason: 'ÐÐ¾Ð´Ð°ÑÐ¾Ðº Ð°ÐºÑÐ¸Ð²Ð½ÑÐ¼ ÑÑÐµÐ½Ð¸ÐºÐ°Ð¼',
            idempotencyKey: 'broadcast-publish-2',
            requestId: 'request-2',
        });
        expect(input.rewardAmount).toBe(0);
        expect((0, admin_global_broadcast_1.globalBroadcastFingerprint)('publish', input)).toBe((0, admin_global_broadcast_1.globalBroadcastFingerprint)('publish', input));
    });
    test('requires a reason and idempotency for bulk deactivation and bounds history reads', () => {
        expect((0, admin_global_broadcast_1.normalizeGlobalBroadcastDeactivateInput)({
            reason: 'ÐÐ°Ð¼Ð¿Ð°Ð½Ð¸Ñ Ð·Ð°Ð²ÐµÑÑÐµÐ½Ð°',
            idempotencyKey: 'broadcast-off-1',
            requestId: 'request-off-1',
        })).toEqual({
            reason: 'ÐÐ°Ð¼Ð¿Ð°Ð½Ð¸Ñ Ð·Ð°Ð²ÐµÑÑÐµÐ½Ð°',
            idempotencyKey: 'broadcast-off-1',
            requestId: 'request-off-1',
        });
        expect(() => (0, admin_global_broadcast_1.normalizeGlobalBroadcastDeactivateInput)({ reason: '', idempotencyKey: 'x', requestId: 'y' })).toThrow(https_1.HttpsError);
        expect((0, admin_global_broadcast_1.normalizeGlobalBroadcastListInput)({ limit: 999 })).toEqual({ limit: 50 });
        expect((0, admin_global_broadcast_1.normalizeGlobalBroadcastListInput)({ limit: -10 })).toEqual({ limit: 1 });
    });
    test('projects only allowlisted broadcast history fields', () => {
        const row = (0, admin_global_broadcast_1.projectGlobalBroadcastRow)('broadcast-1', {
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
//# sourceMappingURL=admin_global_broadcast.test.js.map