"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_PRACTICE_CARD_COUNT_V1 = exports.SESSION_PHRASE_COUNT_V1 = exports.UNTRANSLATED_MARKER = void 0;
exports.expandLocalized = expandLocalized;
exports.learningV2SingleTargetSuccessV1 = learningV2SingleTargetSuccessV1;
exports.buildSessionShardFromSource = buildSessionShardFromSource;
// зачем: валидатор shard'а полностью детерминирован — id, семьи, порядок и хеши
// выводятся из политики сессии. Писать shard руками нельзя: 12 карточек × 8 локалей
// × 6 текстов = сотни полей, которые обязаны совпасть до символа. Поэтому контент
// живёт в человекочитаемом источнике (episode_01_source_v1.ts), а этот билдер
// разворачивает его в структуру, которую принимает настоящий validate*.
const generator_course_contract_1 = require("../generator_course_contract");
const generator_session_shard_1 = require("../generator_session_shard");
const intro_semantic_runs_v1_1 = require("../intro_semantic_runs_v1");
const lesson1_session_choreography_v1_1 = require("./lesson1_session_choreography_v1");
const decision_registry_1 = require("../../policies/decision_registry");
const HEX64_RE = /^[0-9a-f]{64}$/;
// зачем (владелец, 2026-08-23): файлы-помощники сессий 11–56 проставляли
// отпечаток строкой-заглушкой вида `authored-e01-s11-v2`. Валидатор рантайма
// требует 64-hex и отвергал КАЖДУЮ такую сессию — второй, независимый от
// review-квитанций блокер, из-за которого готовый материал не доезжал до
// экрана. Нормализуем в одном месте: уже валидный отпечаток остаётся как есть,
// заглушка детерминированно превращается в хэш от самой строки — значение
// стабильно между сборками, клиентом и сервером.
function normalizedGenerationInputFingerprint(raw, sessionOrdinal) {
    // зачем в хэш идёт и номер сессии (аудит 2026-08-23): заглушка — это просто
    // строка-метка, и никто не сторожит её уникальность. Две сессии с одинаковой
    // меткой получили бы ОДИН отпечаток; номер делает столкновение невозможным.
    return HEX64_RE.test(raw)
        ? raw
        : (0, decision_registry_1.hashCanonicalBody)({ authoredFingerprintLabel: raw, sessionOrdinal });
}
const FAMILY_FUNCTION = Object.freeze({
    visual_discovery: 'notice',
    listen_choose: 'comprehend',
    sound_contrast: 'discriminate',
    sound_syllable_lab: 'discriminate',
    scripted_repeat_compare: 'pronounce',
    phrase_builder: 'assemble',
    listen_build_dictation: 'assemble',
    context_gap_grammar: 'retrieve',
    quick_spoken_response: 'respond',
    shadowing_prosody: 'pronounce',
    describe_scene: 'notice',
    microstory_radio: 'comprehend',
    branching_scene: 'transfer',
    scripted_dialogue: 'transfer',
    personalized_review: 'review',
    speed_match: 'retrieve',
});
const AUDIO_FAMILIES = new Set([
    'listen_choose',
    'sound_contrast',
    'listen_build_dictation',
    'scripted_repeat_compare',
    'shadowing_prosody',
    'microstory_radio',
]);
exports.UNTRANSLATED_MARKER = '[[NEEDS_TRANSLATION]] ';
function expandLocalized(source) {
    const explicit = {
        ru: source.ru,
        uk: source.uk,
        es: source.es,
        'pt-BR': source['pt-BR'],
        vi: source.vi,
        id: source.id,
        tr: source.tr,
        pl: source.pl,
        ...(source.rest ?? {}),
    };
    return Object.fromEntries(generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
        locale,
        explicit[locale] ?? `${exports.UNTRANSLATED_MARKER}${source.ru}`,
    ]));
}
const pad = (value) => String(value).padStart(2, '0');
function expandLocalizedIntroRuns(source) {
    const explicit = {
        ru: source.ru,
        uk: source.uk,
        es: source.es,
        'pt-BR': source['pt-BR'],
        vi: source.vi,
        id: source.id,
        tr: source.tr,
        pl: source.pl,
        ...(source.rest ?? {}),
    };
    return Object.fromEntries(generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
        locale,
        explicit[locale] ?? [
            {
                text: `${exports.UNTRANSLATED_MARKER}${(0, intro_semantic_runs_v1_1.introRunsPlainTextV1)(source.ru)}`,
                semantic: 'explanation',
            },
        ],
    ]));
}
function introTermBoundary(text, start, term) {
    const word = /[\p{L}\p{N}_]/u;
    const before = start > 0 ? text[start - 1] : '';
    const after = text[start + term.length] ?? '';
    return !(word.test(term[0] ?? '') && word.test(before)) &&
        !(word.test(term[term.length - 1] ?? '') && word.test(after));
}
/**
 * Visual semantics never author or rewrite copy. They only ensure that every
 * occurrence of an explicitly authored English example receives the same
 * semantic styling as the first occurrence. Multiword learner answers are
 * safe evidence; single words are expanded only when the author already
 * marked that exact word in bodyRuns.
 */
