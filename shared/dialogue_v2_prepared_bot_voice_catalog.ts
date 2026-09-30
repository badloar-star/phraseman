import { getDialogueV2CatalogueEntry } from './dialogue_v2_catalogue_index';
import {
  DIALOGUE_V2_STUDY_TARGETS,
  type DialogueV2StudyTarget,
} from './dialogue_v2_language_pack_contract';

export const DIALOGUE_V2_PREPARED_BOT_VOICE_CATALOG_SCHEMA =
  'dialogue_v2_prepared_bot_voice_catalog.v1' as const;

export type DialogueV2PreparedBotVoiceResponseKind = 'milestone' | 'celebration' | 'closing';

export type DialogueV2PreparedBotVoiceCatalogEntry = Readonly<{
  studyTarget: DialogueV2StudyTarget;
  scenarioId: string;
  /** Pins the response to the exact authorized language-pack bytes. */
  contentPackSha256: string;
  personaId: string;
  preparedResponseId: string;
  responseKind: DialogueV2PreparedBotVoiceResponseKind;
  replyText: string;
  replyTextSha256: string;
  /** Opaque key into a build-time local asset registry; never a path or URL. */
  assetKey: string;
  assetSha256: string;
  assetBytes: number;
}>;

export type DialogueV2PreparedBotVoiceCatalog = Readonly<{
  schemaVersion: typeof DIALOGUE_V2_PREPARED_BOT_VOICE_CATALOG_SCHEMA;
  releaseId: string;
  /** Pins every voice entry to the immutable reviewed dialogue content release. */
  contentManifestSha256: string;
  entries: readonly DialogueV2PreparedBotVoiceCatalogEntry[];
}>;

type PlainRecord = Record<string, unknown>;

const TOKEN_RE = /^(?=.{1,128}$)[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
const SHA256_RE = /^[a-f0-9]{64}$/;
const CONTROL_RE = /[\u0000-\u001f\u007f]/u;
const RESPONSE_KINDS = new Set<DialogueV2PreparedBotVoiceResponseKind>([
  'milestone', 'celebration', 'closing',
]);

function exactPlainRecord(value: unknown, expectedKeys: readonly string[]): PlainRecord | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== expectedKeys.length
      || keys.some((key) => typeof key !== 'string' || !expectedKeys.includes(key))) return null;
    const output: PlainRecord = Object.create(null) as PlainRecord;
    for (const key of expectedKeys) {
      const descriptor = descriptors[key];
      if (!descriptor?.enumerable || !('value' in descriptor)) return null;
      output[key] = descriptor.value;
    }
    return output;
  } catch {
    return null;
  }
}

export function isDialogueV2PreparedBotVoiceToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_RE.test(value);
}

function sha256(value: unknown): value is string {
  return typeof value === 'string' && SHA256_RE.test(value);
}

function replyText(value: unknown): value is string {
  return typeof value === 'string' && value === value.trim()
    && value.length >= 1 && value.length <= 800 && !CONTROL_RE.test(value);
}

function parseEntry(value: unknown): DialogueV2PreparedBotVoiceCatalogEntry | null {
  const entry = exactPlainRecord(value, [
    'studyTarget', 'scenarioId', 'contentPackSha256', 'personaId', 'preparedResponseId', 'responseKind',
    'replyText', 'replyTextSha256', 'assetKey', 'assetSha256', 'assetBytes',
  ]);
  if (!entry
    || typeof entry.studyTarget !== 'string'
    || !(DIALOGUE_V2_STUDY_TARGETS as readonly string[]).includes(entry.studyTarget)
    || typeof entry.scenarioId !== 'string' || !getDialogueV2CatalogueEntry(entry.scenarioId)
    || !sha256(entry.contentPackSha256)
    || !isDialogueV2PreparedBotVoiceToken(entry.personaId)
    || !isDialogueV2PreparedBotVoiceToken(entry.preparedResponseId)
    || typeof entry.responseKind !== 'string'
    || !RESPONSE_KINDS.has(entry.responseKind as DialogueV2PreparedBotVoiceResponseKind)
    || !replyText(entry.replyText) || !sha256(entry.replyTextSha256)
    || !isDialogueV2PreparedBotVoiceToken(entry.assetKey) || !sha256(entry.assetSha256)
    || !Number.isSafeInteger(entry.assetBytes) || (entry.assetBytes as number) < 1
    || (entry.assetBytes as number) > 10_000_000) return null;

  return Object.freeze({
    studyTarget: entry.studyTarget as DialogueV2StudyTarget,
    scenarioId: entry.scenarioId,
    contentPackSha256: entry.contentPackSha256,
    personaId: entry.personaId,
    preparedResponseId: entry.preparedResponseId,
    responseKind: entry.responseKind as DialogueV2PreparedBotVoiceResponseKind,
    replyText: entry.replyText,
    replyTextSha256: entry.replyTextSha256,
    assetKey: entry.assetKey,
    assetSha256: entry.assetSha256,
    assetBytes: entry.assetBytes as number,
  });
}

/**
 * Parses an immutable, release-pinned prepared-audio catalog. Asset references
 * are opaque registry keys; URLs, filesystem paths and dynamic module names are
 * structurally impossible at this boundary.
 */
export function parseDialogueV2PreparedBotVoiceCatalog(
  value: unknown,
): DialogueV2PreparedBotVoiceCatalog | null {
  const catalog = exactPlainRecord(value, [
    'schemaVersion', 'releaseId', 'contentManifestSha256', 'entries',
  ]);
  if (!catalog || catalog.schemaVersion !== DIALOGUE_V2_PREPARED_BOT_VOICE_CATALOG_SCHEMA
    || !isDialogueV2PreparedBotVoiceToken(catalog.releaseId)
    || !sha256(catalog.contentManifestSha256)
    || !Array.isArray(catalog.entries)
    || Object.getPrototypeOf(catalog.entries) !== Array.prototype
    || catalog.entries.length < 1 || catalog.entries.length > 1_000) return null;

  const entries: DialogueV2PreparedBotVoiceCatalogEntry[] = [];
  const responseIdentities = new Set<string>();
  const assetKeys = new Set<string>();
  for (const candidate of catalog.entries) {
    const entry = parseEntry(candidate);
    if (!entry) return null;
    const responseIdentity = [
      entry.studyTarget, entry.scenarioId, entry.personaId, entry.preparedResponseId,
    ].join(':');
    if (responseIdentities.has(responseIdentity) || assetKeys.has(entry.assetKey)) return null;
    responseIdentities.add(responseIdentity);
    assetKeys.add(entry.assetKey);
    entries.push(entry);
  }

  return Object.freeze({
    schemaVersion: DIALOGUE_V2_PREPARED_BOT_VOICE_CATALOG_SCHEMA,
    releaseId: catalog.releaseId,
    contentManifestSha256: catalog.contentManifestSha256,
    entries: Object.freeze(entries),
  });
}
