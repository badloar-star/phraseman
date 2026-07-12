"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeArenaCourseIdentity = normalizeArenaCourseIdentity;
exports.sameArenaCourseIdentity = sameArenaCourseIdentity;
exports.isLegacyArenaCourseIdentity = isLegacyArenaCourseIdentity;
const CODE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const LEGACY_ENGLISH_IDENTITY = Object.freeze({
    studyTarget: 'en',
    learnerSourceLocale: 'ru',
    courseReleaseId: 'legacy-en-v1',
});
function normalizeArenaCourseIdentity(value) {
    const allMissing = value.studyTarget == null && value.learnerSourceLocale == null && value.courseReleaseId == null;
    if (allMissing)
        return LEGACY_ENGLISH_IDENTITY;
    if (typeof value.studyTarget !== 'string' || !CODE_RE.test(value.studyTarget) || typeof value.learnerSourceLocale !== 'string' || !CODE_RE.test(value.learnerSourceLocale) || typeof value.courseReleaseId !== 'string' || !TOKEN_RE.test(value.courseReleaseId))
        throw new Error('arena_course_identity_invalid');
    if (value.courseReleaseId.startsWith('legacy-') && !((value.studyTarget === 'en' || value.studyTarget === 'es') && value.courseReleaseId === `legacy-${value.studyTarget}-v1`))
        throw new Error('arena_course_identity_invalid');
    return Object.freeze({ studyTarget: value.studyTarget, learnerSourceLocale: value.learnerSourceLocale, courseReleaseId: value.courseReleaseId });
}
function sameArenaCourseIdentity(a, b) {
    try {
        const left = normalizeArenaCourseIdentity(a);
        const right = normalizeArenaCourseIdentity(b);
        return left.studyTarget === right.studyTarget && left.learnerSourceLocale === right.learnerSourceLocale && left.courseReleaseId === right.courseReleaseId;
    }
    catch {
        return false;
    }
}
function isLegacyArenaCourseIdentity(identity) {
    return identity.courseReleaseId.startsWith('legacy-');
}
//# sourceMappingURL=arena_course_identity.js.map