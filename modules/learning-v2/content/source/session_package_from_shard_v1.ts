// зачем: между написанной сессией и публикацией зияла дыра. Шард — то, что
// пишет автор: интро, карточки, дистракторы. Пакет — то, что принимает сервер:
// пять отдельных файлов с закреплёнными отпечатками. Конвертера между ними не
// было, поэтому курс невозможно было выложить, а приложение отвечало NOT FOUND.
//
// Пять детей и зачем каждый:
//   intro             — три страницы вступления с вопросами (слоты 1–3)
//   learner           — то, что человек видит: задания и варианты
//   evaluator_capsule — правильные ответы, остаются на сервере
//   evaluator_sidecar — разбор ошибок для подсказок
//   auxiliary         — вспомогательное: сохранение фраз, объяснения
import {
  materializeLearningV2CourseSessionAuxiliaryChildV1,
  materializeLearningV2CourseSessionIntroChildV1,
  materializeLearningV2CourseSessionLearnerChildV1,
  materializeLearningV2CourseSessionSavablePhraseV1,
  type LearningV2CourseSessionNewWordEncounterV1,
} from '../../runtime/course_session_client_children_v1';
import type {
  LearningV2GeneratedSessionCardV1,
  LearningV2GeneratedSessionShardV1,
} from '../generator_session_shard';
// зачем: капсула обязана собираться каноническим строителем, а не вручную —
// он считает криптографические обязательства вместо открытых ответов и
// заполняет восемь полей полномочий, которых у ручного объекта не было.
import { materializeLearningV2CourseSessionEvaluatorCapsuleChildV1 } from '../../runtime/course_session_evaluator_capsule_child_v1';
import { v2LocalEvaluatorInputKindForFamilyV1 } from '../../runtime/local_evaluator_capsule_v1';
// зачем sha256Utf8 вместо node:crypto (инцидент 2026-08-17): этот файл
// вызывается из app/learning_v2_course_released_session_client_v3.ts прямо на
// устройстве (бандл урока 1 без сети) — node:crypto недоступен в рантайме RN,
// Metro падал с "Unable to resolve module node:crypto". sha256Utf8 — тот же
// хеш, но чистый JS, уже используется остальными файлами этого модуля.
import { sha256Utf8 } from '../../policies/decision_registry';
import {
  LESSON1_SESSION_01_MODE_NATIVE_PLAN_ID_V1,
  LESSON1_SESSION_02_MODE_NATIVE_PLAN_ID_V1,
  inferLesson1WordFirstPhraseCountV1,
  inferLesson1WordFirstVocabularyCountV1,
  lesson1SessionChoreographyV1,
} from './lesson1_session_choreography_v1';
import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2InterfaceLocale,
} from '../generator_course_contract';
import { lesson1DistractorChoicesV2 } from './lesson1_distractor_catalog_v2';
import { selectTaskDistractors } from './task_specific_distractors_v1';
import {
  episode01Session12FormFeedbackV1,
  episode01Session12ListenFeedbackV1,
} from './episode_01_session_12_task_feedback_v1';
import {
  episode01Session13FormFeedbackV1,
  episode01Session13ListenFeedbackV1,
} from './episode_01_session_13_task_feedback_v1';
import {
  episode01Session14FormFeedbackV1,
  episode01Session14ListenFeedbackV1,
} from './episode_01_session_14_task_feedback_v1';
import {
  episode01Session15ChoiceFeedbackV1,
  episode01Session15ChoiceTargetsV1,
  episode01Session15FormFeedbackV1,
} from './episode_01_session_15_task_feedback_v1';
import {
  episode01Session16TaskFeedbackV1,
  episode01Session16TaskSelectionV1,
} from './episode_01_session_16_task_feedback_v1';
import {
  episode01Session17ChoiceTargetsV1,
  episode01Session17TaskFeedbackV1,
  episode01Session17TaskSelectionV1,
} from './episode_01_session_17_task_feedback_v1';
import {
  episode01Session18ChoiceTargetsV1,
  episode01Session18TaskFeedbackV1,
  episode01Session18TaskSelectionV1,
} from './episode_01_session_18_task_feedback_v1';
import { esEpisode01Session01FeedbackByTarget } from './es_episode_01_session_01_task_feedback_v1';
import { learningV2NewWordCardEditorialV1 } from './learning_v2_new_word_card_editorial_v1';
import { esLearningV2NewWordCardEditorialV1 } from './es_learning_v2_new_word_card_editorial_v1';
import { learningV2ModeNativeAudioTargetIdsV1 } from '../../contracts/mode_native_payload_v1';

/**
 * Соль для криптографического обязательства ответа. Контракт требует ровно
 * 64 шестнадцатеричных знака.
 *
 * зачем детерминированная, а не случайная: публикация обязана быть
 * воспроизводимой — один и тот же контент даёт один и тот же релиз. Случайная
 * соль меняла бы отпечаток при каждом запуске, и система идемпотентности
 * считала бы неизменный курс новым релизом на каждой публикации.
 */
function saltFor(seed: string): string {
  return sha256Utf8(`capsule-salt\n${seed}`);
}

/**
 * Превращает вариант ответа в choice_token: локальный оценщик требует
 * `^[a-z0-9][a-z0-9._:-]{0,159}$` — без пробелов и заглавных букв.
 *
 * зачем не хешируем, а нормализуем читаемо: токен участвует в отладке
 * (видно в логах при расхождении), а хеш от исходного ответа уже добавляет
 * соль внутри createV2LocalEvaluatorCommitmentV1 — двойное хеширование тут
 * не нужно, нужна только устойчивая по форме строка.
 */
function toChoiceToken(answer: string): string {
  const cleaned = answer
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.length > 0 ? cleaned.slice(0, 160) : 'blank';
}

/** Как называется задание в приложении — по назначению карточки в сессии. */
const FAMILY_INPUT_MODE = Object.freeze({
  phrase_builder: 'ordered_tokens',
  listen_choose: 'single_choice',
  sound_contrast: 'single_choice',
  listen_build_dictation: 'ordered_tokens',
  context_gap_grammar: 'single_choice',
  speed_match: 'single_choice',
  scripted_repeat_compare: 'scripted_speech',
} as const);

type SupportedFamily = keyof typeof FAMILY_INPUT_MODE;

/**
 * Назначение карточки в шарде и в рантайме называется по-разному.
 *
 * зачем: автор пишет delayed_review — «вернуть пройденное после задержки».
 * Рантайм ту же роль зовёт interleaved_review. Пока сопоставления не было,
 * пакет отвергался целиком, а причина выглядела как невнятный сбой проверки.
 * Сопоставляем явно: молчаливая подмена на соседнее назначение изменила бы
 * учебный смысл карточки.
 */
