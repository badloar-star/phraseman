// зачем: валидатор shard'а полностью детерминирован — id, семьи, порядок и хеши
// выводятся из политики сессии. Писать shard руками нельзя: 12 карточек × 8 локалей
// × 6 текстов = сотни полей, которые обязаны совпасть до символа. Поэтому контент
// живёт в человекочитаемом источнике (episode_01_source_v1.ts), а этот билдер
// разворачивает его в структуру, которую принимает настоящий validate*.
import {
  LEARNING_V2_INTERFACE_LOCALES,
  LEARNING_V2_REQUIRED_CONTENT_KINDS,
  type LearningV2InterfaceLocale,
  type LearningV2Localized,
} from '../generator_course_contract';
import {
  LEARNING_V2_SESSION_CARD_PURPOSES,
  learningV2GeneratedMeaningSourceHash,
  type LearningV2GeneratedSessionCardV1,
  type LearningV2GeneratedSessionShardV1,
} from '../generator_session_shard';
import type { LearningV2GeneratedSessionIntro } from '../generator_session_contract';
import {
  introRunsPlainTextV1,
  type LearningV2IntroRunsByLocaleV1,
  type LearningV2IntroTextRunV1,
} from '../intro_semantic_runs_v1';
import { REQUIRED_SESSION_POLICY_V1 } from '../session_compiler';
import type { V2ActivityFamily } from '../../contracts/activity';
import type { V2SessionLearningFunction } from '../../contracts/session';
import type { EpisodeSourcePhrase } from './episode_01_source_v1';

const FAMILY_FUNCTION: Readonly<
  Record<V2ActivityFamily, V2SessionLearningFunction>
> = Object.freeze({
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

const AUDIO_FAMILIES = new Set<V2ActivityFamily>([
  'listen_choose',
  'sound_contrast',
  'listen_build_dictation',
  'scripted_repeat_compare',
  'shadowing_prosody',
  'microstory_radio',
]);

/**
 * Перевод одной строки на 8 языков интерфейса.
 *
 * зачем: врать о готовых переводах нельзя — владелец увидит «готово» там, где
 * текста нет. Локали без ручного перевода получают явный префикс, который ловит
 * гейт перед релизом. Русский, украинский и испанский переведены по-настоящему.
 */
export interface LocalizedSource {
  readonly ru: string;
  readonly uk: string;
  readonly es: string;
  /** Остальные локали — только когда переводчик реально их написал. */
  readonly rest?: Partial<Record<LearningV2InterfaceLocale, string>>;
}

export const UNTRANSLATED_MARKER = '[[NEEDS_TRANSLATION]] ';

export function expandLocalized(
  source: LocalizedSource,
): LearningV2Localized<string> {
  const explicit: Partial<Record<LearningV2InterfaceLocale, string>> = {
    ru: source.ru,
    uk: source.uk,
    es: source.es,
    ...(source.rest ?? {}),
  };
  return Object.fromEntries(
    LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
      locale,
      explicit[locale] ?? `${UNTRANSLATED_MARKER}${source.ru}`,
    ]),
  ) as LearningV2Localized<string>;
}

const pad = (value: number): string => String(value).padStart(2, '0');

export interface SessionSourceIntroPage {
  readonly kind: 'concept' | 'formula' | 'example' | 'trap' | 'tip';
  readonly title: LocalizedSource;
  readonly body: LocalizedSource;
  readonly bodyRuns?: LocalizedIntroRunsSource;
  readonly question: {
    readonly prompt: LocalizedSource;
    readonly choices: readonly [LocalizedSource, LocalizedSource, LocalizedSource];
    readonly correctChoiceIndex: 0 | 1 | 2;
    readonly explanation: LocalizedSource;
  };
}

export interface LocalizedIntroRunsSource {
  readonly ru: readonly LearningV2IntroTextRunV1[];
  readonly uk: readonly LearningV2IntroTextRunV1[];
  readonly es: readonly LearningV2IntroTextRunV1[];
  readonly rest?: Partial<
    Record<LearningV2InterfaceLocale, readonly LearningV2IntroTextRunV1[]>
  >;
}

