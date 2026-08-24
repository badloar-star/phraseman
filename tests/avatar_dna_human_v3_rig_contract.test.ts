import {
  HUMAN_V3_HAIR_ZONES,
  HUMAN_V3_RIG_ACCEPTANCE,
  HUMAN_V3_RIG_ID,
} from '../modules/avatar-dna-3d/human_v3_rig_contract';

describe('Human V3 authored-rig contract', () => {
  it('requires a source rig and forbids the primitive fallback', () => {
    expect(HUMAN_V3_RIG_ACCEPTANCE).toMatchObject({
      rigId: HUMAN_V3_RIG_ID,
      sourceBlendRequired: true,
      requiresSkinnedMeshes: true,
      proceduralFallbackForbidden: true,
    });
  });

  it('keeps the four hair zones required for hood compatibility', () => {
    expect(HUMAN_V3_HAIR_ZONES).toEqual(['hair.front', 'hair.top', 'hair.side', 'hair.back']);
  });

  it('requires face anchors needed by glasses and earrings', () => {
    expect(HUMAN_V3_RIG_ACCEPTANCE.requiredAnchors).toEqual(expect.arrayContaining([
      'nose.bridge', 'ear.left', 'ear.right', 'head',
    ]));
  });
});
