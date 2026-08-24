import type { V2ActivityFamily } from '../../contracts/activity';
import type { LearningSupportLevel } from '../../contracts/episode';
import {
  EPISODE_01_SESSION_MAP_V1,
  type SessionKind,
} from './episode_01_session_map_v1';

// зачем: choreography сама по себе языконезависима — распределение семей
// заданий (phrase_builder/listen_choose/...) зависит только от SessionKind,
// не от того, английская это сессия или испанская. Единственное английское
// место было в lesson1SessionChoreographyV1: она молча доставала kind из
// EPISODE_01_SESSION_MAP_V1 (английской карты) вместо того чтобы принять его
// параметром. Испанский контур имеет свою карту (ES_EPISODE_01_SESSION_MAP_V1)
// с тем же SessionKind — эта функция даёт вызывающему выбор источника, не
// меняя ни одного распределения семей внутри.

export type Lesson1InteractionProfileV1 = 'standard' | 'rapid' | 'voice_heavy';
export type Lesson1CardPurposeV1 =
  | 'intro_check'
  | 'supported_practice'
  | 'guided_practice'
  | 'retrieval_practice'
  | 'near_transfer'
  | 'independent_check'
  | 'delayed_review';

export type Lesson1LearningStageV1 =
  | 'intro_check'
  | 'recognize'
  | 'retrieve_meaning'
  | 'build_form'
  | 'apply_in_phrase'
  | 'guided_phrase'
  | 'retrieve_phrase'
  | 'speak_with_model'
  | 'speak_independently'
  | 'delayed_recall'
  | 'independent_assessment';

export type Lesson1ChoreographyStepV1 = Readonly<{
  family: V2ActivityFamily;
  purpose: Lesson1CardPurposeV1;
  targetKind: 'phrase' | 'vocabulary';
  sourcePhraseIndex?: number;
  sourceVocabularyIndex?: number;
  learningStage: Lesson1LearningStageV1;
}>;

export type Lesson1SessionChoreographyV1 = Readonly<{
  sessionOrdinal: number;
  kind: SessionKind;
  interactionProfile: Lesson1InteractionProfileV1;
  zone: 'understand' | 'use' | 'master';
  support: LearningSupportLevel;
  promptNovelty: 'trained' | 'varied' | 'novel';
  steps: readonly Lesson1ChoreographyStepV1[];
}>;

/**
 * Published shards do not carry authoring-only `targetKind`. A word-first
 * shard is nevertheless self-describing: its 1–5 standalone targets appear
 * once in each of the three ordered contact stages before any phrase task.
 */
export function inferLesson1WordFirstVocabularyCountV1(
  targetTexts: readonly string[],
): number {
  // Word-first shards reserve slots 1-3 for the three intro questions. Their
  // standalone contacts therefore begin at slot 4 inside the 20-slot rapid
  // profile instead of being silently consumed by the intro.
  if (targetTexts.length !== 20) return 0;
  const practiceTargets = targetTexts.slice(3);
  for (let count = 1; count <= 5; count += 1) {
    const first = practiceTargets.slice(0, count);
    if (
      first.length === count &&
      first.every((target) => target.trim().length > 0 && !/\s/u.test(target.trim())) &&
      practiceTargets.slice(count, count * 2).every((target, index) => target === first[index]) &&
      practiceTargets.slice(count * 2, count * 3).every((target, index) => target === first[index])
    ) return count;
  }
  return 0;
}

const introSteps = (phraseCount = 15): readonly Lesson1ChoreographyStepV1[] =>
  [0, 1, 2].map((sourcePhraseIndex) => ({
    family: 'phrase_builder' as const,
    purpose: 'intro_check' as const,
    targetKind: 'phrase' as const,
    sourcePhraseIndex: sourcePhraseIndex % phraseCount,
    learningStage: 'intro_check' as const,
  }));

function legacyWordsThenPhrasesSteps(): readonly Lesson1ChoreographyStepV1[] {
  const contacts: Lesson1ChoreographyStepV1[] = [];
  const stages = [
    ['listen_choose', 'supported_practice', 'recognize'],
    ['speed_match', 'retrieval_practice', 'retrieve_meaning'],
    ['phrase_builder', 'guided_practice', 'build_form'],
    ['context_gap_grammar', 'near_transfer', 'apply_in_phrase'],
  ] as const;
  for (const [family, purpose, learningStage] of stages) {
    for (let sourcePhraseIndex = 0; sourcePhraseIndex < 4; sourcePhraseIndex += 1) {
      contacts.push({
        family,
        purpose,
        targetKind: 'phrase',
        sourcePhraseIndex,
        learningStage,
      });
    }
  }
  contacts.push({
    family: 'phrase_builder',
    purpose: 'independent_check',
    targetKind: 'phrase',
    sourcePhraseIndex: 4,
    learningStage: 'independent_assessment',
  });
  return contacts;
}

