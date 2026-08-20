export const AVATAR_DNA_SCHEMA_VERSION = 1 as const;
export const AVATAR_DNA_RIG_ID = 'human_v1' as const;
export const AVATAR_ID = /^[a-z][a-z0-9_.-]{1,79}$/;

export type AvatarCamera = 'portrait' | 'studio';
export type AvatarCategory = 'base' | 'face' | 'hair' | 'look' | 'scene';
export type AvatarSlot =
  | 'background' | 'outfit.back' | 'hood.back' | 'hair.back' | 'body'
  | 'outfit' | 'ears' | 'face' | 'skin.detail' | 'makeup' | 'eyes' | 'iris'
  | 'brows' | 'nose' | 'mouth' | 'facial.hair' | 'hair.side' | 'hair.front'
  | 'eyewear' | 'ear.accessory' | 'mask' | 'headwear.front'
  | 'neck.accessory' | 'outfit.front' | 'aura' | 'frame' | 'foreground.fx';

export type AvatarDNAConflictNotice = Readonly<{
  kind: 'occlusion' | 'conflict';
  hiddenSlots: readonly AvatarSlot[];
  itemId: string;
}>;

export type AvatarDNAPurchaseIntent = Readonly<{
  operationId: string;
  itemId: string;
  catalogVersion: 1;
  cost: number;
}>;

export type AvatarDNA = Readonly<{
  schemaVersion: typeof AVATAR_DNA_SCHEMA_VERSION;
  rigId: typeof AVATAR_DNA_RIG_ID;
  base: Readonly<{
    starterPresetId: string;
    skinToneId: string;
    faceBaseId: string;
    bodyBaseId: string;
  }>;
  face: Readonly<{
    eyesId: string;
    irisColorId: string;
    browsId: string;
    noseId: string;
    mouthId: string;
    skinDetailIds: readonly string[];
    makeupIds: readonly string[];
    facialHairId: string | null;
  }>;
  hair: Readonly<{ styleId: string; colorId: string }>;
  wearables: Readonly<{
    outfitId: string;
    headwearId: string | null;
    maskId: string | null;
    eyewearId: string | null;
    earAccessoryId: string | null;
    neckAccessoryId: string | null;
  }>;
  scene: Readonly<{
    backgroundId: string;
    auraId: string | null;
    frameId: string | null;
    foregroundFxId: string | null;
  }>;
}>;

export type AvatarLayerRecord = Readonly<{
  slot: AvatarSlot;
  itemId: string;
  assetId: string;
}>;

export type AvatarItemManifest = Readonly<{
  id: string;
  category: AvatarCategory;
  slots: readonly AvatarSlot[];
  layers: readonly AvatarLayerRecord[];
}>;

export type AvatarCatalogManifest = Readonly<{
  catalogVersion: 1;
  rigId: typeof AVATAR_DNA_RIG_ID;
  items: readonly AvatarItemManifest[];
}>;

export type ResolvedAvatarDNA = Readonly<{
  dna: AvatarDNA;
  layers: readonly AvatarLayerRecord[];
  notices: readonly AvatarDNAConflictNotice[];
}>;

export type AvatarV2Projection = Readonly<{
  dna: AvatarDNA;
  canonicalDNA: string;
  camera: AvatarCamera;
  resolved: ResolvedAvatarDNA;
}>;
