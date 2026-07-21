"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCourseRelease = buildCourseRelease;
const course_release_contract_1 = require("./course_release_contract");
function buildCourseRelease(input, now = new Date().toISOString()) {
    const complete = course_release_contract_1.CANONICAL_RELEASE_SURFACES.every((surface) => input.unitStates[surface] === 'succeeded');
    if (!complete || input.reviewStatus !== 'approved' || !input.reviewerId.trim())
        throw new Error('course_release_not_sealable');
    const artifacts = Object.freeze(Object.fromEntries(course_release_contract_1.CANONICAL_RELEASE_SURFACES.map((surface) => [surface, Object.freeze({ ...input.artifacts[surface] })])));
    const release = (0, course_release_contract_1.assertCourseRelease)({
        releaseId: input.releaseId,
        studyTarget: input.studyTarget,
        learnerSourceLocale: input.learnerSourceLocale,
        blueprintId: input.blueprintId,
        blueprintLocale: 'en',
        blueprintHash: input.blueprintHash,
        schemaVersion: 'course-release.v1',
        contentVersion: input.contentVersion,
        createdAt: now,
        minAppVersion: input.minAppVersion,
        artifacts,
    });
    return Object.freeze(release);
}
//# sourceMappingURL=release_sealing.js.map