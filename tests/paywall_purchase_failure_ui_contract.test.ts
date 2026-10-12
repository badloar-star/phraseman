// зачем (координатор 12.10, решения по R1_PAYWALL_UX и независимое ревью Opus к 11a59a0c5; это деньги, поэтому каждая развилка держится тестом):
// 1) сбой покупки: мягкий тост — ТОЛЬКО до запроса окна оплаты магазина; после — диалог «статус не подтверждён» при ЛЮБОЙ категории и в ЛЮБОМ источнике (онбординг тоже);
// 2) stale вокруг purchasePackage: вызывался — диалог, не вызывался — тихая подсказка; доступ не записан после покупки — диалог, а не тихий возврат;
// 3) сбой пост-шагов после применённого доступа — только лог (не ложный диалог после УСПЕШНОЙ покупки);
// 4) восстановление: текст «Аккаунт сменился» — только при реальной смене;
// 5) набор без цены / платный без обработчика не открывается и не добавляется бесплатно.
// Хук без рендерера не запустить, поэтому решения — чистые функции с таблицей входов, а пути хука проверяются по ИХ тексту блоками (не индексами строк).
import fs from 'node:fs';
import path from 'node:path';

import {
  PURCHASE_FAILURE_PHASE_LABEL,
  purchaseFailurePhase,
  purchaseFailureUi,
  purchaseStaleUi,
  restoreStaleUi,
} from '../app/paywall_purchase_failure';
import { packPurchaseGate } from '../app/community_packs/packPurchaseGate';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

/** Кусок исходника между двумя маркерами (оба обязаны существовать — иначе тест падает понятно). */
function between(src: string, from: string, to: string): string {
  const a = src.indexOf(from);
  expect(a).toBeGreaterThan(-1);
  const b = src.indexOf(to, a + from.length);
  expect(b).toBeGreaterThan(a);
  return src.slice(a, b);
}

describe('п.1 и ревью п.3: решение по сбою покупки (чистая функция, таблица входов)', () => {
  const sources = [false, true] as const; // онбординг: нет / да

  it('до запроса окна магазина: мягкий тост; в онбординге — прежнее инфо-окно (вид онбординга не меняется)', () => {
    expect(purchaseFailureUi(purchaseFailurePhase(false), false)).toBe('soft_store_toast');
    expect(purchaseFailureUi(purchaseFailurePhase(false), true)).toBe('onboarding_alert');
    expect(purchaseFailureUi(purchaseFailurePhase(false))).toBe('soft_store_toast'); // значение по умолчанию — не онбординг
  });

  it('после запроса окна магазина: диалог «статус не подтверждён» в КАЖДОМ источнике, включая онбординг', () => {
    for (const onboarding of sources) {
      expect(purchaseFailureUi(purchaseFailurePhase(true), onboarding)).toBe('unverified_dialog');
    }
  });

  it('подписи фазы для журнала названы словами', () => {
    expect(PURCHASE_FAILURE_PHASE_LABEL.before_store_sheet).toBe('до открытия окна магазина');
    expect(PURCHASE_FAILURE_PHASE_LABEL.after_store_sheet).toBe('после открытия окна магазина');
  });
});

describe('ревью п.1: stale вокруг purchasePackage', () => {
  it('вызов магазина был — диалог; не было — тихая подсказка', () => {
    expect(purchaseStaleUi(true)).toBe('unverified_dialog');
    expect(purchaseStaleUi(false)).toBe('quiet_retry');
  });

  const src = read('app/paywall_purchase.ts');
  const body = between(src, 'const handlePurchase = useCallback', 'const finishAfterTrialReminderPrompt');

  it('флаг purchaseInvoked ставится ВНУТРИ обёртки, прямо перед purchasePackage', () => {
    const wrapper = between(body, "withPurchaseFlow('paywall_purchase', () => {", "if (purchaseResult.status !== 'ok') {");
    expect(wrapper.indexOf('purchaseInvoked = true;')).toBeGreaterThan(-1);
    expect(wrapper.indexOf('purchaseInvoked = true;')).toBeLessThan(wrapper.indexOf('return Purchases.purchasePackage(pkg);'));
    expect(body.match(/purchaseInvoked = true;/g)?.length).toBe(1);
  });

  it('stale-ветка решает через purchaseStaleUi: диалог при вызове магазина, иначе тихая подсказка; без немого return', () => {
    const stale = between(body, "if (purchaseResult.status !== 'ok') {", 'let { customerInfo }');
    expect(stale).toContain('purchaseStaleUi(purchaseInvoked)');
    expect(stale).toContain("presentUnverifiedDialog('stale после вызова purchasePackage')");
    expect(stale).toContain('setTapNotice(true)');
    expect(stale).toContain('DebugLogger.warn');
  });
});