const PURPOSE_IN_RUNTIME = Object.freeze({
  supported_practice: 'supported_practice',
  guided_practice: 'guided_practice',
  retrieval_practice: 'retrieval_practice',
  near_transfer: 'near_transfer',
  independent_check: 'independent_check',
  delayed_review: 'interleaved_review',
} as const);

function purposeFor(purpose: string): string {
  const mapped =
    PURPOSE_IN_RUNTIME[purpose as keyof typeof PURPOSE_IN_RUNTIME];
  if (!mapped) throw new Error(`session_package_unsupported_purpose:${purpose}`);
  return mapped;
}

function inputModeFor(
  family: string,
  modeNative: boolean,
): 'ordered_tokens' | 'single_choice' | 'scripted_speech' | 'pair_grid' | 'tap_record_compare' {
  // зачем: незнакомое семейство не должно молча стать выбором из вариантов —
  // человек получил бы не то задание. Падаем, чтобы это увидели при сборке.
  const mode = FAMILY_INPUT_MODE[family as SupportedFamily];
  if (!mode) throw new Error(`session_package_unsupported_family:${family}`);
  if (modeNative && family === 'speed_match') return 'pair_grid';
  if (modeNative && family === 'scripted_repeat_compare') return 'tap_record_compare';
  return mode;
}

type LearnerResponseOption = Readonly<{ responseId: string; text: string }>;
type LearnerTaskProjection = Readonly<{
  prompt: string;
  responseOptions: readonly LearnerResponseOption[];
  feedbackByResponseId: Readonly<Record<string, string>>;
}>;

function modeNativeFeedbackByResponseId(
  card: LearningV2GeneratedSessionCardV1,
  locale: LearningV2InterfaceLocale,
): Readonly<Record<string, string>> {
  const payload = card.modePayload;
  if (
    !payload ||
    payload.family === 'phrase_builder' ||
    payload.family === 'listen_build_dictation' ||
    payload.family === 'speed_match' ||
    payload.family === 'scripted_repeat_compare'
  ) {
    return Object.freeze({});
  }
  const entries = payload.choiceFeedback;
  const wrongEntries = entries.filter((entry) => !entry.correct);
  return Object.freeze(Object.fromEntries(
    wrongEntries.map((entry) => [entry.responseId, entry.feedbackByLocale[locale]]),
  ));
}

function modeNativeLearnerTaskProjection(
  card: LearningV2GeneratedSessionCardV1,
  locale: LearningV2InterfaceLocale,
): LearnerTaskProjection | null {
  const payload = card.modePayload;
  if (!payload) return null;
  const instruction = card.instructionByLocale[locale];
  const feedbackByResponseId = modeNativeFeedbackByResponseId(card, locale);
  if (payload.family === 'phrase_builder') {
    return {
      // Instruction and the material being manipulated are separate semantic
      // layers in the mode renderer. Concatenating them made both look like one
      // oversized sentence and hid where the task ended.
      prompt: instruction,
      responseOptions: [
        ...payload.orderedTokens.map((text, index) => ({
          responseId: `${card.cardId}:token:${index + 1}`,
          text,
        })),
        ...payload.authoredDistractorTokens.slice(0, Math.max(0, 8 - payload.orderedTokens.length)).map(
          (text, index) => ({ responseId: `${card.cardId}:trap:${index + 1}`, text }),
        ),
      ],
      feedbackByResponseId,
    };
  }
  if (payload.family === 'listen_choose') {
    return {
      prompt: instruction,
      responseOptions: payload.localizedMeaningChoices.map((choice) => ({
        responseId: choice.responseId,
        text: choice.meaningByLocale?.[locale] ?? choice.targetText,
      })),
      feedbackByResponseId,
    };
  }
  if (payload.family === 'listen_build_dictation') {
    return {
      prompt: instruction,
      responseOptions: [
        ...payload.orderedTokens.map((text, index) => ({
          responseId: `${card.cardId}:token:${index + 1}`,
          text,
        })),
        ...payload.authoredDistractorTokens.slice(0, Math.max(0, 8 - payload.orderedTokens.length)).map(
          (text, index) => ({ responseId: `${card.cardId}:trap:${index + 1}`, text }),
        ),
      ],
      feedbackByResponseId,
    };
  }
  if (payload.family === 'context_gap_grammar') {
    return {
      prompt: `${instruction} ${payload.localizedScene[locale]} — ${payload.gappedTargetPhrase}`,
      responseOptions: payload.gapOptions,
      feedbackByResponseId,
    };
  }
  if (payload.family === 'speed_match') {
    return { prompt: instruction, responseOptions: [], feedbackByResponseId };
  }
  if (payload.family === 'scripted_repeat_compare') {
    // The native repeat renderer owns the large target layer. Keeping the
    // target out of the instruction prevents "... HAPPY" from appearing twice.
    return { prompt: instruction, responseOptions: [], feedbackByResponseId };
  }
  if (payload.family === 'sound_contrast') {
    if (payload.choiceFeedback.length !== 2) {
      throw new Error(`session_package_sound_contrast_feedback_invalid:${card.cardId}`);
    }
    return {
      prompt: instruction,
      responseOptions: [
        { responseId: payload.choiceFeedback[0]!.responseId, text: payload.contrastA },
        { responseId: payload.choiceFeedback[1]!.responseId, text: payload.contrastB },
      ],
      feedbackByResponseId,
    };
  }
  return null;
}

function modeNativeAcceptedResponses(
  card: LearningV2GeneratedSessionCardV1,
): readonly string[] | null {
  const payload = card.modePayload;
  if (!payload) return null;
  if (
    payload.family === 'listen_choose' ||
    payload.family === 'context_gap_grammar' ||
    payload.family === 'sound_contrast'
  ) {
    const feedback = payload.choiceFeedback.find((entry) => entry.correct);
    if (!feedback) {
      throw new Error(`session_package_mode_native_correct_response_missing:${card.cardId}`);
    }
    return [feedback.responseId];
  }
  if (payload.family === 'speed_match') return ['all_pairs_matched'];
  if (payload.family === 'phrase_builder') return [payload.targetPhrase];
  if (payload.family === 'listen_build_dictation') return [payload.hiddenTargetPhrase];
  if (payload.family === 'scripted_repeat_compare') return [payload.targetPhrase];
  return null;
}

function targetTokens(card: LearningV2GeneratedSessionCardV1): readonly string[] {
  return card.contentItem.target.text
    .replace(/[?.!,]/gu, '')
    .split(/\s+/u)
    .filter(Boolean);
}

