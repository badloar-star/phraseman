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
  | 'intro_body_empty'
  | 'intro_body_sentence_count_invalid'
  | 'intro_multiple_teaching_jobs'
  // Библия текстов (владелец, 2026-08-27): правило 4 — без сложных терминов,
  // правило 1 — не упоминать то, чего в уроке нет.
  | 'intro_forbidden_term'
  | 'intro_mentions_unknown_word'
  | 'guidance_forbidden_term'
  | 'guidance_mentions_unknown_word'
  | 'guidance_overloaded'
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
  | 'locale_language_mismatch'
  | 'learner_copy_forbidden_term'
  | 'vocabulary_count_invalid'
  | 'vocabulary_target_invalid'
  | 'vocabulary_locale_missing'
  | 'vocabulary_contact_missing'
  | 'vocabulary_distractors_invalid'
  | 'mode_distractors_invalid'
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
  | 'mode_choice_feedback_not_pair_specific'
  | 'distractor_option_set_copied'
  | 'generic_feedback_template'
  | 'feedback_overloaded'
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
const MIN_TITLE_CHARS = 10;
// зачем 320, а не 700 (Библия текстов, правило 2): 700 знаков — это лекция на
// пол-экрана телефона. NN/Group: люди читают 20-28% слов и на мобильном
// сканируют, а не читают. Интро — одна понятная мысль, а не абзац.
const MAX_BODY_CHARS = 320;
const MIN_BODY_SENTENCES = 2;
const MAX_BODY_SENTENCES = 4;
// Подсказка внутри задания короче интро: она читается на бегу, между ответами
// (Библия текстов, правило 2).
const MAX_GUIDANCE_CHARS = 200;
const MAX_FEEDBACK_CHARS = 160;

// зачем список (Библия текстов, правило 4): владелец прямо запретил «сложные
// термины грамматические». Новичок не обязан знать, что такое «инфинитив» или
// «изъявительное наклонение» — объяснение должно работать без словаря.
// Проверяется по началу слова, чтобы ловить любые падежные формы.
const FORBIDDEN_GRAMMAR_TERMS = Object.freeze([
  'инфинитив',
  'спряжен',
  'склонен',
  'изъявительн',
  'сослагательн',
  'повелительн',
  'транзитивн',
  'переходн',
  'герунди',
  'причасти',
  'деепричасти',
  'номинатив',
  'аккузатив',
  'винительн',
  'дательн',
  'творительн',
  'предложн',
  'родительн',
  'именительн',
  'глагол-связка',
  'глагольная связка',
  'лексем',
  'морфем',
  'флекси',
  'артикл',
  'детерминатив',
  'залог',
]);
const FORBIDDEN_BEGINNER_PHRASES = Object.freeze([
  /\bсловарн(?:ая|ой|ую|ые|ых)\s+форм/iu,
]);
const MULTIPLE_TEACHING_JOBS_BY_LOCALE: Readonly<
  Partial<Record<QualityLocale, RegExp>>
