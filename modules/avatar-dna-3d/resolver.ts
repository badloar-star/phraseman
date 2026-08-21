import { AVATAR_3D_GLB_MORPH_IDS, AVATAR_3D_SIGNED_MORPH_IDS, type Avatar3DFacePresetId, type Avatar3DGlbMorphWeights, type Avatar3DP0DNA, type Avatar3DPresentationId, type Avatar3DRenderPlan, type Avatar3DSignedMorphId, type Avatar3DSignedMorphValues } from './contracts';

const HEX_COLOR = /^#[0-9A-F]{6}$/i;
const SAFE_TARGET_PATH = /^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*\.target$/;
const PRESENTATION_IDS = ['masculine', 'feminine'] as const;
const FACE_IDS = ['face.soft', 'face.heart', 'face.strong'] as const;
const HOOD_HIDDEN_ZONES = Object.freeze(['hair.front', 'hair.top'] as const);
type Recipe = Readonly<{ schemaVersion: 1; morphContractVersion: 'signed-pairs-v1'; parameterOrder: typeof AVATAR_3D_SIGNED_MORPH_IDS; targetOrder: typeof AVATAR_3D_GLB_MORPH_IDS; bounds: Readonly<Record<Avatar3DSignedMorphId, Readonly<{ min: number; max: number }>>>; base: Avatar3DSignedMorphValues; presentations: Readonly<Record<Avatar3DPresentationId, Avatar3DSignedMorphValues>>; faces: Readonly<Record<Avatar3DFacePresetId, Avatar3DSignedMorphValues>>; sourcePairs: Readonly<Record<Avatar3DSignedMorphId, Readonly<{ decr: readonly string[]; incr: readonly string[] }>>>; }>;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).length === keys.length && Object.keys(value).every((key, index) => key === keys[index]);
const invalid = (): never => { throw new TypeError('avatar_3d_style_invalid'); };

export function validateAvatar3DStyleRecipe(value: unknown): Recipe {
  if (!isRecord(value) || !exactKeys(value, ['schemaVersion', 'morphContractVersion', 'parameterOrder', 'targetOrder', 'bounds', 'base', 'presentations', 'faces', 'sourcePairs']) || value.schemaVersion !== 1 || value.morphContractVersion !== 'signed-pairs-v1' || !Array.isArray(value.parameterOrder) || !Array.isArray(value.targetOrder) || value.parameterOrder.join('|') !== AVATAR_3D_SIGNED_MORPH_IDS.join('|') || value.targetOrder.join('|') !== AVATAR_3D_GLB_MORPH_IDS.join('|') || !isRecord(value.bounds) || !isRecord(value.base) || !isRecord(value.presentations) || !isRecord(value.faces) || !isRecord(value.sourcePairs)) invalid();
  const root = value as Record<string, unknown>;
  const dense = (candidate: unknown): Avatar3DSignedMorphValues => {
    if (!isRecord(candidate) || !exactKeys(candidate, AVATAR_3D_SIGNED_MORPH_IDS) || AVATAR_3D_SIGNED_MORPH_IDS.some((id) => !Number.isFinite(candidate[id]))) invalid();
    return candidate as Avatar3DSignedMorphValues;
  };
  const bounds = root.bounds as Record<string, unknown>; const presentations = root.presentations as Record<string, unknown>; const faces = root.faces as Record<string, unknown>; const sourcePairs = root.sourcePairs as Record<string, unknown>;
  if (!exactKeys(bounds, AVATAR_3D_SIGNED_MORPH_IDS) || !exactKeys(presentations, PRESENTATION_IDS) || !exactKeys(faces, FACE_IDS) || !exactKeys(sourcePairs, AVATAR_3D_SIGNED_MORPH_IDS)) invalid();
  for (const id of AVATAR_3D_SIGNED_MORPH_IDS) {
    const bound = bounds[id];
    if (!isRecord(bound) || !exactKeys(bound, ['min', 'max']) || !Number.isFinite(bound.min) || !Number.isFinite(bound.max) || (bound.min as number) > 0 || (bound.max as number) < 0 || (bound.min as number) > (bound.max as number)) invalid();
  }
  const seen = new Set<string>();
  for (const id of AVATAR_3D_SIGNED_MORPH_IDS) {
    const pair = sourcePairs[id] as Record<string, unknown>;
    if (!isRecord(pair) || !exactKeys(pair, ['decr', 'incr'])) invalid();
    for (const branch of ['decr', 'incr'] as const) {
      const sources = pair[branch];
      if (!Array.isArray(sources) || sources.length === 0 || sources.some((source) => typeof source !== 'string' || !SAFE_TARGET_PATH.test(source))) invalid();
      for (const source of sources as unknown[]) { if (seen.has(source as string)) invalid(); seen.add(source as string); }
    }
  }
  return Object.freeze({ schemaVersion: 1, morphContractVersion: 'signed-pairs-v1', parameterOrder: Object.freeze([...AVATAR_3D_SIGNED_MORPH_IDS]) as typeof AVATAR_3D_SIGNED_MORPH_IDS, targetOrder: Object.freeze([...AVATAR_3D_GLB_MORPH_IDS]) as typeof AVATAR_3D_GLB_MORPH_IDS, bounds: bounds as Recipe['bounds'], base: dense(root.base), presentations: Object.freeze({ masculine: dense(presentations.masculine), feminine: dense(presentations.feminine) }), faces: Object.freeze({ 'face.soft': dense(faces['face.soft']), 'face.heart': dense(faces['face.heart']), 'face.strong': dense(faces['face.strong']) }), sourcePairs: sourcePairs as Recipe['sourcePairs'] });
}