function completeAuthoredIntroRuns(page, phrases) {
    if (!page.bodyRuns)
        return undefined;
    const authored = expandLocalizedIntroRuns(page.bodyRuns);
    const expandedBody = expandLocalized(page.body);
    const expandedChoices = [
        expandLocalized(page.question.choices[0]),
        expandLocalized(page.question.choices[1]),
        expandLocalized(page.question.choices[2]),
    ];
    return Object.fromEntries(generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
        const body = expandedBody[locale];
        const semantics = new Map();
        for (const run of authored[locale]) {
            if (run.semantic !== 'explanation' && run.semantic !== 'nativeGloss') {
                semantics.set(run.text, run.semantic);
            }
        }
        const correctChoice = expandedChoices[page.question.correctChoiceIndex][locale];
        const choices = expandedChoices.map((choice) => choice[locale]);
        const authoredExamples = [
            ...phrases.map((phrase) => phrase.english),
            ...choices,
        ];
        for (const example of authoredExamples) {
            if (example.length < 4 || !/[\s?!.'’]/u.test(example))
                continue;
            semantics.set(example, example === correctChoice || phrases.some((phrase) => phrase.english === example)
                ? 'targetCorrect'
                : 'targetWrong');
        }
        const terms = [...semantics.keys()]
            .filter(Boolean)
            .sort((left, right) => right.length - left.length || left.localeCompare(right));
        const runs = [];
        let cursor = 0;
        while (cursor < body.length) {
            const term = terms.find((candidate) => body.startsWith(candidate, cursor) && introTermBoundary(body, cursor, candidate));
            if (term) {
                runs.push({ text: term, semantic: semantics.get(term) ?? 'explanation' });
                cursor += term.length;
                continue;
            }
            let end = cursor + 1;
            while (end < body.length && !terms.some((candidate) => body.startsWith(candidate, end) && introTermBoundary(body, end, candidate)))
                end += 1;
            runs.push({ text: body.slice(cursor, end), semantic: 'explanation' });
            cursor = end;
        }
        return [locale, runs];
    }));
}
/**
 * Инструкция к карточке зависит от механики, а не от фразы: собрать, услышать,
 * выбрать форму. Пишем по-человечески, без жаргона семей.
 */
