"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARENA_LANGUAGE_REGISTRY_VERSION = exports.ARENA_TASK_MODES = exports.ARENA_STUDY_TARGETS = void 0;
exports.resolveArenaStudyTarget = resolveArenaStudyTarget;
exports.arenaStudyTargetMeta = arenaStudyTargetMeta;
exports.arenaTargetPublicationFingerprint = arenaTargetPublicationFingerprint;
exports.parseArenaTargetPublicationState = parseArenaTargetPublicationState;
exports.parseArenaTargetPublications = parseArenaTargetPublications;
exports.resolveArenaTargetPublication = resolveArenaTargetPublication;
exports.arenaTargetPublicationDisabled = arenaTargetPublicationDisabled;
exports.arenaTargetPublicationPointer = arenaTargetPublicationPointer;
exports.arenaPublishedTaskDocumentId = arenaPublishedTaskDocumentId;
exports.arenaPublishedTaskCursorDocumentId = arenaPublishedTaskCursorDocumentId;
const node_crypto_1 = require("node:crypto");
/** Server twin of modules/arena/target_registry.ts. Keep both covered by mirror tests. */
exports.ARENA_STUDY_TARGETS = ['en', 'es', 'fr', 'de', 'it'];
exports.ARENA_TASK_MODES = [
    'guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match',
];
const META = Object.freeze({
    en: Object.freeze({ name: 'English', sourceLocale: 'ru', speechLocale: 'en-US', distractorProfile: 'english_core', modes: exports.ARENA_TASK_MODES }),
    es: Object.freeze({ name: 'Spanish', sourceLocale: 'ru', speechLocale: 'es-ES', distractorProfile: 'spanish_agreement', modes: exports.ARENA_TASK_MODES }),
    fr: Object.freeze({ name: 'French', sourceLocale: 'ru', speechLocale: 'fr-FR', distractorProfile: 'french_agreement', modes: exports.ARENA_TASK_MODES }),
    de: Object.freeze({ name: 'German', sourceLocale: 'ru', speechLocale: 'de-DE', distractorProfile: 'german_case_order', modes: exports.ARENA_TASK_MODES }),
    it: Object.freeze({ name: 'Italian', sourceLocale: 'ru', speechLocale: 'it-IT', distractorProfile: 'italian_agreement', modes: exports.ARENA_TASK_MODES }),
});
exports.ARENA_LANGUAGE_REGISTRY_VERSION = 'arena-language-registry-v1';
function resolveArenaStudyTarget(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    return exports.ARENA_STUDY_TARGETS.includes(normalized)
        ? normalized
        : null;
}
function arenaStudyTargetMeta(target) {
    return META[target];
}
function record(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : null;
}
const SHA256_RE = /^[a-f0-9]{64}$/u;
const PENDING_KEYS = ['enabled', 'ready', 'studyTarget'];
const READY_KEYS = [
    'enabled',
    'factPackSha256',
    'factPackVersion',
    'manifestSha256',
    'merkleRootSha256',
    'poolVersion',
    'publicationFingerprint',
    'ready',
    'studyTarget',
];
/**
 * То же, плюс признак старого пула.
 *
 * зачем (аудит 2026-09-20): публикация запечатывается В МАТЧ, и при чтении
 * парсер обязан признак сохранить. Иначе матч, созданный на старом пуле,
 * при загрузке плана проверялся бы контурными правилами и падал с
 * `arena_match_sealed_task_invalid`. `hasExactKeys` отверг бы лишний ключ,
 * поэтому нужен отдельный допустимый набор.
 */
const READY_KEYS_LEGACY = [...READY_KEYS, 'legacy'].sort();
function hasExactKeys(row, expected) {
    const actual = Object.keys(row).sort();
    return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}
