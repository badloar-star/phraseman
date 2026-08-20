import { parseAvatarDNA } from './canonicalize';
import { isParsedAvatarCatalog, parseAvatarCatalog } from './catalog';
import type { AvatarDNA, AvatarItemManifest, ResolvedAvatarDNA } from './contracts';

const itemIds = (dna: AvatarDNA): string[] => [dna.base.skinToneId, dna.base.faceBaseId, dna.base.bodyBaseId, dna.face.eyesId, dna.face.irisColorId, dna.face.browsId, dna.face.noseId, dna.face.mouthId, ...dna.face.skinDetailIds, ...dna.face.makeupIds, ...(dna.face.facialHairId ? [dna.face.facialHairId] : []), dna.hair.styleId, dna.hair.colorId, dna.wearables.outfitId, ...[dna.wearables.headwearId,dna.wearables.maskId,dna.wearables.eyewearId,dna.wearables.earAccessoryId,dna.wearables.neckAccessoryId,dna.scene.backgroundId,dna.scene.auraId,dna.scene.frameId,dna.scene.foregroundFxId].filter((id): id is string => id !== null)];
const selectorItems = (dna: AvatarDNA): readonly [string, string][] => [
  ['skin_03', dna.base.skinToneId], ['face_01', dna.base.faceBaseId], ['body_01', dna.base.bodyBaseId], ['eyes_01', dna.face.eyesId], ['iris_brown', dna.face.irisColorId], ['brows_01', dna.face.browsId], ['nose_01', dna.face.noseId], ['mouth_01', dna.face.mouthId], ['hair_01|hair_wavy_01', dna.hair.styleId], ['hair_brown', dna.hair.colorId], ['outfit_01', dna.wearables.outfitId], ['background_cream', dna.scene.backgroundId],
];

export const resolveAvatarDNA = (input: unknown, catalogInput: unknown): ResolvedAvatarDNA => {
  const chosenDNA = parseAvatarDNA(input);
  const catalog = isParsedAvatarCatalog(catalogInput) ? catalogInput : parseAvatarCatalog(catalogInput);
  if (selectorItems(chosenDNA).some(([allowed, selected]) => !allowed.split('|').includes(selected))) throw new TypeError('avatar_catalog_invalid: selector kind');
  const selected = itemIds(chosenDNA).map((id) => catalog.items.find((item) => item.id === id));
  if (selected.some((item) => !item || !item.rigIds.includes(chosenDNA.rigId))) throw new TypeError('avatar_catalog_invalid: unknown or incompatible item');
  const items = selected as AvatarItemManifest[];
  const selectedIds = new Set(items.map((item) => item.id));
  if (items.some((item) => item.conflicts.some((id) => selectedIds.has(id)))) throw new TypeError('avatar_catalog_invalid: conflict');
  const hiddenSlots = [...new Set(items.flatMap((item) => item.occludes))];
  const layers = items.flatMap((item) => item.layers).filter((layer) => !hiddenSlots.includes(layer.slot)).map((layer) => ({ ...layer })).sort((left, right) => left.z - right.z || left.id.localeCompare(right.id));
  const effectiveDNA = parseAvatarDNA(chosenDNA);
  return { chosenDNA: parseAvatarDNA(chosenDNA), effectiveDNA, visibilityPlan: { hiddenSlots }, layers };
};
