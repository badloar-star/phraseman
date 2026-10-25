# Ядро · шлюз удаления в callable, открытых в 14-дневной отсрочке (сверка Ревизора, 25.10)

Governance-ID: TG-5427E1E95BB2

## Outcome
После варианта Б (713677ddd: пользователь Auth живёт 14 дней, сессии отозваны, повторный вход возможен) Ревизор нашёл callable, которые
берут authUid напрямую и не проходят шлюз удаления (docs/work/tasks/revizor-deletion-grace-gate-audit-2026-10-25.md). Закрыть:
🔴 referralSpin, referralClaimSpin, communitySyncPackRuneSale, accountsV2SyncApply; 🟡 dailyPhraseSetSaved. Без выкладки — уходят вместе
с 713677ddd по «да» владельца. Плюс только чтение: включён ли config/accounts_v2.syncEnabled на бою.

## Scope
- functions/src/account_gate.ts: `assertAuthAccountUsableForCallable(db, authUid, callable)` — тот же assertAuthAccountUsable, но
  отказ пишет `[ACCOUNT-GATE] reject callable=… auth=<6 знаков> reason=account_delete_pending|identity_retired` и пробрасывается.
- referral_spin.ts, referral_claim_spin.ts, community_pack_rune_sale.ts, daily_phrases.ts — вызов сразу после получения authUid и db,
  до любых других чтений/записей (до assertAuthStableLink / транзакций / resolveStableUid).
- accounts_v2_adapter/callable.ts: шлюз в handleAccountsV2Sync после разбора вызывающего (после ворот флага syncEnabled — при
  выключенном флаге по-прежнему 0 чтений); зависимость подставляемая для тестов на фейковом Firestore.
- Тесты: живой тест помощника (отсрочка → failed-precondition account_delete_pending + журнал; нет метки → проходит; метка
  истекла/удалён → identity_retired) и сторож по исходнику: в каждом из пяти обработчиков шлюз стоит раньше остальных чтений.

## Architecture
Шлюз — общий assert*Usable (метка удаления по authUid + постоянный отказ), как у resolveStableUidForAuth. Стоимость: +2 точечных
чтения на вызов этих функций (редкие действия; accountsV2 — только при включённом флаге).

## Security and privacy
В журнал — 6 знаков uid и код отказа. Ничего нового не хранится.

## Technical debt
recordOnboardingFunnelEvent, customCardMilestoneNotify, stripeWebhook-продление — низкий риск, не трогаю (по сверке). accountsV2Migrate/
PullMine и revenueCatShardsWebhook закрыты своими проверками маркера — перевод на assert*Usable отдельно.

## Verification
Тест помощника + сторож по исходнику + существующие тесты затронутых файлов (callable.test.ts accounts_v2, community_pack_rune_sale,
referral_spin_*); проверка типов functions по затронутым файлам.

## Rollback
Откат коммита (сервер не выложен).
