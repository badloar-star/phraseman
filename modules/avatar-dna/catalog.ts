import source from '../../config/avatar-dna/catalog.v1.json';
import { parseAvatarDNA } from './canonicalize';
import { type AvatarCatalogManifest, type AvatarDNA, type AvatarItemManifest, type AvatarSlot } from './contracts';

type Raw = Record<string, unknown>;
const slots = new Set<AvatarSlot>(['background','outfit.back','hood.back','hair.back','body','outfit','ears','face','skin.detail','makeup','eyes','iris','brows','nose','mouth','facial.hair','hair.side','hair.front','eyewear','ear.accessory','mask','headwear.front','neck.accessory','outfit.front','aura','frame','foreground.fx']);
const privateAvatarId = /^[a-z][a-z0-9_.-]{1,79}$/;
const isRecord = (value: unknown): value is Raw => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value: Raw, keys: readonly string[]): boolean => Reflect.ownKeys(value).every((key) => typeof key === 'string' && keys.includes(key)) && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
const asString = (value: unknown, label: string): string => { if (typeof value !== 'string') throw new TypeError(`avatar_catalog_invalid: ${label}`); return value; };
const asArray = (value: unknown, label: string): unknown[] => { if (!Array.isArray(value)) throw new TypeError(`avatar_catalog_invalid: ${label}`); return value; };
const safeFile = (file: string): boolean => /^[a-z0-9][a-z0-9_.-]*\.webp$/.test(file);
const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};
const parsedCatalogs = new WeakSet<object>();
const INTERNAL_CYCLE = Object.freeze({});

const parseAvatarCatalogUnsafe = (input: unknown): AvatarCatalogManifest => {
  if (!isRecord(input) || !exactKeys(input, ['catalogVersion','manifestVersion','rigIds','items']) || input.catalogVersion !== 1 || input.manifestVersion !== 1) throw new TypeError('avatar_catalog_invalid: version');
  const rigIds = asArray(input.rigIds, 'rigIds').map((value) => asString(value, 'rigId'));
  if (rigIds.length !== 1 || rigIds[0] !== 'human_v1') throw new TypeError('avatar_catalog_invalid: rig');
  const ids = new Set<string>(); const layerIds = new Set<string>();
  const items = asArray(input.items, 'items').map((value): AvatarItemManifest => {
    if (!isRecord(value) || !exactKeys(value, ['id','assetVersion','rigIds','category','entitlement','layers','occludes','conflicts','restoresOnRemove', ...(typeof value.swatchHex === 'string' ? ['swatchHex'] : [])])) throw new TypeError('avatar_catalog_invalid: item');
    const id = asString(value.id, 'item.id'); if (!privateAvatarId.test(id) || ids.has(id)) throw new TypeError('avatar_catalog_invalid: item id'); ids.add(id);
    const itemRigs = asArray(value.rigIds, 'item.rigIds').map((rig) => asString(rig, 'item.rigId'));
    const entitlement = value.entitlement; if (!isRecord(entitlement) || !exactKeys(entitlement, typeof entitlement.rarity === 'string' ? ['kind','rarity'] : ['kind']) || !['free','purchase','reward'].includes(String(entitlement.kind))) throw new TypeError('avatar_catalog_invalid: entitlement');
    const swatchHex = value.swatchHex; if (swatchHex !== undefined && (typeof swatchHex !== 'string' || !/^#[a-f0-9]{6}$/i.test(swatchHex))) throw new TypeError('avatar_catalog_invalid: swatch');
    const layers = asArray(value.layers, 'layers').map((layer): AvatarItemManifest['layers'][number] => {
      if (!isRecord(layer)) throw new TypeError('avatar_catalog_invalid: layer');
      const layerKeys = ['id','slot','z','file', ...(typeof layer.clip === 'string' ? ['clip'] : []), ...(typeof layer.tintFrom === 'string' ? ['tintFrom'] : []), ...(layer.bytes !== undefined ? ['bytes'] : []), ...(layer.sha256 !== undefined ? ['sha256'] : [])];
      if (!exactKeys(layer, layerKeys)) throw new TypeError('avatar_catalog_invalid: layer'); const layerId = asString(layer.id, 'layer.id'); const slot = asString(layer.slot, 'layer.slot'); const file = asString(layer.file, 'layer.file');
      if (!privateAvatarId.test(layerId) || layerIds.has(layerId) || !slots.has(slot as AvatarSlot) || !safeFile(file) || !Number.isInteger(layer.z) || (layer.z as number) < 0 || (layer.z as number) > 179 || (layer.clip !== undefined && layer.clip !== 'face.safe' && layer.clip !== 'head.safe') || (layer.tintFrom !== undefined && layer.tintFrom !== 'skinTone' && layer.tintFrom !== 'hairColor') || (layer.bytes !== undefined && (!Number.isInteger(layer.bytes) || (layer.bytes as number) <= 0)) || (layer.sha256 !== undefined && (typeof layer.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(layer.sha256))) || ((layer.bytes === undefined) !== (layer.sha256 === undefined))) throw new TypeError('avatar_catalog_invalid: layer');
      layerIds.add(layerId); return { id: layerId, slot: slot as AvatarSlot, z: layer.z as number, file, ...(typeof layer.clip === 'string' ? { clip: layer.clip } : {}), ...(layer.tintFrom === 'skinTone' || layer.tintFrom === 'hairColor' ? { tintFrom: layer.tintFrom } : {}) };
    });
    const occludes = asArray(value.occludes, 'occludes').map((slot) => asString(slot, 'occlude') as AvatarSlot); if (occludes.some((slot) => !slots.has(slot))) throw new TypeError('avatar_catalog_invalid: occlude');
    const conflicts = asArray(value.conflicts, 'conflicts').map((conflict) => asString(conflict, 'conflict'));
    if (!Number.isInteger(value.assetVersion) || value.assetVersion !== 1 || !['base','face','hair','look','scene'].includes(String(value.category)) || typeof value.restoresOnRemove !== 'boolean' || itemRigs.length !== 1 || itemRigs[0] !== 'human_v1') throw new TypeError('avatar_catalog_invalid: item metadata');
    return { id, assetVersion: value.assetVersion as number, rigIds: itemRigs, category: value.category as AvatarItemManifest['category'], entitlement: { kind: entitlement.kind as AvatarItemManifest['entitlement']['kind'], ...(typeof entitlement.rarity === 'string' ? { rarity: entitlement.rarity } : {}) }, ...(typeof swatchHex === 'string' ? { swatchHex: swatchHex.toLowerCase() } : {}), layers, occludes, conflicts, restoresOnRemove: value.restoresOnRemove };
  });
  const itemIds = new Set(items.map((item) => item.id));
  if (items.some((item) => item.conflicts.some((conflict) => !itemIds.has(conflict)))) throw new TypeError('avatar_catalog_invalid: conflict reference');
  const visiting = new Set<string>(); const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) throw INTERNAL_CYCLE;
    if (visited.has(id)) return;
    visiting.add(id);
    const item = items.find((candidate) => candidate.id === id);
    item?.conflicts.filter((conflict) => itemIds.has(conflict)).forEach(visit);
    visiting.delete(id); visited.add(id);
  };
  items.forEach((item) => visit(item.id));
  const required = ['skin_03','face_01','body_01','eyes_01','iris_brown','brows_01','nose_01','mouth_01','hair_01','hair_brown','outfit_01','background_cream','hair_wavy_01','headwear.assassin_hood.01'];
  if (items.length === 0 || required.some((id) => !itemIds.has(id))) throw new TypeError('avatar_catalog_invalid: required inventory');
  if (items.length !== required.length || items.some((item) => item.id !== 'headwear.assassin_hood.01' && item.entitlement.kind !== 'free') || items.find((item) => item.id === 'headwear.assassin_hood.01')?.entitlement.kind !== 'reward') throw new TypeError('avatar_catalog_invalid: canonical entitlement');
  const parsed = deepFreeze({ catalogVersion: 1 as const, manifestVersion: 1 as const, rigIds: [...rigIds], items });
  parsedCatalogs.add(parsed);
  return parsed;
};

