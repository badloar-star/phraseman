// зачем: автоматическая проверка структуры не способна сама решить, написан ли
// текст в утверждённом владельцем стиле. Поэтому этот гейт fail-closed сочетает
// детерминированные проверки с независимыми review-решениями, привязанными к
// точному fingerprint материала. Ни сборка shard'ов, ни публикационный скрипт
// не имеют права обходить этот файл.
import { hashCanonicalBody } from '../../policies/decision_registry';
import { checkPhraseAdmissibility } from './phrase_admissibility_filter_v1';
import type {
  LocalizedSource,
  SessionSource,
} from './session_shard_from_source_v1';

export const LEARNING_V2_CONTENT_QUALITY_LOCALES = Object.freeze([
  'ru',
  'uk',
  'es',
  'pt-BR',
  'vi',
  'id',
  'tr',
  'pl',
] as const);

type QualityLocale = (typeof LEARNING_V2_CONTENT_QUALITY_LOCALES)[number];

export type LearningV2ContentQualityIssueCode =
  | 'intro_page_role_invalid'
  | 'intro_title_too_thin'
  | 'intro_body_too_thin'
  | 'intro_body_overloaded'
  | 'intro_explanation_not_causal'
  | 'intro_question_choices_invalid'
  | 'intro_question_not_grounded'
  | 'intro_meta_narration'
  | 'intro_locale_missing'
  | 'intro_locale_fallback'
  | 'intro_locale_not_independent'
  | 'intro_russian_reference_in_other_locale'
  | 'intro_locale_service_tail'
  | 'intro_learning_chronology'
  | 'vocabulary_count_invalid'
  | 'vocabulary_target_invalid'
  | 'vocabulary_locale_missing'
  | 'vocabulary_contact_missing'
  | 'vocabulary_distractors_invalid'
  | 'vocabulary_distractor_feedback_invalid'
  | 'vocabulary_distractor_trap_type_missing'
  | 'phrase_count_invalid'
  | 'phrase_duplicate'
  | 'phrase_not_standalone'
  | 'phrase_out_of_scope'
  | 'phrase_explanation_too_thin'
  | 'phrase_word_alignment_invalid'
  | 'phrase_distractors_invalid'
  | 'distractor_reason_too_thin'
  | 'distractor_trap_type_missing'
  | 'distractor_reason_code_generic'
  | 'distractor_feedback_not_pair_specific'
  | 'distractor_option_set_copied'
  | 'generic_feedback_template'
  | 'quality_review_missing'
  | 'quality_review_stale'
  | 'quality_review_rejected'
  | 'quality_review_not_independent'
  | 'locale_review_missing';

export interface LearningV2ContentQualityIssue {
  readonly code: LearningV2ContentQualityIssueCode;
  readonly path: string;
  readonly message: string;
}

export interface LearningV2ContentQualityReport {
  readonly ok: boolean;
  readonly issues: readonly LearningV2ContentQualityIssue[];
}

interface ReviewDecision {
  readonly decision: 'approved' | 'rejected';
  readonly reviewerId: string;
}

export interface LearningV2ContentQualityReviewReceipt {
  readonly schemaVersion: 'learning-v2-content-quality-review.v1';
  readonly sessionOrdinal: number;
  readonly subjectFingerprint: string;
  readonly introStyle: ReviewDecision;
  readonly phraseSelection: ReviewDecision;
  readonly localeAuthorship: Readonly<Record<QualityLocale, ReviewDecision>>;
}

