"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDerivedLessonArtifact = validateDerivedLessonArtifact;
function record(value) { return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined; }
function normalized(value) { return typeof value === 'string' ? value.normalize('NFKC').trim().toLocaleLowerCase() : ''; }
function validateDerivedLessonArtifact(artifact, expected) {
    const output = record(artifact);
    const grounding = record(expected.grounding);
    if (!output || output.stage !== expected.kind || !Array.isArray(output.items))
        return ['derived_lesson_artifact_invalid'];
    if (!grounding || !Array.isArray(grounding.acceptedCandidates))
        return ['derived_grounding_required'];
    const candidates = grounding.acceptedCandidates.map(record).filter(Boolean);
    const byKey = new Map(candidates.map((item) => [`${normalized(item.partOfSpeech)}\u0000${normalized(item.lemma)}`, item]));
    const errors = [];
    const expectedPos = expected.kind === 'lesson_irregular_verbs' ? 'irregular_verb' : expected.kind === 'lesson_prepositions' ? 'preposition' : null;
    for (const value of output.items) {
        const item = record(value);
        if (!item || !normalized(item.lemma) || !normalized(item.partOfSpeech) || !Array.isArray(item.sourcePhraseIds) || item.sourcePhraseIds.length === 0 || typeof item.explanation !== 'string' || !item.explanation.trim()) {
            errors.push('derived_item_fields_required');
            continue;
        }
        if ((expected.kind === 'lesson_vocabulary' || expected.kind === 'lesson_prepositions') && (typeof item.translation !== 'string' || !item.translation.trim()))
            errors.push('derived_translation_required');
        if (expected.kind === 'lesson_irregular_verbs' && (!Array.isArray(item.forms) || item.forms.length !== 3 || item.forms.some((form) => typeof form !== 'string' || !form.trim())))
            errors.push('derived_irregular_forms_required');
        if (expectedPos && normalized(item.partOfSpeech) !== expectedPos)
            errors.push('derived_part_of_speech_invalid');
        const candidate = byKey.get(`${normalized(item.partOfSpeech)}\u0000${normalized(item.lemma)}`);
        if (!candidate)
            errors.push('derived_candidate_not_approved');
        const allowedIds = new Set(Array.isArray(candidate?.sourcePhraseIds) ? candidate?.sourcePhraseIds.map(String) : []);
        if (item.sourcePhraseIds.some((id) => typeof id !== 'string' || !allowedIds.has(id)))
            errors.push('derived_source_phrase_not_approved');
    }
    return [...new Set(errors)];
}
//# sourceMappingURL=derived_lesson_artifacts.js.map