# Lifetime (одноразовая покупка «навсегда») — пошаговая инструкция

> Цель: добавить тариф **Lifetime** (€99) в Phraseman.
> Порядок ОБЯЗАТЕЛЕН: сначала сторы → потом RevenueCat → потом код.
> Если сделать код раньше, чем продукт появится в RevenueCat — кнопка будет нерабочей.

Дата: 2026-06-13. Цена-якорь: новые €8.99/мес, €49.99/год → **Lifetime €99** (промо €79 «до повышения»).

---

## ЧАСТЬ A — App Store Connect (iOS)

1. Зайди на https://appstoreconnect.apple.com → **My Apps** → Phraseman.
2. Слева **Monetization → In-App Purchases** → кнопка **(+)**.
3. Тип покупки: выбери **Non-Consumable** (НЕ подписку! Lifetime = разовая покупка, которая не тратится).
4. Заполни:
   - **Reference Name**: `Lifetime Premium` (видно только тебе).
   - **Product ID**: `phraseman_lifetime` ⚠️ ЗАПОМНИ ЕГО — он понадобится в RevenueCat и опционально в коде. Менять потом нельзя.
5. **Pricing**: выбери price tier, который в Ирландии даёт **€99** (Apple покажет авто-цены по всем странам от этого tier).
6. **App Store Localization**: добавь хотя бы английскую локаль:
   - Display Name: `Lifetime Access` (или «Доступ навсегда»).
   - Description: коротко — «One-time payment, full access forever».
7. **App Store Review** (внизу формы):
   - Скриншот пейвола с этой кнопкой (можно загрузить позже, перед сабмитом).
   - Review Notes — если нужно.
8. Статус станет **Ready to Submit**. Продукт привяжется к ближайшему релизу приложения (или ревьюится вместе с ним).
9. Для теста: создай **Sandbox tester** (Users and Access → Sandbox) — покупки в тестовом окружении бесплатны.

⚠️ Важно: пока приложение/продукт не одобрены, `getOfferings()` может НЕ вернуть lifetime в проде. В Sandbox/TestFlight — вернёт.

---

## ЧАСТЬ B — Google Play Console (Android)

1. https://play.google.com/console → выбери Phraseman.
2. Слева **Monetize → Products → In-app products** (НЕ «Subscriptions»! Lifetime — это in-app product, разовый).
3. **Create product**:
   - **Product ID**: `phraseman_lifetime` (лучше тот же, что в Apple — проще в RevenueCat). Менять нельзя.
   - **Name** + **Description**.
4. **Pricing**: задай цену так, чтобы в Ирландии вышло €99 (Play авто-пересчитает по странам, можно ручную правку отдельных стран).
5. **Activate** продукт (статус Active).
6. Для теста: добавь свой Google-аккаунт в **License testing** (Setup → License testing) — тестовые покупки бесплатны/возвратны.

⚠️ Google: in-app product становится доступен только после публикации сборки (хотя бы в Internal testing track) с актуальным `applicationId`.

---

## ЧАСТЬ C — RevenueCat Dashboard

> RevenueCat связывает продукты обоих сторов в один Entitlement и Offering.
> У Phraseman entitlement премиума называется `premium` (см. `app/premium_revenuecat_state.ts`: `entitlements.active.premium`).

### C1. Добавить продукты
1. https://app.revenuecat.com → выбери проект Phraseman.
2. **Product catalog → Products → (+) New**.
3. Добавь **два** продукта (iOS и Android отдельно):
   - Store: **App Store**, Identifier: `phraseman_lifetime`.
   - Store: **Play Store**, Identifier: `phraseman_lifetime`.
   - Type: **Non-subscription / one-time** (RevenueCat сам определит по стору; убедись, что НЕ subscription).

### C2. Привязать к Entitlement `premium`
1. **Entitlements** → открой существующий `premium` (тот, что уже выдают monthly/yearly).
2. **Attach** оба новых lifetime-продукта к этому entitlement.
   - Это ключевой шаг: тогда после покупки lifetime у юзера будет `entitlements.active.premium` — и весь существующий код «премиум активен» заработает БЕЗ изменений.

