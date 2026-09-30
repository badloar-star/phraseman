import { buildDialogueV2CompletionReview } from '../app/dialogue_v2_completion_review_adapter';

const objectiveIds = ['open', 'clarify', 'propose', 'agree', 'confirm', 'close'] as const;
const personaIds = ['maya', 'leon'] as const;
const userMessageIds = ['u-1', 'u-2', 'u-3', 'u-4', 'u-5', 'u-6'] as const;

const feedback = {
  overallAssessment: 'You kept the group moving, clarified the choice, and closed the plan politely.',
  nextStep: 'Next time, add one short reason before your proposal.',
  speakerPersonaId: 'maya',
  objectiveResults: objectiveIds.map((objectiveId, index) => ({
    objectiveId,
    status: index === 2 ? 'not_met' : 'met',
    evidenceMessageIds: [userMessageIds[index]],
  })),
  evidenceMessageIds: ['u-1', 'u-4'],
  languageNote: {
    sourceMessageId: 'u-3',
    corrected: 'Could we meet at seven instead?',
    reason: 'This wording is a little more natural for a friendly plan.',
  },
} as const;

describe('buildDialogueV2CompletionReview', () => {
  const context = { objectiveIds, personaIds, userMessageIds };
  const labels = Object.freeze({
    open: 'Open the group chat',
    clarify: 'Clarify the plan',
    propose: 'Make a proposal',
    agree: 'Reach agreement',
    confirm: 'Confirm the details',
    close: 'Close politely',
  });
  const messages = Object.freeze({
    'u-1': 'Hi everyone!',
    'u-2': 'What time works for you?',
    'u-3': 'Could we meet at seven?',
    'u-4': 'That works for me.',
    'u-5': 'Great, I will book it.',
    'u-6': 'See you there!',
  });

  test('projects a grounded V2 debrief with all task results and message evidence', () => {
    expect(buildDialogueV2CompletionReview({
      feedback,
      context,
      objectiveLabels: labels,
      personaNames: { maya: 'Maya', leon: 'Leon' },
      userMessages: messages,
      evidenceNote: 'Message from this conversation.',
    })).toEqual({
      ok: true,
      assessment: feedback.overallAssessment,
      tip: feedback.nextStep,
      speakerPersonaId: 'maya',
      speakerName: 'Maya',
      evidence: [
        { learnerTurn: 'Hi everyone!', note: 'Message from this conversation.' },
        { learnerTurn: 'That works for me.', note: 'Message from this conversation.' },
      ],
      objectiveResults: [
        { objectiveId: 'open', label: 'Open the group chat', status: 'met', evidence: ['Hi everyone!'] },
        { objectiveId: 'clarify', label: 'Clarify the plan', status: 'met', evidence: ['What time works for you?'] },
        { objectiveId: 'propose', label: 'Make a proposal', status: 'not_met', evidence: ['Could we meet at seven?'] },
        { objectiveId: 'agree', label: 'Reach agreement', status: 'met', evidence: ['That works for me.'] },
        { objectiveId: 'confirm', label: 'Confirm the details', status: 'met', evidence: ['Great, I will book it.'] },
        { objectiveId: 'close', label: 'Close politely', status: 'met', evidence: ['See you there!'] },
      ],
      corrections: [{
        original: 'Could we meet at seven?',
        corrected: 'Could we meet at seven instead?',
        note: 'This wording is a little more natural for a friendly plan.',
        kind: 'polish',
      }],
    });
  });

  test('fails closed when the debrief is not grounded in the accepted user-message ledger', () => {
    expect(buildDialogueV2CompletionReview({
      feedback: { ...feedback, evidenceMessageIds: ['invented'] },
      context,
      objectiveLabels: labels,
      personaNames: { maya: 'Maya', leon: 'Leon' },
      userMessages: messages,
      evidenceNote: 'Message from this conversation.',
    })).toBeNull();
  });

  test('fails closed when a reviewed task has no learner-visible V2 label', () => {
    const { close: _close, ...missingLabel } = labels;
    expect(buildDialogueV2CompletionReview({
      feedback,
      context,
      objectiveLabels: missingLabel,
      personaNames: { maya: 'Maya', leon: 'Leon' },
      userMessages: messages,
      evidenceNote: 'Message from this conversation.',
    })).toBeNull();
  });
});
