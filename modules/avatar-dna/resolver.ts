import { parseAvatarDNA } from './canonicalize';
import { avatarCatalog, getCatalogItem } from './catalog';
import type { AvatarDNA, AvatarItemManifest, ResolvedAvatarDNA } from './contracts';

const itemIds = (dna: AvatarDNA): string[] => [dna.base.skinToneId, dna.base.faceBaseId, dna.base.bodyBaseId, dna.face.eyesId, dna.face.irisColorId, dna.face.browsId, dna.face.noseId, dna.face.mouthId, ...dna.face.skinDetailIds, ...dna.face.makeupIds, ...(dna.face.facialHairId ? [dna.face.facialHairId] : []), dna.hair.styleId, dna.hair.colorId, dna.wearables.outfitId, ...[dna.wearables.headwearId,dna.wearables.maskId,dna.wearables.eyewearId,dna.wearables.earAccessoryId,dna.wearables.neckAccessoryId,dna.scene.backgroundId,dna.scene.auraId,dna.scene.frameId,dna.scene.foregroundFxId].filter((id): id is string => id !== null)];

export const resolveAvatarDNA = (input: unknown): ResolvedAvatarDNA => {
  const chosenDNA = parseAvatarDNA(input);
  const selected = itemIds(chosenDNA).map((id) => getCatalogItem(id));
  if (selected.some((item) => !item || !item.rigIds.includes(chosenDNA.rigId))) throw new TypeError('avatar_catalog_invalid: unknown or incompatible item');
  const items = selected as AvatarItemManifest[];
  const selectedIds = new Set(items.map((item) => item.id));
  if (items.some((item) => item.conflicts.some((id) => selectedIds.has(id)))) throw new TypeError('avatar_catalog_invalid: conflict');
  const hiddenSlots = [...new Set(items.flatMap((item) => item.occludes))];
  const layers = items.flatMap((item) => item.layers).filter((layer) => !hiddenSlots.includes(layer.slot)).map((layer) => ({ ...layer })).sort((left, right) => left.z - right.z || left.id.localeCompare(right.id));
  const effectiveDNA = parseAvatarDNA(chosenDNA);
  return { chosenDNA: parseAvatarDNA(chosenDNA), effectiveDNA, visibilityPlan: { hiddenSlots }, layers };
};

void avatarCatalog;
