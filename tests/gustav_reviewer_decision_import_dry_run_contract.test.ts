import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('Gustav reviewer decision import dry-run contract', () => {
  it('defaults to promoted official-source decisions before falling back to blank templates', () => {
    const source = fs.readFileSync(
      path.join(ROOT, 'scripts', 'gustav_reviewer_decision_import_v2_dry_run_packet.ts'),
      'utf8',
    );

    expect(source).toContain('const defaultRowDecisionCandidatePath = fs.existsSync(promotedOfficialSourceRowDecisionPath)');
    expect(source).toContain('? promotedOfficialSourceRowDecisionPath');
    expect(source).toContain(': defaultRowDecisionPath');
    expect(source).toContain('const defaultAiDecisionCandidatePath = fs.existsSync(promotedOfficialSourceAiDecisionPath)');
    expect(source).toContain('? promotedOfficialSourceAiDecisionPath');
    expect(source).toContain(': defaultAiDecisionPath');
    expect(source).toContain('const rowDecisionPath = rowDecisionArg ? path.resolve(repoRoot, rowDecisionArg) : defaultRowDecisionCandidatePath');
    expect(source).toContain('const aiDecisionPath = aiDecisionArg ? path.resolve(repoRoot, aiDecisionArg) : defaultAiDecisionCandidatePath');
  });
});
