import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('Gustav final pre-approval evidence hash-lock contract', () => {
  const source = fs.readFileSync(
    path.join(ROOT, 'scripts', 'gustav_final_preapproval_evidence_hash_lock_v2_packet.ts'),
    'utf8',
  );

  it('accepts a production-locked P49 completion matrix when every requirement is proved or locked', () => {
    expect(source).toContain("input.p49State === 'closed_mode_evidence_complete_production_locked'");
    expect(source).toContain('input.p49RequirementsProved + input.p49RequirementsProductionLocked >= 16');
    expect(source).toContain('input.p49RequirementsMissing === 0');
    expect(source).toContain('input.p49RequirementsContradicted === 0');
    expect(source).not.toContain('input.p49RequirementsProductionLocked === 5');
  });
});
