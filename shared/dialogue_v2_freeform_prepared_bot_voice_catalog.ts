import type { DialogueV2StudyTarget } from './dialogue_v2_language_pack_contract';

export const DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_CATALOG_SCHEMA =
  'dialogue_v2_freeform_prepared_bot_voice_catalog.v1' as const;

export const DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_MIME_TYPES = Object.freeze([
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
] as const);

export type DialogueV2FreeformPreparedBotVoiceMime =
  typeof DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_MIME_TYPES[number];

export type DialogueV2FreeformPreparedBotVoiceResponseKind =
  'milestone' | 'celebration' | 'closing';

export type DialogueV2FreeformPreparedBotVoiceCatalogEntry = Readonly<{
  studyTarget: DialogueV2StudyTarget;
  /** Server-owned reviewed delivery style. This is not a provider model or voice name. */
  voiceStyleId: string;
  preparedResponseId: string;
  responseKind: DialogueV2FreeformPreparedBotVoiceResponseKind;
  replyText: string;
  replyTextSha256: string;
  /** Opaque key into a future reviewed local asset registry; never a path or URL. */
  assetKey: string;
  assetSha256: string;
  assetBytes: number;
  durationMs: number;
  mime: DialogueV2FreeformPreparedBotVoiceMime;
}>;

export type DialogueV2FreeformPreparedBotVoiceCatalog = Readonly<{
  schemaVersion: typeof DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_CATALOG_SCHEMA;
  releaseId: string;
  /** SHA-256 of the canonical release id and ordered entry tuples. */
  releaseSha256: string;
  entries: readonly DialogueV2FreeformPreparedBotVoiceCatalogEntry[];
}>;

export const DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_DEFAULT_CATALOG: null = null;

type PlainRecord = Record<string, unknown>;

type ReleaseHashEntry = Readonly<{
  studyTarget: string;
  voiceStyleId: string;
  preparedResponseId: string;
  responseKind: string;
  replyText: string;
  replyTextSha256: string;
  assetKey: string;
  assetSha256: string;
  assetBytes: number;
  durationMs: number;
  mime: string;
}>;

const TOKEN_RE = /^(?=.{1,128}$)[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
const SHA256_RE = /^[a-f0-9]{64}$/;
const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f]/u;
const FREEFORM_STUDY_TARGETS = Object.freeze(['en', 'es', 'fr', 'de'] as const);
const RESPONSE_KINDS = new Set<DialogueV2FreeformPreparedBotVoiceResponseKind>([
  'milestone', 'celebration', 'closing',
]);
const MIME_TYPES = new Set<string>(DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_MIME_TYPES);

