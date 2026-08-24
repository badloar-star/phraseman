/**
 * Runtime-facing contract for the authored Blender rig. This does not describe
 * the P0 primitive GLB and deliberately has no procedural geometry fallback.
 */
export const HUMAN_V3_RIG_ID = 'human_v3' as const;

export const HUMAN_V3_FACE_PRESETS = ['face.soft', 'face.heart', 'face.strong'] as const;
export const HUMAN_V3_EXPRESSIONS = ['expression.neutral', 'expression.smile', 'expression.smirk', 'expression.sad', 'expression.angry'] as const;
export const HUMAN_V3_HAIR_ZONES = ['hair.front', 'hair.top', 'hair.side', 'hair.back'] as const;

export type HumanV3FacePresetId = typeof HUMAN_V3_FACE_PRESETS[number];
export type HumanV3ExpressionId = typeof HUMAN_V3_EXPRESSIONS[number];
export type HumanV3HairZone = typeof HUMAN_V3_HAIR_ZONES[number];

export type HumanV3AnchorId =
  | 'head'
  | 'nose.bridge'
  | 'ear.left'
  | 'ear.right'
  | 'neck'
  | 'chest'
  | 'back';

export type HumanV3Slot = 'hair' | 'outfit' | 'headwear' | 'eyewear' | 'earAccessory' | 'neckAccessory';

export type HumanV3MorphName =
  | 'head_width'
  | 'jaw_shape'
  | 'chin_length'
  | 'nose_width'
  | 'nose_projection'
  | 'eye_size'
  | 'eye_spacing'
  | 'lip_fullness'
  | 'expression_neutral'
  | 'expression_smile'
  | 'expression_smirk'
  | 'expression_sad'
  | 'expression_angry';

export type HumanV3ItemManifest = Readonly<{
  id: string;
  slot: HumanV3Slot;
  meshName: string;
  anchor: HumanV3AnchorId;
  fitsBases: readonly ['base.boy', 'base.girl'] | readonly ['base.boy'] | readonly ['base.girl'];
  hides?: readonly HumanV3HairZone[];
  keeps?: readonly HumanV3HairZone[];
  excludes?: readonly string[];
  correctiveMorphs?: readonly HumanV3MorphName[];
}>;

export type HumanV3RigAcceptance = Readonly<{
  rigId: typeof HUMAN_V3_RIG_ID;
  sourceBlendRequired: true;
  requiredAnchors: readonly HumanV3AnchorId[];
  requiredMorphs: readonly HumanV3MorphName[];
  requiresSkinnedMeshes: true;
  proceduralFallbackForbidden: true;
}>;

export const HUMAN_V3_RIG_ACCEPTANCE: HumanV3RigAcceptance = Object.freeze({
  rigId: HUMAN_V3_RIG_ID,
  sourceBlendRequired: true,
  requiredAnchors: Object.freeze(['head', 'nose.bridge', 'ear.left', 'ear.right', 'neck', 'chest', 'back']),
  requiredMorphs: Object.freeze([
    'head_width', 'jaw_shape', 'chin_length', 'nose_width', 'nose_projection', 'eye_size', 'eye_spacing', 'lip_fullness',
    'expression_neutral', 'expression_smile', 'expression_smirk', 'expression_sad', 'expression_angry',
  ]),
  requiresSkinnedMeshes: true,
  proceduralFallbackForbidden: true,
});
