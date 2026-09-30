/**
 * Deterministic turn allocation for a group dialogue. It chooses recipients
 * before a model is asked to write anything, so a group never fans out into
 * one costly reply per participant.
 */
export type DialogueV2GroupReplyStyle = 'warm' | 'direct' | 'calm' | 'playful' | 'formal';
export type DialogueV2GroupMood = 'engaged' | 'neutral' | 'reserved' | 'away';
export type DialogueV2GroupEventKind = 'question' | 'proposal' | 'conflict' | 'logistics' | 'celebration' | 'discussion' | 'acknowledgement';

export type DialogueV2GroupParticipant = Readonly<{
  id: string;
  replyStyle: DialogueV2GroupReplyStyle;
  mood: DialogueV2GroupMood;
  /** Server-derived semantic relevance for the current message, from 0 to 10. */
  relevance: number;
}>;

export type DialogueV2GroupReplyPolicy = Readonly<{
  maxDirectReplies: 1;
  maxUsefulFollowUps: 0 | 1;
  silenceAllowed: true;
}>;

export type DialogueV2GroupTurnPlan =
  | Readonly<{
    kind: 'silence';
    reason: 'no_useful_reply' | 'no_available_participant' | 'addressed_participant_unavailable' | 'input_invalid';
  }>
  | Readonly<{
    kind: 'reply';
    primaryPersonaId: string;
    followUpPersonaId: string | null;
    reason: 'directly_addressed' | 'objective_relevance';
  }>;

const STYLE_FOR_EVENT: Readonly<Record<DialogueV2GroupEventKind, DialogueV2GroupReplyStyle>> = {
  question: 'warm',
  proposal: 'direct',
  conflict: 'calm',
  logistics: 'formal',
  celebration: 'playful',
  discussion: 'calm',
  acknowledgement: 'warm',
};