function targetTiles(card: LearningV2GeneratedSessionCardV1): readonly string[] {
  const tokens = targetTokens(card);
  if (tokens.length <= 8) return tokens;
  // Learner-child schema allows at most eight selectable options. Preserve the
  // whole utterance by joining only the leading fixed chunk; the remaining
  // words stay independently movable and the selected tiles still reconstruct
  // the exact evaluator answer.
  return [tokens.slice(0, tokens.length - 7).join(' '), ...tokens.slice(tokens.length - 7)];
}

function learnerMeaning(
  card: LearningV2GeneratedSessionCardV1,
  interfaceLocale: string,
): string {
  return (
    card.contentItem.learnerMeanings.find(
      (meaning) => meaning.locale === interfaceLocale,
    )?.value ?? card.contentItem.learnerMeanings[0]?.value ?? card.contentItem.target.text
  );
}

function singleChoiceOptions(
  card: LearningV2GeneratedSessionCardV1,
  correctText: string,
  distractors: readonly Readonly<{ text: string; feedback: string }>[],
  caseSensitive = false,
): Pick<LearnerTaskProjection, 'responseOptions' | 'feedbackByResponseId'> {
  const choiceKey = (value: string): string => {
    const exact = value.normalize('NFKC').trim();
    return caseSensitive ? exact : exact.toLowerCase();
  };
  const candidates = [
    { text: correctText, feedback: null },
    ...distractors,
  ].filter((candidate, index, all) =>
    all.findIndex(
      (item) => choiceKey(item.text) === choiceKey(candidate.text),
    ) === index,
  ).slice(0, 3);
  if (candidates.length !== 3) {
    throw new Error(`session_package_response_options_insufficient:${card.cardId}`);
  }
  const responseOptions = candidates.map((candidate, index) => ({
    responseId:
      index === 0
        ? toChoiceToken(card.contentItem.target.text)
        : `${card.cardId}:wrong:${index}`,
    text: candidate.text,
  }));
  return {
    responseOptions,
    feedbackByResponseId: Object.freeze(Object.fromEntries(
      responseOptions.flatMap((option, index) => {
        const feedback = candidates[index]?.feedback;
        return feedback ? [[option.responseId, feedback]] : [];
      }),
    )),
  };
}

function normalizedToken(value: string): string {
  return value.normalize('NFKC').replace(/[’]/gu, "'").toLowerCase();
}

/** Локали, на которых написаны авторские подсказки сессий 12-14. */
const AUTHORED_FEEDBACK_LOCALES = [
  'ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl',
] as const;
type AuthoredFeedbackLocale = (typeof AUTHORED_FEEDBACK_LOCALES)[number];

function sameLanguageEnglishFeedback(
  card: LearningV2GeneratedSessionCardV1,
  wrongValue: string,
  correctValue: string,
): string {
  const target = card.contentItem.target.text;
  const correct = normalizedToken(correctValue);
  if (['at', 'in', 'on', 'to'].includes(correct)) {
    return `“${wrongValue}” points to a different relationship with the place. In “${target}”, the exact location phrase uses “${correctValue}”.`;
  }
  if (['am', 'is', 'are', "i'm", "you're"].includes(correct)) {
    return `“${wrongValue}” does not match the subject in “${target}”. This sentence needs the form “${correctValue}”.`;
  }
  return `“${wrongValue}” changes the form or meaning of “${target}”. The word required in this position is “${correctValue}”.`;
}

function embeddedAuthoredDistractorFeedback(
  card: LearningV2GeneratedSessionCardV1,
  wrongValue: string,
  locale: LearningV2InterfaceLocale,
): string | undefined {
  const rejected = card.contentItem.rejectedAnswers.find(
    (answer) => normalizedToken(answer.value) === normalizedToken(wrongValue),
  );
  if (!rejected) return undefined;
  const copy = (card.errorExplanationByLocale as Record<string, string>)[locale] ?? '';
  const marker = `${rejected.value} — `;
  const copyKey = copy.toLocaleLowerCase();
  const start = copyKey.indexOf(marker.toLocaleLowerCase());
  if (start < 0) return undefined;
  const bodyStart = start + marker.length;
  const next = card.contentItem.rejectedAnswers
    .filter((answer) => answer !== rejected)
    .map((answer) => copyKey.indexOf(` ${answer.value} — `.toLocaleLowerCase(), bodyStart))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];
  const feedback = copy.slice(bodyStart, next ?? copy.length).trim();
  return feedback || undefined;
}

function authoredDistractorFeedback(
  card: LearningV2GeneratedSessionCardV1,
  wrongValue: string,
  locale: LearningV2InterfaceLocale,
  correctHint?: string,
): string {
  // зачем: авторские подсказки сессий 12-14 написаны на восьми языках интерфейса.
  // После добавления 'en' в LearningV2InterfaceLocale вызовы перестали проходить
  // по типам и роняли сборку functions. Для английского интерфейса этих подсказок
  // просто нет — сужаем локаль явной проверкой и уходим в общий путь ниже, а не
  // подставляем русский текст молча.
  const authoredLocale = AUTHORED_FEEDBACK_LOCALES.includes(
    locale as AuthoredFeedbackLocale,
  )
    ? (locale as AuthoredFeedbackLocale)
    : null;
  const session17 = authoredLocale && card.cardId.includes('episode-01-s17-')
    ? episode01Session17TaskFeedbackV1(authoredLocale, card.contentItem.target.text, wrongValue)
    : undefined;
  if (session17) return session17;
  const session18 = authoredLocale && card.cardId.includes('episode-01-s18-')
    ? episode01Session18TaskFeedbackV1(authoredLocale, card.contentItem.target.text, wrongValue)
    : undefined;
  if (session18) return session18;
  const session16 = authoredLocale && card.cardId.includes('episode-01-s16-')
    ? episode01Session16TaskFeedbackV1(authoredLocale, card.contentItem.target.text, wrongValue)
    : undefined;
  if (session16) return session16;
  const session12 = authoredLocale && card.cardId.includes('episode-01-s12-')
    ? episode01Session12FormFeedbackV1(authoredLocale, card.contentItem.target.text, wrongValue)
    : undefined;
  if (session12) return session12;
  const session13 = authoredLocale && card.cardId.includes('episode-01-s13-')
    ? episode01Session13FormFeedbackV1(authoredLocale, card.contentItem.target.text, wrongValue)
    : undefined;
  if (session13) return session13;
  const session14 = authoredLocale && card.cardId.includes('episode-01-s14-')
    ? episode01Session14FormFeedbackV1(authoredLocale, card.contentItem.target.text, wrongValue)
    : undefined;
  if (session14) return session14;
  const session15 = authoredLocale && card.cardId.includes('episode-01-s15-')
    ? episode01Session15FormFeedbackV1(authoredLocale, card.contentItem.target.text, wrongValue)
    : undefined;
  if (session15) return session15;
  // зачем target.locale === 'es', а не card.cardId (владелец, 2026-08-23,
  // правило 8-bis СТАРТ ES.md): episodeId испанского и английского курса
  // совпадает буквально (оба episode-01, episodeOrdinal тоже 1) — cardId
  // испанской и английской сессии 1 идентичны по строке. target.locale
  // приходит из targetLanguage самого SessionSource и однозначно различает
  // курсы без риска коллизии. Разбор написан вручную на 9 языках, лежит в
  // ES_SESSION_01_LOCALIZED_DETAILS — тот же паттерн, что сессии 12-15,
  // только источник другой (испанский контур, не английский).
  const esSession01 = card.contentItem.target.locale === 'es'
    ? esEpisode01Session01FeedbackByTarget(locale, card.contentItem.target.text, wrongValue)
    : undefined;
  if (esSession01) return esSession01;
  const embeddedAuthored = embeddedAuthoredDistractorFeedback(
    card,
    wrongValue,
    locale,
  );
  if (embeddedAuthored) return embeddedAuthored;
  const rejected = card.contentItem.rejectedAnswers.find(
    (answer) => normalizedToken(answer.value) === normalizedToken(wrongValue),
  );
  const [, storedCorrect = ''] = rejected?.reasonCode.split(':') ?? [];
  const correctToken = correctHint ?? storedCorrect;
  if (locale === 'en' && correctToken) {
    return sameLanguageEnglishFeedback(card, wrongValue, correctToken);
  }
  const authored = correctToken
      ? lesson1DistractorChoicesV2(
        locale,
        correctToken,
        card.contentItem.target.text,
        Number(card.cardId.match(/-s(\d+)-/u)?.[1] ?? 0),
      ).find(
        (choice) => normalizedToken(choice.value) === normalizedToken(wrongValue),
      )
    : undefined;
  if (!authored) {
    throw new Error(
      `session_package_distractor_feedback_missing:${card.cardId}:${correctToken}:${wrongValue}:${locale}`,
    );
  }
  return authored.reason;
}

