# Task packet: красный tests/paywall_unverified_non_onboarding_copy.test.cjs — граница среза в тесте

Governance-ID: TG-5B8DC7FA9028
Status: Done
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: app/paywall_purchase.ts (showUnverifiedPurchaseAlert, paywallRestoreToast), гейт precheck

## Outcome

Тест перестаёт падать по неверной причине и по-прежнему охраняет правило: окно «Статус покупки не подтверждён» не обещает повторную оплату («Попробуй ещё раз» / «Try again» в самом окне запрещены, есть «Не покупай повторно»). Разбор: сам текст окна чист; тест резал исходник от `showUnverifiedPurchaseAlert` до `showDevPurchasePreviewAlert`, а между ними позже встали тосты результата проверки (`paywallRestoreToast`) со строками «Try again later», которые к окну не относятся.

## Scope

In scope: `tests/paywall_unverified_non_onboarding_copy.test.cjs` — конец среза окна. Текст окна и тосты не меняются.
Out of scope: другие тексты пейвола, онбординг.

## Architecture

No architecture change: только граница среза в тесте.

## Security and privacy

Правило теста (не обещать повторную оплату при неподтверждённой покупке — риск двойного списания) сохраняется и усиливается.

## Technical debt

Pay now: тест красный и закрывает гейт precheck.

## Verification

`node --test tests/paywall_unverified_non_onboarding_copy.test.cjs`, плюс проверка, что срез действительно содержит текст окна на 9 языках и не содержит тостов.

## Rollback

Откат коммита.