const EXPECTED_INTRO_ROLES = Object.freeze(['concept', 'formula', 'trap'] as const);
const UNTRANSLATED_MARKER = '[[NEEDS_TRANSLATION]]';
// Пороги выведены из полного утверждённого восьмиязычного калибра, а не из
// вкуса автора гейта: title min=11, body min=329, explanation min=36,
// body sentences min=4. Небольшой технический допуск не меняет стиль.
const MIN_TITLE_CHARS = 10;
const MIN_BODY_CHARS = 300;
const MAX_BODY_CHARS = 700;
const MIN_EXPLANATION_CHARS = 35;
const MIN_PHRASE_EXPLANATION_CHARS = 100;
const MIN_DISTRACTOR_REASON_CHARS = 40;
const DISTRACTOR_TRAP_TYPES = new Set([
  'grammar',
  'semantic_neighbor',
  'collocation_pragmatics',
  'phonetic',
  'orthographic',
  'l1_transfer',
  'phrase_assembly',
]);
const GENERIC_DISTRACTOR_REASON_CODES = new Set([
  'approved_candidate_distractor',
  'wrong_token',
  'wrong_token_for_position',
]);
const OWNER_APPROVED_FIRST_TEN_SHA =
  '746b30c49c9735cd57cde89cb4e488c40e6661b1be9ccba1ac7f202b09957f09';

const META_NARRATION_BY_LOCALE: Readonly<Record<QualityLocale, readonly RegExp[]>> =
  Object.freeze({
    ru: [/сесси|заняти|урок|глав[аеуы]|курс[аеуы]|экран|карточк/iu, /(?:предыдущ|следующ)\w*\s+(?:сесси|заняти|урок|част|экран)|позже\s+(?:узна|разбер|верн)|уже\s+(?:учил|проход)/iu],
    uk: [/сесі|занят|урок|глав[іи]|курс[іи]|екран|картк/iu, /(?:попередн|наступн)\w*\s+(?:сесі|занят|урок|част|екран)|пізніше\s+(?:дізна|розбер|поверн)|вже\s+(?:вчив|проход)/iu],
    es: [/\b(?:sesión|lección|capítulo|curso|pantalla|tarjeta)s?\b/iu],
    'pt-BR': [/\b(?:sessão|lição|capítulo|curso|tela|cartão|cartões)\b/iu],
    vi: [/(?:buổi\s+học|bài\s+học|chương\s+học|khóa\s+học|màn\s+hình|thẻ\s+học)/iu],
    id: [/\b(?:sesi|pelajaran|bab|kursus|layar|kartu)\b/iu],
    tr: [/\b(?:oturum|ders|kurs|ekran|kart)(?:u|ı|i|ü|lar|ler)?\b/iu, /\b(?:önceki|sonraki|gelecek)\s+(?:oturum|ders|bölüm)\b/iu],
    pl: [/\b(?:sesja|lekcja|rozdział|kurs|ekran|karta)(?:ch|mi|u|y|ę|ą)?\b/iu],
  });

const RUSSIAN_REFERENCE_BY_LOCALE: Readonly<Partial<Record<QualityLocale, RegExp>>> =
  Object.freeze({
    uk: /російськ/iu,
    es: /\brus[oa]s?\b/iu,
    'pt-BR': /\bruss[oa]s?\b/iu,
    vi: /tiếng\s+nga/iu,
    id: /bahasa\s+rusia/iu,
    tr: /rusça/iu,
    pl: /rosyjsk/iu,
  });