function wordsThenPhrasesSteps(
  vocabularyCount: number,
  phraseCount: number,
): readonly Lesson1ChoreographyStepV1[] {
  if (!Number.isInteger(vocabularyCount) || vocabularyCount < 1 || vocabularyCount > 5)
    throw new Error('lesson1_word_first_vocabulary_count_invalid');
  if (!Number.isInteger(phraseCount) || phraseCount < 1)
    throw new Error('lesson1_word_first_phrase_count_invalid');

  const contactStages = [
    ['listen_choose', 'supported_practice', 'recognize'],
    ['speed_match', 'retrieval_practice', 'retrieve_meaning'],
    ['context_gap_grammar', 'guided_practice', 'build_form'],
  ] as const;
  const contacts = contactStages.flatMap(([family, purpose, learningStage]) =>
    Array.from({ length: vocabularyCount }, (_, sourceVocabularyIndex) => ({
      family,
      purpose,
      targetKind: 'vocabulary' as const,
      sourceVocabularyIndex,
      learningStage,
    })),
  );
  const phraseFamilies = [
    'phrase_builder',
    'listen_choose',
    'context_gap_grammar',
    'listen_build_dictation',
    'speed_match',
  ] as const;
  const phraseInteractionCount = 17 - contacts.length;
  if (phraseInteractionCount < 2)
    throw new Error('lesson1_word_first_phrase_application_budget_invalid');
  const applications = Array.from({ length: phraseInteractionCount }, (_, index) => ({
    family: phraseFamilies[index % phraseFamilies.length]!,
    purpose:
      index < 2
        ? ('guided_practice' as const)
        : index < phraseInteractionCount - 2
          ? ('near_transfer' as const)
          : ('independent_check' as const),
    targetKind: 'phrase' as const,
    sourcePhraseIndex: index % phraseCount,
    learningStage: 'apply_in_phrase' as const,
  }));
  return [...contacts, ...applications];
}

function phraseSteps(): readonly Lesson1ChoreographyStepV1[] {
  const families = [
    'listen_choose',
    'phrase_builder',
    'context_gap_grammar',
    'listen_choose',
    'phrase_builder',
    'context_gap_grammar',
    'speed_match',
    'phrase_builder',
    'listen_build_dictation',
    'context_gap_grammar',
    'listen_build_dictation',
    'phrase_builder',
  ] as const;
  const purposes = [
    'supported_practice',
    'supported_practice',
    'guided_practice',
    'guided_practice',
    'retrieval_practice',
    'retrieval_practice',
    'retrieval_practice',
    'near_transfer',
    'near_transfer',
    'independent_check',
    'delayed_review',
    'independent_check',
  ] as const;
  return families.map((family, index) => ({
    family,
    purpose: purposes[index]!,
    targetKind: 'phrase' as const,
    sourcePhraseIndex: index + 3,
    learningStage:
      index < 4
        ? ('guided_phrase' as const)
        : index < 9
          ? ('retrieve_phrase' as const)
          : ('independent_assessment' as const),
  }));
}

function voiceSteps(): readonly Lesson1ChoreographyStepV1[] {
  const families = [
    'listen_choose',
    'sound_contrast',
    'scripted_repeat_compare',
    'scripted_repeat_compare',
    'listen_build_dictation',
    'scripted_repeat_compare',
    'sound_contrast',
    'scripted_repeat_compare',
    'listen_choose',
  ] as const;
  return families.map((family, index) => ({
    family,
    purpose:
      index < 2
        ? ('retrieval_practice' as const)
        : index < 6
          ? ('near_transfer' as const)
          : ('independent_check' as const),
    targetKind: 'phrase' as const,
    sourcePhraseIndex: index + 3,
    learningStage:
      index < 6 ? ('speak_with_model' as const) : ('speak_independently' as const),
  }));
}

