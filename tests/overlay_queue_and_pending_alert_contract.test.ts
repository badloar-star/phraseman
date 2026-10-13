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
    // зачем: вызов получил второй аргумент ({ premiumAudienceAccess }) — ищем по началу вызова, порядок «сперва ворота свежей установки, потом чтение» прежний; -1 (вызова нет) тест не пропустит
    const fetchAt = check.indexOf('fetchPendingGlobalBroadcastModal(studyTarget');
    expect(fetchAt).toBeGreaterThan(-1);
    expect(check.indexOf('verdict.fresh')).toBeLessThan(fetchAt);
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

// зачем (владелец 13.10: «такого не должно быть ни при каких обстоятельствах, покупка сразу, никаких родителей или банков»):
// ожидание оплаты — короткий тост, пейвол закрывается, кнопка не висит; доступ до подтверждения магазином не выдаётся.
describe('purchase pending: no blocking window about parents or bank', () => {
  const src = read('app/paywall_purchase.ts').replace(/\r\n/g, '\n');
  const fn = src.slice(src.indexOf('export function showPurchasePendingAlert('), src.indexOf('export function purchasePendingToast()'));

  it('the pending notice is a toast, not a blocking alert, and never mentions parents or a bank', () => {
    expect(fn).toContain("emitAppEvent('action_toast', purchasePendingToast());");
    expect(fn).not.toContain('enqueueThemedBlockingInfoAlert');
    // строки (не комментарии): ни в одном тексте нет родителей/банка
    expect(src).not.toMatch(/['"`][^'"`\n]*(родител|батьк|parent|banco|bank)[^'"`\n]*['"`]/i);
    expect(src).toContain("ru: 'Оплата обрабатывается — Plus включится сам'");
  });

  it('both real pending branches log [PURCHASE] pending and close the paywall; access is not granted there', () => {
    expect(src).toContain("closePaywallAfterPendingPurchase('no_entitlement');");
    expect(src).toContain("closePaywallAfterPendingPurchase('pending_error');");
    expect(src).toContain('[PURCHASE] pending reason=no_entitlement');
    expect(src).toContain('[PURCHASE] pending reason=pending_error');
    const branch = src.slice(src.indexOf('[PURCHASE] pending reason=no_entitlement'), src.indexOf("closePaywallAfterPendingPurchase('no_entitlement');"));
    expect(branch).not.toContain('persistStorePremiumLocally');
  });

  it('dev state «pending» does not spin the purchase button', () => {
    const dev = read('app/dev_paywall_state.ts').replace(/\r\n/g, '\n');
    const pendingCase = dev.slice(dev.indexOf("    case 'pending':"), dev.indexOf("    case 'unknown_outcome':"));
    expect(pendingCase).toContain('return { ...view, ...LIVE_PRICES, ...SETTLED };');
    expect(pendingCase).not.toContain('purchasing: true');
  });
});
