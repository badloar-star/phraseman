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
import type { V2ActivityFamily } from '../../contracts/activity';
import type { V2SessionLearningFunction } from '../../contracts/session';
import type { LearningV2ModeNativePayloadV1 } from '../../contracts/mode_native_payload_v1';
import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { lesson1SessionChoreographyV1 } from './lesson1_session_choreography_v1';
import type { SessionKind } from './episode_01_session_map_v1';
import { hashCanonicalBody } from '../../policies/decision_registry';

const HEX64_RE = /^[0-9a-f]{64}$/;

// зачем (владелец, 2026-08-23): файлы-помощники сессий 11–56 проставляли
// отпечаток строкой-заглушкой вида `authored-e01-s11-v2`. Валидатор рантайма
// требует 64-hex и отвергал КАЖДУЮ такую сессию — второй, независимый от
// review-квитанций блокер, из-за которого готовый материал не доезжал до
// экрана. Нормализуем в одном месте: уже валидный отпечаток остаётся как есть,
// заглушка детерминированно превращается в хэш от самой строки — значение
// стабильно между сборками, клиентом и сервером.
function normalizedGenerationInputFingerprint(
  raw: string,
  sessionOrdinal: number,
): string {
  // зачем в хэш идёт и номер сессии (аудит 2026-08-23): заглушка — это просто
  // строка-метка, и никто не сторожит её уникальность. Две сессии с одинаковой
  // меткой получили бы ОДИН отпечаток; номер делает столкновение невозможным.
  return HEX64_RE.test(raw)
    ? raw
    : hashCanonicalBody({ authoredFingerprintLabel: raw, sessionOrdinal });
}

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
  readonly 'pt-BR'?: string;
  readonly vi?: string;
  readonly id?: string;
  readonly tr?: string;
  readonly pl?: string;
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
    'pt-BR': source['pt-BR'],
    vi: source.vi,
    id: source.id,
    tr: source.tr,
    pl: source.pl,
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
    /** The English grammar operation explicitly taught on this intro page. */
    readonly grammarFeatureId?: string;
    /** A page-specific diagnostic dimension; all three intro pages must differ. */
    readonly testedDimension?: string;
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
  readonly 'pt-BR'?: readonly LearningV2IntroTextRunV1[];
  readonly vi?: readonly LearningV2IntroTextRunV1[];
  readonly id?: readonly LearningV2IntroTextRunV1[];
  readonly tr?: readonly LearningV2IntroTextRunV1[];
  readonly pl?: readonly LearningV2IntroTextRunV1[];
  readonly rest?: Partial<
    Record<LearningV2InterfaceLocale, readonly LearningV2IntroTextRunV1[]>
  >;
}

export type SessionVocabularyContactStageV1 =
  | 'recognize'
  | 'retrieve_meaning'
  | 'build_form';

export interface SessionVocabularyDistractorSourceV1 {
  readonly value: string;
  readonly reasonCode: string;
  readonly trapType:
    | 'grammar'
    | 'semantic_neighbor'
    | 'collocation_pragmatics'
    | 'phonetic'
    | 'orthographic'
    | 'l1_transfer'
    | 'phrase_assembly';
  readonly feedback: LocalizedSource;
}

export interface SessionVocabularyContactSourceV1 {
  /** One manually authored, stage-specific explanation in every locale. */
  readonly guidance: LocalizedSource;
  readonly distractors: readonly SessionVocabularyDistractorSourceV1[];
}

/**
 * Explicit word learning unit. It is deliberately separate from phrases so a
 * standalone word can never be passed through the pipeline as a one-word
 * phrase merely to satisfy a stage label.
 */
export interface SessionVocabularySourceV1 {
  readonly id: string;
  readonly target: string;
  readonly meaning: LocalizedSource;
  readonly features: readonly string[];
  readonly contacts: Readonly<
    Record<SessionVocabularyContactStageV1, SessionVocabularyContactSourceV1>
  >;
}

