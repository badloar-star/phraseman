import { starterAvatarDNA } from '../modules/avatar-dna/catalog';
import { resolveAvatarDNA } from '../modules/avatar-dna/resolver';

describe('Avatar DNA resolver', () => {
  it('returns the exact free starter DNA', () => {
    expect(starterAvatarDNA('starter_warm_01')).toMatchObject({
      schemaVersion: 1, rigId: 'human_v1',
      base: { starterPresetId: 'starter_warm_01', skinToneId: 'skin_03', faceBaseId: 'face_01', bodyBaseId: 'body_01' },
      hair: { styleId: 'hair_01', colorId: 'hair_brown' },
    });
  });

  it('resolves a hood without changing the stored hair choice', () => {
    const chosen = starterAvatarDNA('starter_warm_01');
    const withHood = { ...chosen, hair: { ...chosen.hair, styleId: 'hair_wavy_01' }, wearables: { ...chosen.wearables, headwearId: 'headwear.assassin_hood.01' } };
    const resolved = resolveAvatarDNA(withHood);

    expect(resolved.chosenDNA).toEqual(withHood);
    expect(resolved.chosenDNA).not.toBe(withHood);
    expect(resolved.visibilityPlan.hiddenSlots).toEqual(['hair.front', 'ears']);
    expect(resolved.layers.map((layer) => layer.id)).toEqual([
      'background.cream', 'hood.assassin.back', 'hair.wavy.back', 'body.base.01', 'outfit.starter.01', 'face.base.01', 'eyes.01', 'iris.brown', 'brows.01', 'nose.01', 'mouth.01', 'hood.assassin.shadow', 'hood.assassin.front',
    ]);
  });

  it('restores the stored hair choice when the hood is removed', () => {
    const starter = starterAvatarDNA('starter_warm_01');
    const resolved = resolveAvatarDNA({ ...starter, hair: { ...starter.hair, styleId: 'hair_wavy_01' } });
    expect(resolved.effectiveDNA.hair.styleId).toBe('hair_wavy_01');
    expect(resolved.visibilityPlan.hiddenSlots).not.toContain('hair.front');
  });

  it('fails closed for unknown selected items', () => {
    const starter = starterAvatarDNA('starter_warm_01');
    expect(() => resolveAvatarDNA({ ...starter, hair: { ...starter.hair, styleId: 'hair_unknown' } })).toThrow('avatar_catalog_invalid');
  });
});
