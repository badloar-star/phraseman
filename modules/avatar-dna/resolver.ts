import { parseAvatarDNA } from './canonicalize';
import { isParsedAvatarCatalog, parseAvatarCatalog } from './catalog';
import type { AvatarDNA, AvatarItemManifest, ResolvedAvatarDNA } from './contracts';

export const compareAvatarLayers = (left: { z: number; id: string }, right: { z: number; id: string }): number => left.z - right.z || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);

const itemIds = (dna: AvatarDNA): string[] => [dna.base.skinToneId, dna.base.faceBaseId, dna.base.bodyBaseId, dna.face.eyesId, dna.face.irisColorId, dna.face.browsId, dna.face.noseId, dna.face.mouthId, ...dna.face.skinDetailIds, ...dna.face.makeupIds, ...(dna.face.facialHairId ? [dna.face.facialHairId] : []), dna.hair.styleId, dna.hair.colorId, dna.wearables.outfitId, ...[dna.wearables.headwearId,dna.wearables.maskId,dna.wearables.eyewearId,dna.wearables.earAccessoryId,dna.wearables.neckAccessoryId,dna.scene.backgroundId,dna.scene.auraId,dna.scene.frameId,dna.scene.foregroundFxId].filter((id): id is string => id !== null)];
const selectorItems = (dna: AvatarDNA): readonly [RegExp, string][] => [
  [/^skin_(?:0[1-9]|10)$/, dna.base.skinToneId], [/^face_(?:0[1-9]|10)$/, dna.base.faceBaseId], [/^body_(?:0[1-9]|10)$/, dna.base.bodyBaseId], [/^eyes_(?:0[1-9]|10)$/, dna.face.eyesId], [/^iris_(brown|hazel|green|blue|gray|amber|violet|teal|honey|black)$/, dna.face.irisColorId], [/^brows_(?:0[1-9]|10)$/, dna.face.browsId], [/^nose_(?:0[1-9]|10)$/, dna.face.noseId], [/^mouth_(?:0[1-9]|10)$/, dna.face.mouthId], [/^hair_(?:0[1-9]|10)$/, dna.hair.styleId], [/^hair_(black|dark_brown|brown|auburn|blonde|platinum|red|rose|blue|green)$/, dna.hair.colorId], [/^outfit_(?:0[1-9]|10)$/, dna.wearables.outfitId], [/^background_(cream|terracotta|olive|sunset|sky|lavender|forest|ocean|night|studio)$/, dna.scene.backgroundId],
];
const hasOnly = (values: readonly string[], pattern: RegExp): boolean => values.every((value) => pattern.test(value));
const validOptionalSelectors = (dna: AvatarDNA): boolean =>
  hasOnly(dna.face.skinDetailIds, /^skin_detail_(?:0[1-9]|10)$/) && hasOnly(dna.face.makeupIds, /^makeup_(?:0[1-9]|10)$/) && (dna.face.facialHairId === null || /^facial_hair_(?:0[1-9]|10)$/.test(dna.face.facialHairId))
  && (dna.wearables.headwearId === null || /^headwear\.(cap|beanie|flower_crown|assassin_hood|bucket_hat|beret|tiara|cowboy_hat|turban|cat_ears)\.01$/.test(dna.wearables.headwearId)) && (dna.wearables.maskId === null || /^mask\.(domino|festival|fox|phantom|cyber|masquerade|oni|bandana|star|lace)\.01$/.test(dna.wearables.maskId)) && (dna.wearables.eyewearId === null || /^eyewear\.(round|cat_eye|aviator|square|heart|monocle|visor|goggles|half_moon|rimless)\.01$/.test(dna.wearables.eyewearId)) && (dna.wearables.earAccessoryId === null || /^ear_accessory\.(stud|hoop|drop|pearl|star|feather|cuff|lightning|flower|chain)\.01$/.test(dna.wearables.earAccessoryId)) && (dna.wearables.neckAccessoryId === null || /^neck_accessory\.(scarf|pendant|choker|bow|bandana|beads|medallion|collar|tie|chain)\.01$/.test(dna.wearables.neckAccessoryId))
  && (dna.scene.auraId === null || /^aura_(?:0[1-9]|10)$/.test(dna.scene.auraId)) && (dna.scene.frameId === null || /^frame_(?:0[1-9]|10)$/.test(dna.scene.frameId)) && (dna.scene.foregroundFxId === null || /^foreground_fx_(?:0[1-9]|10)$/.test(dna.scene.foregroundFxId))
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
  const irisTint = items.find((item) => item.id === chosenDNA.face.irisColorId)?.swatchHex;
  const selectedSet = new Set(items.map((item) => item.id));
  if (items.some((item) => item.conflicts.some((id) => selectedSet.has(id)))) throw new TypeError('avatar_catalog_invalid: conflict');
  const hiddenSlots = [...new Set(items.flatMap((item) => item.occludes))];
  const layers = items.flatMap((item) => item.layers).filter((layer) => !hiddenSlots.includes(layer.slot)).map((layer) => {
    const { tintFrom, ...resolvedLayer } = layer;
    const tintColor = tintFrom === 'skinTone' ? skinTint : tintFrom === 'hairColor' ? hairTint : tintFrom === 'irisColor' ? irisTint : undefined;
    if (tintFrom && !tintColor) throw new TypeError('avatar_catalog_invalid: missing tint swatch');
    return { ...resolvedLayer, ...(tintColor ? { tintColor } : {}) };
  }).sort(compareAvatarLayers);
  const effectiveDNA = parseAvatarDNA(chosenDNA);
  return { chosenDNA: parseAvatarDNA(chosenDNA), effectiveDNA, visibilityPlan: { hiddenSlots }, layers };
};