function expandLocalizedIntroRuns(
  source: LocalizedIntroRunsSource,
): LearningV2IntroRunsByLocaleV1 {
  const explicit: Partial<
    Record<LearningV2InterfaceLocale, readonly LearningV2IntroTextRunV1[]>
  > = {
    ru: source.ru,
    uk: source.uk,
    es: source.es,
    ...(source.rest ?? {}),
  };
  return Object.fromEntries(
    LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
      locale,
      explicit[locale] ?? [
        {
          text: `${UNTRANSLATED_MARKER}${introRunsPlainTextV1(source.ru)}`,
          semantic: 'explanation' as const,
        },
      ],
    ]),
  ) as LearningV2IntroRunsByLocaleV1;
}

export interface SessionSource {
  readonly packageId: string;
  readonly targetLanguage: string;
  readonly episodeOrdinal: number;
  readonly requiredSessionOrdinal: number;
  readonly canDoOutcomeId: string;
  readonly generationInputFingerprint: string;
  readonly title: LocalizedSource;
  readonly summary: LocalizedSource;
  readonly learningGoal: LocalizedSource;
  readonly introPages: readonly [
    SessionSourceIntroPage,
    SessionSourceIntroPage,
    SessionSourceIntroPage,
  ];
  /**
   * Ровно 15 фраз: слоты 1–3 привязаны к вопросам интро, 4–15 — практика.
   *
   * зачем 15, а не 12 (владелец, 2026-08-17): контракт пакета сессии требует
   * 14–18 заданий в профиле standard, а 12 фраз давали ровно 12 заданий
   * (3 вопроса интро + 9 карточек практики) — публикация падала с
   * learning_v2_course_session_release_package_invalid. Владелец выбрал
   * привести содержание к контракту, а не опускать порог: 15 попадает
   * в середину диапазона, остаётся запас в обе стороны.
   */
  readonly phrases: readonly EpisodeSourcePhrase[];
}

/**
 * Инструкция к карточке зависит от механики, а не от фразы: собрать, услышать,
 * выбрать форму. Пишем по-человечески, без жаргона семей.
 */
const FAMILY_INSTRUCTION: Readonly<Record<string, LocalizedSource>> =
  Object.freeze({
    listen_choose: {
      ru: 'Послушайте и выберите то, что услышали.',
      uk: 'Послухайте й оберіть те, що почули.',
      es: 'Escucha y elige lo que oíste.',
    },
    phrase_builder: {
      ru: 'Соберите фразу из слов.',
      uk: 'Складіть фразу зі слів.',
      es: 'Forma la frase con las palabras.',
    },
    speed_match: {
      ru: 'Быстро подберите правильное слово.',
      uk: 'Швидко доберіть правильне слово.',
      es: 'Elige rápido la palabra correcta.',
    },
    sound_contrast: {
      ru: 'Различите похожие по звучанию слова.',
      uk: 'Розрізніть схожі за звучанням слова.',
      es: 'Distingue las palabras que suenan parecido.',
    },
    context_gap_grammar: {
      ru: 'Поставьте нужную форму по смыслу.',
      uk: 'Поставте потрібну форму за змістом.',
      es: 'Pon la forma correcta según el sentido.',
    },
    listen_build_dictation: {
      ru: 'Послушайте и восстановите фразу.',
      uk: 'Послухайте й відновіть фразу.',
      es: 'Escucha y reconstruye la frase.',
    },
    scripted_repeat_compare: {
      ru: 'Повторите вслух и сравните с образцом.',
      uk: 'Повторіть уголос і порівняйте зі зразком.',
      es: 'Repite en voz alta y compara con el modelo.',
    },
  });

function cardCopy(
  phrase: EpisodeSourcePhrase,
  family: V2ActivityFamily,
): Pick<
  LearningV2GeneratedSessionCardV1,
  | 'instructionByLocale'
  | 'hintByLocale'
  | 'successMessageByLocale'
  | 'retryMessageByLocale'
  | 'errorExplanationByLocale'
  | 'accessibilityLabelByLocale'
