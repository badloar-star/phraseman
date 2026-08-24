"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectTaskDistractors = selectTaskDistractors;
const FORM_TOKENS = new Set([
    'am', 'is', 'are', 'do', 'does', "i'm", "you're", "he's", "she's", "it's",
    "we're", "they're", "isn't", "aren't",
]);
const PREPOSITIONS = new Set(['at', 'in', 'on', 'to']);
const SUBJECT_PRONOUNS = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they']);
const POLARITY = /^(?:not|isn['’]t|aren['’]t)$/iu;
function normalized(value) {
    return value.normalize('NFKC').replace(/[’]/gu, "'").toLowerCase();
}
function normalizedExact(value) {
    return value.normalize('NFKC').replace(/[’]/gu, "'").trim();
}
function targetTokens(target) {
    return target.replace(/[?.!,]+$/gu, '').split(/\s+/u).filter(Boolean);
}
function evidenceCorrect(answer) {
    return answer.reasonCode.split(':')[1] ?? '';
}
function caseLike(value, reference) {
    if (/^\p{Lu}/u.test(reference))
        return value.slice(0, 1).toLocaleUpperCase('en') + value.slice(1);
    return value;
}
function dimension(correct, alternative, reasonCode) {
    const correctKey = normalized(correct);
    const alternativeKey = normalized(alternative);
    if (PREPOSITIONS.has(correctKey))
        return 'preposition';
    if (alternativeKey === 'do' || alternativeKey === 'does')
        return 'auxiliary';
    if (POLARITY.test(alternative))
        return 'polarity';
    if (FORM_TOKENS.has(correctKey))
        return 'agreement';
    const trapType = reasonCode.split(':')[0];
    if (trapType === 'phonetic')
        return 'sound';
    if (trapType === 'orthographic')
        return 'orthography';
    if (trapType === 'collocation_pragmatics' || trapType === 'phrase_assembly')
        return 'collocation';
    return 'semantic_neighbor';
}
function replacementsFor(correct, rejectedAnswers, allowPolarity) {
    const correctKey = normalized(correct);
    const seen = new Set();
    return rejectedAnswers.filter((answer) => {
        if (normalized(evidenceCorrect(answer)) !== correctKey)
            return false;
        const valueKey = normalized(answer.value);
        const isCaseSensitiveOrthographicTrap = answer.reasonCode.split(':')[0] === 'orthographic' &&
            normalizedExact(answer.value) !== normalizedExact(correct);
        const seenKey = isCaseSensitiveOrthographicTrap
            ? normalizedExact(answer.value)
            : valueKey;
        if (!valueKey ||
            (valueKey === correctKey && !isCaseSensitiveOrthographicTrap) ||
            seen.has(seenKey))
            return false;
        if (!allowPolarity && POLARITY.test(answer.value))
            return false;
        seen.add(seenKey);
        return true;
    });
}
function session14PrepositionCandidates(target, correct, rejectedAnswers) {
    const desiredByTarget = {
        'I am at home.': ['in', 'on'],
        'You are in class.': ['at', 'on'],
        'I am at work.': ['to', 'on'],
        'You are in the park.': ['at', 'on'],
        'I am on the bus.': ['in', 'at'],
    };
    const desired = desiredByTarget[target];
    const available = replacementsFor(correct, rejectedAnswers, false);
    if (!desired)
        return available;
    return desired.flatMap((value) => {
        const match = available.find((candidate) => normalized(candidate.value) === value);
        return match ? [match] : [];
    });
}
function replaceToken(target, index, replacement) {
    const terminal = target.match(/[?.!,]+$/u)?.[0] ?? '';
    const tokens = targetTokens(target);
    return tokens
        .map((token, tokenIndex) => tokenIndex === index ? caseLike(replacement, token) : token)
        .join(' ') + terminal;
}
function pair(family, target, correct, tokenIndex, candidates, responseMode) {
    const chosen = candidates.slice(0, 2);
    if (chosen.length !== 2) {
        throw new Error(`task_specific_distractors_insufficient:${family}:${target}:${correct}`);
    }
    const distractors = chosen.map((candidate) => {
        const sourceValue = candidate.reasonCode.split(':')[0] === 'orthographic'
            ? candidate.value
            : caseLike(candidate.value, correct);
        return {
            value: responseMode === 'whole_phrases'
                ? replaceToken(target, tokenIndex, sourceValue)
                : sourceValue,
            sourceValue,
            correct,
            testedDimension: dimension(correct, candidate.value, candidate.reasonCode),
        };
    });
    return { responseMode, correct, distractors };
}
function selectTaskDistractors(input) {
    const tokens = targetTokens(input.target);
    if (input.family === 'phrase_builder' || input.family === 'listen_build_dictation' ||
        input.family === 'context_gap_grammar') {
        const formIndex = tokens.findIndex((token) => FORM_TOKENS.has(normalized(token)));
        const polarityIndex = tokens.findIndex((token) => POLARITY.test(token));
        const prepositionIndex = tokens.findIndex((token) => PREPOSITIONS.has(normalized(token)));
        const lexicalIndex = tokens.findIndex((token) => replacementsFor(token, input.rejectedAnswers, false).length >= 2);
        const stateLexicalIndex = tokens.findIndex((token) => !FORM_TOKENS.has(normalized(token)) &&
            !SUBJECT_PRONOUNS.has(normalized(token)) &&
            !PREPOSITIONS.has(normalized(token)) &&
            !POLARITY.test(token) &&
            replacementsFor(token, input.rejectedAnswers, false).length >= 2);
        const tokenIndex = input.sessionOrdinal === 3 && stateLexicalIndex >= 0
            ? stateLexicalIndex
            : input.sessionOrdinal === 2 && polarityIndex >= 0
                ? polarityIndex
                : input.sessionOrdinal === 4 && normalized(tokens[0] ?? '') === "i'm"
                    ? 0
                    : input.sessionOrdinal === 14 && prepositionIndex >= 0
                        ? prepositionIndex
                        : input.sessionOrdinal === 13 && normalized(tokens[0] ?? '') === "you're"
                            ? 0
                            : formIndex >= 0
                                ? formIndex
                                : prepositionIndex >= 0
                                    ? prepositionIndex
                                    : lexicalIndex;
        if (tokenIndex < 0)
            throw new Error(`task_specific_distractors_focus_missing:${input.family}:${input.target}`);
        const correct = tokens[tokenIndex];
        const candidates = input.sessionOrdinal === 14
            ? session14PrepositionCandidates(input.target, correct, input.rejectedAnswers)
            : replacementsFor(correct, input.rejectedAnswers, false);
        return pair(input.family, input.target, correct, tokenIndex, candidates, input.family === 'context_gap_grammar' ? 'single_tokens' : 'extra_tokens');
    }
    if (input.family === 'speed_match' || input.family === 'listen_choose') {
        const polarityIndex = tokens.findIndex((token) => POLARITY.test(token));
        const prepositionIndex = tokens.findIndex((token) => PREPOSITIONS.has(normalized(token)));
        const tokenIndex = input.sessionOrdinal === 2 && polarityIndex >= 0
            ? polarityIndex
            : input.sessionOrdinal === 4 && normalized(tokens[0] ?? '') === "i'm"
                ? 0
                : input.sessionOrdinal === 13 && normalized(tokens[0] ?? '') === "you're"
                    ? 0
                    : prepositionIndex >= 0 ? prepositionIndex : tokens.length - 1;
        const correct = tokens[tokenIndex] ?? input.target;
        const candidates = input.sessionOrdinal === 14
            ? session14PrepositionCandidates(input.target, correct, input.rejectedAnswers)
            : replacementsFor(correct, input.rejectedAnswers, false);
        return pair(input.family, input.target, correct, tokenIndex, candidates, 'whole_phrases');
    }
    throw new Error(`task_specific_distractors_family_unsupported:${input.family}`);
}
//# sourceMappingURL=task_specific_distractors_v1.js.map