> = Object.freeze({
  ru: /(?:кроме\s+того|ещ[её]\s+одно|также\s+важно|отдельно\s+запомните).{0,80}(?:правил|формул|исключен)/iu,
  uk: /(?:крім\s+того|ще\s+одне|також\s+важливо|окремо\s+запам['’]?ятайте).{0,80}(?:правил|формул|винят)/iu,
  es: /(?:además|otra\s+regla|también\s+es\s+importante).{0,80}(?:regla|fórmula|excepción)/iu,
  'pt-BR': /(?:além\s+disso|outra\s+regra|também\s+é\s+importante).{0,80}(?:regra|fórmula|exceção)/iu,
  vi: /(?:ngoài\s+ra|một\s+quy\s+tắc\s+khác).{0,80}(?:quy\s+tắc|công\s+thức|ngoại\s+lệ)/iu,
  id: /(?:selain\s+itu|aturan\s+lain|juga\s+penting).{0,80}(?:aturan|rumus|pengecualian)/iu,
  tr: /(?:ayrıca|başka\s+bir\s+kural|şunu\s+da\s+unutmayın).{0,80}(?:kural|formül|istisna)/iu,
  pl: /(?:ponadto|kolejna\s+zasada|ważne\s+jest\s+też).{0,80}(?:zasad|formuł|wyjąt)/iu,
});
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

function looksLikeLocalizedSource(value: unknown): value is LocalizedSource {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.ru === 'string' &&
    typeof candidate.uk === 'string' &&
    typeof candidate.es === 'string';
}

function inspectLocalizedLanguageAndBeginnerCopy(
  value: unknown,
  path: string,
  issues: LearningV2ContentQualityIssue[],
): void {
  if (looksLikeLocalizedSource(value)) {
    for (const locale of LEARNING_V2_CONTENT_QUALITY_LOCALES) {
      const copy = textFor(value, locale);
      const copyPath = `${path}.${locale}`;
      if (locale === 'ru') {
        const ukrainianMarkers = copy.match(/\b(?:це|щоб|який|яка|яке|які|тільки|потрібно|після|означає)\b/giu)?.length ?? 0;
        if (/[іїєґ]/iu.test(copy) || ukrainianMarkers >= 2)
          add(issues, 'locale_language_mismatch', copyPath, 'Русская локаль содержит украинский learner-facing текст.');
      } else if (locale === 'uk') {
        const russianMarkers = copy.match(/\b(?:это|чтобы|который|которая|только|нужно|после|означает)\b/giu)?.length ?? 0;
        if (/[ыэъё]/iu.test(copy) || russianMarkers >= 2)
          add(issues, 'locale_language_mismatch', copyPath, 'Украинская локаль содержит русский learner-facing текст.');
      } else if (/[Ѐ-ӿ]/u.test(copy)) {
        add(issues, 'locale_language_mismatch', copyPath, `Локаль ${locale} содержит кириллический learner-facing текст.`);
      }
      const forbiddenTerm = FORBIDDEN_GRAMMAR_TERMS.find((term) =>
        new RegExp(term, 'iu').test(copy),
      );
      if (
        forbiddenTerm ||
        FORBIDDEN_BEGINNER_PHRASES.some((pattern) => pattern.test(copy))
      ) {
        add(
          issues,
          'learner_copy_forbidden_term',
          copyPath,
          'Learner-facing текст содержит непояснённый методический термин.',
        );
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      inspectLocalizedLanguageAndBeginnerCopy(entry, `${path}[${index}]`, issues),
    );
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) =>
      inspectLocalizedLanguageAndBeginnerCopy(
        entry,
        path ? `${path}.${key}` : key,
        issues,
      ),
    );
  }
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

function normalizedFeedbackComparable(value: string): string {
  return normalizedOption(value).toLocaleLowerCase('en');
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

/**
 * Слова изучаемого языка, которые ученик В ЭТОЙ сессии реально видит.
 *
 * зачем (Библия текстов, правило 1 — владелец, 2026-08-27: «не упоминай в
 * уроке то, чего там не должно быть и нету»): объяснение к испанскому `no`
 * рассказывало про `nada` и `non` — слова, которых в уроке нет и которые никто
 * не путает. Доказательства против такого контраста: Mayer coherence principle
 * (лишнее вредит), Sanchez & Wiley (вредит именно новичкам), Kalyuga expertise
 * reversal (материал «на будущее» — груз, а не подготовка).
 *
 * В набор входит всё, что ученик увидит своими глазами: целевые слова, слова
 * фраз и дистракторы (они показываются как варианты ответа).
 */
function sessionCurriculumTargetWords(source: SessionSource): Set<string> {
  const words = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value !== 'string') return;
    const normalized = value.normalize('NFKC').trim().toLocaleLowerCase('en');
    if (normalized.length === 0) return;
    words.add(normalized);
    for (const token of normalized.split(/\s+/u)) {
      if (token) words.add(token);
    }
  };

  for (const item of source.newVocabulary ?? []) {
    add(item.target);
    for (const stage of Object.values(item.contacts ?? {})) {
      for (const distractor of stage?.distractors ?? []) add(distractor.value);
    }
  }
  for (const phrase of source.phrases ?? []) {
    // Сама фраза целиком и каждое её слово.
    add(phrase.english);
    for (const token of String(phrase.english ?? '').split(/\s+/)) add(token);
    for (const word of phrase.words ?? []) {
      add(word.correct);
      for (const distractor of word.distractors ?? []) add(distractor.value);
    }
  }
  return words;
}

function sessionDistractorTargetWords(source: SessionSource): Set<string> {
  const words = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value !== 'string') return;
    const normalized = value.normalize('NFKC').trim();
    if (normalized.length > 0) words.add(normalized);
  };
  for (const item of source.newVocabulary ?? []) {
    for (const stage of Object.values(item.contacts ?? {})) {
      for (const distractor of stage?.distractors ?? []) add(distractor.value);
    }
  }
  for (const phrase of source.phrases ?? []) {
    for (const word of phrase.words ?? []) {
      for (const distractor of word.distractors ?? []) add(distractor.value);
    }
  }
  return words;
}

