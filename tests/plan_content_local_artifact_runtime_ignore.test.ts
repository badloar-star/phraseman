import fs from 'fs';
import path from 'path';

import { EMBEDDED_COURSE_PACK_INDEX } from '../app/course_pack_index';
import {
  resolveCoursePackReadiness,
} from '../app/course_pack_loader';

const ROOT = path.resolve(__dirname, '..');
const LOCAL_ARTIFACT_DIR = path.join(ROOT, '.codex-tmp', 'plan-content', 'tests', 'runtime-ignore');

describe('plan content local artifact runtime ignore guard', () => {
  it('keeps local manifest/readiness artifacts out of runtime readiness decisions', () => {
    fs.mkdirSync(LOCAL_ARTIFACT_DIR, { recursive: true });
    fs.writeFileSync(path.join(LOCAL_ARTIFACT_DIR, 'manifest.json'), JSON.stringify({
      packId: 'en.ru.plan_content.local.runtime.ignore',
      activationApproved: true,
    }, null, 2));
    fs.writeFileSync(path.join(LOCAL_ARTIFACT_DIR, 'release-readiness-report.json'), JSON.stringify({
      status: 'PASS',
      activationApproved: true,
    }, null, 2));

    // Even with remote loading enabled, the embedded index has no downloadable
    // plan_content entry, so the synchronous loader still resolves to the bundled
    // offline fallback — the server pack is consumed only through the separate
    // async remote bridge, never this path.
    expect(resolveCoursePackReadiness({
      studyTarget: 'en',
      sourceLocale: 'ru',
      surface: 'plan_content',
      selectionConfirmed: true,
    })).toEqual({
      state: 'offline_fallback',
      delivery: 'bundled_compatibility',
      reason: 'bundled_compatibility_until_pack_extraction',
    });
  });

  it('keeps embedded plan_content index entries bundled-only and non-activating', () => {
    const planContentEntries = EMBEDDED_COURSE_PACK_INDEX.filter((entry) => entry.surface === 'plan_content');

    expect(planContentEntries.length).toBeGreaterThan(0);
    expect(planContentEntries.every((entry) => entry.delivery === 'bundled_compatibility')).toBe(true);
    expect(planContentEntries.every((entry) => entry.activationApproved === false)).toBe(true);
    expect(planContentEntries.every((entry) => entry.manifest === undefined)).toBe(true);
    expect(planContentEntries.some((entry) => entry.sourceLocale !== 'ru' && entry.sourceLocale !== 'uk')).toBe(false);
  });

  it('keeps local artifact tools disconnected from app startup, loader and embedded index source', () => {
    const startupAndRuntimeFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
      path.join(ROOT, 'app', 'course_pack_loader.ts'),
      path.join(ROOT, 'app', 'course_pack_index.ts'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupAndRuntimeFiles) {
      expect(source).not.toMatch(/activation-guard|release-readiness-report|plan_content_(shadow_pack|course_pack|release_bundle)|local\.release/i);
    }
  });
});
