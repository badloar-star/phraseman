"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIALOGUE_V2_REVIEW_ROLES = exports.DIALOGUE_V2_STUDY_TARGETS = void 0;
exports.validateDialogueV2LanguagePack = validateDialogueV2LanguagePack;
exports.matchesDialogueV2ApprovedLanguagePackManifest = matchesDialogueV2ApprovedLanguagePackManifest;
const dialogue_v2_contract_1 = require("./dialogue_v2_contract");
const dialogue_v2_catalogue_index_1 = require("./dialogue_v2_catalogue_index");
exports.DIALOGUE_V2_STUDY_TARGETS = ['en', 'es', 'fr', 'de'];
exports.DIALOGUE_V2_REVIEW_ROLES = [
    'targetContractGuardian',
    'scenarioPackReviewer',
    'promptLanguageJudge',
    'voiceLocaleGate',
    'stateIsolationJudge',
    'surfaceMatrixGate',
];
const TOKEN_RE = /^(?=.{1,128}$)[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
const SHA256_RE = /^[a-f0-9]{64}$/;
const PERSONA_STYLES = new Set(['warm', 'direct', 'calm', 'playful', 'formal']);
const VOICE_MODES = new Set(['text_only', 'optional_prepared_voice']);
const PERSONA_MOODS = new Set(['open', 'focused', 'helpful', 'measured', 'energetic']);
const PERSONA_CORRECTION_STYLES = new Set(['none', 'gentle', 'playful_gentle']);
const REVIEW_VERDICTS = new Set(['PASS', 'REVISE', 'BLOCK']);
function record(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : null;
}
function canonicalToken(value) {
    return typeof value === 'string' && value === value.trim() && TOKEN_RE.test(value);
}
function learnerText(value, minLength, maxLength) {
    return typeof value === 'string'
        && value === value.trim()
        && value.length >= minLength
        && value.length <= maxLength
        && !/[\u0000-\u001f\u007f]/.test(value);
}
function sha256(value) {
    return typeof value === 'string' && SHA256_RE.test(value);
}
function manifestKey(studyTarget, scenarioId) {
    return `${studyTarget}:${scenarioId}`;
}
function validateDialogueV2LanguagePack(value) {
    const packet = record(value);
    if (!packet)
        return { ok: false, error: 'packet_invalid' };
    if (!exports.DIALOGUE_V2_STUDY_TARGETS.includes(packet.studyTarget)) {
        return { ok: false, error: 'study_target' };
    }
    const scenario = record(packet.scenario);
    if (!scenario || !(0, dialogue_v2_contract_1.validateDialogueV2PackReference)({
        scenarioId: scenario.id,
        packVersion: packet.packVersion,
        packSha256: packet.packSha256,
        catalogueSha256: packet.catalogueSha256,
    }).ok || !sha256(packet.reviewReceiptSha256))
        return { ok: false, error: 'reference_invalid' };
    const entry = (0, dialogue_v2_catalogue_index_1.getDialogueV2CatalogueEntry)(scenario.id);
    if (!entry || scenario.worldId !== entry.worldId || scenario.rankRequired !== entry.rankRequired || scenario.cefr !== entry.cefr) {
        return { ok: false, error: 'catalogue_mismatch' };
    }
    if (!Array.isArray(scenario.personas) || scenario.personas.length < 1 || scenario.personas.length > 6) {
        return { ok: false, error: 'persona_invalid' };
    }
    const personaIds = new Set();
    for (const rawPersona of scenario.personas) {
        const persona = record(rawPersona);
        if (!persona || !canonicalToken(persona.id) || personaIds.has(persona.id)
            || !PERSONA_STYLES.has(persona.replyStyle)
            || !VOICE_MODES.has(persona.voiceMode))
            return { ok: false, error: 'persona_invalid' };
        if (!learnerText(persona.displayName, 1, 64) || !learnerText(persona.styleNote, 3, 240)) {
            return { ok: false, error: 'learner_content_invalid' };
        }
        if (!PERSONA_MOODS.has(persona.mood)
            || !PERSONA_CORRECTION_STYLES.has(persona.correctionStyle)) {
            return { ok: false, error: 'persona_behavior_invalid' };
        }
        personaIds.add(persona.id);
    }
    if (!Array.isArray(scenario.objectives) || scenario.objectives.length < 6 || scenario.objectives.length > 12) {
        return { ok: false, error: 'objective_count' };
    }
    const objectiveIds = new Set();
    for (const rawObjective of scenario.objectives) {
        const objective = record(rawObjective);
        if (!objective || !canonicalToken(objective.id) || objectiveIds.has(objective.id)) {
            return { ok: false, error: 'objective_id' };
        }
        if (!learnerText(objective.label, 3, 240))
            return { ok: false, error: 'learner_content_invalid' };
        objectiveIds.add(objective.id);
    }
    const policy = record(scenario.groupReplyPolicy);
    if (!policy || policy.maxDirectReplies !== 1 || (policy.maxUsefulFollowUps !== 0 && policy.maxUsefulFollowUps !== 1)
        || policy.silenceAllowed !== true)
        return { ok: false, error: 'group_policy_invalid' };
    const content = record(packet.content);
    if (!content
        || !learnerText(content.title, 3, 120)
        || !learnerText(content.briefing, 8, 480)
        || !learnerText(content.completionTone, 3, 96)) {
        return { ok: false, error: 'learner_content_invalid' };
    }
    const review = record(packet.review);
    if (!review || exports.DIALOGUE_V2_REVIEW_ROLES.some((role) => !REVIEW_VERDICTS.has(review[role]))) {
        return { ok: false, error: 'review_invalid' };
    }
    return { ok: true };
}
/**
 * Pure manifest-matching helper. It is NOT an authorization boundary: only a
 * server wrapper that owns its manifest may use this result to activate a pack.
 */
function matchesDialogueV2ApprovedLanguagePackManifest(value, manifest) {
    if (!validateDialogueV2LanguagePack(value).ok)
        return false;
    const packet = value;
    const review = packet.review;
    if (!exports.DIALOGUE_V2_REVIEW_ROLES.every((role) => review[role] === 'PASS'))
        return false;
    const pin = manifest[manifestKey(packet.studyTarget, packet.scenario.id)];
    return Boolean(pin
        && pin.studyTarget === packet.studyTarget
        && pin.scenarioId === packet.scenario.id
        && pin.packVersion === packet.packVersion
        && pin.packSha256 === packet.packSha256
        && pin.catalogueSha256 === packet.catalogueSha256
        && pin.reviewReceiptSha256 === packet.reviewReceiptSha256);
}
