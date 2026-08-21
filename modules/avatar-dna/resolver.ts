import { parseAvatarDNA } from './canonicalize';
import { isParsedAvatarCatalog, parseAvatarCatalog } from './catalog';
import type { AvatarDNA, AvatarItemManifest, ResolvedAvatarDNA } from './contracts';

export const compareAvatarLayers = (left: { z: number; id: string }, right: { z: number; id: string }): number => left.z - right.z || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);

const itemIds = (dna: AvatarDNA): string[] => [dna.base.skinToneId, dna.base.faceBaseId, dna.base.bodyBaseId, dna.face.eyesId, dna.face.irisColorId, dna.face.browsId, dna.face.noseId, dna.face.mouthId, ...dna.face.skinDetailIds, ...dna.face.makeupIds, ...(dna.face.facialHairId ? [dna.face.facialHairId] : []), dna.hair.styleId, dna.hair.colorId, dna.wearables.outfitId, ...[dna.wearables.headwearId,dna.wearables.maskId,dna.wearables.eyewearId,dna.wearables.earAccessoryId,dna.wearables.neckAccessoryId,dna.scene.backgroundId,dna.scene.auraId,dna.scene.frameId,dna.scene.foregroundFxId].filter((id): id is string => id !== null)];
const selectorItems = (dna: AvatarDNA): readonly [RegExp, string][] => [
  [/^skin_0[1-6]$/, dna.base.skinToneId], [/^face_0[1-4]$/, dna.base.faceBaseId], [/^body_0[1-2]$/, dna.base.bodyBaseId], [/^eyes_0[1-6]$/, dna.face.eyesId], [/^iris_(brown|hazel|green|blue|gray|amber)$/, dna.face.irisColorId], [/^brows_0[1-4]$/, dna.face.browsId], [/^nose_0[1-4]$/, dna.face.noseId], [/^mouth_0[1-4]$/, dna.face.mouthId], [/^hair_0[1-8]$/, dna.hair.styleId], [/^hair_(black|dark_brown|brown|auburn|blonde)$/, dna.hair.colorId], [/^outfit_0[1-8]$/, dna.wearables.outfitId], [/^background_(cream|terracotta|olive|sunset)$/, dna.scene.backgroundId],
];
const hasOnly = (values: readonly string[], pattern: RegExp): boolean => values.every((value) => pattern.test(value));
const validOptionalSelectors = (dna: AvatarDNA): boolean =>
  hasOnly(dna.face.skinDetailIds, /^skin_detail_0[1-4]$/) && hasOnly(dna.face.makeupIds, /^makeup_0[1-4]$/) && (dna.face.facialHairId === null || /^facial_hair_0[1-2]$/.test(dna.face.facialHairId))
  && (dna.wearables.headwearId === null || /^headwear\.(cap|beanie|flower_crown|assassin_hood)\.01$/.test(dna.wearables.headwearId)) && (dna.wearables.maskId === null || /^mask\.(domino|festival)\.01$/.test(dna.wearables.maskId)) && (dna.wearables.eyewearId === null || /^eyewear\.(round|cat_eye)\.01$/.test(dna.wearables.eyewearId)) && (dna.wearables.earAccessoryId === null || /^ear_accessory\.(stud|hoop)\.01$/.test(dna.wearables.earAccessoryId)) && (dna.wearables.neckAccessoryId === null || /^neck_accessory\.(scarf|pendant)\.01$/.test(dna.wearables.neckAccessoryId))
  && dna.scene.auraId === null && dna.scene.frameId === null && dna.scene.foregroundFxId === null
  ;

export const resolveAvatarDNA = (input: unknown, catalogInput: unknown): ResolvedAvatarDNA => {
  const chosenDNA = parseAvatarDNA(input);
  const catalog = isParsedAvatarCatalog(catalogInput) ? catalogInput : parseAvatarCatalog(catalogInput);
  if (!validOptionalSelectors(chosenDNA) || selectorItems(chosenDNA).some(([allowed, selected]) => !allowed.test(selected))) throw new TypeError('avatar_catalog_invalid: selector kind');
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