const LEARNING_CHRONOLOGY_BY_LOCALE: Readonly<Record<QualityLocale, RegExp>> =
  Object.freeze({
    ru: /(?:знакомые|известные)\s+формы|как\s+(?:мы\s+)?(?:уже\s+)?(?:учили|проходили|разбирали)|уже\s+(?:изучали|проходили|разбирали)|(?:позже|дальше)\s+(?:разбер|узна|верн)/iu,
    uk: /(?:знайомі|відомі)\s+форми|як\s+(?:ми\s+)?(?:вже\s+)?(?:вчили|проходили|розбирали)|вже\s+(?:вивчали|проходили|розбирали)|(?:пізніше|далі)\s+(?:розбер|дізна|поверн)/iu,
    es: /\bformas\s+conocidas\b|\bcomo\s+(?:ya\s+)?(?:aprendimos|vimos|estudiamos)|\bya\s+(?:aprendimos|aprendiste|vimos|estudiamos)|\bmás\s+adelante\s+(?:veremos|aprenderás)/iu,
    'pt-BR': /\bformas\s+conhecidas\b|\bcomo\s+(?:já\s+)?(?:aprendemos|vimos|estudamos)|\bjá\s+(?:aprendemos|aprendeu|vimos|estudamos)|\bmais\s+adiante\s+(?:veremos|você\s+aprenderá)/iu,
    vi: /(?:các\s+)?dạng\s+quen\s+thuộc|như\s+(?:chúng\s+ta\s+)?đã\s+học|đã\s+(?:học|xem)\s+(?:trước|rồi)|sau\s+này\s+sẽ/iu,
    id: /\bbentuk\s+yang\s+sudah\s+dikenal\b|\bseperti\s+yang\s+(?:sudah|telah)\s+dipelajari|\bsudah\s+kita\s+(?:pelajari|bahas)|\bnanti\s+(?:akan\s+)?(?:belajar|membahas)/iu,
    tr: /\btanıdık\s+biçimler\b|\bdaha\s+önce\s+(?:öğrendiğimiz|gördüğümüz|işlediğimiz)|\bzaten\s+(?:öğrendik|gördük|işledik)|\bileride\s+(?:öğreneceğiz|göreceğiz)/iu,
    pl: /\bznane\s+formy\b|\bjak\s+(?:już\s+)?(?:uczyliśmy|widzieliśmy|omawialiśmy)|\bjuż\s+(?:poznaliśmy|przerabialiśmy|omawialiśmy)|\bpóźniej\s+(?:poznamy|omówimy|wrócimy)/iu,
  });

const LEAKED_SERVICE_TAIL = /(?:^|[.!?]\s+)(?:For\s+example|Example)\s*(?::|—|-)\s*[«“"]?.+?\b(?:carries|has|expresses|means)\s+(?:this\s+)?(?:exact\s+)?(?:meaning|idea|sense)\b|\b(?:This\s+(?:phrase|example)|It)\s+(?:carries|has|expresses)\s+(?:this\s+)?(?:exact\s+)?(?:meaning|idea|sense)\b/iu;

// Owner lock, 2026-08-20: these sentences are not explanations. They are a
// generic generator tail that hides which alternative was chosen and what it
// actually does. Keep every locale here so the same template cannot return as
// a translation in later lessons.
const FORBIDDEN_GENERIC_FEEDBACK = Object.freeze([
  /Это меняет точный смысл готовой фразы\./iu,
  /Це змінює точний зміст готової фрази\./iu,
  /Eso cambia el sentido preciso de la frase completa\./iu,
  /Isso muda o sentido exato da frase completa\./iu,
  /Vì vậy nghĩa chính xác của cả câu sẽ đổi\./iu,
  /Karena itu arti tepat dari seluruh kalimat berubah\./iu,
  /Böylece bütün cümlenin kesin anlamı değişir\./iu,
  /Przez to zmienia się dokładny sens całego zdania\./iu,
]);

const FOREIGN_GRAMMAR = Object.freeze([
  /\b(?:was|were|will|would|did|does|doing|have been|has been)\b/iu,
  /present_simple|past_|future|going_to|continuous|irregular|third_person_s$/iu,
]);

function textFor(source: LocalizedSource, locale: QualityLocale): string {
  return String(source[locale] ?? source.rest?.[locale] ?? '').trim();
}

function add(
  issues: LearningV2ContentQualityIssue[],
  code: LearningV2ContentQualityIssueCode,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function inspectForbiddenGenericFeedback(
  value: unknown,
  path: string,
  issues: LearningV2ContentQualityIssue[],
): void {
  if (typeof value === 'string') {
    if (FORBIDDEN_GENERIC_FEEDBACK.some((pattern) => pattern.test(value)))
      add(
        issues,
        'generic_feedback_template',
        path,
        'Запрещена универсальная приписка о «точном смысле»: назовите выбранную альтернативу и её конкретную смысловую или грамматическую ошибку.',
      );
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      inspectForbiddenGenericFeedback(item, `${path}[${index}]`, issues),
    );
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) =>
      inspectForbiddenGenericFeedback(item, path ? `${path}.${key}` : key, issues),
    );
  }
}

