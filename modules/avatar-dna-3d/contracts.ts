export const AVATAR_3D_P0_RIG_ID = 'human_v2_p0' as const;
export const AVATAR_3D_SIGNED_MORPH_IDS = ['head_width', 'jaw_width', 'eye_size', 'eye_spacing', 'nose_width', 'nose_projection', 'mouth_width', 'upper_lip_volume', 'lower_lip_volume'] as const;
export const AVATAR_3D_GLB_MORPH_IDS = ['head_width_decr', 'head_width_incr', 'jaw_width_decr', 'jaw_width_incr', 'eye_size_decr', 'eye_size_incr', 'eye_spacing_decr', 'eye_spacing_incr', 'nose_width_decr', 'nose_width_incr', 'nose_projection_decr', 'nose_projection_incr', 'mouth_width_decr', 'mouth_width_incr', 'upper_lip_volume_decr', 'upper_lip_volume_incr', 'lower_lip_volume_decr', 'lower_lip_volume_incr'] as const;
export type Avatar3DSignedMorphId = (typeof AVATAR_3D_SIGNED_MORPH_IDS)[number];
export type Avatar3DGlbMorphId = (typeof AVATAR_3D_GLB_MORPH_IDS)[number];
export type Avatar3DSignedMorphValues = Readonly<Record<Avatar3DSignedMorphId, number>>;
export type Avatar3DGlbMorphWeights = Readonly<Record<Avatar3DGlbMorphId, number>>;

export type Avatar3DCamera = 'portrait' | 'studio';
export type Avatar3DFacePresetId = 'face.soft' | 'face.heart' | 'face.strong';
export type Avatar3DHairId = 'hair.wave' | 'hair.crop';
export type Avatar3DOutfitId = 'outfit.terra';
export type Avatar3DHeadwearId = 'hood.assassin' | null;
export type Avatar3DPresentationId = 'masculine' | 'feminine';

export type Avatar3DP0DNA = Readonly<{
  facePresetId: Avatar3DFacePresetId;
  presentationId: Avatar3DPresentationId;
  hairId: Avatar3DHairId;
  outfitId: Avatar3DOutfitId;
  headwearId: Avatar3DHeadwearId;
  skinTone: string;
  hairColor: string;
  irisColor: string;
  userMorphOffsets: Avatar3DSignedMorphValues;
  camera: Avatar3DCamera;
}>;

export type Avatar3DRenderPlan = Readonly<{
  morphWeights: Avatar3DGlbMorphWeights;
  visibleMeshIds: readonly string[];
  hiddenZones: readonly string[];
  materialParams: Readonly<{
    skinTone: string;
    hairColor: string;
    irisColor: string;
  }>;
  camera: Avatar3DCamera;
}>;