function semanticChoiceFeedback(
  locale: LearningV2InterfaceLocale,
  correctCard: LearningV2GeneratedSessionCardV1,
  wrongCard: LearningV2GeneratedSessionCardV1,
): string {
  const correctMeaning = learnerMeaning(correctCard, locale);
  const wrongMeaning = learnerMeaning(wrongCard, locale);
  const correct = correctCard.contentItem.target.text;
  const wrong = wrongCard.contentItem.target.text;
  // Те же авторские подсказки на восьми языках — см. authoredDistractorFeedback.
  const authoredLocale = AUTHORED_FEEDBACK_LOCALES.includes(
    locale as AuthoredFeedbackLocale,
  )
    ? (locale as AuthoredFeedbackLocale)
    : null;
  const session17 = authoredLocale && correctCard.cardId.includes('episode-01-s17-')
    ? episode01Session17TaskFeedbackV1(authoredLocale, correct, wrong)
    : undefined;
  if (session17) return session17;
  const session18 = authoredLocale && correctCard.cardId.includes('episode-01-s18-')
    ? episode01Session18TaskFeedbackV1(authoredLocale, correct, wrong)
    : undefined;
  if (session18) return session18;
  const session12 = authoredLocale ? episode01Session12ListenFeedbackV1(authoredLocale, correct, wrong) : undefined;
  if (session12) return session12;
  const session13 = authoredLocale ? episode01Session13ListenFeedbackV1(authoredLocale, correct, wrong) : undefined;
  if (session13) return session13;
  const session14 = authoredLocale ? episode01Session14ListenFeedbackV1(authoredLocale, correct, wrong) : undefined;
  if (session14) return session14;
  const session15 = authoredLocale ? episode01Session15ChoiceFeedbackV1(authoredLocale, correct, wrong) : undefined;
  if (session15) return session15;
  const copy: Record<LearningV2InterfaceLocale, string> = {
    ru: `«${wrong}» значит «${wrongMeaning}». Здесь нужно «${correct}» — «${correctMeaning}»: тема близкая, но изменившееся слово даёт другой ответ.`,
    uk: `«${wrong}» означає «${wrongMeaning}». Тут потрібно «${correct}» — «${correctMeaning}»: тема близька, але змінене слово дає іншу відповідь.`,
    es: `«${wrong}» significa «${wrongMeaning}». Aquí corresponde «${correct}» — «${correctMeaning}»: el tema es cercano, pero la palabra distinta cambia la respuesta.`,
    'pt-BR': `«${wrong}» significa «${wrongMeaning}». Aqui cabe «${correct}» — «${correctMeaning}»: o tema é próximo, mas a palavra diferente muda a resposta.`,
    vi: `“${wrong}” nghĩa là “${wrongMeaning}”. Ở đây cần “${correct}” — “${correctMeaning}”: chủ đề gần nhau nhưng từ khác làm đáp án đổi.`,
    id: `“${wrong}” berarti “${wrongMeaning}”. Di sini yang tepat “${correct}” — “${correctMeaning}”: topiknya dekat, tetapi kata yang berbeda mengubah jawaban.`,
    tr: `«${wrong}», «${wrongMeaning}» demektir. Burada «${correct}» — «${correctMeaning}» gerekir: konu yakındır, fakat değişen sözcük cevabı değiştirir.`,
    pl: `„${wrong}” znaczy „${wrongMeaning}”. Tutaj trzeba „${correct}” — „${correctMeaning}”: temat jest bliski, lecz inne słowo zmienia odpowiedź.`,
    // Английский интерфейс при изучении английского — вырожденная пара, но
    // Record требует полноты; текст общий, не авторский.
    en: `“${wrong}” means “${wrongMeaning}”. The right one here is “${correct}” — “${correctMeaning}”: the topic is close, but the changed word gives a different answer.`,
  };
  return copy[locale];
}

function taskDistractorSelection(card: LearningV2GeneratedSessionCardV1) {
  const session17 = card.cardId.includes('episode-01-s17-')
    ? episode01Session17TaskSelectionV1(card.family, card.contentItem.target.text)
    : undefined;
  if (session17) return session17;
  const session18 = card.cardId.includes('episode-01-s18-')
    ? episode01Session18TaskSelectionV1(card.family, card.contentItem.target.text)
    : undefined;
  if (session18) return session18;
  const session16 = card.cardId.includes('episode-01-s16-')
    ? episode01Session16TaskSelectionV1(card.family, card.contentItem.target.text)
    : undefined;
  if (session16) return session16;
  return selectTaskDistractors({
    family: card.family,
    target: card.contentItem.target.text,
    rejectedAnswers: card.contentItem.rejectedAnswers,
    sessionOrdinal: Number(card.cardId.match(/-s(\d+)-/u)?.[1] ?? 0),
  });
}

