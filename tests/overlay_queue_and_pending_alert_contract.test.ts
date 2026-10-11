// зачем (координатор 12.10): новичок не должен видеть окно-рассылку сразу после онбординга; окно «Покупка ждёт подтверждения» — один показ на покупку;
// у обоих есть журнал ([OVERLAY-QUEUE], [PURCHASE-PENDING]).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('overlay queue: the broadcast waits for a fresh install', () => {
  const layout = read('app/_layout.tsx');

  it('the broadcast is not even read while the install is fresh, and a payload read before the end of onboarding is dropped afterwards', () => {
    const check = layout.slice(layout.indexOf('const checkGlobalBroadcastFn = useCallback'), layout.indexOf('}, [globalBroadcastModal, studyTarget]);'));
    expect(check).toContain('const verdict = await readFreshInstallVerdict();');
    expect(check.indexOf('verdict.fresh')).toBeLessThan(check.indexOf('fetchPendingGlobalBroadcastModal(studyTarget)'));
    expect(layout).toMatch(/if \(!globalBroadcastModal \|\| effectiveShowOnboarding \|\| !ready\) return undefined;/);
    expect(layout).toContain('снята после онбординга — свежая установка');
    expect(layout).toMatch(/setGlobalBroadcastModal\(null\);/);
  });

  it('[OVERLAY-QUEUE] shows who asks for a window, who holds the slot and the order', () => {
    expect(layout).toContain("import { OverlayArbiterProvider, useOverlayActiveKey, useOverlayVisible } from '../components/OverlayArbiter';");
    const at = layout.indexOf('const overlayHolder = useOverlayActiveKey();');
    expect(at).toBeGreaterThan(-1);
    const block = layout.slice(at, at + 1800);
    for (const token of ['holder: overlayHolder', 'asking', 'waiting', 'broadcast: globalBroadcastModal?.id', 'appMessageModal:', 'personalAdminMessage:', 'if (!__DEV__) return;']) expect(block).toContain(token);
    expect(layout).toContain('update > authRecovery > releaseNotes > broadcast > appMessageModal > personalAdminMessage');
  });
});

describe('purchase pending alert: one show per purchase', () => {
  const src = read('app/paywall_purchase.ts');

  it('repeats of the same key inside the window are skipped with a reason; every call site passes a key', () => {
    expect(src).toContain('const PENDING_ALERT_REPEAT_MS = 30 * 60 * 1000;');
    expect(src).toMatch(/export function showPurchasePendingAlert\(lang: Lang, key: string = 'purchase'\): void \{/);
    expect(src).toContain('[PURCHASE-PENDING] skip key=');
    expect(src).toContain('[PURCHASE-PENDING] show key=');
    const calls = src.match(/showPurchasePendingAlert\(lang, [^)]*\)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls.join(' ')).toContain('product:${pkg.product.identifier}');
    expect(calls.join(' ')).toContain('product:${pkgOrNull?.product.identifier ?? \'unknown\'}');
    expect(src).toContain('showPurchasePendingAlert(lang, `dev:${Date.now()}`)'); // dev-превью показывает окно каждый раз
    expect(src).not.toMatch(/showPurchasePendingAlert\(lang\);/);
  });
});
