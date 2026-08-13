import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress live report', () => {
  it('stores fill progress in json so the browser report can update without editing html', () => {
    const dataPath = path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    expect(data.kind).toBe('personal_plans_fill_progress_data');
    expect(data.productionReady).toBe(false);
    expect(data.plans.map((plan: { id: string }) => plan.id).sort()).toEqual([
      'echo',
      'gavan',
      'impuls',
      'mitap',
      'voyazh',
    ]);
    expect(data.plans.find((plan: { id: string }) => plan.id === 'voyazh').totalDays).toBe(84);
    expect(data.plans.find((plan: { id: string }) => plan.id === 'mitap').totalDays).toBe(112);
    expect(data.plans.find((plan: { id: string }) => plan.id === 'gavan').totalDays).toBe(126);
    expect(data.plans.find((plan: { id: string }) => plan.id === 'impuls').totalDays).toBe(140);
    expect(data.plans.find((plan: { id: string }) => plan.id === 'echo').totalDays).toBe(84);
    expect(data.dayQuality).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Voyazh Day 1', status: 'certified', quality: 96 }),
      expect.objectContaining({ label: 'Mitap Day 1', status: 'certified', quality: 96 }),
      expect.objectContaining({ label: 'Gavan Day 1', status: 'certified', quality: 96 }),
      expect.objectContaining({ label: 'Impuls Day 1', status: 'certified', quality: 96 }),
      expect.objectContaining({ label: 'Echo Day 1', status: 'certified', quality: 96 }),
      expect.objectContaining({ label: 'Voyazh Day 2', status: 'certified', quality: 96 }),
      expect.objectContaining({ label: 'Mitap Day 2', status: 'certified', quality: 96 }),
      expect.objectContaining({ label: 'Gavan Day 2', status: 'certified', quality: 96 }),
      expect.objectContaining({ label: 'Impuls Day 2', status: 'certified', quality: 96 }),
      expect.objectContaining({ label: 'Echo Day 2', status: 'certified', quality: 96 }),
      expect.objectContaining({ label: 'Voyazh Day 3', status: 'certified', quality: 96 }),
      expect.objectContaining({ label: 'Mitap Day 3', status: 'certified', quality: 96 }),
      expect.objectContaining({ label: 'Gavan Day 3', status: 'certified', quality: 96 }),
      expect.objectContaining({ label: 'Impuls Day 3', status: 'certified', quality: 96 }),
      expect.objectContaining({ label: 'Echo Day 3', status: 'certified', quality: 96 }),
    ]));
  });

  it('loads json in the html report and refreshes it on an interval', () => {
    const html = fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-report.html'),
      'utf8',
    );

    expect(html).toContain('personal-plans-fill-progress-data.json');
    expect(html).toContain('setInterval(loadReportData');
    expect(html).toContain('data-plan-grid');
    expect(html).toContain('data-day-quality');
    expect(html).toContain('Live data');
    expect(html).toContain('not production-ready');
  });

  it('has a local report server for localhost live refresh', () => {
    const server = fs.readFileSync(
      path.join(ROOT, 'tools', 'serve_personal_plans_fill_progress_report.mjs'),
      'utf8',
    );

    expect(server).toContain('personal-plans-fill-progress-report.html');
    expect(server).toContain('personal-plans-fill-progress-data.json');
    expect(server).toContain('Cache-Control');
    expect(server).toContain('localhost');
  });
});