function grammarGap(card: LearningV2GeneratedSessionCardV1): Readonly<{
  prompt: string;
  correct: string;
  distractors: readonly string[];
}> {
  const tokens = targetTokens(card);
  const selection = taskDistractorSelection(card);
  const resolvedIndex = tokens.findIndex(
    (token) => normalizedToken(token) === normalizedToken(selection.correct),
  );
  if (resolvedIndex < 0)
    throw new Error(`session_package_grammar_gap_focus_missing:${card.cardId}`);
  return {
    prompt: tokens
      .map((token, index) => (index === resolvedIndex ? '____' : token))
      .join(' '),
    correct: selection.correct,
    distractors: selection.distractors.map((item) => item.sourceValue),
  };
}

function learnerTaskProjection(
  card: LearningV2GeneratedSessionCardV1,
  practiceCards: readonly LearningV2GeneratedSessionCardV1[],
  interfaceLocale: string,
  allowUnavailableAuthoredChoiceTargets = false,
): LearnerTaskProjection {
  const locale = interfaceLocale as LearningV2InterfaceLocale;
  const modeNativeProjection = modeNativeLearnerTaskProjection(card, locale);
  if (modeNativeProjection) return modeNativeProjection;
  const instruction =
    (card.instructionByLocale as Record<string, string>)[interfaceLocale] ?? '';
  const meaning = learnerMeaning(card, interfaceLocale);
  const vocabularyContact =
    targetTokens(card).length === 1 &&
    card.contentItem.rejectedAnswers.length >= 2 &&
    card.contentItem.rejectedAnswers.every(
      (answer) => answer.reasonCode.split(':').length >= 4,
    );
  const desiredChoiceTargets = card.cardId.includes('episode-01-s17-')
    ? episode01Session17ChoiceTargetsV1(card.contentItem.target.text)
    : card.cardId.includes('episode-01-s18-')
      ? episode01Session18ChoiceTargetsV1(card.contentItem.target.text)
    : card.cardId.includes('episode-01-s15-')
      ? episode01Session15ChoiceTargetsV1(card.contentItem.target.text)
      : undefined;
  const authoredChoiceCards = desiredChoiceTargets
    ? desiredChoiceTargets.map((target) => {
        const candidate = practiceCards.find(
          (entry) => entry.contentItem.target.text === target,
        );
        if (!candidate && !allowUnavailableAuthoredChoiceTargets) {
          throw new Error(`authored_choice_target_missing:${card.cardId}:${target}`);
        }
        return candidate;
      }).filter(
        (candidate): candidate is LearningV2GeneratedSessionCardV1 =>
          candidate !== undefined,
      )
    : [];
  const otherCards = authoredChoiceCards.length === desiredChoiceTargets?.length
    ? authoredChoiceCards
    : practiceCards.filter((candidate) => candidate.cardId !== card.cardId);

  if (card.family === 'phrase_builder' || card.family === 'listen_build_dictation') {
    const tiles = targetTiles(card);
    const selection = taskDistractorSelection(card);
    const trapValues = selection.distractors
      .map((item) => item.sourceValue)
      .slice(0, Math.min(2, Math.max(0, 8 - tiles.length)));
    const trapOptions = trapValues.map((text, index) => ({
      responseId: `${card.cardId}:wrong-builder:${index + 1}`,
      text,
    }));
    return {
      prompt: `${instruction} ${meaning}`,
      responseOptions: [
        ...tiles.map((text, index) => ({
          responseId: `${card.cardId}:token:${index + 1}`,
          text,
        })),
        ...trapOptions,
      ],
      feedbackByResponseId: Object.freeze(Object.fromEntries(
        trapOptions.map((option) => [
          option.responseId,
          authoredDistractorFeedback(card, option.text, locale, selection.correct),
        ]),
      )),
    };
  }
  if (card.family === 'listen_choose') {
    if (vocabularyContact) {
      const choices = singleChoiceOptions(
        card,
        card.contentItem.target.text,
        card.contentItem.rejectedAnswers.map((answer) => ({
          text: answer.value,
          feedback: authoredDistractorFeedback(
            card,
            answer.value,
            locale,
            card.contentItem.target.text,
          ),
        })),
        true,
      );
      return { prompt: instruction, ...choices };
    }
    if (
      card.cardId.includes('episode-01-s02-') ||
      card.cardId.includes('episode-01-s03-') ||
      card.cardId.includes('episode-01-s04-')
    ) {
      const selection = taskDistractorSelection(card);
      const choices = singleChoiceOptions(
        card,
        card.contentItem.target.text,
        selection.distractors.map((item) => ({
          text: item.value,
          feedback: authoredDistractorFeedback(
            card,
            item.sourceValue,
            locale,
            selection.correct,
          ),
        })),
      );
      return { prompt: instruction, ...choices };
    }
    const choices = singleChoiceOptions(
      card,
      meaning,
      otherCards.map((candidate) => ({
        text: learnerMeaning(candidate, interfaceLocale),
        feedback: semanticChoiceFeedback(locale, card, candidate),
      })),
    );
    return {
      prompt: instruction,
      ...choices,
    };
  }
  if (card.family === 'context_gap_grammar') {
    if (vocabularyContact) {
      const choices = singleChoiceOptions(
        card,
        card.contentItem.target.text,
        card.contentItem.rejectedAnswers.map((answer) => ({
          text: answer.value,
          feedback: authoredDistractorFeedback(
            card,
            answer.value,
            locale,
            card.contentItem.target.text,
          ),
        })),
        true,
      );
      return { prompt: `${instruction} ${meaning}`, ...choices };
    }
    const gap = grammarGap(card);
    const choices = singleChoiceOptions(
      card,
      gap.correct,
      gap.distractors.map((text) => ({
        text,
        feedback: authoredDistractorFeedback(card, text, locale, gap.correct),
      })),
    );
    return {
      prompt: `${instruction} ${meaning} — ${gap.prompt}`,
      ...choices,
    };
  }
  if (card.family === 'sound_contrast') {
    const choices = singleChoiceOptions(
      card,
      card.contentItem.target.text,
      otherCards.map((candidate) => ({
        text: candidate.contentItem.target.text,
        feedback: semanticChoiceFeedback(locale, card, candidate),
      })),
    );
    return {
      prompt: instruction,
      ...choices,
    };
  }
  if (card.family === 'speed_match') {
    const selection = taskDistractorSelection(card);
    const choices = singleChoiceOptions(
      card,
      card.contentItem.target.text,
      selection.distractors.map((item) => ({
        text: item.value,
        feedback: authoredDistractorFeedback(
          card,
          item.sourceValue,
          locale,
          selection.correct,
        ),
      })),
    );
    return {
      prompt: `${instruction} ${meaning}`,
      ...choices,
    };
  }
  if (card.family === 'scripted_repeat_compare') {
    return {
      prompt: `${instruction} ${card.contentItem.target.text}`,
      responseOptions: [],
      feedbackByResponseId: {},
    };
  }
  throw new Error(`session_package_unsupported_family:${card.family}`);
}

