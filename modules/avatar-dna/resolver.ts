import { parseAvatarDNA } from './canonicalize';
import { isParsedAvatarCatalog, parseAvatarCatalog } from './catalog';
import type { AvatarDNA, AvatarItemManifest, ResolvedAvatarDNA } from './contracts';

export const compareAvatarLayers = (left: { z: number; id: string }, right: { z: number; id: string }): number => left.z - right.z || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);

const itemIds = (dna: AvatarDNA): string[] => [dna.base.skinToneId, dna.base.faceBaseId, dna.base.bodyBaseId, dna.face.eyesId, dna.face.irisColorId, dna.face.browsId, dna.face.noseId, dna.face.mouthId, ...dna.face.skinDetailIds, ...dna.face.makeupIds, ...(dna.face.facialHairId ? [dna.face.facialHairId] : []), dna.hair.styleId, dna.hair.colorId, dna.wearables.outfitId, ...[dna.wearables.headwearId,dna.wearables.maskId,dna.wearables.eyewearId,dna.wearables.earAccessoryId,dna.wearables.neckAccessoryId,dna.scene.backgroundId,dna.scene.auraId,dna.scene.frameId,dna.scene.foregroundFxId].filter((id): id is string => id !== null)];
const selectorItems = (dna: AvatarDNA): readonly [string, string][] => [
  ['skin_03', dna.base.skinToneId], ['face_01', dna.base.faceBaseId], ['body_01', dna.base.bodyBaseId], ['eyes_01', dna.face.eyesId], ['iris_brown', dna.face.irisColorId], ['brows_01', dna.face.browsId], ['nose_01', dna.face.noseId], ['mouth_01', dna.face.mouthId], ['hair_01|hair_wavy_01', dna.hair.styleId], ['hair_brown', dna.hair.colorId], ['outfit_01', dna.wearables.outfitId], ['background_cream', dna.scene.backgroundId],
];
const hasOnly = (values: readonly string[], allowed: readonly string[]): boolean => values.every((value) => allowed.includes(value));
const validOptionalSelectors = (dna: AvatarDNA): boolean =>
  dna.face.skinDetailIds.length === 0 && dna.face.makeupIds.length === 0 && dna.face.facialHairId === null
  && (dna.wearables.headwearId === null || dna.wearables.headwearId === 'headwear.assassin_hood.01') && dna.wearables.maskId === null && dna.wearables.eyewearId === null && dna.wearables.earAccessoryId === null && dna.wearables.neckAccessoryId === null
  && dna.scene.auraId === null && dna.scene.frameId === null && dna.scene.foregroundFxId === null
  && hasOnly(dna.face.skinDetailIds, []) && hasOnly(dna.face.makeupIds, []);

export const resolveAvatarDNA = (input: unknown, catalogInput: unknown): ResolvedAvatarDNA => {
  const chosenDNA = parseAvatarDNA(input);
  const catalog = isParsedAvatarCatalog(catalogInput) ? catalogInput : parseAvatarCatalog(catalogInput);
  if (!validOptionalSelectors(chosenDNA) || selectorItems(chosenDNA).some(([allowed, selected]) => !allowed.split('|').includes(selected))) throw new TypeError('avatar_catalog_invalid: selector kind');
  const selectedIds = itemIds(chosenDNA); if (new Set(selectedIds).size !== selectedIds.length) throw new TypeError('avatar_catalog_invalid: duplicate selector');
  const selected = selectedIds.map((id) => catalog.items.find((item) => item.id === id));
  if (selected.some((item) => !item || !item.rigIds.includes(chosenDNA.rigId))) throw new TypeError('avatar_catalog_invalid: unknown or incompatible item');
  const items = selected as AvatarItemManifest[];
  const skinTint = items.find((item) => item.id === chosenDNA.base.skinToneId)?.swatchHex;
  const hairTint = items.find((item) => item.id === chosenDNA.hair.colorId)?.swatchHex;
  const selectedSet = new Set(items.map((item) => item.id));
  if (items.some((item) => item.conflicts.some((id) => selectedSet.has(id)))) throw new TypeError('avatar_catalog_invalid: conflict');
  const hiddenSlots = [...new Set(items.flatMap((item) => item.occludes))];
  const layers = items.flatMap((item) => item.layers).filter((layer) => !hiddenSlots.includes(layer.slot)).map((layer) => {
    const { tintFrom, ...resolvedLayer } = layer;
    const tintColor = tintFrom === 'skinTone' ? skinTint : tintFrom === 'hairColor' ? hairTint : undefined;
    if (tintFrom && !tintColor) throw new TypeError('avatar_catalog_invalid: missing tint swatch');
    return { ...resolvedLayer, ...(tintColor ? { tintColor } : {}) };
  }).sort(compareAvatarLayers);
  const effectiveDNA = parseAvatarDNA(chosenDNA);
  return { chosenDNA: parseAvatarDNA(chosenDNA), effectiveDNA, visibilityPlan: { hiddenSlots }, layers };
};
