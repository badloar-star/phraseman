"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const admin_app_messages_1 = require("./admin_app_messages");
const base = {
    reason: 'Reviewed campaign for new lesson announcement',
    idempotencyKey: 'campaign-create-1',
    requestId: 'request-1',
    audience: 'free',
    priority: 12,
    ttlDays: 14,
    translations: { ru: { title: 'Новый урок', body: 'Откройте новый урок сегодня.' } },
};
describe('normalizeAppMessageCreateInput', () => {
    test('creates a bounded message and falls empty languages back to RU', () => {
        const result = (0, admin_app_messages_1.normalizeAppMessageCreateInput)(base, 'admin@example.com', Date.UTC(2026, 6, 12));
        expect(result.document).toMatchObject({
            kind: 'message', active: false, audience: 'free', priority: 12, ttlDays: 14,
            titleRu: 'Новый урок', titleUk: 'Новый урок', messagePl: 'Откройте новый урок сегодня.',
            createdBy: 'admin@example.com', readCount: 0, likeCount: 0, dislikeCount: 0,
        });
    });
    test('keeps the idempotency fingerprint stable across retry time', () => {
        const first = (0, admin_app_messages_1.normalizeAppMessageCreateInput)(base, 'admin@example.com', 1800000000000);
        const retry = (0, admin_app_messages_1.normalizeAppMessageCreateInput)(base, 'admin@example.com', 1800060000000);
        expect(retry.requestFingerprint).toBe(first.requestFingerprint);
        expect(retry.document.createdAtMs).not.toBe(first.document.createdAtMs);
    });
    test('normalizes polls with 2-6 stable options and translated fallbacks', () => {
        const result = (0, admin_app_messages_1.normalizeAppMessageCreateInput)({
            ...base,
            kind: 'poll',
            active: true,
            translations: {
                ru: { title: 'Выберите', body: 'Помогите выбрать.', pollQuestion: 'Что добавить?', pollOptions: ['Уроки', 'Квизы'] },
                es: { title: 'Elige', body: 'Ayúdanos.', pollQuestion: '¿Qué añadir?', pollOptions: ['Lecciones', 'Cuestionarios'] },
            },
        }, 'admin@example.com', 1800000000000);
        expect(result.document.kind).toBe('poll');
        expect(result.document.active).toBe(true);
        expect(result.document.poll).toMatchObject({
            questionRu: 'Что добавить?', questionEs: '¿Qué añadir?', optionIds: ['option_1', 'option_2'], voteCount: 0,
            options: [
                { id: 'option_1', textRu: 'Уроки', textEs: 'Lecciones', textUk: 'Уроки' },
                { id: 'option_2', textRu: 'Квизы', textEs: 'Cuestionarios', textUk: 'Квизы' },
            ],
        });
    });
    test('rejects missing reason, RU content and incomplete polls', () => {
        expect(() => (0, admin_app_messages_1.normalizeAppMessageCreateInput)({ ...base, reason: '' }, 'admin')).toThrow(https_1.HttpsError);
        expect(() => (0, admin_app_messages_1.normalizeAppMessageCreateInput)({ ...base, translations: { ru: { title: '', body: '' } } }, 'admin')).toThrow(https_1.HttpsError);
        expect(() => (0, admin_app_messages_1.normalizeAppMessageCreateInput)({ ...base, kind: 'poll', translations: { ru: { title: 'x', body: 'y', pollQuestion: 'q', pollOptions: ['one'] } } }, 'admin')).toThrow(https_1.HttpsError);
    });
});
describe('normalizeAppMessageToggleInput', () => {
    test('accepts a reasoned active-state change and rejects malformed ids', () => {
        expect((0, admin_app_messages_1.normalizeAppMessageToggleInput)({ messageId: 'message_123', active: false, reason: 'Campaign ended', idempotencyKey: 'toggle-1', requestId: 'req-1' })).toMatchObject({ messageId: 'message_123', active: false });
        expect(() => (0, admin_app_messages_1.normalizeAppMessageToggleInput)({ messageId: '../bad', active: true, reason: 'x', idempotencyKey: 'toggle-2', requestId: 'req-2' })).toThrow(https_1.HttpsError);
    });
});
describe('app message edit and delete commands', () => {
    test('normalizes an update without recreating engagement counters or extending expiry', () => {
        const result = (0, admin_app_messages_1.normalizeAppMessageUpdateInput)({
            ...base,
            messageId: 'message_123',
            resetPollEngagement: false,
            translations: { ru: { title: 'Новая тема', body: 'Новый текст' } },
        });
        expect(result).toMatchObject({ messageId: 'message_123', resetPollEngagement: false });
        expect(result.patch).toMatchObject({ kind: 'message', audience: 'free', priority: 12, titleRu: 'Новая тема', messageRu: 'Новый текст' });
        expect(result.patch).not.toHaveProperty('createdAtMs');
        expect(result.patch).not.toHaveProperty('expiresAtMs');
        expect(result.patch).not.toHaveProperty('readCount');
    });
    test('detects poll option changes while allowing translation-only edits', () => {
        const previous = { optionIds: ['option_1', 'option_2'], options: [{ id: 'option_1', textRu: 'Да' }, { id: 'option_2', textRu: 'Нет' }] };
        const translatedOnly = { ...previous, questionEs: '¿Sí o no?' };
        const changed = { optionIds: ['option_1', 'option_2'], options: [{ id: 'option_1', textRu: 'Конечно' }, { id: 'option_2', textRu: 'Нет' }] };
        expect((0, admin_app_messages_1.appMessagePollStructureChanged)(previous, translatedOnly)).toBe(false);
        expect((0, admin_app_messages_1.appMessagePollStructureChanged)(previous, changed)).toBe(true);
        expect((0, admin_app_messages_1.appMessagePollStructureChanged)(previous, null)).toBe(true);
    });
    test('preserves legacy poll option ids during an edit', () => {
        const result = (0, admin_app_messages_1.normalizeAppMessageUpdateInput)({
            ...base,
            messageId: 'legacy_poll_1',
            kind: 'poll',
            pollOptionIds: ['opt_1', 'opt_2'],
            translations: { ru: { title: 'Выбор', body: 'Ответьте', pollQuestion: 'Да или нет?', pollOptions: ['Да', 'Нет'] } },
        });
        expect(result.patch.poll).toMatchObject({ optionIds: ['opt_1', 'opt_2'], options: [{ id: 'opt_1' }, { id: 'opt_2' }] });
    });
    test('requires a reasoned bounded delete command', () => {
        expect((0, admin_app_messages_1.normalizeAppMessageDeleteInput)({ messageId: 'message_123', reason: 'Campaign is obsolete', idempotencyKey: 'delete-1', requestId: 'req-delete-1' })).toMatchObject({ messageId: 'message_123' });
        expect(() => (0, admin_app_messages_1.normalizeAppMessageDeleteInput)({ messageId: '../bad', reason: 'x', idempotencyKey: 'delete-2', requestId: 'req-delete-2' })).toThrow(https_1.HttpsError);
    });
    test('deduplicates the bounded cleanup target list', () => {
        expect((0, admin_app_messages_1.normalizeAppMessageCleanupInput)({
            messageIds: ['message_123', 'message_123', 'message_456'],
            reason: 'Expired campaign retention cleanup',
            idempotencyKey: 'cleanup-1',
            requestId: 'req-cleanup-1',
        }).messageIds).toEqual(['message_123', 'message_456']);
        expect(() => (0, admin_app_messages_1.normalizeAppMessageCleanupInput)({ messageIds: [], reason: 'x', idempotencyKey: 'cleanup-2', requestId: 'req-cleanup-2' })).toThrow(https_1.HttpsError);
    });
});
//# sourceMappingURL=admin_app_messages.test.js.map