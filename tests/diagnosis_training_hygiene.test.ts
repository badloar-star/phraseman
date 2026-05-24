import fs from 'fs';
import path from 'path';

import {
  DIAGNOSIS_TRAININGS,
  getAllDiagnosisTrainings,
} from '../app/diagnosis_trainings';
import { DIAGNOSIS_TRAINING_IDS } from '../app/personal_practice_training_ids';

const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'app');
const REGISTRY_PATH = path.join(APP_DIR, 'diagnosis_trainings.ts');
const INTERNAL_DIAGNOSIS_FILES = new Set(['copy', 'engine', 'progress', 'types']);

function getStandaloneTrainingIds(): string[] {
  return fs
    .readdirSync(APP_DIR)
    .map((file) => /^diagnosis_training_(.+)\.ts$/.exec(file)?.[1])
    .filter((id): id is string => Boolean(id && !INTERNAL_DIAGNOSIS_FILES.has(id)))
    .sort();
}

describe('diagnosis training replacement hygiene', () => {
  it('does not keep stale same-id app file variants', () => {
    const stalePattern = /^diagnosis_training_.*_(?:new|v\d+|draft|backup|old|tmp|candidate)\.ts$/i;
    const staleFiles = fs
      .readdirSync(APP_DIR)
      .filter((file) => stalePattern.test(file));

    expect(staleFiles).toEqual([]);
  });

  it('returns every personal training id exactly once', () => {
    const ids = getAllDiagnosisTrainings().map((training) => training.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);

    expect(duplicateIds).toEqual([]);
    expect(Object.keys(DIAGNOSIS_TRAININGS)).toEqual([]);
  });

  it('keeps each standalone training connected to the registry and admin source', () => {
    const registry = fs.readFileSync(REGISTRY_PATH, 'utf8');
    const returnedIds = new Set<string>(getAllDiagnosisTrainings().map((training) => training.id));

    for (const id of getStandaloneTrainingIds()) {
      expect(registry).toContain(`./diagnosis_training_${id}`);
      expect(registry).toContain(`if (id === '${id}')`);
      expect(returnedIds.has(id)).toBe(true);
    }
  });

  it('keeps the lightweight personal-practice id contract aligned with the registry', () => {
    expect([...DIAGNOSIS_TRAINING_IDS].sort()).toEqual(
      getAllDiagnosisTrainings().map((training) => training.id).sort(),
    );
  });
});
