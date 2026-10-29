# Task packet: окно покупки не открывается раньше облака на новом устройстве (Plus только в облаке)

Governance-ID: TG-FBD17ADB130A
Governance-ID: TG-4A2E7985726A
Status: В работе
Owner: «5 · ВХОД»

## Outcome

Координатор 29.10 (мой 🟡 из 1097057bd): Plus, который хранится только в облаке (оплата через Telegram-бот → VIP, промокод,
админ-выдача), на новом устройстве ещё не доехал до телефона. Снимок профиля «free» → окно покупки открывалось сразу, человек мог
заплатить второй раз. Нужно:
1. Пока облако на этом устройстве ни разу не подтвердило статус аккаунта, а снимок «free», окно не показывать сразу — короткое
   ожидание (прозрачный маршрут, без спиннера на весь экран), лог причины.
2. Облако не ответило → окно показывается вариантом «Не видим твой Plus» (уже есть: «Восстановить покупки» первой кнопкой) и фоном
   перечитывается облако: VIP найден → окно закрывается само. «Восстановить покупки» магазина Telegram-VIP не находит — поэтому фон.
3. Тест: Telegram-VIP на новом устройстве → окно не открывается.

## Scope

- НОВЫЙ `app/plus_cloud_confirmed_marker.ts` — отметка «облако подтвердило статус этого аккаунта на этом устройстве»
  (AsyncStorage `plus_cloud_confirmed_v1:<stableId>` + память процесса).
- `app/premium_guard.ts` — ставит отметку после полной проверки с подтверждённым ответом (источники кроме none_fast/none_unconfirmed/tester_*).
- `app/paywall_entry_contract.ts` — `resolvePremiumModalEntry` получает `cloudConfirmedOnDevice` (необязательно; не передан = как раньше).
- `app/premium_modal.tsx` — читает отметку, держит ожидание, для варианта «облако не ответило» фоном `forcePremiumAccessCloudRestore` +
  событие `premium_server_recheck_done` (PremiumContext пересчитывает доступ → окно закрывается по Plus).
- Тест `tests/plus_cloud_unconfirmed_paywall.test.ts`.
- НЕ трогаю: `app/paywall_purchase.ts`, `components/paywall/PaywallPlusScreen.tsx` (Codex), `app/cloud_sync.ts` (чужие правки).

## Architecture

Окно выбирает вариант по `entry.context` (SERVER_REFUSED_CONTEXT уже рисуется доком «Не видим твой Plus»), source остаётся исходным.
Существующий потолок ожидания окна (PAYWALL_ENTRY_WAIT_CEILING_MS) — для неподтверждённого устройства длиннее (3 с), меньше потолка
облака в premium_guard (5 с) — человек не ждёт дольше.

## Security and privacy

Новых данных нет: локальная отметка-флаг на устройстве, в облако не уходит. Ключ содержит stableId — как прочие ключи по аккаунту.

## Technical debt

Подсветка «Восстановить» внутри обычного (не refused) окна и перечитывание облака внутри handleRestore — файлы Codex, при нужде патч
через Ревизора. Тексты варианта refused уже утверждены (макет 25.10), новых строк нет.

## Verification

jest через слот: новый тест + paywall_server_refused_variant, paywall_entry_contract, paywall_entry_wait_ceiling,
premium_modal_entitlement_behavior, premium_guard*, plus_source_diagnostics. Типы — полный typecheck, мои файлы.

## Rollback

Удалить отметку и вход `cloudConfirmedOnDevice` (без него решение = прежнее).

## Дополнение (Ревизор по 5781370d8, 29.10)

Без аккаунта (stableId нет) хук отдаёт undefined = «отметка не передана», прежнее поведение (а не true = «подтверждено», чтобы не
путать). Потолок ожидания для undefined — обычные 1,5 с (3 с только при false/null). Тест хука без аккаунта: обычное окно сразу, без
ожидания; лог совпадает с реальной веткой.
