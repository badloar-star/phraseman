import type {
  DialogueV2GroupMood,
  DialogueV2GroupParticipant,
  DialogueV2GroupReplyStyle,
} from './dialogue_v2_group_turn_planner';

/** Stable authoring mood is not the same thing as transient availability. */
export type DialogueV2PersonaAuthoringMood =
  | 'open'
  | 'focused'
  | 'helpful'
  | 'measured'
  | 'energetic';

export type DialogueV2ParticipantAvailability = 'active' | 'away';

type DialogueV2PackPersonaForTurn = Readonly<{
  id: string;
  replyStyle: DialogueV2GroupReplyStyle;
  mood: DialogueV2PersonaAuthoringMood;
}>;

const RUNTIME_MOOD: Readonly<Record<DialogueV2PersonaAuthoringMood, Exclude<DialogueV2GroupMood, 'away'>>> = {
  open: 'engaged',
  helpful: 'engaged',
  energetic: 'engaged',
  focused: 'neutral',
  measured: 'reserved',
};

/**
 * Converts the authored personality to the planner's transient scheduling
 * state. `away` is never a personality trait: it comes only from current
 * availability, so a participant can return without losing their voice.
 */
export function adaptDialogueV2PersonaForGroupTurn(
  persona: DialogueV2PackPersonaForTurn,
  runtime: Readonly<{
    availability: DialogueV2ParticipantAvailability;
    relevance: number;
  }>,
): DialogueV2GroupParticipant {
  return Object.freeze({
    id: persona.id,
    replyStyle: persona.replyStyle,
    mood: runtime.availability === 'away' ? 'away' : RUNTIME_MOOD[persona.mood],
    relevance: runtime.relevance,
  });
}
