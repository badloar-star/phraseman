import { avatarCatalog, starterAvatarDNA } from '../modules/avatar-dna/catalog';
import { compareAvatarLayers, resolveAvatarDNA } from '../modules/avatar-dna/resolver';

describe('Avatar DNA resolver', () => {
  it('uses ordinal code-unit ordering for equal-z punctuation IDs', () => {
    expect([{ id: 'a-1', z: 5 }, { id: 'a.1', z: 5 }, { id: 'a_1', z: 5 }].sort(compareAvatarLayers).map((layer) => layer.id)).toEqual(['a-1', 'a.1', 'a_1']);
  });
  it('returns the exact free starter DNA', () => {
    expect(starterAvatarDNA('starter_warm_01')).toEqual({
      schemaVersion: 1, rigId: 'human_v1',
      base: { starterPresetId: 'starter_warm_01', skinToneId: 'skin_03', faceBaseId: 'face_01', bodyBaseId: 'body_01' },
      hair: { styleId: 'hair_01', colorId: 'hair_brown' },
      face: { eyesId: 'eyes_01', irisColorId: 'iris_brown', browsId: 'brows_01', noseId: 'nose_01', mouthId: 'mouth_01', skinDetailIds: [], makeupIds: [], facialHairId: null },
      wearables: { outfitId: 'outfit_01', headwearId: null, maskId: null, eyewearId: null, earAccessoryId: null, neckAccessoryId: null },
      scene: { backgroundId: 'background_cream', auraId: null, frameId: null, foregroundFxId: null },
    });
  });

  it('provides a distinct second starter preset on the same rig', () => {
    const second = starterAvatarDNA('starter_warm_02');
    expect(second.base).toEqual({ starterPresetId: 'starter_warm_02', skinToneId: 'skin_03', faceBaseId: 'face_02', bodyBaseId: 'body_02' });
    expect(second.face).toMatchObject({ eyesId: 'eyes_02', irisColorId: 'iris_brown', browsId: 'brows_02', noseId: 'nose_02', mouthId: 'mouth_02' });
    expect(second.hair).toEqual({ styleId: 'hair_02', colorId: 'hair_brown' });
    expect(second.wearables.outfitId).toBe('outfit_02');
    expect(second.rigId).toBe('human_v1');
  });

  it('rejects selected item conflicts without mutating chosen DNA', () => {
    const chosen = starterAvatarDNA('starter_warm_01'); const before = JSON.parse(JSON.stringify(chosen));
    const catalog = JSON.parse(JSON.stringify(require('../config/avatar-dna/catalog.v1.json')));
    catalog.items.find((item: any) => item.id === 'hair_01').conflicts = ['outfit_01'];
    expect(() => resolveAvatarDNA(chosen, catalog)).toThrow('avatar_catalog_invalid: conflict');
    expect(chosen).toEqual(before);
  });

  it('resolves a hood without changing the stored hair choice', () => {
    const chosen = starterAvatarDNA('starter_warm_01');
    const withHood = { ...chosen, hair: { ...chosen.hair, styleId: 'hair_02' }, wearables: { ...chosen.wearables, headwearId: 'headwear.assassin_hood.01' } };
    const resolved = resolveAvatarDNA(withHood, avatarCatalog);

    expect(resolved.chosenDNA).toEqual(withHood);
    expect(resolved.chosenDNA).not.toBe(withHood);
    expect(resolved.visibilityPlan.hiddenSlots).toEqual(['hair.front', 'ears']);
    expect(resolved.layers.map((layer) => layer.id)).toEqual([
      'background.cream', 'hood.assassin.back', 'hair.2.back.mask', 'hair.2.back.shading', 'body.base.1', 'outfit.1', 'face.base.1', 'eyes.1', 'iris.brown', 'brows.1', 'nose.1', 'mouth.1', 'hood.assassin.shadow', 'hood.assassin.front',
    ]);
  });

  it('restores the stored hair choice when the hood is removed', () => {
    const starter = starterAvatarDNA('starter_warm_01');
    const resolved = resolveAvatarDNA({ ...starter, hair: { ...starter.hair, styleId: 'hair_02' } }, avatarCatalog);
    expect(resolved.effectiveDNA.hair.styleId).toBe('hair_02');
    expect(resolved.visibilityPlan.hiddenSlots).not.toContain('hair.front');
  });

  it('applies selected skin and hair swatches only to layers that declare a tint source', () => {
    const catalog = JSON.parse(JSON.stringify(require('../config/avatar-dna/catalog.v1.json')));
    catalog.items.find((item: any) => item.id === 'skin_03').swatchHex = '#d4936a';
    catalog.items.find((item: any) => item.id === 'hair_brown').swatchHex = '#5b2b18';
    const resolved = resolveAvatarDNA(starterAvatarDNA('starter_warm_01'), catalog);
    expect(resolved.layers.find((layer) => layer.id === 'face.base.1')?.tintColor).toBe('#d4936a');
    expect(resolved.layers.filter((layer) => layer.id.startsWith('hair.1.') && layer.tintColor).map((layer) => layer.tintColor)).toEqual(['#5b2b18', '#5b2b18']);
    expect(resolved.layers.find((layer) => layer.id === 'outfit.1')?.tintColor).toBeUndefined();
  });

  it('fails closed for unknown selected items', () => {
    const starter = starterAvatarDNA('starter_warm_01');
    expect(() => resolveAvatarDNA({ ...starter, hair: { ...starter.hair, styleId: 'hair_unknown' } }, avatarCatalog)).toThrow('avatar_catalog_invalid');
  });

  it.each([
    ['skinToneId', 'face_01'], ['faceBaseId', 'skin_03'], ['bodyBaseId', 'hair_01'], ['eyesId', 'iris_brown'], ['irisColorId', 'eyes_01'], ['styleId', 'hair_brown'], ['colorId', 'hair_01'], ['outfitId', 'hair_01'], ['backgroundId', 'outfit_01'],
  ])('rejects selector-kind mismatch for %s', (field, replacement) => {
    const chosen: any = JSON.parse(JSON.stringify(starterAvatarDNA('starter_warm_01')));
    if (field in chosen.base) chosen.base[field] = replacement; else if (field in chosen.face) chosen.face[field] = replacement; else if (field in chosen.hair) chosen.hair[field] = replacement; else if (field in chosen.wearables) chosen.wearables[field] = replacement; else chosen.scene[field] = replacement;
    const before = JSON.parse(JSON.stringify(chosen)); expect(() => resolveAvatarDNA(chosen, avatarCatalog)).toThrow('avatar_catalog_invalid'); expect(chosen).toEqual(before);
  });

  it.each(['maskId', 'eyewearId', 'earAccessoryId', 'neckAccessoryId', 'auraId', 'frameId', 'foregroundFxId'])('rejects hood or face in optional selector %s', (field) => {
    const chosen: any = JSON.parse(JSON.stringify(starterAvatarDNA('starter_warm_01')));
    const target = field in chosen.wearables ? chosen.wearables : chosen.scene; target[field] = field === 'maskId' ? 'headwear.assassin_hood.01' : 'face_01'; const before = JSON.parse(JSON.stringify(chosen));
    expect(() => resolveAvatarDNA(chosen, avatarCatalog)).toThrow('avatar_catalog_invalid'); expect(chosen).toEqual(before);
  });

  it.each(['skinDetailIds', 'makeupIds', 'facialHairId'])('rejects hood in face selector %s', (field) => {
    const chosen: any = JSON.parse(JSON.stringify(starterAvatarDNA('starter_warm_01'))); chosen.face[field] = field === 'facialHairId' ? 'headwear.assassin_hood.01' : ['headwear.assassin_hood.01']; const before = JSON.parse(JSON.stringify(chosen));
    expect(() => resolveAvatarDNA(chosen, avatarCatalog)).toThrow('avatar_catalog_invalid'); expect(chosen).toEqual(before);
  });

  it.each(['hair_02', 'face_01'])('rejects non-headwear %s in headwear selector', (headwearId) => {
    const chosen: any = JSON.parse(JSON.stringify(starterAvatarDNA('starter_warm_01'))); chosen.wearables.headwearId = headwearId; const before = JSON.parse(JSON.stringify(chosen));
    expect(() => resolveAvatarDNA(chosen, avatarCatalog)).toThrow('avatar_catalog_invalid'); expect(chosen).toEqual(before);
  });

  it('rejects a cyclic untrusted catalog and keeps parsed catalog immutable', () => {
    const cyclic = JSON.parse(JSON.stringify(require('../config/avatar-dna/catalog.v1.json')));
    cyclic.items[0].conflicts = [cyclic.items[1].id];
    cyclic.items[1].conflicts = [cyclic.items[0].id];
    expect(() => resolveAvatarDNA(starterAvatarDNA('starter_warm_01'), cyclic)).toThrow('avatar_manifest_cycle');
    expect(() => { (avatarCatalog.items[0] as { id: string }).id = 'evil'; }).toThrow();
    expect(avatarCatalog.items[0].id).toBe('skin_01');
  });
});
