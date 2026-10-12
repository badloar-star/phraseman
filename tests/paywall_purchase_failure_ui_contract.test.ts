// зачем (координатор 12.10, решения по R1_PAYWALL_UX п.1–3; это деньги, поэтому обе ветки держит тест):
// 1) сбой покупки: мягкий тост — ТОЛЬКО до того, как окно оплаты магазина запрошено; после — тяжёлый диалог «статус не подтверждён» при ЛЮБОЙ категории;
// 2) набор без цены (или с разошедшимися ценами) не открывает окно покупки;
// 3) восстановление при смене аккаунта — не молча.
import fs from 'node:fs';
import path from 'node:path';

import {
  PURCHASE_FAILURE_PHASE_LABEL,
  purchaseFailurePhase,
  purchaseFailureUi,
} from '../app/paywall_purchase_failure';
import { packPurchaseGate } from '../app/community_packs/packPurchaseGate';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('п.1: тост до окна магазина, диалог после', () => {
  it('до запроса окна оплаты — мягкий тост', () => {
    expect(purchaseFailureUi(purchaseFailurePhase(false))).toBe('soft_store_toast');
  });

  it('после запроса окна оплаты — диалог «статус не подтверждён» (решение не зависит от категории ошибки)', () => {
    expect(purchaseFailureUi(purchaseFailurePhase(true))).toBe('unverified_dialog');
  });

  it('подписи фазы для журнала названы словами', () => {
    expect(PURCHASE_FAILURE_PHASE_LABEL.before_store_sheet).toBe('до открытия окна магазина');
    expect(PURCHASE_FAILURE_PHASE_LABEL.after_store_sheet).toBe('после открытия окна магазина');
  });

  const src = read('app/paywall_purchase.ts');

  it('флаг «окно магазина запрошено» ставится после всех шагов старта и до purchasePackage — любая неопределённость в сторону диалога', () => {
    const flagDecl = src.indexOf('let storeSheetRequested = false;');
    const tryStart = src.indexOf('try {', flagDecl);
    const setTrue = src.indexOf('storeSheetRequested = true;');
    const purchaseCall = src.indexOf('Purchases.purchasePackage(pkg)');
    expect(flagDecl).toBeGreaterThan(0);
    expect(tryStart).toBeGreaterThan(flagDecl);
    expect(src.indexOf('storeSheetRequested = true;', setTrue + 1)).toBe(-1); // ровно одно присваивание
    expect(setTrue).toBeGreaterThan(src.indexOf('identityReady', tryStart));
    expect(setTrue).toBeGreaterThan(src.indexOf('setPayStarted(true);'));
    expect(setTrue).toBeLessThan(purchaseCall);
  });

  it('catch пишет одну строку purchase:fail с категорией, фазой и кодом, а ветки идут: отмена → ожидание → онбординг → тост → диалог', () => {
    expect(src).toContain('`purchase:fail category=${purchaseErrorCategory(err)} phase=${PURCHASE_FAILURE_PHASE_LABEL[failurePhase]} code=${errCode || \'-\'} `');
    const cancel = src.indexOf('purchase_cancelled');
    const pending = src.indexOf('showPurchasePendingAlert(lang, `product:${pkgOrNull?.product.identifier ?? \'unknown\'}`)');
    const onboarding = src.indexOf('if (ONBOARDING_PURCHASE_SOURCES.has(source)) {', pending);
    const softToast = src.indexOf("else if (purchaseFailureUi(failurePhase) === 'soft_store_toast') {");
    const dialog = src.indexOf('void showUnverifiedPurchaseAlert(lang).then((choice) => {');
    expect(cancel).toBeGreaterThan(0);
    expect(pending).toBeGreaterThan(cancel);
    expect(onboarding).toBeGreaterThan(pending);
    expect(softToast).toBeGreaterThan(onboarding);
    expect(dialog).toBeGreaterThan(softToast);
    // в мягкой ветке — именно тост магазина и тихая подсказка под кнопкой, диалога нет
    const softBlock = src.slice(softToast, dialog);
    expect(softBlock).toContain("emitAppEvent('action_toast', storeUnreachableToast());");
    expect(softBlock).not.toContain('showUnverifiedPurchaseAlert');
  });

  it('результат покупки при смене аккаунта больше не отбрасывается молча', () => {
    expect(src).toContain('purchase:stale план=${selected} source=${source}');
  });
});

describe('п.2: набор без цены не открывает окно покупки', () => {
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

  it('все три места вызова идут через requestPackPurchase с логом причины', () => {
    const host = read('app/flashcards_collection.tsx');
    expect(host.match(/onRequestPurchase=\{requestPackPurchase\}/g)?.length).toBe(3);
    expect(host).not.toContain('onRequestPurchase={(p, price) => { setPurchasePack(p); setPurchasePrice(price); }}');
    expect(host).toContain('[PACK-BUY] gate:refused pack=${p.id} price=${price} packPriceRunes=${String(p.priceRunes ?? \'-\')} reason=${gate.reason}');
  });
});

describe('п.3: восстановление при смене аккаунта — не молча', () => {
  const src = read('app/paywall_purchase.ts');

  it('stale-ответ магазина: лог и тост «Аккаунт сменился — восстановление прервано»', () => {
    const block = src.slice(src.indexOf("if (restoreResult.status !== 'ok') {"), src.indexOf('const info = restoreResult.value;'));
    expect(block).toContain('restore:stale');
    expect(block).toContain("emitAppEvent('action_toast', restoreAccountChangedToast());");
    expect(src).toContain("ru: 'Аккаунт сменился — восстановление прервано',");
  });

  it('запись доступа не удалась: stale → тост смены аккаунта, ok+false → «не удалось восстановить»; обе ветки с логом', () => {
    expect(src).toContain('restore:not_applied mode=${mode}');
    expect(src).toContain("applied.status !== 'ok' ? restoreAccountChangedToast() : paywallRestoreToast(mode === 'check' ? 'status_check_failed' : 'restore_failed')");
  });

  it('DEV_IAP_BYPASS и повторный вход больше не выходят молча', () => {
    expect(src).toContain('restore: выход без действия dev_bypass=${String(DEV_IAP_BYPASS)} restoring=${String(restoring)} purchasing=${String(purchasing)} mode=${mode}');
  });
});
