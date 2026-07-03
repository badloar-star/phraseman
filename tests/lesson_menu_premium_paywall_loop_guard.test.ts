import fs from 'fs';
import path from 'path';

const root = process.cwd();

function readLessonMenu() {
  return fs.readFileSync(path.join(root, 'app', 'lesson_menu.tsx'), 'utf8');
}

describe('lesson menu premium paywall loop guard', () => {
  it('marks the auto premium redirect as replace before opening the paywall dispatcher', () => {
    const source = readLessonMenu();
    const dispatchGuard = source.indexOf('premiumPaywallDispatchedRef.current = true;');
    const markReplace = source.indexOf('markNextNavigationAsReplace();', dispatchGuard);
    const replaceCall = source.indexOf('router.replace({', dispatchGuard);
    const premiumModal = source.indexOf("pathname: '/premium_modal'", dispatchGuard);

    expect(dispatchGuard).toBeGreaterThanOrEqual(0);
    expect(markReplace).toBeGreaterThan(dispatchGuard);
    expect(replaceCall).toBeGreaterThan(markReplace);
    expect(premiumModal).toBeGreaterThan(replaceCall);
  });
});
