// зачем (координатор 25.10, срочно для OTA; Ядро c161d894a): вход «Не видим твой Plus» (plus_server_refused) — окно Plus с «Восстановить покупки»
// первой кнопкой, «Оформить Plus» второй и «Не сейчас». Остальные входы — прежний низ окна. Цвета — токены темы по карте Тем.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('окно Plus «Не видим твой Plus»', () => {
  const screen = read('components/paywall/PaywallPlusScreen.tsx');
  const dock = read('components/paywall/PaywallServerRefusedDock.tsx');
  const copy = read('components/paywall/paywall_server_refused_copy.ts');

  it('экран включает вариант только для plus_server_refused и отдаёт низ окна переключателю', () => {
    expect(screen).toContain('const serverRefused = ctx === SERVER_REFUSED_CONTEXT;');
    expect(screen).toContain('<PaywallPlusDockSwitch serverRefused={serverRefused} onLater={() => p.handleClose(\'close\', \'x\')}');
    expect(screen).not.toContain('<PaywallPlusDock ');
  });

  it('переключатель: без варианта — прежний PaywallPlusDock целиком', () => {
    expect(dock).toContain('if (!serverRefused) return <PaywallPlusDock {...dock} />;');
  });

  it('порядок кнопок: восстановить → оформить → не сейчас; состояния восстановления', () => {
    const restore = dock.indexOf('testID="paywall-server-refused-restore"');
    const purchase = dock.indexOf('testID="paywall-server-refused-purchase"');
    const later = dock.indexOf('testID="paywall-server-refused-later"');
    expect(restore).toBeGreaterThan(0);
    expect(purchase).toBeGreaterThan(restore);
    expect(later).toBeGreaterThan(purchase);
    expect(dock).toContain("onAppEvent('premium_activated'");
    expect(dock).toContain("'idle' | 'busy' | 'restored' | 'not_found'");
    expect(dock).toContain('testID="paywall-server-refused-status"');
  });

  it('цвета — токены темы по карте Тем (P12 / P3 / P15 / P2), без литералов и прозрачности вместо токена', () => {
    expect(dock).toContain('backgroundColor: g.ctaFill');
    expect(dock).toContain('color: g.ctaFillInk');
    expect(dock).toContain('backgroundColor: paywallPlateBg(g)');
    expect(dock).toContain('color: g.secondary');
    expect(dock).not.toMatch(/#[0-9A-Fa-f]{6}\b/);
    expect(dock).not.toMatch(/borderWidth|borderColor/);
  });

  it('тексты на всех 9 языках у каждой строки', () => {
    const rows = copy.match(/^\s{2}\w+: \[.*\],$/gm) ?? [];
    expect(rows.length).toBe(6);
    for (const row of rows) expect((row.match(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g) ?? []).length).toBe(9);
  });
});
