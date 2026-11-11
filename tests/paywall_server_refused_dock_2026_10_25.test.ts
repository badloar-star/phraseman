// зачем (координатор 25.10, срочно для OTA; Ядро c161d894a): вход «Не видим твой Plus» (plus_server_refused) — окно Plus с «Восстановить покупки»
// первой кнопкой, «Оформить Plus» второй и «Не сейчас». Остальные входы — прежний низ окна. Цвета — токены темы по карте Тем.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('окно Plus «Не видим твой Plus»', () => {
  const screen = read('components/paywall/PaywallPlusScreen.tsx');
  const dock = read('components/paywall/PaywallPlus.tsx');
  const hook = read('components/paywall/use_paywall_restore_outcome.ts');
  const copy = read('components/paywall/paywall_server_refused_copy.ts');

  it('uses the shared paywall and shows restore status before the same purchase action', () => {
    expect(screen).toContain('const serverRefused = ctx === SERVER_REFUSED_CONTEXT;');
    expect(screen).toContain('serverRefused={serverRefused}');
    const restore = dock.indexOf('{serverRefused ? restoreAction : null}');
    expect(restore).toBeGreaterThan(-1);
    expect(dock.indexOf("'paywall-server-refused-purchase'")).toBeGreaterThan(restore);
    expect(dock).toContain('testID="paywall-server-refused-status"');
    expect(dock).toContain('backgroundColor: g.ctaFill');
    expect(hook).toContain("onAppEvent('premium_activated'");
  });

  it('тексты на всех 9 языках у каждой строки', () => {
    const rows = copy.match(/^\s{2}\w+: \[.*\],$/gm) ?? [];
    expect(rows.length).toBe(6);
    for (const row of rows) expect((row.match(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g) ?? []).length).toBe(9);
  });
});
