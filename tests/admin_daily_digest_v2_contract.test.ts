import fs from 'fs';
import path from 'path';
import vm from 'vm';

describe('legacy admin daily digest contract', () => {
  const root = path.resolve(__dirname, '..');
  const admin = fs.readFileSync(path.join(root, 'admin', 'legacy.html'), 'utf8');
  const digestV2 = fs.readFileSync(path.join(root, 'admin', 'v2', 'daily-digest.js'), 'utf8');

  it('shows an exact since-last-open interval and readable comparison surface', () => {
    expect(admin).toContain('id="dd-period"');
    expect(admin).toContain('id="dd-comparisons"');
    expect(admin).toContain('id="dd-product-manager"');
    expect(admin).toContain('id="dd-source-coverage"');
  });

  it('registers a real digest opening through an admin callable', () => {
    expect(admin).toContain("httpsCallable(functionsUs, 'adminOpenDailyDigest')");
    expect(admin).toContain('registerDailyDigestOpen');
  });

  it('keeps one clear primary action and explains the interval', () => {
    expect(admin).toContain('С момента прошлого открытия');
    expect(admin.match(/id="dd-generate"/g)).toHaveLength(1);
  });

  it('renders escaped digest sections with restrained semantic color accents', () => {
    expect(admin).toContain('<script src="v2/daily-digest.js"></script>');
    expect(admin).toContain('window.AdminDailyDigestV2.renderSummarySections');
    expect(digestV2).toContain('class="dd-summary-sections"');
    expect(digestV2).toContain('function parseSummarySections(summary)');
    expect(digestV2).toContain("digest-summary--growth");
    expect(digestV2).toContain("digest-summary--quality");
    expect(digestV2).toContain("digest-summary--risk");
    expect(digestV2).toContain("digest-summary--action");
    expect(digestV2).toContain("digest-summary--blind");
    expect(digestV2).toContain("digest-summary--neutral");
    expect(digestV2).toContain('esc(section.title)');
    expect(digestV2).toContain('esc(section.body)');
    expect(digestV2).toContain("key: 'neutral'");
    expect(admin).not.toContain('function digestParseSummarySections(summary)');
    expect(admin).not.toContain('Owner digest: restrained semantic grouping');
  });

  it('preserves content while parsing real headings and escaping markup', () => {
    const sandbox: Record<string, unknown> = {
      window: {},
      document: { head: { appendChild: () => undefined }, createElement: () => ({ textContent: '' }) },
    };

    vm.runInNewContext(digestV2, sandbox);
    const api = (sandbox.window as { AdminDailyDigestV2: {
      parseSummarySections: (value: string) => unknown;
      renderSummarySections: (value: string) => string;
    } }).AdminDailyDigestV2;
    const structured = api.parseSummarySections('Вступление\nРОСТ И ДЕНЬГИ\nВыручка выросла.\nРИСКИ И ОЧЕРЕДИ: Есть риск.');
    const fallback = api.parseSummarySections('Обычная сводка без заголовков.');
    const prefixWord = api.parseSummarySections('РИСКИРОВАТЬ НЕЛЬЗЯ');
    const escaped = api.renderSummarySections('ЧТО СДЕЛАТЬ: <img src=x onerror=alert(1)>');

    expect(JSON.parse(JSON.stringify(structured))).toEqual([
      { key: 'neutral', title: 'Главное', body: 'Вступление' },
      { key: 'growth', title: 'Рост и деньги', body: 'Выручка выросла.' },
      { key: 'risk', title: 'Риски и очереди', body: 'Есть риск.' },
    ]);
    expect(JSON.parse(JSON.stringify(fallback))).toEqual([
      { key: 'neutral', title: 'Главное', body: 'Обычная сводка без заголовков.' },
    ]);
    expect(JSON.parse(JSON.stringify(prefixWord))).toEqual([
      { key: 'neutral', title: 'Главное', body: 'РИСКИРОВАТЬ НЕЛЬЗЯ' },
    ]);
    expect(escaped).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(escaped).not.toContain('<img');
  });
});