describe('ревью п.2: доступ подтверждён магазином, но не записан', () => {
  const body = between(read('app/paywall_purchase.ts'), 'const handlePurchase = useCallback', 'const finishAfterTrialReminderPrompt');

  it('вместо тихого return — лог и диалог «статус не подтверждён»', () => {
    const block = between(body, "if (applied.status !== 'ok' || !applied.value) {", 'accessApplied = true;');
    expect(block).toContain('purchase:not_applied');
    expect(block).toContain("presentUnverifiedDialog('доступ подтверждён магазином, но не записан локально')");
    expect(block).toContain('return;');
  });
});

describe('ревью п.3: онбординг после запроса окна магазина — диалог, а не «Попробуй ещё раз»', () => {
  const body = between(read('app/paywall_purchase.ts'), 'const handlePurchase = useCallback', 'const finishAfterTrialReminderPrompt');
  const catchBlock = between(body, '} catch (err: unknown) {', '} finally {');

  it('ветки идут: доступ применён (лог) → отмена → ожидание → инфо-окно онбординга (только ДО окна) → тост → диалог', () => {
    const iApplied = catchBlock.indexOf('if (accessApplied) {');
    const iCancel = catchBlock.indexOf('purchase_cancelled');
    const iPending = catchBlock.indexOf('showPurchasePendingAlert');
    const iOnboarding = catchBlock.indexOf("if (failureUi === 'onboarding_alert') {");
    const iToast = catchBlock.indexOf("else if (failureUi === 'soft_store_toast') {");
    const iDialog = catchBlock.indexOf('presentUnverifiedDialog(`сбой после запроса окна магазина');
    for (const i of [iApplied, iCancel, iPending, iOnboarding, iToast, iDialog]) expect(i).toBeGreaterThan(-1);
    expect(iApplied).toBeLessThan(iCancel);
    expect(iCancel).toBeLessThan(iPending);
    expect(iPending).toBeLessThan(iOnboarding);
    expect(iOnboarding).toBeLessThan(iToast);
    expect(iToast).toBeLessThan(iDialog);
  });

  it('решение берётся из чистой функции с признаком онбординга; сырой проверки источника в ветке нет', () => {
    expect(catchBlock).toContain('purchaseFailureUi(failurePhase, ONBOARDING_PURCHASE_SOURCES.has(source))');
    expect(catchBlock).not.toContain('if (ONBOARDING_PURCHASE_SOURCES.has(source)) {');
  });

  it('флаг «окно магазина запрошено» ставится после старта магазина и личности и до purchasePackage', () => {
    const flagDecl = body.indexOf('let storeSheetRequested = false;');
    const setTrue = body.indexOf('storeSheetRequested = true;');
    expect(body.indexOf('storeSheetRequested = true;', setTrue + 1)).toBe(-1);
    expect(flagDecl).toBeGreaterThan(-1);
    expect(setTrue).toBeGreaterThan(body.indexOf('identityReady'));
    expect(setTrue).toBeGreaterThan(body.indexOf('setPayStarted(true);'));
    expect(setTrue).toBeLessThan(body.indexOf('Purchases.purchasePackage(pkg)'));
  });

  it('одна строка purchase:fail с категорией, фазой и кодом', () => {
    expect(catchBlock).toContain('`purchase:fail category=${purchaseErrorCategory(err)} phase=${PURCHASE_FAILURE_PHASE_LABEL[failurePhase]} code=${errCode || \'-\'} `');
  });
});

describe('ревью п.6: сбой пост-шагов после применённого доступа — только лог', () => {
  const body = between(read('app/paywall_purchase.ts'), 'const handlePurchase = useCallback', 'const finishAfterTrialReminderPrompt');

  it('accessApplied ставится ровно один раз — после успешного применения; в catch он возвращает без диалога', () => {
    expect(body.match(/accessApplied = true;/g)?.length).toBe(1);
    expect(body.indexOf('accessApplied = true;')).toBeGreaterThan(body.indexOf("if (applied.status !== 'ok' || !applied.value) {"));
    expect(body.indexOf('accessApplied = true;')).toBeLessThan(body.indexOf('getNotificationPermissionStatus()'));
    const guard = between(body, 'if (accessApplied) {', 'const errCode');
    expect(guard).toContain('purchase:post_access_step_failed');
    expect(guard).toContain('return;');
    expect(guard).not.toContain('showUnverifiedPurchaseAlert');
    expect(guard).not.toContain('presentUnverifiedDialog');
  });
});

describe('ревью п.4: восстановление — «Аккаунт сменился» только при реальной смене', () => {
  it('аккаунт тот же — «попробуй ещё раз»; сменился — «аккаунт сменился»', () => {
    expect(restoreStaleUi(true)).toBe('retry_toast');
    expect(restoreStaleUi(false)).toBe('account_changed_toast');
  });

  const src = read('app/paywall_purchase.ts');
  const restore = between(src, 'const handleRestore = useCallback', 'entitlementSyncRef.current = handleRestore;');

  it('оба stale-места (ответ магазина и запись доступа) выбирают текст по isOperationAccountCurrent()', () => {
    const stale = between(restore, "if (restoreResult.status !== 'ok') {", 'const info = restoreResult.value;');
    expect(stale).toContain('restoreStaleUi(isOperationAccountCurrent())');
    expect(stale).toContain('restoreRetryToast()');
    expect(stale).toContain('restoreAccountChangedToast()');
    const notApplied = between(restore, "if (applied.status !== 'ok' || !applied.value) {", 'emitAppEvent(\'action_toast\', paywallRestoreToast(mode === \'check\' ? \'purchase_confirmed\'');
    expect(notApplied).toContain('restoreStaleUi(isOperationAccountCurrent())');
    expect(notApplied).toContain('restore:not_applied');
  });

  it('DEV_IAP_BYPASS и повторный вход пишут причину выхода', () => {
    expect(restore).toContain('restore: выход без действия dev_bypass=${String(DEV_IAP_BYPASS)}');
  });
});