function sentenceCount(value: string): number {
  return value.split(/[.!?]+(?:[”»'’"]|\s|$)/u).map((part) => part.trim()).filter(Boolean).length;
}

function normalized(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[’]/g, "'")
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .trim()
    .toLocaleLowerCase('en');
}

function normalizedOption(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[’]/g, "'")
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .trim();
}

function tokenCoverage(answer: string, evidence: string): number {
  const answerTokens = [...new Set(normalized(answer).split(' ').filter(Boolean))];
  if (answerTokens.length === 0) return 0;
  const evidenceTokens = new Set(normalized(evidence).split(' ').filter(Boolean));
  return answerTokens.filter((token) => evidenceTokens.has(token)).length /
    answerTokens.length;
}

function targetCorrectEvidence(
  source: SessionSource['introPages'][number],
  locale: QualityLocale,
): string {
  const runsSource = source.bodyRuns;
  if (!runsSource) return '';
  const runs = runsSource[locale] ?? runsSource.rest?.[locale] ?? [];
  return runs
    .filter((run) => run.semantic === 'targetCorrect')
    .map((run) => run.text)
    .join(' ');
}

function inspectLocalizedIntroField(
  value: LocalizedSource,
  path: string,
  issues: LearningV2ContentQualityIssue[],
  allowSharedTargetText = false,
): void {
  const seen = new Map<string, QualityLocale>();
  for (const locale of LEARNING_V2_CONTENT_QUALITY_LOCALES) {
    const text = textFor(value, locale);
    if (!text) {
      add(issues, 'intro_locale_missing', `${path}.${locale}`, 'Обязательный локализованный текст отсутствует.');
      continue;
    }
    if (text.includes(UNTRANSLATED_MARKER))
      add(issues, 'intro_locale_fallback', `${path}.${locale}`, 'Fallback/маркер перевода запрещён.');
    if (locale !== 'ru' && locale !== 'uk' && /[Ѐ-ӿ]/u.test(text))
      add(issues, 'intro_locale_fallback', `${path}.${locale}`, 'Кириллица в нерусской латинской локали.');
    for (const pattern of META_NARRATION_BY_LOCALE[locale]) {
      if (pattern.test(text)) {
        add(issues, 'intro_meta_narration', `${path}.${locale}`, 'Интро не имеет права рассказывать о сессиях, уроках или навигации.');
        break;
      }
    }
    if (RUSSIAN_REFERENCE_BY_LOCALE[locale]?.test(text))
      add(issues, 'intro_russian_reference_in_other_locale', `${path}.${locale}`, 'Нерусская локаль не может объяснять английский через русский язык.');
    if (LEAKED_SERVICE_TAIL.test(text))
      add(issues, 'intro_locale_service_tail', `${path}.${locale}`, 'В ученический текст попала англоязычная служебная приписка генератора.');
    if (LEARNING_CHRONOLOGY_BY_LOCALE[locale].test(text))
      add(issues, 'intro_learning_chronology', `${path}.${locale}`, 'Интро должно сразу объяснять язык, а не описывать знакомый или уже пройденный материал.');
    if (!allowSharedTargetText) {
      const key = normalized(text);
      const duplicate = seen.get(key);
      if (duplicate)
        add(issues, 'intro_locale_not_independent', `${path}.${locale}`, `Текст дословно совпадает с локалью ${duplicate}.`);
      else seen.set(key, locale);
    }
  }
}

function inspectIntro(source: SessionSource, issues: LearningV2ContentQualityIssue[]): void {
  // Owner approval freezes the exact first-ten candidate byte-for-byte. Its
  // shortest causal feedback is 20 characters. The exception is hash- and
  // coordinate-bound; any text edit loses it and returns to the 35-char gate.
  const minimumExplanationChars =
    source.episodeOrdinal === 1 &&
    source.requiredSessionOrdinal >= 1 &&
    source.requiredSessionOrdinal <= 10 &&
    source.generationInputFingerprint === OWNER_APPROVED_FIRST_TEN_SHA
      ? 20
      : MIN_EXPLANATION_CHARS;
  source.introPages.forEach((page, pageIndex) => {
    const pagePath = `introPages[${pageIndex}]`;
    if (page.kind !== EXPECTED_INTRO_ROLES[pageIndex])
      add(issues, 'intro_page_role_invalid', `${pagePath}.kind`, `Требуется неизменный порядок concept → formula → trap; получено ${page.kind}.`);

    inspectLocalizedIntroField(page.title, `${pagePath}.title`, issues);
    inspectLocalizedIntroField(page.body, `${pagePath}.body`, issues);
    inspectLocalizedIntroField(page.question.prompt, `${pagePath}.question.prompt`, issues);
    inspectLocalizedIntroField(page.question.explanation, `${pagePath}.question.explanation`, issues);
    page.question.choices.forEach((choice, choiceIndex) =>
      inspectLocalizedIntroField(choice, `${pagePath}.question.choices[${choiceIndex}]`, issues, true),
    );

    for (const locale of LEARNING_V2_CONTENT_QUALITY_LOCALES) {
      const title = textFor(page.title, locale);
      const body = textFor(page.body, locale);
      const explanation = textFor(page.question.explanation, locale);
      const choices = page.question.choices.map((choice) => textFor(choice, locale));
      const correct = choices[page.question.correctChoiceIndex] ?? '';
      const path = `${pagePath}.${locale}`;

      if (title.length < MIN_TITLE_CHARS)
        add(issues, 'intro_title_too_thin', `${path}.title`, `Заголовок короче ${MIN_TITLE_CHARS} знаков.`);
      if (body.length < MIN_BODY_CHARS || sentenceCount(body) < 4)
        add(issues, 'intro_body_too_thin', `${path}.body`, 'Требуются минимум четыре законченных причинных предложения и плотность старого эталона.');
      if (body.length > MAX_BODY_CHARS)
        add(issues, 'intro_body_overloaded', `${path}.body`, `Текст длиннее ${MAX_BODY_CHARS} знаков и перестаёт быть одним экраном.`);
      if (
        new Set(
          choices.map((choice) => choice.normalize('NFKC').trim()),
        ).size !== 3 ||
        choices.some((choice) => !choice)
      )
        add(issues, 'intro_question_choices_invalid', `${path}.question.choices`, 'Нужны ровно три непустых уникальных варианта.');
      const correctGrounded =
        body.toLocaleLowerCase('en').includes(correct.toLocaleLowerCase('en')) ||
        tokenCoverage(correct, targetCorrectEvidence(page, locale)) >= 0.5;
      if (!correct || !correctGrounded)
        add(issues, 'intro_question_not_grounded', `${path}.body`, 'Правильный ответ обязан быть объяснён в теле до вопроса.');
      if (
        explanation.length < minimumExplanationChars ||
        (tokenCoverage(correct, explanation) < 0.5 &&
          !explanation.toLocaleLowerCase('en').includes(correct.toLocaleLowerCase('en')))
      )
        add(issues, 'intro_explanation_not_causal', `${path}.question.explanation`, 'Разбор обязан назвать правильный ответ и причинно закрепить правило.');
    }
  });
}

function inspectPhrases(source: SessionSource, issues: LearningV2ContentQualityIssue[]): void {
  const hasExplicitVocabulary = (source.newVocabulary?.length ?? 0) > 0;
  if (
    hasExplicitVocabulary
      ? source.phrases.length < 1 || source.phrases.length > 15
      : source.phrases.length !== 15
  )
    add(
      issues,
      'phrase_count_invalid',
      'phrases',
      hasExplicitVocabulary
        ? `Word-first source требует 1–15 фраз-применений; получено ${source.phrases.length}.`
        : `Требуется ровно 15 фраз; получено ${source.phrases.length}.`,
    );
  const seen = new Set<string>();
  const optionSetTargets = new Map<
    string,
    Readonly<{ display: string; lexical: string }>
  >();
  const fixedClarificationRehearsal = source.requiredSessionOrdinal === 53 &&
    source.phrases.every((phrase) =>
      phrase.features.includes('fixed_expression') &&
      /^(?:Sorry|Pardon|Excuse me)\?$/u.test(phrase.english),
    );
  source.phrases.forEach((phrase, phraseIndex) => {
    const path = `phrases[${phraseIndex}]`;
    const phraseKey = normalized(phrase.english);
    if (seen.has(phraseKey) && !fixedClarificationRehearsal) add(issues, 'phrase_duplicate', `${path}.english`, 'Дословный повтор внутри одной сессии запрещён.');
    seen.add(phraseKey);

    const admissibility = checkPhraseAdmissibility({ english: phrase.english, russian: phrase.russian });
    if (admissibility.length)
      add(issues, 'phrase_not_standalone', `${path}.english`, admissibility.map((item) => item.why).join(' '));
    if (FOREIGN_GRAMMAR.some((pattern) => pattern.test(phrase.english)) || phrase.features.some((feature) => FOREIGN_GRAMMAR.some((pattern) => pattern.test(feature))))
      add(issues, 'phrase_out_of_scope', path, 'Урок 1 допускает только настоящее to be; чужая грамматика заблокирована.');
    if (phrase.explanation.trim().length < MIN_PHRASE_EXPLANATION_CHARS || sentenceCount(phrase.explanation) < 2)
      add(issues, 'phrase_explanation_too_thin', `${path}.explanation`, 'Нужно не менее двух предложений: когда так говорят и почему фраза устроена именно так.');

    const built = normalized(phrase.words.map((word) => word.correct).join(' '));
    if (built !== phraseKey)
      add(issues, 'phrase_word_alignment_invalid', `${path}.words`, `Разбор слов собирается в «${built}», а фраза — «${phraseKey}».`);

    phrase.words.forEach((word, wordIndex) => {
      const wordPath = `${path}.words[${wordIndex}]`;
      const options = word.distractors.map((item) => normalizedOption(item.value));
      // Manually authored learner sources use the owner-approved three-option
      // task contract: one answer plus two deliberately close traps. Legacy
      // catalog sources without that authorship receipt still require three.
      const minimumDistractors = hasExplicitVocabulary || source.distractorAuthorship === 'manual' ? 2 : 3;
      if (word.distractors.length < minimumDistractors || new Set(options).size !== options.length || options.includes(normalizedOption(word.correct)))
        add(issues, 'phrase_distractors_invalid', `${wordPath}.distractors`, `Нужны минимум ${minimumDistractors} уникальных правдоподобных ошибки, не совпадающие с ответом.`);
      word.distractors.forEach((distractor, distractorIndex) => {
        const distractorPath = `${wordPath}.distractors[${distractorIndex}]`;
        if (distractor.why.trim().length < MIN_DISTRACTOR_REASON_CHARS)
          add(issues, 'distractor_reason_too_thin', `${distractorPath}.why`, `Причина короче ${MIN_DISTRACTOR_REASON_CHARS} знаков.`);
        if (!distractor.trapType || !DISTRACTOR_TRAP_TYPES.has(distractor.trapType))
          add(issues, 'distractor_trap_type_missing', `${distractorPath}.trapType`, 'Каждая альтернатива обязана хранить один разрешённый trapType.');
        if (GENERIC_DISTRACTOR_REASON_CODES.has(distractor.reasonCode))
          add(issues, 'distractor_reason_code_generic', `${distractorPath}.reasonCode`, 'Общий код «не то слово» запрещён: код обязан фиксировать конкретную ошибочную модель.');
        const why = normalized(distractor.why);
        if (!why.includes(normalized(distractor.value)) || !why.includes(normalized(word.correct)))
          add(issues, 'distractor_feedback_not_pair_specific', `${distractorPath}.why`, 'Feedback обязан прямо назвать выбранную альтернативу и правильную форму.');
      });

      const signature = options.join('|');
      const previousTarget = optionSetTargets.get(signature);
      const lexicalTarget = normalized(word.correct);
      if (previousTarget && previousTarget.lexical !== lexicalTarget)
        add(issues, 'distractor_option_set_copied', `${wordPath}.distractors`, `Один набор вариантов скопирован для разных ответов: ${previousTarget.display} и ${word.correct}.`);
      else
        optionSetTargets.set(signature, {
          display: word.correct,
          // Sentence-initial Am and medial am are the same lexical answer.
          // Case-only spelling traps remain represented by the options; they
          // must not make a legitimate repeated voice target look copied.
          lexical: lexicalTarget,
        });

      for (const locale of LEARNING_V2_CONTENT_QUALITY_LOCALES) {
        const localizedWord = phrase.localizedDetails?.[locale]?.words[wordIndex];
        if (!localizedWord) continue;
        localizedWord.distractors.forEach((distractor, distractorIndex) => {
          const localizedPath = `${wordPath}.localizedDetails.${locale}.distractors[${distractorIndex}]`;
          if (!distractor.trapType || !DISTRACTOR_TRAP_TYPES.has(distractor.trapType))
            add(issues, 'distractor_trap_type_missing', `${localizedPath}.trapType`, 'Локальный разбор обязан сохранять trapType.');
          const reason = normalized(distractor.reason);
          if (!reason.includes(normalized(distractor.value)) || !reason.includes(normalized(localizedWord.correct)))
            add(issues, 'distractor_feedback_not_pair_specific', `${localizedPath}.reason`, 'Локальный feedback обязан назвать выбранную и правильную пару.');
        });
      }
    });
  });
}

function inspectVocabulary(
  source: SessionSource,
  issues: LearningV2ContentQualityIssue[],
): void {
  const vocabulary = source.newVocabulary ?? [];
  if (vocabulary.length > 5)
    add(
      issues,
      'vocabulary_count_invalid',
      'newVocabulary',
      'Не более пяти новых единиц: каждая обязана поместиться в полный word-first цикл.',
    );

  const seenTargets = new Set<string>();
  const stages = ['recognize', 'retrieve_meaning', 'build_form'] as const;
  vocabulary.forEach((entry, entryIndex) => {
    const path = `newVocabulary[${entryIndex}]`;
    const target = entry.target.normalize('NFKC').trim();
    const targetKey = normalizedOption(target);
    if (!target || seenTargets.has(targetKey))
      add(
        issues,
        'vocabulary_target_invalid',
        `${path}.target`,
        'Новая единица должна иметь непустой уникальный target.',
      );
    seenTargets.add(targetKey);

    for (const locale of LEARNING_V2_CONTENT_QUALITY_LOCALES) {
      const meaning = textFor(entry.meaning, locale);
      if (!meaning || meaning.includes(UNTRANSLATED_MARKER))
        add(
          issues,
          'vocabulary_locale_missing',
          `${path}.meaning.${locale}`,
          'Значение новой единицы обязательно пишется отдельно для каждой активной локали.',
        );
    }

    for (const stage of stages) {
      const contact = entry.contacts?.[stage];
      const contactPath = `${path}.contacts.${stage}`;
      if (!contact) {
        add(
          issues,
          'vocabulary_contact_missing',
          contactPath,
          `Для target ${target} отсутствует обязательный standalone-контакт ${stage}.`,
        );
        continue;
      }
      for (const locale of LEARNING_V2_CONTENT_QUALITY_LOCALES) {
        const guidance = textFor(contact.guidance, locale);
        if (!guidance || guidance.includes(UNTRANSLATED_MARKER))
          add(
            issues,
            'vocabulary_locale_missing',
            `${contactPath}.guidance.${locale}`,
            'Подсказка контакта обязательна во всех восьми локалях без fallback.',
          );
      }

      const alternatives = contact.distractors.map((item) =>
        normalizedOption(item.value),
      );
      if (
        contact.distractors.length < 2 ||
        new Set(alternatives).size !== alternatives.length ||
        alternatives.includes(targetKey)
      )
        add(
          issues,
          'vocabulary_distractors_invalid',
          `${contactPath}.distractors`,
          'Каждый словарный контакт требует минимум две разные близкие ловушки, не совпадающие с target.',
        );

      contact.distractors.forEach((distractor, distractorIndex) => {
        const distractorPath = `${contactPath}.distractors[${distractorIndex}]`;
        if (!DISTRACTOR_TRAP_TYPES.has(distractor.trapType))
          add(
            issues,
            'vocabulary_distractor_trap_type_missing',
            `${distractorPath}.trapType`,
            'Словарная ловушка обязана иметь разрешённый диагностический trapType.',
          );
        for (const locale of LEARNING_V2_CONTENT_QUALITY_LOCALES) {
          const feedback = textFor(distractor.feedback, locale);
          const normalizedFeedback = normalized(feedback);
          if (
            feedback.length < MIN_DISTRACTOR_REASON_CHARS ||
            feedback.includes(UNTRANSLATED_MARKER) ||
            !normalizedFeedback.includes(normalized(distractor.value)) ||
            !normalizedFeedback.includes(normalized(target))
          )
            add(
              issues,
              'vocabulary_distractor_feedback_invalid',
              `${distractorPath}.feedback.${locale}`,
              'Feedback обязан назвать выбранную ловушку, правильный target и конкретное различие.',
            );
        }
      });
    }
  });
}

export function learningV2SessionContentFingerprint(source: SessionSource): string {
  return hashCanonicalBody(source);
}

function inspectReceipt(
  source: SessionSource,
  receipt: LearningV2ContentQualityReviewReceipt | undefined,
  issues: LearningV2ContentQualityIssue[],
): void {
  if (!receipt) {
    add(issues, 'quality_review_missing', 'qualityReview', 'Без независимых review-решений материал остаётся HOLD.');
    return;
  }
  if (receipt.sessionOrdinal !== source.requiredSessionOrdinal || receipt.subjectFingerprint !== learningV2SessionContentFingerprint(source))
    add(issues, 'quality_review_stale', 'qualityReview.subjectFingerprint', 'Review относится к другой версии материала.');
  const decisions = [receipt.introStyle, receipt.phraseSelection];
  if (decisions.some((decision) => decision.decision !== 'approved' || !decision.reviewerId.trim()))
    add(issues, 'quality_review_rejected', 'qualityReview', 'Интро и подбор фраз должны иметь явное независимое APPROVED.');
  if (receipt.introStyle.reviewerId.trim() === receipt.phraseSelection.reviewerId.trim())
    add(issues, 'quality_review_not_independent', 'qualityReview', 'Стиль интро и подбор фраз обязаны проверять разные рецензенты.');
  for (const locale of LEARNING_V2_CONTENT_QUALITY_LOCALES) {
    const decision = receipt.localeAuthorship?.[locale];
    if (!decision || decision.decision !== 'approved' || !decision.reviewerId.trim())
      add(issues, 'locale_review_missing', `qualityReview.localeAuthorship.${locale}`, 'Для каждой локали требуется отдельное явное APPROVED носителем/редактором языка.');
  }
}

export function evaluateLearningV2SessionContentQuality(
  source: SessionSource,
  receipt?: LearningV2ContentQualityReviewReceipt,
): LearningV2ContentQualityReport {
  const issues: LearningV2ContentQualityIssue[] = [];
  inspectForbiddenGenericFeedback(source, '', issues);
  inspectIntro(source, issues);
  inspectVocabulary(source, issues);
  inspectPhrases(source, issues);
  inspectReceipt(source, receipt, issues);
  return { ok: issues.length === 0, issues };
}

export function assertLearningV2SessionContentQuality(
  source: SessionSource,
  receipt?: LearningV2ContentQualityReviewReceipt,
): void {
  const report = evaluateLearningV2SessionContentQuality(source, receipt);
  if (!report.ok) {
    const visible = report.issues.slice(0, 50);
    const details = visible
      .map((issue) => `${issue.code} · ${issue.path} · ${issue.message}`)
      .join('\n');
    const remainder = report.issues.length - visible.length;
    throw new Error(
      `learning_v2_content_quality_gate_blocked (${report.issues.length} blockers)\n${details}${
        remainder > 0 ? `\n… ещё ${remainder} blockers; полный отчёт: npm run learning-v2:content-gate` : ''
      }`,
    );
  }
}