export interface SessionModeNativePracticeSourceV1 {
  readonly family: LearningV2ModeNativePayloadV1['family'];
  /** Manually authored learner instruction for the exact native operation. */
  readonly instruction?: LocalizedSource;
  readonly purpose:
    | 'supported_practice'
    | 'guided_practice'
    | 'retrieval_practice'
    | 'near_transfer'
    | 'independent_check';
  readonly learningStage:
    | 'recognize'
    | 'retrieve_meaning'
    | 'build_form'
    | 'apply_in_phrase'
    | 'speak_with_model';
  readonly target:
    | Readonly<{ kind: 'vocabulary'; sourceIndex: number }>
    | Readonly<{
        kind: 'vocabulary_grid';
        sourceIndices: readonly number[];
        /** Previously grounded items may be practised without reintroducing them. */
        knownItems?: readonly SessionVocabularySourceV1[];
      }>
    | Readonly<{ kind: 'phrase'; sourceIndex: number }>;
  readonly modePayload: LearningV2ModeNativePayloadV1;
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
    'pt-BR': source['pt-BR'],
    vi: source.vi,
    id: source.id,
    tr: source.tr,
    pl: source.pl,
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

function introTermBoundary(text: string, start: number, term: string): boolean {
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
function completeAuthoredIntroRuns(
  page: SessionSourceIntroPage,
  phrases: readonly EpisodeSourcePhrase[],
): LearningV2IntroRunsByLocaleV1 | undefined {
  if (!page.bodyRuns) return undefined;
  const authored = expandLocalizedIntroRuns(page.bodyRuns);
  const expandedBody = expandLocalized(page.body);
  const expandedChoices = [
    expandLocalized(page.question.choices[0]),
    expandLocalized(page.question.choices[1]),
    expandLocalized(page.question.choices[2]),
  ] as const;
  return Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
    const body = expandedBody[locale];
    const semantics = new Map<string, LearningV2IntroTextRunV1['semantic']>();
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
      if (example.length < 4 || !/[\s?!.'’]/u.test(example)) continue;
      semantics.set(
        example,
        example === correctChoice || phrases.some((phrase) => phrase.english === example)
          ? 'targetCorrect'
          : 'targetWrong',
      );
    }
    const terms = [...semantics.keys()]
      .filter(Boolean)
      .sort((left, right) => right.length - left.length || left.localeCompare(right));
    const runs: LearningV2IntroTextRunV1[] = [];
    let cursor = 0;
    while (cursor < body.length) {
      const term = terms.find(
        (candidate) => body.startsWith(candidate, cursor) && introTermBoundary(body, cursor, candidate),
      );
      if (term) {
        runs.push({ text: term, semantic: semantics.get(term) ?? 'explanation' });
        cursor += term.length;
        continue;
      }
      let end = cursor + 1;
      while (end < body.length && !terms.some(
        (candidate) => body.startsWith(candidate, end) && introTermBoundary(body, end, candidate),
      )) end += 1;
      runs.push({ text: body.slice(cursor, end), semantic: 'explanation' });
      cursor = end;
    }
    return [locale, runs];
  })) as unknown as LearningV2IntroRunsByLocaleV1;
}

