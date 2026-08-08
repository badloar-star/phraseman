"use strict";
/**
 * premiumDialogReview — финальный разбор диалога. Тестируем чистый парсер
 * ответа модели: он обязан пережить ограждения, битый JSON и мусорные поля.
 */
Object.defineProperty(exports, "__esModule", { value: true });
class FakeHttpsError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
jest.mock('firebase-functions/v2/https', () => ({
    HttpsError: FakeHttpsError,
    onCall: (optsOrHandler, maybeHandler) => typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
}));
jest.mock('firebase-functions/params', () => ({
    defineSecret: () => ({ value: () => 'sk-test-key' }),
}));
jest.mock('firebase-admin', () => ({
    apps: [],
    initializeApp: jest.fn(),
    firestore: jest.fn(),
}));
jest.mock('./callable_options', () => ({
    ENFORCE_APP_CHECK_OPENAI: false,
}));
const premium_dialog_review_1 = require("./premium_dialog_review");
describe('parseReviewEnvelope', () => {
    it('parses a clean review envelope', () => {
        const out = (0, premium_dialog_review_1.parseReviewEnvelope)(JSON.stringify({
            praise: 'Ты отлично держал разговор!',
            corrections: [
                { original: 'I want latte do you has latte', corrected: 'I would like a latte, do you have lattes?', note: 'После "do you" нужен глагол have.' },
            ],
            tip: 'Попробуй фразу "Could I have…?"',
        }));
        expect(out).not.toBeNull();
        expect(out.praise).toContain('отлично');
        expect(out.corrections).toHaveLength(1);
        expect(out.corrections[0].corrected).toContain('would like');
        expect(out.tip).toContain('Could I have');
    });
    it('strips ```json fences', () => {
        const out = (0, premium_dialog_review_1.parseReviewEnvelope)('```json\n{"praise":"Молодец!","corrections":[],"tip":""}\n```');
        expect(out).not.toBeNull();
        expect(out.praise).toBe('Молодец!');
        expect(out.corrections).toEqual([]);
    });
    it('returns null on unparseable content', () => {
        expect((0, premium_dialog_review_1.parseReviewEnvelope)('not json')).toBeNull();
        expect((0, premium_dialog_review_1.parseReviewEnvelope)('{"praise":')).toBeNull();
        expect((0, premium_dialog_review_1.parseReviewEnvelope)('')).toBeNull();
    });
    it('returns null when the object carries nothing useful', () => {
        expect((0, premium_dialog_review_1.parseReviewEnvelope)('{"foo":"bar"}')).toBeNull();
    });
    it('drops broken correction items and caps the list at 8', () => {
        const corrections = Array.from({ length: 12 }, (_, i) => ({
            original: `phrase ${i}`,
            corrected: `better ${i}`,
            note: 'note',
        }));
        corrections[1] = { original: '', corrected: 'x', note: '' };
        const out = (0, premium_dialog_review_1.parseReviewEnvelope)(JSON.stringify({ praise: 'ok', corrections, tip: '' }));
        expect(out).not.toBeNull();
        // 8 — максимум; битый элемент (пустой original) отброшен внутри первых восьми.
        expect(out.corrections.length).toBeLessThanOrEqual(8);
        expect(out.corrections.every((c) => c.original && c.corrected)).toBe(true);
    });
    it('accepts a corrections-only envelope (no praise/tip)', () => {
        const out = (0, premium_dialog_review_1.parseReviewEnvelope)(JSON.stringify({ corrections: [{ original: 'a', corrected: 'b', note: '' }] }));
        expect(out).not.toBeNull();
        expect(out.corrections).toHaveLength(1);
    });
});
//# sourceMappingURL=premium_dialog_review.test.js.map