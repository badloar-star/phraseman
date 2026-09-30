import { planDialogueV2GroupTurn } from '../shared/dialogue_v2_group_turn_planner';

const policy = {
  maxDirectReplies: 1 as const,
  maxUsefulFollowUps: 1 as const,
  silenceAllowed: true as const,
};

const participants = [
  { id: 'mia', replyStyle: 'warm' as const, mood: 'engaged' as const, relevance: 6 },
  { id: 'drew', replyStyle: 'direct' as const, mood: 'neutral' as const, relevance: 9 },
  { id: 'sam', replyStyle: 'calm' as const, mood: 'engaged' as const, relevance: 5 },
];

describe('planDialogueV2GroupTurn', () => {
  it('lets the directly addressed available participant answer first and adds at most one useful follow-up', () => {
    expect(planDialogueV2GroupTurn({
      participants,
      policy,
      lastSpeakerId: 'mia',
      addressedPersonaId: 'drew',
      event: { kind: 'question', advancesObjective: true, needsConsensus: true },
    })).toEqual({
      kind: 'reply',
      primaryPersonaId: 'drew',
      followUpPersonaId: 'sam',
      reason: 'directly_addressed',
    });
  });

  it('does not add a consensus follow-up when no second participant has useful relevance', () => {
    expect(planDialogueV2GroupTurn({
      participants: [
        { id: 'drew', replyStyle: 'direct', mood: 'engaged', relevance: 8 },
        { id: 'mia', replyStyle: 'warm', mood: 'reserved', relevance: 0 },
        { id: 'sam', replyStyle: 'calm', mood: 'reserved', relevance: 0 },
      ],
      policy,
      lastSpeakerId: null,
      addressedPersonaId: 'drew',
      event: { kind: 'question', advancesObjective: true, needsConsensus: true },
    })).toEqual({
      kind: 'reply',
      primaryPersonaId: 'drew',
      followUpPersonaId: null,
      reason: 'directly_addressed',
    });
  });

  it('keeps the group silent for a low-value acknowledgement', () => {
    expect(planDialogueV2GroupTurn({
      participants,
      policy,
      lastSpeakerId: 'mia',
      addressedPersonaId: null,
      event: { kind: 'acknowledgement', advancesObjective: false, needsConsensus: false },
    })).toEqual({ kind: 'silence', reason: 'no_useful_reply' });
  });

  it('keeps the group silent for a low-value discussion rather than generating a chorus', () => {
    expect(planDialogueV2GroupTurn({
      participants: [
        { id: 'mia', replyStyle: 'warm', mood: 'reserved', relevance: 0 },
        { id: 'sam', replyStyle: 'calm', mood: 'reserved', relevance: 0 },
      ],
      policy,
      lastSpeakerId: 'mia',
      addressedPersonaId: null,
      event: { kind: 'discussion', advancesObjective: false, needsConsensus: false },
    })).toEqual({ kind: 'silence', reason: 'no_useful_reply' });
  });

  it('uses persona style as a deterministic tie-break and avoids immediately repeating the same speaker', () => {
    expect(planDialogueV2GroupTurn({
      participants: [
        { id: 'mia', replyStyle: 'warm', mood: 'engaged', relevance: 7 },
        { id: 'sam', replyStyle: 'calm', mood: 'engaged', relevance: 7 },
      ],
      policy,
      lastSpeakerId: 'mia',
      addressedPersonaId: null,
      event: { kind: 'conflict', advancesObjective: true, needsConsensus: false },
    })).toEqual({
      kind: 'reply',
      primaryPersonaId: 'sam',
      followUpPersonaId: null,
      reason: 'objective_relevance',
    });
  });

  it('fails closed when no available participant can be scheduled', () => {
    expect(planDialogueV2GroupTurn({
      participants: [{ id: 'mia', replyStyle: 'warm', mood: 'away', relevance: 10 }],
      policy,
      lastSpeakerId: null,
      addressedPersonaId: 'mia',
      event: { kind: 'question', advancesObjective: true, needsConsensus: false },
    })).toEqual({ kind: 'silence', reason: 'no_available_participant' });
  });

  it('does not replace an unavailable addressed participant with somebody else', () => {
    expect(planDialogueV2GroupTurn({
      participants,
      policy,
      lastSpeakerId: null,
      addressedPersonaId: 'ghost',
      event: { kind: 'question', advancesObjective: true, needsConsensus: false },
    })).toEqual({ kind: 'silence', reason: 'addressed_participant_unavailable' });
  });

  it('fails closed for malformed runtime input instead of assigning a persona', () => {
    expect(planDialogueV2GroupTurn({
      participants: [{ id: '', replyStyle: 'not-a-style', mood: 'engaged', relevance: 10 }],
      policy: { maxDirectReplies: 2, maxUsefulFollowUps: 1, silenceAllowed: true },
      lastSpeakerId: null,
      addressedPersonaId: null,
      event: { kind: 'not-an-event', advancesObjective: true, needsConsensus: false },
    } as any)).toEqual({ kind: 'silence', reason: 'input_invalid' });
  });
});
