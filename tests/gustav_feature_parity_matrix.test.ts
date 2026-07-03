import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const MATRIX_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'feature_parity', 'english_feature_atlas_french_gap_matrix.json');
const OPERATOR_PATH = path.join(ROOT, 'docs', 'gustav', 'OPERATOR.md');

describe('Gustav English Feature Atlas + French Gap Matrix', () => {
  it('keeps French production readiness blocked until every English feature surface is mapped', () => {
    const matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8'));
    const operator = fs.readFileSync(OPERATOR_PATH, 'utf8');

    expect(matrix.schemaVersion).toBe('gustav-english-feature-atlas-french-gap-matrix-v1');
    expect(matrix.status).toBe('HOLD');
    expect(matrix.activationApproved).toBe(false);
    expect(matrix.summary.featureCount).toBeGreaterThanOrEqual(20);
    expect(matrix.summary.blockCount).toBeGreaterThan(0);

    const featureIds = new Set(matrix.features.map((feature: any) => feature.featureId));
    for (const required of [
      'core_lessons_32',
      'quizzes',
      'flashcards',
      'personal_practice',
      'arena',
      'audio_tts',
      'server_course_packs',
      'storage_cloud_isolation',
      'admin_website',
      'research_best_practices',
    ]) {
      expect(featureIds.has(required)).toBe(true);
    }

    expect(matrix.features.some((feature: any) => feature.blockers.length > 0)).toBe(true);
    expect(operator).toContain('scripts/gustav_feature_parity_matrix.mjs');
    expect(operator).toContain('Do not promote a surface that is `BLOCK` or');
  });
});
