import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan recommended content review checklist', () => {
  it('documents human review as recommended guidance, not a blocker or production approval gate', () => {
    const checklist = fs.readFileSync(
      path.join(ROOT, 'docs', 'personal-plans-human-content-review-checklist.md'),
      'utf8',
    ).toLowerCase();

    expect(checklist).toContain('recommended checklist');
    expect(checklist).toContain('non-blocking');
    expect(checklist).toContain('not the current gate');
    expect(checklist).toContain('not production approval');
    expect(checklist).toContain('phrases sound alive');
    expect(checklist).toContain('different progression role');
    expect(checklist).toContain('lessons are not plan tasks');
    expect(checklist).toContain('selected daily time chooses the initial visible workload');
    expect(checklist).toContain('full maximum task pool');
    expect(checklist).toContain('add more tasks');
    expect(checklist).toContain('return blockers instead of fake readiness');
    expect(checklist).not.toContain('status: blocked');
    expect(checklist).not.toContain('must block generation');
  });
});
