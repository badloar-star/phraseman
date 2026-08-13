import fs from 'fs';
import path from 'path';

import {
  PLAN_CONTENT_DAY_SCHEMA_VERSION,
  PLAN_CONTENT_INDEX_SCHEMA_VERSION,
  validatePlanContentPackIndex,
  type PlanContentPackIndex,
} from '../app/plan_content_pack_index';

const ROOT = path.resolve(__dirname, '..');
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

function validIndex(overrides: Partial<PlanContentPackIndex> = {}): PlanContentPackIndex {
  return {
    schemaVersion: PLAN_CONTENT_INDEX_SCHEMA_VERSION,
    studyTarget: 'en',
    sourceLocale: 'ru',
    contentVersion: '2026.06.26.1',
    entries: [
      {
        planId: 'voyazh',
        dayIndex: 1,
        path: 'plans/voyazh/day-001.json',
        contentHash: HASH_A,
        sourceLocale: 'ru',
        studyTarget: 'en',
        reviewStatus: 'approved',
        localeGateStatus: 'passed',
        schemaVersion: PLAN_CONTENT_DAY_SCHEMA_VERSION,
      },
    ],
    ...overrides,
  };
}

describe('plan content pack index validators', () => {
  it('accepts the future shadow index shape without activating runtime loading', () => {
    expect(validatePlanContentPackIndex(validIndex())).toEqual({ ok: true, errors: [] });
  });

  it('fails closed for invalid top-level source, target, schema and content version', () => {
    const result = validatePlanContentPackIndex(validIndex({
      schemaVersion: 'plan-content-index-v2' as never,
      studyTarget: 'fr' as never,
      sourceLocale: 'pt_BR' as never,
      contentVersion: '../bad-version',
    }));

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'schemaVersion must be plan-content-index-v1',
      'studyTarget must be production studyTarget en',
      'sourceLocale must be an explicit normalized SourceLocale',
      'contentVersion must be a non-empty version token',
    ]));
  });

  it('fails closed for unsafe row path, hash, review status and locale gate status', () => {
    const result = validatePlanContentPackIndex(validIndex({
      entries: [
        {
          planId: 'voyazh',
          dayIndex: 1,
          path: '../plans/voyazh/day-001.json',
          contentHash: 'not-a-hash',
          sourceLocale: 'de' as never,
          studyTarget: 'fr' as never,
          reviewStatus: 'maybe' as never,
          localeGateStatus: 'almost' as never,
          schemaVersion: 'plan-content-day-v2' as never,
        },
      ],
    }));

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'entries[0].path must be a safe relative json path',
      'entries[0].contentHash must be a 64 character hex digest',
      'entries[0].sourceLocale must be an explicit normalized SourceLocale',
      'entries[0].sourceLocale must match index sourceLocale',
      'entries[0].studyTarget must be production studyTarget en',
      'entries[0].studyTarget must match index studyTarget',
      'entries[0].reviewStatus must be a known review status',
      'entries[0].localeGateStatus must be a known locale gate status',
      'entries[0].schemaVersion must be plan-content-day-v1',
    ]));
  });

  it('rejects duplicate plan days and mismatched entry dimensions', () => {
    const result = validatePlanContentPackIndex(validIndex({
      entries: [
        {
          planId: 'voyazh',
          dayIndex: 1,
          path: 'plans/voyazh/day-001.json',
          contentHash: HASH_A,
          sourceLocale: 'ru',
          studyTarget: 'en',
          reviewStatus: 'shadow',
          localeGateStatus: 'hold',
          schemaVersion: PLAN_CONTENT_DAY_SCHEMA_VERSION,
        },
        {
          planId: 'voyazh',
          dayIndex: 1,
          path: 'plans/voyazh/day-001-copy.json',
          contentHash: HASH_B,
          sourceLocale: 'uk',
          studyTarget: 'en',
          reviewStatus: 'approved',
          localeGateStatus: 'passed',
          schemaVersion: PLAN_CONTENT_DAY_SCHEMA_VERSION,
        },
      ],
    }));

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'entries[1].sourceLocale must match index sourceLocale',
      'entries[1] duplicates planId/dayIndex voyazh:1',
    ]));
  });

  it('requires approved review and passed locale gates for activation candidates', () => {
    const shadow = validatePlanContentPackIndex(validIndex({
      entries: [
        {
          ...validIndex().entries[0],
          reviewStatus: 'shadow',
          localeGateStatus: 'hold',
        },
      ],
    }));
    const activation = validatePlanContentPackIndex(validIndex({
      entries: [
        {
          ...validIndex().entries[0],
          reviewStatus: 'shadow',
          localeGateStatus: 'hold',
        },
      ],
    }), { requireActivationReady: true });

    expect(shadow).toEqual({ ok: true, errors: [] });
    expect(activation.ok).toBe(false);
    expect(activation.errors).toEqual(expect.arrayContaining([
      'entries[0].reviewStatus must be approved for activation',
      'entries[0].localeGateStatus must be passed for activation',
    ]));
  });

  it('keeps validators disconnected from startup, Firebase, loader runtime and payloads', () => {
    const validatorSource = fs.readFileSync(path.join(ROOT, 'app', 'plan_content_pack_index.ts'), 'utf8');
    expect(validatorSource).not.toMatch(/firebase|firestore|storage\(\)|fetch\(|XMLHttpRequest|AsyncStorage|course_pack_loader|plan_content_registry|plan_content_(impuls|gavan|mitap|echo|voyazh)/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_pack_index|PlanContentPackIndex/i);
    }
  });
});
