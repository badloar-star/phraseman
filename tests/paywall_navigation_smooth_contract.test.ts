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
  it('renders every paywall dispatcher path as real paywall content, not a blank redirect screen', () => {
    const source = readAppFile('premium_modal.tsx');
    const navigation = readAppFile('paywall_navigation.ts');

    // 2026-09-30 (D78): пейволы A–G удалены — диспетчер рисует единственный пейвол Plus.
    expect(source).toContain("import PaywallPlusScreen from '../components/paywall/PaywallPlusScreen';");
    // зачем (14.10, Profiler [PAYWALL-CLOSE-JS]): экран собирается в `screen` и отдаётся сразу; под флагом TAP-LAT — внутри Profiler.
    // зачем (разбор красных 15.10): 6e1b16df6 (R58 #12, денежный путь) держит показанный пейвол до шага «Напомнить о конце
    // пробного?» после собственной покупки — экран берёт entryToShow. Это то же решение «show», а вне защёлки самозакрытия — ничего.
    expect(source).toMatch(/const entryToShow = entryResolution\?\.decision === 'show'\s*\n\s*\? entryResolution\.entry\s*\n\s*: \(keepShownForSelfClose \? shownEntryRef\.current : null\);/);
    expect(source).toContain('const screen = <PaywallPlusScreen entry={entryToShow} />;');
    expect(source).toMatch(/return paywallScreenProfilerOnRender\s*\?\s*<Profiler id="screen:premium_modal" onRender=\{paywallScreenProfilerOnRender\}>\{screen\}<\/Profiler>\s*:\s*screen;/);
    expect(source).not.toMatch(/paywall_[a-g]'/);
    expect(navigation).toContain("pathname: '/premium_modal'");
    expect(navigation).not.toContain('pathname: resolveCurrentPaywallRoute()');
    // Только manage=1 остаётся на подложке, потому что ведёт на
    // /manage_subscription, а не на пейвол.
    expect(source).toContain('if (!isManageContext)');
  });

  it('does not re-navigate to a paywall it already rendered (no unmount/remount flash)', () => {
    const source = readAppFile('premium_modal.tsx');
    expect(source).toContain('if (!isManageContext) return;');
    expect(source).toMatch(/if \(!isManageContext\)[\s\S]*const screen = <PaywallPlusScreen entry=\{entryToShow\} \/>;[\s\S]*: screen;/);
  });

  it('keeps regular paywalls dismissible but opens them without route delay', () => {
    const source = fs.readFileSync(path.join(root, 'components', 'paywall', 'paywallShared.tsx'), 'utf8');

    expect(source).toContain(
      "return { presentation: 'transparentModal', animation: 'none', animationDuration: 0, gestureEnabled: false, contentStyle: { backgroundColor: 'transparent' } } as const;",
    );
  });

  it('keeps the transient premium dispatcher transparent over the previous screen', () => {
    const layout = readAppFile('_layout.tsx');

    expect(layout).toContain("<Stack.Screen name=\"premium_modal\"");
    // зачем (владелец 11.10, «Шторка»): окно Plus — прозрачный модал поверх прежнего экрана (PAYWALL_SHEET_STACK_OPTIONS).
    expect(layout).toContain('<Stack.Screen name="premium_modal" options={PAYWALL_SHEET_STACK_OPTIONS} />');
  });

  it('shows paywall content on the first modal frame without an inner JS entrance animation', () => {
    const source = fs.readFileSync(path.join(root, 'components', 'paywall', 'PaywallPlusScreen.tsx'), 'utf8');
    expect(source).not.toContain('new Animated.Value');
    expect(source).not.toContain('<Animated.View');
  });

  // зачем (координатор 14.10, свайп вниз закрывает шторку): перетаскивание вынесено в PaywallSwipeSheet. Это не входная анимация —
  // сдвиг стартует с 0, первый кадр шторки финальный; закрытие идёт тем же путём, что крестик.
  it('lets the paywall sheet be swiped down without an entrance animation', () => {
    const screen = fs.readFileSync(path.join(root, 'components', 'paywall', 'PaywallPlusScreen.tsx'), 'utf8');
    const sheet = fs.readFileSync(path.join(root, 'components', 'paywall', 'PaywallSwipeSheet.tsx'), 'utf8');
    expect(screen).toContain('<PaywallSwipeSheet');
    // D187: закрытие одно и прямое; источник закрытия подписан для журнала [PAYWALL-CLOSE].
    expect(screen).toContain("p.handleClose('close', 'swipe')");
    expect(sheet).toContain('useSharedValue(0)');
    expect(sheet).not.toMatch(/entering=|FadeIn|SlideIn/);
    expect(sheet).toContain('.enabled(enabled)');
  });

  it('dismisses paywalls through native modal dismissal when possible', () => {
    const purchase = readAppFile('paywall_purchase.ts');
    const nav = readAppFile('navigation_back.ts');

    expect(purchase).toContain('dismissPaywallModal(router,');
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
          || after.includes("router.replace('/premium_modal")
          || after.includes('router.replace("/premium_modal')
          ;

        if (!isOpenPremiumReplace && !(isReplaceCall && isPaywallTarget)) continue;
        if (allowedRedirects.has(file)) continue;
        if (!before.includes('markNextNavigationAsReplace()')) {
          offenders.push(`${path.relative(root, file)}:${i + 1}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
