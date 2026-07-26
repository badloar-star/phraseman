"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flashcardSemanticKey = flashcardSemanticKey;
exports.validateFlashcardPackIdeaArtifact = validateFlashcardPackIdeaArtifact;
exports.validateFlashcardItemsArtifact = validateFlashcardItemsArtifact;
exports.validateFlashcardReplacementArtifact = validateFlashcardReplacementArtifact;
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value
        : undefined;
}
function text(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function normalized(value) {
    return text(value).normalize('NFKC').toLocaleLowerCase().replace(/[\p{P}\p{S}\s]+/gu, ' ').trim();
}
function flashcardSemanticKey(value) {
    const card = record(value);
    return `${normalized(card?.front)}\u0000${normalized(card?.back)}`;
}
function validateFlashcardPackIdeaArtifact(artifact, expected) {
    const output = record(artifact);
    const result = record(output?.result);
    if (!output || output.stage !== 'flashcard_pack_idea' || !result)
        return ['flashcard_pack_idea_artifact_invalid'];
    const errors = [];
    for (const field of ['packId', 'title', 'learningPromise', 'audience']) {
        if (!text(result[field]))
            errors.push(`flashcard_pack_${field}_required`);
    }
    if (text(result.cefr) !== expected.cefr)
        errors.push('flashcard_pack_cefr_mismatch');
    for (const field of ['tags', 'inclusions', 'exclusions']) {
        if (!Array.isArray(result[field]) || (field !== 'exclusions' && result[field].length === 0)
            || result[field].some((item) => !text(item)))
            errors.push(`flashcard_pack_${field}_invalid`);
    }
    if (!text(result.uniquenessFingerprint))
        errors.push('flashcard_pack_uniqueness_fingerprint_required');
    return [...new Set(errors)];
}
function validateCard(value) {
    const card = record(value);
    if (!card)
        return ['flashcard_item_invalid'];
    const errors = [];
    for (const field of ['id', 'front', 'back', 'exampleTarget', 'exampleSource', 'note']) {
        if (!text(card[field]))
            errors.push(`flashcard_${field}_required`);
    }
    if (!Array.isArray(card.sourceReferences) || card.sourceReferences.length === 0
        || card.sourceReferences.some((item) => !text(item)))
        errors.push('flashcard_source_references_invalid');
    return errors;
}
function validateFlashcardItemsArtifact(artifact, expected) {
    const output = record(artifact);
    const grounding = record(expected.grounding);
    if (!output || output.stage !== 'flashcard_items' || !Array.isArray(output.items))
        return ['flashcard_items_artifact_invalid'];
    const errors = [];
    if (!Number.isSafeInteger(expected.count) || expected.count < 1 || expected.count > 20)
        errors.push('flashcard_batch_count_out_of_range');
    if (output.items.length !== expected.count)
        errors.push('flashcard_batch_count_mismatch');
    if (!record(grounding?.packIdea))
        errors.push('flashcard_pack_idea_grounding_required');
    const sources = [
        ['previousCardKeys', 'flashcard_pack_duplicate'],
        ['lessonCardKeys', 'flashcard_lesson_duplicate'],
        ['publishedCardKeys', 'flashcard_published_duplicate'],
    ];
    const seen = new Set();
    for (const item of output.items) {
        errors.push(...validateCard(item));
        const key = flashcardSemanticKey(item);
        if (key === '\u0000')
            errors.push('flashcard_semantic_key_invalid');
        if (seen.has(key))
            errors.push('flashcard_batch_internal_duplicate');
        seen.add(key);
        for (const [field, error] of sources) {
            if (Array.isArray(grounding?.[field]) && grounding[field].map(String).includes(key))
                errors.push(error);
        }
    }
    return [...new Set(errors)];
}
function validateFlashcardReplacementArtifact(artifact, expected) {
    const output = record(artifact);
    const result = record(output?.result);
    const grounding = record(expected.grounding);
    const item = record(result?.item);
    if (!output || output.stage !== 'flashcard_item_replacement' || !result || !item)
        return ['flashcard_replacement_artifact_invalid'];
    const errors = validateCard(item);
    const replacementForCardId = text(result.replacementForCardId);
    if (!replacementForCardId || replacementForCardId !== text(grounding?.replacementForCardId) || text(item.id) !== replacementForCardId) {
        errors.push('flashcard_replacement_identity_mismatch');
    }
    const key = flashcardSemanticKey(item);
    const forbidden = ['previousCardKeys', 'lessonCardKeys', 'publishedCardKeys']
        .flatMap((field) => Array.isArray(grounding?.[field]) ? grounding[field].map(String) : []);
    if (key === flashcardSemanticKey(grounding?.originalCard) || forbidden.includes(key))
        errors.push('flashcard_replacement_duplicate');
    return [...new Set(errors)];
}
//# sourceMappingURL=flashcard_artifacts.js.map