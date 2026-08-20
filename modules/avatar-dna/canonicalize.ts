import {
  AVATAR_DNA_RIG_ID,
  AVATAR_DNA_SCHEMA_VERSION,
  AVATAR_ID,
  type AvatarDNA,
} from './contracts';

type UnknownRecord = Record<string, unknown>;

const hasOnlyKeys = (value: UnknownRecord, keys: readonly string[]): boolean =>
  Object.keys(value).every((key) => keys.includes(key))
  && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));

const readRecord = (value: unknown, label: string, keys: readonly string[]): UnknownRecord => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  const record = value as UnknownRecord;
  if (!hasOnlyKeys(record, keys)) throw new TypeError(`${label} has unsupported keys`);
  return record;
};

const readId = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !AVATAR_ID.test(value)) {
    throw new TypeError(`${label} must be a valid avatar ID`);
  }
  return value;
};

const readOptionalId = (value: unknown, label: string): string | null =>
  value === null ? null : readId(value, label);

const readIdArray = (value: unknown, label: string): readonly string[] => {
  if (!Array.isArray(value) || value.length > 8) {
    throw new TypeError(`${label} must contain at most eight IDs`);
  }
  const ids = value.map((id, index) => readId(id, `${label}[${index}]`));
  if (new Set(ids).size !== ids.length) throw new TypeError(`${label} must not contain duplicates`);
  return ids;
};

export const parseAvatarDNA = (input: unknown): AvatarDNA => {
  const root = readRecord(input, 'Avatar DNA', [
    'schemaVersion', 'rigId', 'base', 'face', 'hair', 'wearables', 'scene',
  ]);
  if (root.schemaVersion !== AVATAR_DNA_SCHEMA_VERSION) {
    throw new TypeError('Avatar DNA schemaVersion is unsupported');
  }
  if (root.rigId !== AVATAR_DNA_RIG_ID) throw new TypeError('Avatar DNA rigId is unsupported');

  const base = readRecord(root.base, 'base', ['starterPresetId', 'skinToneId', 'faceBaseId', 'bodyBaseId']);
  const face = readRecord(root.face, 'face', ['eyesId', 'irisColorId', 'browsId', 'noseId', 'mouthId', 'skinDetailIds', 'makeupIds', 'facialHairId']);
  const hair = readRecord(root.hair, 'hair', ['styleId', 'colorId']);
  const wearables = readRecord(root.wearables, 'wearables', ['outfitId', 'headwearId', 'maskId', 'eyewearId', 'earAccessoryId', 'neckAccessoryId']);
  const scene = readRecord(root.scene, 'scene', ['backgroundId', 'auraId', 'frameId', 'foregroundFxId']);

  return {
    schemaVersion: AVATAR_DNA_SCHEMA_VERSION,
    rigId: AVATAR_DNA_RIG_ID,
    base: {
      starterPresetId: readId(base.starterPresetId, 'base.starterPresetId'),
      skinToneId: readId(base.skinToneId, 'base.skinToneId'),
      faceBaseId: readId(base.faceBaseId, 'base.faceBaseId'),
      bodyBaseId: readId(base.bodyBaseId, 'base.bodyBaseId'),
    },
    face: {
      eyesId: readId(face.eyesId, 'face.eyesId'),
      irisColorId: readId(face.irisColorId, 'face.irisColorId'),
      browsId: readId(face.browsId, 'face.browsId'),
      noseId: readId(face.noseId, 'face.noseId'),
      mouthId: readId(face.mouthId, 'face.mouthId'),
      skinDetailIds: readIdArray(face.skinDetailIds, 'face.skinDetailIds'),
      makeupIds: readIdArray(face.makeupIds, 'face.makeupIds'),
      facialHairId: readOptionalId(face.facialHairId, 'face.facialHairId'),
    },
    hair: {
      styleId: readId(hair.styleId, 'hair.styleId'),
      colorId: readId(hair.colorId, 'hair.colorId'),
    },
    wearables: {
      outfitId: readId(wearables.outfitId, 'wearables.outfitId'),
      headwearId: readOptionalId(wearables.headwearId, 'wearables.headwearId'),
      maskId: readOptionalId(wearables.maskId, 'wearables.maskId'),
      eyewearId: readOptionalId(wearables.eyewearId, 'wearables.eyewearId'),
      earAccessoryId: readOptionalId(wearables.earAccessoryId, 'wearables.earAccessoryId'),
      neckAccessoryId: readOptionalId(wearables.neckAccessoryId, 'wearables.neckAccessoryId'),
    },
    scene: {
      backgroundId: readId(scene.backgroundId, 'scene.backgroundId'),
      auraId: readOptionalId(scene.auraId, 'scene.auraId'),
      frameId: readOptionalId(scene.frameId, 'scene.frameId'),
      foregroundFxId: readOptionalId(scene.foregroundFxId, 'scene.foregroundFxId'),
    },
  };
};

export const canonicalizeAvatarDNA = (input: unknown): string => {
  const dna = parseAvatarDNA(input);
  return JSON.stringify({
    schemaVersion: dna.schemaVersion,
    rigId: dna.rigId,
    base: dna.base,
    face: {
      ...dna.face,
      skinDetailIds: [...dna.face.skinDetailIds].sort(),
      makeupIds: [...dna.face.makeupIds].sort(),
    },
    hair: dna.hair,
    wearables: dna.wearables,
    scene: dna.scene,
  });
};