const FAMILY_INSTRUCTION = Object.freeze({
    listen_choose: {
        ru: 'Послушайте и выберите то, что услышали.',
        uk: 'Послухайте й оберіть те, що почули.',
        es: 'Escucha y elige lo que oíste.',
        'pt-BR': 'Ouça e escolha o que você ouviu.',
        vi: 'Hãy nghe và chọn điều bạn vừa nghe.',
        id: 'Dengarkan dan pilih yang Anda dengar.',
        tr: 'Dinleyin ve duyduğunuzu seçin.',
        pl: 'Posłuchaj i wybierz to, co słyszysz.',
    },
    phrase_builder: {
        ru: 'Соберите фразу из слов.',
        uk: 'Складіть фразу зі слів.',
        es: 'Forma la frase con las palabras.',
        'pt-BR': 'Monte a frase com as palavras.',
        vi: 'Hãy ghép các từ thành câu.',
        id: 'Susun kalimat dari kata-kata.',
        tr: 'Sözcüklerden cümleyi kurun.',
        pl: 'Ułóż zdanie z wyrazów.',
    },
    speed_match: {
        ru: 'Быстро подберите правильное слово.',
        uk: 'Швидко доберіть правильне слово.',
        es: 'Elige rápido la palabra correcta.',
        'pt-BR': 'Escolha rapidamente a palavra certa.',
        vi: 'Hãy nhanh chóng chọn từ đúng.',
        id: 'Pilih kata yang tepat dengan cepat.',
        tr: 'Doğru sözcüğü hızla seçin.',
        pl: 'Szybko wybierz właściwe słowo.',
    },
    sound_contrast: {
        ru: 'Различите похожие по звучанию слова.',
        uk: 'Розрізніть схожі за звучанням слова.',
        es: 'Distingue las palabras que suenan parecido.',
        'pt-BR': 'Diferencie as palavras com sons parecidos.',
        vi: 'Hãy phân biệt những từ có âm gần giống nhau.',
        id: 'Bedakan kata-kata yang terdengar mirip.',
        tr: 'Benzer sesli sözcükleri ayırt edin.',
        pl: 'Rozróżnij podobnie brzmiące słowa.',
    },
    context_gap_grammar: {
        ru: 'Поставьте нужную форму по смыслу.',
        uk: 'Поставте потрібну форму за змістом.',
        es: 'Pon la forma correcta según el sentido.',
        'pt-BR': 'Complete com a forma adequada ao sentido.',
        vi: 'Hãy điền dạng phù hợp với ý nghĩa.',
        id: 'Isilah dengan bentuk yang sesuai makna.',
        tr: 'Anlama uygun biçimi yerleştirin.',
        pl: 'Wstaw formę pasującą do znaczenia.',
    },
    listen_build_dictation: {
        ru: 'Послушайте и восстановите фразу.',
        uk: 'Послухайте й відновіть фразу.',
        es: 'Escucha y reconstruye la frase.',
        'pt-BR': 'Ouça e reconstrua a frase.',
        vi: 'Hãy nghe và ghép lại câu.',
        id: 'Dengarkan dan susun kembali kalimatnya.',
        tr: 'Dinleyin ve cümleyi yeniden kurun.',
        pl: 'Posłuchaj i odtwórz zdanie.',
    },
    scripted_repeat_compare: {
        ru: 'Повторите вслух и сравните с образцом.',
        uk: 'Повторіть уголос і порівняйте зі зразком.',
        es: 'Repite en voz alta y compara con el modelo.',
        'pt-BR': 'Repita em voz alta e compare com o modelo.',
        vi: 'Hãy lặp lại thành tiếng và so sánh với mẫu.',
        id: 'Ucapkan dengan lantang dan bandingkan dengan contoh.',
        tr: 'Sesli tekrar edin ve örnekle karşılaştırın.',
        pl: 'Powtórz na głos i porównaj ze wzorem.',
    },
});
const VOCABULARY_STAGE_INSTRUCTION = Object.freeze({
    recognize: {
        ru: 'Послушайте и выберите услышанное слово.',
        uk: 'Послухайте й виберіть почуте слово.',
        es: 'Escucha y elige la palabra que oyes.',
        'pt-BR': 'Ouça e escolha a palavra que você ouviu.',
        vi: 'Hãy nghe và chọn từ bạn vừa nghe.',
        id: 'Dengarkan dan pilih kata yang Anda dengar.',
        tr: 'Dinleyin ve duyduğunuz sözcüğü seçin.',
        pl: 'Posłuchaj i wybierz usłyszane słowo.',
    },
    retrieve_meaning: {
        ru: 'Выберите точное значение слова.',
        uk: 'Виберіть точне значення слова.',
        es: 'Elige el significado exacto de la palabra.',
        'pt-BR': 'Escolha o significado exato da palavra.',
        vi: 'Hãy chọn đúng nghĩa của từ.',
        id: 'Pilih arti kata yang tepat.',
        tr: 'Sözcüğün tam anlamını seçin.',
        pl: 'Wybierz dokładne znaczenie słowa.',
    },
    build_form: {
        ru: 'Выберите точную письменную форму.',
        uk: 'Виберіть точну письмову форму.',
        es: 'Elige la forma escrita exacta.',
        'pt-BR': 'Escolha a forma escrita exata.',
        vi: 'Hãy chọn đúng dạng viết.',
        id: 'Pilih bentuk tulisan yang tepat.',
        tr: 'Doğru yazılı biçimi seçin.',
        pl: 'Wybierz poprawną formę zapisu.',
    },
});
/**
 * Keeps the learned phrase visible once and only once in positive feedback.
 * Editorial explanations may already begin with the phrase; the projection
 * must not prepend it again or add a full stop after an existing question mark.
 */
