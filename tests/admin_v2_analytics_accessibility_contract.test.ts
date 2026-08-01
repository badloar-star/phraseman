import fs from 'fs';
import path from 'path';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 analytics accessibility boundary', () => {
  test('scopes a 44px touch-target floor to the analytics-only page', () => {
    const index = read('admin/v2/index.html');
    const css = read('admin/v2/styles/admin.css');

    expect(index).toContain('<body class="analytics-only">');
    expect(css).toContain('.analytics-only :is(button, select, input, .button, .primary-nav a)');
    expect(css).toContain('min-height: 44px;');
  });
});
