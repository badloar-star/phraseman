"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.APPROVED_FIRST_TEN_PHRASE_SOURCES_V2 = exports.APPROVED_FIRST_TEN_SESSION_SOURCES_V2 = exports.APPROVED_FIRST_TEN_OWNER_ERRATA_V3 = exports.APPROVED_FIRST_TEN_CANDIDATE_SHA_V2 = void 0;
// Generated projection adapter for the exact owner-approved S01-S10 payload.
// The 5 MB JSON is written only by scripts/import_learning_v2_first_ten_candidate.mjs
// after its immutable SHA-256 check. This adapter adds runtime coordinates and
// semantic typography without changing any learner-facing byte.
const approved_first_ten_candidate_v2_json_1 = __importDefault(require("./approved_first_ten_candidate_v2.json"));
const episode_01_session_map_v1_1 = require("./episode_01_session_map_v1");
exports.APPROVED_FIRST_TEN_CANDIDATE_SHA_V2 = '746b30c49c9735cd57cde89cb4e488c40e6661b1be9ccba1ac7f202b09957f09';
const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const candidate = approved_first_ten_candidate_v2_json_1.default;
/**
 * Явные поправки владельца поверх неизменяемого архива 1–10.
 *
 * Архив и его SHA остаются историческим доказательством того, что именно было
 * одобрено. Очевидные опечатки при этом не должны попадать ученику и не должны
 * возвращаться при повторном импорте. Каждая поправка здесь адресная и покрыта
 * регрессионным тестом.
 */