> {
  const instruction =
    FAMILY_INSTRUCTION[family] ?? FAMILY_INSTRUCTION.phrase_builder;
  // зачем: подсказка — это объяснение фразы из источника, а не «попробуйте ещё».
  // Владелец требует богатый разбор на каждой карточке.
  const hint: LocalizedSource = {
    ru: phrase.explanation,
    uk: phrase.explanation,
    es: phrase.explanation,
  };
  // Разбор ошибок: почему каждый неверный вариант неверен.
  const errorLines = phrase.words
    .flatMap((word) =>
      word.distractors.map((entry) => `${entry.value} — ${entry.why}`),
    )
    .slice(0, 6)
    .join(' ');
  return {
    instructionByLocale: expandLocalized(instruction),
    hintByLocale: expandLocalized(hint),
    successMessageByLocale: expandLocalized({
      ru: `Верно: ${phrase.english}.`,
      uk: `Правильно: ${phrase.english}.`,
      es: `Correcto: ${phrase.english}.`,
    }),
    retryMessageByLocale: expandLocalized({
      ru: 'Почти. Посмотрите на подсказку и попробуйте ещё раз.',
      uk: 'Майже. Подивіться підказку і спробуйте ще раз.',
      es: 'Casi. Mira la pista e inténtalo otra vez.',
    }),
    errorExplanationByLocale: expandLocalized({
      ru: errorLines,
      uk: errorLines,
      es: errorLines,
    }),
    accessibilityLabelByLocale: expandLocalized({
      ru: `Задание: ${phrase.english}. ${phrase.russian}.`,
      uk: `Завдання: ${phrase.english}. ${phrase.russian}.`,
      es: `Tarea: ${phrase.english}. ${phrase.russian}.`,
    }),
  };
}

/**
 * Сколько фраз в одной сессии. Слоты 1–3 привязаны к вопросам интро,
 * 4–15 — практика. Итого 15 заданий: контракт пакета требует 14–18.
 * Одно число на весь проект — иначе части разойдутся молча.
 */
export const SESSION_PHRASE_COUNT_V1 = 15 as const;
/** Практических карточек: всё, что после трёх слотов интро. */
export const SESSION_PRACTICE_CARD_COUNT_V1 = SESSION_PHRASE_COUNT_V1 - 3;

