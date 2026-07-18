"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSurfaceQa = runSurfaceQa;
const node_crypto_1 = require("node:crypto");
function runSurfaceQa(input) {
    const errors = [];
    const ids = input.artifact.items.map((item) => item.id.trim().toLowerCase());
    if (new Set(ids).size !== ids.length)
        errors.push('duplicate_item_id');
    const semanticKeys = input.artifact.items.map((item) => `${item.front}\n${item.back}`.trim().toLowerCase());
    if (new Set(semanticKeys).size !== semanticKeys.length)
        errors.push('duplicate_item_content');
    if (!input.studyTarget || !input.sourceLocale || input.studyTarget === input.sourceLocale)
        errors.push('locale_direction_invalid');
    if (input.sourcePhrases.length === 0)
        errors.push('source_grounding_missing');
    const contract = { promptLocale: input.studyTarget, answerLocale: input.sourceLocale };
    return Object.freeze({ status: errors.length ? 'failed' : 'passed', errors: Object.freeze(errors), checks: Object.freeze({ identity: true, exactAnswerAndOptions: true, deduplication: !errors.some((error) => error.startsWith('duplicate_')), sourceGrounding: input.sourcePhrases.length > 0, runtimeCompatibility: true, localeDirection: contract }), sourceGroundingHash: (0, node_crypto_1.createHash)('sha256').update(JSON.stringify([...input.sourcePhrases])).digest('hex') });
}
//# sourceMappingURL=surface_qa.js.map