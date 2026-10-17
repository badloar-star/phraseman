import {
  getDialogueV2LocalRankAccess,
  logDialogueV2RankGate,
  type DialogueV2RankGateRow,
} from './dialogue_v2_local_rank_access';
import type {
  DialogueV2CatalogueLearnerItem,
  DialogueV2CatalogueWorld,
} from '../components/dialogs/DialogueV2CatalogueSection';
import {
  DIALOGUE_V2_CATALOGUE_INDEX,
} from '../shared/dialogue_v2_catalogue_index';
import {
  DIALOGUE_V2_STUDY_TARGETS,
  matchesDialogueV2ApprovedLanguagePackManifest,
  type DialogueV2ApprovedLanguagePackManifest,
  type DialogueV2LanguagePack,
  type DialogueV2StudyTarget,
} from '../shared/dialogue_v2_language_pack_contract';
import {
  DIALOGUE_V2_WORLD_IDS,
  type DialogueV2WorldId,
} from '../shared/dialogue_v2_contract';

export type DialogueV2ReleasedCatalogueProjection = Readonly<{
  worlds: readonly DialogueV2CatalogueWorld[];
  items: readonly DialogueV2CatalogueLearnerItem[];
}>;

export type DialogueV2ReleasedCatalogueProjectionInput = Readonly<{
  /** Packets must have come from a server-approved release envelope. */
  packets: readonly unknown[];
  manifest: DialogueV2ApprovedLanguagePackManifest;
  studyTarget: unknown;
  /** Local-first presentation input; it is not a service authorization. */
  localCoinRank: unknown;
  /** Ordered localized headings from the released surface, never packet copy. */
  worldHeadings: readonly unknown[];
}>;

function isStudyTarget(value: unknown): value is DialogueV2StudyTarget {
  return typeof value === 'string'
    && (DIALOGUE_V2_STUDY_TARGETS as readonly string[]).includes(value);
}

function isAuthoringLikePacket(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return true;
  const candidate = value as Record<string, unknown>;
  return candidate.status === 'draft'
    || candidate.status === 'authoring_only_not_releaseable'
    || Object.prototype.hasOwnProperty.call(candidate, 'authoring')
    || Object.prototype.hasOwnProperty.call(candidate, 'authoringStatus');
}

function validWorldHeadings(value: readonly unknown[]): readonly DialogueV2CatalogueWorld[] | null {
  if (value.length !== DIALOGUE_V2_WORLD_IDS.length) return null;
  const ids = new Set<string>();
  const headings: DialogueV2CatalogueWorld[] = [];
  for (const rawHeading of value) {
    if (!rawHeading || typeof rawHeading !== 'object' || Array.isArray(rawHeading)) return null;
    const heading = rawHeading as Partial<DialogueV2CatalogueWorld>;
    if (typeof heading.id !== 'string'
      || !DIALOGUE_V2_WORLD_IDS.includes(heading.id as DialogueV2WorldId)
      || ids.has(heading.id)
      || typeof heading.title !== 'string'
      || heading.title !== heading.title.trim()
      || heading.title.length === 0) return null;
    ids.add(heading.id);
    headings.push(Object.freeze({ id: heading.id, title: heading.title }));
  }
  return ids.size === DIALOGUE_V2_WORLD_IDS.length ? Object.freeze(headings) : null;
}

function releasedTargetPackets(
  packets: readonly unknown[],
  manifest: DialogueV2ApprovedLanguagePackManifest,
  studyTarget: DialogueV2StudyTarget,
): ReadonlyMap<string, DialogueV2LanguagePack> | null {
  if (packets.length !== DIALOGUE_V2_CATALOGUE_INDEX.length) return null;
  const byScenarioId = new Map<string, DialogueV2LanguagePack>();
  for (const candidate of packets) {
    if (isAuthoringLikePacket(candidate)
      || !matchesDialogueV2ApprovedLanguagePackManifest(candidate, manifest)) return null;
    const packet = candidate as DialogueV2LanguagePack;
    if (packet.studyTarget !== studyTarget || byScenarioId.has(packet.scenario.id)) return null;
    byScenarioId.set(packet.scenario.id, packet);
  }
  if (byScenarioId.size !== DIALOGUE_V2_CATALOGUE_INDEX.length) return null;
  return DIALOGUE_V2_CATALOGUE_INDEX.every((entry) => byScenarioId.has(entry.id))
    ? byScenarioId
    : null;
}

/**
 * Builds learner rows only from a complete, manifest-pinned language release.
 * Any draft, partial, duplicate, cross-target or unpinned input fails closed.
 */
export function projectReleasedDialogueV2Catalogue(
  input: DialogueV2ReleasedCatalogueProjectionInput,
): DialogueV2ReleasedCatalogueProjection | null {
  try {
    if (!isStudyTarget(input.studyTarget)) return null;
    const worlds = validWorldHeadings(input.worldHeadings);
    if (!worlds) return null;
    const packets = releasedTargetPackets(input.packets, input.manifest, input.studyTarget);
    if (!packets) return null;

    const items: DialogueV2CatalogueLearnerItem[] = [];
    const gateRows: DialogueV2RankGateRow[] = [];
    for (const entry of DIALOGUE_V2_CATALOGUE_INDEX) {
      const packet = packets.get(entry.id);
      const rankAccess = getDialogueV2LocalRankAccess(entry.id, input.localCoinRank);
      if (!packet || !rankAccess) return null;
      items.push(Object.freeze({
        id: entry.id,
        worldId: entry.worldId,
        title: packet.content.title,
        cefr: entry.cefr,
        // зачем (правило владельца 13.10): ранг открытия из таблицы, не номер сценария в разделе
        rankRequired: entry.unlockRank,
        status: rankAccess.access.status === 'unlocked' ? 'available' : 'locked',
      }));
      gateRows.push({ id: entry.id, cefr: entry.cefr, unlockRank: entry.unlockRank, decision: rankAccess.access.status === 'unlocked' ? 'открыт' : 'закрыт' }); // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
    }
    logDialogueV2RankGate('released', input.studyTarget, input.localCoinRank, gateRows);
    return Object.freeze({ worlds, items: Object.freeze(items) });
  } catch {
    return null;
  }
}
