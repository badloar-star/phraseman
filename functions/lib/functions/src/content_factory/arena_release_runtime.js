"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.arenaQuestionsFromCourseSurfaceEntries = arenaQuestionsFromCourseSurfaceEntries;
exports.pickCanonicalArenaQuestions = pickCanonicalArenaQuestions;
const admin = __importStar(require("firebase-admin"));
const node_crypto_1 = require("node:crypto");
const arena_course_identity_1 = require("../arena_course_identity");
const course_release_contract_1 = require("./course_release_contract");
const release_surface_delivery_1 = require("./release_surface_delivery");
const language_release_1 = require("../language_release");
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function levelForLesson(lessonId) {
    if (lessonId <= 8)
        return 'A1';
    if (lessonId <= 16)
        return 'A2';
    if (lessonId <= 24)
        return 'B1';
    return 'B2';
}
function arenaQuestionsFromCourseSurfaceEntries(rawIdentity, entries) {
    const identity = (0, arena_course_identity_1.normalizeArenaCourseIdentity)(rawIdentity);
    const seenIds = new Set();
    const seenLessons = new Set();
    return entries.flatMap((entry) => {
        if (!Number.isInteger(entry.lessonId) || entry.lessonId < 1 || entry.lessonId > 100 || seenLessons.has(entry.lessonId) || !isRecord(entry.payload) || Number(entry.payload.lessonId) !== entry.lessonId || entry.payload.surface !== 'arena' || !Array.isArray(entry.payload.items) || entry.payload.items.length < 1)
            throw new Error('arena_release_payload_invalid');
        seenLessons.add(entry.lessonId);
        return entry.payload.items.map((item) => {
            if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim() || typeof item.prompt !== 'string' || !item.prompt.trim() || typeof item.answer !== 'string' || !item.answer.trim() || !Array.isArray(item.options) || item.options.length !== 4 || item.options.some((option) => typeof option !== 'string' || !option.trim()))
                throw new Error('arena_release_payload_invalid');
            const sourceId = item.id.trim();
            const options = item.options.map((option) => String(option).trim());
            const answer = item.answer.trim();
            if (seenIds.has(sourceId) || new Set(options).size !== 4 || options.filter((option) => option === answer).length !== 1)
                throw new Error('arena_release_payload_invalid');
            seenIds.add(sourceId);
            const id = `cr_${(0, node_crypto_1.createHash)('sha256').update(`${identity.courseReleaseId}:${sourceId}`).digest('hex').slice(0, 40)}`;
            return Object.freeze({
                id,
                level: levelForLesson(entry.lessonId),
                type: 'translate',
                question: item.prompt.trim(),
                options: Object.freeze(options),
                correct: answer,
                rule: '',
                source: `course_release:${identity.courseReleaseId}`,
                releaseId: identity.courseReleaseId,
                studyTarget: identity.studyTarget,
                learnerSourceLocale: identity.learnerSourceLocale,
            });
        });
    });
}
async function readImmutableJson(path, expectedHash, expectedGeneration) {
    const file = admin.storage().bucket().file(path);
    const [metadata] = await file.getMetadata();
    if (String(metadata.generation ?? '') !== expectedGeneration)
        throw new Error('arena_release_generation_mismatch');
    const [bytes] = await file.download({ validation: false });
    return (0, release_surface_delivery_1.parseHashedJsonBytes)(bytes, expectedHash);
}
async function loadActiveReleaseQuestions(identity) {
    const db = admin.firestore();
    const [catalogSnap, releaseSnap] = await Promise.all([
        db.collection('content_factory_catalog').doc((0, language_release_1.courseCatalogId)(identity.studyTarget, identity.learnerSourceLocale)).get(),
        db.collection('content_factory_releases').doc(identity.courseReleaseId).get(),
    ]);
    const active = catalogSnap.data()?.activeRelease;
    if (!isRecord(active) || active.releaseId !== identity.courseReleaseId || active.studyTarget !== identity.studyTarget || active.learnerSourceLocale !== identity.learnerSourceLocale || !releaseSnap.exists)
        throw new Error('arena_release_is_not_active');
    const release = (0, course_release_contract_1.assertCourseRelease)(releaseSnap.data());
    if (release.releaseId !== identity.courseReleaseId || release.studyTarget !== identity.studyTarget || release.learnerSourceLocale !== identity.learnerSourceLocale)
        throw new Error('arena_release_identity_mismatch');
    const artifact = release.artifacts.arena;
    const index = await readImmutableJson(artifact.entryIndex, artifact.contentHash, artifact.objectGeneration);
    const units = (0, release_surface_delivery_1.resolveIndexedCourseUnits)(index, { releaseId: release.releaseId, studyTarget: release.studyTarget, learnerSourceLocale: release.learnerSourceLocale, surface: 'arena' });
    const entries = [];
    for (let offset = 0; offset < units.length; offset += 8) {
        entries.push(...await Promise.all(units.slice(offset, offset + 8).map(async (unit) => ({ lessonId: unit.lessonId, payload: await readImmutableJson(unit.objectPath, unit.contentHash, unit.objectGeneration) }))));
    }
    return arenaQuestionsFromCourseSurfaceEntries(identity, entries);
}
function shuffled(values) {
    const out = [...values];
    for (let index = out.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(Math.random() * (index + 1));
        [out[index], out[swap]] = [out[swap], out[index]];
    }
    return out;
}
async function pickCanonicalArenaQuestions(rawIdentity, level, count, exclude = new Set()) {
    const identity = (0, arena_course_identity_1.normalizeArenaCourseIdentity)(rawIdentity);
    if (identity.courseReleaseId.startsWith('legacy-') || !Number.isInteger(count) || count < 1 || count > 50)
        throw new Error('arena_release_request_invalid');
    const all = await loadActiveReleaseQuestions(identity);
    const eligible = all.filter((question) => (!level || question.level === level) && !exclude.has(question.id));
    const selected = shuffled(eligible).slice(0, count);
    if (selected.length < count)
        throw new Error(`arena_release_insufficient_questions:${selected.length}/${count}`);
    const batch = admin.firestore().batch();
    for (const question of selected)
        batch.set(admin.firestore().collection('arena_questions').doc(question.id), question);
    await batch.commit();
    return selected.map((question) => question.id);
}
//# sourceMappingURL=arena_release_runtime.js.map