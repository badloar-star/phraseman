import fs from 'node:fs';
import path from 'node:path';

import { PREMIUM_CONTEXT_VALUES } from '../app/premium_context';
import { DEV_PAYWALL_CONTEXTS } from '../components/dev/paywallDevContexts';

const ROOT = path.resolve(__dirname, '..');

describe('DEV Hub paywall context matrix', () => {
  test('exposes every canonical premium context exactly once', () => {
    expect(DEV_PAYWALL_CONTEXTS.map((item) => item.context)).toEqual([...PREMIUM_CONTEXT_VALUES]);
    expect(new Set(DEV_PAYWALL_CONTEXTS.map((item) => item.context)).size).toBe(PREMIUM_CONTEXT_VALUES.length);
  });

  // 2026-09-30 (D78): превью A–G и «вариант с онбординга» удалены — одна кнопка
  // открывает единственный пейвол Plus через тот же диспетчер, что у игроков.
  test('routes the single Plus paywall preview with the selected context and DEV attribution', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components', 'dev', 'DevHubSheet.tsx'), 'utf8');
    expect(source).toContain('selectedPaywallContext');
    expect(source).toContain("source: 'dev_hub'");
    expect(source).toContain('params: { context, source }');
    expect(source).toContain("case 'open-paywall-plus':");
    expect(source).toContain("openPaywallVariant('/premium_modal', selectedPaywallContext);");
    expect(source).not.toMatch(/open-paywall-[a-g]'/);
    expect(source).not.toContain('resolveCurrentPaywallRoute');
  });

  test('picker: русские подписи, radio, 44px, без обводки и без emoji; раздел свёрнут', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components', 'dev', 'DevHubSheet.tsx'), 'utf8');
    const registry = fs.readFileSync(path.join(ROOT, 'components', 'dev', 'devToolRegistry.ts'), 'utf8');
    expect(source).toContain('accessibilityRole="radio"');
    expect(source).toContain('accessibilityState={{ selected: active }}');
    expect(source).toMatch(/paywallContextChip: \{ minHeight: 44,[^}]*\}/);
    expect(source).not.toMatch(/paywallContextChip: \{[^}]*borderWidth/);
    expect(source).toContain('color: active ? t.correctText : t.textPrimary');
    for (const item of DEV_PAYWALL_CONTEXTS) {
      expect(/\p{Extended_Pictographic}/u.test(item.label)).toBe(false);
      expect(/[А-Яа-яЁё]/.test(item.label)).toBe(true);
    }
    const start = registry.indexOf("id: 'paywalls'");
    expect(registry.slice(start, start + 300)).toContain('collapsed: true');
  });
});
