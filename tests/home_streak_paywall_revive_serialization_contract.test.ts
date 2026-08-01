import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(process.cwd(), 'app', '(tabs)', 'home.tsx'), 'utf8');

describe('Home streak paywall and revive serialization', () => {
  it('defers the native revive prompt when the same load pass opens the streak paywall', () => {
    const flagDeclaration = source.indexOf('let streakPaywallOpenedThisLoad = false;');
    const paywallPush = source.indexOf("router.push({ pathname: '/premium_modal', params: { context: 'streak', streak: String(streakBefore) }");
    const flagSet = source.indexOf('streakPaywallOpenedThisLoad = true;', paywallPush);
    const deferral = source.indexOf('if (streakPaywallOpenedThisLoad) {', flagSet);
    const preserveIntent = source.indexOf('reviveOfferDirtyRef.current = true;', deferral);
    const immediatePresentation = source.indexOf('setReviveModalVisible(true);', preserveIntent);

    expect(flagDeclaration).toBeGreaterThanOrEqual(0);
    expect(paywallPush).toBeGreaterThan(flagDeclaration);
    expect(flagSet).toBeGreaterThan(paywallPush);
    expect(deferral).toBeGreaterThan(flagSet);
    expect(preserveIntent).toBeGreaterThan(deferral);
    expect(immediatePresentation).toBeGreaterThan(preserveIntent);
  });
});
