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
  // зачем interactionId переопределён для интро-карточек (инцидент
  // 2026-08-17): card.cardId (card-episode-01-s01-01) и
  // page.question.questionId (...:intro-q-1) — РАЗНЫЕ строки для одного и
  // того же интро-слота. createLearningV2CourseSessionDeviceRunV1 требует,
  // чтобы интро-порядок совпадал буквально между intro/learner/evaluatorCapsule
  // И auxiliary (sameOrder). Раньше auxiliary брал card.cardId везде — первые
  // три записи расходились с остальными тремя детьми, и пакет отвергался на
  // этой сверке. Не ловилось раньше, потому что ни один прогон не доходил до
  // createLearningV2CourseSessionDeviceRunV1 целиком.
  const auxiliary = materializeLearningV2CourseSessionAuxiliaryChildV1({
    courseSessionId,
    entries: [...introCards, ...practiceCards].map((card) => {
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
        secondErrorExplanationByLocale: card.errorExplanationByLocale as never,
      };
    }) as never,
  } as never);

  return Object.freeze({
    intro,
    learner,
    evaluatorCapsule,
    evaluatorSidecar,
    auxiliary,
  });
}
