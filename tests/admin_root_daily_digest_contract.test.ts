import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

describe('live admin daily digest contract', () => {
  const root = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'admin', 'v2', 'legacy.html'), 'utf8');
  const source = fs.readFileSync(path.join(root, 'admin', 'v2', 'daily-digest.js'), 'utf8');

  test('keeps the live digest workflow wired to the published renderer', () => {
    expect(html).toContain('id="dd-period"');
    expect(html).toContain('id="dd-comparisons"');
    expect(html).toContain('id="dd-product-manager"');
    expect(html).toContain('id="dd-source-coverage"');
    expect(html).toContain('<script src="daily-digest.js"></script>');
    expect(html).toContain('window.AdminDailyDigestV2.renderSummarySections');
  });

  test('parses exact headings and escapes narrative HTML', () => {
    const styles = new Set<string>();
    const context: Record<string, unknown> = {
      document: {
        head: { appendChild: (node: { id?: string }) => node.id && styles.add(node.id) },
        createElement: () => ({ id: '', textContent: '' }),
        getElementById: (id: string) => styles.has(id) ? {} : null,
      },
    };
    context.window = context;
    vm.createContext(context);
    vm.runInContext(source, context, { filename: 'admin/v2/daily-digest.js' });
    const api = (context as any).AdminDailyDigestV2;
    const sections = JSON.parse(JSON.stringify(api.parseSummarySections(
      'Вступление\nРОСТ И ДЕНЬГИ\nВыручка выросла.\nРИСКИ И ОЧЕРЕДИ: Есть риск.',
    )));
    expect(sections).toEqual([
      { key: 'neutral', title: 'Главное', body: 'Вступление' },
      { key: 'growth', title: 'Рост и деньги', body: 'Выручка выросла.' },
      { key: 'risk', title: 'Риски и очереди', body: 'Есть риск.' },
    ]);
    expect(JSON.parse(JSON.stringify(api.parseSummarySections('РИСКИРОВАТЬ НЕЛЬЗЯ')))).toEqual([
      { key: 'neutral', title: 'Главное', body: 'РИСКИРОВАТЬ НЕЛЬЗЯ' },
    ]);
    const rendered = api.renderSummarySections('ЧТО СДЕЛАТЬ: <img src=x onerror=alert(1)>');
    expect(rendered).toContain('digest-summary--action');
    expect(rendered).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(rendered).not.toContain('<img');
  });
});
