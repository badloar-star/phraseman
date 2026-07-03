import fs from 'fs';
import path from 'path';

const root = process.cwd();

function readAppFile(fileName: string) {
  return fs.readFileSync(path.join(root, 'app', fileName), 'utf8');
}

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('paywall navigation and scroll smoothness contract', () => {
  it('renders the normal premium dispatcher path as real paywall content, not a blank redirect screen', () => {
    const source = readAppFile('premium_modal.tsx');

    expect(source).toContain("import PaywallA from './paywall_a';");
    expect(source).toContain("import PaywallB from './paywall_b';");
    expect(source).toContain("import PaywallC from './paywall_c';");
    expect(source).toContain('return renderPaywallRoute(paywallRouteRef.current);');
    expect(source).toContain('if (!isPersonalPlanContext && !isManageContext)');
  });

  it('keeps regular paywalls as native bottom modals', () => {
    const source = fs.readFileSync(path.join(root, 'components', 'paywall', 'paywallShared.tsx'), 'utf8');

    expect(source).toContain(
      "return { presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true } as const;",
    );
  });

  it('keeps the transient premium dispatcher on a paywall-colored backing for personal-plan checks', () => {
    const layout = readAppFile('_layout.tsx');

    expect(layout).toContain("<Stack.Screen name=\"premium_modal\"");
    expect(layout).toContain("presentation: 'transparentModal'");
    expect(layout).toContain("contentStyle: { backgroundColor: '#111827' }");
  });

  it('shows paywall content on the first modal frame without an inner JS entrance animation', () => {
    for (const fileName of ['paywall_a.tsx', 'paywall_b.tsx', 'paywall_c.tsx']) {
      const source = readAppFile(fileName);

      expect(source).toContain('<View style={S.wrap}>');
      expect(source).not.toContain('new Animated.Value');
      expect(source).not.toContain('translateY: slideY');
      expect(source).not.toContain('<Animated.View style={[S.wrap');
    }
  });

  it('dismisses paywalls through native modal dismissal when possible', () => {
    const purchase = readAppFile('paywall_purchase.ts');
    const nav = readAppFile('navigation_back.ts');

    expect(purchase).toContain('dismissPaywallModal(router)');
    expect(nav).toContain('export function dismissPaywallModal');
    expect(nav).toContain('router.dismiss(1)');
  });

  it('requires replace-opened paywalls to mark replace navigation first', () => {
    const allowedRedirects = new Set([
      path.join(root, 'app', 'premium_modal.tsx'),
      path.join(root, 'app', 'premium_modal_v2.tsx'),
    ]);
    const files = [
      ...listSourceFiles(path.join(root, 'app')),
      ...listSourceFiles(path.join(root, 'components')),
    ];
    const offenders: string[] = [];

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const lines = source.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        const after = lines.slice(i, Math.min(lines.length, i + 8)).join('\n');
        const before = lines.slice(Math.max(0, i - 8), i).join('\n');
        const isReplaceCall = /\b(?:router|globalRouter)\.replace\s*\(/.test(line);
        const isOpenPremiumReplace =
          /openPremiumPaywall\s*\(/.test(line) && /['"]replace['"]/.test(after);
        const isPaywallTarget =
          after.includes("pathname: '/premium_modal'")
          || after.includes('pathname: "/premium_modal"')
          || after.includes("pathname: '/paywall_a'")
          || after.includes("pathname: '/paywall_b'")
          || after.includes("pathname: '/paywall_c'")
          || after.includes("router.replace('/premium_modal")
          || after.includes('router.replace("/premium_modal')
          || (after.includes('pathname: route') && before.includes("'/paywall_a'") && before.includes("'/paywall_b'"));

        if (!isOpenPremiumReplace && !(isReplaceCall && isPaywallTarget)) continue;
        if (allowedRedirects.has(file)) continue;
        if (!before.includes('markNextNavigationAsReplace()')) {
          offenders.push(`${path.relative(root, file)}:${i + 1}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('defers paywall C scroll-depth analytics until after interactions', () => {
    const source = readAppFile('paywall_c.tsx');
    const onScrollStart = source.indexOf('onScroll={(e) => {');
    const onScrollEnd = source.indexOf('scrollEventThrottle={32}', onScrollStart);
    const onScrollBlock = source.slice(onScrollStart, onScrollEnd);

    expect(source).toContain('InteractionManager.runAfterInteractions');
    expect(source).toContain('pendingScrollDepthRef');
    expect(source).toContain('scrollDepthFlushRef.current?.cancel();');
    expect(onScrollStart).toBeGreaterThanOrEqual(0);
    expect(onScrollEnd).toBeGreaterThan(onScrollStart);
    expect(onScrollBlock).not.toContain("trackEvent('paywall_scroll_depth'");
  });
});
