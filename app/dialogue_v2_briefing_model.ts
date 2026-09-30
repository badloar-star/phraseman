import { getDialogueV2CatalogueEntry } from '../shared/dialogue_v2_catalogue_index';
import { projectAuthorizedDialogueV2Catalogue } from './dialogue_v2_authorized_catalogue_projection';

export type DialogueV2BriefingModel = Readonly<{
  title: string;
  cefr: string;
  briefing: string;
  rankRequired: number;
  unlocked: boolean;
  objectives: readonly Readonly<{ id: string; label: string }>[];
  participants: readonly Readonly<{ id: string; displayName: string; styleNote: string }>[];
}>;

export type DialogueV2BriefingModelInput = Readonly<{
  packets: readonly unknown[];
  studyTarget: unknown;
  scenarioId: unknown;
  localCoinRank: unknown;
}>;

const INTERNAL_WORLD_HEADINGS = Object.freeze([
  { id: 'social', title: 'social' }, { id: 'work', title: 'work' },
  { id: 'travel', title: 'travel' }, { id: 'everyday', title: 'everyday' },
]);

type VerifiedPacket = Readonly<{
  scenario: Readonly<{
    id: string;
    personas: readonly Readonly<{ id: string; displayName: string; styleNote: string }>[];
    objectives: readonly Readonly<{ id: string; label: string }>[];
  }>;
  content: Readonly<{ title: string; briefing: string }>;
}>;

function packetWithId(packets: readonly unknown[], scenarioId: string): VerifiedPacket | null {
  for (const packet of packets) {
    if (!packet || typeof packet !== 'object' || Array.isArray(packet)) continue;
    const scenario = (packet as { scenario?: unknown }).scenario;
    if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)
      || (scenario as { id?: unknown }).id !== scenarioId) continue;
    return packet as VerifiedPacket;
  }
  return null;
}

/**
 * Converts an already revalidated public V2 catalogue response into the exact
 * briefing view data for one route ID. Route params contain only the ID; no
 * learner content is serialized into navigation.
 */
export function buildDialogueV2BriefingModel(
  input: DialogueV2BriefingModelInput,
): DialogueV2BriefingModel | null {
  if (typeof input.scenarioId !== 'string' || !getDialogueV2CatalogueEntry(input.scenarioId)) return null;
  const catalogue = projectAuthorizedDialogueV2Catalogue({
    packets: input.packets,
    studyTarget: input.studyTarget,
    localCoinRank: input.localCoinRank,
    worldHeadings: INTERNAL_WORLD_HEADINGS,
  });
  const item = catalogue?.items.find((candidate) => candidate.id === input.scenarioId);
  const packet = item ? packetWithId(input.packets, item.id) : null;
  if (!item || !packet) return null;
  return Object.freeze({
    title: packet.content.title,
    cefr: item.cefr,
    briefing: packet.content.briefing,
    rankRequired: item.rankRequired,
    unlocked: item.status !== 'locked',
    objectives: Object.freeze(packet.scenario.objectives.map((objective) => Object.freeze({ ...objective }))),
    participants: Object.freeze(packet.scenario.personas.map((participant) => Object.freeze({
      id: participant.id,
      displayName: participant.displayName,
      styleNote: participant.styleNote,
    }))),
  });
}