exports.APPROVED_FIRST_TEN_OWNER_ERRATA_V3 = Object.freeze({
    'ru/01/11/meaning': 'Мне жарко',
});
function applyOwnerErrata(locale, sessionIndex, phraseIndex, details) {
    if (locale === 'ru' && sessionIndex === 0 && phraseIndex === 10) {
        return {
            ...details,
            meaning: exports.APPROVED_FIRST_TEN_OWNER_ERRATA_V3['ru/01/11/meaning'],
        };
    }
    return details;
}
function localized(select) {
    return {
        ru: select('ru'),
        uk: select('uk'),
        es: select('es'),
        'pt-BR': select('pt-BR'),
        vi: select('vi'),
        id: select('id'),
        tr: select('tr'),
        pl: select('pl'),
    };
}
function isWordCharacter(value) {
    return value !== undefined && /[\p{L}\p{N}'’]/u.test(value);
}
function hasTermBoundary(text, start, term) {
    const before = start > 0 ? text[start - 1] : undefined;
    const after = text[start + term.length];
    return !((isWordCharacter(term[0]) && isWordCharacter(before)) ||
        (isWordCharacter(term[term.length - 1]) && isWordCharacter(after)));
}
function pushRun(runs, text, semantic) {
    if (!text)
        return;
    const previous = runs[runs.length - 1];
    if (previous?.semantic === semantic) {
        runs[runs.length - 1] = { text: `${previous.text}${text}`, semantic };
        return;
    }
    runs.push({ text, semantic });
}
function bodyRuns(body, sessionIndex, locale, pageIndex) {
    const semanticByTerm = new Map();
    const practice = candidate.sessions[sessionIndex].practice;
    const details = candidate.practiceDetails[locale][sessionIndex];
    practice.forEach(([correct, wrong], phraseIndex) => {
        semanticByTerm.set(correct, 'targetCorrect');
        wrong.forEach((value) => semanticByTerm.set(value, 'targetWrong'));
        details[phraseIndex].words.forEach((word) => {
            semanticByTerm.set(word.correct, 'targetCorrect');
            word.distractors.forEach((entry) => semanticByTerm.set(entry.value, 'targetWrong'));
        });
    });
    const page = candidate.locales[locale].sessions[sessionIndex][3][pageIndex];
    page[4].forEach((choice, choiceIndex) => {
        if (!semanticByTerm.has(choice))
            return;
        semanticByTerm.set(choice, choiceIndex === page[5] ? 'targetCorrect' : 'targetWrong');
    });
    const terms = [...semanticByTerm.keys()]
        .filter(Boolean)
        .sort((left, right) => right.length - left.length || left.localeCompare(right));
    const runs = [];
    let cursor = 0;
    while (cursor < body.length) {
        const term = terms.find((candidateTerm) => body.startsWith(candidateTerm, cursor) &&
            hasTermBoundary(body, cursor, candidateTerm));
        if (term) {
            pushRun(runs, term, semanticByTerm.get(term) ?? 'explanation');
            cursor += term.length;
            continue;
        }
        let end = cursor + 1;
        while (end < body.length &&
            !terms.some((candidateTerm) => body.startsWith(candidateTerm, end) &&
                hasTermBoundary(body, end, candidateTerm))) {
            end += 1;
        }
        pushRun(runs, body.slice(cursor, end), 'explanation');
        cursor = end;
    }
    return runs;
}
function localizedRuns(sessionIndex, pageIndex) {
    const forLocale = (locale) => {
        const body = candidate.locales[locale].sessions[sessionIndex][3][pageIndex][2];
        return bodyRuns(body, sessionIndex, locale, pageIndex);
    };
    return {
        ru: forLocale('ru'),
        uk: forLocale('uk'),
        es: forLocale('es'),
        'pt-BR': forLocale('pt-BR'),
        vi: forLocale('vi'),
        id: forLocale('id'),
        tr: forLocale('tr'),
        pl: forLocale('pl'),
    };
}
function categoryFor(token) {
    if (token === 'I' || token === 'You')
        return 'pronoun';
    if (['am', 'are'].includes(token))
        return 'to-be';
    if (token === 'not')
        return 'negation';
    if (token === 'a' || token === 'an')
        return 'article';
    if (/^(?:I’m|You’re)$/u.test(token))
        return 'contraction';
    return 'lexical';
}
function phraseId(sessionOrdinal, phraseIndex) {
    return `e01-s${String(sessionOrdinal).padStart(2, '0')}-approved-${String(phraseIndex + 1).padStart(2, '0')}`;
}
function buildPhrase(sessionIndex, phraseIndex) {
    const session = candidate.sessions[sessionIndex];
    const [english] = session.practice[phraseIndex];
    const localizedDetails = Object.fromEntries(LOCALES.map((locale) => [
        locale,
        applyOwnerErrata(locale, sessionIndex, phraseIndex, candidate.practiceDetails[locale][sessionIndex][phraseIndex]),
    ]));
    const russian = localizedDetails.ru;
    const plan = episode_01_session_map_v1_1.EPISODE_01_SESSION_MAP_V1[sessionIndex];
    const features = [...new Set(['copula_be', ...plan.teaches])];
    return {
        id: phraseId(session.ordinal, phraseIndex),
        english,
        russian: russian.meaning,
        explanation: russian.explanation,
        words: russian.words.map((word) => ({
            correct: word.correct,
            category: categoryFor(word.correct),
            distractors: word.distractors.map((entry) => ({
                value: entry.value,
                reasonCode: 'approved_candidate_distractor',
                why: entry.reason,
            })),
        })),
        localizedDetails,
        features,
    };
}
function buildSession(sessionIndex) {
    const session = candidate.sessions[sessionIndex];
    const pages = [0, 1, 2].map((pageIndex) => ({
        kind: candidate.locales.ru.sessions[sessionIndex][3][pageIndex][0],
        title: localized((locale) => candidate.locales[locale].sessions[sessionIndex][3][pageIndex][1]),
        body: localized((locale) => candidate.locales[locale].sessions[sessionIndex][3][pageIndex][2]),
        bodyRuns: localizedRuns(sessionIndex, pageIndex),
        question: {
            prompt: localized((locale) => candidate.locales[locale].sessions[sessionIndex][3][pageIndex][3]),
            choices: [0, 1, 2].map((choiceIndex) => localized((locale) => candidate.locales[locale].sessions[sessionIndex][3][pageIndex][4][choiceIndex])),
            correctChoiceIndex: candidate.locales.ru.sessions[sessionIndex][3][pageIndex][5],
            explanation: localized((locale) => candidate.locales[locale].sessions[sessionIndex][3][pageIndex][6]),
        },
    }));
    return {
        packageId: 'learning-v2-en-v1',
        targetLanguage: 'en',
        episodeOrdinal: 1,
        requiredSessionOrdinal: session.ordinal,
        canDoOutcomeId: 'obj-e01-say-who-i-am',
        generationInputFingerprint: exports.APPROVED_FIRST_TEN_CANDIDATE_SHA_V2,
        title: localized((locale) => candidate.locales[locale].sessions[sessionIndex][0]),
        summary: localized((locale) => candidate.locales[locale].sessions[sessionIndex][1]),
        learningGoal: localized((locale) => candidate.locales[locale].sessions[sessionIndex][2]),
        introPages: pages,
        phrases: session.practice.map((_, phraseIndex) => buildPhrase(sessionIndex, phraseIndex)),
    };
}
if (candidate.version !== 2 ||
    candidate.sessions.length !== 10 ||
    candidate.localeOrder.join('|') !== LOCALES.join('|')) {
    throw new Error('approved_first_ten_candidate_shape_invalid');
}
exports.APPROVED_FIRST_TEN_SESSION_SOURCES_V2 = Object.freeze(candidate.sessions.map((_, index) => buildSession(index)));
exports.APPROVED_FIRST_TEN_PHRASE_SOURCES_V2 = Object.freeze(exports.APPROVED_FIRST_TEN_SESSION_SOURCES_V2.map((source) => source.phrases));
//# sourceMappingURL=approved_first_ten_source_v2.js.map