export function buildSessionShardFromSource(
  source: SessionSource,
): LearningV2GeneratedSessionShardV1 {
  // зачем 15 (владелец, 2026-08-17): контракт пакета требует 14–18 заданий в
  // профиле standard. 12 фраз давали ровно 12 заданий (3 вопроса интро + 9
  // карточек) — публикация падала. 15 фраз дают 15 заданий, середина диапазона.
  if (source.phrases.length !== SESSION_PHRASE_COUNT_V1)
    throw new Error(
      `session_source_requires_exactly_${SESSION_PHRASE_COUNT_V1}_phrases`,
    );
  const episodeId = `episode-${pad(source.episodeOrdinal)}`;
  const sessionOrdinal = source.requiredSessionOrdinal;
  const sessionTemplateId = `${episodeId}:session-${pad(sessionOrdinal)}`;
  const policy = REQUIRED_SESSION_POLICY_V1[sessionOrdinal - 1];
  if (!policy) throw new Error('session_source_ordinal_out_of_policy');

  const introPages = source.introPages.map((page, index) => {
      const ordinal = (index + 1) as 1 | 2 | 3;
      const bodyRunsByLocale = page.bodyRuns
        ? expandLocalizedIntroRuns(page.bodyRuns)
        : undefined;
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
          choicesByLocale: Object.fromEntries(
            LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
              locale,
              [
                expandLocalized(page.question.choices[0])[locale],
                expandLocalized(page.question.choices[1])[locale],
                expandLocalized(page.question.choices[2])[locale],
              ] as const,
            ]),
          ) as LearningV2Localized<readonly [string, string, string]>,
          correctChoiceIndex: page.question.correctChoiceIndex,
          explanationByLocale: expandLocalized(page.question.explanation),
        },
      };
  });
  const intro: LearningV2GeneratedSessionIntro = {
    schemaVersion: 'learning-v2-generated-session-intro.v3',
    sessionTemplateId,
    titleByLocale: expandLocalized(source.title),
    summaryByLocale: expandLocalized(source.summary),
    learningGoalByLocale: expandLocalized(source.learningGoal),
    pages: [introPages[0], introPages[1], introPages[2]],
    practiceStartSlot: 4,
    slotPresentationPolicy:
      'slots_1_2_3_embedded_in_intro_pages_not_repeated',
  };

  const cards = source.phrases.map((phrase, index) => {
    const slot = index + 1;
    const family = policy.families[index % policy.families.length];
    const contentItemId = `content-${episodeId}-s${pad(sessionOrdinal)}-${pad(slot)}`;
    const targetText = phrase.english;
    const meaningFor = (locale: LearningV2InterfaceLocale): string =>
      locale === 'ru'
        ? phrase.russian
        : `${UNTRANSLATED_MARKER}${phrase.russian}`;
    const contentItem = {
      schemaVersion: 'v2-content-item.v1' as const,
      contentItemId,
      episodeId,
      intentId: phrase.id,
      target: {
        locale: source.targetLanguage,
        text: targetText,
        register: 'neutral',
        region: 'global',
      },
      learnerMeanings: LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
        const meaning = meaningFor(locale);
        return {
          locale,
          value: meaning,
          sourceHash: learningV2GeneratedMeaningSourceHash({
            contentItemId,
            targetLanguage: source.targetLanguage,
            targetText,
            locale,
            meaning,
            generationInputFingerprint: source.generationInputFingerprint,
          }),
        };
      }),
      acceptedAnswers: [targetText],
      // зачем: дистракторы из источника становятся отклонёнными ответами с причиной —
      // рантайм объясняет ошибку, а не просто красит красным.
      rejectedAnswers: phrase.words.flatMap((word) =>
        word.distractors.map((entry) => ({
          value: entry.value,
          reasonCode: entry.reasonCode,
        })),
      ),
      linguisticFeatures: phrase.features,
      pronunciationTargets: [],
      prerequisiteContentItemIds: [],
      objectiveIds: [source.canDoOutcomeId],
      compatibleFamilies: [family],
    };
    return {
      cardId: `card-${episodeId}-s${pad(sessionOrdinal)}-${pad(slot)}`,
      taskSlot: slot,
      purpose: LEARNING_V2_SESSION_CARD_PURPOSES[index],
      activityId: `activity-${episodeId}-s${pad(sessionOrdinal)}-${pad(slot)}-${family}`,
      family,
      learningFunction: FAMILY_FUNCTION[family],
      support: policy.support,
      promptNovelty:
        policy.zone === 'understand'
          ? ('trained' as const)
          : policy.zone === 'use'
            ? ('varied' as const)
            : ('novel' as const),
      promptId: `prompt-${episodeId}-${pad(sessionOrdinal)}-${pad(slot)}`,
      introQuestionId:
        slot <= 3 ? intro.pages[slot - 1].question.questionId : null,
      contentItem,
      ...cardCopy(phrase, family),
      audioScript: AUDIO_FAMILIES.has(family)
        ? {
            contentItemId,
            language: source.targetLanguage,
            inputText: targetText,
            characterId: null,
            instructions:
              'Clear, warm, unhurried English for an absolute beginner. Natural rhythm, no exaggerated teacher voice.',
          }
        : null,
    };
  }) as unknown as readonly LearningV2GeneratedSessionCardV1[];

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
    zone: policy.zone,
    support: policy.support,
    generationInputFingerprint: source.generationInputFingerprint,
    interfaceLocales: LEARNING_V2_INTERFACE_LOCALES,
    contentKinds: LEARNING_V2_REQUIRED_CONTENT_KINDS,
    intro: intro as never,
    cards,
  };
}