function learningV2SingleTargetSuccessV1(target, explanation) {
    const cleanTarget = target.normalize('NFC').trim();
    const targetKey = cleanTarget.toLocaleLowerCase('en');
    let remainder = explanation.normalize('NFC').trim();
    if (remainder.slice(0, cleanTarget.length).toLocaleLowerCase('en') === targetKey) {
        remainder = remainder
            .slice(cleanTarget.length)
            .trimStart()
            .replace(/^[.!?]+\s*/u, '');
    }
    // A later example sentence can repeat the exact target even after the
    // opening has been deduplicated. Drop that redundant sentence as a unit;
    // deleting only the phrase would leave broken copy such as "— and I am...".
    remainder = (remainder.match(/[^.!?]+(?:[.!?]+|$)/gu) ?? [remainder])
        .filter((sentence) => !sentence.toLocaleLowerCase('en').includes(targetKey))
        .join(' ')
        .replace(/\s+/gu, ' ')
        .trim();
    if (!remainder)
        return cleanTarget;
    return /^[—–:;,]/u.test(remainder)
        ? `${cleanTarget} ${remainder}`
        : `${cleanTarget} — ${remainder}`;
}
function cardCopy(phrase, family) {
    const instruction = FAMILY_INSTRUCTION[family] ?? FAMILY_INSTRUCTION.phrase_builder;
    // зачем: подсказка — это объяснение фразы из источника, а не «попробуйте ещё».
    // Владелец требует богатый разбор на каждой карточке.
    const localized = phrase.localizedDetails;
    // зачем необязательные локали (2026-08-23): localizedDetails стал Partial по
    // общему списку локалей — у английского курса пустует 'en', у испанского
    // 'es'. Раньше тип обещал все восемь и код читал их напрямую; с девятой
    // локалью это стало ложью. Незаполненная локаль теперь пропускается и
    // подхватывается обычным UNTRANSLATED_MARKER в expandLocalized, а не роняет
    // сборку и не подменяется молча русским текстом.
    const localeCopy = (select, legacy) => {
        if (!localized)
            return legacy;
        const pick = (locale) => {
            const details = localized[locale];
            return details ? select(details) : undefined;
        };
        return {
            ru: pick('ru') ?? legacy.ru,
            uk: pick('uk') ?? legacy.uk,
            es: pick('es') ?? legacy.es,
            rest: Object.fromEntries(generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.flatMap((locale) => {
                if (locale === 'ru' || locale === 'uk' || locale === 'es')
                    return [];
                const value = pick(locale);
                return value === undefined
                    ? []
                    : [[locale, value]];
            })),
        };
    };
    const hint = localeCopy((details) => details.explanation, {
        ru: phrase.explanation,
        uk: phrase.explanation,
        es: phrase.explanation,
    });
    // Разбор ошибок: почему каждый неверный вариант неверен.
    const legacyErrorLines = phrase.words
        .flatMap((word) => word.distractors.map((entry) => `${entry.value} — ${entry.why}`))
        .slice(0, 6)
        .join(' ');
    return {
        instructionByLocale: expandLocalized(instruction),
        hintByLocale: expandLocalized(hint),
        successMessageByLocale: expandLocalized(localeCopy((details) => learningV2SingleTargetSuccessV1(phrase.english, details.explanation), {
            ru: `Верно: ${phrase.english}.`,
            uk: `Правильно: ${phrase.english}.`,
            es: `Correcto: ${phrase.english}.`,
        })),
        retryMessageByLocale: expandLocalized(localeCopy((details) => details.distractors[0]?.reason ?? details.explanation, {
            ru: 'Почти. Посмотрите на подсказку и попробуйте ещё раз.',
            uk: 'Майже. Подивіться підказку і спробуйте ще раз.',
            es: 'Casi. Mira la pista e inténtalo otra vez.',
        })),
        errorExplanationByLocale: expandLocalized(localeCopy((details) => details.distractors
            .map((entry) => `${entry.value} — ${entry.reason}`)
            .join(' '), {
            ru: legacyErrorLines,
            uk: legacyErrorLines,
            es: legacyErrorLines,
        })),
        accessibilityLabelByLocale: expandLocalized(localeCopy((details) => `${phrase.english}. ${details.meaning}.`, {
            ru: `Задание: ${phrase.english}. ${phrase.russian}.`,
            uk: `Завдання: ${phrase.english}. ${phrase.russian}.`,
            es: `Tarea: ${phrase.english}. ${phrase.russian}.`,
        })),
    };
}
/**
 * Авторский inventory одной сессии. Это не число interactions: rapid и voice
 * используют один и тот же банк с разным количеством диагностических касаний.
 */
