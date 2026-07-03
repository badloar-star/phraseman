import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const ATLAS_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'admin_parity', 'admin_website_parity_atlas.json');
const PLAN_PATH = path.join(ROOT, 'docs', 'gustav', 'GUSTAV_ADMIN_WEBSITE_PARITY_PLAN.md');
const OPERATOR_PATH = path.join(ROOT, 'docs', 'gustav', 'OPERATOR.md');

describe('Gustav admin website parity atlas', () => {
  it('keeps admin/index.html parity as a French production blocker until mapped', () => {
    const atlas = JSON.parse(fs.readFileSync(ATLAS_PATH, 'utf8'));
    const plan = fs.readFileSync(PLAN_PATH, 'utf8');
    const operator = fs.readFileSync(OPERATOR_PATH, 'utf8');

    expect(atlas.schemaVersion).toBe('gustav-admin-website-parity-atlas-v1');
    expect(atlas.status).toBe('HOLD');
    expect(atlas.activationApproved).toBe(false);
    expect(atlas.adminIndex).toBe('admin/index.html');

    expect(atlas.summary.learningRelevantSectionCount).toBeGreaterThan(0);
    expect(atlas.summary.learningRelevantButtonCount).toBeGreaterThan(0);
    expect(atlas.nextRequiredPackets).toEqual(
      expect.arrayContaining([
        'admin_english_learning_surface_matrix',
        'admin_french_target_equivalence_matrix',
        'admin_write_path_isolation_gate',
        'admin_activation_rollback_french_gate',
        'admin_ui_bible_compliance_check',
      ]),
    );

    expect(plan).toContain('French remains `HOLD` until all rows are mapped');
    expect(operator).toContain('scripts/gustav_admin_website_parity_atlas.mjs');
  });
});
