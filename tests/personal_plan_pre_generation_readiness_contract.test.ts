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

  it('shows the browser report as source-import preparation instead of claiming content is live', () => {
    const report = fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-progress-browser-report.html'),
      'utf8',
    ).toLowerCase();

    expect(report).toContain('generation status');
    expect(report).toContain('28-day chat-draft cycle exists');
    expect(report).toContain('finish before source import');
    expect(report).toContain('selected daily time chooses the initial visible workload');
    expect(report).toContain('add-more task behavior');
    expect(report).toContain('mode contract');
    expect(report).toContain('review rubric');
    expect(report).toContain('bulk generation review queue');
    expect(report).toContain('140 chat-draft candidate days');
    expect(report).toContain('internal quality gate');
    expect(report).toContain('140 accepted');
    expect(report).toContain('0 rework');
    expect(report).not.toContain('human content review, but it is still non-live');
    expect(report).not.toContain('day 2-28 content packets are not fully generated yet');
  });
});
