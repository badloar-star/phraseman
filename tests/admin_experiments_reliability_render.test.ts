import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Admin experiment and reliability rendering', () => {
  it('mounts inside existing analytics and explains causal and source limits', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    const page = read('admin/v2/scripts/pages/product-analytics.js');
    expect(core).toContain('id="product-analytics-experiments"');
    expect(core).toContain('id="product-analytics-reliability"');
    expect(page).toContain('renderExperimentsAndReliability');
    expect(page).toContain('не доказывает эффект');
    expect(page).toContain('Автоматический победитель отключён');
    expect(page).toContain('Отсутствие записанных ошибок не означает 100% стабильность');
  });
});