function localizedResponseFeedback(
  card: LearningV2GeneratedSessionCardV1,
  practiceCards: readonly LearningV2GeneratedSessionCardV1[],
  allowUnavailableAuthoredChoiceTargets = false,
): Readonly<Record<string, Readonly<Record<LearningV2InterfaceLocale, string>>>> {
  const byLocale = Object.fromEntries(
    LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
      locale,
      learnerTaskProjection(
        card,
        practiceCards,
        locale,
        allowUnavailableAuthoredChoiceTargets,
      ).feedbackByResponseId,
    ]),
  ) as Record<LearningV2InterfaceLocale, Readonly<Record<string, string>>>;
  const responseIds = [...new Set(
    LEARNING_V2_INTERFACE_LOCALES.flatMap((locale) =>
      Object.keys(byLocale[locale]),
    ),
  )];
  return Object.freeze(Object.fromEntries(responseIds.map((responseId) => [
    responseId,
    Object.freeze(Object.fromEntries(
      LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
        locale,
        byLocale[locale][responseId] ?? '',
      ]),
    )) as Readonly<Record<LearningV2InterfaceLocale, string>>,
  ])));
}

/**
 * Собирает пять детей пакета из написанного шарда.
 *
 * Отпечатки считают сами сборщики рантайма — здесь только раскладка данных по
 * их местам. Это важно: если бы отпечатки считались тут, они разошлись бы с
 * тем, что ждёт сервер, и релиз отвергался бы целиком.
 *
 * зачем courseSessionId — отдельный параметр, а не shard.sessionId (инцидент
 * 2026-08-17): шард нумерует сессию по-своему (session-episode-01-01), а
 * топология курса и клиент ждут канонический id (lesson-01:session:01).
 * Публикатор раньше подставлял канонический id только в индекс релиза
 * СНАРУЖИ, а внутрь пяти детей уезжал старый — клиентская проверка
 * introChild.courseSessionId !== expectedSessionId должна была отвергать
 * КАЖДУЮ опубликованную сессию, просто до неё ни разу не дошла живая
 * проверка. Теперь id — один, приходит от вызывающей стороны (топологии),
 * и утечь в двух местах по-разному больше не может.
 */
