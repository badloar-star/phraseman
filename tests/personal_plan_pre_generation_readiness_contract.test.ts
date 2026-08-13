import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan pre-generation readiness contract', () => {
  it('documents the concrete prerequisites that must be finished before generated chat drafts can move to source intake', () => {
    const readiness = fs.readFileSync(
      path.join(ROOT, 'docs', 'personal-plans-pre-generation-readiness.md'),
      'utf8',
    ).toLowerCase();

    expect(readiness).toContain('do not import generated day 2-28 chat drafts into runtime/source yet');
    expect(readiness).toContain('generation-readiness prerequisites');
    expect(readiness).toContain('mode contract');
    expect(readiness).toContain('review rubric');
    expect(readiness).toContain('prompt template');
    expect(readiness).toContain('output schema');
    expect(readiness).toContain('fixture gate');
    expect(readiness).toContain('browser report');
    expect(readiness).toContain('selected daily time selects only the initial visible workload');
    expect(readiness).toContain('full maximum task pool');
    expect(readiness).toContain('lessons are not plan tasks');
    expect(readiness).toContain('bulk generation review queue');
    expect(readiness).toContain('internal_quality_gate');
    expect(readiness).not.toContain('ready to import all days now');
  });

  it('shows the browser report as an honest current readiness snapshot', () => {
    const report = fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-progress-browser-report.html'),
      'utf8',
    ).toLowerCase();

    expect(report).toContain('production ready: false');
    expect(report).toContain('546 days, 0 material gaps');
    expect(report).toContain('140 bound days checked');
    expect(report).toContain('4,368 tasks checked');
    expect(report).toContain('48/48 runtime mp3 assets');
    expect(report).toContain('current blockers');
    expect(report).toContain('0/4 real scored attempts provided');
    expect(report).toContain('pending final user/human acceptance');
  });
});
