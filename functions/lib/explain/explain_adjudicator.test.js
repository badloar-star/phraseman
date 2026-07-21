"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mockOpenAiChat = jest.fn();
jest.mock('./explain_provider', () => ({
    openAiChat: (...args) => mockOpenAiChat(...args),
}));
const explain_adjudicator_1 = require("./explain_adjudicator");
beforeEach(() => mockOpenAiChat.mockReset());
it('accepts only independent known language and quality values', () => {
    expect((0, explain_adjudicator_1.parseAdjudicationReply)('{"languageMatch":"match","qualityVerdict":"ok"}')).toEqual({
        languageMatch: 'match', qualityVerdict: 'ok',
    });
    expect((0, explain_adjudicator_1.parseAdjudicationReply)('{"languageMatch":"yes","qualityVerdict":"ok"}')).toBeNull();
});
it('marks malformed model JSON unusable without publishing it', async () => {
    mockOpenAiChat.mockResolvedValue({ text: 'not-json', promptTokens: 7, completionTokens: 2 });
    await expect((0, explain_adjudicator_1.adjudicateExplanation)({
        text: 'Русский текст объяснения достаточно длинный.', phraseEn: 'hello', lang: 'ru', studyTarget: 'en', apiKey: 'test',
    })).resolves.toMatchObject({
        usable: false, languageMatch: 'uncertain', qualityVerdict: 'incoherent', promptTokens: 7, completionTokens: 2,
    });
});
it('passes shared transport controls to the provider', async () => {
    mockOpenAiChat.mockResolvedValue({ text: '{"languageMatch":"match","qualityVerdict":"ok"}', promptTokens: 1, completionTokens: 1 });
    const beforeRequest = jest.fn();
    await (0, explain_adjudicator_1.adjudicateExplanation)({
        text: 'Русский текст объяснения достаточно длинный.', phraseEn: 'hello', lang: 'ru', studyTarget: 'en', apiKey: 'test',
        beforeRequest, deadlineAtMs: 123,
    });
    expect(mockOpenAiChat).toHaveBeenCalledWith(expect.objectContaining({ beforeRequest, deadlineAtMs: 123 }));
});
//# sourceMappingURL=explain_adjudicator.test.js.map