### C3. Добавить в Offering (чтобы пейвол его увидел)
1. **Offerings** → открой текущий (тот, что `offerings.current` в коде).
2. **(+) New Package** → выбери package type **Lifetime** (`$rc_lifetime`).
3. Привяжи к нему оба продукта `phraseman_lifetime` (App Store + Play Store).
4. Сохрани. Теперь `Purchases.getOfferings()` вернёт lifetime-пакет в `o.current.availablePackages`.

### C4. (опц.) Промо €79
Промо «до повышения» проще сделать ОТДЕЛЬНЫМ продуктом `phraseman_lifetime_intro` (€79) в сторах + RevenueCat, и показывать его только в окне акции, потом скрыть. НЕ меняй цену основного — иначе у купивших не сойдётся.

---

## ЧАСТЬ D — Код Phraseman

> Ключевой факт: lifetime отличается от подписки.
> - У подписки есть `expirationDate`; у lifetime его НЕТ (entitlement активен вечно).
> - `premium_expiry='0'` в Phraseman УЖЕ означает «бессрочный, управляется RevenueCat» — для lifetime подходит как есть.
> - НЕ относись к lifetime как к подписке в `inferPremiumPlanFromProductId` — добавь явную ветку.

### D1. Расширить тип плана
**`app/premium_revenuecat_state.ts`**
```ts
// было:
export type PremiumStorePlan = 'monthly' | 'yearly';
// стало:
export type PremiumStorePlan = 'monthly' | 'yearly' | 'lifetime';
```
В `inferPremiumPlanFromProductId` добавить ветку ПЕРЕД monthly/yearly:
```ts
if (/lifetime|forever|onetime|one_time|perpetual/.test(id)) return 'lifetime';
```

### D2. Доставать lifetime-пакет
**`app/revenuecat_init.ts`** → `resolvePremiumPackages`:
```ts
export function resolvePremiumPackages(
  availablePackages: PurchasesPackage[],
): { monthly?: PurchasesPackage; yearly?: PurchasesPackage; lifetime?: PurchasesPackage } {
  const byType = (needle: string) =>
    availablePackages.find((p: any) => String(p?.packageType || '').toUpperCase() === needle);
  const byId = (rx: RegExp) => availablePackages.find(p => rx.test(p.product.identifier));

  const monthly = byType('MONTHLY') ?? byType('$RC_MONTHLY') ?? byId(/month|monthly|1.?month/i);
  const yearly  = byType('ANNUAL')  ?? byType('$RC_ANNUAL') ?? byType('YEARLY') ?? byId(/year|yearly|annual|12.?month/i);
  const lifetime = byType('LIFETIME') ?? byType('$RC_LIFETIME') ?? byId(/lifetime|forever|onetime/i);

  return { monthly, yearly, lifetime };
}
```

### D3. Покупка lifetime
**`app/paywall_purchase.ts`** — расширить `PaywallPlan`:
```ts
export type PaywallPlan = 'monthly' | 'yearly' | 'lifetime';
type PremiumPackages = { monthly?: PurchasesPackage; yearly?: PurchasesPackage; lifetime?: PurchasesPackage };
```
- В `handlePurchase`: `const pkg = selected === 'yearly' ? packages.yearly : selected === 'lifetime' ? packages.lifetime : packages.monthly;` (purchasePackage работает для lifetime ТАК ЖЕ — `Purchases.purchasePackage(pkg)`).
- У lifetime НЕТ триала → ветка `pkgTrial.hasTrial` просто не сработает (getTrialInfo вернёт false). ОК, ничего не ломается.
- `selected` дефолт оставить `'yearly'` (lifetime — доп. опция, не дефолт).

### D4. Восстановление (КРИТИЧНО для non-consumable)
`Purchases.restorePurchases()` уже есть в `handleRestore`. Lifetime восстанавливается через тот же `entitlements.active.premium` — проверка `Object.keys(info.entitlements.active).length > 0` его поймает. Убедись, что `inferPremiumPlanFromProductId` вернёт `'lifetime'` (см. D1), иначе план запишется как monthly.
⚠️ У lifetime НЕТ `activeSubscriptions` (это не подписка!) — он только в `entitlements.active` и в `info.nonSubscriptionTransactions`. Текущая проверка `entitlements.active.length > 0` его покрывает, но НЕ полагайся на `activeSubscriptions` для lifetime.

