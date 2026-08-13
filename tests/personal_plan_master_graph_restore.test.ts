import { readFileSync } from 'fs';
import path from 'path';

describe('Personal Plans master fill and day-quality graph', () => {
  const graphPath = path.join(
    process.cwd(),
    'docs',
    'reports',
    'personal-plans-master-graph.html',
  );

  it('shows per-plan fill progress and embedded day quality without file fetch', () => {
    const html = readFileSync(graphPath, 'utf8');

    expect(html).toContain('<title>Phraseman Personal Plans Progress</title>');
    expect(html).toContain('Plan Fill Progress');
    expect(html).toContain('Day Quality Scores');
    expect(html).toContain('Voyazh');
    expect(html).toContain('28/84 days');
    expect(html).toContain('33%');
    expect(html).toContain('Mitap');
    expect(html).toContain('28/112 days');
    expect(html).toContain('25%');
    expect(html).toContain('Gavan');
    expect(html).toContain('28/126 days');
    expect(html).toContain('22%');
    expect(html).toContain('Impuls');
    expect(html).toContain('28/140 days');
    expect(html).toContain('20%');
    expect(html).toContain('Echo');
    expect(html).toContain('Voyazh Day 1');
    expect(html).toContain('Echo Day 28');
    expect(html).toContain('data-quality-count="140"');
    expect(html).not.toContain('fetch(');
    expect(html).not.toContain('personal-plans-fill-progress-data.json');
  });
});
