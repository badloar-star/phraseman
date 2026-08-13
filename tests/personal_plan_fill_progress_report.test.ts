import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress browser report', () => {
  it('shows every plan length, fill progress, and draft day quality without claiming production readiness', () => {
    const report = fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-report.html'),
      'utf8',
    ).toLowerCase();

    expect(report).toContain('personal plans fill progress');
    expect(report).toContain('voyazh');
    expect(report).toContain('mitap');
    expect(report).toContain('gavan');
    expect(report).toContain('impuls');
    expect(report).toContain('echo');
    expect(report).toContain('84 days');
    expect(report).toContain('112 days');
    expect(report).toContain('126 days');
    expect(report).toContain('140 days');
    expect(report).toContain('chat draft');
    expect(report).toContain('not production-ready');
    expect(report).toContain('day quality');
    expect(report).toContain('mitap day 1');
    expect(report).toContain('mitap day 2');
    expect(report).toContain('voyazh day 1');
    expect(report).toContain('voyazh day 2');
    expect(report).toContain('impuls day 1');
    expect(report).toContain('echo day 1');
    expect(report).toContain('gavan day 1');
    expect(report).not.toContain('100% production-ready');
  });
});