### D5. UI — третья карточка на пейволе
Добавить карточку «Навсегда / Lifetime» рядом с monthly/yearly. Цена — ТОЛЬКО из стора (`packages.lifetime?.product?.priceString`), никаких хардкодов €99. Есть 8 языков (ru/uk/es/pt-BR/vi/id/tr/pl) — заголовок «Навсегда» перевести во всех.
Пейволы: основной v1 `app/premium_modal.tsx` + A/B/C через `paywall_purchase.ts`. Решить, во всех ли показывать lifetime.

### D6. ⚠️ Серверный крон (не сломать lifetime)
`functions/src/premium_status.ts` / premiumExpiryCron: бессрочный `premium_expiry='0'` БЕЗ rc-полей уже неприкосновенен (см. memory phraseman_server_audit). Lifetime придёт С rc-полями (`premium_rc_product_id` и т.п.), но БЕЗ `rc_expiry_ms`. Проверить, что крон НЕ гасит entitlement без expiry. При refund non-consumable — премиум должен сниматься (механика REFUND).

---

## ЧАСТЬ E — (опц.) Веб-канал lifetime, чтобы не платить комиссию 15-30%

> Источник: дословные правила Apple/Google 2026 (fact-checked, см. memory phraseman_external_payments_legality).
> Mondly и Babbel так и делают — продают lifetime через сайт.

**МОЖНО ли продавать lifetime на своём сайте, оставаясь в обоих сторах? — ДА, при условиях.**

Apple Guideline **3.1.3(b)** (дословно): «Apps that operate across multiple platforms may allow users to access content, subscriptions, or features they have acquired… on your web site… **provided those items are also available as in-app purchases within the app.**»

→ Веб-lifetime легален, ЕСЛИ тот же lifetime ЕСТЬ и как IAP в приложении (Части A–D обязательны).

**МОЖНО:**
- Продавать lifetime на сайте (Stripe / RevenueCat Web), человек платит в браузере.
- Открывать премиум ПО АККАУНТУ при входе (stable_id + Admin SDK — уже есть).
- Рекламировать веб-цену ВНЕ приложения: email, соцсети, реферальная страница, пуши.
- Делать веб-цену дешевле (€79 на сайте vs €99 IAP) — сам факт разной цены НЕ нарушение.

**НЕЛЬЗЯ (= бан, кроме US-сторфронта Apple и EEA-программы Google):**
- Кнопка/ссылка на веб-оплату ВНУТРИ приложения.
- Намёк в приложении «на сайте дешевле / купи на knowlyapps.com».
- Своя оплата (Stripe) встроенная в приложение мимо IAP. ← прецедент бана: Fortnite.

**Регионы:** US-сторфронт Apple (с 05.2025) разрешает внешние ссылки в приложении; EEA по DMA — через enrolled-программу (с комиссией Google). Остальной мир — in-app ссылки запрещены. Безопаснее всего: НИГДЕ в приложении про веб не упоминать, продвигать только снаружи.

**Компромисс для РФ-диаспоры:** in-store покупка привычнее/доверительнее → возможно держать ОБА канала (IAP €99 + веб €79), не упоминая веб в приложении.

---

## Чек-лист запуска
- [ ] App Store: non-consumable `phraseman_lifetime`, цена €99-tier, Ready to Submit.
- [ ] Google Play: in-app product `phraseman_lifetime`, Active.
- [ ] RevenueCat: 2 продукта добавлены, attached к entitlement `premium`, в Offering как Lifetime package.
- [ ] Код D1–D5 (тип, resolve, покупка, restore, UI).
- [ ] Крон D6 проверен (lifetime не гаснет, refund снимает).
- [ ] Тест в Sandbox (iOS) + License testing (Android): купить → премиум открылся → удалить приложение → restore → премиум вернулся.
- [ ] Контракт-тест `tests/paywall_purchase_activation_contract.test.ts` обновлён под lifetime.
```
