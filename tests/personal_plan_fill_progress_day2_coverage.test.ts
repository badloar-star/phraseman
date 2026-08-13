import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress day 2 coverage', () => {
  it('tracks Day 2 coverage for every plan', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.productionReady).toBe(false);
    for (const planId of ['voyazh', 'mitap', 'gavan', 'impuls', 'echo']) {
      const plan = data.plans.find((row: { id: string }) => row.id === planId);
      expect(plan.filledDays).toBeGreaterThanOrEqual(2);
    }

    // зачем: тест фиксировал ПРОМЕЖУТОЧНЫЙ этап — Day 2 в статусе 'chat draft'
    // «до начала массовой генерации». Этап давно пройден: все пять Day 2 уже
    // 'certified', и тест падал на успешно сделанной работе. Проверяем то, что
    // остаётся верным и дальше: Day 2 покрыт у всех пяти планов и не откатился
    // назад в черновик.
    const day2Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 2'));
    expect(day2Rows).toHaveLength(5);
    for (const planName of ['Voyazh', 'Mitap', 'Gavan', 'Impuls', 'Echo']) {
      const row = day2Rows.find((r: { label: string }) => r.label === `${planName} Day 2`);
      expect(row).toBeDefined();
      expect(['chat draft', 'certified']).toContain(row.status);
    }
  });
});
