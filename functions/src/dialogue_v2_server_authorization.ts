import {
  DIALOGUE_V2_STUDY_TARGETS,
  matchesDialogueV2ApprovedLanguagePackManifest,
  type DialogueV2ApprovedLanguagePackManifest,
  type DialogueV2LanguagePack,
  type DialogueV2StudyTarget,
} from '../../shared/dialogue_v2_language_pack_contract';
import { DIALOGUE_V2_CATALOGUE_INDEX } from '../../shared/dialogue_v2_catalogue_index';
import { validateDialogueV2ReleaseCoverage } from '../../shared/dialogue_v2_release_coverage_contract';
import { verifyDialogueV2PackSha256 } from './dialogue_v2_pack_integrity';
import { reportCauseServer } from './swallowed_error'; // зачем (координатор 13.10): причина сбоя в журнале, поведение прежнее

/**
 * Immutable, server-owned V2 release data. Request fields select a packet;
 * they never supply its prompt, objectives, persona, rank or review receipt.
 */
export type DialogueV2ServerRelease = Readonly<{
  manifest: DialogueV2ApprovedLanguagePackManifest;
  packets: Readonly<Record<string, DialogueV2LanguagePack>>;
}>;

export type DialogueV2AuthorizedCatalogue = Readonly<{
  packets: readonly DialogueV2LearnerCataloguePacket[];
}>;

export type DialogueV2LearnerCataloguePacket = Readonly<{
  studyTarget: DialogueV2LanguagePack['studyTarget'];
  scenario: Readonly<{
    id: DialogueV2LanguagePack['scenario']['id'];
    worldId: DialogueV2LanguagePack['scenario']['worldId'];
    rankRequired: DialogueV2LanguagePack['scenario']['rankRequired'];
    cefr: DialogueV2LanguagePack['scenario']['cefr'];
    personas: DialogueV2LanguagePack['scenario']['personas'];
    objectives: DialogueV2LanguagePack['scenario']['objectives'];
    groupReplyPolicy: DialogueV2LanguagePack['scenario']['groupReplyPolicy'];
  }>;
  content: DialogueV2LanguagePack['content'];
}>;

type DialogueV2ServerPacketRequest = Readonly<{
  studyTarget?: unknown;
  scenarioId?: unknown;
  [field: string]: unknown;
}>;

function releaseKey(studyTarget: DialogueV2StudyTarget, scenarioId: string): string {
  return `${studyTarget}:${scenarioId}`;
}