function exactNonEmptyString(value) {
    if (typeof value !== 'string' || value.length === 0 || value.length > 200 || value.trim() !== value) {
        return null;
    }
    return value;
}
/** Canonical, target-bound identity for one immutable Arena publication. */
function arenaTargetPublicationFingerprint(identity) {
    const canonical = JSON.stringify([
        'arena-target-publication.v1',
        identity.studyTarget,
        identity.poolVersion,
        identity.manifestSha256,
        identity.merkleRootSha256,
        identity.factPackVersion,
        identity.factPackSha256,
    ]);
    return (0, node_crypto_1.createHash)('sha256').update(canonical, 'utf8').digest('hex');
}
/** Parse one slot without inventing a legacy/default target. */
function parseArenaTargetPublicationState(value, target) {
    const raw = record(value);
    if (!raw || raw.studyTarget !== target || typeof raw.enabled !== 'boolean')
        return null;
    if (raw.ready === false) {
        if (raw.enabled !== false || !hasExactKeys(raw, PENDING_KEYS))
            return null;
        return { studyTarget: target, enabled: false, ready: false };
    }
    const legacySealed = raw.legacy === true;
    if (raw.ready !== true || raw.enabled !== true
        || !hasExactKeys(raw, legacySealed ? READY_KEYS_LEGACY : READY_KEYS))
        return null;
    const poolVersion = exactNonEmptyString(raw.poolVersion);
    const manifestSha256 = exactNonEmptyString(raw.manifestSha256);
    const merkleRootSha256 = exactNonEmptyString(raw.merkleRootSha256);
    const factPackVersion = exactNonEmptyString(raw.factPackVersion);
    const factPackSha256 = exactNonEmptyString(raw.factPackSha256);
    const publicationFingerprint = exactNonEmptyString(raw.publicationFingerprint);
    if (!poolVersion || !factPackVersion || !manifestSha256 || !merkleRootSha256
        || !factPackSha256 || !publicationFingerprint
        || !SHA256_RE.test(manifestSha256) || !SHA256_RE.test(merkleRootSha256)
        || !SHA256_RE.test(factPackSha256) || !SHA256_RE.test(publicationFingerprint))
        return null;
    const identity = {
        studyTarget: target,
        poolVersion,
        manifestSha256,
        merkleRootSha256,
        factPackVersion,
        factPackSha256,
    };
    if (arenaTargetPublicationFingerprint(identity) !== publicationFingerprint)
        return null;
    return legacySealed
        ? { ...identity, enabled: true, ready: true, publicationFingerprint, legacy: true }
        : { ...identity, enabled: true, ready: true, publicationFingerprint };
}
function parseArenaTargetPublications(value) {
    const raw = record(value);
    if (!raw)
        return null;
    const fullKeys = [...exports.ARENA_STUDY_TARGETS].sort();
    const preItalianKeys = fullKeys.filter((target) => target !== 'it');
    if (!hasExactKeys(raw, fullKeys) && !hasExactKeys(raw, preItalianKeys))
        return null;
    const parsed = {};
    for (const target of exports.ARENA_STUDY_TARGETS) {
        // Backward compatibility: configs sealed before D154 have four exact
        // target keys. Italian is pending until explicitly published; existing
        // contours keep working byte-for-byte.
        if (target === 'it' && raw[target] === undefined) {
            parsed[target] = { studyTarget: target, enabled: false, ready: false };
            continue;
        }
        const publication = parseArenaTargetPublicationState(raw[target], target);
        if (!publication)
            return null;
        parsed[target] = publication;
    }
    return parsed;
}
/** A language is playable only after its own immutable publication is marked ready. */
function resolveArenaTargetPublication(config, target) {
    const root = record(config);
    /**
     * Конфиг БЕЗ поля `targetPublications` — документ, написанный до появления
     * языковых контуров. Такой лежит на боевом Firestore прямо сейчас.
     *
     * зачем (инцидент 2026-09-20): деплой новых функций на этот старый конфиг
     * положил Арену целиком — `arena_config_incompatible:target_publications`,
     * очередь не создавалась вовсе, поиск шёл бесконечно. Отсутствие поля
     * означает «контуров ещё нет», а не «Арена сломана»: до них один контент
     * обслуживал все языки, и вернуть это поведение безопасно.
     *
     * Поле ЕСТЬ, но контур не готов -> по-прежнему отказ: это осознанное
     * решение администратора, и обходить его нельзя.
     */
    if (root && root.targetPublications === undefined) {
        return legacySingleContourPublication(config, target);
    }
    const publications = parseArenaTargetPublications(root?.targetPublications);
    if (!publications)
        return null;
    const publication = publications[target];
    return publication.ready ? publication : null;
}
/**
 * Публикация до эпохи контуров: идентичность берётся из `contentPublication`,
 * который в старом конфиге есть всегда. Отпечаток считается тем же способом,
 * что и для контурной публикации, поэтому клиент его принимает.
 */
function legacySingleContourPublication(config, target) {
    const root = record(config);
    const content = record(root?.contentPublication);
    const poolVersion = typeof content?.poolVersion === 'string' ? content.poolVersion : '';
    const manifestSha256 = typeof content?.manifestSha256 === 'string' ? content.manifestSha256 : '';
    const merkleRootSha256 = typeof content?.merkleRootSha256 === 'string'
        ? content.merkleRootSha256
        : '';
    // Без этих трёх полей конфиг нерабочий и в старой схеме тоже — отказ честен.
    if (!poolVersion || !manifestSha256 || !merkleRootSha256)
        return null;
    const identity = {
        studyTarget: target,
        poolVersion,
        manifestSha256,
        merkleRootSha256,
        factPackVersion: typeof content?.factPackVersion === 'string' ? content.factPackVersion : '',
        factPackSha256: typeof content?.factPackSha256 === 'string' ? content.factPackSha256 : '',
    };
    return {
        ...identity,
        enabled: true,
        ready: true,
        publicationFingerprint: arenaTargetPublicationFingerprint(identity),
        legacy: true,
    };
}
function arenaTargetPublicationDisabled(studyTarget) {
    return Object.freeze({ studyTarget, enabled: false, ready: false });
}
/** CAS comparison used by publication activation/rollback; pending slots compare as null. */
function arenaTargetPublicationPointer(value) {
    return value?.ready === true ? value.publicationFingerprint : null;
}
/** Firestore row identity is publication-scoped so unchanged content can coexist across rotations. */
function arenaPublishedTaskDocumentId(publication, sourceTaskId) {
    if (!exports.ARENA_STUDY_TARGETS.includes(publication.studyTarget)
        || !SHA256_RE.test(publication.publicationFingerprint)
        || typeof sourceTaskId !== 'string' || !sourceTaskId || sourceTaskId.includes('/')) {
        throw new Error('arena_published_task_identity_invalid');
    }
    const digest = (0, node_crypto_1.createHash)('sha256')
        .update(JSON.stringify(['arena-published-task.v1', publication.publicationFingerprint, sourceTaskId]), 'utf8')
        .digest('hex');
    return `apub_${publication.studyTarget}_${publication.publicationFingerprint.slice(0, 16)}_${digest}`;
}
function arenaPublishedTaskCursorDocumentId(publication, cursorMaterial) {
    return arenaPublishedTaskDocumentId(publication, `cursor:${cursorMaterial}`);
}
//# sourceMappingURL=arena_target_registry.js.map