export const parseAvatarCatalog = (input: unknown): AvatarCatalogManifest => {
  try { return parseAvatarCatalogUnsafe(input); } catch (error) {
    if (error === INTERNAL_CYCLE) throw new TypeError('avatar_manifest_cycle');
    throw new TypeError('avatar_catalog_invalid');
  }
};

export const isParsedAvatarCatalog = (value: unknown): value is AvatarCatalogManifest => typeof value === 'object' && value !== null && parsedCatalogs.has(value);

export const avatarCatalog = parseAvatarCatalog(source);
export const getCatalogItem = (id: string): AvatarItemManifest | undefined => avatarCatalog.items.find((item) => item.id === id);
export const starterAvatarDNA = (presetId: string): AvatarDNA => {
  if (presetId !== 'starter_warm_01') throw new TypeError('avatar_catalog_invalid: starter preset');
  return parseAvatarDNA({ schemaVersion: 1, rigId: 'human_v1', base: { starterPresetId: presetId, skinToneId: 'skin_03', faceBaseId: 'face_01', bodyBaseId: 'body_01' }, face: { eyesId: 'eyes_01', irisColorId: 'iris_brown', browsId: 'brows_01', noseId: 'nose_01', mouthId: 'mouth_01', skinDetailIds: [], makeupIds: [], facialHairId: null }, hair: { styleId: 'hair_01', colorId: 'hair_brown' }, wearables: { outfitId: 'outfit_01', headwearId: null, maskId: null, eyewearId: null, earAccessoryId: null, neckAccessoryId: null }, scene: { backgroundId: 'background_cream', auraId: null, frameId: null, foregroundFxId: null } });
};
