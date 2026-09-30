import { validateDialogueV2CompletionFeedback } from '../shared/dialogue_v2_completion_contract';

const objectiveIds = ['goal_1', 'goal_2', 'goal_3', 'goal_4', 'goal_5', 'goal_6'];
const personaIds = ['host', 'planner'];
const userMessageIds = ['user_1', 'user_2', 'user_3'];

function feedback() {
  return {
    speakerPersonaId: 'host',
    overallAssessment: 'You moved the plan forward clearly and kept a considerate tone throughout the exchange.',
    objectiveResults: objectiveIds.map((objectiveId, index) => ({
      objectiveId,
      status: index < 5 ? 'met' : 'not_met',
      evidenceMessageIds: index < 5 ? ['user_1'] : ['user_3'],
    })),
    evidenceMessageIds: ['user_1', 'user_3'],
    languageNote: {
      sourceMessageId: 'user_3',
      corrected: 'A clearer phrasing is available for the final request.',
      reason: 'It makes the request sound more natural in this conversation.',
    },
    nextStep: 'Try one follow-up message that confirms the final arrangement.',
  };
}

describe('dialogue v2 completion feedback', () => {
  test('requires a detailed grounded debrief from a scenario persona', () => {
    expect(validateDialogueV2CompletionFeedback(feedback(), {
      objectiveIds, personaIds, userMessageIds,
    })).toEqual({ ok: true });
  });

  test('rejects an ungrounded debrief or incomplete objective summary', () => {
    const ungrounded = feedback();
    ungrounded.evidenceMessageIds = ['user_999'];
    expect(validateDialogueV2CompletionFeedback(ungrounded, {
      objectiveIds, personaIds, userMessageIds,
    })).toEqual({ ok: false, error: 'evidence_invalid' });

    const incomplete = feedback();
    incomplete.objectiveResults.pop();
    expect(validateDialogueV2CompletionFeedback(incomplete, {
      objectiveIds, personaIds, userMessageIds,
    })).toEqual({ ok: false, error: 'objective_results_invalid' });
  });

  test('requires evidence for each objective and refuses empty/duplicate context', () => {
    const missingObjectiveEvidence = feedback();
    delete (missingObjectiveEvidence.objectiveResults[0] as { evidenceMessageIds?: string[] }).evidenceMessageIds;
    expect(validateDialogueV2CompletionFeedback(missingObjectiveEvidence, {
      objectiveIds, personaIds, userMessageIds,
    })).toEqual({ ok: false, error: 'objective_results_invalid' });

    expect(validateDialogueV2CompletionFeedback(feedback(), {
      objectiveIds: [], personaIds, userMessageIds,
    })).toEqual({ ok: false, error: 'context_invalid' });
  });
});
