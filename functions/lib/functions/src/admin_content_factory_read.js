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
exports.adminGetContentFactoryWorkspace = exports.adminGetContentFactoryUnitPreview = exports.adminGetContentFactoryJobDetail = void 0;
exports.parseContentFactoryJobDetailRequest = parseContentFactoryJobDetailRequest;
exports.parseContentFactoryUnitPreviewRequest = parseContentFactoryUnitPreviewRequest;
exports.parseContentFactoryWorkspaceRequest = parseContentFactoryWorkspaceRequest;
exports.buildContentFactoryJobDetail = buildContentFactoryJobDetail;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const roles_1 = require("./admin/roles");
const permissions_1 = require("./admin/permissions");
const course_release_contract_1 = require("./content_factory/course_release_contract");
const release_surface_delivery_1 = require("./content_factory/release_surface_delivery");
const language_release_1 = require("./language_release");
const REGION = 'us-central1';
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const LOCALE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const HASH_RE = /^[a-f0-9]{64}$/i;
const SURFACE_ORDER = new Map(course_release_contract_1.CANONICAL_RELEASE_SURFACES.map((surface, index) => [surface, index]));
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function roleFromToken(token) {
    return (0, roles_1.hasAdminRole)(token.adminRole) ? token.adminRole : null;
}
function requireContentReader(request) {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token);
    if (!role || !(0, permissions_1.hasPermission)(role, 'content.read'))
        throw new https_1.HttpsError('permission-denied', 'Role cannot read content');
}
function parseToken(value, field) {
    const token = String(value ?? '').trim();
    if (!TOKEN_RE.test(token))
        throw new https_1.HttpsError('invalid-argument', `${field} is invalid`);
    return token;
}
function parseContentFactoryJobDetailRequest(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'job detail request required');
    return Object.freeze({ jobId: parseToken(data.jobId, 'jobId') });
}
function parseContentFactoryUnitPreviewRequest(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'unit preview request required');
    return Object.freeze({ unitId: parseToken(data.unitId, 'unitId') });
}
function parseContentFactoryWorkspaceRequest(data) {
    if (data !== undefined && data !== null && !isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'workspace request must be an object');
    const record = isRecord(data) ? data : {};
    const studyTarget = String(record.studyTarget ?? '').trim();
    const learnerSourceLocale = String(record.learnerSourceLocale ?? record.sourceLocale ?? '').trim();
    if ((studyTarget && !LOCALE_RE.test(studyTarget)) || (learnerSourceLocale && !LOCALE_RE.test(learnerSourceLocale))) {
        throw new https_1.HttpsError('invalid-argument', 'workspace language identity is invalid');
    }
    const requestedLimit = Number(record.limit ?? 50);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(100, Math.floor(requestedLimit))) : 50;
    return Object.freeze({ studyTarget, learnerSourceLocale, limit });
}
function buildContentFactoryJobDetail(input) {
    const units = input.units.map((unit) => ({
        ...unit,
        attemptHistory: Object.freeze(Array.isArray(unit.attemptHistory) ? [...unit.attemptHistory] : []),
    })).sort((left, right) => {
        const lessonDelta = Number(left.lessonId ?? 0) - Number(right.lessonId ?? 0);
        if (lessonDelta)
            return lessonDelta;
        const surfaceDelta = (SURFACE_ORDER.get(String(left.surface ?? '')) ?? 99) - (SURFACE_ORDER.get(String(right.surface ?? '')) ?? 99);
        return surfaceDelta || String(left.unitId ?? left.id ?? '').localeCompare(String(right.unitId ?? right.id ?? ''));
    });
    return Object.freeze({ ...input, units: Object.freeze(units) });
}
function withId(doc) {
    return { id: doc.id, ...doc.data() };
}
exports.adminGetContentFactoryJobDetail = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    requireContentReader(request);
    const { jobId } = parseContentFactoryJobDetailRequest(request.data);
    const db = admin.firestore();
    const jobRef = db.collection('content_factory_jobs').doc(jobId);
    const reviewRef = db.collection('content_factory_job_reviews').doc(jobId);
    const [jobSnap, unitsSnap, reviewSnap] = await Promise.all([
        jobRef.get(),
        db.collection('content_factory_job_units').where('jobId', '==', jobId).limit(400).get(),
        reviewRef.get(),
    ]);
    if (!jobSnap.exists)
        throw new https_1.HttpsError('not-found', 'generation_job_not_found');
    const job = withId(jobSnap);
    const studyTarget = String(job.studyTarget ?? '').trim();
    const learnerSourceLocale = String(job.learnerSourceLocale ?? job.sourceLocale ?? '').trim();
    let catalog = null;
    let release = null;
    if (LOCALE_RE.test(studyTarget) && LOCALE_RE.test(learnerSourceLocale)) {
        const releaseId = `draft-${studyTarget}-${learnerSourceLocale}-${jobId}`;
        const [catalogSnap, releaseSnap] = await Promise.all([
            db.collection('content_factory_catalog').doc((0, language_release_1.courseCatalogId)(studyTarget, learnerSourceLocale)).get(),
            db.collection('content_factory_releases').doc(releaseId).get(),
        ]);
        catalog = catalogSnap.exists ? withId(catalogSnap) : null;
        release = releaseSnap.exists ? withId(releaseSnap) : null;
    }
    return {
        ok: true,
        ...buildContentFactoryJobDetail({
            jobId,
            job,
            units: unitsSnap.docs.map(withId),
            review: reviewSnap.exists ? withId(reviewSnap) : null,
            release,
            catalog,
        }),
    };
});
exports.adminGetContentFactoryUnitPreview = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK, timeoutSeconds: 60, memory: '512MiB' }, async (request) => {
    requireContentReader(request);
    const { unitId } = parseContentFactoryUnitPreviewRequest(request.data);
    const unitSnap = await admin.firestore().collection('content_factory_job_units').doc(unitId).get();
    if (!unitSnap.exists)
        throw new https_1.HttpsError('not-found', 'generation_unit_not_found');
    const unit = withId(unitSnap);
    const releaseId = String(unit.releaseId ?? '').trim();
    const surface = String(unit.surface ?? '');
    const lessonId = Number(unit.lessonId);
    const objectPath = String(unit.objectPath ?? '').trim();
    const contentHash = String(unit.contentHash ?? '').trim();
    const objectGeneration = String(unit.objectGeneration ?? '').trim();
    const expectedPath = `course-releases/${releaseId}/${surface}/${lessonId}.json`;
    if (unit.state !== 'succeeded' || !TOKEN_RE.test(releaseId) || !course_release_contract_1.CANONICAL_RELEASE_SURFACES.includes(surface) || !Number.isInteger(lessonId) || lessonId < 1 || lessonId > 100 || objectPath !== expectedPath || !HASH_RE.test(contentHash) || !objectGeneration) {
        throw new https_1.HttpsError('failed-precondition', 'generation_unit_is_not_previewable');
    }
    const file = admin.storage().bucket().file(objectPath);
    const [metadata] = await file.getMetadata();
    if (String(metadata.generation ?? '') !== objectGeneration)
        throw new https_1.HttpsError('data-loss', 'generation_unit_object_generation_mismatch');
    const [bytes] = await file.download({ validation: false });
    let payload;
    try {
        payload = (0, release_surface_delivery_1.parseHashedJsonBytes)(bytes, contentHash);
    }
    catch (error) {
        throw new https_1.HttpsError('data-loss', error instanceof Error ? error.message : 'generation_unit_payload_invalid');
    }
    return { ok: true, unit, payload, qaReceipt: isRecord(unit.qaReceipt) ? unit.qaReceipt : null };
});
exports.adminGetContentFactoryWorkspace = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    requireContentReader(request);
    const input = parseContentFactoryWorkspaceRequest(request.data);
    const db = admin.firestore();
    const [catalogsSnap, releasesSnap, historySnap, registriesSnap] = await Promise.all([
        db.collection('content_factory_catalog').limit(input.limit).get(),
        db.collection('content_factory_releases').limit(input.limit).get(),
        db.collection('content_factory_release_history').limit(input.limit).get(),
        db.collection('content_factory_source_registry').limit(input.limit).get(),
    ]);
    const matchesIdentity = (item) => ((!input.studyTarget || item.studyTarget === input.studyTarget)
        && (!input.learnerSourceLocale || item.learnerSourceLocale === input.learnerSourceLocale || item.sourceLocale === input.learnerSourceLocale));
    const sortNewest = (items) => items.sort((left, right) => String(right.timestamp ?? right.createdAt ?? right.sealedAt ?? '').localeCompare(String(left.timestamp ?? left.createdAt ?? left.sealedAt ?? '')));
    return {
        ok: true,
        catalogs: catalogsSnap.docs.map(withId).filter(matchesIdentity),
        releases: sortNewest(releasesSnap.docs.map(withId).filter(matchesIdentity)),
        history: sortNewest(historySnap.docs.map(withId).filter(matchesIdentity)),
        sourceRegistries: registriesSnap.docs.map(withId),
    };
});
//# sourceMappingURL=admin_content_factory_read.js.map