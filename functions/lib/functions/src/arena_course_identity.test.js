"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const arena_course_identity_1 = require("./arena_course_identity");
describe('arena course identity', () => {
    it('matches players only when target, source and release are identical', () => {
        const a = { studyTarget: 'de', learnerSourceLocale: 'ru', courseReleaseId: 'de-ru-r1' };
        expect((0, arena_course_identity_1.sameArenaCourseIdentity)(a, { ...a })).toBe(true);
        expect((0, arena_course_identity_1.sameArenaCourseIdentity)(a, { ...a, learnerSourceLocale: 'uk' })).toBe(false);
        expect((0, arena_course_identity_1.sameArenaCourseIdentity)(a, { ...a, courseReleaseId: 'de-ru-r2' })).toBe(false);
    });
    it('keeps legacy queue entries backward-compatible but isolated', () => {
        expect((0, arena_course_identity_1.normalizeArenaCourseIdentity)({})).toEqual({ studyTarget: 'en', learnerSourceLocale: 'ru', courseReleaseId: 'legacy-en-v1' });
        expect((0, arena_course_identity_1.sameArenaCourseIdentity)({}, { studyTarget: 'de', learnerSourceLocale: 'ru', courseReleaseId: 'de-ru-r1' })).toBe(false);
        expect(() => (0, arena_course_identity_1.normalizeArenaCourseIdentity)({ studyTarget: 'de', learnerSourceLocale: 'ru', courseReleaseId: 'legacy-de-v1' })).toThrow('arena_course_identity_invalid');
    });
});
//# sourceMappingURL=arena_course_identity.test.js.map