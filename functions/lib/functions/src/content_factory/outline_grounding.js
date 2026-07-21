"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLessonOutlineGrounding = buildLessonOutlineGrounding;
const source_registry_1 = require("./source_registry");
function buildLessonOutlineGrounding(registry, lessonId) {
    const validation = (0, source_registry_1.validateSourceRegistry)(registry);
    if (!validation.ok)
        throw new Error(`source_registry_invalid:${validation.errors.join(',')}`);
    if (!(0, source_registry_1.inspectSourceRegistryCoverage)(registry, [lessonId]).ok)
        throw new Error('lesson_blueprint_missing');
    const blueprintLesson = registry.lessons[String(lessonId)];
    return Object.freeze({ registryId: `${registry.blueprintId}:${registry.version}`, blueprintHash: registry.blueprintHash, blueprintLesson, evidenceIds: Object.freeze(registry.evidence.map((item) => item.evidenceId).sort()) });
}
//# sourceMappingURL=outline_grounding.js.map