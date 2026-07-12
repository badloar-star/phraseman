import { createHash } from 'node:crypto';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: '1' }),
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: any) => children }));
jest.mock('../components/AddToFlashcard', () => () => null);
jest.mock('../components/ContentWrap', () => ({ children }: any) => children);
jest.mock('../components/DuoPressable', () => ({ children }: any) => children);
jest.mock('../components/feedback/VictoryBurst', () => () => null);
jest.mock('../app/feedback/feedback_kit', () => ({ __esModule: true, default: {} }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru', s: { words: {} } }) }));
jest.mock('../components/StudyTargetContext', () => ({ useStudyTarget: () => ({ studyTarget: 'en' }) }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ theme: {}, f: {}, themeMode: 'dark' }) }));
jest.mock('../components/EnergyContext', () => ({ useEnergy: () => ({ energy: 10, isUnlimited: true }) }));
jest.mock('../components/NoEnergyModal', () => () => null);
jest.mock('../components/CoachToast', () => () => null);
jest.mock('../components/ReportErrorButton', () => () => null);
jest.mock('../components/ThemedConfirmModal', () => () => null);
jest.mock('../components/ScreenGradient', () => ({ children }: any) => children);
jest.mock('../hooks/use-screen', () => ({ useScreen: () => ({ isSmallScreen: false }) }));
jest.mock('../hooks/use-haptics', () => ({ hapticError: jest.fn(), hapticTap: jest.fn() }));
jest.mock('../hooks/use-flashcards', () => ({ loadFlashcards: jest.fn() }));
jest.mock('../hooks/use-audio', () => ({ useAudio: () => ({ speakAudio: jest.fn(), voiceOut: false, speechRate: 1 }) }));
jest.mock('../app/daily_tasks', () => ({ updateMultipleTaskProgress: jest.fn() }));
jest.mock('../app/settings_edu', () => ({ loadSettings: jest.fn() }));
jest.mock('../app/xp_manager', () => ({ registerXP: jest.fn() }));
jest.mock('../app/shards_system', () => ({ addShards: jest.fn() }));
jest.mock('../app/mistake_log', () => ({ logMistake: jest.fn() }));
jest.mock('../app/trainer_store', () => ({ activateWordForTrainer: jest.fn(), recordWordMistake: jest.fn() }));
jest.mock('../app/coach_toast_trigger', () => ({ checkCoachToastNeededWithAnalytics: jest.fn() }));
jest.mock('../app/stats_daily_breakdown', () => ({ bumpStatsDaily: jest.fn() }));
jest.mock('../app/lesson_premium_gate', () => ({ openLessonAccessGate: jest.fn(), openLessonGateByRuntime: jest.fn(), shouldBlockLessonAccess: jest.fn() }));
jest.mock('../app/vocabulary_target_gate', () => ({ vocabularyContentAvailableForTarget: jest.fn(() => true) }));

import { getLessonData } from '../app/lesson_data_all';
import { IRREGULAR_VERBS_BY_LESSON } from '../app/irregular_verbs_data';
import {
  LESSON_WORD_BANK_SENSE_EXCEPTIONS,
  lessonWordBankDiagnostics,
  lessonWordBankAuditState,
  lessonVocabularyCoverageCandidates,
  lessonVocabularyCoverageText,
  lessonWordBank,
} from '../app/lesson_words';
import {
  buildLessonWordBankCore,
  lessonWordSemanticKey,
  type LessonWordSenseException,
} from '../app/lesson_word_bank_builder';

type SyntheticWord = { en: string; pos: string; sense?: string };
const syntheticBuild = (
  raw: Record<number, SyntheticWord[]>,
  exceptions: readonly LessonWordSenseException[] = [],
) => buildLessonWordBankCore({ raw, canonicalize: (word) => ({ ...word, en: word.en.toLowerCase() }), isAllowed: () => true, exceptions });

type Classification = 'introduced_now' | 'known_before' | 'covered_irregular' | 'structural' | 'ambiguous' | 'missing';
type AmbiguousEntry = { lessonId: number; phraseId: string | number; surface: string; reason: string };
type Finding = { surface: string; classification: Classification };

const STRUCTURAL = new Set([
  'a', 'an', 'the', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs', 'this', 'that', 'these', 'those',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did', 'have', 'has', 'had',
  'can', 'could', 'may', 'might', 'must', 'shall', 'should', 'will', 'would', 'not', 'no', 'yes',
  'and', 'or', 'but', 'if', 'because', 'so', 'than', 'as', 'of', 'to', 'for', 'from', 'in', 'on', 'at', 'by', 'with', 'without',
  'about', 'into', 'over', 'under', 'up', 'down', 'off', 'out', 'back', 'away', 'there', 'here', 'then', 'now',
  'what', 'where', 'when', 'why', 'who', 'whom', 'whose', 'which', 'how', 'all', 'any', 'some', 'much', 'many', 'more', 'most',
  'very', 'too', 'also', 'just', 'only', 'still', 'already', 'yet', 'ever', 'never', 'again', 'really', 'please',
  'cannot', 'every', 'before', 'after', 'during', 'onto',
]);

const L16_CHUNKS = [
  'wake up', 'get up', 'put on', 'take off', 'turn on', 'turn off', 'look for', 'clean up', 'throw away', 'give back', 'find out', 'go back',
] as const;

// Every exception must be tied to one exact runtime phrase and must be consumed.
const AMBIGUOUS: AmbiguousEntry[] = [];