function reportPrematureDistractorMentions(
  text: string,
  distractors: ReadonlySet<string>,
  currentTarget: string | undefined,
  code: LearningV2ContentQualityIssueCode,
  pathLabel: string,
  issues: LearningV2ContentQualityIssue[],
): void {
  const named = [...distractors].filter((candidate) => {
    if (candidate === currentTarget) return false;
    // Однобуквенные i/l/m невозможно безопасно искать в латинских interface-
    // locales: там это могут быть обычные союзы или части местного текста.
    // Кириллические локали дополнительно проходят полный scan ниже.
    if (candidate.length < 2) return false;
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    return new RegExp(`(^|[^\\p{L}])${escaped}(?=$|[^\\p{L}])`, 'iu').test(text);
  });
  if (named.length === 0) return;
  add(
    issues,
    code,
    pathLabel,
    `Дистрактор назван до выбора ученика: ${named.slice(0, 4).join(', ')}. ` +
      'Первое объяснение раскрывает только текущий материал; ловушка объясняется после ответа.',
  );
}

/**
 * Ищет в тексте слова изучаемого языка, которых в этой сессии НЕТ.
 *
 * Работает так: берём из текста только слова, написанные латиницей (в
 * русском/украинском объяснении это почти всегда цитата изучаемого языка),
 * и сверяем с разрешённым набором. Служебные英 слова вроде "a"/"the" отсеены
 * длиной, имена собственные — заглавной буквой внутри предложения не ловятся,
 * поэтому проверка намеренно консервативная: ложное срабатывание дороже
 * пропуска, но пропуск здесь уже стоил владельцу доверия к текстам.
 */
