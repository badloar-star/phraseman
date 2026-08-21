import { resolveAvatar3DPlan } from '../modules/avatar-dna-3d/resolver';
import { AVATAR_3D_GLB_MORPH_IDS } from '../modules/avatar-dna-3d/contracts';

describe('resolveAvatar3DPlan', () => {
  const base = {
    facePresetId: 'face.soft',
    presentationId: 'masculine',
    hairId: 'hair.wave',
    outfitId: 'outfit.terra',
    headwearId: null,
    skinTone: '#D4936A',
    hairColor: '#5B2B18',
    irisColor: '#5B2B18',
    userMorphOffsets: { head_width: 0, jaw_width: 0, eye_size: 0, eye_spacing: 0, nose_width: 0, nose_projection: 0, mouth_width: 0, upper_lip_volume: 0, lower_lip_volume: 0 },
    camera: 'portrait',
  } as const;

  it('returns every signed pair weight in ABI order', () => {
    const plan = resolveAvatar3DPlan(base);
    expect(Object.keys(plan.morphWeights)).toEqual(AVATAR_3D_GLB_MORPH_IDS);
    expect(Object.values(plan.morphWeights).every((weight) => Number.isFinite(weight) && weight >= 0)).toBe(true);
    expect(plan.morphWeights.head_width_decr * plan.morphWeights.head_width_incr).toBe(0);
    expect(plan.materialParams).toEqual({ skinTone: '#D4936A', hairColor: '#5B2B18', irisColor: '#5B2B18' });
  });

  it('hides front hair under a hood without changing the selected hair id', () => {
    const plan = resolveAvatar3DPlan({ ...base, headwearId: 'hood.assassin' });

    expect(plan.visibleMeshIds).toEqual(['body.base', 'hair.wave.back', 'outfit.terra', 'hood.assassin']);
    expect(plan.hiddenZones).toEqual(['hair.front', 'hair.top']);
  });

  it('sums layers before branching, including across zero', () => {
    const plan = resolveAvatar3DPlan({ ...base, userMorphOffsets: { ...base.userMorphOffsets, head_width: -0.2 } });
    expect(plan.morphWeights.head_width_decr).toBeCloseTo(0.04);
    expect(plan.morphWeights.head_width_incr).toBe(0);
  });

  it('keeps both target branches at zero for an exact zero composed value', () => {
    const plan = resolveAvatar3DPlan({ ...base, userMorphOffsets: { ...base.userMorphOffsets, head_width: -0.16 } });
    expect(plan.morphWeights.head_width_decr).toBe(0);
    expect(plan.morphWeights.head_width_incr).toBe(0);
  });

  it('clamps lip targets once after composition', () => {
    const plan = resolveAvatar3DPlan({ ...base, userMorphOffsets: { ...base.userMorphOffsets, upper_lip_volume: 999, lower_lip_volume: -999 } });
    expect(plan.morphWeights.upper_lip_volume_incr).toBe(0.24);
    expect(plan.morphWeights.lower_lip_volume_decr).toBe(0.12);
  });

  it.each([
    ['masculine', 'face.soft', 0.16], ['feminine', 'face.heart', 0.08], ['masculine', 'face.strong', 0.18],
  ] as const)('uses the configured formula for %s %s', (presentationId, facePresetId, expectedHeadWidth) => {
    const plan = resolveAvatar3DPlan({ ...base, presentationId, facePresetId });
    expect(plan.morphWeights.head_width_incr).toBeCloseTo(expectedHeadWidth);
    expect(plan.morphWeights.head_width_decr).toBe(0);
  });

  it('does not let colors, hair, or hood alter geometry and exposes iris material', () => {
    const plain = resolveAvatar3DPlan(base);
    const styled = resolveAvatar3DPlan({ ...base, hairId: 'hair.crop', headwearId: 'hood.assassin', skinTone: '#000000', hairColor: '#FFFFFF', irisColor: '#00FF00' });
    expect(styled.morphWeights).toEqual(plain.morphWeights);
    expect(styled.materialParams.irisColor).toBe('#00FF00');
  });

  it('rejects contextual invalid identifiers, colors, and offset shapes', () => {
    expect(() => resolveAvatar3DPlan({ ...base, facePresetId: 'face.nope' } as any)).toThrow('avatar_3d_id_invalid');
    expect(() => resolveAvatar3DPlan({ ...base, irisColor: 'green' })).toThrow('avatar_3d_color_invalid');
    expect(() => resolveAvatar3DPlan({ ...base, userMorphOffsets: { ...base.userMorphOffsets, head_width: Infinity } })).toThrow('avatar_3d_user_morph_offsets_invalid');
    const missing = { ...base.userMorphOffsets } as any; delete missing.head_width;
    expect(() => resolveAvatar3DPlan({ ...base, userMorphOffsets: missing })).toThrow('avatar_3d_user_morph_offsets_invalid');
    expect(() => resolveAvatar3DPlan({ ...base, userMorphOffsets: { ...base.userMorphOffsets, extra: 0 } } as any)).toThrow('avatar_3d_user_morph_offsets_invalid');
  });

  it('returns frozen isolated output structures', () => {
    const first = resolveAvatar3DPlan(base);
    const second = resolveAvatar3DPlan(base);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.morphWeights)).toBe(true);
    expect(Object.isFrozen(first.visibleMeshIds)).toBe(true);
    expect(first.morphWeights).not.toBe(second.morphWeights);
  });
});
