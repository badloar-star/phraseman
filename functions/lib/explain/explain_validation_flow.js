"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateExplanationWithRecovery = validateExplanationWithRecovery;
const explain_gates_1 = require("./explain_gates");
const explain_prompts_1 = require("./explain_prompts");
async function validateExplanationWithRecovery(input, deps) {
    const initialText = (0, explain_gates_1.sanitizeExplanationOutput)(input.initialGeneration.text);
    const sample = (0, explain_prompts_1.buildJudgeOutputLanguageSample)(initialText);
    const primaryJudge = await deps.judge(initialText);
    const base = {
        primaryReason: primaryJudge.reason,
        primaryJudge,
        repairJudge: null,
        adjudication: null,
        repairGeneration: null,
        regenerationUsed: false,
        wrongScriptRatio: (0, explain_gates_1.wrongScriptRatio)(sample.text, input.lang),
        maskedStudyFragments: sample.maskedFragmentCount,
    };
    if (primaryJudge.ok || primaryJudge.reason !== 'non_target_language') {
        return {
            ...base,
            text: initialText,
            published: primaryJudge.ok,
            finalReason: primaryJudge.reason,
        };
    }
    const adjudication = await deps.adjudicate(initialText);
    if (!adjudication.usable || adjudication.qualityVerdict !== 'ok') {
        return {
            ...base,
            text: initialText,
            published: false,
            finalReason: adjudication.qualityVerdict,
            adjudication,
        };
    }
    if (adjudication.languageMatch === 'match') {
        return {
            ...base,
            text: initialText,
            published: true,
            finalReason: 'ok',
            adjudication,
        };
    }
    const repairGeneration = await deps.generateRepair();
    const repairedText = (0, explain_gates_1.sanitizeExplanationOutput)(repairGeneration.text);
    const repairJudge = await deps.judge(repairedText);
    return {
        ...base,
        text: repairedText,
        published: repairJudge.ok,
        finalReason: repairJudge.reason,
        repairJudge,
        adjudication,
        repairGeneration,
        regenerationUsed: true,
    };
}
//# sourceMappingURL=explain_validation_flow.js.map