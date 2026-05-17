import fs from 'fs';
import path from 'path';

import { getAllDiagnosisTrainings } from '../app/diagnosis_trainings';
import {
  ACTIVE_PERSONAL_TRAINING_IDS,
  JESSE_REWORKED_MARKER,
} from '../app/personal_training_taxonomy';
import { PERSONAL_TRAINING_SUMMARY_SOURCE_LOCALES } from '../app/personal_training_source_locales';
import { PLANNED_INTERFACE_SOURCE_LOCALES } from '../app/source_locales';

const ROOT = path.resolve(__dirname, '..');
const ADMIN_MANIFEST_PATH = path.join(ROOT, 'admin', 'personal-trainings.js');

function readAdminManifest(): {
  activeIds: string[];
  jesseReworkedIds: string[];
  legacyNeedsReworkIds: string[];
  jesseReworkedMarker: string;
  trainings: Array<{
    id: string;
    status: string;
    jesseStatus: string;
    needsJesseRework: boolean;
    jesseMarker: string | null;
    cefrLevel: string | null;
    prerequisites: string[];
    placementRisk: string | null;
    appPath: string;
    registryPath: string;
    title: Record<string, string>;
    shortDiagnosis: Record<string, string>;
  }>;
} {
  const raw = fs.readFileSync(ADMIN_MANIFEST_PATH, 'utf8');
  const match = /window\.PERSONAL_TRAININGS_MANIFEST = ([\s\S]*);\s*$/.exec(raw);
  if (!match) {
    throw new Error('admin/personal-trainings.js does not contain PERSONAL_TRAININGS_MANIFEST');
  }
  return JSON.parse(match[1]);
}

describe('admin personal trainings manifest', () => {
  it('is generated from the app registry without duplicate ids', () => {
    expect(fs.existsSync(ADMIN_MANIFEST_PATH)).toBe(true);

    const manifest = readAdminManifest();
    const appIds = getAllDiagnosisTrainings().map((training) => training.id).sort();
    const manifestIds = manifest.trainings.map((training) => training.id).sort();
    const duplicates = manifestIds.filter((id, index) => manifestIds.indexOf(id) !== index);

    expect(duplicates).toEqual([]);
    expect(manifestIds).toEqual(appIds);
  });

  it('exposes active QA PASS trainings to admin with current app paths', () => {
    const manifest = readAdminManifest();
    const activeIds = [...ACTIVE_PERSONAL_TRAINING_IDS].sort();

    expect([...manifest.activeIds].sort()).toEqual(activeIds);
    expect([...manifest.jesseReworkedIds].sort()).toEqual(activeIds);
    expect(manifest.jesseReworkedMarker).toBe(JESSE_REWORKED_MARKER);

    for (const id of activeIds) {
      const training = manifest.trainings.find((item) => item.id === id);

      expect(training).toBeTruthy();
      expect(training?.status).toBe('active');
      expect(training?.jesseStatus).toBe('reworked');
      expect(training?.needsJesseRework).toBe(false);
      expect(training?.jesseMarker).toBe(JESSE_REWORKED_MARKER);
      expect(training?.cefrLevel).toMatch(/^(A1|A2|A2\+|B1|B1\+)$/);
      expect(training?.placementRisk).toMatch(/^(low|medium|high)$/);
      expect(Array.isArray(training?.prerequisites)).toBe(true);
      expect(training?.appPath).toBe(`app/diagnosis_training_${id}.ts`);
      expect(training?.registryPath).toBe('app/diagnosis_trainings.ts');
    }
  });

  it('marks unreviewed registry trainings as legacy needing Jesse rework', () => {
    const manifest = readAdminManifest();
    const activeIds = new Set(ACTIVE_PERSONAL_TRAINING_IDS);
    const expectedLegacyIds = getAllDiagnosisTrainings()
      .map((training) => training.id)
      .filter((id) => !activeIds.has(id))
      .sort();

    expect([...manifest.legacyNeedsReworkIds].sort()).toEqual(expectedLegacyIds);

    for (const id of expectedLegacyIds) {
      const training = manifest.trainings.find((item) => item.id === id);

      expect(training).toBeTruthy();
      expect(training?.status).toBe('legacy_needs_rework');
      expect(training?.jesseStatus).toBe('legacy_needs_rework');
      expect(training?.needsJesseRework).toBe(true);
      expect(training?.jesseMarker).toBeNull();
    }
  });

  it('syncs planned source-language titles and short diagnoses for translated summary batches', () => {
    const manifest = readAdminManifest();
    const cyrillic = /[А-Яа-яЁёІіЇїЄєҐґ]/;

    for (const [id, sourceLocales] of Object.entries(PERSONAL_TRAINING_SUMMARY_SOURCE_LOCALES)) {
      const training = manifest.trainings.find((item) => item.id === id);
      expect(training).toBeTruthy();

      for (const locale of PLANNED_INTERFACE_SOURCE_LOCALES) {
        const expected = sourceLocales[locale];
        if (!expected) continue;

        expect(training?.title[locale]).toBe(expected.title);
        expect(training?.shortDiagnosis[locale]).toBe(expected.shortDiagnosis);
        expect(training?.title[locale]).not.toMatch(cyrillic);
        expect(training?.shortDiagnosis[locale]).not.toMatch(cyrillic);
      }
    }
  });
});