const PERSONA_ID_RE = /^(?=.{1,128}$)[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
const REPLY_STYLES = new Set<DialogueV2GroupReplyStyle>(['warm', 'direct', 'calm', 'playful', 'formal']);
const MOODS = new Set<DialogueV2GroupMood>(['engaged', 'neutral', 'reserved', 'away']);
const EVENT_KINDS = new Set<DialogueV2GroupEventKind>([
  'question', 'proposal', 'conflict', 'logistics', 'celebration', 'discussion', 'acknowledgement',
]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function canonicalPersonaId(value: unknown): value is string {
  return typeof value === 'string' && value === value.trim() && PERSONA_ID_RE.test(value);
}

function validRuntimeInput(value: unknown): boolean {
  const input = record(value);
  if (!input || !Array.isArray(input.participants)) return false;
  const policy = record(input.policy);
  const event = record(input.event);
  if (!policy || !event || policy.maxDirectReplies !== 1
    || (policy.maxUsefulFollowUps !== 0 && policy.maxUsefulFollowUps !== 1)
    || policy.silenceAllowed !== true
    || !EVENT_KINDS.has(event.kind as DialogueV2GroupEventKind)
    || typeof event.advancesObjective !== 'boolean'
    || typeof event.needsConsensus !== 'boolean'
    || (input.lastSpeakerId !== null && !canonicalPersonaId(input.lastSpeakerId))
    || (input.addressedPersonaId !== null && !canonicalPersonaId(input.addressedPersonaId))) return false;
  const ids = new Set<string>();
  return input.participants.length > 0 && input.participants.every((rawParticipant) => {
    const participant = record(rawParticipant);
    if (!participant || !canonicalPersonaId(participant.id) || ids.has(participant.id)
      || !REPLY_STYLES.has(participant.replyStyle as DialogueV2GroupReplyStyle)
      || !MOODS.has(participant.mood as DialogueV2GroupMood)
      || typeof participant.relevance !== 'number' || !Number.isFinite(participant.relevance)
      || participant.relevance < 0 || participant.relevance > 10) return false;
    ids.add(participant.id);
    return true;
  });
}

function isAvailable(participant: DialogueV2GroupParticipant): boolean {
  return participant.mood !== 'away';
}

function boundedRelevance(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(10, value)) : 0;
}

function scoreParticipant(
  participant: DialogueV2GroupParticipant,
  eventKind: DialogueV2GroupEventKind,
  lastSpeakerId: string | null,
  canAvoidRepeatingLastSpeaker: boolean,
): number {
  const mood = participant.mood === 'engaged' ? 3 : participant.mood === 'neutral' ? 1 : 0;
  const matchingStyle = participant.replyStyle === STYLE_FOR_EVENT[eventKind] ? 2 : 0;
  const repetitionPenalty = canAvoidRepeatingLastSpeaker && participant.id === lastSpeakerId ? -100 : 0;
  return boundedRelevance(participant.relevance) * 10 + mood + matchingStyle + repetitionPenalty;
}

function preferredParticipant(
  candidates: readonly DialogueV2GroupParticipant[],
  eventKind: DialogueV2GroupEventKind,
  lastSpeakerId: string | null,
): DialogueV2GroupParticipant | null {
  if (candidates.length === 0) return null;
  const canAvoidRepeatingLastSpeaker = candidates.some((candidate) => candidate.id !== lastSpeakerId);
  return [...candidates].sort((left, right) => {
    const score = scoreParticipant(right, eventKind, lastSpeakerId, canAvoidRepeatingLastSpeaker)
      - scoreParticipant(left, eventKind, lastSpeakerId, canAvoidRepeatingLastSpeaker);
    return score || left.id.localeCompare(right.id);
  })[0] ?? null;
}

function shouldStaySilent(event: { kind: DialogueV2GroupEventKind; advancesObjective: boolean; needsConsensus: boolean }): boolean {
  return event.kind === 'acknowledgement' && !event.advancesObjective && !event.needsConsensus;
}

/**
 * Selects zero, one, or two distinct characters. A follow-up is allowed only
 * where a shared decision benefits from it; it is never an automatic chorus.
 */
export function planDialogueV2GroupTurn(input: Readonly<{
  participants: readonly DialogueV2GroupParticipant[];
  policy: DialogueV2GroupReplyPolicy;
  lastSpeakerId: string | null;
  addressedPersonaId: string | null;
  event: Readonly<{
    kind: DialogueV2GroupEventKind;
    advancesObjective: boolean;
    needsConsensus: boolean;
  }>;
}>): DialogueV2GroupTurnPlan {
  if (!validRuntimeInput(input)) return { kind: 'silence', reason: 'input_invalid' };
  if (shouldStaySilent(input.event) && input.policy.silenceAllowed) {
    return { kind: 'silence', reason: 'no_useful_reply' };
  }
  const available = input.participants.filter(isAvailable);
  if (available.length === 0) return { kind: 'silence', reason: 'no_available_participant' };

  const requestedParticipant = input.addressedPersonaId
    ? input.participants.find((participant) => participant.id === input.addressedPersonaId) ?? null
    : null;
  if (input.addressedPersonaId && (!requestedParticipant || !isAvailable(requestedParticipant))) {
    return { kind: 'silence', reason: 'addressed_participant_unavailable' };
  }
  const directlyAddressed = requestedParticipant;
  const highestRelevance = available.reduce((highest, participant) => Math.max(highest, participant.relevance), 0);
  if (!directlyAddressed && !input.event.advancesObjective && !input.event.needsConsensus && highestRelevance < 1) {
    return { kind: 'silence', reason: 'no_useful_reply' };
  }
  const primary = directlyAddressed ?? preferredParticipant(available, input.event.kind, input.lastSpeakerId);
  if (!primary) return { kind: 'silence', reason: 'no_available_participant' };

  const usefulFollowUpCandidates = available.filter((participant) => (
    participant.id !== primary.id
    && participant.id !== input.lastSpeakerId
    && participant.relevance >= 1
    && participant.mood !== 'reserved'
  ));
  const followUp = input.policy.maxUsefulFollowUps === 1 && input.event.needsConsensus
    ? preferredParticipant(
      usefulFollowUpCandidates,
      input.event.kind,
      input.lastSpeakerId,
    )
    : null;

  return {
    kind: 'reply',
    primaryPersonaId: primary.id,
    followUpPersonaId: followUp?.id ?? null,
    reason: directlyAddressed ? 'directly_addressed' : 'objective_relevance',
  };
}
