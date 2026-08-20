// Generated projection adapter for the exact owner-approved S01-S10 payload.
// The 5 MB JSON is written only by scripts/import_learning_v2_first_ten_candidate.mjs
// after its immutable SHA-256 check. This adapter adds runtime coordinates and
// semantic typography without changing any learner-facing byte.
import candidateJson from './approved_first_ten_candidate_v2.json';
import type {
  EpisodeSourcePhrase,
  EpisodeSourcePhraseLocalizedDetails,
} from './episode_01_source_v1';
import { EPISODE_01_SESSION_MAP_V1 } from './episode_01_session_map_v1';
import type {
  LocalizedIntroRunsSource,
  LocalizedSource,
  SessionSource,
} from './session_shard_from_source_v1';
import type {
  LearningV2IntroRunSemanticV1,
  LearningV2IntroTextRunV1,
} from '../intro_semantic_runs_v1';

export const APPROVED_FIRST_TEN_CANDIDATE_SHA_V2 =
  '746b30c49c9735cd57cde89cb4e488c40e6661b1be9ccba1ac7f202b09957f09';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type Locale = (typeof LOCALES)[number];

type CandidateIntroPage = readonly [
  'concept' | 'formula' | 'trap',
  string,
  string,
  string,
  readonly string[],
  number,
  string,
];
type CandidateLocaleSession = readonly [
  string,
  string,
  string,
  readonly CandidateIntroPage[],
];
type CandidatePhrase = readonly [string, readonly string[]];
type CandidatePracticeDetails = EpisodeSourcePhraseLocalizedDetails;
type CandidateData = Readonly<{
  version: number;
  status: string;
  localeOrder: readonly Locale[];
  locales: Readonly<
    Record<Locale, Readonly<{ sessions: readonly CandidateLocaleSession[] }>>
  >;
  sessions: readonly Readonly<{
    ordinal: number;
    key: string;
    practice: readonly CandidatePhrase[];
  }>[];
  practiceDetails: Readonly<
    Record<Locale, readonly (readonly CandidatePracticeDetails[])[]>
  >;
}>;

const candidate = candidateJson as unknown as CandidateData;

/**
 * Явные поправки владельца поверх неизменяемого архива 1–10.
 *
 * Архив и его SHA остаются историческим доказательством того, что именно было
 * одобрено. Очевидные опечатки при этом не должны попадать ученику и не должны
 * возвращаться при повторном импорте. Каждая поправка здесь адресная и покрыта
 * регрессионным тестом.
 */
export const APPROVED_FIRST_TEN_OWNER_ERRATA_V3 = Object.freeze({
  'ru/01/11/meaning': 'Мне жарко',
});

function applyOwnerErrata(
  locale: Locale,
  sessionIndex: number,
  phraseIndex: number,
  details: CandidatePracticeDetails,
): CandidatePracticeDetails {
  if (locale === 'ru' && sessionIndex === 0 && phraseIndex === 10) {
    return {
      ...details,
      meaning: APPROVED_FIRST_TEN_OWNER_ERRATA_V3['ru/01/11/meaning'],
    };
  }
  return details;
}

