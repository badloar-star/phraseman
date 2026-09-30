export type DialogueV2CompletionFeedbackContext = Readonly<{
  objectiveIds: readonly string[];
  personaIds: readonly string[];
  userMessageIds: readonly string[];
}>;

export type DialogueV2CompletionFeedbackValidation =
  | Readonly<{ ok: true }>
  | Readonly<{
    ok: false;
    error: 'context_invalid' | 'feedback_invalid' | 'speaker_invalid' | 'objective_results_invalid'
      | 'evidence_invalid' | 'language_note_invalid';
  }>;

const COMPLETION_STATUSES = new Set(['met', 'not_met']);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function boundedMessage(value: unknown, minimum: number, maximum: number): boolean {
  return typeof value === 'string'
    && value === value.trim()
    && value.length >= minimum
    && value.length <= maximum;
}

function canonicalId(value: unknown): value is string {
  return typeof value === 'string' && value === value.trim() && value.length > 0 && value.length <= 128;
}

function uniqueCanonicalIds(ids: readonly string[], minimum: number, maximum: number): boolean {
  return ids.length >= minimum && ids.length <= maximum && ids.every(canonicalId) && new Set(ids).size === ids.length;
}

/**
 * Structural guard for the terminal debrief. The caller must supply IDs from
 * a server-resolved scenario and the accepted user-turn ledger; this prevents
 * a completion page from showing an ungrounded generic verdict.
 */
export function validateDialogueV2CompletionFeedback(
  value: unknown,
  context: DialogueV2CompletionFeedbackContext,
): DialogueV2CompletionFeedbackValidation {
  if (!uniqueCanonicalIds(context.objectiveIds, 6, 12)
    || !uniqueCanonicalIds(context.personaIds, 1, 6)
    || !uniqueCanonicalIds(context.userMessageIds, 1, 200)) {
    return { ok: false, error: 'context_invalid' };
  }
  const feedback = record(value);
  if (!feedback || !boundedMessage(feedback.overallAssessment, 20, 1_000)
    || !boundedMessage(feedback.nextStep, 5, 400)) return { ok: false, error: 'feedback_invalid' };
  const personaIds = new Set(context.personaIds);
  if (typeof feedback.speakerPersonaId !== 'string' || !personaIds.has(feedback.speakerPersonaId)) {
    return { ok: false, error: 'speaker_invalid' };
  }
  if (!Array.isArray(feedback.objectiveResults) || feedback.objectiveResults.length !== context.objectiveIds.length) {
    return { ok: false, error: 'objective_results_invalid' };
  }
  const expectedObjectives = new Set(context.objectiveIds);
  const observedObjectives = new Set<string>();
  const actualUserMessages = new Set(context.userMessageIds);
  for (const rawResult of feedback.objectiveResults) {
    const result = record(rawResult);
    if (!result || typeof result.objectiveId !== 'string' || !expectedObjectives.has(result.objectiveId)
      || observedObjectives.has(result.objectiveId) || typeof result.status !== 'string'
      || !COMPLETION_STATUSES.has(result.status) || !Array.isArray(result.evidenceMessageIds)
      || result.evidenceMessageIds.length < 1) return { ok: false, error: 'objective_results_invalid' };
    const resultEvidence = new Set<string>();
    for (const evidenceId of result.evidenceMessageIds) {
      if (typeof evidenceId !== 'string' || !actualUserMessages.has(evidenceId) || resultEvidence.has(evidenceId)) {
        return { ok: false, error: 'objective_results_invalid' };
      }
      resultEvidence.add(evidenceId);
    }
    observedObjectives.add(result.objectiveId);
  }
  if (!Array.isArray(feedback.evidenceMessageIds) || feedback.evidenceMessageIds.length < 1) {
    return { ok: false, error: 'evidence_invalid' };
  }
  const evidenceIds = new Set<string>();
  for (const evidenceId of feedback.evidenceMessageIds) {
    if (typeof evidenceId !== 'string' || !actualUserMessages.has(evidenceId) || evidenceIds.has(evidenceId)) {
      return { ok: false, error: 'evidence_invalid' };
    }
    evidenceIds.add(evidenceId);
  }
  if (feedback.languageNote !== null && feedback.languageNote !== undefined) {
    const note = record(feedback.languageNote);
    if (!note || typeof note.sourceMessageId !== 'string' || !actualUserMessages.has(note.sourceMessageId)
      || !boundedMessage(note.corrected, 5, 500) || !boundedMessage(note.reason, 5, 500)) {
      return { ok: false, error: 'language_note_invalid' };
    }
  }
  return { ok: true };
}
