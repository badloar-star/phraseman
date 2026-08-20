import {
  canonicalizeAvatarDNA,
  parseAvatarDNA,
} from '../modules/avatar-dna/canonicalize';
import type {
  AvatarCatalogManifest,
  AvatarItemManifest,
  AvatarV2Projection,
  ResolvedAvatarDNA,
} from '../modules/avatar-dna/contracts';

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
  it('parses valid DNA into a fully reconstructed value', () => {
    const parsed = parseAvatarDNA(dna);

    expect(parsed).toEqual(dna);
    expect(parsed).not.toBe(dna);
    expect(parsed.base).not.toBe(dna.base);
    expect(parsed.face).not.toBe(dna.face);
    expect(parsed.hair).not.toBe(dna.hair);
    expect(parsed.wearables).not.toBe(dna.wearables);
    expect(parsed.scene).not.toBe(dna.scene);
    expect(parsed.face.skinDetailIds).not.toBe(dna.face.skinDetailIds);
    expect(parsed.face.makeupIds).not.toBe(dna.face.makeupIds);
  });

  it('accepts a null starter preset ID', () => {
    const value = copyDNA();
    (value.base as Record<string, unknown>).starterPresetId = null;

    expect(parseAvatarDNA(value).base.starterPresetId).toBeNull();
  });

  it('canonicalizes deterministically and sorts multi-select arrays', () => {
    const unsorted = copyDNA();
    const face = unsorted.face as Record<string, unknown>;
    face.skinDetailIds = ['detail_z', 'detail_a'];
    face.makeupIds = ['makeup_z', 'makeup_a'];

    const canonical = canonicalizeAvatarDNA(unsorted);
    expect(canonical).toBe(canonicalizeAvatarDNA(JSON.parse(canonical)));
    expect(canonical).toBe('{"schemaVersion":1,"rigId":"human_v1","base":{"starterPresetId":"starter_warm_01","skinToneId":"skin_03","faceBaseId":"face_01","bodyBaseId":"body_01"},"face":{"eyesId":"eyes_01","irisColorId":"iris_brown","browsId":"brows_01","noseId":"nose_01","mouthId":"mouth_01","skinDetailIds":["detail_a","detail_z"],"makeupIds":["makeup_a","makeup_z"],"facialHairId":null},"hair":{"styleId":"hair_01","colorId":"hair_brown"},"wearables":{"outfitId":"outfit_01","headwearId":null,"maskId":null,"eyewearId":null,"earAccessoryId":null,"neckAccessoryId":null},"scene":{"backgroundId":"background_cream","auraId":null,"frameId":null,"foregroundFxId":null}}');
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
    expect(() => parseAvatarDNA(value)).toThrow('avatar_dna_invalid');
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
    expect(() => parseAvatarDNA(value)).toThrow('avatar_dna_invalid');
  });
});

const hoodManifest = {
  id: 'headwear.assassin_hood.01',
  assetVersion: 1,
  rigIds: ['human_v1'],
  category: 'look',
  entitlement: { kind: 'reward', rarity: 'rare' },
  layers: [{ id: 'hood_front', slot: 'headwear.front', z: 10, file: 'hood.webp' }],
  occludes: ['hair.front', 'ears'],
  conflicts: [],
  restoresOnRemove: true,
} as const satisfies AvatarItemManifest;

const catalogFixture = {
  catalogVersion: 1,
  rigIds: ['human_v1'],
  items: [hoodManifest],
} as const satisfies AvatarCatalogManifest;

const resolvedFixture = {
  chosenDNA: dna,
  effectiveDNA: dna,
  visibilityPlan: { hiddenSlots: ['hair.front', 'ears'] },
  layers: hoodManifest.layers,
} as const satisfies ResolvedAvatarDNA;

const readyProjectionFixture = {
  schemaVersion: 1,
  state: 'ready',
  renderId: 'render_01',
  portraitUrl: 'https://example.test/portrait.webp',
  studioUrl: 'https://example.test/studio.webp',
  manifestVersion: 1,
} as const satisfies AvatarV2Projection;

void catalogFixture;
void resolvedFixture;
void readyProjectionFixture;
