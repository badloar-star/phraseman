"use strict";
/**
 * ai_safety — детектор опасных сообщений: ключевые слова + маппинг OpenAI
 * Moderation API. Мотиватор: реплика «Sex with children» в ИИ-диалоге прошла
 * мимо старого детектора (не было ни категории, ни триггеров) — админка
 * показывала «Опасных сообщений нет».
 */
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('firebase-admin', () => ({
    firestore: jest.fn(),
}));
jest.mock('./admin_alerts', () => ({
    sendTelegramAlert: jest.fn(),
    ADMIN_ALERT_BOT_TOKEN: { value: () => '' },
}));
const ai_safety_1 = require("./ai_safety");
describe('evaluateSafety — keyword layer', () => {
    it('flags suicide phrases (existing behaviour intact)', () => {
        expect((0, ai_safety_1.evaluateSafety)('I want to die').category).toBe('suicide');
        expect((0, ai_safety_1.evaluateSafety)('не хочу жить больше').category).toBe('suicide');
    });
    it('flags sexual content about minors (the screenshot case)', () => {
        const v = (0, ai_safety_1.evaluateSafety)('Sex with children');
        expect(v.flagged).toBe(true);
        expect(v.category).toBe('sexual_minors');
        expect((0, ai_safety_1.evaluateSafety)('секс с детьми').category).toBe('sexual_minors');
        expect((0, ai_safety_1.evaluateSafety)('секс з дітьми').category).toBe('sexual_minors');
    });
    it('flags direct threats of violence (category used to have zero phrases)', () => {
        expect((0, ai_safety_1.evaluateSafety)('I will kill you').category).toBe('violence');
        expect((0, ai_safety_1.evaluateSafety)("I'll kill you").category).toBe('violence');
        expect((0, ai_safety_1.evaluateSafety)('я тебя убью').category).toBe('violence');
    });
    it('does not flag ordinary rude roleplay (rudeness is handled in-game, not alerted)', () => {
        expect((0, ai_safety_1.evaluateSafety)('you are fat').flagged).toBe(false);
        expect((0, ai_safety_1.evaluateSafety)('I want a latte').flagged).toBe(false);
    });
});
describe('moderateUserText — OpenAI Moderation API layer', () => {
    const realFetch = global.fetch;
    afterEach(() => {
        global.fetch = realFetch;
        jest.restoreAllMocks();
    });
    function mockModerationResponse(body, ok = true) {
        global.fetch = jest.fn().mockResolvedValue({
            ok,
            status: ok ? 200 : 500,
            json: async () => body,
            text: async () => JSON.stringify(body),
        });
    }
    it('maps sexual/minors to sexual_minors (highest priority)', async () => {
        mockModerationResponse({
            results: [{ flagged: true, categories: { sexual: true, 'sexual/minors': true } }],
        });
        const v = await (0, ai_safety_1.moderateUserText)('sk-test', 'bad text');
        expect(v.flagged).toBe(true);
        expect(v.category).toBe('sexual_minors');
        expect(v.matched).toBe('moderation:sexual/minors');
    });
    it('maps self-harm/intent to suicide', async () => {
        mockModerationResponse({
            results: [{ flagged: true, categories: { 'self-harm/intent': true } }],
        });
        const v = await (0, ai_safety_1.moderateUserText)('sk-test', 'bad text');
        expect(v.category).toBe('suicide');
    });
    it('ignores plain harassment (rude roleplay must not spam the admin)', async () => {
        mockModerationResponse({
            results: [{ flagged: true, categories: { harassment: true } }],
        });
        const v = await (0, ai_safety_1.moderateUserText)('sk-test', 'you are fat');
        expect(v.flagged).toBe(false);
    });
    it('returns not-flagged when API says not flagged', async () => {
        mockModerationResponse({ results: [{ flagged: false, categories: {} }] });
        const v = await (0, ai_safety_1.moderateUserText)('sk-test', 'I want a latte');
        expect(v.flagged).toBe(false);
    });
    it('NEVER throws: API error → not flagged (reply to user must not break)', async () => {
        mockModerationResponse({}, false);
        await expect((0, ai_safety_1.moderateUserText)('sk-test', 'text')).resolves.toEqual({
            flagged: false,
            category: null,
            matched: null,
        });
        global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
        await expect((0, ai_safety_1.moderateUserText)('sk-test', 'text')).resolves.toMatchObject({ flagged: false });
    });
    it('skips the call entirely without api key or empty text', async () => {
        const spy = jest.fn();
        global.fetch = spy;
        await (0, ai_safety_1.moderateUserText)('', 'text');
        await (0, ai_safety_1.moderateUserText)('sk-test', '   ');
        expect(spy).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=ai_safety.test.js.map