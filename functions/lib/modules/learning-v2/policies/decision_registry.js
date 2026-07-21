"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDecisionRegistry = exports.DecisionRegistryValidationError = exports.validateDecisionRegistry = exports.decisionRegistryObjectPath = exports.hashCanonicalBody = exports.utf8ByteLengthV1 = exports.canonicalJsonV1 = exports.CanonicalJsonError = exports.V2_DECISION_IDS = void 0;
exports.V2_DECISION_IDS = [
    'HYP-V2-001',
    'HYP-V2-002',
    'HYP-V2-003',
    'HYP-V2-004',
    'HYP-V2-005',
    'HYP-V2-006',
    'HYP-V2-007',
    'HYP-V2-008',
];
class CanonicalJsonError extends Error {
    constructor(code) {
        super(code);
        this.code = code;
        this.name = 'CanonicalJsonError';
    }
}
exports.CanonicalJsonError = CanonicalJsonError;
const hasLoneSurrogate = (value) => {
    for (let index = 0; index < value.length; index += 1) {
        const unit = value.charCodeAt(index);
        if (unit >= 0xd800 && unit <= 0xdbff) {
            const next = value.charCodeAt(index + 1);
            if (!(next >= 0xdc00 && next <= 0xdfff))
                return true;
            index += 1;
        }
        else if (unit >= 0xdc00 && unit <= 0xdfff)
            return true;
    }
    return false;
};
const assertCanonicalString = (value) => {
    if (hasLoneSurrogate(value))
        throw new CanonicalJsonError('canonical_json_lone_surrogate');
    if (value.normalize('NFC') !== value)
        throw new CanonicalJsonError('canonical_json_non_nfc');
};
const isPlainObject = (value) => {
    if (value === null || typeof value !== 'object' || Array.isArray(value))
        return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
};
const serializeCanonical = (value, ancestors) => {
    if (value === null)
        return 'null';
    if (typeof value === 'string') {
        assertCanonicalString(value);
        return JSON.stringify(value);
    }
    if (typeof value === 'boolean')
        return value ? 'true' : 'false';
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new CanonicalJsonError('canonical_json_non_finite_number');
        }
        if (Object.is(value, -0))
            throw new CanonicalJsonError('canonical_json_negative_zero');
        return JSON.stringify(value);
    }
    if (typeof value !== 'object') {
        throw new CanonicalJsonError('canonical_json_non_json_value');
    }
    if (ancestors.has(value))
        throw new CanonicalJsonError('canonical_json_cycle');
    ancestors.add(value);
    try {
        if (Array.isArray(value)) {
            if (Object.getPrototypeOf(value) !== Array.prototype) {
                throw new CanonicalJsonError('canonical_json_non_json_value');
            }
            const keys = Reflect.ownKeys(value);
            const expectedKeys = new Set(['length']);
            for (let index = 0; index < value.length; index += 1)
                expectedKeys.add(String(index));
            if (keys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
                throw new CanonicalJsonError('canonical_json_non_json_value');
            }
            const items = [];
            for (let index = 0; index < value.length; index += 1) {
                if (!Object.prototype.hasOwnProperty.call(value, index)) {
                    throw new CanonicalJsonError('canonical_json_sparse_array');
                }
                const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
                if (!descriptor?.enumerable || !('value' in descriptor)) {
                    throw new CanonicalJsonError('canonical_json_non_json_value');
                }
                items.push(serializeCanonical(value[index], ancestors));
            }
            return `[${items.join(',')}]`;
        }
        if (!isPlainObject(value))
            throw new CanonicalJsonError('canonical_json_non_json_value');
        const ownKeys = Reflect.ownKeys(value);
        if (ownKeys.some((key) => typeof key !== 'string')) {
            throw new CanonicalJsonError('canonical_json_non_json_value');
        }
        const keys = ownKeys;
        for (const key of keys) {
            assertCanonicalString(key);
            const descriptor = Object.getOwnPropertyDescriptor(value, key);
            if (!descriptor?.enumerable || !('value' in descriptor)) {
                throw new CanonicalJsonError('canonical_json_non_json_value');
            }
        }
        keys.sort();
        return `{${keys.map((key) => `${JSON.stringify(key)}:${serializeCanonical(value[key], ancestors)}`).join(',')}}`;
    }
    finally {
        ancestors.delete(value);
    }
};
const canonicalJsonV1 = (value) => serializeCanonical(value, new Set());
exports.canonicalJsonV1 = canonicalJsonV1;
const utf8Bytes = (value) => {
    assertCanonicalString(value);
    const bytes = [];
    for (let index = 0; index < value.length; index += 1) {
        const codePoint = value.codePointAt(index);
        if (codePoint > 0xffff)
            index += 1;
        if (codePoint <= 0x7f)
            bytes.push(codePoint);
        else if (codePoint <= 0x7ff) {
            bytes.push(0xc0 | (codePoint >>> 6), 0x80 | (codePoint & 0x3f));
        }
        else if (codePoint <= 0xffff) {
            bytes.push(0xe0 | (codePoint >>> 12), 0x80 | ((codePoint >>> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
        }
        else {
            bytes.push(0xf0 | (codePoint >>> 18), 0x80 | ((codePoint >>> 12) & 0x3f), 0x80 | ((codePoint >>> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
        }
    }
    return bytes;
};
const utf8ByteLengthV1 = (value) => utf8Bytes(value).length;
exports.utf8ByteLengthV1 = utf8ByteLengthV1;
const SHA256_CONSTANTS = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];
const rotateRight = (value, bits) => (value >>> bits) | (value << (32 - bits));
const sha256Utf8 = (value) => {
    const message = utf8Bytes(value);
    const bitLength = message.length * 8;
    message.push(0x80);
    while (message.length % 64 !== 56)
        message.push(0);
    const high = Math.floor(bitLength / 0x100000000);
    const low = bitLength >>> 0;
    for (let shift = 24; shift >= 0; shift -= 8)
        message.push((high >>> shift) & 0xff);
    for (let shift = 24; shift >= 0; shift -= 8)
        message.push((low >>> shift) & 0xff);
    const hash = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];
    const words = new Array(64);
    for (let offset = 0; offset < message.length; offset += 64) {
        for (let index = 0; index < 16; index += 1) {
            const start = offset + index * 4;
            words[index] = ((message[start] << 24) |
                (message[start + 1] << 16) |
                (message[start + 2] << 8) |
                message[start + 3]) >>> 0;
        }
        for (let index = 16; index < 64; index += 1) {
            const s0 = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^
                (words[index - 15] >>> 3);
            const s1 = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^
                (words[index - 2] >>> 10);
            words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
        }
        let [a, b, c, d, e, f, g, h] = hash;
        for (let index = 0; index < 64; index += 1) {
            const sigma1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
            const choose = (e & f) ^ (~e & g);
            const first = (h + sigma1 + choose + SHA256_CONSTANTS[index] + words[index]) >>> 0;
            const sigma0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
            const majority = (a & b) ^ (a & c) ^ (b & c);
            const second = (sigma0 + majority) >>> 0;
            h = g;
            g = f;
            f = e;
            e = (d + first) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (first + second) >>> 0;
        }
        hash[0] = (hash[0] + a) >>> 0;
        hash[1] = (hash[1] + b) >>> 0;
        hash[2] = (hash[2] + c) >>> 0;
        hash[3] = (hash[3] + d) >>> 0;
        hash[4] = (hash[4] + e) >>> 0;
        hash[5] = (hash[5] + f) >>> 0;
        hash[6] = (hash[6] + g) >>> 0;
        hash[7] = (hash[7] + h) >>> 0;
    }
    return hash.map((word) => word.toString(16).padStart(8, '0')).join('');
};
const hashCanonicalBody = (body) => sha256Utf8((0, exports.canonicalJsonV1)(body));
exports.hashCanonicalBody = hashCanonicalBody;
const decisionRegistryObjectPath = (registryId, version, contentHash) => `content-studio/decision-registries/${sha256Utf8(registryId)}/v${version}/${contentHash}.json`;
exports.decisionRegistryObjectPath = decisionRegistryObjectPath;
const ISSUE_ORDER = [
    'decision_registry_latest_ref_forbidden',
    'decision_registry_body_type_invalid',
    'decision_registry_field_missing',
    'decision_registry_field_unknown',
    'decision_registry_schema_version_invalid',
    'decision_registry_id_invalid',
    'decision_registry_version_invalid',
    'decision_registry_incomplete',
    'decision_registry_decision_key_mismatch',
    'decision_registry_entry_invalid',
    'decision_registry_claim_label_invalid',
    'decision_registry_evidence_ref_invalid',
    'decision_registry_setting_invalid',
    'decision_registry_number_invalid',
    'decision_registry_integer_invalid',
    'decision_registry_fraction_invalid',
    'decision_registry_range_invalid',
    'decision_registry_array_duplicate',
    'decision_registry_array_order_invalid',
    'decision_registry_derived_total_mismatch',
    'decision_registry_curve_unreachable',
    'decision_registry_window_policy_invalid',
    'decision_registry_rollout_milestone_invalid',
    'decision_registry_record_invalid',
    'decision_registry_created_at_invalid',
    'canonical_json_non_nfc',
    'canonical_json_lone_surrogate',
    'canonical_json_non_json_value',
    'canonical_json_non_finite_number',
    'canonical_json_negative_zero',
    'canonical_json_sparse_array',
    'canonical_json_cycle',
    'decision_registry_hash_mismatch',
    'decision_registry_object_hash_mismatch',
    'decision_registry_object_path_mismatch',
    'decision_registry_object_generation_invalid',
    'decision_registry_object_byte_size_invalid',
];
const ISSUE_RANK = new Map(ISSUE_ORDER.map((code, index) => [code, index]));
const ID_PATTERN = /^[A-Za-z0-9._-]{1,160}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const CLAIM_LABELS = new Set(['PRODUCT_HYPOTHESIS', 'CALIBRATED', 'OFFICIAL_STANDARD']);
const ROLLOUT_PERCENTAGES = new Set([0, 1, 5, 10, 25, 50, 100]);
const issue = (issues, code, path) => {
    issues.push({ code, path, severity: 'blocking', waivable: false });
};
const exactKeys = (value, expected, path, issues) => {
    const actual = Object.keys(value);
    const missing = expected.filter((key) => !Object.prototype.hasOwnProperty.call(value, key));
    if (missing.length > 0) {
        issue(issues, 'decision_registry_field_missing', `${path}.${missing.sort()[0]}`);
        return false;
    }
    const unknown = actual.filter((key) => !expected.includes(key));
    if (unknown.length > 0) {
        issue(issues, 'decision_registry_field_unknown', `${path}.${unknown.sort()[0]}`);
        return false;
    }
    return true;
};
const safeInteger = (value, path, minimum, issues) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || Object.is(value, -0)) {
        issue(issues, 'decision_registry_number_invalid', path);
        return false;
    }
    if (!Number.isSafeInteger(value) || value < minimum) {
        issue(issues, 'decision_registry_integer_invalid', path);
        return false;
    }
    return true;
};
const fraction = (value, path, issues) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || Object.is(value, -0)) {
        issue(issues, 'decision_registry_number_invalid', path);
        return false;
    }
    if (value < 0 || value > 1) {
        issue(issues, 'decision_registry_fraction_invalid', path);
        return false;
    }
    return true;
};
const integerRange = (value, path, minimum, issues) => {
    if (!isPlainObject(value)) {
        issue(issues, 'decision_registry_setting_invalid', path);
        return false;
    }
    if (!exactKeys(value, ['min', 'max'], path, issues))
        return false;
    const before = issues.length;
    const minValid = safeInteger(value.min, `${path}.min`, minimum, issues);
    const maxValid = safeInteger(value.max, `${path}.max`, minimum, issues);
    if (issues.length !== before || !minValid || !maxValid)
        return false;
    if (value.min > value.max) {
        issue(issues, 'decision_registry_range_invalid', path);
        return false;
    }
    return true;
};
const validateVersionRef = (value, path, issues) => {
    if (!isPlainObject(value)) {
        issue(issues, 'decision_registry_evidence_ref_invalid', path);
        return false;
    }
    if (!exactKeys(value, ['id', 'version', 'contentHash'], path, issues)) {
        return false;
    }
    if (typeof value.id !== 'string' || !ID_PATTERN.test(value.id)) {
        issue(issues, 'decision_registry_evidence_ref_invalid', `${path}.id`);
        return false;
    }
    if (typeof value.version !== 'number' || !Number.isSafeInteger(value.version) ||
        value.version < 1 || Object.is(value.version, -0)) {
        issue(issues, 'decision_registry_evidence_ref_invalid', `${path}.version`);
        return false;
    }
    if (typeof value.contentHash !== 'string' || !HASH_PATTERN.test(value.contentHash)) {
        issue(issues, 'decision_registry_evidence_ref_invalid', `${path}.contentHash`);
        return false;
    }
    return true;
};
const validateBaseEntry = (value, decisionId, path, issues) => {
    if (!exactKeys(value, ['decisionId', 'claimLabel', 'owner', 'evidenceRefs', 'settings'], path, issues)) {
        return false;
    }
    if (value.decisionId !== decisionId) {
        issue(issues, 'decision_registry_decision_key_mismatch', `${path}.decisionId`);
        return false;
    }
    if (typeof value.claimLabel !== 'string' || !CLAIM_LABELS.has(value.claimLabel)) {
        issue(issues, 'decision_registry_claim_label_invalid', `${path}.claimLabel`);
        return false;
    }
    if (typeof value.owner !== 'string' || value.owner.length === 0 || value.owner.length > 160 || value.owner.trim() !== value.owner) {
        issue(issues, 'decision_registry_entry_invalid', `${path}.owner`);
        return false;
    }
    if (!Array.isArray(value.evidenceRefs)) {
        issue(issues, 'decision_registry_evidence_ref_invalid', `${path}.evidenceRefs`);
        return false;
    }
    for (let index = 0; index < value.evidenceRefs.length; index += 1) {
        if (!validateVersionRef(value.evidenceRefs[index], `${path}.evidenceRefs[${index}]`, issues))
            return false;
    }
    if (!isPlainObject(value.settings)) {
        issue(issues, 'decision_registry_setting_invalid', `${path}.settings`);
        return false;
    }
    return true;
};
const validateOrdinalItems = (value, path, issues) => {
    if (!Array.isArray(value) || value.length === 0) {
        issue(issues, 'decision_registry_setting_invalid', path);
        return undefined;
    }
    const items = [];
    for (let index = 0; index < value.length; index += 1) {
        const item = value[index];
        if (!isPlainObject(item) || !exactKeys(item, ['episodeOrdinal', 'value'], `${path}[${index}]`, issues)) {
            return undefined;
        }
        if (!safeInteger(item.episodeOrdinal, `${path}[${index}].episodeOrdinal`, 1, issues) ||
            !safeInteger(item.value, `${path}[${index}].value`, 0, issues))
            return undefined;
        items.push(item);
    }
    const ordinals = items.map((item) => item.episodeOrdinal);
    if (new Set(ordinals).size !== ordinals.length) {
        issue(issues, 'decision_registry_array_duplicate', path);
        return undefined;
    }
    if (ordinals.some((ordinal, index) => index > 0 && ordinal <= ordinals[index - 1])) {
        issue(issues, 'decision_registry_array_order_invalid', path);
        return undefined;
    }
    return items;
};
const validateIncreasingIntegers = (value, path, minimum, issues) => {
    if (!Array.isArray(value) || value.length === 0) {
        issue(issues, 'decision_registry_setting_invalid', path);
        return undefined;
    }
    for (let index = 0; index < value.length; index += 1) {
        if (!safeInteger(value[index], `${path}[${index}]`, minimum, issues))
            return undefined;
    }
    const numbers = value;
    if (new Set(numbers).size !== numbers.length) {
        issue(issues, 'decision_registry_array_duplicate', path);
        return undefined;
    }
    if (numbers.some((number, index) => index > 0 && number <= numbers[index - 1])) {
        issue(issues, 'decision_registry_array_order_invalid', path);
        return undefined;
    }
    return numbers;
};
const validateDecisionSettings = (decisionId, settings, path, context, issues) => {
    const before = issues.length;
    if (decisionId === 'HYP-V2-001') {
        if (!exactKeys(settings, ['seasonEpisodeCount', 'chapterCount', 'episodesPerChapter', 'checkpointOrdinals', 'visibleNodeCount', 'targetEpisodeMinutes'], path, issues))
            return false;
        const seasonOk = safeInteger(settings.seasonEpisodeCount, `${path}.seasonEpisodeCount`, 1, issues);
        const chapterOk = safeInteger(settings.chapterCount, `${path}.chapterCount`, 1, issues);
        const perChapterOk = safeInteger(settings.episodesPerChapter, `${path}.episodesPerChapter`, 1, issues);
        const checkpoints = validateIncreasingIntegers(settings.checkpointOrdinals, `${path}.checkpointOrdinals`, 1, issues);
        integerRange(settings.visibleNodeCount, `${path}.visibleNodeCount`, 1, issues);
        integerRange(settings.targetEpisodeMinutes, `${path}.targetEpisodeMinutes`, 1, issues);
        if (issues.length === before && seasonOk && chapterOk && perChapterOk && checkpoints) {
            const season = settings.seasonEpisodeCount;
            const chapters = settings.chapterCount;
            const perChapter = settings.episodesPerChapter;
            if (season !== chapters * perChapter || checkpoints.length !== chapters ||
                checkpoints.some((ordinal, index) => ordinal !== (index + 1) * perChapter) ||
                checkpoints.at(-1) !== season) {
                issue(issues, 'decision_registry_derived_total_mismatch', path);
            }
            else {
                context.seasonEpisodeCount = season;
                context.chapterCount = chapters;
                context.checkpointOrdinals = checkpoints;
            }
        }
    }
    else if (decisionId === 'HYP-V2-002') {
        if (!exactKeys(settings, ['newPhraseFrames', 'newSemanticSlots', 'newSoundContrasts', 'targetVoiceTurns', 'maxMandatoryLearningRetries'], path, issues))
            return false;
        integerRange(settings.newPhraseFrames, `${path}.newPhraseFrames`, 0, issues);
        integerRange(settings.newSemanticSlots, `${path}.newSemanticSlots`, 0, issues);
        integerRange(settings.newSoundContrasts, `${path}.newSoundContrasts`, 0, issues);
        integerRange(settings.targetVoiceTurns, `${path}.targetVoiceTurns`, 0, issues);
        safeInteger(settings.maxMandatoryLearningRetries, `${path}.maxMandatoryLearningRetries`, 0, issues);
    }
    else if (decisionId === 'HYP-V2-003') {
        if (!exactKeys(settings, ['completionCutoff', 'independentMasteryCutoff', 'checkpointCutoffById'], path, issues))
            return false;
        fraction(settings.completionCutoff, `${path}.completionCutoff`, issues);
        fraction(settings.independentMasteryCutoff, `${path}.independentMasteryCutoff`, issues);
        if (!isPlainObject(settings.checkpointCutoffById) || Object.keys(settings.checkpointCutoffById).length === 0) {
            issue(issues, 'decision_registry_setting_invalid', `${path}.checkpointCutoffById`);
        }
        else {
            for (const checkpointId of Object.keys(settings.checkpointCutoffById).sort()) {
                if (!ID_PATTERN.test(checkpointId)) {
                    issue(issues, 'decision_registry_id_invalid', `${path}.checkpointCutoffById.${checkpointId}`);
                    break;
                }
                fraction(settings.checkpointCutoffById[checkpointId], `${path}.checkpointCutoffById.${checkpointId}`, issues);
            }
            context.checkpointCutoffIds = Object.keys(settings.checkpointCutoffById).sort();
            context.checkpointCutoffCount = context.checkpointCutoffIds.length;
        }
    }
    else if (decisionId === 'HYP-V2-004') {
        if (!exactKeys(settings, ['maxStarsPerSlot', 'gateEligibleSlotsPerEpisode', 'maxStarsPerEpisode', 'maxStarsPerSeason'], path, issues))
            return false;
        const slotOk = safeInteger(settings.maxStarsPerSlot, `${path}.maxStarsPerSlot`, 1, issues);
        const countOk = safeInteger(settings.gateEligibleSlotsPerEpisode, `${path}.gateEligibleSlotsPerEpisode`, 1, issues);
        const episodeOk = safeInteger(settings.maxStarsPerEpisode, `${path}.maxStarsPerEpisode`, 1, issues);
        const seasonOk = safeInteger(settings.maxStarsPerSeason, `${path}.maxStarsPerSeason`, 1, issues);
        if (slotOk && countOk && episodeOk && seasonOk) {
            context.maxStarsPerEpisode = settings.maxStarsPerEpisode;
            context.maxStarsPerSeason = settings.maxStarsPerSeason;
            if (settings.maxStarsPerEpisode !==
                settings.maxStarsPerSlot * settings.gateEligibleSlotsPerEpisode ||
                (context.seasonEpisodeCount !== undefined &&
                    settings.maxStarsPerSeason !==
                        settings.maxStarsPerEpisode * context.seasonEpisodeCount)) {
                issue(issues, 'decision_registry_derived_total_mismatch', path);
            }
        }
    }
    else if (decisionId === 'HYP-V2-005') {
        if (!exactKeys(settings, ['requiredLoopKinds', 'localEarnedMinimumByEpisodeOrdinal', 'cumulativeAccessByEpisodeOrdinal', 'seasonAccessTarget'], path, issues))
            return false;
        if (!Array.isArray(settings.requiredLoopKinds) || settings.requiredLoopKinds.length !== 2 ||
            settings.requiredLoopKinds[0] !== 'encounter_build' || settings.requiredLoopKinds[1] !== 'near_transfer') {
            issue(issues, 'decision_registry_setting_invalid', `${path}.requiredLoopKinds`);
        }
        context.localCurve = validateOrdinalItems(settings.localEarnedMinimumByEpisodeOrdinal, `${path}.localEarnedMinimumByEpisodeOrdinal`, issues);
        context.cumulativeCurve = validateOrdinalItems(settings.cumulativeAccessByEpisodeOrdinal, `${path}.cumulativeAccessByEpisodeOrdinal`, issues);
        if (safeInteger(settings.seasonAccessTarget, `${path}.seasonAccessTarget`, 0, issues)) {
            context.seasonAccessTarget = settings.seasonAccessTarget;
        }
    }
    else if (decisionId === 'HYP-V2-006') {
        if (!exactKeys(settings, ['accessBoostPriceShards', 'maxBoostsPerGate', 'maxBoostsPerChapter', 'maxBoostsPerSeason', 'eligibleDeficit', 'recoveryImpressionCount', 'quoteTtlSeconds'], path, issues))
            return false;
        safeInteger(settings.accessBoostPriceShards, `${path}.accessBoostPriceShards`, 1, issues);
        const gateOk = safeInteger(settings.maxBoostsPerGate, `${path}.maxBoostsPerGate`, 1, issues);
        safeInteger(settings.maxBoostsPerChapter, `${path}.maxBoostsPerChapter`, 1, issues);
        safeInteger(settings.maxBoostsPerSeason, `${path}.maxBoostsPerSeason`, 1, issues);
        const deficitOk = integerRange(settings.eligibleDeficit, `${path}.eligibleDeficit`, 1, issues);
        safeInteger(settings.recoveryImpressionCount, `${path}.recoveryImpressionCount`, 0, issues);
        safeInteger(settings.quoteTtlSeconds, `${path}.quoteTtlSeconds`, 1, issues);
        if (gateOk && deficitOk) {
            const deficitMaximum = settings.eligibleDeficit.max;
            const caps = [settings.maxBoostsPerGate, settings.maxBoostsPerChapter, settings.maxBoostsPerSeason];
            if (caps.every((cap) => typeof cap === 'number' && Number.isSafeInteger(cap)) &&
                caps.some((cap) => deficitMaximum > cap)) {
                issue(issues, 'decision_registry_curve_unreachable', `${path}.eligibleDeficit`);
            }
        }
    }
    else if (decisionId === 'HYP-V2-007') {
        if (!exactKeys(settings, ['delayedWindowPolicyId', 'assessableWindowDays', 'postSeasonReviewDays', 'successPolicyId'], path, issues))
            return false;
        if (settings.delayedWindowPolicyId !== 'dts-7.d3-d7.v1') {
            issue(issues, 'decision_registry_window_policy_invalid', `${path}.delayedWindowPolicyId`);
        }
        const windowOk = integerRange(settings.assessableWindowDays, `${path}.assessableWindowDays`, 1, issues);
        if (windowOk && (settings.assessableWindowDays.min !== 3 || settings.assessableWindowDays.max !== 7)) {
            issue(issues, 'decision_registry_window_policy_invalid', `${path}.assessableWindowDays`);
        }
        validateIncreasingIntegers(settings.postSeasonReviewDays, `${path}.postSeasonReviewDays`, 1, issues);
        if (settings.successPolicyId !== 'dts-7.independent-transfer-success.v1') {
            issue(issues, 'decision_registry_window_policy_invalid', `${path}.successPolicyId`);
        }
    }
    else {
        if (!exactKeys(settings, ['rolloutMilestones'], path, issues))
            return false;
        const milestones = settings.rolloutMilestones;
        if (!Array.isArray(milestones) || milestones.length === 0) {
            issue(issues, 'decision_registry_rollout_milestone_invalid', `${path}.rolloutMilestones`);
        }
        else {
            const percentages = [];
            let structural = true;
            for (let index = 0; index < milestones.length; index += 1) {
                const milestone = milestones[index];
                const itemPath = `${path}.rolloutMilestones[${index}]`;
                if (!isPlainObject(milestone)) {
                    issue(issues, 'decision_registry_setting_invalid', itemPath);
                    structural = false;
                    break;
                }
                if (!exactKeys(milestone, ['rolloutPercent', 'minimumObservationHours', 'minimumEligibleAssignments'], itemPath, issues)) {
                    structural = false;
                    break;
                }
                if (!safeInteger(milestone.rolloutPercent, `${itemPath}.rolloutPercent`, 0, issues) ||
                    !ROLLOUT_PERCENTAGES.has(milestone.rolloutPercent)) {
                    if (Number.isSafeInteger(milestone.rolloutPercent)) {
                        issue(issues, 'decision_registry_rollout_milestone_invalid', `${itemPath}.rolloutPercent`);
                    }
                    structural = false;
                    break;
                }
                const hoursOk = safeInteger(milestone.minimumObservationHours, `${itemPath}.minimumObservationHours`, 0, issues);
                const assignmentsOk = safeInteger(milestone.minimumEligibleAssignments, `${itemPath}.minimumEligibleAssignments`, 0, issues);
                if (hoursOk && assignmentsOk && milestone.rolloutPercent > 0 &&
                    (milestone.minimumObservationHours === 0 || milestone.minimumEligibleAssignments === 0)) {
                    issue(issues, 'decision_registry_rollout_milestone_invalid', itemPath);
                    structural = false;
                    break;
                }
                percentages.push(milestone.rolloutPercent);
            }
            if (structural) {
                if (new Set(percentages).size !== percentages.length) {
                    issue(issues, 'decision_registry_array_duplicate', `${path}.rolloutMilestones`);
                }
                else if (percentages.some((percent, index) => index > 0 && percent <= percentages[index - 1])) {
                    issue(issues, 'decision_registry_array_order_invalid', `${path}.rolloutMilestones`);
                }
                else {
                    for (let index = 1; index < milestones.length; index += 1) {
                        const previous = milestones[index - 1];
                        const current = milestones[index];
                        if (current.minimumObservationHours < previous.minimumObservationHours ||
                            current.minimumEligibleAssignments < previous.minimumEligibleAssignments) {
                            issue(issues, 'decision_registry_rollout_milestone_invalid', `${path}.rolloutMilestones[${index}]`);
                            break;
                        }
                    }
                }
            }
        }
    }
    return issues.length === before;
};
const validateBody = (value, issues) => {
    const context = {};
    if (!isPlainObject(value)) {
        issue(issues, 'decision_registry_body_type_invalid', '$.body');
        return { context, valid: false };
    }
    if (!exactKeys(value, ['schemaVersion', 'registryId', 'version', 'decisions'], '$.body', issues)) {
        return { body: value, context, valid: false };
    }
    let valid = true;
    if (value.schemaVersion !== 'v2-decision-registry-body.v1') {
        issue(issues, 'decision_registry_schema_version_invalid', '$.body.schemaVersion');
        valid = false;
    }
    if (value.registryId !== 'phraseman-v2-product-decisions') {
        issue(issues, 'decision_registry_id_invalid', '$.body.registryId');
        valid = false;
    }
    if (!safeInteger(value.version, '$.body.version', 1, issues))
        valid = false;
    if (!isPlainObject(value.decisions)) {
        issue(issues, 'decision_registry_incomplete', '$.body.decisions');
        return { body: value, context, valid: false };
    }
    const decisionKeys = Object.keys(value.decisions).sort();
    if (decisionKeys.length !== exports.V2_DECISION_IDS.length ||
        decisionKeys.some((key, index) => key !== [...exports.V2_DECISION_IDS].sort()[index])) {
        issue(issues, 'decision_registry_incomplete', '$.body.decisions');
        return { body: value, context, valid: false };
    }
    const decisionValidity = new Map();
    for (const decisionId of exports.V2_DECISION_IDS) {
        const entry = value.decisions[decisionId];
        const entryPath = `$.body.decisions.${decisionId}`;
        if (!isPlainObject(entry)) {
            issue(issues, 'decision_registry_entry_invalid', entryPath);
            valid = false;
            decisionValidity.set(decisionId, false);
            continue;
        }
        if (!validateBaseEntry(entry, decisionId, entryPath, issues)) {
            valid = false;
            decisionValidity.set(decisionId, false);
            continue;
        }
        const settingsValid = validateDecisionSettings(decisionId, entry.settings, `${entryPath}.settings`, context, issues);
        decisionValidity.set(decisionId, settingsValid);
        if (!settingsValid) {
            valid = false;
        }
    }
    if (value.version === 1 && decisionValidity.get('HYP-V2-008')) {
        const rolloutMilestones = value.decisions['HYP-V2-008'].settings.rolloutMilestones;
        const internalMilestone = rolloutMilestones[0];
        if (rolloutMilestones.length !== 1 ||
            internalMilestone.rolloutPercent !== 0 ||
            internalMilestone.minimumObservationHours !== 0 ||
            internalMilestone.minimumEligibleAssignments !== 0) {
            issue(issues, 'decision_registry_rollout_milestone_invalid', '$.body.decisions.HYP-V2-008.settings.rolloutMilestones');
            valid = false;
        }
    }
    if (decisionValidity.get('HYP-V2-001') && decisionValidity.get('HYP-V2-003')) {
        const expectedCheckpointIds = (context.checkpointOrdinals ?? [])
            .map((ordinal) => `ep-${String(ordinal).padStart(2, '0')}`)
            .sort();
        if (context.checkpointCutoffCount !== context.chapterCount ||
            context.checkpointCutoffIds?.some((id, index) => id !== expectedCheckpointIds[index])) {
            issue(issues, 'decision_registry_derived_total_mismatch', '$.body.decisions.HYP-V2-003.settings.checkpointCutoffById');
            valid = false;
        }
    }
    if (decisionValidity.get('HYP-V2-001') && decisionValidity.get('HYP-V2-004') &&
        decisionValidity.get('HYP-V2-005')) {
        const local = context.localCurve ?? [];
        const cumulative = context.cumulativeCurve ?? [];
        const seasonCount = context.seasonEpisodeCount;
        const maxEpisode = context.maxStarsPerEpisode;
        const maxSeason = context.maxStarsPerSeason;
        if (local.length !== seasonCount || local.some((item, index) => item.episodeOrdinal !== index + 1) ||
            cumulative.length !== seasonCount - 1 || cumulative.some((item, index) => item.episodeOrdinal !== index + 2)) {
            issue(issues, 'decision_registry_derived_total_mismatch', '$.body.decisions.HYP-V2-005.settings');
            valid = false;
        }
        else {
            const localUnreachable = local.some((item, index) => item.value > maxEpisode ||
                (index > 0 && item.value < local[index - 1].value));
            const cumulativeUnreachable = cumulative.some((item, index) => item.value > maxEpisode * (item.episodeOrdinal - 1) ||
                (index > 0 && item.value < cumulative[index - 1].value));
            const finalThreshold = cumulative.at(-1)?.value;
            if (localUnreachable || cumulativeUnreachable || context.seasonAccessTarget < finalThreshold ||
                context.seasonAccessTarget > maxSeason) {
                issue(issues, 'decision_registry_curve_unreachable', '$.body.decisions.HYP-V2-005.settings');
                valid = false;
            }
        }
    }
    return { body: value, context, valid };
};
const validIsoDateTime = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))
        return false;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.toISOString() === value;
};
const validateRecord = (value, issues) => {
    if (!isPlainObject(value) || !exactKeys(value, ['schemaVersion', 'ref', 'object', 'createdAt'], '$.record', issues)) {
        if (!isPlainObject(value))
            issue(issues, 'decision_registry_record_invalid', '$.record');
        return { valid: false };
    }
    let valid = true;
    if (value.schemaVersion !== 'v2-decision-registry-record.v1') {
        issue(issues, 'decision_registry_record_invalid', '$.record.schemaVersion');
        valid = false;
    }
    if (!isPlainObject(value.ref)) {
        issue(issues, 'decision_registry_record_invalid', '$.record.ref');
        valid = false;
    }
    else if (!exactKeys(value.ref, ['id', 'version', 'contentHash'], '$.record.ref', issues)) {
        valid = false;
    }
    else {
        if (typeof value.ref.id !== 'string' || !ID_PATTERN.test(value.ref.id)) {
            issue(issues, 'decision_registry_id_invalid', '$.record.ref.id');
            valid = false;
        }
        if (!safeInteger(value.ref.version, '$.record.ref.version', 1, issues))
            valid = false;
        if (typeof value.ref.contentHash !== 'string' || !HASH_PATTERN.test(value.ref.contentHash)) {
            issue(issues, 'decision_registry_hash_mismatch', '$.record.ref.contentHash');
            valid = false;
        }
    }
    if (!isPlainObject(value.object)) {
        issue(issues, 'decision_registry_record_invalid', '$.record.object');
        valid = false;
    }
    else if (!exactKeys(value.object, ['objectPath', 'contentHash', 'objectGeneration', 'byteSize'], '$.record.object', issues)) {
        valid = false;
    }
    else {
        if (typeof value.object.objectPath !== 'string' || value.object.objectPath.length === 0) {
            issue(issues, 'decision_registry_object_path_mismatch', '$.record.object.objectPath');
            valid = false;
        }
        if (typeof value.object.contentHash !== 'string' || !HASH_PATTERN.test(value.object.contentHash)) {
            issue(issues, 'decision_registry_object_hash_mismatch', '$.record.object.contentHash');
            valid = false;
        }
        if (typeof value.object.objectGeneration !== 'string' || value.object.objectGeneration.trim().length === 0) {
            issue(issues, 'decision_registry_object_generation_invalid', '$.record.object.objectGeneration');
            valid = false;
        }
        if (!safeInteger(value.object.byteSize, '$.record.object.byteSize', 1, issues)) {
            const latest = issues.at(-1);
            if (latest?.path === '$.record.object.byteSize') {
                issues.pop();
                issue(issues, 'decision_registry_object_byte_size_invalid', '$.record.object.byteSize');
            }
            valid = false;
        }
    }
    if (!validIsoDateTime(value.createdAt)) {
        issue(issues, 'decision_registry_created_at_invalid', '$.record.createdAt');
        valid = false;
    }
    return { record: value, valid };
};
const sortIssues = (issues) => issues.sort((left, right) => {
    const rank = (ISSUE_RANK.get(left.code) ?? Number.MAX_SAFE_INTEGER) -
        (ISSUE_RANK.get(right.code) ?? Number.MAX_SAFE_INTEGER);
    if (rank !== 0)
        return rank;
    return left.path < right.path ? -1 : left.path > right.path ? 1 : 0;
});
const validateDecisionRegistry = (input) => {
    const issues = [];
    if (isPlainObject(input) && Object.prototype.hasOwnProperty.call(input, 'latest')) {
        issue(issues, 'decision_registry_latest_ref_forbidden', '$.latest');
        return { ok: false, issues };
    }
    if (!isPlainObject(input) || !exactKeys(input, ['body', 'record'], '$', issues)) {
        if (!isPlainObject(input))
            issue(issues, 'decision_registry_body_type_invalid', '$');
        return { ok: false, issues: sortIssues(issues) };
    }
    const bodyResult = validateBody(input.body, issues);
    const recordResult = validateRecord(input.record, issues);
    if (bodyResult.valid && recordResult.valid && bodyResult.body && recordResult.record) {
        const body = bodyResult.body;
        const record = recordResult.record;
        const ref = record.ref;
        const object = record.object;
        let canonical;
        try {
            canonical = (0, exports.canonicalJsonV1)(body);
        }
        catch (error) {
            if (!(error instanceof CanonicalJsonError))
                throw error;
            issue(issues, error.code, '$.body');
            return { ok: false, issues: sortIssues(issues) };
        }
        const bodyHash = sha256Utf8(canonical);
        if (ref.id !== body.registryId)
            issue(issues, 'decision_registry_id_invalid', '$.record.ref.id');
        if (ref.version !== body.version)
            issue(issues, 'decision_registry_version_invalid', '$.record.ref.version');
        if (ref.contentHash !== bodyHash)
            issue(issues, 'decision_registry_hash_mismatch', '$.record.ref.contentHash');
        if (object.contentHash !== bodyHash)
            issue(issues, 'decision_registry_object_hash_mismatch', '$.record.object.contentHash');
        const expectedPath = (0, exports.decisionRegistryObjectPath)(body.registryId, body.version, bodyHash);
        if (object.objectPath !== expectedPath)
            issue(issues, 'decision_registry_object_path_mismatch', '$.record.object.objectPath');
        if (object.byteSize !== (0, exports.utf8ByteLengthV1)(canonical)) {
            issue(issues, 'decision_registry_object_byte_size_invalid', '$.record.object.byteSize');
        }
    }
    sortIssues(issues);
    if (issues.length > 0)
        return { ok: false, issues };
    if (!bodyResult.valid || !recordResult.valid) {
        return {
            ok: false,
            issues: [{
                    code: 'decision_registry_record_invalid',
                    path: '$',
                    severity: 'blocking',
                    waivable: false,
                }],
        };
    }
    return { ok: true, issues: [], value: input };
};
exports.validateDecisionRegistry = validateDecisionRegistry;
class DecisionRegistryValidationError extends Error {
    constructor(issues) {
        super(issues[0]?.code ?? 'decision_registry_invalid');
        this.issues = issues;
        this.name = 'DecisionRegistryValidationError';
    }
}
exports.DecisionRegistryValidationError = DecisionRegistryValidationError;
const resolveDecisionRegistry = (input) => {
    const result = (0, exports.validateDecisionRegistry)(input);
    if (!result.ok)
        throw new DecisionRegistryValidationError(result.issues);
    return result.value;
};
exports.resolveDecisionRegistry = resolveDecisionRegistry;
//# sourceMappingURL=decision_registry.js.map