function asStudyTarget(value: unknown): DialogueV2StudyTarget | null {
  return typeof value === 'string'
    && (DIALOGUE_V2_STUDY_TARGETS as readonly string[]).includes(value)
    ? value as DialogueV2StudyTarget
    : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

const SNAPSHOT_REJECTED = Symbol('snapshot_rejected');
const MAX_SNAPSHOT_DEPTH = 16;
const MAX_SNAPSHOT_PROPERTIES = 100_000;

type SnapshotRejected = typeof SNAPSHOT_REJECTED;
type SnapshotBudget = { remainingProperties: number };

/**
 * Copies descriptor values exactly once into frozen plain data. Accessors,
 * exotic prototypes, symbols and cycles are rejected without invoking them.
 * A Proxy may describe data properties, but its `get` trap is never trusted.
 */
function snapshotDataOnly(
  value: unknown,
  visiting: WeakSet<object>,
  budget: SnapshotBudget,
  depth = 0,
): unknown | SnapshotRejected {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : SNAPSHOT_REJECTED;
  if (typeof value !== 'object' || depth > MAX_SNAPSHOT_DEPTH) return SNAPSHOT_REJECTED;
  if (visiting.has(value)) return SNAPSHOT_REJECTED;

  const isArray = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (isArray ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
    return SNAPSHOT_REJECTED;
  }

  visiting.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  budget.remainingProperties -= keys.length;
  if (budget.remainingProperties < 0 || keys.some((key) => typeof key !== 'string')) {
    return SNAPSHOT_REJECTED;
  }

  if (isArray) {
    const lengthDescriptor = descriptors.length;
    if (!lengthDescriptor || !('value' in lengthDescriptor)
      || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) {
      return SNAPSHOT_REJECTED;
    }
    const length = lengthDescriptor.value as number;
    const indexKeys = keys.filter((key) => key !== 'length') as string[];
    if (indexKeys.length !== length) return SNAPSHOT_REJECTED;
    const snapshot: unknown[] = new Array(length);
    for (const key of indexKeys) {
      const index = Number(key);
      const descriptor = descriptors[key];
      if (!Number.isSafeInteger(index) || index < 0 || index >= length || String(index) !== key
        || !descriptor || !descriptor.enumerable || !('value' in descriptor)) {
        return SNAPSHOT_REJECTED;
      }
      const child = snapshotDataOnly(descriptor.value, visiting, budget, depth + 1);
      if (child === SNAPSHOT_REJECTED) return SNAPSHOT_REJECTED;
      snapshot[index] = child;
    }
    visiting.delete(value);
    return Object.freeze(snapshot);
  }

  const snapshot = Object.create(null) as Record<string, unknown>;
  for (const key of keys as string[]) {
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return SNAPSHOT_REJECTED;
    const child = snapshotDataOnly(descriptor.value, visiting, budget, depth + 1);
    if (child === SNAPSHOT_REJECTED) return SNAPSHOT_REJECTED;
    Object.defineProperty(snapshot, key, {
      value: child,
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  visiting.delete(value);
  return Object.freeze(snapshot);
}

function asServerRelease(value: unknown): DialogueV2ServerRelease | null {
  const snapshot = snapshotDataOnly(
    value,
    new WeakSet<object>(),
    { remainingProperties: MAX_SNAPSHOT_PROPERTIES },
  );
  if (snapshot === SNAPSHOT_REJECTED) return null;
  const candidate = record(snapshot);
  if (!candidate || candidate.status === 'authoring_only_not_releaseable') return null;
  const keys = Object.keys(candidate);
  if (keys.length !== 2 || !keys.includes('manifest') || !keys.includes('packets')
    || !record(candidate.manifest) || !record(candidate.packets)) return null;
  return candidate as unknown as DialogueV2ServerRelease;
}

function releasePacketsMatchManifest(release: DialogueV2ServerRelease): boolean {
  const manifestKeys = Object.keys(release.manifest);
  const packetKeys = Object.keys(release.packets);
  if (packetKeys.length !== manifestKeys.length) return false;
  const packetKeySet = new Set(packetKeys);
  return manifestKeys.every((key) => {
    if (!packetKeySet.has(key)) return false;
    const candidate = release.packets[key];
    if (!matchesDialogueV2ApprovedLanguagePackManifest(candidate, release.manifest)) return false;
    const packet = candidate as DialogueV2LanguagePack;
    return key === releaseKey(packet.studyTarget, packet.scenario.id)
      && verifyDialogueV2PackSha256(packet);
  });
}

function cloneAuthorizedPacket(packet: DialogueV2LanguagePack): DialogueV2LanguagePack {
  return Object.freeze({
    ...packet,
    scenario: Object.freeze({
      ...packet.scenario,
      personas: Object.freeze(packet.scenario.personas.map((persona) => Object.freeze({ ...persona }))),
      objectives: Object.freeze(packet.scenario.objectives.map((objective) => Object.freeze({ ...objective }))),
      groupReplyPolicy: Object.freeze({ ...packet.scenario.groupReplyPolicy }),
    }),
    review: Object.freeze({ ...packet.review }),
  });
}

function projectLearnerCataloguePacket(
  packet: DialogueV2LanguagePack,
): DialogueV2LearnerCataloguePacket {
  return Object.freeze({
    studyTarget: packet.studyTarget,
    scenario: Object.freeze({
      id: packet.scenario.id,
      worldId: packet.scenario.worldId,
      rankRequired: packet.scenario.rankRequired,
      cefr: packet.scenario.cefr,
      personas: Object.freeze(packet.scenario.personas.map((persona) => Object.freeze({
        id: persona.id,
        replyStyle: persona.replyStyle,
        voiceMode: persona.voiceMode,
        displayName: persona.displayName,
        styleNote: persona.styleNote,
        mood: persona.mood,
        correctionStyle: persona.correctionStyle,
      }))),
      objectives: Object.freeze(packet.scenario.objectives.map((objective) => Object.freeze({
        id: objective.id,
        label: objective.label,
      }))),
      groupReplyPolicy: Object.freeze({
        maxDirectReplies: packet.scenario.groupReplyPolicy.maxDirectReplies,
        maxUsefulFollowUps: packet.scenario.groupReplyPolicy.maxUsefulFollowUps,
        silenceAllowed: packet.scenario.groupReplyPolicy.silenceAllowed,
      }),
    }),
    content: Object.freeze({
      title: packet.content.title,
      briefing: packet.content.briefing,
      completionTone: packet.content.completionTone,
      // зачем (владелец 01.10): первая реплика персонажа едет в learner-каталог, чтобы
      // телефон показал её в первом кадре; поле есть только когда оно есть в выпуске.
      ...(packet.content.opening ? {
        opening: Object.freeze({
          personaId: packet.content.opening.personaId,
          text: packet.content.opening.text,
        }),
      } : {}),
    }),
  });
}

/**
 * Returns the complete, cloned server-only pack set for one language after
 * validating the entire immutable release. Unlike the learner catalogue
 * projection, attestations remain available for other trusted server modules.
 */
export function authorizeDialogueV2ServerLanguagePacks(
  studyTargetValue: unknown,
  release: unknown,
): readonly DialogueV2LanguagePack[] | null {
  try {
    const studyTarget = asStudyTarget(studyTargetValue);
    const serverRelease = asServerRelease(release);
    if (!studyTarget || !serverRelease) return null;
    if (!validateDialogueV2ReleaseCoverage(serverRelease.manifest).ok) return null;
    if (!releasePacketsMatchManifest(serverRelease)) return null;

    const packets: DialogueV2LanguagePack[] = [];
    for (const entry of DIALOGUE_V2_CATALOGUE_INDEX) {
      const candidate: DialogueV2LanguagePack | undefined =
        serverRelease.packets[releaseKey(studyTarget, entry.id)];
      if (!candidate
        || candidate.studyTarget !== studyTarget
        || candidate.scenario.id !== entry.id
        || !matchesDialogueV2ApprovedLanguagePackManifest(candidate, serverRelease.manifest)) {
        return null;
      }
      packets.push(cloneAuthorizedPacket(candidate));
    }
    return packets.length === DIALOGUE_V2_CATALOGUE_INDEX.length
      ? Object.freeze(packets)
      : null;
  } catch (cause) {
    reportCauseServer('dialogue_v2_authorization:release_packets', cause);
    return null;
  }
}

/**
 * Projects one learner language from an immutable approved release. The full
 * release is authorized before any target packet is returned, while pins and
 * packets for the other language contours remain server-only.
 */
export function authorizeDialogueV2ServerCatalogue(
  studyTargetValue: unknown,
  release: unknown,
): DialogueV2AuthorizedCatalogue | null {
  try {
    const studyTarget = asStudyTarget(studyTargetValue);
    const serverRelease = asServerRelease(release);
    if (!studyTarget || !serverRelease) return null;
    if (!validateDialogueV2ReleaseCoverage(serverRelease.manifest).ok) return null;
    if (!releasePacketsMatchManifest(serverRelease)) return null;

    const packets: DialogueV2LearnerCataloguePacket[] = [];
    for (const entry of DIALOGUE_V2_CATALOGUE_INDEX) {
      const key = releaseKey(studyTarget, entry.id);
      const packet = serverRelease.packets[key];
      const pin = serverRelease.manifest[key];
      if (!packet || !pin
        || packet.studyTarget !== studyTarget
        || packet.scenario.id !== entry.id
        || !matchesDialogueV2ApprovedLanguagePackManifest(packet, serverRelease.manifest)) {
        return null;
      }
      packets.push(projectLearnerCataloguePacket(packet));
    }
    if (packets.length !== DIALOGUE_V2_CATALOGUE_INDEX.length) return null;
    return Object.freeze({
      packets: Object.freeze(packets),
    });
  } catch (cause) {
    reportCauseServer('dialogue_v2_authorization:release_snapshot', cause);
    return null;
  }
}

/**
 * Fail closed before constructing any model prompt. The only returned content
 * comes from the release object owned by the server process.
 */
export function authorizeDialogueV2ServerPacket(
  request: DialogueV2ServerPacketRequest | null | undefined,
  release: unknown,
): DialogueV2LanguagePack | null {
  try {
    const serverRelease = asServerRelease(release);
    if (!serverRelease) return null;
    // A V2 target is releaseable only as a complete 76-scenario language pack.
    // Do this before resolving a requested packet so a single early-reviewed
    // scenario cannot leak into production while its language contour is partial.
    if (!validateDialogueV2ReleaseCoverage(serverRelease.manifest).ok) return null;
    // Pins are only attestations. Every pinned key must also have its own
    // all-PASS packet in the immutable release envelope; sparse packet maps,
    // cross-key substitutions and unpinned extras keep the release closed.
    if (!releasePacketsMatchManifest(serverRelease)) return null;
    const studyTarget = asStudyTarget(request?.studyTarget);
    const scenarioId = typeof request?.scenarioId === 'string' ? request.scenarioId : null;
    if (!studyTarget || !scenarioId) return null;
    const candidate = serverRelease.packets[releaseKey(studyTarget, scenarioId)];
    if (!matchesDialogueV2ApprovedLanguagePackManifest(candidate, serverRelease.manifest)) return null;
    const packet = candidate as DialogueV2LanguagePack;
    if (packet.studyTarget !== studyTarget || packet.scenario.id !== scenarioId) return null;
    return cloneAuthorizedPacket(packet);
  } catch (cause) {
    reportCauseServer('dialogue_v2_authorization:packet', cause);
    // Runtime release data is an authorization boundary. Malformed objects,
    // authoring ledgers and hostile accessors must fail closed, never crash.
    return null;
  }
}
