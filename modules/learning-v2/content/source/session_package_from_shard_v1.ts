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
import { lesson1SessionChoreographyV1 } from './lesson1_session_choreography_v1';
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

function inputModeFor(family: string): 'ordered_tokens' | 'single_choice' | 'scripted_speech' {
  // зачем: незнакомое семейство не должно молча стать выбором из вариантов —
  // человек получил бы не то задание. Падаем, чтобы это увидели при сборке.
  const mode = FAMILY_INPUT_MODE[family as SupportedFamily];
  if (!mode) throw new Error(`session_package_unsupported_family:${family}`);
  return mode;
}

type LearnerResponseOption = Readonly<{ responseId: string; text: string }>;
type LearnerTaskProjection = Readonly<{
  prompt: string;
  responseOptions: readonly LearnerResponseOption[];
  feedbackByResponseId: Readonly<Record<string, string>>;
}>;

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

function distinctText(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.normalize('NFKC').trim().toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function singleChoiceOptions(
  card: LearningV2GeneratedSessionCardV1,
  correctText: string,
  distractors: readonly Readonly<{ text: string; feedback: string }>[],
): Pick<LearnerTaskProjection, 'responseOptions' | 'feedbackByResponseId'> {
  const candidates = [
    { text: correctText, feedback: null },
    ...distractors,
  ].filter((candidate, index, all) =>
    all.findIndex(
      (item) => item.text.normalize('NFKC').trim().toLowerCase() ===
        candidate.text.normalize('NFKC').trim().toLowerCase(),
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
  const rejected = card.contentItem.rejectedAnswers.find(
    (answer) => normalizedToken(answer.value) === normalizedToken(wrongValue),
  );
  const [, storedCorrect = ''] = rejected?.reasonCode.split(':') ?? [];
  const correctToken = correctHint ?? storedCorrect;
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
  const session12 = authoredLocale ? episode01Session12ListenFeedbackV1(authoredLocale, correct, wrong) : undefined;
  if (session12) return session12;
  const session13 = authoredLocale ? episode01Session13ListenFeedbackV1(authoredLocale, correct, wrong) : undefined;
  if (session13) return session13;
  const session14 = authoredLocale ? episode01Session14ListenFeedbackV1(authoredLocale, correct, wrong) : undefined;
  if (session14) return session14;
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

function grammarGap(card: LearningV2GeneratedSessionCardV1): Readonly<{
  prompt: string;
  correct: string;
  distractors: readonly string[];
}> {
  const tokens = targetTokens(card);
  const selection = selectTaskDistractors({
    family: card.family,
    target: card.contentItem.target.text,
    rejectedAnswers: card.contentItem.rejectedAnswers,
    sessionOrdinal: Number(card.cardId.match(/-s(\d+)-/u)?.[1] ?? 0),
  });
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
): LearnerTaskProjection {
  const locale = interfaceLocale as LearningV2InterfaceLocale;
  const instruction =
    (card.instructionByLocale as Record<string, string>)[interfaceLocale] ?? '';
  const meaning = learnerMeaning(card, interfaceLocale);
  const otherCards = practiceCards.filter((candidate) => candidate.cardId !== card.cardId);

  if (card.family === 'phrase_builder' || card.family === 'listen_build_dictation') {
    const tiles = targetTiles(card);
    const selection = selectTaskDistractors({
      family: card.family,
      target: card.contentItem.target.text,
      rejectedAnswers: card.contentItem.rejectedAnswers,
      sessionOrdinal: Number(card.cardId.match(/-s(\d+)-/u)?.[1] ?? 0),
    });
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
    const selection = selectTaskDistractors({
      family: card.family,
      target: card.contentItem.target.text,
      rejectedAnswers: card.contentItem.rejectedAnswers,
      sessionOrdinal: Number(card.cardId.match(/-s(\d+)-/u)?.[1] ?? 0),
    });
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
): Readonly<Record<string, Readonly<Record<LearningV2InterfaceLocale, string>>>> {
  const byLocale = Object.fromEntries(
    LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
      locale,
      learnerTaskProjection(card, practiceCards, locale).feedbackByResponseId,
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
  const choreography = lesson1SessionChoreographyV1(
    shard.requiredSessionOrdinal,
  );
  const learner = materializeLearningV2CourseSessionLearnerChildV1({
    courseSessionId,
    targetLanguage: shard.targetLanguage,
    interactionProfile: choreography.interactionProfile,
    interactions: practiceCards.map((card, index) => {
      const task = learnerTaskProjection(card, practiceCards, interfaceLocale);
      return {
        interactionId: card.cardId,
        ordinal: index + 4,
        purpose: purposeFor(card.purpose),
        family: card.family,
        inputMode: inputModeFor(card.family),
        prompt: task.prompt,
        responseOptions: task.responseOptions,
        mediaIds: [],
        audioTargetIds: [],
        accessibilityLabel:
          (card.accessibilityLabelByLocale as Record<string, string>)[locale] ?? '',
        // зачем: запасной текстовый путь для голосового задания. Оба флага
        // строго false — иначе голосовое упражнение можно было бы «сдать»
        // текстом и получить за это награду как за произнесённое вслух.
        scriptedAlternate: {
          alternateId: `${card.cardId}:alt`,
          instruction:
            (card.hintByLocale as Record<string, string>)[locale] ?? '',
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
      const acceptedResponses =
        inputKind === 'choice_token'
          ? card.contentItem.acceptedAnswers.map((answer) => toChoiceToken(answer))
          : card.contentItem.acceptedAnswers;
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
      localizedResponseFeedback(card, practiceCards),
    ]),
  );
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
      return {
        interactionId,
        report: {
          available: true,
          reportContextRef: card.cardId,
          screen: 'learning_v2_session',
        },
        save: materializeLearningV2CourseSessionSavablePhraseV1({
          targetLanguage: shard.targetLanguage,
          targetText: card.contentItem.target.text,
          // зачем: берём только перевод. acceptedAnswers лежат в том же
          // объекте, и утащить их сюда значило бы отдать правильные ответы на
          // телефон.
          meaningByLocale: Object.fromEntries(
            card.contentItem.learnerMeanings.map((meaning) => [
              meaning.locale,
              meaning.value,
            ]),
          ) as never,
        }),
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
        secondErrorExplanationByLocale:
          (card.taskSlot < 4
            ? card.errorExplanationByLocale
            : card.hintByLocale) as never,
        ...(responseFeedbackByCardId.get(card.cardId) &&
        Object.keys(responseFeedbackByCardId.get(card.cardId)!).length > 0
          ? {
              responseFeedbackById:
                responseFeedbackByCardId.get(card.cardId) as never,
            }
          : {}),
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