exports.SESSION_PHRASE_COUNT_V1 = 15;
/** Исторический standard-профиль: rapid/voice получают число из choreography. */
exports.SESSION_PRACTICE_CARD_COUNT_V1 = exports.SESSION_PHRASE_COUNT_V1 - 3;
function buildSessionShardFromSource(source) {
    // зачем 15 (владелец, 2026-08-17): контракт пакета требует 14–18 заданий в
    // профиле standard. 12 фраз давали ровно 12 заданий (3 вопроса интро + 9
    // карточек) — публикация падала. 15 фраз дают 15 заданий, середина диапазона.
    const hasExplicitVocabulary = (source.newVocabulary?.length ?? 0) > 0;
    if (!hasExplicitVocabulary && source.phrases.length !== exports.SESSION_PHRASE_COUNT_V1)
        throw new Error(`session_source_requires_exactly_${exports.SESSION_PHRASE_COUNT_V1}_phrases`);
    if (hasExplicitVocabulary &&
        (source.phrases.length < 1 || source.phrases.length > exports.SESSION_PHRASE_COUNT_V1))
        throw new Error('session_word_first_source_phrase_inventory_invalid');
    const episodeId = `episode-${pad(source.episodeOrdinal)}`;
    const sessionOrdinal = source.requiredSessionOrdinal;
    const generationInputFingerprint = normalizedGenerationInputFingerprint(source.generationInputFingerprint, sessionOrdinal);
    const sessionTemplateId = `${episodeId}:session-${pad(sessionOrdinal)}`;
    const choreography = (0, lesson1_session_choreography_v1_1.lesson1SessionChoreographyV1)(sessionOrdinal, source.sessionKindOverride, source.newVocabulary?.length ?? 0, source.phrases.length);
    const introPages = source.introPages.map((page, index) => {
        const ordinal = (index + 1);
        const bodyRunsByLocale = completeAuthoredIntroRuns(page, source.phrases);
        return {
            pageOrdinal: ordinal,
            pageId: `${sessionTemplateId}:intro-${ordinal}`,
            kind: page.kind,
            titleByLocale: expandLocalized(page.title),
            bodyByLocale: expandLocalized(page.body),
            ...(bodyRunsByLocale ? { bodyRunsByLocale } : {}),
            question: {
                questionId: `${sessionTemplateId}:intro-q-${ordinal}`,
                requiredTaskSlot: ordinal,
                promptByLocale: expandLocalized(page.question.prompt),
                choicesByLocale: Object.fromEntries(generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
                    locale,
                    [
                        expandLocalized(page.question.choices[0])[locale],
                        expandLocalized(page.question.choices[1])[locale],
                        expandLocalized(page.question.choices[2])[locale],
                    ],
                ])),
                correctChoiceIndex: page.question.correctChoiceIndex,
                explanationByLocale: expandLocalized(page.question.explanation),
            },
        };
    });
    const intro = {
        schemaVersion: 'learning-v2-generated-session-intro.v3',
        sessionTemplateId,
        titleByLocale: expandLocalized(source.title),
        summaryByLocale: expandLocalized(source.summary),
        learningGoalByLocale: expandLocalized(source.learningGoal),
        pages: [introPages[0], introPages[1], introPages[2]],
        practiceStartSlot: 4,
        slotPresentationPolicy: 'slots_1_2_3_embedded_in_intro_pages_not_repeated',
    };
    const cards = choreography.steps.map((step, index) => {
        const slot = index + 1;
        const family = step.family;
        const contentItemId = `content-${episodeId}-s${pad(sessionOrdinal)}-${pad(slot)}`;
        const vocabularyStage = step.learningStage === 'recognize' ||
            step.learningStage === 'retrieve_meaning' ||
            step.learningStage === 'build_form'
            ? step.learningStage
            : null;
        const vocabulary = step.targetKind === 'vocabulary'
            ? source.newVocabulary?.[step.sourceVocabularyIndex ?? -1]
            : undefined;
        if (step.targetKind === 'vocabulary' && (!vocabulary || !vocabularyStage))
            throw new Error('session_source_choreography_vocabulary_missing');
        const phrase = step.targetKind === 'phrase'
            ? source.phrases[step.sourcePhraseIndex ?? -1]
            : undefined;
        if (step.targetKind === 'phrase' && !phrase)
            throw new Error('session_source_choreography_phrase_missing');
        const vocabularyContact = vocabulary && vocabularyStage
            ? vocabulary.contacts[vocabularyStage]
            : undefined;
        const targetText = vocabulary?.target ?? phrase.english;
        const intentSourceId = vocabulary?.id ?? phrase.id;
        // зачем locale === 'es' читает 'en' (владелец, 2026-08-23): 'es' —
        // историческая обязательная локаль объяснения английского курса. Когда
        // targetLanguage сам испанский, 'es' объяснением не является вообще —
        // курс объясняет себя через 'en'. Подставлять сюда UNTRANSLATED_MARKER
        // было бы дефектом по правилу LESSON_DESIGN_RULES (любой
        // [[NEEDS_TRANSLATION]] — ненаписанная сессия), а подставлять русский
        // текст — обманом читателя, будто это испанское объяснение. Владелец
        // распорядился заменить 'es' на полноценное значение 'en' для курсов,
        // где 'es' не используется как локаль объяснения.
        const expandedVocabularyMeaning = vocabulary
            ? expandLocalized(vocabulary.meaning)
            : null;
        const meaningFor = (locale) => {
            if (expandedVocabularyMeaning)
                return expandedVocabularyMeaning[locale];
            return phrase.localizedDetails?.[locale]?.meaning ??
                (locale === 'es'
                    ? (phrase.localizedDetails?.en?.meaning ?? `${exports.UNTRANSLATED_MARKER}${phrase.russian}`)
                    : locale === 'ru'
                        ? phrase.russian
                        : `${exports.UNTRANSLATED_MARKER}${phrase.russian}`);
        };
        const contentItem = {
            schemaVersion: 'v2-content-item.v1',
            contentItemId,
            episodeId,
            intentId: `${intentSourceId}:contact-${pad(slot)}`,
            target: {
                locale: source.targetLanguage,
                text: targetText,
                register: 'neutral',
                region: 'global',
            },
            learnerMeanings: generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
                const meaning = meaningFor(locale);
                return {
                    locale,
                    value: meaning,
                    sourceHash: (0, generator_session_shard_1.learningV2GeneratedMeaningSourceHash)({
                        contentItemId,
                        targetLanguage: source.targetLanguage,
                        targetText,
                        locale,
                        meaning,
                        generationInputFingerprint,
                    }),
                };
            }),
            acceptedAnswers: [targetText],
            // зачем: дистракторы из источника становятся отклонёнными ответами с причиной —
            // рантайм объясняет ошибку, а не просто красит красным.
            rejectedAnswers: vocabularyContact
                ? vocabularyContact.distractors.map((entry) => ({
                    value: entry.value,
                    // The task selector needs the tested correct form in position 2.
                    // Keep the author's stable suffix so audits can still identify the
                    // exact misconception rather than collapsing every trap by type.
                    reasonCode: `${entry.trapType}:${targetText}:${entry.value}:${entry.reasonCode}`,
                }))
                : phrase.words.flatMap((word) => word.distractors.map((entry) => ({
                    value: entry.value,
                    reasonCode: entry.reasonCode,
                }))),
            linguisticFeatures: vocabulary?.features ?? phrase.features,
            pronunciationTargets: [],
            prerequisiteContentItemIds: [],
            objectiveIds: [source.canDoOutcomeId],
            compatibleFamilies: [family],
        };
        const learnerCopy = vocabularyContact && vocabularyStage && expandedVocabularyMeaning
            ? (() => {
                const guidance = expandLocalized(vocabularyContact.guidance);
                const feedback = vocabularyContact.distractors.map((entry) => ({
                    value: entry.value,
                    byLocale: expandLocalized(entry.feedback),
                }));
                const localized = (select) => Object.fromEntries(generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.map((locale) => [locale, select(locale)]));
                return {
                    instructionByLocale: expandLocalized(VOCABULARY_STAGE_INSTRUCTION[vocabularyStage]),
                    hintByLocale: guidance,
                    successMessageByLocale: localized((locale) => learningV2SingleTargetSuccessV1(targetText, guidance[locale])),
                    retryMessageByLocale: localized((locale) => feedback[0]?.byLocale[locale] ?? guidance[locale]),
                    errorExplanationByLocale: localized((locale) => feedback
                        .map((entry) => `${entry.value} — ${entry.byLocale[locale]}`)
                        .join(' ')),
                    accessibilityLabelByLocale: localized((locale) => `${targetText}. ${expandedVocabularyMeaning[locale]}.`),
                };
            })()
            : cardCopy(phrase, family);
        return {
            cardId: `card-${episodeId}-s${pad(sessionOrdinal)}-${pad(slot)}`,
            taskSlot: slot,
            purpose: step.purpose,
            activityId: `activity-${episodeId}-s${pad(sessionOrdinal)}-${pad(slot)}-${family}`,
            family,
            learningFunction: FAMILY_FUNCTION[family],
            support: choreography.support,
            promptNovelty: choreography.promptNovelty,
            promptId: `prompt-${episodeId}-${pad(sessionOrdinal)}-${pad(slot)}`,
            introQuestionId: slot <= 3 ? intro.pages[slot - 1].question.questionId : null,
            contentItem,
            ...learnerCopy,
            audioScript: AUDIO_FAMILIES.has(family)
                ? {
                    contentItemId,
                    language: source.targetLanguage,
                    inputText: targetText,
                    characterId: null,
                    instructions: 'Clear, warm, unhurried English for an absolute beginner. Natural rhythm, no exaggerated teacher voice.',
                }
                : null,
        };
    });
    return {
        schemaVersion: 'learning-v2-generated-session-shard.v1',
        packageId: source.packageId,
        targetLanguage: source.targetLanguage,
        episodeOrdinal: source.episodeOrdinal,
        requiredSessionOrdinal: sessionOrdinal,
        episodeId,
        sessionId: `session-${episodeId}-${pad(sessionOrdinal)}`,
        sessionTemplateId,
        canDoOutcomeId: source.canDoOutcomeId,
        zone: choreography.zone,
        support: choreography.support,
        generationInputFingerprint,
        interfaceLocales: generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES,
        contentKinds: generator_course_contract_1.LEARNING_V2_REQUIRED_CONTENT_KINDS,
        intro: intro,
        cards,
    };
}
//# sourceMappingURL=session_shard_from_source_v1.js.map