import { AUTHORED_EPISODE_01_SESSIONS } from '../modules/learning-v2/content/source/authored_sessions_v1';
import {
  EPISODE_01_SESSION_MAP_V1,
  type SessionKind,
} from '../modules/learning-v2/content/source/episode_01_session_map_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';

type PracticeInteraction = Readonly<{
  interactionId: string;
  family: string;
  purpose: string;
}>;

type LearnerChild = Readonly<{
  interactionProfile: 'standard' | 'rapid' | 'voice_heavy';
  interactions: readonly PracticeInteraction[];
}>;

const EXPECTED_PROFILE: Readonly<Record<SessionKind, LearnerChild['interactionProfile']>> = {
  words_then_phrases: 'rapid',
  phrases: 'standard',
  irregular_verbs: 'rapid',
  prepositions: 'rapid',
  voice: 'voice_heavy',
  recall: 'standard',
  checkpoint: 'standard',
};

const EXPECTED_TOTAL: Readonly<Record<LearnerChild['interactionProfile'], number>> = {
  standard: 15,
  rapid: 20,
  voice_heavy: 12,
};

const BUILT_SESSION_CACHE = new Map<number, ReturnType<typeof buildSession>>();

function buildSession(index: number) {
  const source = AUTHORED_EPISODE_01_SESSIONS[index]!;
  const map = EPISODE_01_SESSION_MAP_V1[index]!;
  const shard = buildSessionShardFromSource(source);
  const children = buildSessionChildBodiesFromShard(
    shard,
    'ru',
    `lesson-01:session:${String(index + 1).padStart(2, '0')}`,
  );
  return {
    source,
    map,
    shard,
    learner: children.learner as LearnerChild,
  };
}

function builtSession(index: number) {
  const existing = BUILT_SESSION_CACHE.get(index);
  if (existing) return existing;
  const built = buildSession(index);
  BUILT_SESSION_CACHE.set(index, built);
  return built;
}

describe('Lesson 1 materialized session choreography', () => {
  it('uses the interaction profile and budget required by every SessionKind', () => {
    for (let index = 0; index < 56; index += 1) {
      const { map, learner } = builtSession(index);
      const expectedProfile = EXPECTED_PROFILE[map.kind];
      expect(learner.interactionProfile).toBe(expectedProfile);
      expect(learner.interactions.length + 3).toBe(EXPECTED_TOTAL[expectedProfile]);
    }
  });

  it('gives every words_then_phrases focus item four contacts before transfer', () => {
    for (let index = 0; index < 56; index += 1) {
      const built = builtSession(index);
      if (built.map.kind !== 'words_then_phrases') continue;
      const practiceCards = built.shard.cards.filter((card) => card.taskSlot >= 4);
      const focusTargets = built.source.phrases.slice(0, 4).map((phrase) => phrase.english);
      for (const target of focusTargets) {
        const contacts = practiceCards.filter(
          (card) => card.contentItem.target.text === target,
        );
        expect(contacts).toHaveLength(4);
        expect(new Set(contacts.map((card) => card.family))).toEqual(
          new Set(['listen_choose', 'speed_match', 'phrase_builder', 'context_gap_grammar']),
        );
      }
      expect(practiceCards.at(-1)?.purpose).toBe('independent_check');
    }
  });

  it('makes voice sessions voice-heavy instead of ordinary choice sessions', () => {
    for (let index = 0; index < 56; index += 1) {
      const { map, learner } = builtSession(index);
      if (map.kind !== 'voice') continue;
      expect(learner.interactionProfile).toBe('voice_heavy');
      expect(
        learner.interactions.filter(
          (interaction) => interaction.family === 'scripted_repeat_compare',
        ).length,
      ).toBeGreaterThanOrEqual(4);
      expect(
        learner.interactions.every((interaction) =>
          ['listen_choose', 'sound_contrast', 'listen_build_dictation', 'scripted_repeat_compare']
            .includes(interaction.family),
        ),
      ).toBe(true);
    }
  });

  it('makes recall and checkpoint sessions retrieval-first and unsupported', () => {
    for (let index = 0; index < 56; index += 1) {
      const { map, shard, learner } = builtSession(index);
      if (map.kind !== 'recall' && map.kind !== 'checkpoint') continue;
      const practiceCards = shard.cards.filter((card) => card.taskSlot >= 4);
      expect(
        learner.interactions.every(
          (interaction) =>
            interaction.purpose !== 'supported_practice' &&
            interaction.purpose !== 'guided_practice',
        ),
      ).toBe(true);
      expect(practiceCards.every((card) => card.support === 'none')).toBe(true);
      expect(practiceCards.every((card) => card.promptNovelty === 'novel')).toBe(true);
      if (map.kind === 'checkpoint') {
        expect(
          learner.interactions.filter(
            (interaction) => interaction.purpose === 'independent_check',
          ).length,
        ).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('materializes meaningfully different family sequences for each SessionKind', () => {
    const representative = new Map<SessionKind, string>();
    for (let index = 0; index < 56; index += 1) {
      const { map, learner } = builtSession(index);
      if (!representative.has(map.kind)) {
        representative.set(
          map.kind,
          learner.interactions.map((item) => item.family).join('>'),
        );
      }
    }
    expect(new Set(representative.values()).size).toBe(representative.size);
  });
});
