"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIALOGUE_V2_CEFR_SEQUENCE = exports.DIALOGUE_V2_WORLD_IDS = void 0;
exports.validateDialogueV2Pack = validateDialogueV2Pack;
exports.isDialogueV2Pack = isDialogueV2Pack;
exports.validateDialogueV2PackReference = validateDialogueV2PackReference;
/**
 * Non-learner-facing structural contract for the next Dialogue catalogue.
 * Content is deliberately kept outside this module so no scenario becomes
 * runnable before it has passed its own authoring and locale gates.
 */
exports.DIALOGUE_V2_WORLD_IDS = ['social', 'work', 'travel', 'everyday'];
exports.DIALOGUE_V2_CEFR_SEQUENCE = [
    'A1', 'A1', 'A1', 'A1', 'A1',
    'A2', 'A2', 'A2', 'A2', 'A2',
    'B1', 'B1', 'B1',
    'B2', 'B2', 'B2',
    'C1', 'C1',
    'C2',
];
const DIALOGUE_V2_REFERENCE_TOKEN_RE = /^(?=.{1,128}$)[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
const SHA256_RE = /^[a-f0-9]{64}$/;
function validateDialogueV2Pack(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return { ok: false, error: 'pack_invalid' };
    const worlds = value.worlds;
    if (!Array.isArray(worlds) || worlds.length !== exports.DIALOGUE_V2_WORLD_IDS.length)
        return { ok: false, error: 'world_count' };
    const worldIds = new Set();
    const scenarioIds = new Set();
    for (const world of worlds) {
        if (!world || typeof world !== 'object' || Array.isArray(world))
            return { ok: false, error: 'world_invalid' };
        const row = world;
        if (typeof row.id !== 'string' || !exports.DIALOGUE_V2_WORLD_IDS.includes(row.id) || worldIds.has(row.id)) {
            return { ok: false, error: 'world_id' };
        }
        worldIds.add(row.id);
        if (!Array.isArray(row.scenarios) || row.scenarios.length !== exports.DIALOGUE_V2_CEFR_SEQUENCE.length) {
            return { ok: false, error: 'scenario_count' };
        }
        for (const [index, scenario] of row.scenarios.entries()) {
            if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario))
                return { ok: false, error: 'scenario_invalid' };
            const item = scenario;
            const scenarioId = typeof item.id === 'string' ? item.id.trim() : '';
            if (!scenarioId || item.id !== scenarioId || scenarioIds.has(scenarioId))
                return { ok: false, error: 'scenario_id' };
            scenarioIds.add(scenarioId);
            if (item.rankRequired !== index + 1 || item.cefr !== exports.DIALOGUE_V2_CEFR_SEQUENCE[index]) {
                return { ok: false, error: 'rank_or_cefr' };
            }
            if (!Array.isArray(item.objectives) || item.objectives.length < 6 || item.objectives.length > 12) {
                return { ok: false, error: 'objective_count' };
            }
            const objectiveIds = new Set();
            for (const objective of item.objectives) {
                if (!objective || typeof objective !== 'object' || Array.isArray(objective))
                    return { ok: false, error: 'objective_id' };
                const objectiveId = typeof objective.id === 'string'
                    ? objective.id.trim()
                    : '';
                if (!objectiveId || objective.id !== objectiveId || objectiveIds.has(objectiveId)) {
                    return { ok: false, error: 'objective_id' };
                }
                objectiveIds.add(objectiveId);
            }
        }
    }
    return { ok: true };
}
/**
 * Use this at client/server boundaries before treating untrusted JSON as the
 * structural V2 catalogue. Content and release eligibility remain separate.
 */
function isDialogueV2Pack(value) {
    return validateDialogueV2Pack(value).ok;
}
function validateDialogueV2PackReference(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { ok: false, error: 'pack_reference_invalid' };
    }
    const reference = value;
    const isCanonicalToken = (token) => (typeof token === 'string' && token === token.trim() && DIALOGUE_V2_REFERENCE_TOKEN_RE.test(token));
    const isSha256 = (hash) => (typeof hash === 'string' && SHA256_RE.test(hash));
    if (!isCanonicalToken(reference.scenarioId)
        || !isCanonicalToken(reference.packVersion)
        || !isSha256(reference.packSha256)
        || !isSha256(reference.catalogueSha256)) {
        return { ok: false, error: 'pack_reference_invalid' };
    }
    return { ok: true };
}
