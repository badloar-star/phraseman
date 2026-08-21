import { validateAvatar3DStyleRecipe } from '../modules/avatar-dna-3d/resolver';

const recipe = require('../config/avatar-dna/human_v2_style.v1.json') as unknown;

const parameterOrder = [
  'head_width', 'jaw_width', 'eye_size', 'eye_spacing', 'nose_width',
  'nose_projection', 'mouth_width', 'upper_lip_volume', 'lower_lip_volume',
] as const;

const targetOrder = parameterOrder.flatMap((parameter) => [
  `${parameter}_decr`, `${parameter}_incr`,
]);

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe('human_v2 signed-pair style recipe', () => {
  it('accepts the exact dense signed-pair ABI and pinned safe source paths', () => {
    const parsed = validateAvatar3DStyleRecipe(recipe);

    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.morphContractVersion).toBe('signed-pairs-v1');
    expect(parsed.parameterOrder).toEqual(parameterOrder);
    expect(parsed.targetOrder).toEqual(targetOrder);
    expect(parsed.bounds).toEqual({
      head_width: { min: -0.22, max: 0.22 }, jaw_width: { min: -0.28, max: 0.28 },
      eye_size: { min: -0.12, max: 0.32 }, eye_spacing: { min: -0.16, max: 0.16 },
      nose_width: { min: -0.22, max: 0.18 }, nose_projection: { min: -0.12, max: 0.18 },
      mouth_width: { min: -0.16, max: 0.18 }, upper_lip_volume: { min: -0.12, max: 0.24 },
      lower_lip_volume: { min: -0.12, max: 0.24 },
    });
    expect(parsed.base).toEqual({ head_width: 0.04, jaw_width: 0, eye_size: 0.18, eye_spacing: 0, nose_width: -0.08, nose_projection: -0.03, mouth_width: 0.03, upper_lip_volume: 0.06, lower_lip_volume: 0.08 });
    expect(parsed.presentations).toEqual({ masculine: { head_width: 0.08, jaw_width: 0.18, eye_size: 0.12, eye_spacing: 0, nose_width: 0.02, nose_projection: 0, mouth_width: 0.05, upper_lip_volume: 0.02, lower_lip_volume: 0.04 }, feminine: { head_width: -0.02, jaw_width: -0.14, eye_size: 0.24, eye_spacing: 0, nose_width: -0.12, nose_projection: -0.05, mouth_width: 0.02, upper_lip_volume: 0.14, lower_lip_volume: 0.16 } });
    expect(parsed.faces['face.strong']).toEqual({ head_width: 0.06, jaw_width: 0.22, eye_size: -0.02, eye_spacing: 0.01, nose_width: 0.08, nose_projection: 0.1, mouth_width: 0.06, upper_lip_volume: -0.02, lower_lip_volume: 0 });
    expect(parsed.sourcePairs.eye_spacing).toEqual({ decr: ['eyes/l-eye-trans-in.target', 'eyes/r-eye-trans-in.target'], incr: ['eyes/l-eye-trans-out.target', 'eyes/r-eye-trans-out.target'] });
    expect(Object.keys(parsed.presentations)).toEqual(['masculine', 'feminine']);
    expect(Object.keys(parsed.faces)).toEqual(['face.soft', 'face.heart', 'face.strong']);
    for (const parameter of parameterOrder) {
      expect(Object.keys(parsed.sourcePairs[parameter])).toEqual(['decr', 'incr']);
      for (const branch of ['decr', 'incr'] as const) {
        const sources = parsed.sourcePairs[parameter][branch];
        expect(sources.length).toBeGreaterThan(0);
        expect(new Set(sources).size).toBe(sources.length);
        expect(sources.every((source) => /^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*\.target$/.test(source))).toBe(true);
      }
    }
  });

  it.each([
    ['missing parameter', (invalid: any) => { delete invalid.base.head_width; }],
    ['extra parameter', (invalid: any) => { invalid.base.extra = 0; }],
    ['misordered parameter', (invalid: any) => { [invalid.parameterOrder[0], invalid.parameterOrder[1]] = [invalid.parameterOrder[1], invalid.parameterOrder[0]]; }],
    ['non-finite bound', (invalid: any) => { invalid.bounds.head_width.min = 'NaN'; }],
    ['unsafe source', (invalid: any) => { invalid.sourcePairs.head_width.decr[0] = '../escape.target'; }],
    ['duplicate source', (invalid: any) => { invalid.sourcePairs.eye_size.decr.push(invalid.sourcePairs.eye_size.decr[0]); }],
  ])('rejects %s', (_label, mutate) => {
    const invalid = clone(recipe) as any;
    mutate(invalid);

    expect(() => validateAvatar3DStyleRecipe(invalid)).toThrow('avatar_3d_style_invalid');
  });
});
