"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arenaQuestionSemanticKey = arenaQuestionSemanticKey;
exports.validateArenaTopicArtifact = validateArenaTopicArtifact;
exports.validateArenaQuestionBatchArtifact = validateArenaQuestionBatchArtifact;
const ARENA_LEVELS = new Set(['A1', 'A2', 'B1', 'B2']);
const ARENA_TYPES = new Set(['translate', 'fill', 'choose', 'audio', 'complete_phrasal', 'translate_meaning', 'fill_blank', 'find_error', 'choose_phrasal']);
function record(value) { return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined; }
function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function normalized(value) { return text(value).normalize('NFKC').toLocaleLowerCase().replace(/[\p{P}\p{S}\s]+/gu, ' ').trim(); }
function arenaQuestionSemanticKey(value) {
    const item = record(value);
    const options = Array.isArray(item?.options) ? item.options.map(normalized).sort() : [];
    return `${normalized(item?.question)}\u0000${options.join('|')}\u0000${normalized(item?.correct)}`;
}
function validateArenaTopicArtifact(artifact, expected) {
    const output = record(artifact);
    const result = record(output?.result);
    if (!output || output.stage !== 'arena_topic' || !result)
        return ['arena_topic_artifact_invalid'];
    const errors = [];
    for (const field of ['topicId', 'title', 'learningPromise'])
        if (!text(result[field]))
            errors.push(`arena_topic_${field}_required`);
    for (const field of ['skillTags', 'inclusions', 'exclusions', 'fairnessRules', 'allowedTypes'])
        if (!Array.isArray(result[field]) || result[field].length === 0 || result[field].some((item) => !text(item)))
            errors.push(`arena_topic_${field}_invalid`);
    if (!ARENA_LEVELS.has(text(result.level)) || result.level !== expected.cefr)
        errors.push('arena_topic_level_not_supported');
    if (Array.isArray(result.allowedTypes) && result.allowedTypes.some((value) => !ARENA_TYPES.has(text(value))))
        errors.push('arena_topic_type_not_supported');
    const distribution = record(result.difficultyDistribution);
    if (!distribution || !['easy', 'medium', 'hard'].every((key) => Number.isSafeInteger(distribution[key]) && Number(distribution[key]) >= 0) || Number(distribution?.easy) + Number(distribution?.medium) + Number(distribution?.hard) !== 10)
        errors.push('arena_topic_difficulty_distribution_expected_10');
    for (const [field, min, max] of [['taskMaxChars', 40, 120], ['questionMaxChars', 60, 180], ['optionMaxChars', 16, 80], ['ruleMaxChars', 100, 500]])
        if (!Number.isSafeInteger(result[field]) || Number(result[field]) < min || Number(result[field]) > max)
            errors.push(`arena_topic_${field}_invalid`);
    if (!Number.isSafeInteger(result.targetAnswerTimeMs) || Number(result.targetAnswerTimeMs) < 2000 || Number(result.targetAnswerTimeMs) > 12000)
        errors.push('arena_topic_target_answer_time_invalid');
    const policy = record(result.runtimePolicy);
    if (policy?.questionsPerMatch !== 10)
        errors.push('arena_topic_questions_per_match_must_be_10');
    if (policy?.questionTimeoutMs !== 40000)
        errors.push('arena_topic_runtime_timeout_must_be_40000');
    if (policy?.scoringPolicy !== 'arena-scoring-v1')
        errors.push('arena_topic_scoring_policy_invalid');
    const locale = record(result.localeContract);
    if (locale?.studyTarget !== expected.studyTarget || locale?.learnerSourceLocale !== expected.sourceLocale)
        errors.push('arena_topic_locale_contract_mismatch');
    return [...new Set(errors)];
}
function validateArenaQuestionBatchArtifact(artifact, expected) {
    const output = record(artifact);
    const grounding = record(expected.grounding);
    const topic = record(grounding?.topic);
    if (!output || output.stage !== 'arena_questions' || !Array.isArray(output.items))
        return ['arena_questions_artifact_invalid'];
    const errors = [];
    if (expected.count !== 10 || output.items.length !== 10)
        errors.push('arena_question_count_expected_10');
    if (!topic || !Array.isArray(topic.skillTags) || !Array.isArray(topic.allowedTypes))
        errors.push('arena_topic_grounding_required');
    const limits = { task: Number(topic?.taskMaxChars ?? 120), question: Number(topic?.questionMaxChars ?? 180), option: Number(topic?.optionMaxChars ?? 80), rule: Number(topic?.ruleMaxChars ?? 500) };
    const skills = new Set((Array.isArray(topic?.skillTags) ? topic.skillTags : []).map(normalized));
    const types = new Set((Array.isArray(topic?.allowedTypes) ? topic.allowedTypes : []).map(String));
    const previous = new Set((Array.isArray(grounding?.previousQuestionKeys) ? grounding.previousQuestionKeys : []).map(String));
    const ids = new Set();
    const semantics = new Set();
    for (const value of output.items) {
        const item = record(value);
        if (!item) {
            errors.push('arena_question_item_invalid');
            continue;
        }
        const id = text(item.id);
        const task = text(item.task);
        const question = text(item.question);
        const rule = text(item.rule);
        const options = Array.isArray(item.options) ? item.options.map(text) : [];
        if (!id || !task || !question || !rule)
            errors.push('arena_question_fields_required');
        if (ids.has(id))
            errors.push('arena_question_id_duplicate');
        ids.add(id);
        if (task.length > limits.task)
            errors.push('arena_task_too_long');
        if (question.length > limits.question)
            errors.push('arena_question_too_long');
        if (rule.length > limits.rule)
            errors.push('arena_rule_too_long');
        if (options.length !== 4 || options.some((option) => !option || option.length > limits.option || /^[A-D][).:]\s/i.test(option)) || new Set(options.map(normalized)).size !== 4)
            errors.push('arena_options_not_unique');
        if (!Number.isInteger(item.correctIndex) || Number(item.correctIndex) < 0 || Number(item.correctIndex) > 3 || options[Number(item.correctIndex)] !== text(item.correct) || options.filter((option) => option === text(item.correct)).length !== 1)
            errors.push('arena_correct_identity_mismatch');
        if (item.level !== topic?.level || !ARENA_LEVELS.has(text(item.level)))
            errors.push('arena_question_level_mismatch');
        if (!ARENA_TYPES.has(text(item.type)) || !types.has(text(item.type)))
            errors.push('arena_question_type_unapproved');
        if ((item.type === 'fill_blank' || item.type === 'complete_phrasal') && !/_{2,}|\[…\]|\(\.\.\.\)/u.test(question))
            errors.push('arena_question_blank_required');
        if (!skills.has(normalized(item.skillTag)))
            errors.push('arena_skill_tag_unapproved');
        if (!['easy', 'medium', 'hard'].includes(String(item.difficulty)))
            errors.push('arena_difficulty_invalid');
        if (!Number.isSafeInteger(item.expectedAnswerTimeMs) || Number(item.expectedAnswerTimeMs) < 2000 || Number(item.expectedAnswerTimeMs) > 12000)
            errors.push('arena_expected_answer_time_invalid');
        if (!Array.isArray(item.sourceReferences) || item.sourceReferences.some((sourceId) => !text(sourceId)))
            errors.push('arena_source_references_invalid');
        const semantic = arenaQuestionSemanticKey(item);
        if (semantics.has(semantic))
            errors.push('arena_semantic_duplicate');
        semantics.add(semantic);
        if (previous.has(semantic))
            errors.push('arena_previous_batch_duplicate');
    }
    if (output.items.length === 10) {
        const correctPositions = output.items.map((value) => Number(record(value)?.correctIndex));
        const positionCounts = [0, 1, 2, 3].map((position) => correctPositions.filter((value) => value === position).length);
        if (positionCounts.some((count) => count < 2 || count > 3))
            errors.push('arena_correct_position_distribution_invalid');
        let runLength = 1;
        for (let index = 1; index < correctPositions.length; index += 1) {
            runLength = correctPositions[index] === correctPositions[index - 1] ? runLength + 1 : 1;
            if (runLength > 2) {
                errors.push('arena_correct_position_run_too_long');
                break;
            }
        }
    }
    const distribution = record(topic?.difficultyDistribution);
    if (distribution)
        for (const difficulty of ['easy', 'medium', 'hard'])
            if (output.items.filter((value) => record(value)?.difficulty === difficulty).length !== Number(distribution[difficulty]))
                errors.push('arena_difficulty_distribution_mismatch');
    return [...new Set(errors)];
}
//# sourceMappingURL=arena_artifacts.js.map