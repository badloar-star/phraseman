// зачем (координатор 12.10, Optimistic UI R1): у пейвола онбординга старт магазина и синхронизация личности ждались без потолка — кнопка могла крутиться вечно.
// Тест: зависший init → через потолок исход timeout (кнопка свободна); быстрый → ok; отказ → error (прежнее поведение). Плюс сторожа исходника и двух мелких закрытий.
import fs from 'node:fs';
import path from 'node:path';

import { awaitWithinInitCap } from '../app/paywall_init_cap';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('awaitWithinInitCap', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('a hanging init gives up at the ceiling and reports timeout (the button is freed by the caller)', async () => {
    const hanging = new Promise<void>(() => {});
    const pending = awaitWithinInitCap('initRevenueCat', hanging, 12_000, 'onboarding:onboarding');
    let settled = false;
    void pending.then(() => { settled = true; });
    await jest.advanceTimersByTimeAsync(11_999);
    expect(settled).toBe(false);
    await jest.advanceTimersByTimeAsync(2);
    const outcome = await pending;
    expect(outcome.status).toBe('timeout');
    expect(outcome.ms).toBeGreaterThanOrEqual(12_000);
  });

  it('a fast init returns ok with its value, a failing init returns error (caller rethrows as before)', async () => {
    const ok = await awaitWithinInitCap('syncRevenueCatIdentity', Promise.resolve(true), 12_000, 'ctx');
    expect(ok.status).toBe('ok');
    if (ok.status === 'ok') expect(ok.value).toBe(true);
    const boom = new Error('store down');
    const failed = await awaitWithinInitCap('initRevenueCat', Promise.reject(boom), 12_000, 'ctx');
    expect(failed.status).toBe('error');
    if (failed.status === 'error') expect(failed.error).toBe(boom);
  });

  it('a late rejection after the ceiling does not become an unhandled rejection', async () => {
    let rejectLater: (e: Error) => void = () => {};
    const late = new Promise<void>((_, reject) => { rejectLater = reject; });
    const pending = awaitWithinInitCap('initRevenueCat', late, 1_000, 'ctx');
    await jest.advanceTimersByTimeAsync(1_001);
    expect((await pending).status).toBe('timeout');
    rejectLater(new Error('late'));
    await jest.advanceTimersByTimeAsync(10);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('late_error step=initRevenueCat'));
  });
});

describe('onboarding paywall: waiting before payment is capped; payment itself untouched', () => {
  const src = read('app/paywall_purchase.ts');

  it('both non-resilient steps go through the cap and free the button with a nine-language message', () => {
    expect(src).toContain("import { awaitWithinInitCap } from './paywall_init_cap';");
    expect(src).toMatch(/awaitWithinInitCap\('initRevenueCat', initRevenueCat\(isOperationAccountCurrent\), LOAD_GATE_TOTAL_MS/);
    expect(src).toMatch(/awaitWithinInitCap\('syncRevenueCatIdentity', syncRevenueCatIdentity\(isOperationAccountCurrent\), LOAD_GATE_TOTAL_MS/);
    expect(src).toMatch(/if \(capped\.status === 'timeout'\) \{ stopBeforePayment\('initRevenueCat', capped\.ms\); return; \}/);
    expect(src).toMatch(/if \(capped\.status === 'error'\) throw capped\.error;/);
    const at = src.indexOf('const stopBeforePayment =');
    const block = src.slice(at, at + 1700);
    for (const text of ['Магазин не отвечает. Попробуй ещё раз.', 'Магазин не відповідає', 'The store isn’t responding', 'La tienda no responde', 'A loja não está respondendo', 'Cửa hàng không phản hồi', 'Toko tidak merespons', 'Mağaza yanıt vermiyor', 'Sklep nie odpowiada']) expect(block).toContain(text);
    expect(block).toContain('setTapNotice(true)'); // существующая строка «Попробуй через минуту» под кнопкой онбординга
    // оплата и её порядок не тронуты: покупка по-прежнему только после обоих шагов
    expect(src.indexOf("awaitWithinInitCap('syncRevenueCatIdentity'")).toBeLessThan(src.indexOf('Purchases.purchasePackage(pkg)'));
  });
});

describe('small closures: study language mark and the Continue skeleton', () => {
  it('the language strip marks the chosen language in the tap frame and rolls back on a failed write', () => {
    const src = read('components/settings/StudyLanguagePicker.tsx');
    expect(src).toContain('const shownTarget = pendingTarget ?? activeTarget;');
    expect(src).toContain('const active = code === shownTarget;');
    expect(src).toMatch(/onSwitchFailed\?\.\(code\);[\s\S]{0,200}switchFailedToastCopy/);
    expect(src).toContain('strip_rollback failed=');
  });

  it('the Continue card on the skeleton is pressable (scale 0.98) but never navigates and still logs press:ignored', () => {
    const src = read('components/home/v2/HomeV2ContinueCard.tsx');
    expect(src).not.toMatch(/disabled=\{pending\}/);
    expect(src).toContain("press:ignored', JSON.stringify({ reason: 'pending_skeleton' })");
    expect(src).toContain('onPress={pending ? () =>');
    expect(src).toContain('scaleTo={0.98}');
  });
});