function expandContractions(text: string): string {
  return text
    .replace(/\b(i)'m\b/g, '$1 am')
    .replace(/\b(you|we|they)'re\b/g, '$1 are')
    .replace(/\b(he|she|it)'s\b/g, '$1 is')
    .replace(/\b(who|what|where|when|why|how)'s\b/g, '$1 is')
    .replace(/\b(can)'t\b/g, '$1 not')
    .replace(/\b(won)'t\b/g, 'will not')
    .replace(/\b([a-z]+)n't\b/g, '$1 not')
    .replace(/\b([a-z]+)'ll\b/g, '$1 will')
    .replace(/\b([a-z]+)'ve\b/g, '$1 have')
    .replace(/\b([a-z]+)'d\b/g, '$1 would');
}

function classifySurface(
  surface: string,
  introduced: ReadonlySet<string>,
  known: ReadonlySet<string>,
  irregularKnown: ReadonlySet<string>,
  ambiguous?: AmbiguousEntry,
): Finding {
  const candidates = lessonVocabularyCoverageCandidates(surface);
  // Structural and irregular surfaces are categorically outside lexical eligibility.
  if (STRUCTURAL.has(surface)) return { surface, classification: 'structural' };
  if (irregularKnown.has(surface)) return { surface, classification: 'covered_irregular' };
  const introducedExact = introduced.has(surface);
  const knownExact = known.has(surface);
  if ([introducedExact, knownExact, Boolean(ambiguous)].filter(Boolean).length > 1) {
    throw new Error(`Conflicting vocabulary statuses for ${surface}`);
  }
  // An exact curated surface is categorically excluded from morphology fallback.
  if (introducedExact) return { surface, classification: 'introduced_now' };
  if (knownExact) return { surface, classification: 'known_before' };
  const introducedMorph = candidates.filter((candidate) => introduced.has(candidate));
  const knownMorph = candidates.filter((candidate) => known.has(candidate));
  if ([introducedMorph.length > 0, knownMorph.length > 0, Boolean(ambiguous)].filter(Boolean).length > 1) {
    throw new Error(`Conflicting vocabulary statuses for ${surface}`);
  }
  if (introducedMorph.length) return { surface, classification: 'introduced_now' };
  if (knownMorph.length) return { surface, classification: 'known_before' };
  if (ambiguous) return { surface, classification: 'ambiguous' };
  return { surface, classification: 'missing' };
}

function consumePhraseSurfaces(text: string, chunks: readonly string[]): string[] {
  let remaining = expandContractions(lessonVocabularyCoverageText(text));
  const surfaces: string[] = [];
  for (const chunk of [...chunks].sort((a, b) => b.length - a.length)) {
    const normalizedChunk = lessonVocabularyCoverageText(chunk);
    if (remaining.includes(normalizedChunk)) {
      surfaces.push(normalizedChunk);
      remaining = remaining.replace(normalizedChunk, ' ');
    }
  }
  surfaces.push(...remaining.split(' ').filter(Boolean));
  return surfaces;
}

type RemovedRowEvidence = readonly [
  laterLesson: number,
  firstLesson: number,
  semanticKey: string,
  exactRowFingerprint: string,
];

function exactLessonWordRowFingerprint(word: object): string {
  return JSON.stringify(Object.fromEntries(
    Object.entries(word as Record<string, unknown>).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0),
  ));
}

function assertRemovedRowEvidence(
  audit: ReturnType<typeof lessonWordBankAuditState>,
  manifest: readonly RemovedRowEvidence[],
  label: string,
): void {
  for (const [laterLesson, firstLesson, semanticKey, expectedFingerprint] of manifest) {
    if (!expectedFingerprint) {
      throw new Error(`${label}: missing exact-row fingerprint for L${laterLesson} ${semanticKey}`);
    }
    const describeSameKey = (lessonId: number) => (audit.raw[lessonId] ?? [])
      .filter((word) => lessonWordSemanticKey(word.en, word.pos) === semanticKey)
      .map((word) => exactLessonWordRowFingerprint(word));
    const firstFingerprints = describeSameKey(firstLesson);
    if (!firstFingerprints.includes(expectedFingerprint)) {
      throw new Error([
        `${label}: exact source row is missing for L${laterLesson} ${semanticKey}`,
        `expected first=L${firstLesson}: ${expectedFingerprint}`,
        `actual same-key rows in L${firstLesson}: ${JSON.stringify(firstFingerprints)}`,
      ].join('\n'));
    }
    const laterFingerprints = describeSameKey(laterLesson);
    if (laterFingerprints.includes(expectedFingerprint)) {
      throw new Error([
        `${label}: exact removed row is still present in L${laterLesson} ${semanticKey}`,
        `unexpected fingerprint: ${expectedFingerprint}`,
        `actual same-key rows in L${laterLesson}: ${JSON.stringify(laterFingerprints)}`,
      ].join('\n'));
    }
  }
}

describe('lesson cumulative vocabulary coverage', () => {
  it('exports the exact raw rows used by runtime diagnostics for read-only cleanup audits', () => {
    const audit = lessonWordBankAuditState();
    const diagnostics = lessonWordBankDiagnostics();
    expect(Object.values(audit.raw).reduce((sum, rows) => sum + rows.length, 0))
      .toBe(diagnostics.reduce((sum, row) => sum + row.rawCount, 0));
    for (const row of diagnostics) expect(audit.raw[row.lessonId]).toHaveLength(row.rawCount);
    expect(audit.diagnostics).toEqual(diagnostics);
    expect(audit.runtime).toEqual(Object.fromEntries(Array.from({ length: 32 }, (_, i) => [i + 1, lessonWordBank(i + 1)])));
    const scopedRuntime = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i + 1, audit.runtime[i + 1]]));
    const scopedDiagnostics = audit.diagnostics.filter(({ lessonId }) => lessonId <= 8);
    // Intentional Task5a update: only L1-8 counters move; later lessons must not offset this contract.
    expect(createHash('sha256').update(JSON.stringify(scopedRuntime)).digest('hex'))
      .toBe('7a7393f47fc6d2e69cc8d04c151bea4a80e617e3110d9b351ff8ccbe8a74fa49');
    expect(scopedDiagnostics.reduce((sum, row) => sum + row.rawCount, 0)).toBe(357); // baseline 417 - 60
    expect(scopedDiagnostics.reduce((sum, row) => sum + row.duplicatesRemoved, 0)).toBe(37); // baseline 97 - 60
  });

  it('removes the explicit 60 proven L2-8 rows and retains the exact three audit exclusions', () => {
    const audit = lessonWordBankAuditState();
    const removed: readonly RemovedRowEvidence[] = [
      [2, 1, 'i::pronouns', "{\"en\":\"I\",\"es\":\"Yo\",\"pos\":\"pronouns\",\"ru\":\"Я\",\"uk\":\"Я\"}"], [2, 1, 'you::pronouns', "{\"en\":\"you\",\"es\":\"Tú / usted\",\"pos\":\"pronouns\",\"ru\":\"Ты / Вы\",\"uk\":\"Ти / Ви\"}"], [2, 1, 'he::pronouns', "{\"en\":\"he\",\"es\":\"Él\",\"pos\":\"pronouns\",\"ru\":\"Он\",\"uk\":\"Він\"}"], [2, 1, 'she::pronouns', "{\"en\":\"she\",\"es\":\"Ella\",\"pos\":\"pronouns\",\"ru\":\"Она\",\"uk\":\"Вона\"}"],
      [2, 1, 'we::pronouns', "{\"en\":\"we\",\"es\":\"Nosotros / nosotras\",\"pos\":\"pronouns\",\"ru\":\"Мы\",\"uk\":\"Ми\"}"], [2, 1, 'they::pronouns', "{\"en\":\"they\",\"es\":\"Ellos / ellas\",\"pos\":\"pronouns\",\"ru\":\"Они\",\"uk\":\"Вони\"}"], [2, 1, 'it::pronouns', "{\"en\":\"it\",\"es\":\"Eso / ello\",\"pos\":\"pronouns\",\"ru\":\"Это / Оно\",\"uk\":\"Це / Воно\"}"], [2, 1, 'here::adverbs', "{\"en\":\"here\",\"es\":\"aquí\",\"pos\":\"adverbs\",\"ru\":\"Здесь\",\"uk\":\"Тут\"}"],
      [2, 1, 'outside::adverbs', "{\"en\":\"outside\",\"es\":\"afuera\",\"pos\":\"adverbs\",\"ru\":\"Снаружи / На улице\",\"uk\":\"Зовні / Надворі\"}"], [2, 1, 'inside::adverbs', "{\"en\":\"inside\",\"es\":\"adentro\",\"pos\":\"adverbs\",\"ru\":\"Внутри\",\"uk\":\"Всередині\"}"], [2, 1, 'together::adverbs', "{\"en\":\"together\",\"es\":\"juntos\",\"pos\":\"adverbs\",\"ru\":\"Вместе\",\"uk\":\"Разом\"}"], [2, 1, 'ready::adjectives', "{\"en\":\"ready\",\"es\":\"listo\",\"pos\":\"adjectives\",\"ru\":\"Готовый\",\"uk\":\"Готовий\"}"],
      [2, 1, 'busy::adjectives', "{\"en\":\"busy\",\"es\":\"ocupado\",\"pos\":\"adjectives\",\"ru\":\"Занятый\",\"uk\":\"Зайнятий\"}"], [2, 1, 'calm::adjectives', "{\"en\":\"calm\",\"es\":\"tranquilo\",\"pos\":\"adjectives\",\"ru\":\"Спокойный\",\"uk\":\"Спокійний\"}"], [2, 1, 'happy::adjectives', "{\"en\":\"happy\",\"es\":\"feliz\",\"pos\":\"adjectives\",\"ru\":\"Счастливый\",\"uk\":\"Щасливий\"}"], [2, 1, 'important::adjectives', "{\"en\":\"important\",\"es\":\"importante\",\"pos\":\"adjectives\",\"ru\":\"Важный\",\"uk\":\"Важливий\"}"],
      [2, 1, 'okay::adjectives', "{\"en\":\"okay\",\"es\":\"bien\",\"pos\":\"adjectives\",\"ru\":\"В порядке (хорошо)\",\"uk\":\"В порядку (добре)\"}"], [2, 1, 'right::adjectives', "{\"en\":\"right\",\"es\":\"correcto\",\"pos\":\"adjectives\",\"ru\":\"Правый / Правильный\",\"uk\":\"Правий / Правильний\"}"], [2, 1, 'safe::adjectives', "{\"en\":\"safe\",\"es\":\"seguro\",\"pos\":\"adjectives\",\"ru\":\"В безопасности\",\"uk\":\"В безпеці\"}"], [2, 1, 'sick::adjectives', "{\"en\":\"sick\",\"es\":\"enfermo\",\"pos\":\"adjectives\",\"ru\":\"Больной\",\"uk\":\"Хворий\"}"],
      [2, 1, 'sad::adjectives', "{\"en\":\"sad\",\"es\":\"triste\",\"pos\":\"adjectives\",\"ru\":\"Грустный\",\"uk\":\"Сумний\"}"], [2, 1, 'late::adjectives', "{\"en\":\"late\",\"es\":\"tarde\",\"pos\":\"adjectives\",\"ru\":\"Поздний / Опаздывающий\",\"uk\":\"Пізній / Запізнілий\"}"], [2, 1, 'tired::adjectives', "{\"en\":\"tired\",\"es\":\"cansado\",\"pos\":\"adjectives\",\"ru\":\"Уставший\",\"uk\":\"Втомлений\"}"], [2, 1, 'hungry::adjectives', "{\"en\":\"hungry\",\"es\":\"hambriento\",\"pos\":\"adjectives\",\"ru\":\"Голодный\",\"uk\":\"Голодний\"}"],
      [2, 1, 'angry::adjectives', "{\"en\":\"angry\",\"es\":\"enojado\",\"pos\":\"adjectives\",\"ru\":\"Злой\",\"uk\":\"Злий\"}"], [2, 1, 'serious::adjectives', "{\"en\":\"serious\",\"es\":\"serio\",\"pos\":\"adjectives\",\"ru\":\"Серьёзный\",\"uk\":\"Серйозний\"}"],
      [3, 1, 'i::pronouns', "{\"en\":\"I\",\"es\":\"Yo\",\"pos\":\"pronouns\",\"ru\":\"Я\",\"uk\":\"Я\"}"], [3, 1, 'you::pronouns', "{\"en\":\"you\",\"es\":\"Tú / usted\",\"pos\":\"pronouns\",\"ru\":\"Ты / Вы\",\"uk\":\"Ти / Ви\"}"], [3, 1, 'he::pronouns', "{\"en\":\"he\",\"es\":\"Él\",\"pos\":\"pronouns\",\"ru\":\"Он\",\"uk\":\"Він\"}"], [3, 1, 'she::pronouns', "{\"en\":\"she\",\"es\":\"Ella\",\"pos\":\"pronouns\",\"ru\":\"Она\",\"uk\":\"Вона\"}"],
      [3, 1, 'we::pronouns', "{\"en\":\"we\",\"es\":\"Nosotros / nosotras\",\"pos\":\"pronouns\",\"ru\":\"Мы\",\"uk\":\"Ми\"}"], [3, 1, 'they::pronouns', "{\"en\":\"they\",\"es\":\"Ellos / ellas\",\"pos\":\"pronouns\",\"ru\":\"Они\",\"uk\":\"Вони\"}"], [3, 1, 'it::pronouns', "{\"en\":\"it\",\"es\":\"Eso / ello\",\"pos\":\"pronouns\",\"ru\":\"Это / Оно\",\"uk\":\"Це / Воно\"}"], [3, 1, 'here::adverbs', "{\"en\":\"here\",\"es\":\"aquí\",\"pos\":\"adverbs\",\"ru\":\"Здесь\",\"uk\":\"Тут\"}"],
      [4, 3, 'listen::verbs', "{\"en\":\"listen\",\"es\":\"escuchar\",\"pos\":\"verbs\",\"ru\":\"Слушать\",\"uk\":\"Слухати\"}"], [4, 3, 'understand::verbs', "{\"en\":\"understand\",\"es\":\"entender\",\"pos\":\"verbs\",\"ru\":\"Понимать\",\"uk\":\"Розуміти\"}"], [4, 3, 'live::verbs', "{\"en\":\"live\",\"es\":\"vivir\",\"pos\":\"verbs\",\"ru\":\"Жить\",\"uk\":\"Жити\"}"], [4, 3, 'work::verbs', "{\"en\":\"work\",\"es\":\"trabajar\",\"pos\":\"verbs\",\"ru\":\"Работать\",\"uk\":\"Працювати\"}"],
      [4, 3, 'know::verbs', "{\"en\":\"know\",\"es\":\"saber / conocer\",\"pos\":\"verbs\",\"ru\":\"Знать\",\"uk\":\"Знати\"}"], [4, 3, 'remember::verbs', "{\"en\":\"remember\",\"es\":\"recordar\",\"pos\":\"verbs\",\"ru\":\"Помнить\",\"uk\":\"Пам'ятати\"}"], [4, 3, 'buy::verbs', "{\"en\":\"buy\",\"es\":\"comprar\",\"pos\":\"verbs\",\"ru\":\"Покупать\",\"uk\":\"Купувати\"}"], [4, 3, 'wear::verbs', "{\"en\":\"wear\",\"es\":\"llevar / usar\",\"pos\":\"verbs\",\"ru\":\"Носить (одежду)\",\"uk\":\"Носити (одяг)\"}"],
      [4, 3, 'forget::verbs', "{\"en\":\"forget\",\"es\":\"olvidar\",\"pos\":\"verbs\",\"ru\":\"Забывать\",\"uk\":\"Забувати\"}"], [4, 3, 'help::verbs', "{\"en\":\"help\",\"es\":\"ayudar\",\"pos\":\"verbs\",\"ru\":\"Помогать\",\"uk\":\"Допомагати\"}"], [4, 3, 'read::verbs', "{\"en\":\"read\",\"es\":\"leer\",\"pos\":\"verbs\",\"ru\":\"Читать\",\"uk\":\"Читати\"}"], [4, 3, 'trust::verbs', "{\"en\":\"trust\",\"es\":\"confiar\",\"pos\":\"verbs\",\"ru\":\"Доверять\",\"uk\":\"Довіряти\"}"], [4, 3, 'cook::verbs', "{\"en\":\"cook\",\"es\":\"cocinar\",\"pos\":\"verbs\",\"ru\":\"Готовить\",\"uk\":\"Готувати\"}"],
      [6, 3, 'cost::verbs', "{\"en\":\"cost\",\"es\":\"costar\",\"pos\":\"verbs\",\"ru\":\"Стоить\",\"uk\":\"Коштувати\"}"], [6, 3, 'wait::verbs', "{\"en\":\"wait\",\"es\":\"esperar\",\"pos\":\"verbs\",\"ru\":\"Ждать\",\"uk\":\"Чекати\"}"], [6, 4, 'see::verbs', "{\"en\":\"see\",\"es\":\"ver\",\"pos\":\"verbs\",\"ru\":\"Видеть\",\"uk\":\"Бачити\"}"], [6, 4, 'check::verbs', "{\"en\":\"check\",\"es\":\"revisar\",\"pos\":\"verbs\",\"ru\":\"Проверять\",\"uk\":\"Перевіряти\"}"],
      [6, 3, 'speak::verbs', "{\"en\":\"speak\",\"es\":\"hablar\",\"pos\":\"verbs\",\"ru\":\"Говорить\",\"uk\":\"Говорити\"}"], [6, 3, 'dinner::nouns', "{\"en\":\"dinner\",\"es\":\"cena\",\"pos\":\"nouns\",\"ru\":\"Ужин\",\"uk\":\"Вечеря\"}"],
      [7, 3, 'time::nouns', "{\"en\":\"time\",\"es\":\"tiempo\",\"pos\":\"nouns\",\"ru\":\"Время\",\"uk\":\"Час\"}"], [7, 3, 'good::adjectives', "{\"en\":\"good\",\"es\":\"bueno\",\"pos\":\"adjectives\",\"ru\":\"Хороший\",\"uk\":\"Гарний\"}"], [7, 3, 'coffee::nouns', "{\"en\":\"coffee\",\"es\":\"café\",\"pos\":\"nouns\",\"ru\":\"Кофе\",\"uk\":\"Кава\"}"],
      [8, 3, 'music::nouns', "{\"en\":\"music\",\"es\":\"música\",\"pos\":\"nouns\",\"ru\":\"Музыка\",\"uk\":\"Музика\"}"], [8, 3, 'pizza::nouns', "{\"en\":\"pizza\",\"es\":\"pizza\",\"pos\":\"nouns\",\"ru\":\"Пицца\",\"uk\":\"Піца\"}"], [8, 3, 'tea::nouns', "{\"en\":\"tea\",\"es\":\"té\",\"pos\":\"nouns\",\"ru\":\"Чай\",\"uk\":\"Чай\"}"], [8, 3, 'travel::verbs', "{\"en\":\"travel\",\"es\":\"viajar\",\"pos\":\"verbs\",\"ru\":\"Путешествовать\",\"uk\":\"Подорожувати\"}"],
    ];
    expect(removed).toHaveLength(60);
    assertRemovedRowEvidence(audit, removed, 'Task5a L1-8');

    const retained = [
      { laterLesson: 4, firstLesson: 3, semanticKey: 'watch::verbs', reason: 'legacy_alias_dependency' },
      { laterLesson: 6, firstLesson: 3, semanticKey: 'call::verbs', reason: 'gloss_or_sense_not_proven_equal' },
      { laterLesson: 7, firstLesson: 6, semanticKey: 'key::nouns', reason: 'legacy_alias_dependency' },
    ] as const;
    for (const { laterLesson, firstLesson, semanticKey } of retained) {
      expect((audit.raw[laterLesson] ?? []).some((word) => lessonWordSemanticKey(word.en, word.pos) === semanticKey)).toBe(true);
      expect((audit.raw[firstLesson] ?? []).some((word) => lessonWordSemanticKey(word.en, word.pos) === semanticKey)).toBe(true);
    }
    expect(retained.map(({ laterLesson, semanticKey, reason }) => ({ laterLesson, semanticKey, reason }))).toEqual([
      { laterLesson: 4, semanticKey: 'watch::verbs', reason: 'legacy_alias_dependency' },
      { laterLesson: 6, semanticKey: 'call::verbs', reason: 'gloss_or_sense_not_proven_equal' },
      { laterLesson: 7, semanticKey: 'key::nouns', reason: 'legacy_alias_dependency' },
    ]);
  });

  it('removes every individually proven Task5b L9-16 row while retaining the non-identical food gloss', () => {
    const manifest: readonly RemovedRowEvidence[] = [
      [10, 6, 'finish::verbs', "{\"en\":\"finish\",\"es\":\"terminar\",\"pos\":\"verbs\",\"ru\":\"Заканчивать\",\"uk\":\"Закінчувати\"}"],[10, 5, 'study::verbs', "{\"en\":\"study\",\"es\":\"estudiar\",\"pos\":\"verbs\",\"ru\":\"Учиться / Изучать\",\"uk\":\"Вчитися / Вивчати\"}"],[10, 6, 'report::nouns', "{\"en\":\"report\",\"es\":\"informe\",\"pos\":\"nouns\",\"ru\":\"Отчёт\",\"uk\":\"Звіт\"}"],[10, 6, 'luggage::nouns', "{\"en\":\"luggage\",\"es\":\"equipaje\",\"pos\":\"nouns\",\"ru\":\"Багаж\",\"uk\":\"Багаж\"}"],[10, 9, 'email::nouns', "{\"en\":\"email\",\"es\":\"correo electrónico\",\"pos\":\"nouns\",\"ru\":\"Электронное письмо\",\"uk\":\"Електронний лист\"}"],
      [11, 8, 'two::nouns', "{\"en\":\"two\",\"es\":\"dos\",\"pos\":\"nouns\",\"ru\":\"Два\",\"uk\":\"Два\"}"],[11, 8, 'five::nouns', "{\"en\":\"five\",\"es\":\"cinco\",\"pos\":\"nouns\",\"ru\":\"Пять\",\"uk\":\"П'ять\"}"],[11, 8, 'ten::nouns', "{\"en\":\"ten\",\"es\":\"diez\",\"pos\":\"nouns\",\"ru\":\"Десять\",\"uk\":\"Десять\"}"],[11, 6, 'close::verbs', "{\"en\":\"close\",\"es\":\"cerrar\",\"pos\":\"verbs\",\"ru\":\"Закрывать\",\"uk\":\"Закривати\"}"],[11, 10, 'water::verbs', "{\"en\":\"water\",\"es\":\"regar\",\"pos\":\"verbs\",\"ru\":\"Поливать\",\"uk\":\"Поливати\"}"],
      [11, 6, 'door::nouns', "{\"en\":\"door\",\"es\":\"puerta\",\"pos\":\"nouns\",\"ru\":\"Дверь\",\"uk\":\"Двері\"}"],[11, 3, 'dinner::nouns', "{\"en\":\"dinner\",\"es\":\"cena\",\"pos\":\"nouns\",\"ru\":\"Ужин\",\"uk\":\"Вечеря\"}"],[11, 10, 'computer::nouns', "{\"en\":\"computer\",\"es\":\"ordenador\",\"pos\":\"nouns\",\"ru\":\"Компьютер\",\"uk\":\"Комп'ютер\"}"],[11, 9, 'email::nouns', "{\"en\":\"email\",\"es\":\"correo electrónico\",\"pos\":\"nouns\",\"ru\":\"Электронное письмо\",\"uk\":\"Електронний лист\"}"],[11, 10, 'password::nouns', "{\"en\":\"password\",\"es\":\"contraseña\",\"pos\":\"nouns\",\"ru\":\"Пароль\",\"uk\":\"Пароль\"}"],
      [11, 6, 'report::nouns', "{\"en\":\"report\",\"es\":\"informe\",\"pos\":\"nouns\",\"ru\":\"Отчёт\",\"uk\":\"Звіт\"}"],[11, 7, 'hotel::nouns', "{\"en\":\"hotel\",\"es\":\"hotel\",\"pos\":\"nouns\",\"ru\":\"Отель\",\"uk\":\"Готель\"}"],[11, 6, 'meeting::nouns', "{\"en\":\"meeting\",\"es\":\"reunión\",\"pos\":\"nouns\",\"ru\":\"Встреча\",\"uk\":\"Зустріч\"}"],[11, 3, 'pizza::nouns', "{\"en\":\"pizza\",\"es\":\"pizza\",\"pos\":\"nouns\",\"ru\":\"Пицца\",\"uk\":\"Піца\"}"],[11, 3, 'good::adjectives', "{\"en\":\"good\",\"es\":\"bueno\",\"pos\":\"adjectives\",\"ru\":\"Хороший\",\"uk\":\"Гарний\"}"],
      [12, 9, 'useful::adjectives', "{\"en\":\"useful\",\"es\":\"útil\",\"pos\":\"adjectives\",\"ru\":\"Полезный\",\"uk\":\"Корисний\"}"],[12, 11, 'long::adjectives', "{\"en\":\"long\",\"es\":\"largo\",\"pos\":\"adjectives\",\"ru\":\"Длинный\",\"uk\":\"Довгий\"}"],[13, 3, 'help::verbs', "{\"en\":\"help\",\"es\":\"ayudar\",\"pos\":\"verbs\",\"ru\":\"Помогать\",\"uk\":\"Допомагати\"}"],[13, 4, 'send::verbs', "{\"en\":\"send\",\"es\":\"enviar\",\"pos\":\"verbs\",\"ru\":\"Отправлять\",\"uk\":\"Надсилати\"}"],[13, 3, 'cook::verbs', "{\"en\":\"cook\",\"es\":\"cocinar\",\"pos\":\"verbs\",\"ru\":\"Готовить\",\"uk\":\"Готувати\"}"],
      [13, 5, 'sing::verbs', "{\"en\":\"sing\",\"es\":\"cantar\",\"pos\":\"verbs\",\"ru\":\"Петь\",\"uk\":\"Співати\"}"],[13, 5, 'tomorrow::adverbs', "{\"en\":\"tomorrow\",\"es\":\"mañana\",\"pos\":\"adverbs\",\"ru\":\"Завтра\",\"uk\":\"Завтра\"}"],[13, 10, 'later::adverbs', "{\"en\":\"later\",\"es\":\"después / más tarde\",\"pos\":\"adverbs\",\"ru\":\"Позже\",\"uk\":\"Пізніше\"}"],[13, 4, 'cash::nouns', "{\"en\":\"cash\",\"es\":\"efectivo\",\"pos\":\"nouns\",\"ru\":\"Наличные\",\"uk\":\"Готівка\"}"],
      [13, 7, 'plan::nouns', "{\"en\":\"plan\",\"es\":\"plan\",\"pos\":\"nouns\",\"ru\":\"План\",\"uk\":\"План\"}"],[13, 8, 'rent::nouns', "{\"en\":\"rent\",\"es\":\"alquiler\",\"pos\":\"nouns\",\"ru\":\"Аренда\",\"uk\":\"Оренда\"}"],[13, 3, 'dinner::nouns', "{\"en\":\"dinner\",\"es\":\"cena\",\"pos\":\"nouns\",\"ru\":\"Ужин\",\"uk\":\"Вечеря\"}"],[13, 12, 'early::adverbs', "{\"en\":\"early\",\"es\":\"temprano\",\"pos\":\"adverbs\",\"ru\":\"Рано\",\"uk\":\"Рано\"}"],[14, 5, 'job::nouns', "{\"en\":\"job\",\"es\":\"trabajo\",\"pos\":\"nouns\",\"ru\":\"Работа\",\"uk\":\"Робота\"}"],
      [15, 7, 'phone::nouns', "{\"en\":\"phone\",\"es\":\"teléfono\",\"pos\":\"nouns\",\"ru\":\"Телефон\",\"uk\":\"Телефон\"}"],[15, 7, 'passport::nouns', "{\"en\":\"passport\",\"es\":\"pasaporte\",\"pos\":\"nouns\",\"ru\":\"Паспорт\",\"uk\":\"Паспорт\"}"],[15, 14, 'answer::nouns', "{\"en\":\"answer\",\"es\":\"respuesta\",\"pos\":\"nouns\",\"ru\":\"Ответ\",\"uk\":\"Відповідь\"}"],[15, 1, 'ready::adjectives', "{\"en\":\"ready\",\"es\":\"listo\",\"pos\":\"adjectives\",\"ru\":\"Готовый\",\"uk\":\"Готовий\"}"],[15, 1, 'here::adverbs', "{\"en\":\"here\",\"es\":\"aquí\",\"pos\":\"adverbs\",\"ru\":\"Здесь\",\"uk\":\"Тут\"}"],
      [16, 8, 'noon::nouns', "{\"en\":\"noon\",\"es\":\"mediodía\",\"pos\":\"nouns\",\"ru\":\"Полдень\",\"uk\":\"Полудень\"}"],[16, 12, 'early::adverbs', "{\"en\":\"early\",\"es\":\"temprano\",\"pos\":\"adverbs\",\"ru\":\"Рано\",\"uk\":\"Рано\"}"],[16, 6, 'now::adverbs', "{\"en\":\"now\",\"es\":\"ahora\",\"pos\":\"adverbs\",\"ru\":\"Сейчас\",\"uk\":\"Зараз\"}"],[16, 11, 'yesterday::adverbs', "{\"en\":\"yesterday\",\"es\":\"ayer\",\"pos\":\"adverbs\",\"ru\":\"Вчера\",\"uk\":\"Вчора\"}"],
      [16, 11, 'this morning::adverbs', "{\"en\":\"this morning\",\"es\":\"esta mañana\",\"pos\":\"adverbs\",\"ru\":\"Сегодня утром\",\"uk\":\"Сьогодні вранці\"}"],[16, 11, 'last week::adverbs', "{\"en\":\"last week\",\"es\":\"la semana pasada\",\"pos\":\"adverbs\",\"ru\":\"На прошлой неделе\",\"uk\":\"Минулого тижня\"}"],
    ];
    expect(manifest).toHaveLength(45);
    const baseline = lessonWordBankAuditState();
    assertRemovedRowEvidence(baseline, manifest, 'Task5b L9-16');
    expect(baseline.raw[13].find((word) => lessonWordSemanticKey(word.en, word.pos) === 'food::nouns')).toMatchObject({
      en: 'food', uk: 'їжа', pos: 'nouns',
    });
    expect(baseline.raw[3].find((word) => lessonWordSemanticKey(word.en, word.pos) === 'food::nouns')).toMatchObject({
      en: 'food', uk: 'Їжа', pos: 'nouns',
    });
    const scopedRuntime = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i + 9, baseline.runtime[i + 9]]));
    const scopedDiagnostics = baseline.diagnostics.filter(({ lessonId }) => lessonId >= 9 && lessonId <= 16);
    expect({
      hash: createHash('sha256').update(JSON.stringify(scopedRuntime)).digest('hex'),
      raw: scopedDiagnostics.reduce((sum, row) => sum + row.rawCount, 0),
      duplicates: scopedDiagnostics.reduce((sum, row) => sum + row.duplicatesRemoved, 0),
    }).toEqual({ hash: 'b6d6c97ad34c01164a0b85c322986c1fe8ce51c3e9815563f5b9051782011550', raw: 430, duplicates: 129 });
  });

  it('removes every individually proven Task5c L17-24 row', () => {
    const manifest: readonly RemovedRowEvidence[] = [
      [17, 3, "work::verbs", "{\"en\":\"work\",\"es\":\"trabajar\",\"pos\":\"verbs\",\"ru\":\"Работать\",\"uk\":\"Працювати\"}"],[17, 3, "read::verbs", "{\"en\":\"read\",\"es\":\"leer\",\"pos\":\"verbs\",\"ru\":\"Читать\",\"uk\":\"Читати\"}"],[17, 3, "cook::verbs", "{\"en\":\"cook\",\"es\":\"cocinar\",\"pos\":\"verbs\",\"ru\":\"Готовить\",\"uk\":\"Готувати\"}"],[17, 3, "write::verbs", "{\"en\":\"write\",\"es\":\"escribir\",\"pos\":\"verbs\",\"ru\":\"Писать\",\"uk\":\"Писати\"}"],[17, 3, "wait::verbs", "{\"en\":\"wait\",\"es\":\"esperar\",\"pos\":\"verbs\",\"ru\":\"Ждать\",\"uk\":\"Чекати\"}"],
      [17, 3, "listen::verbs", "{\"en\":\"listen\",\"es\":\"escuchar\",\"pos\":\"verbs\",\"ru\":\"Слушать\",\"uk\":\"Слухати\"}"],[17, 3, "speak::verbs", "{\"en\":\"speak\",\"es\":\"hablar\",\"pos\":\"verbs\",\"ru\":\"Говорить\",\"uk\":\"Говорити\"}"],[17, 4, "check::verbs", "{\"en\":\"check\",\"es\":\"revisar\",\"pos\":\"verbs\",\"ru\":\"Проверять\",\"uk\":\"Перевіряти\"}"],[17, 4, "send::verbs", "{\"en\":\"send\",\"es\":\"enviar\",\"pos\":\"verbs\",\"ru\":\"Отправлять\",\"uk\":\"Надсилати\"}"],[17, 3, "buy::verbs", "{\"en\":\"buy\",\"es\":\"comprar\",\"pos\":\"verbs\",\"ru\":\"Покупать\",\"uk\":\"Купувати\"}"],
      [17, 3, "help::verbs", "{\"en\":\"help\",\"es\":\"ayudar\",\"pos\":\"verbs\",\"ru\":\"Помогать\",\"uk\":\"Допомагати\"}"],[17, 4, "do::verbs", "{\"en\":\"do\",\"es\":\"hacer\",\"pos\":\"verbs\",\"ru\":\"Делать\",\"uk\":\"Робити\"}"],[17, 6, "cry::verbs", "{\"en\":\"cry\",\"es\":\"llorar\",\"pos\":\"verbs\",\"ru\":\"Плакать\",\"uk\":\"Плакати\"}"],[17, 16, "turn off::verbs", "{\"en\":\"turn off\",\"es\":\"apagar\",\"pos\":\"verbs\",\"ru\":\"Выключать\",\"uk\":\"Вимикати\"}"],[17, 16, "put on::verbs", "{\"en\":\"put on\",\"es\":\"ponerse\",\"pos\":\"verbs\",\"ru\":\"Надевать\",\"uk\":\"Надягати\"}"],
      [17, 6, "now::adverbs", "{\"en\":\"now\",\"es\":\"ahora\",\"pos\":\"adverbs\",\"ru\":\"Сейчас\",\"uk\":\"Зараз\"}"],[17, 10, "today::adverbs", "{\"en\":\"today\",\"es\":\"hoy\",\"pos\":\"adverbs\",\"ru\":\"Сегодня\",\"uk\":\"Сьогодні\"}"],[17, 3, "well::adverbs", "{\"en\":\"well\",\"es\":\"bien\",\"pos\":\"adverbs\",\"ru\":\"Хорошо\",\"uk\":\"Добре\"}"],[17, 3, "music::nouns", "{\"en\":\"music\",\"es\":\"música\",\"pos\":\"nouns\",\"ru\":\"Музыка\",\"uk\":\"Музика\"}"],[17, 3, "tv::nouns", "{\"en\":\"TV\",\"es\":\"televisión\",\"pos\":\"nouns\",\"ru\":\"Телевизор\",\"uk\":\"Телевізор\"}"],
      [18, 3, "wait::verbs", "{\"en\":\"wait\",\"es\":\"esperar\",\"pos\":\"verbs\",\"ru\":\"Ждать\",\"uk\":\"Чекати\"}"],[18, 3, "help::verbs", "{\"en\":\"help\",\"es\":\"ayudar\",\"pos\":\"verbs\",\"ru\":\"Помогать\",\"uk\":\"Допомагати\"}"],[18, 4, "check::verbs", "{\"en\":\"check\",\"es\":\"revisar\",\"pos\":\"verbs\",\"ru\":\"Проверять\",\"uk\":\"Перевіряти\"}"],[18, 4, "send::verbs", "{\"en\":\"send\",\"es\":\"enviar\",\"pos\":\"verbs\",\"ru\":\"Отправлять\",\"uk\":\"Надсилати\"}"],[18, 6, "open::verbs", "{\"en\":\"open\",\"es\":\"abrir\",\"pos\":\"verbs\",\"ru\":\"Открывать\",\"uk\":\"Відкривати\"}"],
      [18, 6, "close::verbs", "{\"en\":\"close\",\"es\":\"cerrar\",\"pos\":\"verbs\",\"ru\":\"Закрывать\",\"uk\":\"Закривати\"}"],[18, 6, "start::verbs", "{\"en\":\"start\",\"es\":\"empezar\",\"pos\":\"verbs\",\"ru\":\"Начинать\",\"uk\":\"Починати\"}"],[18, 3, "listen::verbs", "{\"en\":\"listen\",\"es\":\"escuchar\",\"pos\":\"verbs\",\"ru\":\"Слушать\",\"uk\":\"Слухати\"}"],[18, 4, "share::verbs", "{\"en\":\"share\",\"es\":\"compartir\",\"pos\":\"verbs\",\"ru\":\"Делиться\",\"uk\":\"Ділитися\"}"],[18, 4, "waste::verbs", "{\"en\":\"waste\",\"es\":\"desperdiciar\",\"pos\":\"verbs\",\"ru\":\"Тратить зря\",\"uk\":\"Витрачати даремно\"}"],
      [18, 6, "finish::verbs", "{\"en\":\"finish\",\"es\":\"terminar\",\"pos\":\"verbs\",\"ru\":\"Заканчивать\",\"uk\":\"Закінчувати\"}"],[18, 3, "work::verbs", "{\"en\":\"work\",\"es\":\"trabajar\",\"pos\":\"verbs\",\"ru\":\"Работать\",\"uk\":\"Працювати\"}"],[18, 1, "together::adverbs", "{\"en\":\"together\",\"es\":\"juntos\",\"pos\":\"adverbs\",\"ru\":\"Вместе\",\"uk\":\"Разом\"}"],[18, 6, "door::nouns", "{\"en\":\"door\",\"es\":\"puerta\",\"pos\":\"nouns\",\"ru\":\"Дверь\",\"uk\":\"Двері\"}"],[18, 14, "option::nouns", "{\"en\":\"option\",\"es\":\"opción\",\"pos\":\"nouns\",\"ru\":\"Вариант\",\"uk\":\"Варіант\"}"],
      [18, 3, "time::nouns", "{\"en\":\"time\",\"es\":\"tiempo\",\"pos\":\"nouns\",\"ru\":\"Время\",\"uk\":\"Час\"}"],[18, 4, "cash::nouns", "{\"en\":\"cash\",\"es\":\"efectivo\",\"pos\":\"nouns\",\"ru\":\"Наличные\",\"uk\":\"Готівка\"}"],[19, 9, "bed::nouns", "{\"en\":\"bed\",\"es\":\"cama\",\"pos\":\"nouns\",\"ru\":\"Кровать\",\"uk\":\"Ліжко\"}"],[19, 6, "door::nouns", "{\"en\":\"door\",\"es\":\"puerta\",\"pos\":\"nouns\",\"ru\":\"Дверь\",\"uk\":\"Двері\"}"],[19, 9, "house::nouns", "{\"en\":\"house\",\"es\":\"casa\",\"pos\":\"nouns\",\"ru\":\"Дом\",\"uk\":\"Будинок\"}"],
      [19, 6, "shop::nouns", "{\"en\":\"shop\",\"es\":\"tienda\",\"pos\":\"nouns\",\"ru\":\"Магазин\",\"uk\":\"Магазин\"}"],[19, 7, "hotel::nouns", "{\"en\":\"hotel\",\"es\":\"hotel\",\"pos\":\"nouns\",\"ru\":\"Отель\",\"uk\":\"Готель\"}"],[19, 7, "passport::nouns", "{\"en\":\"passport\",\"es\":\"pasaporte\",\"pos\":\"nouns\",\"ru\":\"Паспорт\",\"uk\":\"Паспорт\"}"],[20, 7, "passport::nouns", "{\"en\":\"passport\",\"es\":\"pasaporte\",\"pos\":\"nouns\",\"ru\":\"Паспорт\",\"uk\":\"Паспорт\"}"],[20, 7, "idea::nouns", "{\"en\":\"idea\",\"es\":\"idea\",\"pos\":\"nouns\",\"ru\":\"Идея\",\"uk\":\"Ідея\"}"],
      [20, 11, "man::nouns", "{\"en\":\"man\",\"es\":\"hombre\",\"pos\":\"nouns\",\"ru\":\"Мужчина\",\"uk\":\"Чоловік\"}"],[20, 14, "option::nouns", "{\"en\":\"option\",\"es\":\"opción\",\"pos\":\"nouns\",\"ru\":\"Вариант\",\"uk\":\"Варіант\"}"],[20, 3, "coffee::nouns", "{\"en\":\"coffee\",\"es\":\"café\",\"pos\":\"nouns\",\"ru\":\"Кофе\",\"uk\":\"Кава\"}"],[20, 3, "money::nouns", "{\"en\":\"money\",\"es\":\"dinero\",\"pos\":\"nouns\",\"ru\":\"Деньги\",\"uk\":\"Гроші\"}"],[20, 3, "food::nouns", "{\"en\":\"food\",\"es\":\"comida\",\"pos\":\"nouns\",\"ru\":\"Еда\",\"uk\":\"Їжа\"}"],
      [21, 12, "strange::adjectives", "{\"en\":\"strange\",\"es\":\"extraño\",\"pos\":\"adjectives\",\"ru\":\"Странный\",\"uk\":\"Дивний\"}"],[21, 1, "ready::adjectives", "{\"en\":\"ready\",\"es\":\"listo\",\"pos\":\"adjectives\",\"ru\":\"Готовый\",\"uk\":\"Готовий\"}"],[21, 2, "sure::adjectives", "{\"en\":\"sure\",\"es\":\"seguro\",\"pos\":\"adjectives\",\"ru\":\"Уверенный\",\"uk\":\"Впевнений\"}"],[21, 10, "explain::verbs", "{\"en\":\"explain\",\"es\":\"explicar\",\"pos\":\"verbs\",\"ru\":\"Объяснять\",\"uk\":\"Пояснювати\"}"],[22, 6, "finish::verbs", "{\"en\":\"finish\",\"es\":\"terminar\",\"pos\":\"verbs\",\"ru\":\"Заканчивать\",\"uk\":\"Закінчувати\"}"],
      [22, 2, "dangerous::adjectives", "{\"en\":\"dangerous\",\"es\":\"peligroso\",\"pos\":\"adjectives\",\"ru\":\"Опасный\",\"uk\":\"Небезпечний\"}"],[22, 4, "cash::nouns", "{\"en\":\"cash\",\"es\":\"efectivo\",\"pos\":\"nouns\",\"ru\":\"Наличные\",\"uk\":\"Готівка\"}"],[22, 3, "food::nouns", "{\"en\":\"food\",\"es\":\"comida\",\"pos\":\"nouns\",\"ru\":\"Еда\",\"uk\":\"Їжа\"}"],[23, 10, "password::nouns", "{\"en\":\"password\",\"es\":\"contraseña\",\"pos\":\"nouns\",\"ru\":\"Пароль\",\"uk\":\"Пароль\"}"],[23, 7, "plan::nouns", "{\"en\":\"plan\",\"es\":\"plan\",\"pos\":\"nouns\",\"ru\":\"План\",\"uk\":\"План\"}"],
      [23, 3, "often::adverbs", "{\"en\":\"often\",\"es\":\"a menudo\",\"pos\":\"adverbs\",\"ru\":\"Часто\",\"uk\":\"Часто\"}"],[23, 4, "send::verbs", "{\"en\":\"send\",\"es\":\"enviar\",\"pos\":\"verbs\",\"ru\":\"Отправлять\",\"uk\":\"Надсилати\"}"],[23, 4, "sell::verbs", "{\"en\":\"sell\",\"es\":\"vender\",\"pos\":\"verbs\",\"ru\":\"Продавать\",\"uk\":\"Продавати\"}"],[24, 10, "password::nouns", "{\"en\":\"password\",\"es\":\"contraseña\",\"pos\":\"nouns\",\"ru\":\"Пароль\",\"uk\":\"Пароль\"}"],[24, 14, "option::nouns", "{\"en\":\"option\",\"es\":\"opción\",\"pos\":\"nouns\",\"ru\":\"Вариант\",\"uk\":\"Варіант\"}"],
      [24, 7, "phone::nouns", "{\"en\":\"phone\",\"es\":\"teléfono\",\"pos\":\"nouns\",\"ru\":\"Телефон\",\"uk\":\"Телефон\"}"],[24, 3, "dinner::nouns", "{\"en\":\"dinner\",\"es\":\"cena\",\"pos\":\"nouns\",\"ru\":\"Ужин\",\"uk\":\"Вечеря\"}"],[24, 4, "see::verbs", "{\"en\":\"see\",\"es\":\"ver\",\"pos\":\"verbs\",\"ru\":\"Видеть\",\"uk\":\"Бачити\"}"],[24, 3, "buy::verbs", "{\"en\":\"buy\",\"es\":\"comprar\",\"pos\":\"verbs\",\"ru\":\"Покупать\",\"uk\":\"Купувати\"}"],[24, 4, "lose::verbs", "{\"en\":\"lose\",\"es\":\"perder\",\"pos\":\"verbs\",\"pt-BR\":\"Perder\",\"ru\":\"Терять\",\"uk\":\"Втрачати\"}"],
    ];
    expect(manifest).toHaveLength(70);
    const baseline = lessonWordBankAuditState();
    assertRemovedRowEvidence(baseline, manifest, 'Task5c L17-24');
    const scopedRuntime = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i + 17, baseline.runtime[i + 17]]));
    const scopedDiagnostics = baseline.diagnostics.filter(({ lessonId }) => lessonId >= 17 && lessonId <= 24);
    expect({
      hash: createHash('sha256').update(JSON.stringify(scopedRuntime)).digest('hex'),
      raw: scopedDiagnostics.reduce((sum, row) => sum + row.rawCount, 0),
      duplicates: scopedDiagnostics.reduce((sum, row) => sum + row.duplicatesRemoved, 0),
    }).toEqual({ hash: '02dc9b903e47dc9f7ce9223d8b224e9519bfb20238e2b99476d93257cde1c2ee', raw: 199, duplicates: 112 });
  });


  it('removes every individually proven Task5d L25-32 row', () => {
    const manifest: readonly RemovedRowEvidence[] = [
      [25, 16, "at noon::adverbs", "{\"en\":\"at noon\",\"es\":\"al mediodía\",\"pos\":\"adverbs\",\"ru\":\"В полдень\",\"uk\":\"Опівдні\"}"],[25, 10, "fast::adverbs", "{\"en\":\"fast\",\"es\":\"rápido\",\"pos\":\"adverbs\",\"ru\":\"Быстро\",\"uk\":\"Швидко\"}"],[25, 7, "phone::nouns", "{\"en\":\"phone\",\"es\":\"teléfono\",\"pos\":\"nouns\",\"ru\":\"Телефон\",\"uk\":\"Телефон\"}"],[25, 21, "knock::verbs", "{\"en\":\"knock\",\"es\":\"llamar (a la puerta)\",\"pos\":\"verbs\",\"ru\":\"Стучать\",\"uk\":\"Стукати\"}"],[26, 7, "news::nouns", "{\"en\":\"news\",\"es\":\"noticias\",\"pos\":\"nouns\",\"ru\":\"Новости\",\"uk\":\"Новини\"}"],
      [26, 8, "arrive::verbs", "{\"en\":\"arrive\",\"es\":\"llegar\",\"pos\":\"verbs\",\"ru\":\"Прибывать\",\"uk\":\"Прибувати\"}"],[27, 10, "explain::verbs", "{\"en\":\"explain\",\"es\":\"explicar\",\"pos\":\"verbs\",\"ru\":\"Объяснять\",\"uk\":\"Пояснювати\"}"],[27, 1, "ready::adjectives", "{\"en\":\"ready\",\"es\":\"listo\",\"pos\":\"adjectives\",\"ru\":\"Готовый\",\"uk\":\"Готовий\"}"],[27, 2, "dangerous::adjectives", "{\"en\":\"dangerous\",\"es\":\"peligroso\",\"pos\":\"adjectives\",\"ru\":\"Опасный\",\"uk\":\"Небезпечний\"}"],[27, 1, "important::adjectives", "{\"en\":\"important\",\"es\":\"importante\",\"pos\":\"adjectives\",\"ru\":\"Важный\",\"uk\":\"Важливий\"}"],
      [27, 13, "soon::adverbs", "{\"en\":\"soon\",\"es\":\"pronto\",\"pos\":\"adverbs\",\"ru\":\"Скоро\",\"uk\":\"Скоро\"}"],[27, 10, "password::nouns", "{\"en\":\"password\",\"es\":\"contraseña\",\"pos\":\"nouns\",\"ru\":\"Пароль\",\"uk\":\"Пароль\"}"],[27, 6, "meeting::nouns", "{\"en\":\"meeting\",\"es\":\"reunión\",\"pos\":\"nouns\",\"ru\":\"Встреча\",\"uk\":\"Зустріч\"}"],[27, 21, "nothing::pronouns", "{\"en\":\"nothing\",\"es\":\"nada\",\"pos\":\"pronouns\",\"ru\":\"Ничего\",\"uk\":\"Нічого\"}"],[28, 3, "dinner::nouns", "{\"en\":\"dinner\",\"es\":\"cena\",\"pos\":\"nouns\",\"ru\":\"Ужин\",\"uk\":\"Вечеря\"}"],
      [28, 6, "why::adverbs", "{\"en\":\"why\",\"es\":\"por qué\",\"pos\":\"adverbs\",\"ru\":\"Почему\",\"uk\":\"Чому\"}"],[28, 26, "rest::verbs", "{\"en\":\"rest\",\"es\":\"descansar\",\"pos\":\"verbs\",\"ru\":\"Отдыхать\",\"uk\":\"Відпочивати\"}"],[29, 3, "live::verbs", "{\"en\":\"live\",\"es\":\"vivir\",\"pos\":\"verbs\",\"ru\":\"Жить\",\"uk\":\"Жити\"}"],[29, 3, "travel::verbs", "{\"en\":\"travel\",\"es\":\"viajar\",\"pos\":\"verbs\",\"ru\":\"Путешествовать\",\"uk\":\"Подорожувати\"}"],[29, 4, "check::verbs", "{\"en\":\"check\",\"es\":\"revisar\",\"pos\":\"verbs\",\"ru\":\"Проверять\",\"uk\":\"Перевіряти\"}"],
      [29, 26, "faster::adverbs", "{\"en\":\"faster\",\"es\":\"más rápido\",\"pos\":\"adverbs\",\"ru\":\"Быстрее\",\"uk\":\"Швидше\"}"],[29, 23, "on time::adverbs", "{\"en\":\"on time\",\"es\":\"a tiempo\",\"pos\":\"adverbs\",\"ru\":\"Вовремя\",\"uk\":\"Вчасно\"}"],[29, 1, "together::adverbs", "{\"en\":\"together\",\"es\":\"juntos\",\"pos\":\"adverbs\",\"ru\":\"Вместе\",\"uk\":\"Разом\"}"],[29, 11, "play::verbs", "{\"en\":\"play\",\"es\":\"tocar / jugar\",\"id\":\"bermain / memainkan\",\"pl\":\"grać\",\"pos\":\"verbs\",\"pt-BR\":\"tocar / jogar\",\"ru\":\"Играть\",\"tr\":\"çalmak / oynamak\",\"uk\":\"Грати\",\"vi\":\"chơi / chơi nhạc\"}"],[30, 10, "explain::verbs", "{\"en\":\"explain\",\"es\":\"explicar\",\"pos\":\"verbs\",\"ru\":\"Объяснять\",\"uk\":\"Пояснювати\"}"],
      [30, 26, "invite::verbs", "{\"en\":\"invite\",\"es\":\"invitar\",\"pos\":\"verbs\",\"ru\":\"Приглашать\",\"uk\":\"Запрошувати\"}"],[30, 7, "plan::nouns", "{\"en\":\"plan\",\"es\":\"plan\",\"pos\":\"nouns\",\"ru\":\"План\",\"uk\":\"План\"}"],[30, 7, "hotel::nouns", "{\"en\":\"hotel\",\"es\":\"hotel\",\"pos\":\"nouns\",\"ru\":\"Отель\",\"uk\":\"Готель\"}"],[30, 19, "bank::nouns", "{\"en\":\"bank\",\"es\":\"banco\",\"pos\":\"nouns\",\"ru\":\"Банк\",\"uk\":\"Банк\"}"],[30, 5, "correctly::adverbs", "{\"en\":\"correctly\",\"es\":\"correctamente\",\"pos\":\"adverbs\",\"ru\":\"Правильно\",\"uk\":\"Правильно\"}"],
      [32, 14, "lesson::nouns", "{\"en\":\"lesson\",\"es\":\"lección\",\"pos\":\"nouns\",\"ru\":\"Урок\",\"uk\":\"Урок\"}"],[32, 7, "phone::nouns", "{\"en\":\"phone\",\"es\":\"teléfono\",\"pos\":\"nouns\",\"ru\":\"Телефон\",\"uk\":\"Телефон\"}"],[32, 26, "without::adverbs", "{\"en\":\"without\",\"es\":\"sin\",\"pos\":\"adverbs\",\"ru\":\"Без\",\"uk\":\"Без\"}"],[32, 23, "quickly::adverbs", "{\"en\":\"quickly\",\"es\":\"rápidamente\",\"pos\":\"adverbs\",\"ru\":\"Быстро\",\"uk\":\"Швидко\"}"],[32, 27, "okay::adverbs", "{\"en\":\"okay\",\"es\":\"bien\",\"pos\":\"adverbs\",\"ru\":\"В порядке\",\"uk\":\"Гаразд\"}"],
      [32, 10, "today::adverbs", "{\"en\":\"today\",\"es\":\"hoy\",\"pos\":\"adverbs\",\"ru\":\"Сегодня\",\"uk\":\"Сьогодні\"}"],
    ];
    expect(manifest).toHaveLength(36);
    const baseline = lessonWordBankAuditState();
    assertRemovedRowEvidence(baseline, manifest, 'Task5d L25-32');
    const scopedRuntime = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i + 25, baseline.runtime[i + 25]]));
    const scopedDiagnostics = baseline.diagnostics.filter(({ lessonId }) => lessonId >= 25 && lessonId <= 32);
    expect({
      hash: createHash('sha256').update(JSON.stringify(scopedRuntime)).digest('hex'),
      raw: scopedDiagnostics.reduce((sum, row) => sum + row.rawCount, 0),
      duplicates: scopedDiagnostics.reduce((sum, row) => sum + row.duplicatesRemoved, 0),
    }).toEqual({ hash: 'cb3c84c4f0933fb8ac895b7dccdf34cbb03549f47fbb1df8e3941d939967dbee', raw: 281, duplicates: 77 });
  });


  it('dedupes the same normalized lemma, POS and sense while preserving the first card', () => {
    const first = { en: 'battery', pos: 'nouns', sense: 'power cell' };
    const later = { ...first, en: 'Battery' };
    const built = syntheticBuild({ 1: [first], 2: [later] });

    expect(built.wordsByLesson[1]).toEqual([first]);
    expect(built.wordsByLesson[2]).toEqual([]);
    expect(built.diagnostics).toEqual([
      { lessonId: 1, rawCount: 1, runtimeCount: 1, duplicatesRemoved: 0, filteredCount: 0 },
      { lessonId: 2, rawCount: 1, runtimeCount: 0, duplicatesRemoved: 1, filteredCount: 0 },
    ]);
  });

  it('preserves the same normalized lemma when it introduces a different POS', () => {
    const built = syntheticBuild({
      1: [{ en: 'light', pos: 'nouns' }],
      2: [{ en: 'LIGHT', pos: 'adjectives' }],
    });
    expect(built.wordsByLesson[1]).toHaveLength(1);
    expect(built.wordsByLesson[2]).toHaveLength(1);
  });

  it('rejects cross-POS homographs inside the same lesson because progress is keyed by EN', () => {
    expect(() => syntheticBuild({
      1: [{ en: 'light', pos: 'nouns' }, { en: 'LIGHT', pos: 'adjectives' }],
    })).toThrow('Cross-POS lesson word homograph: lemma=light lesson=L1 POS=nouns/adjectives');
  });

  it('normalizes POS whitespace and case in the semantic key', () => {
    expect(lessonWordSemanticKey(' Light ', ' Nouns ')).toBe('light::nouns');
  });

  it('preserves a same-POS new sense only through an exact consumed exception', () => {
    const raw = {
      1: [{ en: 'bank', pos: 'nouns', sense: 'money' }],
      2: [{ en: 'BANK', pos: 'nouns', sense: 'river' }],
    };
    expect(syntheticBuild(raw).wordsByLesson[2]).toEqual([]);

    const exception: LessonWordSenseException = {
      key: lessonWordSemanticKey('bank', 'nouns'), firstLesson: 1, laterLesson: 2, reason: 'new_sense',
    };
    const built = syntheticBuild(raw, [exception]);
    expect(built.wordsByLesson[2]).toHaveLength(1);
    expect(built.consumedExceptions).toEqual([exception]);
  });

  it('rejects an unconsumed new-sense exception', () => {
    expect(() => syntheticBuild({ 1: [{ en: 'bank', pos: 'nouns' }] }, [{
      key: lessonWordSemanticKey('bank', 'nouns'), firstLesson: 1, laterLesson: 2, reason: 'new_sense',
    }])).toThrow('Unconsumed lesson word sense exception');
  });

  it('allows one new-sense exception to preserve exactly one later card', () => {
    const exception: LessonWordSenseException = {
      key: lessonWordSemanticKey('bank', 'nouns'), firstLesson: 1, laterLesson: 2, reason: 'new_sense',
    };
    const built = syntheticBuild({
      1: [{ en: 'bank', pos: 'nouns', sense: 'money' }],
      2: [
        { en: 'bank', pos: 'nouns', sense: 'river' },
        { en: 'BANK', pos: 'nouns', sense: 'duplicate river' },
      ],
    }, [exception]);

    expect(built.wordsByLesson[2]).toHaveLength(1);
    expect(built.diagnostics[1]).toMatchObject({ runtimeCount: 1, duplicatesRemoved: 1 });
    expect(built.consumedExceptions).toEqual([exception]);
  });

  it('never reintroduces a normalized runtime key in a later actual lesson bank', () => {
    const firstByKey = new Map<string, { lesson: number; pos: string }>();
    const consumed = new Set<LessonWordSenseException>();
    const failures: string[] = [];

    for (let lesson = 1; lesson <= 32; lesson++) {
      for (const word of lessonWordBank(lesson)) {
        const key = lessonWordSemanticKey(lessonVocabularyCoverageText(word.en), word.pos);
        const first = firstByKey.get(key);
        if (!first) {
          firstByKey.set(key, { lesson, pos: word.pos });
          continue;
        }
        const exception = LESSON_WORD_BANK_SENSE_EXCEPTIONS.find((entry) =>
          entry.key === key && entry.firstLesson === first.lesson && entry.laterLesson === lesson
        );
        if (exception) consumed.add(exception);
        else failures.push(`key=${key} first=L${first.lesson}/${first.pos} later=L${lesson}/${word.pos}`);
      }
    }

    if (failures.length) throw new Error(`Runtime vocabulary duplicates:\n${failures.join('\n')}`);
    expect(consumed.size).toBe(LESSON_WORD_BANK_SENSE_EXCEPTIONS.length);
    expect(lessonWordBankDiagnostics()).toHaveLength(32);
    for (const row of lessonWordBankDiagnostics()) {
      expect(row.runtimeCount).toBe(lessonWordBank(row.lessonId).length);
      expect(row.runtimeCount + row.duplicatesRemoved + row.filteredCount).toBe(row.rawCount);
    }
  });

  it.each([
    ["I'm / don't / they’re", "i'm don't they're"],
    ['Wi-Fi wi fi', 'wifi wifi'],
  ])('normalizes apostrophes, contractions and Wi-Fi consistently: %s', (surface, normalized) => {
    expect(lessonVocabularyCoverageText(surface)).toBe(normalized);
  });

  it.each([
    ['works', 'work'], ['worked', 'work'], ['working', 'work'],
    ['batteries', 'battery'], ['went', 'go'],
    ['cheaper', 'cheap'], ['cheapest', 'cheap'],
  ])('includes the expected lemma candidate for %s', (surface, lemma) => {
    expect(lessonVocabularyCoverageCandidates(surface)).toContain(lemma);
  });

  it('supports adjective degree normalization when the app map defines it', () => {
    expect(lessonVocabularyCoverageCandidates('better')).toContain('good');
  });

  it("expands don't and classifies its components without a missing token", () => {
    const findings = consumePhraseSurfaces("I don't work", []).map((surface) =>
      classifySurface(surface, new Set(), new Set(['work']), new Set()),
    );
    expect(findings).toEqual([
      { surface: 'i', classification: 'structural' },
      { surface: 'do', classification: 'structural' },
      { surface: 'not', classification: 'structural' },
      { surface: 'work', classification: 'known_before' },
    ]);
  });

  it('consumes L16 wake up as one chunk before token classification', () => {
    const surfaces = consumePhraseSurfaces('I wake up early', L16_CHUNKS);
    expect(surfaces).toContain('wake up');
    expect(surfaces).not.toContain('wake');
    expect(surfaces).not.toContain('up');
  });

  it('categorically excludes a structural raw-bank token from lexical eligibility', () => {
    expect(classifySurface('i', new Set(['i']), new Set(), new Set())).toEqual({
      surface: 'i', classification: 'structural',
    });
  });

  it('categorically excludes an irregular form from lexical eligibility', () => {
    expect(classifySurface('went', new Set(['go']), new Set(), new Set(['went']))).toEqual({
      surface: 'went', classification: 'covered_irregular',
    });
  });

  it('throws when exact and morphology sources imply conflicting lexical statuses', () => {
    expect(() => classifySurface('working', new Set(['work']), new Set(['worke']), new Set()))
      .toThrow('Conflicting vocabulary statuses for working');
  });

  it('rejects a stale ambiguous exception when morphology already resolves the surface', () => {
    const stale: AmbiguousEntry = {
      lessonId: 99,
      phraseId: 'synthetic',
      surface: 'working',
      reason: 'synthetic stale exception',
    };
    expect(() => classifySurface('working', new Set(['work']), new Set(), new Set(), stale))
      .toThrow('Conflicting vocabulary statuses for working');
  });

  it('keeps L26 stay as remain, without stop or lodging ambiguity, in every locale', () => {
    const stay = lessonWordBank(26).find((word) => word.en === 'stay');
    expect(stay).toMatchObject({
      ru: 'Оставаться', uk: 'Залишатися', es: 'quedarse', 'pt-BR': 'ficar',
      vi: 'ở lại', id: 'tetap / tinggal', tr: 'kalmak', pl: 'zostawać', pos: 'verbs',
    });
  });

  it('classifies every runtime phrase candidate exactly once against cumulative vocabulary', () => {
    const known = new Set<string>();
    const knownChunks = new Set<string>();
    const irregularKnown = new Set<string>();
    const usedAmbiguous = new Set<AmbiguousEntry>();
    const rows: Array<{ lesson: number; introduced: number; known: number; irregular: number; structural: number; ambiguous: number; missing: string[] }> = [];

    for (let lessonId = 1; lessonId <= 32; lessonId++) {
      const introduced = new Set(lessonWordBank(lessonId).map((word) => lessonVocabularyCoverageText(word.en)));
      // A deliberately new POS/sense in this lesson owns the surface for this lesson's phrases.
      const knownBeforeThisIntroduction = new Set([...known].filter((surface) => !introduced.has(surface)));
      const introducedChunks = new Set(lessonWordBank(lessonId).map((word) => lessonVocabularyCoverageText(word.en)).filter((word) => word.includes(' ')));
      for (const verb of IRREGULAR_VERBS_BY_LESSON[lessonId] ?? []) {
        for (const form of [verb.base, verb.past, verb.pp, ...(verb.altPast ?? []), ...(verb.altPp ?? [])]) {
          irregularKnown.add(lessonVocabularyCoverageText(form));
        }
      }
      const counts: Record<Classification, number> = { introduced_now: 0, known_before: 0, covered_irregular: 0, structural: 0, ambiguous: 0, missing: 0 };
      const missing: string[] = [];

      for (const phrase of getLessonData(lessonId)) {
        const surfaces = consumePhraseSurfaces(
          phrase.english,
          [...introducedChunks, ...knownChunks, ...(lessonId === 16 ? L16_CHUNKS : [])],
        );

        for (const surface of surfaces) {
          const ambiguous = AMBIGUOUS.find((entry) => entry.lessonId === lessonId && entry.phraseId === phrase.id && entry.surface === surface);
          const chunkIntroduced = lessonId === 16 && L16_CHUNKS.includes(surface as any);
          const finding = classifySurface(
            surface,
            chunkIntroduced ? new Set([...introduced, surface]) : introduced,
            knownBeforeThisIntroduction,
            irregularKnown,
            ambiguous,
          );
          if (ambiguous) usedAmbiguous.add(ambiguous);
          const classification = finding.classification;
          counts[classification]++;
          if (classification === 'missing') missing.push(`${phrase.id}:${surface}`);
        }
      }

      rows.push({ lesson: lessonId, introduced: counts.introduced_now, known: counts.known_before, irregular: counts.covered_irregular, structural: counts.structural, ambiguous: counts.ambiguous, missing });
      for (const word of lessonWordBank(lessonId)) known.add(lessonVocabularyCoverageText(word.en));
      for (const chunk of introducedChunks) knownChunks.add(chunk);
    }

    const lesson31Missing = rows.find((row) => row.lesson === 31)?.missing ?? [];
    // Task 6 baseline was 130 first-introduced L31 content surfaces; 78 is a 40% reduction.
    const lesson31Introduced = rows.find((row) => row.lesson === 31)?.introduced;
    expect(lesson31Introduced).toBeLessThanOrEqual(78);
    expect(lesson31Introduced).toBe(71);
    expect(lesson31Missing).toEqual([]);
    const failures = rows.filter((row) => row.lesson !== 31 && row.missing.length > 0);
    const compactFailureTable = failures.map((row) => `L${row.lesson}\t${row.missing.join(',')}`).join('\n');
    if (failures.length) throw new Error(`Cumulative vocabulary gaps:\n${compactFailureTable}`);
    if (usedAmbiguous.size !== AMBIGUOUS.length) throw new Error('Remove unused typed ambiguous entries');
  });
});
