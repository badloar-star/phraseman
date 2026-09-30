import { adaptDialogueV2PersonaForGroupTurn } from '../shared/dialogue_v2_group_participant_adapter';
import { planDialogueV2GroupTurn } from '../shared/dialogue_v2_group_turn_planner';

const persona = {
  id: 'mila',
  replyStyle: 'warm' as const,
  voiceMode: 'text_only' as const,
  displayName: 'Mila',
  styleNote: 'Welcomes ideas and asks useful questions.',
  mood: 'open' as const,
  correctionStyle: 'gentle' as const,
};

describe('dialogue V2 persona → group-turn adapter', () => {
  it.each([
    ['open', 'engaged'],
    ['helpful', 'engaged'],
    ['energetic', 'engaged'],
    ['focused', 'neutral'],
    ['measured', 'reserved'],
  ] as const)('maps stable %s mood to runtime %s mood', (mood, expectedMood) => {
    expect(adaptDialogueV2PersonaForGroupTurn({ ...persona, mood }, {
      availability: 'active', relevance: 6,
    })).toMatchObject({ id: 'mila', replyStyle: 'warm', mood: expectedMood, relevance: 6 });
  });

  it('makes a temporarily unavailable participant unavailable without changing their stable persona mood', () => {
    const participant = adaptDialogueV2PersonaForGroupTurn(persona, {
      availability: 'away', relevance: 9,
    });
    expect(participant.mood).toBe('away');
    expect(planDialogueV2GroupTurn({
      participants: [participant],
      policy: { maxDirectReplies: 1, maxUsefulFollowUps: 0, silenceAllowed: true },
      lastSpeakerId: null,
      addressedPersonaId: 'mila',
      event: { kind: 'question', advancesObjective: true, needsConsensus: false },
    })).toEqual({ kind: 'silence', reason: 'no_available_participant' });
  });
});