describe('ревью п.7: немые выходы больше не молчат', () => {
  const src = read('app/paywall_purchase.ts');
  it('пустого catch в покупке нет; dev-обход, скрытый lifetime и личность пишут причину', () => {
    expect(src).not.toMatch(/catch \{\s*\n\s*return false;/);
    expect(src).toContain("DebugLogger.error('[PAYWALL] finishOnboardingPaywallFlow:persist'");
    expect(src).toContain('покупка: lifetime скрыт (retired=');
    expect(src).toContain('тап: магазин не зовём dev_bypass=${String(DEV_IAP_BYPASS)}');
    expect(src).toContain('покупка: личность не синхронизирована (identityReady=false)');
  });
  it('слушатель customerInfo пишет ошибки и в релизе, а необработанный reject снят', () => {
    const init = read('app/revenuecat_init.ts');
    expect(init).toContain("DebugLogger.error('[RC-LISTENER] addCustomerInfoUpdateListener failed'");
    expect(init).not.toContain("if (__DEV__) console.warn('[RevenueCat] addCustomerInfoUpdateListener failed:'");
    expect(init).toContain("DebugLogger.error('[RC-LISTENER] событие customerInfo: сбой обработки'");
  });
});

describe('ревью п.5: набор без цены не открывает окно покупки и не добавляется бесплатно', () => {
  const ugc = { id: 'p1', isCommunityUgc: true } as const;

  it('нормальный платный набор проходит', () => {
    expect(packPurchaseGate({ ...ugc, priceRunes: 300 }, 300)).toEqual({ ok: true });
  });

  it('набор без цены — отказ pack_has_no_price (раньше кнопка «за 0»)', () => {
    expect(packPurchaseGate({ ...ugc }, 300)).toEqual({ ok: false, reason: 'pack_has_no_price' });
    expect(packPurchaseGate({ ...ugc, priceRunes: 0 }, 300)).toEqual({ ok: false, reason: 'pack_has_no_price' });
  });

  it('неверная переданная цена и разошедшиеся цены — отказ', () => {
    expect(packPurchaseGate({ ...ugc, priceRunes: 300 }, 0)).toEqual({ ok: false, reason: 'invalid_price' });
    expect(packPurchaseGate({ ...ugc, priceRunes: 300 }, Number.NaN)).toEqual({ ok: false, reason: 'invalid_price' });
    expect(packPurchaseGate({ ...ugc, priceRunes: 300 }, 200)).toEqual({ ok: false, reason: 'price_mismatch' });
  });

  it('набор без id и не-сообщественный набор — отказ', () => {
    expect(packPurchaseGate({ id: '', isCommunityUgc: true, priceRunes: 300 }, 300)).toEqual({ ok: false, reason: 'no_pack_id' });
    expect(packPurchaseGate({ id: 'p2', isCommunityUgc: false, priceRunes: 300 }, 300)).toEqual({ ok: false, reason: 'pack_has_no_price' });
  });

  it('хозяин: все три места вызова идут через requestPackPurchase; отказ — журнал И тост', () => {
    const host = read('app/flashcards_collection.tsx');
    expect(host.match(/onRequestPurchase=\{requestPackPurchase\}/g)?.length).toBe(3);
    const gateBlock = between(host, 'const requestPackPurchase = useCallback', '}, []);');
    expect(gateBlock).toContain('[PACK-BUY] gate:refused');
    expect(gateBlock).toContain("emitAppEvent('action_toast', packBuyFailedToast())");
  });

  it('соцбар: цена > 0 без обработчика покупки — отказ с логом и тостом, до бесплатного добавления', () => {
    const bar = read('app/community_packs/CommunityPackSocialBar.tsx');
    const refused = bar.indexOf('[PACK-BUY] add:paid_refused');
    expect(refused).toBeGreaterThan(-1);
    expect(refused).toBeGreaterThan(bar.indexOf('onRequestPurchase(pack, price);'));
    expect(refused).toBeLessThan(bar.indexOf('addInFlightRef.current = true;'));
    expect(bar.slice(refused, bar.indexOf('addInFlightRef.current = true;'))).toContain('return;');
  });
});

describe('п.2 исходной задачи: двойной тап по покупке набора гасится ref-ом', () => {
  it('остался', () => {
    expect(read('app/flashcards_collection.tsx')).toContain('if (purchasingRef.current || !purchasePack) return;');
  });
});