const SHA256_ROUND_CONSTANTS = Object.freeze([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function exactPlainRecord(value: unknown, expectedKeys: readonly string[]): PlainRecord | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as unknown as Record<PropertyKey, PropertyDescriptor>;
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== expectedKeys.length
      || keys.some((key) => typeof key !== 'string' || !expectedKeys.includes(key))) return null;
    const snapshot: PlainRecord = Object.create(null) as PlainRecord;
    for (const key of expectedKeys) {
      const descriptor = descriptors[key];
      if (!descriptor?.enumerable || !('value' in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function exactDenseArray(value: unknown): unknown[] | null {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as unknown as Record<PropertyKey, PropertyDescriptor>;
    const keys = Reflect.ownKeys(descriptors);
    const lengthDescriptor = descriptors.length;
    if (!lengthDescriptor || !('value' in lengthDescriptor)
      || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0
      || keys.length !== lengthDescriptor.value + 1) return null;
    const snapshot: unknown[] = [];
    for (let index = 0; index < lengthDescriptor.value; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor?.enumerable || !('value' in descriptor)) return null;
      snapshot.push(descriptor.value);
    }
    return snapshot;
  } catch {
    return null;
  }
}

function rotateRight(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

function utf8Bytes(value: string): number[] {
  const output: number[] = [];
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
      // Match the Web/Node UTF-8 encoder contract for malformed UTF-16.
      output.push(0xef, 0xbf, 0xbd);
    } else if (codePoint <= 0x7f) output.push(codePoint);
    else if (codePoint <= 0x7ff) {
      output.push(0xc0 | (codePoint >>> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      output.push(
        0xe0 | (codePoint >>> 12),
        0x80 | ((codePoint >>> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      output.push(
        0xf0 | (codePoint >>> 18),
        0x80 | ((codePoint >>> 12) & 0x3f),
        0x80 | ((codePoint >>> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return output;
}

function sha256(value: string): string {
  const bytes = utf8Bytes(value);
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const high = Math.floor(bitLength / 0x1_0000_0000);
  const low = bitLength >>> 0;
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((high >>> shift) & 0xff);
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((low >>> shift) & 0xff);

  const state = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const words = new Array<number>(64).fill(0);
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      const start = offset + index * 4;
      words[index] = (
        (bytes[start] << 24) | (bytes[start + 1] << 16)
        | (bytes[start + 2] << 8) | bytes[start + 3]
      ) >>> 0;
    }
    for (let index = 16; index < 64; index += 1) {
      const x = words[index - 15];
      const y = words[index - 2];
      const sigma0 = rotateRight(x, 7) ^ rotateRight(x, 18) ^ (x >>> 3);
      const sigma1 = rotateRight(y, 17) ^ rotateRight(y, 19) ^ (y >>> 10);
      words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index += 1) {
      const bigSigma1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + bigSigma1 + choice + SHA256_ROUND_CONSTANTS[index] + words[index]) >>> 0;
      const bigSigma0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (bigSigma0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }
  return state.map((word) => word.toString(16).padStart(8, '0')).join('');
}

export function computeDialogueV2FreeformPreparedBotVoiceTextSha256(replyText: string): string {
  return sha256(replyText);
}

function canonicalReleasePayload(releaseId: string, entries: readonly ReleaseHashEntry[]): string {
  return JSON.stringify([
    DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_CATALOG_SCHEMA,
    releaseId,
    entries.map((entry) => [
      entry.studyTarget,
      entry.voiceStyleId,
      entry.preparedResponseId,
      entry.responseKind,
      entry.replyText,
      entry.replyTextSha256,
      entry.assetKey,
      entry.assetSha256,
      entry.assetBytes,
      entry.durationMs,
      entry.mime,
    ]),
  ]);
}

function computeCatalogReleaseSha256(
  releaseId: string,
  entries: readonly ReleaseHashEntry[],
): string {
  return sha256(canonicalReleasePayload(releaseId, entries));
}

function isToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_RE.test(value);
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && SHA256_RE.test(value);
}

function parseReplyText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const canonical = value.normalize('NFC').trim();
  return canonical === value && canonical.length >= 1 && canonical.length <= 800
    && utf8Bytes(canonical).length <= 2_048 && !CONTROL_RE.test(canonical)
    ? canonical
    : null;
}

function parseEntry(value: unknown): DialogueV2FreeformPreparedBotVoiceCatalogEntry | null {
  const entry = exactPlainRecord(value, [
    'studyTarget', 'voiceStyleId', 'preparedResponseId', 'responseKind', 'replyText',
    'replyTextSha256', 'assetKey', 'assetSha256', 'assetBytes', 'durationMs', 'mime',
  ]);
  if (!entry
    || typeof entry.studyTarget !== 'string'
    || !(FREEFORM_STUDY_TARGETS as readonly string[]).includes(entry.studyTarget)
    || !isToken(entry.voiceStyleId)
    || !isToken(entry.preparedResponseId)
    || typeof entry.responseKind !== 'string'
    || !RESPONSE_KINDS.has(entry.responseKind as DialogueV2FreeformPreparedBotVoiceResponseKind)
    || !isSha256(entry.replyTextSha256)
    || !isToken(entry.assetKey)
    || !isSha256(entry.assetSha256)
    || !Number.isSafeInteger(entry.assetBytes) || Number(entry.assetBytes) < 1
    || Number(entry.assetBytes) > 10_000_000
    || !Number.isSafeInteger(entry.durationMs) || Number(entry.durationMs) < 250
    || Number(entry.durationMs) > 30_000
    || typeof entry.mime !== 'string' || !MIME_TYPES.has(entry.mime)) return null;
  const replyText = parseReplyText(entry.replyText);
  if (!replyText
    || computeDialogueV2FreeformPreparedBotVoiceTextSha256(replyText) !== entry.replyTextSha256) {
    return null;
  }
  return Object.freeze({
    studyTarget: entry.studyTarget as DialogueV2StudyTarget,
    voiceStyleId: entry.voiceStyleId,
    preparedResponseId: entry.preparedResponseId,
    responseKind: entry.responseKind as DialogueV2FreeformPreparedBotVoiceResponseKind,
    replyText,
    replyTextSha256: entry.replyTextSha256,
    assetKey: entry.assetKey,
    assetSha256: entry.assetSha256,
    assetBytes: entry.assetBytes as number,
    durationMs: entry.durationMs as number,
    mime: entry.mime as DialogueV2FreeformPreparedBotVoiceMime,
  });
}

export function parseDialogueV2FreeformPreparedBotVoiceCatalog(
  value: unknown,
): DialogueV2FreeformPreparedBotVoiceCatalog | null {
  const catalog = exactPlainRecord(value, [
    'schemaVersion', 'releaseId', 'releaseSha256', 'entries',
  ]);
  if (!catalog
    || catalog.schemaVersion !== DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_CATALOG_SCHEMA
    || !isToken(catalog.releaseId)
    || !isSha256(catalog.releaseSha256)) return null;
  const candidates = exactDenseArray(catalog.entries);
  if (!candidates || candidates.length < 1 || candidates.length > 1_000) return null;

  const entries: DialogueV2FreeformPreparedBotVoiceCatalogEntry[] = [];
  const preparedResponseIds = new Set<string>();
  const assetKeys = new Set<string>();
  for (const candidate of candidates) {
    const entry = parseEntry(candidate);
    if (!entry || preparedResponseIds.has(entry.preparedResponseId) || assetKeys.has(entry.assetKey)) {
      return null;
    }
    preparedResponseIds.add(entry.preparedResponseId);
    assetKeys.add(entry.assetKey);
    entries.push(entry);
  }
  const releaseSha256 = computeCatalogReleaseSha256(catalog.releaseId, entries);
  if (releaseSha256 !== catalog.releaseSha256) return null;

  return Object.freeze({
    schemaVersion: DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_CATALOG_SCHEMA,
    releaseId: catalog.releaseId,
    releaseSha256,
    entries: Object.freeze(entries),
  });
}

/** Produces stable ordered release JSON after the same strict boundary validation. */
export function encodeDialogueV2FreeformPreparedBotVoiceCatalog(value: unknown): string {
  const catalog = parseDialogueV2FreeformPreparedBotVoiceCatalog(value);
  if (!catalog) {
    throw new Error('invalid_dialogue_v2_freeform_prepared_bot_voice_catalog_release');
  }
  return JSON.stringify(catalog);
}

/** Accepts the deliberate no-release state and throws one data-safe code for any invalid release. */
export function validateDialogueV2FreeformPreparedBotVoiceCatalogRelease(
  value: unknown,
): DialogueV2FreeformPreparedBotVoiceCatalog | null {
  if (value === null) return null;
  const catalog = parseDialogueV2FreeformPreparedBotVoiceCatalog(value);
  if (!catalog) {
    throw new Error('invalid_dialogue_v2_freeform_prepared_bot_voice_catalog_release');
  }
  return catalog;
}
