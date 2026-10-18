/**
 * §139 (04.10): два быстрых тапа на пейволе Plus → один вызов. Замок обязан быть ref и ставиться
 * СИНХРОННО до первого await: state обновится только после кадра, и второй тап его не увидит.
 */
const fs = require('fs');
const path = require('path');

const src: string = fs.readFileSync(path.join(__dirname, '..', 'app', 'paywall_purchase.ts'), 'utf8');

function bodyOf(name: string): string {
  const start = src.indexOf(`const ${name} = useCallback(`);
  expect(start).toBeGreaterThan(-1);
  const next = src.indexOf('}, [', start);
  return src.slice(start, next);
}

test.each([
  ['handlePurchase', "operationRef.current = 'purchase';"],
  ['handleRestore', "operationRef.current = 'restore';"],
])('%s: ref lock is checked first and taken before any await', (name, take) => {
  const body = bodyOf(name);
  const check = body.indexOf('if (operationRef.current) {'); // зачем (ревью 12.10 (г)): повторный тап пишет причину, поэтому блок, а не голый return
  const set = body.indexOf(take);
  const firstAwait = body.indexOf('await ');
  expect(check).toBeGreaterThan(-1);
  expect(set).toBeGreaterThan(check);
  expect(firstAwait === -1 || set < firstAwait).toBe(true);
  expect(body).not.toMatch(/\bawait\b[\s\S]*?operationRef\.current = '(purchase|restore)'/);
});

test('both operations release the lock in finally', () => {
  expect(src.match(/finally \{\s*operationRef\.current = null;/g)?.length).toBe(2);
});

test('doClose ignores a repeated tap within the close lock window', () => {
  const body = bodyOf('doClose');
  const guard = body.indexOf('if (nowMs < closeLockUntilRef.current)');
  const take = body.indexOf('closeLockUntilRef.current = nowMs + PAYWALL_CLOSE_LOCK_MS;');
  const event = body.indexOf("void trackEvent('paywall_close'");
  expect(guard).toBeGreaterThan(-1);
  expect(take).toBeGreaterThan(guard);
  expect(event).toBeGreaterThan(take);
});

test('closing a dialog-limit paywall keeps its underlying dialog', () => {
  const body = bodyOf('doClose');
  expect(body).toContain('dismissPaywallModal(router,');
  expect(body).not.toMatch(/context === 'dialog_limit'[\s\S]*?router\.replace\('\/\(tabs\)\/home'/);
});

test('Android Back closes through the same guarded paywall path', () => {
  const screen = fs.readFileSync(path.join(__dirname, '..', 'components', 'paywall', 'PaywallPlusScreen.tsx'), 'utf8');
  expect(screen).toMatch(/hardwareBackPress'[\s\S]*?handleClose\('close', 'back'\)/);
});

// зачем (D187, 14.10): оффер на выходе удалён — смысл «закрытие не глотает ошибок молча» держим на нынешнем закрытии.
test('close path is direct and logged, never silently swallowed (D187)', () => {
  expect(src).not.toContain('} catch { /* при сбое чтения');
  expect(src).not.toMatch(/exitOffer|ExitTrialOffer|EXIT_TRIAL_OFFER|shouldShowExitTrialOffer/);
  const body = src.slice(src.indexOf('const handleClose = useCallback('), src.indexOf('const handleClose = useCallback(') + 600);
  expect(body.indexOf('[PAYWALL-CLOSE] via=')).toBeGreaterThan(-1);
  expect(body.indexOf('[PAYWALL-CLOSE] via=')).toBeLessThan(body.indexOf('doClose(reason)'));
});
