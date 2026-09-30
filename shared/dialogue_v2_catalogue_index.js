"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIALOGUE_V2_CATALOGUE_INDEX = void 0;
exports.getDialogueV2CatalogueEntry = getDialogueV2CatalogueEntry;
const dialogue_v2_contract_1 = require("./dialogue_v2_contract");
exports.DIALOGUE_V2_CATALOGUE_INDEX = Object.freeze(dialogue_v2_contract_1.DIALOGUE_V2_WORLD_IDS.flatMap((worldId) => dialogue_v2_contract_1.DIALOGUE_V2_CEFR_SEQUENCE.map((cefr, index) => Object.freeze({
    id: `${worldId}_${String(index + 1).padStart(2, '0')}`,
    worldId,
    rankRequired: index + 1,
    cefr,
}))));
const ENTRY_BY_ID = new Map(exports.DIALOGUE_V2_CATALOGUE_INDEX.map((entry) => [entry.id, entry]));
function getDialogueV2CatalogueEntry(scenarioId) {
    if (typeof scenarioId !== 'string')
        return null;
    return ENTRY_BY_ID.get(scenarioId) ?? null;
}
