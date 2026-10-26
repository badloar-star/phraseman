// зачем (владелец 26.10, два срочных бага пейвола): (1) dev-красный «unknown_paywall_source:settings_plus» — до отказа в журнале не было ни строки о параметрах входа;
// (2) «Условия» / «Конфиденциальность» наезжали на плашки «Восстановить» и «Ввести промокод»: flex:1 лежал на внутреннем слое V2Pressable (база высоты 0).
import fs from 'fs';
import path from 'path';

import { PAYWALL_SOURCE_VALUES, resolvePremiumModalEntry } from '../app/paywall_entry_contract';

const dockSource = fs.readFileSync(path.join(__dirname, '..', 'components', 'paywall', 'PaywallPlus.tsx'), 'utf8').replace(/\r\n/g, '\n');

function resolve(params: Record<string, string>) {
  return resolvePremiumModalEntry({ params, accessResolved: true, hasPremiumAccess: false, impressionId: 'imp-test', cachedEntitlement: 'free' });
}

describe('вход в пейвол: неизвестный source оставляет следы в журнале', () => {
  it('settings_plus — не законный source: отказ остаётся, а параметры входа записаны ДО отказа', () => {
    expect(PAYWALL_SOURCE_VALUES as readonly string[]).not.toContain('settings_plus');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(() => resolve({ context: 'generic', source: 'settings_plus' })).toThrow('unknown_paywall_source:settings_plus');
      const lines = warn.mock.calls.map((c) => String(c[0]));
      const line = lines.find((l) => l.startsWith('[PAYWALL-ENTRY] неизвестный вход'));
      expect(line).toBeDefined();
      expect(line).toContain('source=settings_plus (НЕТ в списке)');
      expect(line).toContain('context=generic (известен)');
      expect(line).toContain('"source":"settings_plus"');
    } finally {
      warn.mockRestore();
    }
  });

  it('настоящий вход из Настроек (settings_premium) показывается без предупреждений', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const result = resolve({ context: 'generic', source: 'settings_premium' });
      expect(result.decision).toBe('show');
      expect(warn.mock.calls.map((c) => String(c[0])).filter((l) => l.includes('[PAYWALL-ENTRY]'))).toEqual([]);
    } finally {
      warn.mockRestore();
    }
  });
});

describe('низ окна Plus: плашки и ссылки не перекрываются', () => {
  it('плашки «Восстановить» и «Ввести промокод» держат flex на внешнем слое (outerStyle), а не на внутреннем', () => {
    const inner = dockSource.match(/secondaryAction: \{([^}]*)\}/);
    const outer = dockSource.match(/secondaryOuter: \{([^}]*)\}/);
    expect(inner).not.toBeNull();
    expect(outer).not.toBeNull();
    expect(inner![1]).not.toMatch(/\bflex:\s*1\b/);
    expect(inner![1]).toMatch(/flexGrow:\s*1/);
    expect(outer![1]).toMatch(/\bflex:\s*1\b/);
    expect(outer![1]).toMatch(/minWidth:\s*0/);
    expect(dockSource.match(/outerStyle=\{S\.secondaryOuter\}/g)?.length).toBe(2);
  });

  it('ссылки «Условия» и «Конфиденциальность» — отдельная строка ниже плашек, с собственным отступом и высотой', () => {
    const plates = dockSource.indexOf('style={S.secondaryActions}');
    const links = dockSource.indexOf('style={S.links}');
    expect(plates).toBeGreaterThan(0);
    expect(links).toBeGreaterThan(plates);
    expect(dockSource).toMatch(/links: \{[^}]*flexWrap: 'wrap'[^}]*marginTop: 14[^}]*\}/);
    expect(dockSource).toMatch(/linkHit: \{[^}]*minHeight: 44/);
  });
});
