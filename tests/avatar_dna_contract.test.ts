import {
  canonicalizeAvatarDNA,
  parseAvatarDNA,
} from '../modules/avatar-dna/canonicalize';

const dna = {
  schemaVersion: 1,
  rigId: 'human_v1',
  base: {
    starterPresetId: 'starter_warm_01',
    skinToneId: 'skin_03',
    faceBaseId: 'face_01',
    bodyBaseId: 'body_01',
  },
  face: {
    eyesId: 'eyes_01',
    irisColorId: 'iris_brown',
    browsId: 'brows_01',
    noseId: 'nose_01',
    mouthId: 'mouth_01',
    skinDetailIds: [],
    makeupIds: [],
    facialHairId: null,
  },
  hair: { styleId: 'hair_01', colorId: 'hair_brown' },
  wearables: {
    outfitId: 'outfit_01',
    headwearId: null,
    maskId: null,
    eyewearId: null,
    earAccessoryId: null,
    neckAccessoryId: null,
  },
  scene: {
    backgroundId: 'background_cream',
    auraId: null,
    frameId: null,
    foregroundFxId: null,
  },
} as const;

const copyDNA = (): Record<string, unknown> => JSON.parse(JSON.stringify(dna));

describe('Avatar DNA v1 contract', () => {
  it('parses valid DNA into a newly constructed value', () => {
    const parsed = parseAvatarDNA(dna);

    expect(parsed).toEqual(dna);
    expect(parsed).not.toBe(dna);
    expect(parsed.base).not.toBe(dna.base);
    expect(parsed.face.skinDetailIds).not.toBe(dna.face.skinDetailIds);
  });

  it('canonicalizes deterministically and sorts multi-select arrays', () => {
    const unsorted = copyDNA();
    const face = unsorted.face as Record<string, unknown>;
    face.skinDetailIds = ['detail_z', 'detail_a'];
    face.makeupIds = ['makeup_z', 'makeup_a'];

    const canonical = canonicalizeAvatarDNA(unsorted);
    expect(canonical).toBe(canonicalizeAvatarDNA(JSON.parse(canonical)));
    expect(JSON.parse(canonical).face).toMatchObject({
      skinDetailIds: ['detail_a', 'detail_z'],
      makeupIds: ['makeup_a', 'makeup_z'],
    });
  });

  it.each([
    ['root', (value: Record<string, unknown>) => { value.extra = 'nope'; }],
    ['base', (value: Record<string, unknown>) => { (value.base as Record<string, unknown>).extra = 'nope'; }],
    ['face', (value: Record<string, unknown>) => { (value.face as Record<string, unknown>).extra = 'nope'; }],
    ['hair', (value: Record<string, unknown>) => { (value.hair as Record<string, unknown>).extra = 'nope'; }],
    ['wearables', (value: Record<string, unknown>) => { (value.wearables as Record<string, unknown>).extra = 'nope'; }],
    ['scene', (value: Record<string, unknown>) => { (value.scene as Record<string, unknown>).extra = 'nope'; }],
  ])('rejects unknown %s keys', (_scope, mutate) => {
    const value = copyDNA();
    mutate(value);
    expect(() => parseAvatarDNA(value)).toThrow();
  });

  it.each([
    ['invalid ID', (value: Record<string, unknown>) => { (value.base as Record<string, unknown>).starterPresetId = '../escape'; }],
    ['duplicate skin details', (value: Record<string, unknown>) => { (value.face as Record<string, unknown>).skinDetailIds = ['detail_a', 'detail_a']; }],
    ['duplicate makeup', (value: Record<string, unknown>) => { (value.face as Record<string, unknown>).makeupIds = ['makeup_a', 'makeup_a']; }],
    ['too many skin details', (value: Record<string, unknown>) => { (value.face as Record<string, unknown>).skinDetailIds = Array.from({ length: 9 }, (_, index) => `detail_${index}`); }],
    ['too much makeup', (value: Record<string, unknown>) => { (value.face as Record<string, unknown>).makeupIds = Array.from({ length: 9 }, (_, index) => `makeup_${index}`); }],
    ['unsupported schema', (value: Record<string, unknown>) => { value.schemaVersion = 2; }],
    ['unsupported rig', (value: Record<string, unknown>) => { value.rigId = 'animal_v1'; }],
    ['wrong scalar shape', (value: Record<string, unknown>) => { (value.hair as Record<string, unknown>).styleId = null; }],
    ['wrong nullable shape', (value: Record<string, unknown>) => { (value.wearables as Record<string, unknown>).maskId = []; }],
    ['wrong array shape', (value: Record<string, unknown>) => { (value.face as Record<string, unknown>).makeupIds = 'makeup_a'; }],
    ['wrong nested object shape', (value: Record<string, unknown>) => { value.scene = []; }],
  ])('rejects %s', (_reason, mutate) => {
    const value = copyDNA();
    mutate(value);
    expect(() => parseAvatarDNA(value)).toThrow();
  });
});
