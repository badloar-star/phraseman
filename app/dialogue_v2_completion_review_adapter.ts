import {
  validateDialogueV2CompletionFeedback,
  type DialogueV2CompletionFeedbackContext,
} from '../shared/dialogue_v2_completion_contract';

export type DialogueV2CompletionReview = Readonly<{
  ok: true;
  assessment: string;
  tip: string;
  speakerPersonaId: string;
  speakerName: string;
  evidence: readonly Readonly<{ learnerTurn: string; note: string }>[];
  objectiveResults: readonly Readonly<{
    objectiveId: string;
    label: string;
    status: 'met' | 'not_met';
    evidence: readonly string[];
  }>[];
  corrections: readonly Readonly<{
    original: string;
    corrected: string;
    note: string;
    kind: 'polish';
  }>[];
}>;

type ValidatedFeedback = Readonly<{
  overallAssessment: string;
  nextStep: string;
  speakerPersonaId: string;
  objectiveResults: readonly Readonly<{
    objectiveId: string;
    status: 'met' | 'not_met';
    evidenceMessageIds: readonly string[];
  }>[];
  evidenceMessageIds: readonly string[];
  languageNote?: Readonly<{
    sourceMessageId: string;
    corrected: string;
    reason: string;
  }> | null;
}>;

function learnerFacingText(value: unknown): value is string {
  return typeof value === 'string' && value === value.trim() && value.length > 0;
}

/**
 * Adapts a server-validated V2 terminal debrief to the existing verdict view.
 * This is deliberately fail-closed: it does not turn an arbitrary model reply
 * into an assessment, and therefore cannot make a claim beyond the accepted
 * user-message ledger and the released scenario's labelled tasks.
 */
export function buildDialogueV2CompletionReview(input: Readonly<{
  feedback: unknown;
  context: unknown;
  objectiveLabels: unknown;
  personaNames: unknown;
  userMessages: unknown;
  evidenceNote: unknown;
}>): DialogueV2CompletionReview | null {
  const record = (value: unknown): Record<string, unknown> | null => (
    value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null
  );
  const rawContext = record(input.context);
  if (!rawContext
    || !Array.isArray(rawContext.objectiveIds)
    || !Array.isArray(rawContext.personaIds)
    || !Array.isArray(rawContext.userMessageIds)) return null;
  const context: DialogueV2CompletionFeedbackContext = {
    objectiveIds: rawContext.objectiveIds as string[],
    personaIds: rawContext.personaIds as string[],
    userMessageIds: rawContext.userMessageIds as string[],
  };
  const objectiveLabels = record(input.objectiveLabels);
  const personaNames = record(input.personaNames);
  const userMessages = record(input.userMessages);
  if (!objectiveLabels || !personaNames || !userMessages
    || !validateDialogueV2CompletionFeedback(input.feedback, context).ok
    || !learnerFacingText(input.evidenceNote)) return null;

  const feedback = input.feedback as ValidatedFeedback;
  const speakerName = personaNames[feedback.speakerPersonaId];
  if (!learnerFacingText(speakerName)) return null;

  const messageFor = (messageId: string): string | null => {
    const message = userMessages[messageId];
    return learnerFacingText(message) ? message : null;
  };

  const evidence = feedback.evidenceMessageIds.map((messageId) => {
    const learnerTurn = messageFor(messageId);
    return learnerTurn ? { learnerTurn, note: input.evidenceNote } : null;
  });
  if (evidence.some((item) => item === null)) return null;

  const objectiveResults = feedback.objectiveResults.map((result) => {
    const label = objectiveLabels[result.objectiveId];
    if (!learnerFacingText(label)) return null;
    const resultEvidence = result.evidenceMessageIds.map(messageFor);
    if (resultEvidence.some((item) => item === null)) return null;
    return {
      objectiveId: result.objectiveId,
      label,
      status: result.status,
      evidence: resultEvidence as string[],
    };
  });
  if (objectiveResults.some((item) => item === null)) return null;

  const note = feedback.languageNote;
  const original = note ? messageFor(note.sourceMessageId) : null;
  if (note && !original) return null;

  return {
    ok: true,
    assessment: feedback.overallAssessment,
    tip: feedback.nextStep,
    speakerPersonaId: feedback.speakerPersonaId,
    speakerName,
    evidence: evidence as readonly Readonly<{ learnerTurn: string; note: string }>[],
    objectiveResults: objectiveResults as readonly Readonly<{
      objectiveId: string;
      label: string;
      status: 'met' | 'not_met';
      evidence: readonly string[];
    }>[],
    corrections: note
      ? [{ original: original!, corrected: note.corrected, note: note.reason, kind: 'polish' }]
      : [],
  };
}
