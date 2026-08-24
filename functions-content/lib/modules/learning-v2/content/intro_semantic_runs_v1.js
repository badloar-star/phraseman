"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_INTRO_RUN_SEMANTICS_V1 = void 0;
exports.introRunsPlainTextV1 = introRunsPlainTextV1;
exports.validateLearningV2IntroRunsByLocaleV1 = validateLearningV2IntroRunsByLocaleV1;
const generator_course_contract_1 = require("./generator_course_contract");
exports.LEARNING_V2_INTRO_RUN_SEMANTICS_V1 = Object.freeze([
    'explanation',
    'targetCorrect',
    'targetWrong',
    'nativeGloss',
]);
function introRunsPlainTextV1(runs) {
    return runs.map((run) => run.text).join('');
}
function validateLearningV2IntroRunsByLocaleV1(input) {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        throw new Error('learning_v2_generator_intro_runs_locales_invalid');
    }
    const expectedLocales = [...generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES].sort();
    const actualLocales = Object.keys(input).sort();
    if (actualLocales.length !== expectedLocales.length ||
        expectedLocales.some((locale, index) => actualLocales[index] !== locale)) {
        throw new Error('learning_v2_generator_intro_runs_locales_invalid');
    }
    const localizedRuns = input;
    for (const locale of generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES) {
        const runs = localizedRuns[locale];
        if (!Array.isArray(runs) || runs.length < 1 || runs.length > 64)
            throw new Error('learning_v2_intro_runs_invalid');
        for (const run of runs) {
            const runKeys = typeof run === 'object' && run !== null && !Array.isArray(run)
                ? Object.keys(run).sort()
                : [];
            if (typeof run !== 'object' ||
                run === null ||
                Array.isArray(run) ||
                runKeys.length !== 2 ||
                runKeys[0] !== 'semantic' ||
                runKeys[1] !== 'text' ||
                typeof run.text !== 'string' ||
                run.text.length < 1 ||
                run.text.length > 1_000 ||
                !exports.LEARNING_V2_INTRO_RUN_SEMANTICS_V1.some((semantic) => semantic === run.semantic)) {
                throw new Error('learning_v2_intro_run_invalid');
            }
        }
    }
    return input;
}
//# sourceMappingURL=intro_semantic_runs_v1.js.map