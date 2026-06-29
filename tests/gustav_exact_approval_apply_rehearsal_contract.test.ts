import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('Gustav exact approval apply rehearsal contract', () => {
  const source = fs.readFileSync(
    path.join(ROOT, 'scripts', 'gustav_exact_approval_apply_rehearsal_v2_packet.ts'),
    'utf8',
  );

  it('allows a single approval-lock master blocker while rehearsal stays no-apply', () => {
    expect(source).toContain('input.masterBlockers > 1');
    expect(source).toContain('Master must have no non-approval blockers');
    expect(source).toContain('input.masterReadyForApply');
    expect(source).toContain('input.masterMayModifyProductionAppFiles');
    expect(source).toContain('FORBIDDEN_PRODUCTION_FLAG_OPEN');
  });
});