function localized(select: (locale: Locale) => string): LocalizedSource {
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

function isWordCharacter(value: string | undefined): boolean {
  return value !== undefined && /[\p{L}\p{N}'’]/u.test(value);
}

function hasTermBoundary(text: string, start: number, term: string): boolean {
  const before = start > 0 ? text[start - 1] : undefined;
  const after = text[start + term.length];
  return !(
    (isWordCharacter(term[0]) && isWordCharacter(before)) ||
    (isWordCharacter(term[term.length - 1]) && isWordCharacter(after))
  );
}

function pushRun(
  runs: LearningV2IntroTextRunV1[],
  text: string,
  semantic: LearningV2IntroRunSemanticV1,
): void {
  if (!text) return;
  const previous = runs[runs.length - 1];
  if (previous?.semantic === semantic) {
    runs[runs.length - 1] = { text: `${previous.text}${text}`, semantic };
    return;
  }
  runs.push({ text, semantic });
}

function bodyRuns(
  body: string,
  sessionIndex: number,
  locale: Locale,
  pageIndex: number,
): readonly LearningV2IntroTextRunV1[] {
  const semanticByTerm = new Map<string, LearningV2IntroRunSemanticV1>();
  const practice = candidate.sessions[sessionIndex].practice;
  const details = candidate.practiceDetails[locale][sessionIndex];
  practice.forEach(([correct, wrong], phraseIndex) => {
    semanticByTerm.set(correct, 'targetCorrect');
    wrong.forEach((value) => semanticByTerm.set(value, 'targetWrong'));
    details[phraseIndex].words.forEach((word) => {
      semanticByTerm.set(word.correct, 'targetCorrect');
      word.distractors.forEach((entry) =>
        semanticByTerm.set(entry.value, 'targetWrong'),
      );
    });
  });
  const page = candidate.locales[locale].sessions[sessionIndex][3][pageIndex];
  page[4].forEach((choice, choiceIndex) => {
    if (!semanticByTerm.has(choice)) return;
    semanticByTerm.set(
      choice,
      choiceIndex === page[5] ? 'targetCorrect' : 'targetWrong',
    );
  });
  const terms = [...semanticByTerm.keys()]
    .filter(Boolean)
    .sort((left, right) => right.length - left.length || left.localeCompare(right));
  const runs: LearningV2IntroTextRunV1[] = [];
  let cursor = 0;
  while (cursor < body.length) {
    const term = terms.find(
      (candidateTerm) =>
        body.startsWith(candidateTerm, cursor) &&
        hasTermBoundary(body, cursor, candidateTerm),
    );
    if (term) {
      pushRun(runs, term, semanticByTerm.get(term) ?? 'explanation');
      cursor += term.length;
      continue;
    }
    let end = cursor + 1;
    while (
      end < body.length &&
      !terms.some(
        (candidateTerm) =>
          body.startsWith(candidateTerm, end) &&
          hasTermBoundary(body, end, candidateTerm),
      )
    ) {
      end += 1;
    }
    pushRun(runs, body.slice(cursor, end), 'explanation');
    cursor = end;
  }
  return runs;
}

function localizedRuns(
  sessionIndex: number,
  pageIndex: number,
): LocalizedIntroRunsSource {
  const forLocale = (locale: Locale) => {
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

function categoryFor(token: string): string {
  if (token === 'I' || token === 'You') return 'pronoun';
  if (['am', 'are'].includes(token)) return 'to-be';
  if (token === 'not') return 'negation';
  if (token === 'a' || token === 'an') return 'article';
  if (/^(?:I’m|You’re)$/u.test(token)) return 'contraction';
  return 'lexical';
}

function phraseId(sessionOrdinal: number, phraseIndex: number): string {
  return `e01-s${String(sessionOrdinal).padStart(2, '0')}-approved-${String(
    phraseIndex + 1,
  ).padStart(2, '0')}`;
}

function buildPhrase(sessionIndex: number, phraseIndex: number): EpisodeSourcePhrase {
  const session = candidate.sessions[sessionIndex];
  const [english] = session.practice[phraseIndex];
  const localizedDetails = Object.fromEntries(
    LOCALES.map((locale) => [
      locale,
      applyOwnerErrata(
        locale,
        sessionIndex,
        phraseIndex,
        candidate.practiceDetails[locale][sessionIndex][phraseIndex],
      ),
    ]),
  ) as Record<Locale, CandidatePracticeDetails>;
  const russian = localizedDetails.ru;
  const plan = EPISODE_01_SESSION_MAP_V1[sessionIndex];
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

function buildSession(sessionIndex: number): SessionSource {
  const session = candidate.sessions[sessionIndex];
  const pages = [0, 1, 2].map((pageIndex) => ({
    kind: candidate.locales.ru.sessions[sessionIndex][3][pageIndex][0],
    title: localized(
      (locale) => candidate.locales[locale].sessions[sessionIndex][3][pageIndex][1],
    ),
    body: localized(
      (locale) => candidate.locales[locale].sessions[sessionIndex][3][pageIndex][2],
    ),
    bodyRuns: localizedRuns(sessionIndex, pageIndex),
    question: {
      prompt: localized(
        (locale) => candidate.locales[locale].sessions[sessionIndex][3][pageIndex][3],
      ),
      choices: [0, 1, 2].map((choiceIndex) =>
        localized(
          (locale) =>
            candidate.locales[locale].sessions[sessionIndex][3][pageIndex][4][choiceIndex],
        ),
      ) as [LocalizedSource, LocalizedSource, LocalizedSource],
      correctChoiceIndex: candidate.locales.ru.sessions[sessionIndex][3][pageIndex][5] as
        | 0
        | 1
        | 2,
      explanation: localized(
        (locale) => candidate.locales[locale].sessions[sessionIndex][3][pageIndex][6],
      ),
    },
  })) as unknown as SessionSource['introPages'];
  return {
    packageId: 'learning-v2-en-v1',
    targetLanguage: 'en',
    episodeOrdinal: 1,
    requiredSessionOrdinal: session.ordinal,
    canDoOutcomeId: 'obj-e01-say-who-i-am',
    generationInputFingerprint: APPROVED_FIRST_TEN_CANDIDATE_SHA_V2,
    title: localized((locale) => candidate.locales[locale].sessions[sessionIndex][0]),
    summary: localized((locale) => candidate.locales[locale].sessions[sessionIndex][1]),
    learningGoal: localized(
      (locale) => candidate.locales[locale].sessions[sessionIndex][2],
    ),
    introPages: pages,
    phrases: session.practice.map((_, phraseIndex) =>
      buildPhrase(sessionIndex, phraseIndex),
    ),
  };
}

if (
  candidate.version !== 2 ||
  candidate.sessions.length !== 10 ||
  candidate.localeOrder.join('|') !== LOCALES.join('|')
) {
  throw new Error('approved_first_ten_candidate_shape_invalid');
}

export const APPROVED_FIRST_TEN_SESSION_SOURCES_V2: readonly SessionSource[] =
  Object.freeze(candidate.sessions.map((_, index) => buildSession(index)));

export const APPROVED_FIRST_TEN_PHRASE_SOURCES_V2: readonly (
  readonly EpisodeSourcePhrase[]
)[] = Object.freeze(
  APPROVED_FIRST_TEN_SESSION_SOURCES_V2.map((source) => source.phrases),
);