function recallSteps(): readonly Lesson1ChoreographyStepV1[] {
  const families = [
    'speed_match',
    'listen_build_dictation',
    'phrase_builder',
    'context_gap_grammar',
    'speed_match',
    'listen_build_dictation',
    'phrase_builder',
    'context_gap_grammar',
    'speed_match',
    'listen_build_dictation',
    'phrase_builder',
    'speed_match',
  ] as const;
  return families.map((family, index) => ({
    family,
    purpose:
      index < 6
        ? ('retrieval_practice' as const)
        : index < 9
          ? ('delayed_review' as const)
          : ('independent_check' as const),
    targetKind: 'phrase' as const,
    sourcePhraseIndex: index + 3,
    learningStage:
      index < 9 ? ('delayed_recall' as const) : ('independent_assessment' as const),
  }));
}

function checkpointSteps(): readonly Lesson1ChoreographyStepV1[] {
  const families = [
    'speed_match',
    'listen_build_dictation',
    'context_gap_grammar',
    'phrase_builder',
    'listen_build_dictation',
    'context_gap_grammar',
    'phrase_builder',
    'speed_match',
    'listen_build_dictation',
    'context_gap_grammar',
    'phrase_builder',
    'speed_match',
  ] as const;
  return families.map((family, index) => ({
    family,
    purpose:
      index < 4
        ? ('retrieval_practice' as const)
        : index < 8
          ? ('near_transfer' as const)
          : ('independent_check' as const),
    targetKind: 'phrase' as const,
    sourcePhraseIndex: index + 3,
    learningStage: 'independent_assessment' as const,
  }));
}

function practiceSteps(kind: SessionKind): readonly Lesson1ChoreographyStepV1[] {
  if (kind === 'words_then_phrases') return legacyWordsThenPhrasesSteps();
  if (kind === 'voice') return voiceSteps();
  if (kind === 'recall') return recallSteps();
  if (kind === 'checkpoint') return checkpointSteps();
  return phraseSteps();
}

function kindMayIntroduceVocabulary(kind: SessionKind): boolean {
  return kind !== 'voice' && kind !== 'recall' && kind !== 'checkpoint';
}

function profileFor(
  kind: SessionKind,
  vocabularyCount = 0,
): Lesson1InteractionProfileV1 {
  if (vocabularyCount > 0 && kindMayIntroduceVocabulary(kind)) return 'rapid';
  if (kind === 'words_then_phrases' || kind === 'irregular_verbs' || kind === 'prepositions') {
    return 'rapid';
  }
  if (kind === 'voice') return 'voice_heavy';
  return 'standard';
}

function supportFor(
  ordinal: number,
  kind: SessionKind,
): Readonly<{
  zone: Lesson1SessionChoreographyV1['zone'];
  support: LearningSupportLevel;
  promptNovelty: Lesson1SessionChoreographyV1['promptNovelty'];
}> {
  if (kind === 'checkpoint' || kind === 'recall') {
    return { zone: 'master', support: 'none', promptNovelty: 'novel' };
  }
  if (kind === 'voice') {
    return { zone: 'master', support: 'visual_only', promptNovelty: 'varied' };
  }
  const position = ((ordinal - 1) % 8) + 1;
  if (position <= 3) {
    const support = position === 1 ? 'model' : position === 2 ? 'full_text' : 'partial_cue';
    return { zone: 'understand', support, promptNovelty: 'trained' };
  }
  if (position <= 6) {
    return {
      zone: 'use',
      support: position === 6 ? 'visual_only' : 'partial_cue',
      promptNovelty: 'varied',
    };
  }
  return { zone: 'master', support: 'visual_only', promptNovelty: 'novel' };
}

/**
 * Обратная совместимость: английский конвейер продолжает вызывать эту
 * функцию без второго аргумента и получает kind из английской карты,
 * байт в байт как раньше.
 */
export function lesson1SessionChoreographyV1(
  sessionOrdinal: number,
  kindOverride?: SessionKind,
  vocabularyCount = 0,
  phraseCount = 15,
): Lesson1SessionChoreographyV1 {
  const kind = kindOverride ?? EPISODE_01_SESSION_MAP_V1[sessionOrdinal - 1]?.kind;
  if (!kind) throw new Error('lesson1_session_choreography_ordinal_invalid');
  const support = supportFor(sessionOrdinal, kind);
  return Object.freeze({
    sessionOrdinal,
    kind,
    interactionProfile: profileFor(kind, vocabularyCount),
    ...support,
    steps: Object.freeze(
      vocabularyCount > 0 && kindMayIntroduceVocabulary(kind)
        ? [...introSteps(phraseCount), ...wordsThenPhrasesSteps(vocabularyCount, phraseCount)]
        : [...introSteps(), ...practiceSteps(kind)],
    ),
  });
}
