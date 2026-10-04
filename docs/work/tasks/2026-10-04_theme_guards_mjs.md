# Task packet: .mjs-стражи с темами под действующий набор тем 2.0

Governance-ID: TG-AA2299D3A699
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: docs/work/tasks/2026-10-04_theme_guards_2_0.md

## Outcome

- `tests/profile_liquid_glass_source_contract.test.mjs` — проверка «themes» искала удалённый сегмент `theme-level-${level}` («Спокойно / Акцент / Максимум», заменён ползунком 04.10). Заменяю на проверки ползунка той же строгости + градиентные темы из конфига + запрет возврата сегмента.
- `tests/manage_subscription_overlays_liquid_glass.test.mjs` — список тем расширяю с 13 до действующих 23 (тонированные + градиентные). Его 12 падений НЕ про темы: изменён `app/manage_subscription_purchase.ts` (хеш-пин, коммит ebc1a860d, account-authority) и новый импорт `./purchase_flow_activity` без заглушки — зона покупок; пин и заглушку не трогаю, передаю координатору.

## Scope

In scope: эти два файла тестов (у второго — только список тем) + пакет.
Out of scope: `app/manage_subscription_purchase.ts`, хеш-пины зависимостей и заглушки модулей покупок.

## Architecture

Нет изменений — тесты.

## Security and privacy

Не применимо. Хеш-пин кода покупок сознательно НЕ обновлён: это одобрение чужой правки платёжного кода.

## Technical debt

Нет новой.

## Verification

`node --test tests/profile_liquid_glass_source_contract.test.mjs` — все зелёные; `tests/manage_subscription_overlays_liquid_glass.test.mjs` — падения только по пину/заглушке покупок (не по темам).

## Rollback

`git revert`.
