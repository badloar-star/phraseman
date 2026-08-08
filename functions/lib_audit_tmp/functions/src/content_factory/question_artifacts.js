"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.questionSemanticKey = questionSemanticKey;
exports.validateTopicArtifact = validateTopicArtifact;
exports.validateQuestionBatchArtifact = validateQuestionBatchArtifact;
exports.validateQuestionReplacementArtifact = validateQuestionReplacementArtifact;
function record(value) { return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined; }
function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function normalized(value) { return text(value).normalize('NFKC').toLocaleLowerCase().replace(/[\p{P}\p{S}\s]+/gu, ' ').trim(); }
function questionSemanticKey(value) {
    const item = record(value);
    const choices = Array.isArray(item?.choices) ? item.choices.map(normalized).sort() : [];
    return `${normalized(item?.prompt)}\u0000${choices.join('|')}`;
}
function validateTopicArtifact(artifact, expected) {
    const output = record(artifact);
    const result = record(output?.result);
    const errors = [];
    if (!output || output.stage !== expected.kind || !result)
        return ['topic_artifact_invalid'];
    for (const field of ['topicId', 'title', 'learningPromise'])
        if (!text(result[field]))
            errors.push(`topic_${field}_required`);
    for (const field of ['skillTags', 'inclusions', 'exclusions'])
        if (!Array.isArray(result[field]) || (field !== 'exclusions' && result[field].length === 0) || result[field].some((item) => !text(item)))
            errors.push(`topic_${field}_invalid`);
    const distribution = record(result.difficultyDistribution);
    if (!distribution || !['easy', 'medium', 'hard'].every((key) => Number.isSafeInteger(distribution[key]) && Number(distribution[key]) >= 0) || Number(distribution?.easy) + Number(distribution?.medium) + Number(distribution?.hard) !== 10)
        errors.push('topic_difficulty_distribution_expected_10');
    return [...new Set(errors)];
}
function validateQuestionBatchArtifact(artifact, expected) {
    const output = record(artifact);
    const grounding = record(expected.grounding);
    const topic = record(grounding?.topic);
    const errors = [];
    if (!output || output.stage !== expected.kind || !Array.isArray(output.items))
        return ['question_batch_artifact_invalid'];
    if (output.items.length !== expected.count || expected.count !== 10)
        errors.push('question_batch_count_expected_10');
    if (!topic || !Array.isArray(topic.skillTags))
        errors.push('question_topic_grounding_required');
    const allowedSkills = new Set((Array.isArray(topic?.skillTags) ? topic.skillTags : []).map(normalized));
    const previousQuestionKeys = new Set((Array.isArray(grounding?.previousQuestionKeys) ? grounding.previousQuestionKeys : []).map(String));
    const ids = new Set();
    const semantics = new Set();
    for (const value of output.items) {
        const item = record(value);
        if (!item) {
            errors.push('question_item_invalid');
            continue;
        }
        const id = text(item.id);
        const prompt = text(item.prompt);
        const choices = Array.isArray(item.choices) ? item.choices.map(text) : [];
        const explanations = Array.isArray(item.optionExplanations) ? item.optionExplanations.map(text) : [];
        if (!id || !prompt || choices.some((choice) => !choice))
            errors.push('question_fields_required');
        if (ids.has(id))
            errors.push('question_id_duplicate');
        ids.add(id);
        if (choices.length !== 4 || new Set(choices.map(normalized)).size !== 4)
            errors.push('question_choices_unique');
        if (!Number.isInteger(item.correctIndex) || Number(item.correctIndex) < 0 || Number(item.correctIndex) > 3)
            errors.push('question_correct_index_invalid');
        if (explanations.length !== 4 || explanations.some((explanation) => !explanation))
            errors.push('question_option_explanations_expected_4');
        if (!['easy', 'medium', 'hard'].includes(String(item.difficulty)))
            errors.push('question_difficulty_invalid');
        if (!allowedSkills.has(normalized(item.skillTag)))
            errors.push('question_skill_tag_unapproved');
        if (!Array.isArray(item.sourcePhraseIds) || item.sourcePhraseIds.some((sourceId) => typeof sourceId !== 'string' || !sourceId.trim()))
            errors.push('question_source_references_invalid');
        const semantic = questionSemanticKey(item);
        if (semantics.has(semantic))
            errors.push('question_semantic_duplicate');
        semantics.add(semantic);
        if (previousQuestionKeys.has(semantic))
            errors.push('question_previous_batch_duplicate');
    }
    if (topic) {
        const distribution = record(topic.difficultyDistribution);
        for (const difficulty of ['easy', 'medium', 'hard'])
            if (output.items.filter((value) => record(value)?.difficulty === difficulty).length !== Number(distribution?.[difficulty]))
                errors.push('question_difficulty_distribution_mismatch');
    }
    return [...new Set(errors)];
}
function validateQuestionReplacementArtifact(artifact, expected) {
    const output = record(artifact);
    const result = record(output?.result);
    const grounding = record(expected.grounding);
    const item = record(result?.item);
    const topic = record(grounding?.topic);
    const errors = [];
    if (!output || output.stage !== expected.kind || !result || !item)
        return ['question_replacement_artifact_invalid'];
    if (!text(result.replacementForQuestionId) || result.replacementForQuestionId !== grounding?.replacementForQuestionId)
        errors.push('question_replacement_identity_mismatch');
    if (text(item.id) !== text(result.replacementForQuestionId))
        errors.push('question_replacement_item_id_mismatch');
    if (!text(item.id) || !text(item.prompt) || !Array.isArray(item.choices) || item.choices.length !== 4 || new Set(item.choices.map(normalized)).size !== 4)
        errors.push('question_replacement_choices_invalid');
    if (!Number.isInteger(item.correctIndex) || Number(item.correctIndex) < 0 || Number(item.correctIndex) > 3)
        errors.push('question_replacement_correct_index_invalid');
    if (!Array.isArray(item.optionExplanations) || item.optionExplanations.length !== 4 || item.optionExplanations.some((value) => !text(value)))
        errors.push('question_replacement_explanations_invalid');
    if (!Array.isArray(topic?.skillTags) || !topic.skillTags.map(normalized).includes(normalized(item.skillTag)))
        errors.push('question_replacement_skill_unapproved');
    if (!['easy', 'medium', 'hard'].includes(String(item.difficulty)))
        errors.push('question_replacement_difficulty_invalid');
    if (!Array.isArray(item.sourcePhraseIds))
        errors.push('question_replacement_source_refs_invalid');
    const semanticKey = questionSemanticKey(item);
    if (semanticKey === questionSemanticKey(grounding?.originalQuestion) || (Array.isArray(grounding?.previousQuestionKeys) && grounding.previousQuestionKeys.map(String).includes(semanticKey)))
        errors.push('question_replacement_duplicate');
    return [...new Set(errors)];
}
//# sourceMappingURL=question_artifacts.js.map