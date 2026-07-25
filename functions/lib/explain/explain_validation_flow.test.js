"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const explain_validation_flow_1 = require("./explain_validation_flow");
const baseInput = {
    initialGeneration: { text: 'Фраза "hello" используется как приветствие.', promptTokens: 9, completionTokens: 6 },
    phraseEn: 'hello', lang: 'ru', studyTarget: 'en',
};
const judgeVerdict = (ok, reason) => ({ ok, reason, promptTokens: 3, completionTokens: 1 });
const adjudication = (languageMatch, qualityVerdict) => ({
    usable: true, languageMatch, qualityVerdict, promptTokens: 4, completionTokens: 2,
});
it.each([
    ['match and ok publishes the original', 'match', 'ok', true, 0],
    ['mismatch regenerates once', 'mismatch', 'ok', true, 1],
    ['uncertain regenerates once', 'uncertain', 'ok', true, 1],
    ['toxic never regenerates', 'match', 'toxic', false, 0],
])('%s', async (_name, languageMatch, qualityVerdict, expectedPublished, expectedRepairs) => {
    const repair = jest.fn().mockResolvedValue({ text: 'Исправленное русское объяснение.', promptTokens: 8, completionTokens: 5 });
    const judge = jest.fn()
        .mockResolvedValueOnce(judgeVerdict(false, 'non_target_language'))
        .mockResolvedValueOnce(judgeVerdict(true, 'ok'));
    const result = await (0, explain_validation_flow_1.validateExplanationWithRecovery)(baseInput, {
        judge, adjudicate: jest.fn().mockResolvedValue(adjudication(languageMatch, qualityVerdict)), generateRepair: repair,
    });
    expect(result.published).toBe(expectedPublished);
    expect(repair).toHaveBeenCalledTimes(expectedRepairs);
});
it('keeps ordinary primary verdicts on the normal path without adjudication', async () => {
    const adjudicate = jest.fn();
    const result = await (0, explain_validation_flow_1.validateExplanationWithRecovery)(baseInput, {
        judge: jest.fn().mockResolvedValue(judgeVerdict(false, 'off_topic')),
        adjudicate,
        generateRepair: jest.fn(),
    });
    expect(result).toMatchObject({ published: false, finalReason: 'off_topic', regenerationUsed: false });
    expect(adjudicate).not.toHaveBeenCalled();
});
it('never recurses after an invalid repaired generation', async () => {
    const repair = jest.fn().mockResolvedValue({ text: 'Still English prose.', promptTokens: 8, completionTokens: 5 });
    const judge = jest.fn()
        .mockResolvedValueOnce(judgeVerdict(false, 'non_target_language'))
        .mockResolvedValueOnce(judgeVerdict(false, 'non_target_language'));
    const adjudicate = jest.fn().mockResolvedValue(adjudication('mismatch', 'ok'));
    const result = await (0, explain_validation_flow_1.validateExplanationWithRecovery)(baseInput, { judge, adjudicate, generateRepair: repair });
    expect(result).toMatchObject({ published: false, finalReason: 'non_target_language', regenerationUsed: true });
    expect(repair).toHaveBeenCalledTimes(1);
    expect(adjudicate).toHaveBeenCalledTimes(1);
    expect(judge).toHaveBeenCalledTimes(2);
});
//# sourceMappingURL=explain_validation_flow.test.js.map