const styleRecipe = validateAvatar3DStyleRecipe(require('../../config/avatar-dna/human_v2_style.v1.json') as unknown);
const assertP0DNA = (dna: Avatar3DP0DNA): void => {
  if (!isRecord(dna) || !FACE_IDS.includes(dna.facePresetId) || !PRESENTATION_IDS.includes(dna.presentationId) || !['hair.wave', 'hair.crop'].includes(dna.hairId) || dna.outfitId !== 'outfit.terra' || (dna.headwearId !== null && dna.headwearId !== 'hood.assassin') || !['portrait', 'studio'].includes(dna.camera)) throw new TypeError('avatar_3d_id_invalid');
  if (![dna.skinTone, dna.hairColor, dna.irisColor].every((color) => HEX_COLOR.test(color))) throw new TypeError('avatar_3d_color_invalid');
  if (!isRecord(dna.userMorphOffsets) || !exactKeys(dna.userMorphOffsets, AVATAR_3D_SIGNED_MORPH_IDS) || AVATAR_3D_SIGNED_MORPH_IDS.some((id) => !Number.isFinite(dna.userMorphOffsets[id]))) throw new TypeError('avatar_3d_user_morph_offsets_invalid');
};
const composeMorphWeights = (dna: Avatar3DP0DNA): Avatar3DGlbMorphWeights => {
  const weights: Record<string, number> = {};
  for (const id of AVATAR_3D_SIGNED_MORPH_IDS) {
    const bound = styleRecipe.bounds[id];
    const x = Math.min(bound.max, Math.max(bound.min, styleRecipe.base[id] + styleRecipe.presentations[dna.presentationId][id] + styleRecipe.faces[dna.facePresetId][id] + dna.userMorphOffsets[id]));
    weights[`${id}_decr`] = x < 0 ? -x : 0;
    weights[`${id}_incr`] = x > 0 ? x : 0;
  }
  return Object.freeze(weights) as Avatar3DGlbMorphWeights;
};
export const resolveAvatar3DPlan = (dna: Avatar3DP0DNA): Avatar3DRenderPlan => {
  assertP0DNA(dna);
  const wearsHood = dna.headwearId === 'hood.assassin';
  const visibleMeshIds = ['body.base', wearsHood ? `${dna.hairId}.back` : dna.hairId, dna.outfitId];
  if (wearsHood) visibleMeshIds.push('hood.assassin');
  return Object.freeze({ morphWeights: composeMorphWeights(dna), visibleMeshIds: Object.freeze(visibleMeshIds), hiddenZones: wearsHood ? HOOD_HIDDEN_ZONES : Object.freeze([]), materialParams: Object.freeze({ skinTone: dna.skinTone, hairColor: dna.hairColor, irisColor: dna.irisColor }), camera: dna.camera });
};
