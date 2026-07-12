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
type PendingRemediationEntry = { lessonId: 31; phraseId: string; surface: string; reason: 'Task6 lexical simplification' };
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

const PENDING_L31_REMEDIATION: readonly PendingRemediationEntry[] = ([
  ['lesson31_phrase_1', 'inexperienced'], ['lesson31_phrase_1', 'huge'],
  ['lesson31_phrase_2', 'pilot'], ['lesson31_phrase_2', 'complex'],
  ['lesson31_phrase_4', 'strict'], ['lesson31_phrase_4', 'guard'], ['lesson31_phrase_4', 'suspicious'],
  ['lesson31_phrase_4', 'visitor'], ['lesson31_phrase_4', 'contents'], ['lesson31_phrase_4', 'leather'],
  ['lesson31_phrase_4', 'briefcase'], ['lesson31_phrase_6', 'huge'], ['lesson31_phrase_7', 'powerful'],
  ['lesson31_phrase_7', 'brick'], ['lesson31_phrase_8', 'envelope'], ['lesson31_phrase_10', 'lightning'],
  ['lesson31_phrase_11', 'sharp'], ['lesson31_phrase_11', 'wind'], ['lesson31_phrase_11', 'touch'],
  ['lesson31_phrase_12', 'boss'], ['lesson31_phrase_13', 'skillful'], ['lesson31_phrase_13', 'ladder'],
  ['lesson31_phrase_16', 'delegation'], ['lesson31_phrase_16', 'laboratory'], ['lesson31_phrase_17', 'strict'],
  ['lesson31_phrase_17', 'inspector'], ['lesson31_phrase_18', 'sharp'], ['lesson31_phrase_18', 'needle'],
  ['lesson31_phrase_19', 'base'], ['lesson31_phrase_22', 'touch'], ['lesson31_phrase_28', 'strict'],
  ['lesson31_phrase_28', 'landlord'], ['lesson31_phrase_28', 'huge'], ['lesson31_phrase_28', 'electricity'],
  ['lesson31_phrase_29', 'object'], ['lesson31_phrase_30', 'engine'], ['lesson31_phrase_31', 'stray'],
  ['lesson31_phrase_31', 'cross'], ['lesson31_phrase_33', 'sunlight'], ['lesson31_phrase_34', 'stranger'],
  ['lesson31_phrase_34', 'station'], ['lesson31_phrase_35', 'firefighter'], ['lesson31_phrase_35', 'emergency'],
  ['lesson31_phrase_36', 'wedding'], ['lesson31_phrase_37', 'official'], ['lesson31_phrase_38', 'mural'],
  ['lesson31_phrase_39', 'wind'], ['lesson31_phrase_39', 'cart'], ['lesson31_phrase_40', 'strict'],
  ['lesson31_phrase_42', 'drain'], ['lesson31_phrase_44', 'verdict'], ['lesson31_phrase_45', 'building'],
  ['lesson31_phrase_45', 'earthquake'], ['lesson31_phrase_46', 'ancient'], ['lesson31_phrase_48', 'mechanic'],
  ['lesson31_phrase_48', 'engine'], ['lesson31_phrase_49', 'branch'], ['lesson31_phrase_50', 'touch'],
] as const).map(([phraseId, surface]) => ({
  lessonId: 31,
  phraseId,
  surface,
  reason: 'Task6 lexical simplification',
}));

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
    const removed: ReadonlyArray<readonly [laterLesson: number, firstLesson: number, semanticKey: string]> = [
      [2, 1, 'i::pronouns'], [2, 1, 'you::pronouns'], [2, 1, 'he::pronouns'], [2, 1, 'she::pronouns'],
      [2, 1, 'we::pronouns'], [2, 1, 'they::pronouns'], [2, 1, 'it::pronouns'], [2, 1, 'here::adverbs'],
      [2, 1, 'outside::adverbs'], [2, 1, 'inside::adverbs'], [2, 1, 'together::adverbs'], [2, 1, 'ready::adjectives'],
      [2, 1, 'busy::adjectives'], [2, 1, 'calm::adjectives'], [2, 1, 'happy::adjectives'], [2, 1, 'important::adjectives'],
      [2, 1, 'okay::adjectives'], [2, 1, 'right::adjectives'], [2, 1, 'safe::adjectives'], [2, 1, 'sick::adjectives'],
      [2, 1, 'sad::adjectives'], [2, 1, 'late::adjectives'], [2, 1, 'tired::adjectives'], [2, 1, 'hungry::adjectives'],
      [2, 1, 'angry::adjectives'], [2, 1, 'serious::adjectives'],
      [3, 1, 'i::pronouns'], [3, 1, 'you::pronouns'], [3, 1, 'he::pronouns'], [3, 1, 'she::pronouns'],
      [3, 1, 'we::pronouns'], [3, 1, 'they::pronouns'], [3, 1, 'it::pronouns'], [3, 1, 'here::adverbs'],
      [4, 3, 'listen::verbs'], [4, 3, 'understand::verbs'], [4, 3, 'live::verbs'], [4, 3, 'work::verbs'],
      [4, 3, 'know::verbs'], [4, 3, 'remember::verbs'], [4, 3, 'buy::verbs'], [4, 3, 'wear::verbs'],
      [4, 3, 'forget::verbs'], [4, 3, 'help::verbs'], [4, 3, 'read::verbs'], [4, 3, 'trust::verbs'], [4, 3, 'cook::verbs'],
      [6, 3, 'cost::verbs'], [6, 3, 'wait::verbs'], [6, 4, 'see::verbs'], [6, 4, 'check::verbs'],
      [6, 3, 'speak::verbs'], [6, 3, 'dinner::nouns'],
      [7, 3, 'time::nouns'], [7, 3, 'good::adjectives'], [7, 3, 'coffee::nouns'],
      [8, 3, 'music::nouns'], [8, 3, 'pizza::nouns'], [8, 3, 'tea::nouns'], [8, 3, 'travel::verbs'],
    ];
    expect(removed).toHaveLength(60);
    for (const [laterLesson, firstLesson, semanticKey] of removed) {
      expect((audit.raw[laterLesson] ?? []).some((word) => lessonWordSemanticKey(word.en, word.pos) === semanticKey)).toBe(false);
      expect((audit.raw[firstLesson] ?? []).some((word) => lessonWordSemanticKey(word.en, word.pos) === semanticKey)).toBe(true);
    }

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
    const manifest: ReadonlyArray<readonly [number, number, string]> = [
      [10,6,'finish::verbs'],[10,5,'study::verbs'],[10,6,'report::nouns'],[10,6,'luggage::nouns'],[10,9,'email::nouns'],
      [11,8,'two::nouns'],[11,8,'five::nouns'],[11,8,'ten::nouns'],[11,6,'close::verbs'],[11,10,'water::verbs'],
      [11,6,'door::nouns'],[11,3,'dinner::nouns'],[11,10,'computer::nouns'],[11,9,'email::nouns'],[11,10,'password::nouns'],
      [11,6,'report::nouns'],[11,7,'hotel::nouns'],[11,6,'meeting::nouns'],[11,3,'pizza::nouns'],[11,3,'good::adjectives'],
      [12,9,'useful::adjectives'],[12,11,'long::adjectives'],[13,3,'help::verbs'],[13,4,'send::verbs'],[13,3,'cook::verbs'],
      [13,5,'sing::verbs'],[13,5,'tomorrow::adverbs'],[13,10,'later::adverbs'],[13,4,'cash::nouns'],
      [13,7,'plan::nouns'],[13,8,'rent::nouns'],[13,3,'dinner::nouns'],[13,12,'early::adverbs'],[14,5,'job::nouns'],
      [15,7,'phone::nouns'],[15,7,'passport::nouns'],[15,14,'answer::nouns'],[15,1,'ready::adjectives'],[15,1,'here::adverbs'],
      [16,8,'noon::nouns'],[16,12,'early::adverbs'],[16,6,'now::adverbs'],[16,11,'yesterday::adverbs'],
      [16,11,'this morning::adverbs'],[16,11,'last week::adverbs'],
    ];
    expect(manifest).toHaveLength(45);
    const baseline = lessonWordBankAuditState();
    for (const [laterLesson, firstLesson, semanticKey] of manifest) {
      const rowIndex = baseline.raw[laterLesson].findIndex((word) => lessonWordSemanticKey(word.en, word.pos) === semanticKey);
      if (rowIndex !== -1) throw new Error(`Task5b row still present: L${laterLesson} ${semanticKey} at ${rowIndex}`);
      expect(rowIndex).toBe(-1);
      const firstRow = baseline.raw[firstLesson].find((word) => lessonWordSemanticKey(word.en, word.pos) === semanticKey);
      expect(firstRow).toBeDefined();
    }
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
    const manifest: ReadonlyArray<readonly [number, number, string]> = [
      [17,3,"work::verbs"],[17,3,"read::verbs"],[17,3,"cook::verbs"],[17,3,"write::verbs"],[17,3,"wait::verbs"],
      [17,3,"listen::verbs"],[17,3,"speak::verbs"],[17,4,"check::verbs"],[17,4,"send::verbs"],[17,3,"buy::verbs"],
      [17,3,"help::verbs"],[17,4,"do::verbs"],[17,6,"cry::verbs"],[17,16,"turn off::verbs"],[17,16,"put on::verbs"],
      [17,6,"now::adverbs"],[17,10,"today::adverbs"],[17,3,"well::adverbs"],[17,3,"music::nouns"],[17,3,"tv::nouns"],
      [18,3,"wait::verbs"],[18,3,"help::verbs"],[18,4,"check::verbs"],[18,4,"send::verbs"],[18,6,"open::verbs"],
      [18,6,"close::verbs"],[18,6,"start::verbs"],[18,3,"listen::verbs"],[18,4,"share::verbs"],[18,4,"waste::verbs"],
      [18,6,"finish::verbs"],[18,3,"work::verbs"],[18,1,"together::adverbs"],[18,6,"door::nouns"],[18,14,"option::nouns"],
      [18,3,"time::nouns"],[18,4,"cash::nouns"],[19,9,"bed::nouns"],[19,6,"door::nouns"],[19,9,"house::nouns"],
      [19,6,"shop::nouns"],[19,7,"hotel::nouns"],[19,7,"passport::nouns"],[20,7,"passport::nouns"],[20,7,"idea::nouns"],
      [20,11,"man::nouns"],[20,14,"option::nouns"],[20,3,"coffee::nouns"],[20,3,"money::nouns"],[20,3,"food::nouns"],
      [21,12,"strange::adjectives"],[21,1,"ready::adjectives"],[21,2,"sure::adjectives"],[21,10,"explain::verbs"],[22,6,"finish::verbs"],
      [22,2,"dangerous::adjectives"],[22,4,"cash::nouns"],[22,3,"food::nouns"],[23,10,"password::nouns"],[23,7,"plan::nouns"],
      [23,3,"often::adverbs"],[23,4,"send::verbs"],[23,4,"sell::verbs"],[24,10,"password::nouns"],[24,14,"option::nouns"],
      [24,7,"phone::nouns"],[24,3,"dinner::nouns"],[24,4,"see::verbs"],[24,3,"buy::verbs"],[24,4,"lose::verbs"],
    ];
    expect(manifest).toHaveLength(70);
    const baseline = lessonWordBankAuditState();
    for (const [laterLesson, firstLesson, semanticKey] of manifest) {
      const rowIndex = baseline.raw[laterLesson].findIndex((word) => lessonWordSemanticKey(word.en, word.pos) === semanticKey);
      expect(rowIndex).toBe(-1);
      const firstRow = baseline.raw[firstLesson].find((word) => lessonWordSemanticKey(word.en, word.pos) === semanticKey);
      expect(firstRow).toBeDefined();
    }
    const scopedRuntime = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i + 17, baseline.runtime[i + 17]]));
    const scopedDiagnostics = baseline.diagnostics.filter(({ lessonId }) => lessonId >= 17 && lessonId <= 24);
    expect({
      hash: createHash('sha256').update(JSON.stringify(scopedRuntime)).digest('hex'),
      raw: scopedDiagnostics.reduce((sum, row) => sum + row.rawCount, 0),
      duplicates: scopedDiagnostics.reduce((sum, row) => sum + row.duplicatesRemoved, 0),
    }).toEqual({ hash: '02dc9b903e47dc9f7ce9223d8b224e9519bfb20238e2b99476d93257cde1c2ee', raw: 199, duplicates: 112 });
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
    const expectedLesson31Missing = PENDING_L31_REMEDIATION.map((entry) => `${entry.phraseId}:${entry.surface}`);
    expect(lesson31Missing).toEqual(expectedLesson31Missing);
    const failures = rows.filter((row) => row.lesson !== 31 && row.missing.length > 0);
    const compactFailureTable = failures.map((row) => `L${row.lesson}\t${row.missing.join(',')}`).join('\n');
    if (failures.length) throw new Error(`Cumulative vocabulary gaps:\n${compactFailureTable}`);
    if (usedAmbiguous.size !== AMBIGUOUS.length) throw new Error('Remove unused typed ambiguous entries');
  });
});