export function buildSessionChildBodiesFromShard(
  shard: LearningV2GeneratedSessionShardV1,
  interfaceLocale: string,
  courseSessionId: string,
  options?: Readonly<{
    /** DEV review only: keep stale drafts playable without weakening release gates. */
    allowUnavailableAuthoredChoiceTargets?: boolean;
  }>,
): Readonly<{
  intro: unknown;
  learner: unknown;
  evaluatorCapsule: unknown;
  evaluatorSidecar: unknown;
  auxiliary: unknown;
}> {
  const locale = interfaceLocale as never;

  // Интро: три страницы, у каждой свой вопрос внизу.
  //
  // зачем: правильный ответ и разбор СЮДА НЕ КЛАДЁМ. Этот файл уезжает на
  // телефон, и correctChoiceIndex внутри означал бы, что ответы можно достать
  // из трафика. Они живут в капсуле оценщика, которая остаётся на сервере.
  const intro = materializeLearningV2CourseSessionIntroChildV1({
    courseSessionId,
    learningOutcomeByLocale: shard.intro.learningGoalByLocale as never,
    pages: shard.intro.pages.map((page) => ({
      pageOrdinal: page.pageOrdinal,
      pageId: page.pageId,
      kind: page.kind,
      titleByLocale: page.titleByLocale as never,
      bodyByLocale: page.bodyByLocale as never,
      ...(page.bodyRunsByLocale
        ? { bodyRunsByLocale: page.bodyRunsByLocale }
        : {}),
      question: {
        interactionId: page.question.questionId,
        promptByLocale: page.question.promptByLocale as never,
        choicesByLocale: page.question.choicesByLocale as never,
        accessibilityLabelByLocale: page.question.promptByLocale as never,
      },
    })) as never,
  } as never);

  // Практика начинается со слота 4: слоты 1–3 заняты вопросами интро.
  const practiceCards = shard.cards.filter((card) => card.taskSlot >= 4);
  const choiceCards = shard.requiredSessionOrdinal === 15
    ? shard.cards
    : practiceCards;
  const cardTargets = shard.cards.map((card) => card.contentItem.target.text);
  const isFourWordModeNative =
    shard.modeNativePlanId === LESSON1_SESSION_01_MODE_NATIVE_PLAN_ID_V1 ||
    shard.modeNativePlanId === LESSON1_SESSION_02_MODE_NATIVE_PLAN_ID_V1;
  const vocabularyCount = isFourWordModeNative
    ? 4
    : inferLesson1WordFirstVocabularyCountV1(cardTargets);
  const phraseCount = shard.modeNativePlanId === LESSON1_SESSION_01_MODE_NATIVE_PLAN_ID_V1
    ? 2
    : shard.modeNativePlanId === LESSON1_SESSION_02_MODE_NATIVE_PLAN_ID_V1
    ? 4
    : inferLesson1WordFirstPhraseCountV1(cardTargets, vocabularyCount);
  const choreography = lesson1SessionChoreographyV1(
    shard.requiredSessionOrdinal,
    undefined,
    vocabularyCount,
    phraseCount,
    shard.modeNativePlanId ?? undefined,
  );
  const learner = materializeLearningV2CourseSessionLearnerChildV1({
    courseSessionId,
    targetLanguage: shard.targetLanguage,
    interactionProfile: choreography.interactionProfile,
    interactions: practiceCards.map((card, index) => {
      const task = learnerTaskProjection(
        card,
        choiceCards,
        interfaceLocale,
        options?.allowUnavailableAuthoredChoiceTargets === true,
      );
      const speedMatchMeanings = card.modePayload?.family === 'speed_match'
        ? card.modePayload.pairGrid.map((pair) => pair.meaningByLocale[locale]).join(' · ')
        : null;
      const speedMatchTargets = card.modePayload?.family === 'speed_match'
        ? card.modePayload.pairGrid.map((pair) => pair.target).join(' · ')
        : null;
      return {
        interactionId: card.cardId,
        ordinal: index + 4,
        purpose: purposeFor(card.purpose),
        family: card.family,
        inputMode: inputModeFor(card.family, card.modePayload !== null),
        prompt: task.prompt,
        responseOptions: task.responseOptions,
        mediaIds: [],
        audioTargetIds: card.modePayload
          ? learningV2ModeNativeAudioTargetIdsV1(card.modePayload)
          : [],
        modePayload: card.modePayload,
        accessibilityLabel: speedMatchMeanings && speedMatchTargets
          ? `${speedMatchTargets}. ${speedMatchMeanings}.`
          : (card.accessibilityLabelByLocale as Record<string, string>)[locale] ?? '',
        // зачем: запасной текстовый путь для голосового задания. Оба флага
        // строго false — иначе голосовое упражнение можно было бы «сдать»
        // текстом и получить за это награду как за произнесённое вслух.
        scriptedAlternate: {
          alternateId: `${card.cardId}:alt`,
          instruction: speedMatchMeanings
            ?? (card.hintByLocale as Record<string, string>)[locale]
            ?? '',
          voiceEvidenceEquivalent: false,
          canAward: false,
        },
      };
    }) as never,
  } as never);

  // Правильные ответы: остаются на сервере и клиенту не уезжают.
  //
  // Сюда же переезжают ответы на вопросы интро — в самом интро их быть не
  // должно, иначе их видно в трафике.
  // зачем (инцидент 2026-08-17): капсула СЛЕПЛИВАЛАСЬ ВРУЧНУЮ объектом с
  // полями answers/introAnswers — единственный ребёнок, который я собирал не
  // каноническим строителем. Контракт ждёт совсем другое: entries, entryCount
  // и восемь полей полномочий, плюс криптографические обязательства вместо
  // открытых ответов. Чтение падало с
  // learning_v2_course_session_evaluator_capsule_child_invalid.
  //
  // Строитель сам считает обязательства и хеши: открытый правильный ответ в
  // файл не попадает даже здесь, на сервере — сверка идёт по хешу.
  const capsuleEntries = [
    // Вопросы интро: правильный вариант живёт ТОЛЬКО здесь. В самом интро его
    // быть не должно, иначе ответ виден в трафике.
    //
    // зачем family: 'phrase_builder' (инцидент 2026-08-17): раньше стояло
    // listen_choose → choice_token, но createLearningV2CourseSessionDeviceRunV1
    // ЖЁСТКО требует entries[0..2].inputKind === 'text' для интро — это правило
    // устройства, не зависящее от того, как вопрос показан на экране (там
    // сравнение по индексу выбора). phrase_builder — простейшее семейство,
    // дающее inputKind: 'text'. Расхождение не ловилось раньше, потому что ни
    // один прогон не доходил до createLearningV2CourseSessionDeviceRunV1 —
    // только до отдельной сборки/разбора капсулы саму по себе.
    ...shard.intro.pages.map((page) => ({
      interactionId: page.question.questionId,
      activityId: `activity-intro-${page.pageId}`,
      capsuleId: `capsule-intro-${page.pageId}`,
      family: 'phrase_builder' as never,
      normalizationLocale: shard.targetLanguage,
      salt: saltFor(page.question.questionId),
      acceptedResponses: [
        String(
          (
            page.question.choicesByLocale as Record<
              string,
              readonly string[]
            >
          )[interfaceLocale]?.[page.question.correctChoiceIndex] ?? '',
        ),
      ],
    })),
    ...practiceCards.map((card) => {
      // зачем: семейства с выбором (listen_choose, sound_contrast,
      // context_gap_grammar, speed_match) принимают только choice_token —
      // короткий токен без пробелов; остальные (phrase_builder,
      // listen_build_dictation) принимают свободный текст. Полный текст
      // фразы токен-регэксп не проходит, поэтому для choice_token-семейств
      // берём нормализованный токен, для остальных — сами варианты ответа.
      const inputKind = v2LocalEvaluatorInputKindForFamilyV1(card.family as never);
      const authoredModeResponses = modeNativeAcceptedResponses(card);
      const acceptedResponses = authoredModeResponses ??
        (inputKind === 'choice_token'
          ? card.contentItem.acceptedAnswers.map((answer) => toChoiceToken(answer))
          : card.contentItem.acceptedAnswers);
      return {
        interactionId: card.cardId,
        activityId: card.activityId,
        capsuleId: `capsule-${card.cardId}`,
        family: card.family as never,
        normalizationLocale: shard.targetLanguage,
        salt: saltFor(card.cardId),
        acceptedResponses,
      };
    }),
  ];
  const evaluatorCapsule = materializeLearningV2CourseSessionEvaluatorCapsuleChildV1(
    { courseSessionId, entries: capsuleEntries as never },
  );

  // Разбор ошибок: почему неверный вариант неверен.
  const evaluatorSidecar = {
    schemaVersion: 'learning-v2-course-session-evaluator-sidecar-child.v1',
    courseSessionId,
    introExplanations: shard.intro.pages.map((page) => ({
      interactionId: page.question.questionId,
      explanation:
        (page.question.explanationByLocale as Record<string, string>)[locale] ??
        '',
    })),
    explanations: practiceCards.map((card) => ({
      interactionId: card.cardId,
      errorExplanation:
        (card.errorExplanationByLocale as Record<string, string>)[locale] ?? '',
      retryMessage:
        (card.retryMessageByLocale as Record<string, string>)[locale] ?? '',
    })),
  };

  // Вспомогательное: то, что человек может сделать с карточкой помимо ответа.
  // Здесь живёт сохранение фразы в карточки — та самая кнопка, и голос.
  //
  // зачем интро тоже попадает сюда: контракт объявляет покрытие
  // «каждое взаимодействие интро И практики». Без страниц вступления записей
  // выходит девять, а требуется минимум десять — и весь пакет отвергается.
  // Смысл правила прямой: кнопка сохранения должна быть на каждом экране, а не
  // только там, где есть задание.
  const introCards = shard.cards.filter((card) => card.taskSlot < 4);
  const responseFeedbackByCardId = new Map(
    practiceCards.map((card) => [
      card.cardId,
      localizedResponseFeedback(
        card,
        choiceCards,
        options?.allowUnavailableAuthoredChoiceTargets === true,
      ),
    ]),
  );
  // One lexical item may deliberately receive several different contacts
  // (for example listen → build) before the next word is introduced. The
  // blocking word card belongs only to the first contact with that lexical
  // item; slicing the first `vocabularyCount` cards duplicated early words
  // and silently skipped later ones.
  const newWordOrderByCardId = new Map<string, number>();
  const introducedLexicalItemIds = new Set<string>();
  for (const card of practiceCards) {
    if (introducedLexicalItemIds.size >= vocabularyCount) break;
    const lexicalItemId = card.contentItem.intentId.replace(
      /:contact-\d+$/u,
      '',
    );
    if (lexicalItemId === card.contentItem.intentId) {
      throw new Error(
        `learning_v2_new_word_card_lexical_id_invalid:${card.contentItem.intentId}`,
      );
    }
    if (introducedLexicalItemIds.has(lexicalItemId)) continue;
    introducedLexicalItemIds.add(lexicalItemId);
    newWordOrderByCardId.set(card.cardId, introducedLexicalItemIds.size);
  }
  // зачем interactionId переопределён для интро-карточек (инцидент
  // 2026-08-17): card.cardId (card-episode-01-s01-01) и
  // page.question.questionId (...:intro-q-1) — РАЗНЫЕ строки для одного и
  // того же интро-слота. createLearningV2CourseSessionDeviceRunV1 требует,
  // чтобы интро-порядок совпадал буквально между intro/learner/evaluatorCapsule
  // И auxiliary (sameOrder). Раньше auxiliary брал card.cardId везде — первые
  // три записи расходились с остальными тремя детьми, и пакет отвергался на
  // этой сверке. Не ловилось раньше, потому что ни один прогон не доходил до
  // createLearningV2CourseSessionDeviceRunV1 целиком.
  const auxiliaryEntries = [...introCards, ...practiceCards].map((card) => {
      const introPage = shard.intro.pages.find(
        (page) => page.pageOrdinal === card.taskSlot,
      );
      const interactionId =
        card.taskSlot < 4 && introPage
          ? introPage.question.questionId
          : card.cardId;
      const meaningByLocale = Object.fromEntries(
        card.contentItem.learnerMeanings.map((meaning) => [
          meaning.locale,
          meaning.value,
        ]),
      ) as never;
      const save = materializeLearningV2CourseSessionSavablePhraseV1({
        targetLanguage: shard.targetLanguage,
        targetText: card.contentItem.target.text,
        // Only the translation is learner-safe here; accepted answers stay out.
        meaningByLocale,
      });
      const newWordOrder = newWordOrderByCardId.get(card.cardId);
      let newWordEncounter:
        | LearningV2CourseSessionNewWordEncounterV1
        | undefined;
      if (newWordOrder !== undefined) {
        const lexicalItemId = card.contentItem.intentId.replace(
          /:contact-\d+$/u,
          '',
        );
        if (lexicalItemId === card.contentItem.intentId) {
          throw new Error(
            `learning_v2_new_word_card_lexical_id_invalid:${card.contentItem.intentId}`,
          );
        }
        // зачем испанская ветка отдельным вызовом, а не общей веткой внутри
        // learning_v2_new_word_card_editorial_v1.ts (владелец, HANDOVER_ES.md,
        // 2026-08-24): испанский текст пишется независимо, не как правка
        // английского реестра. esLearningV2NewWordCardEditorialV1 возвращает
        // undefined для незнакомого lexicalItemId (не бросает) — так один и
        // тот же вызов работает для обоих контуров без ветвления по языку тут.
        const editorial =
          shard.targetLanguage === 'es'
            ? esLearningV2NewWordCardEditorialV1({
                targetLanguage: shard.targetLanguage,
                lexicalItemId,
                targetText: card.contentItem.target.text,
              })
            : undefined;
        const resolvedEditorial =
          editorial ??
          learningV2NewWordCardEditorialV1({
            targetLanguage: shard.targetLanguage,
            lexicalItemId,
            targetText: card.contentItem.target.text,
          });
        newWordEncounter = {
          lexicalItemId,
          transcription: resolvedEditorial.transcription,
          playfulMeaningByLocale: resolvedEditorial.playfulMeaningByLocale,
          motionVariant:
            shard.requiredSessionOrdinal === 1 && newWordOrder === 1
              ? ('lesson_hero_b' as const)
              : ('premium_a' as const),
          presentation: 'blocking_task_overlay' as const,
          dismissal: 'continue_only' as const,
          saveControl: 'bookmark_icon' as const,
          orderWithinSession: newWordOrder,
          save,
        };
      }
      return {
        interactionId,
        report: {
          available: true,
          reportContextRef: card.cardId,
          screen: 'learning_v2_session',
        },
        save,
        voice: {
          available: true,
          tapToRecordAllowed: true,
          holdToTalkAllowed: true,
        },
        secondErrorExplanationRef: card.cardId,
        // Exact visible wrong options are explained by responseFeedbackById.
        // Repeating every rejected-answer essay here made rapid sessions exceed
        // the immutable 256 KiB client-child limit (S44 was 301,219 bytes).
        // This fallback is used only when no response id identifies the trap.
        // Intro feedback is the short, manually authored explanation attached
        // to that exact intro question. Never substitute the practice card's
        // aggregate error catalog here: it concatenates every word distractor
        // and turns one small correction into an unrelated wall of text.
        secondErrorExplanationByLocale:
          (card.taskSlot < 4 && introPage
            ? introPage.question.explanationByLocale
            : card.hintByLocale) as never,
        ...(responseFeedbackByCardId.get(card.cardId) &&
        Object.keys(responseFeedbackByCardId.get(card.cardId)!).length > 0
          ? {
              responseFeedbackById:
                responseFeedbackByCardId.get(card.cardId) as never,
            }
          : {}),
        ...(newWordEncounter ? { newWordEncounter } : {}),
      };
    });
  const auxiliaryApproximateBytes = new TextEncoder().encode(
    JSON.stringify({ courseSessionId, entries: auxiliaryEntries }),
  ).length;
  if (auxiliaryApproximateBytes > 250_000) {
    const largestEntries = auxiliaryEntries
      .map((entry) => ({
        id: entry.interactionId,
        bytes: new TextEncoder().encode(JSON.stringify(entry)).length,
        feedbackBytes: new TextEncoder().encode(
          JSON.stringify(entry.responseFeedbackById ?? {}),
        ).length,
      }))
      .sort((left, right) => right.bytes - left.bytes)
      .slice(0, 3);
    throw new Error(
      `session_package_auxiliary_too_large:${shard.requiredSessionOrdinal}:${auxiliaryApproximateBytes}:${largestEntries.map((entry) => `${entry.id}=${entry.bytes}/${entry.feedbackBytes}`).join(',')}`,
    );
  }
  const auxiliary = materializeLearningV2CourseSessionAuxiliaryChildV1({
    courseSessionId,
    entries: auxiliaryEntries as never,
  } as never);

  return Object.freeze({
    intro,
    learner,
    evaluatorCapsule,
    evaluatorSidecar,
    auxiliary,
  });
}