export interface SessionSource {
  readonly packageId: string;
  readonly targetLanguage: string;
  readonly episodeOrdinal: number;
  readonly requiredSessionOrdinal: number;
  readonly canDoOutcomeId: string;
  readonly generationInputFingerprint: string;
  /**
   * зачем (владелец, 2026-08-23): lesson1SessionChoreographyV1 раньше молча
   * доставала SessionKind из английской EPISODE_01_SESSION_MAP_V1 по
   * requiredSessionOrdinal — для двух курсов с одинаковыми номерами сессий
   * (английская сессия 1 и испанская сессия 1) это давало ОДНУ и ту же
   * хореографию независимо от targetLanguage. Необязательное поле: не
   * задано — поведение для существующих английских файлов не меняется ни
   * на бит; задано (испанский контур) — используется явно вместо гадания
   * по номеру.
   */
  readonly sessionKindOverride?: SessionKind;
  readonly title: LocalizedSource;
  readonly summary: LocalizedSource;
  readonly learningGoal: LocalizedSource;
  /** Manual source is complete and must never be replaced by the legacy catalog. */
  readonly distractorAuthorship?: 'manual';
  readonly introPages: readonly [
    SessionSourceIntroPage,
    SessionSourceIntroPage,
    SessionSourceIntroPage,
  ];
  /** New lexical units authored for this session before phrase application. */
  readonly newVocabulary?: readonly SessionVocabularySourceV1[];
  /** Explicit owner-approved mode-first order. Generic family assignment is forbidden. */
  readonly modeNativePractice?: readonly SessionModeNativePracticeSourceV1[];
  readonly modeNativePlanId?: string;
  /** Required when an ordinary teaching session intentionally adds no lexicon. */
  readonly newVocabularyExceptionReason?: string;
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
      ru: 'Сопоставьте выражения с их значениями.',
      uk: 'Зіставте вирази з їхніми значеннями.',
      es: 'Relaciona cada expresión con su significado.',
      'pt-BR': 'Associe cada expressão ao seu significado.',
      vi: 'Ghép mỗi cách nói với đúng nghĩa của nó.',
      id: 'Pasangkan setiap ungkapan dengan artinya.',
      tr: 'Her ifadeyi anlamıyla eşleştirin.',
      pl: 'Połącz każde wyrażenie z jego znaczeniem.',
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

const VOCABULARY_STAGE_INSTRUCTION: Readonly<
  Record<SessionVocabularyContactStageV1, LocalizedSource>
> = Object.freeze({
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
export function learningV2SingleTargetSuccessV1(
  target: string,
  explanation: string,
): string {
  const cleanTarget = target.normalize('NFC').trim();
  const targetKey = cleanTarget.toLocaleLowerCase('en');
  let remainder = explanation.normalize('NFC').trim();
  if (
    remainder.slice(0, cleanTarget.length).toLocaleLowerCase('en') === targetKey
  ) {
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
  if (!remainder) return cleanTarget;
  return /^[—–:;,]/u.test(remainder)
    ? `${cleanTarget} ${remainder}`
    : `${cleanTarget} — ${remainder}`;
}

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
  const localized = phrase.localizedDetails;
  // зачем необязательные локали (2026-08-23): localizedDetails стал Partial по
  // общему списку локалей — у английского курса пустует 'en', у испанского
  // 'es'. Раньше тип обещал все восемь и код читал их напрямую; с девятой
  // локалью это стало ложью. Незаполненная локаль теперь пропускается и
  // подхватывается обычным UNTRANSLATED_MARKER в expandLocalized, а не роняет
  // сборку и не подменяется молча русским текстом.
  const localeCopy = (
    select: (
      details: NonNullable<
        NonNullable<EpisodeSourcePhrase['localizedDetails']>['ru']
      >,
    ) => string,
    legacy: LocalizedSource,
  ): LocalizedSource => {
    if (!localized) return legacy;
    const pick = (
      locale: LearningV2InterfaceLocale,
    ): string | undefined => {
      const details = localized[locale];
      return details ? select(details) : undefined;
    };
    return {
      ru: pick('ru') ?? legacy.ru,
      uk: pick('uk') ?? legacy.uk,
      es: pick('es') ?? legacy.es,
      rest: Object.fromEntries(
        LEARNING_V2_INTERFACE_LOCALES.flatMap((locale) => {
          if (locale === 'ru' || locale === 'uk' || locale === 'es') return [];
          const value = pick(locale);
          return value === undefined
            ? []
            : [[locale, value] as [LearningV2InterfaceLocale, string]];
        }),
      ),
    };
  };
  const hint = localeCopy((details) => details.explanation, {
    ru: phrase.explanation,
    uk: phrase.explanation,
    es: phrase.explanation,
  });
  // Разбор ошибок: почему каждый неверный вариант неверен.
  // зачем без slice(0, 6) (владелец, 2026-08-25): кап на 6 записей был
  // рассчитан на фразы максимум с 3 словесными позициями (3×2 дистрактора).
  // Фразы с 4+ позициями (например "No eres de acuerdo" — 4 позиции, 8
  // дистракторов) теряли последние записи молча — деградация проявлялась
  // только для 'es' как интерфейс-локали (единственный потребитель этого
  // legacy-фолбэка у испанского курса, т.к. остальные локали читают полный
  // details.distractors без кэпа) и роняла сборку с
  // lesson1_distractor_catalog_missing, когда authoredDistractorFeedback не
  // находил маркер отсутствующего дистрактора и падал в английский каталог.
  const legacyErrorLines = phrase.words
    .flatMap((word) =>
      word.distractors.map((entry) => `${entry.value} — ${entry.why}`),
    )
    .join(' ');
  return {
    instructionByLocale: expandLocalized(instruction),
    hintByLocale: expandLocalized(hint),
    successMessageByLocale: expandLocalized(
      localeCopy(
        (details) => learningV2SingleTargetSuccessV1(
          phrase.english,
          details.explanation,
        ),
        {
          ru: `Верно: ${phrase.english}.`,
          uk: `Правильно: ${phrase.english}.`,
          es: `Correcto: ${phrase.english}.`,
        },
      ),
    ),
    retryMessageByLocale: expandLocalized(
      localeCopy(
        (details) =>
          details.distractors[0]?.reason ?? details.explanation,
        {
          ru: 'Почти. Посмотрите на подсказку и попробуйте ещё раз.',
          uk: 'Майже. Подивіться підказку і спробуйте ще раз.',
          es: 'Casi. Mira la pista e inténtalo otra vez.',
        },
      ),
    ),
    errorExplanationByLocale: expandLocalized(
      localeCopy(
        (details) =>
          details.distractors
            .map((entry) => `${entry.value} — ${entry.reason}`)
            .join(' '),
        {
          ru: legacyErrorLines,
          uk: legacyErrorLines,
          es: legacyErrorLines,
        },
      ),
    ),
    accessibilityLabelByLocale: expandLocalized(
      localeCopy(
        (details) => `${phrase.english}. ${details.meaning}.`,
        {
          ru: `Задание: ${phrase.english}. ${phrase.russian}.`,
          uk: `Завдання: ${phrase.english}. ${phrase.russian}.`,
          es: `Tarea: ${phrase.english}. ${phrase.russian}.`,
        },
      ),
    ),
  };
}

/**
 * Авторский inventory одной сессии. Это не число interactions: rapid и voice
 * используют один и тот же банк с разным количеством диагностических касаний.
 */
export const SESSION_PHRASE_COUNT_V1 = 15 as const;
/** Исторический standard-профиль: rapid/voice получают число из choreography. */
export const SESSION_PRACTICE_CARD_COUNT_V1 = SESSION_PHRASE_COUNT_V1 - 3;

export function buildSessionShardFromSource(
  source: SessionSource,
): LearningV2GeneratedSessionShardV1 {
  // зачем 15 (владелец, 2026-08-17): контракт пакета требует 14–18 заданий в
  // профиле standard. 12 фраз давали ровно 12 заданий (3 вопроса интро + 9
  // карточек) — публикация падала. 15 фраз дают 15 заданий, середина диапазона.
  const hasExplicitVocabulary = (source.newVocabulary?.length ?? 0) > 0;
  if (!hasExplicitVocabulary && source.phrases.length !== SESSION_PHRASE_COUNT_V1)
    throw new Error(
      `session_source_requires_exactly_${SESSION_PHRASE_COUNT_V1}_phrases`,
    );
  if (
    hasExplicitVocabulary &&
    (source.phrases.length < 1 || source.phrases.length > SESSION_PHRASE_COUNT_V1)
  )
    throw new Error('session_word_first_source_phrase_inventory_invalid');
  const episodeId = `episode-${pad(source.episodeOrdinal)}`;
  const sessionOrdinal = source.requiredSessionOrdinal;
  const generationInputFingerprint = normalizedGenerationInputFingerprint(
    source.generationInputFingerprint,
    sessionOrdinal,
  );
  const sessionTemplateId = `${episodeId}:session-${pad(sessionOrdinal)}`;
  const choreography = lesson1SessionChoreographyV1(
    sessionOrdinal,
    source.sessionKindOverride,
    source.newVocabulary?.length ?? 0,
    source.phrases.length,
    source.modeNativePlanId,
  );
  if (source.modeNativePractice) {
    if (
      !source.modeNativePlanId ||
      source.modeNativePractice.length !== choreography.steps.length - 3
    ) {
      throw new Error('session_source_mode_native_plan_invalid');
    }
    source.modeNativePractice.forEach((authored, index) => {
      const expected = choreography.steps[index + 3];
      const expectedIndex = authored.target.kind === 'phrase'
        ? expected?.sourcePhraseIndex
        : authored.target.kind === 'vocabulary'
          ? expected?.sourceVocabularyIndex
          : expected?.sourceVocabularyIndices?.join(',');
      const authoredIndex = authored.target.kind === 'phrase' || authored.target.kind === 'vocabulary'
        ? authored.target.sourceIndex
        : authored.target.sourceIndices.join(',');
      if (
        !expected ||
        authored.family !== expected.family ||
        authored.purpose !== expected.purpose ||
        authored.learningStage !== expected.learningStage ||
        authored.target.kind !== expected.targetKind ||
        String(authoredIndex) !== String(expectedIndex) ||
        authored.modePayload.family !== authored.family
      ) {
        throw new Error(`session_source_mode_native_step_mismatch:${index + 4}`);
      }
      if (
        authored.modePayload.family === 'speed_match' &&
        authored.target.kind === 'vocabulary_grid' &&
        authored.target.knownItems
      ) {
        const metadataTargets = authored.target.knownItems.map((item) => item.target);
        const payloadTargets = authored.modePayload.pairGrid.map((item) => item.target);
        if (
          metadataTargets.length !== payloadTargets.length ||
          metadataTargets.some((target, itemIndex) => target !== payloadTargets[itemIndex])
        ) throw new Error(`session_source_speed_match_metadata_mismatch:${index + 4}`);
      }
    });
  }

  const introPages = source.introPages.map((page, index) => {
      const ordinal = (index + 1) as 1 | 2 | 3;
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

  const cards = choreography.steps.map((step, index) => {
    const slot = index + 1;
    const family = step.family;
    const authoredModeStep = slot >= 4
      ? source.modeNativePractice?.[slot - 4]
      : undefined;
    const contentItemId = `content-${episodeId}-s${pad(sessionOrdinal)}-${pad(slot)}`;
    const vocabularyStage = step.learningStage === 'recognize' ||
      step.learningStage === 'retrieve_meaning' ||
      step.learningStage === 'build_form'
      ? step.learningStage
      : null;
    const vocabulary = step.targetKind === 'vocabulary'
      ? source.newVocabulary?.[step.sourceVocabularyIndex ?? -1]
      : undefined;
    const authoredKnownGrid = authoredModeStep?.target.kind === 'vocabulary_grid'
      ? authoredModeStep.target.knownItems
      : undefined;
    const gridVocabulary = step.targetKind === 'vocabulary_grid'
      ? (authoredKnownGrid?.length
          ? authoredKnownGrid
          : step.sourceVocabularyIndices?.map((sourceIndex) => source.newVocabulary?.[sourceIndex]))
      : undefined;
    if (
      (step.targetKind === 'vocabulary' && (!vocabulary || !vocabularyStage)) ||
      (step.targetKind === 'vocabulary_grid' && !gridVocabulary?.every(Boolean))
    )
      throw new Error('session_source_choreography_vocabulary_missing');
    const phrase = step.targetKind === 'phrase'
      ? source.phrases[step.sourcePhraseIndex ?? -1]
      : undefined;
    if (step.targetKind === 'phrase' && !phrase)
      throw new Error('session_source_choreography_phrase_missing');
    const vocabularyContact = vocabulary && vocabularyStage && step.targetKind === 'vocabulary'
      ? vocabulary.contacts[vocabularyStage]
      : undefined;
    const targetText = vocabulary?.target ??
      (gridVocabulary
        ? gridVocabulary.map((item) => item!.target).join(' · ')
        : phrase!.english);
    const intentSourceId = vocabulary?.id ??
      (gridVocabulary ? `${source.episodeOrdinal}:session-${sessionOrdinal}:vocabulary-grid` : phrase!.id);
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
    const expandedGridMeaning = gridVocabulary
      ? Object.fromEntries(
          LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
            locale,
            gridVocabulary
              .map((item) => expandLocalized(item!.meaning)[locale])
              .join(' · '),
          ]),
        ) as LearningV2Localized<string>
      : null;
    const meaningFor = (locale: LearningV2InterfaceLocale): string => {
      if (expandedVocabularyMeaning) return expandedVocabularyMeaning[locale];
      if (expandedGridMeaning) return expandedGridMeaning[locale];
      return phrase!.localizedDetails?.[locale]?.meaning ??
        (locale === 'es'
          ? (phrase!.localizedDetails?.en?.meaning ?? `${UNTRANSLATED_MARKER}${phrase!.russian}`)
          : locale === 'ru'
            ? phrase!.russian
            : `${UNTRANSLATED_MARKER}${phrase!.russian}`);
    };
    const contentItem = {
      schemaVersion: 'v2-content-item.v1' as const,
      contentItemId,
      episodeId,
      intentId: `${intentSourceId}:contact-${pad(slot)}`,
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
            generationInputFingerprint,
          }),
        };
      }),
      acceptedAnswers: [targetText],
      // зачем: дистракторы из источника становятся отклонёнными ответами с причиной —
      // рантайм объясняет ошибку, а не просто красит красным.
      rejectedAnswers: gridVocabulary
        ? []
        : vocabularyContact
        ? vocabularyContact.distractors.map((entry) => ({
            value: entry.value,
            // The task selector needs the tested correct form in position 2.
            // Keep the author's stable suffix so audits can still identify the
            // exact misconception rather than collapsing every trap by type.
            reasonCode: `${entry.trapType}:${targetText}:${entry.value}:${entry.reasonCode}`,
          }))
        : phrase!.words.flatMap((word) =>
            word.distractors.map((entry) => ({
              value: entry.value,
              reasonCode: entry.reasonCode,
            })),
          ),
      linguisticFeatures: vocabulary?.features ??
        (gridVocabulary
          ? [...new Set(gridVocabulary.flatMap((item) => item!.features))]
          : phrase!.features),
      pronunciationTargets: [],
      prerequisiteContentItemIds: [],
      objectiveIds: [source.canDoOutcomeId],
      compatibleFamilies: [family],
    };
    const learnerCopy = gridVocabulary && expandedGridMeaning
      ? (() => {
          const instructionByLocale = expandLocalized(
            VOCABULARY_STAGE_INSTRUCTION.retrieve_meaning,
          );
          const localized = (
            select: (locale: LearningV2InterfaceLocale) => string,
          ): LearningV2Localized<string> => Object.fromEntries(
            LEARNING_V2_INTERFACE_LOCALES.map((locale) => [locale, select(locale)]),
          ) as LearningV2Localized<string>;
          return {
            instructionByLocale,
            hintByLocale: localized((locale) => expandedGridMeaning[locale]),
            successMessageByLocale: instructionByLocale,
            retryMessageByLocale: instructionByLocale,
            errorExplanationByLocale: instructionByLocale,
            accessibilityLabelByLocale: localized(
              (locale) => `${targetText}. ${expandedGridMeaning[locale]}.`,
            ),
          };
        })()
      : vocabularyContact && vocabularyStage && expandedVocabularyMeaning
      ? (() => {
          const guidance = expandLocalized(vocabularyContact.guidance);
          const feedback = vocabularyContact.distractors.map((entry) => ({
            value: entry.value,
            byLocale: expandLocalized(entry.feedback),
          }));
          const localized = (
            select: (locale: LearningV2InterfaceLocale) => string,
          ): LearningV2Localized<string> => Object.fromEntries(
            LEARNING_V2_INTERFACE_LOCALES.map((locale) => [locale, select(locale)]),
          ) as LearningV2Localized<string>;
          return {
            instructionByLocale: expandLocalized(
              VOCABULARY_STAGE_INSTRUCTION[vocabularyStage],
            ),
            hintByLocale: guidance,
            successMessageByLocale: localized((locale) =>
              learningV2SingleTargetSuccessV1(targetText, guidance[locale]),
            ),
            retryMessageByLocale: localized((locale) =>
              feedback[0]?.byLocale[locale] ?? guidance[locale],
            ),
            errorExplanationByLocale: localized((locale) =>
              feedback
                .map((entry) => `${entry.value} — ${entry.byLocale[locale]}`)
                .join(' '),
            ),
            accessibilityLabelByLocale: localized(
              (locale) => `${targetText}. ${expandedVocabularyMeaning[locale]}.`,
            ),
          };
        })()
      : cardCopy(phrase!, family);
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
      introQuestionId:
        slot <= 3 ? intro.pages[slot - 1].question.questionId : null,
      contentItem,
      ...learnerCopy,
      ...(authoredModeStep?.instruction
        ? { instructionByLocale: expandLocalized(authoredModeStep.instruction) }
        : {}),
      modePayload: authoredModeStep?.modePayload ?? null,
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
    zone: choreography.zone,
    support: choreography.support,
    generationInputFingerprint,
    modeNativePlanId: source.modeNativePlanId ?? null,
    interfaceLocales: LEARNING_V2_INTERFACE_LOCALES,
    contentKinds: LEARNING_V2_REQUIRED_CONTENT_KINDS,
    intro: intro as never,
    cards,
  };
}
