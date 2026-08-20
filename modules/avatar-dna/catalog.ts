import source from '../../config/avatar-dna/catalog.v1.json';
import { parseAvatarDNA } from './canonicalize';
import { AVATAR_ID, type AvatarCatalogManifest, type AvatarDNA, type AvatarItemManifest, type AvatarSlot } from './contracts';

type Raw = Record<string, unknown>;
const slots = new Set<AvatarSlot>(['background','outfit.back','hood.back','hair.back','body','outfit','ears','face','skin.detail','makeup','eyes','iris','brows','nose','mouth','facial.hair','hair.side','hair.front','eyewear','ear.accessory','mask','headwear.front','neck.accessory','outfit.front','aura','frame','foreground.fx']);
const isRecord = (value: unknown): value is Raw => value !== null && typeof value === 'object' && !Array.isArray(value);
const asString = (value: unknown, label: string): string => { if (typeof value !== 'string') throw new TypeError(`avatar_catalog_invalid: ${label}`); return value; };
const asArray = (value: unknown, label: string): unknown[] => { if (!Array.isArray(value)) throw new TypeError(`avatar_catalog_invalid: ${label}`); return value; };
const safeFile = (file: string): boolean => /^[a-z0-9][a-z0-9_.-]*\.webp$/.test(file);

export const parseAvatarCatalog = (input: unknown): AvatarCatalogManifest => {
  if (!isRecord(input) || input.catalogVersion !== 1 || input.manifestVersion !== 1) throw new TypeError('avatar_catalog_invalid: version');
  const rigIds = asArray(input.rigIds, 'rigIds').map((value) => asString(value, 'rigId'));
  if (!rigIds.includes('human_v1')) throw new TypeError('avatar_catalog_invalid: rig');
  const ids = new Set<string>(); const layerIds = new Set<string>();
  const items = asArray(input.items, 'items').map((value): AvatarItemManifest => {
    if (!isRecord(value)) throw new TypeError('avatar_catalog_invalid: item');
    const id = asString(value.id, 'item.id'); if (!AVATAR_ID.test(id) || ids.has(id)) throw new TypeError('avatar_catalog_invalid: item id'); ids.add(id);
    const itemRigs = asArray(value.rigIds, 'item.rigIds').map((rig) => asString(rig, 'item.rigId'));
    const entitlement = value.entitlement; if (!isRecord(entitlement) || !['starter','purchase','reward'].includes(String(entitlement.kind))) throw new TypeError('avatar_catalog_invalid: entitlement');
    const layers = asArray(value.layers, 'layers').map((layer): AvatarItemManifest['layers'][number] => {
      if (!isRecord(layer)) throw new TypeError('avatar_catalog_invalid: layer'); const layerId = asString(layer.id, 'layer.id'); const slot = asString(layer.slot, 'layer.slot'); const file = asString(layer.file, 'layer.file');
      if (!AVATAR_ID.test(layerId) || layerIds.has(layerId) || !slots.has(slot as AvatarSlot) || !safeFile(file) || !Number.isInteger(layer.z) || (layer.z as number) < 0 || (layer.z as number) > 179) throw new TypeError('avatar_catalog_invalid: layer');
      layerIds.add(layerId); return { id: layerId, slot: slot as AvatarSlot, z: layer.z as number, file, ...(typeof layer.clip === 'string' ? { clip: layer.clip } : {}) };
    });
    const occludes = asArray(value.occludes, 'occludes').map((slot) => asString(slot, 'occlude') as AvatarSlot); if (occludes.some((slot) => !slots.has(slot))) throw new TypeError('avatar_catalog_invalid: occlude');
    const conflicts = asArray(value.conflicts, 'conflicts').map((conflict) => asString(conflict, 'conflict'));
    if (!Number.isInteger(value.assetVersion) || typeof value.category !== 'string' || typeof value.restoresOnRemove !== 'boolean') throw new TypeError('avatar_catalog_invalid: item metadata');
    return { id, assetVersion: value.assetVersion as number, rigIds: itemRigs, category: value.category as AvatarItemManifest['category'], entitlement: { kind: entitlement.kind as AvatarItemManifest['entitlement']['kind'], ...(typeof entitlement.rarity === 'string' ? { rarity: entitlement.rarity } : {}) }, layers, occludes, conflicts, restoresOnRemove: value.restoresOnRemove };
  });
  const itemIds = new Set(items.map((item) => item.id));
  const visiting = new Set<string>(); const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) throw new TypeError('avatar_manifest_cycle');
    if (visited.has(id)) return;
    visiting.add(id);
    const item = items.find((candidate) => candidate.id === id);
    item?.conflicts.filter((conflict) => itemIds.has(conflict)).forEach(visit);
    visiting.delete(id); visited.add(id);
  };
  items.forEach((item) => visit(item.id));
  return Object.freeze({ catalogVersion: 1, rigIds: Object.freeze([...rigIds]), items: Object.freeze(items.map((item) => Object.freeze(item))) });
};

export const avatarCatalog = parseAvatarCatalog(source);
export const getCatalogItem = (id: string): AvatarItemManifest | undefined => avatarCatalog.items.find((item) => item.id === id);
export const starterAvatarDNA = (presetId: string): AvatarDNA => {
  if (presetId !== 'starter_warm_01') throw new TypeError('avatar_catalog_invalid: starter preset');
  return parseAvatarDNA({ schemaVersion: 1, rigId: 'human_v1', base: { starterPresetId: presetId, skinToneId: 'skin_03', faceBaseId: 'face_01', bodyBaseId: 'body_01' }, face: { eyesId: 'eyes_01', irisColorId: 'iris_brown', browsId: 'brows_01', noseId: 'nose_01', mouthId: 'mouth_01', skinDetailIds: [], makeupIds: [], facialHairId: null }, hair: { styleId: 'hair_01', colorId: 'hair_brown' }, wearables: { outfitId: 'outfit_01', headwearId: null, maskId: null, eyewearId: null, earAccessoryId: null, neckAccessoryId: null }, scene: { backgroundId: 'background_cream', auraId: null, frameId: null, foregroundFxId: null } });
};
