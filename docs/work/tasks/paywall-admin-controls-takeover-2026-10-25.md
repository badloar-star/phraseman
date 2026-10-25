# Task packet: видимость «закрыть / восстановить / промокод» в окне Plus (передано в Дизайн) — довести и закоммитить

Governance-ID: TG-DFAB33741E69
Status: In progress
Owner: 2 · ДИЗАЙН (по слову владельца «Забрать в Дизайн», передал 0 · КООРДИНАТОР, журнал e93368096)
Related epic/enabler: docs/work/tasks/paywall-server-refused-variant-2026-10-25.md, docs/work/paywall-theme-token-map-2026-10-25.md

## Outcome

Админка (Пульт → Монетизация, карточка уже в HEAD) через Remote Config включает/выключает три действия окна Plus: «закрыть», «восстановить», «ввести промокод». Если настройка не пришла или чтение упало — «закрыть» и «восстановить» ВИДНЫ всегда (требование Apple). В коде нет `as any` у перехода на ввод промокода.

## Scope

In scope: `app/paywall_control_visibility.ts` (чтение трёх флагов, безопасный откат к «видно» с журналом), `app/remote_flags.ts` (три ключа, дефолт true), `components/paywall/PaywallPlus.tsx` (шапка/док принимают видимость), `PaywallPlusCopy.ts` (подпись «Ввести промокод»), `PaywallPlusScreen.tsx` (подписка на `remote_config_changed`, переход на промокод без `as any`), тесты `tests/paywall_admin_controls*.test.ts(x)`; вместе с ними — уже готовое окно «Не видим твой Plus» (`PaywallServerRefusedDock.tsx`, `paywall_server_refused_copy.ts`, тест), потому что оба меняют одни и те же строки экрана.
Out of scope: карточка в админке (уже в HEAD), серверная часть промокодов, макет «Вариант М» (отдельная задача после этой).

## Architecture

`getPaywallControlVisibility()` читает уже применённый снимок Remote Config (без сети и хранилища). Экран держит состояние и обновляет его по событию `remote_config_changed`. Промокод виден только если включены оба флага: `paywall_promo_code_visible` и серверный `promo_codes_enabled` (дефолт false). Закрытие свайпом/подложкой/назад остаётся при скрытом крестике.

## Security and privacy

Данных не собираем, новых разрешений нет. Флаги — булевы, пишет только админ с claim `admin`.

## Technical debt

Админ может выключить «восстановить» — Apple это не любит; защита только дефолтом и откатом при ошибке чтения. Если нужно жёстче — принудительно показывать restore в сторе (решение владельца).

## Verification

Тесты `paywall_admin_controls*`, `paywall_server_refused_*`, `paywall_entry_callsite_registry_contract`; `npm run typecheck` (проверка, что `as any` не нужен); разбор исходников.

## Rollback

Откат одного коммита: окно возвращается к прежнему низу со ссылкой «Восстановить» и крестиком.

Governance-ID: TG-C6AB6B6FA9B7
