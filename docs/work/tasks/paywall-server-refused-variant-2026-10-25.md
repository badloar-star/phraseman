# Task packet: пейвол «Не видим твой Plus» (plus_server_refused) — вариант окна с восстановлением покупок

Governance-ID: TG-74CA0EF4EE5F
Status: In progress (срочно для OTA)
Owner: 2 · ДИЗАЙН (по заданию 0 · КООРДИНАТОР; контекст и тексты — Ядро c161d894a)
Related epic/enabler: docs/work/tasks/store-paywall-unknown-entries-guard-2026-10-25.md, docs/work/paywall-theme-token-map-2026-10-25.md

## Outcome

Когда сервер отказал «нужен Plus», а телефон считает Plus включённым (свободный диалог), окно Plus честно говорит «Не видим твой Plus» и первой кнопкой предлагает «Восстановить покупки» (идёт / вернулся / не нашли), второй — «Оформить Plus», третьей — «Не сейчас». Остальные входы окна не меняются.

## Scope

In scope: новый компонент дока `components/paywall/PaywallServerRefusedDock.tsx` (+ переключатель `PaywallPlusDockSwitch`), тексты на 9 языках `paywall_server_refused_copy.ts`, три точечные правки `PaywallPlusScreen.tsx` (контекст, переключатель дока, импорт), тест-сторож.
Out of scope: заголовок и подзаголовок (уже даёт `paywall_copy` Ядра), логика восстановления (`handleRestore` в `paywall_purchase.ts` — Ядро), чужие незакоммиченные правки в `PaywallPlus.tsx`, `PaywallPlusCopy.ts`, `PaywallPlusScreen.tsx` (видимость кнопок и ввод промокода) — коммит только своими хунками через `--patch`; `as any` у `router.push('/promo_code_entry')` — чужая правка, не трогаю.

## Architecture

Переключатель `PaywallPlusDockSwitch` принимает те же пропсы, что `PaywallPlusDock`, плюс `serverRefused` и `onLater`; в обычном окне отдаёт прежний `PaywallPlusDock` без изменений. Для варианта: основная кнопка «Восстановить покупки» (`ctaFill`/`ctaFillInk`, P12), вторая «Оформить Plus» на плашке (`paywallPlateBg`, текст `text`), «Не сейчас» (`secondary`, P15), строка условий. Состояния восстановления: `restoring` из хука покупки (идёт), событие `premium_activated` (вернулся), конец восстановления без активации (не нашли). Тосты результата остаются как есть.

## Security and privacy

Данных не собираем. Восстановление — существующий путь магазина; результат не логируется с личными данными.

## Technical debt

Исход восстановления выводится из `restoring` и события `premium_activated`: когда Ядро вернёт результат из `handleRestore`, строку «не нашли» можно брать из него.

## Verification

Тест исходников (вариант включается только для `plus_server_refused`, порядок кнопок, токены темы, 9 языков), `npm run typecheck`, соседние тесты пейвола (`paywall_server_refused_variant`, `paywall_entry_callsite_registry_contract`), эмулятор — состояния окна.

## Rollback

Откат одного коммита; обычное окно Plus не затронуто.
