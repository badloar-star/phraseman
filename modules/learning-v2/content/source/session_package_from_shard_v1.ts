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
import type { LearningV2GeneratedSessionShardV1 } from '../generator_session_shard';

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

/**
 * Собирает пять детей пакета из написанного шарда.
 *
 * Отпечатки считают сами сборщики рантайма — здесь только раскладка данных по
 * их местам. Это важно: если бы отпечатки считались тут, они разошлись бы с
 * тем, что ждёт сервер, и релиз отвергался бы целиком.
 */
export function buildSessionChildBodiesFromShard(
  shard: LearningV2GeneratedSessionShardV1,
  interfaceLocale: string,
): Readonly<{
  intro: unknown;
  learner: unknown;
  evaluatorCapsule: unknown;
  evaluatorSidecar: unknown;
  auxiliary: unknown;
}> {
  const locale = interfaceLocale as never;
  const courseSessionId = shard.sessionId;

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
  const learner = materializeLearningV2CourseSessionLearnerChildV1({
    courseSessionId,
    targetLanguage: shard.targetLanguage,
    interactionProfile: 'standard',
    interactions: practiceCards.map((card, index) => ({
      interactionId: card.cardId,
      ordinal: index + 4,
      purpose: purposeFor(card.purpose),
      family: card.family,
      inputMode: inputModeFor(card.family),
      prompt: (card.instructionByLocale as Record<string, string>)[locale] ?? '',
      responseOptions: [],
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
    })) as never,
  } as never);

  // Правильные ответы: остаются на сервере и клиенту не уезжают.
  //
  // Сюда же переезжают ответы на вопросы интро — в самом интро их быть не
  // должно, иначе их видно в трафике.
  const evaluatorCapsule = {
    schemaVersion: 'learning-v2-course-session-evaluator-capsule-child.v1',
    courseSessionId,
    introAnswers: shard.intro.pages.map((page) => ({
      interactionId: page.question.questionId,
      correctChoiceIndex: page.question.correctChoiceIndex,
    })),
    answers: practiceCards.map((card) => ({
      interactionId: card.cardId,
      contentItemId: card.contentItem.contentItemId,
    })),
  };

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
  const auxiliary = materializeLearningV2CourseSessionAuxiliaryChildV1({
    courseSessionId,
    entries: [...introCards, ...practiceCards].map((card) => ({
      interactionId: card.cardId,
      report: {
        available: true,
        reportContextRef: card.cardId,
        screen: 'learning_v2_session',
      },
      save: materializeLearningV2CourseSessionSavablePhraseV1({
        targetLanguage: shard.targetLanguage,
        targetText: card.contentItem.target.text,
        // зачем: берём только перевод. acceptedAnswers лежат в том же объекте,
        // и утащить их сюда значило бы отдать правильные ответы на телефон.
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
      secondErrorExplanationByLocale: card.errorExplanationByLocale as never,
    })) as never,
  } as never);

  return Object.freeze({
    intro,
    learner,
    evaluatorCapsule,
    evaluatorSidecar,
    auxiliary,
  });
}