function reportUnknownTargetWords(
  text: string,
  allowed: ReadonlySet<string>,
  code: LearningV2ContentQualityIssueCode,
  pathLabel: string,
  issues: LearningV2ContentQualityIssue[],
): void {
  // зачем вырезаем /.../ до разбора: в объяснении произношения звук пишут в
  // косых скобках (/oi/, /na-/). Это запись ЗВУКА того же слова урока, а не
  // постороннее слово — без этого гейт ругался на собственный корректный текст.
  const withoutPhonetics = text.replace(/\/[^/]{1,12}\//gu, ' ');
  const latin = withoutPhonetics.match(/[a-zA-ZáéíóúñüàâçèêëîïôùûÁÉÍÓÚÑÜ]+/gu) ?? [];
  const unknown = new Set<string>();
  for (const raw of latin) {
    const word = raw.normalize('NFKC').toLocaleLowerCase('en');
    if (allowed.has(word)) continue;
    // зачем проверка на часть слова: живое объяснение разбирает слово на куски
    // («хвост -oy», «начало ver-»), и такой кусок — не постороннее слово, а то
    // же самое слово урока. Без этого гейт ругался на собственный правильный
    // текст про soy, что и есть ложное срабатывание.
    const isFragmentOfAllowed = [...allowed].some(
      (known) => known.length > word.length && known.includes(word),
    );
    if (isFragmentOfAllowed) continue;
    unknown.add(raw);
  }
  if (unknown.size === 0) return;
  add(
    issues,
    code,
    pathLabel,
    `Упомянуты слова, которых в этой сессии нет: ${[...unknown].slice(0, 4).join(', ')}. ` +
      'Правило 1 Библии текстов: сравнивать можно только с уже пройденным — ' +
      'новое слово ради контраста вредит новичку (Mayer, Kalyuga).',
  );
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
      // зачем убран минимум длины (владелец, 2026-08-27 + research, см.
      // docs/v2/БИБЛИЯ_ТЕКСТОВ_LEARNING_V2.ru.md): требование «минимум 300
      // знаков и 4 предложения» структурно ЗАСТАВЛЯЛО лить воду — так в тексте
      // про испанское `no` появились nada и non, слова, которых в уроке нет.
      // Доказательная база против нижнего порога: Mayer coherence principle
      // (лишний материал вредит, 13 экспериментов из 14), Sanchez & Wiley
      // (вредит именно новичкам), Sweller redundancy effect. Ни один источник
      // не рекомендует минимум длины для микро-объяснения. Ограничитель теперь
      // только сверху.
      if (sentenceCount(body) < 1)
        add(issues, 'intro_body_empty', `${path}.body`, 'Текст пустой — нужно хотя бы одно законченное предложение.');
      else if (sentenceCount(body) < MIN_BODY_SENTENCES)
        add(issues, 'intro_body_sentence_count_invalid', `${path}.body`, `Нужно ${MIN_BODY_SENTENCES}–${MAX_BODY_SENTENCES} законченных предложения без искусственного растягивания.`);
      if (body.length > MAX_BODY_CHARS)
        add(issues, 'intro_body_overloaded', `${path}.body`, `Текст длиннее ${MAX_BODY_CHARS} знаков и перестаёт быть одним экраном.`);
      if (sentenceCount(body) > MAX_BODY_SENTENCES)
        add(issues, 'intro_body_overloaded', `${path}.body`, `Больше ${MAX_BODY_SENTENCES} предложений — это уже лекция, а не одна понятная мысль.`);
      if (MULTIPLE_TEACHING_JOBS_BY_LOCALE[locale]?.test(body))
        add(issues, 'intro_multiple_teaching_jobs', `${path}.body`, 'Одна страница интро объясняет одну мысль; отдельное второе правило нужно убрать.');
      const forbiddenTerm = FORBIDDEN_GRAMMAR_TERMS.find((term) =>
        new RegExp(term, 'iu').test(body),
      );
      if (forbiddenTerm)
        add(issues, 'intro_forbidden_term', `${path}.body`, `Сложный термин «${forbiddenTerm}» — правило 4 Библии требует человеческого языка.`);
      // зачем только ru/uk: приём «латиница в кириллическом тексте = цитата
      // изучаемого языка» работает лишь там, где сам язык объяснения на
      // кириллице. В en/pt-BR/vi/id/tr/pl обычные слова самого объяснения —
      // тоже латиница, и проверка ловила бы «means», «ini», «significa».
      // Правило 1 всё равно соблюдается: тексты всех локалей пишутся с одного
      // русского оригинала, поэтому лишнее слово ловится на ru/uk и чинится
      // сразу во всех восьми.
      reportPrematureDistractorMentions(
        // Проверяем только явно размеченные фрагменты изучаемого языка.
        // Сырые латинские locale-тексты дают ложные совпадения: например,
        // португальское `um` и турецкое `her` являются обычными словами языка
        // объяснения, а не преждевременно показанными английскими ловушками.
        targetCorrectEvidence(page, locale),
        sessionDistractorTargetWords(source),
        undefined,
        'intro_mentions_unknown_word',
        `${path}.body`,
        issues,
      );
      if (locale === 'ru' || locale === 'uk') {
        reportUnknownTargetWords(
          body,
          sessionCurriculumTargetWords(source),
          'intro_mentions_unknown_word',
          `${path}.body`,
          issues,
        );
      }
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
    for (const locale of LEARNING_V2_CONTENT_QUALITY_LOCALES) {
      const explanation = phrase.localizedDetails?.[locale]?.explanation;
      if (explanation && explanation.length > MAX_FEEDBACK_CHARS)
        add(issues, 'feedback_overloaded', `${path}.localizedDetails.${locale}.explanation`, `Feedback длиннее ${MAX_FEEDBACK_CHARS} знаков — оставьте одну точную живую мысль.`);
    }

    const built = normalized(phrase.words.map((word) => word.correct).join(' '));
    if (built !== phraseKey)
      add(issues, 'phrase_word_alignment_invalid', `${path}.words`, `Разбор слов собирается в «${built}», а фраза — «${phraseKey}».`);

    phrase.words.forEach((word, wordIndex) => {
      const wordPath = `${path}.words[${wordIndex}]`;
      const options = word.distractors.map((item) => normalizedOption(item.value));
      const minimumDistractors = 3;
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
  if (vocabulary.length < 1 || vocabulary.length > 5)
    add(
      issues,
      'vocabulary_count_invalid',
      'newVocabulary',
      'Каждая сессия обязана приносить 1–5 новых единиц; каждая проходит полный word-first цикл.',
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
        if (!guidance) continue;
        // зачем те же правила, что и для интро (владелец, 2026-08-27: «оба вида
        // текстов»): текст со скриншота — про nada/non — жил ИМЕННО здесь, в
        // guidance словаря, а не в интро. Покрыть только интро значило бы
        // починить не то место. Лимит строже интро (правило 2 библии): это
        // подсказка внутри задания, а не отдельный экран.
        const guidancePath = `${contactPath}.guidance.${locale}`;
        if (guidance.length > MAX_GUIDANCE_CHARS)
          add(
            issues,
            'guidance_overloaded',
            guidancePath,
            `Подсказка длиннее ${MAX_GUIDANCE_CHARS} знаков — правило 2 Библии текстов требует одной короткой мысли.`,
          );
        const guidanceTerm = FORBIDDEN_GRAMMAR_TERMS.find((term) =>
          new RegExp(`\\b${term}`, 'iu').test(guidance),
        );
        if (guidanceTerm)
          add(
            issues,
            'guidance_forbidden_term',
            guidancePath,
            `Сложный термин «${guidanceTerm}» — правило 4 Библии требует человеческого языка.`,
          );
        reportPrematureDistractorMentions(
          guidance,
          new Set(contact.distractors.map((item) => item.value)),
          target,
          'guidance_mentions_unknown_word',
          guidancePath,
          issues,
        );
        if (locale === 'ru' || locale === 'uk') {
          const introducedTargets = sessionCurriculumTargetWords(source);
          reportUnknownTargetWords(
            guidance,
            introducedTargets,
            'guidance_mentions_unknown_word',
            guidancePath,
            issues,
          );
        }
      }

      const alternatives = contact.distractors.map((item) =>
        normalizedOption(item.value),
      );
      if (
        contact.distractors.length < 3 ||
        new Set(alternatives).size !== alternatives.length ||
        alternatives.includes(targetKey)
      )
        add(
          issues,
          'vocabulary_distractors_invalid',
          `${contactPath}.distractors`,
          'Каждый словарный контакт требует минимум три разные близкие ловушки, не совпадающие с target.',
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
          if (feedback.length > MAX_FEEDBACK_CHARS)
            add(
              issues,
              'feedback_overloaded',
              `${distractorPath}.feedback.${locale}`,
              `Feedback длиннее ${MAX_FEEDBACK_CHARS} знаков — назовите ловушку и одно решающее отличие.`,
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

function inspectModeNativeDistractors(
  source: SessionSource,
  issues: LearningV2ContentQualityIssue[],
): void {
  source.modeNativePractice?.forEach((practice, index) => {
    const payload = practice.modePayload;
    const path = `modeNativePractice[${index}].modePayload`;
    let visible: readonly string[] | null = null;
    if (payload.family === 'phrase_builder' || payload.family === 'listen_build_dictation') {
      visible = payload.authoredDistractorTokens;
    } else if (payload.family === 'listen_choose') {
      const correctIds = new Set(
        payload.choiceFeedback.filter((entry) => entry.correct).map((entry) => entry.responseId),
      );
      visible = payload.localizedMeaningChoices
        .filter((choice) => !correctIds.has(choice.responseId))
        .map((choice) => choice.targetText);
    } else if (payload.family === 'context_gap_grammar') {
      const correctIds = new Set(
        payload.choiceFeedback.filter((entry) => entry.correct).map((entry) => entry.responseId),
      );
      visible = payload.gapOptions
        .filter((option) => !correctIds.has(option.responseId))
        .map((option) => option.text);
    }
    if (!visible) return;
    const normalizedVisible = visible.map(normalizedOption);
    if (visible.length < 3 || new Set(normalizedVisible).size !== visible.length) {
      add(
        issues,
        'mode_distractors_invalid',
        path,
        'Одношаговый режим требует минимум три разные вручную написанные ловушки.',
      );
    }

    if (
      payload.family !== 'listen_choose' &&
      payload.family !== 'context_gap_grammar'
    ) return;
    const options = payload.family === 'listen_choose'
      ? payload.localizedMeaningChoices.map((option) => ({
          responseId: option.responseId,
          label: option.targetText,
        }))
      : payload.gapOptions.map((option) => ({
          responseId: option.responseId,
          label: option.text,
        }));
    const feedbackEntries = payload.choiceFeedback;
    const optionIds = options.map((option) => option.responseId);
    const feedbackIds = feedbackEntries.map((entry) => entry.responseId);
    const correctEntries = feedbackEntries.filter((entry) => entry.correct);
    const exactCoverage =
      new Set(optionIds).size === optionIds.length &&
      new Set(feedbackIds).size === feedbackIds.length &&
      optionIds.length === feedbackIds.length &&
      optionIds.every((responseId) => feedbackIds.includes(responseId));
    const correctOption = correctEntries.length === 1
      ? options.find((option) => option.responseId === correctEntries[0]!.responseId)
      : undefined;
    const wrongEntries = feedbackEntries.filter((entry) => !entry.correct);
    let pairSpecific = exactCoverage && Boolean(correctOption) && wrongEntries.length >= 3;
    for (const locale of LEARNING_V2_CONTENT_QUALITY_LOCALES) {
      const localizedFeedback = wrongEntries.map((entry) =>
        normalizedFeedbackComparable(entry.feedbackByLocale[locale] ?? ''),
      );
      if (
        localizedFeedback.some((copy) => !copy) ||
        new Set(localizedFeedback).size !== localizedFeedback.length
      ) {
        pairSpecific = false;
      }
      for (const entry of wrongEntries) {
        const selectedOption = options.find(
          (option) => option.responseId === entry.responseId,
        );
        const copy = normalizedFeedbackComparable(entry.feedbackByLocale[locale] ?? '');
        if (
          !selectedOption ||
          !correctOption ||
          !copy.includes(normalizedFeedbackComparable(selectedOption.label)) ||
          !copy.includes(normalizedFeedbackComparable(correctOption.label))
        ) {
          pairSpecific = false;
        }
      }
    }
    if (!pairSpecific) {
      add(
        issues,
        'mode_choice_feedback_not_pair_specific',
        `${path}.choiceFeedback`,
        'Каждый неверный вариант выбора требует собственного ручного feedback, который называет выбранную ловушку и правильную форму во всех локалях.',
      );
    }
  });
}

export function evaluateLearningV2SessionContentQuality(
  source: SessionSource,
  receipt?: LearningV2ContentQualityReviewReceipt,
): LearningV2ContentQualityReport {
  const issues: LearningV2ContentQualityIssue[] = [];
  inspectForbiddenGenericFeedback(source, '', issues);
  inspectLocalizedLanguageAndBeginnerCopy(source, '', issues);
  inspectIntro(source, issues);
  inspectVocabulary(source, issues);
  inspectPhrases(source, issues);
  inspectModeNativeDistractors(source, issues);
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
