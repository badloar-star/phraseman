# Task packet: удаление денежных/наградных путей по решениям владельца D136–D140 (после PM-233)

Governance-ID: TG-BD3987644955
Status: Done (SPEC+SECURITY APPROVE); _layout.tsx и functionsClient.ts докоммитить после сессии App Check (смешанные ханки)
Owner: Claude session (Account V2 → очередь координатора)

## Outcome

Решения владельца 2026-10-01 (docs/phraseman-2.0/03_DECISIONS.md D136–D140; реестр docs/phraseman-2.0/evidence/PM-233_purchase_ledger.md):
1. **D136 MAX:** удалить денежный код MAX — ветку `voiceMinutePack`/минут в `revenueCatShardsWebhook` (`functions/src/revenuecat_shards.ts:~1342`), обработку подписки `phraseman_max_monthly_v1`, `adminGrantVoiceMinutes` (экспорт `functions/src/index.ts:~675` + вызов в `admin/v2/legacy.html`). Вебхук на неизвестный/удалённый товар — лог-отказ (`[REVENUECAT] retired_product`), без начисления. Остальной законсервированный код MAX не трогать (пломба `app/max_voice_flags.ts`, `functions-max/` — как были).
2. **D139 жемчуг:** удалить приём покупок пакетов жемчуга в вебхуке (`revenuecat_shards.ts:~895`) — тот же лог-отказ. «+10 ответов за 300 монет»: удалить `aiDialogBuyExtraReplies` и клиентскую покупку (`app/ai_dialog_extra_replies_client.ts`, точку входа в UI — кнопку/шит «+10»), квота D111 остаётся.
3. **D140:** удалить 4 callable подарочных наборов (`communityRedeemPackGiftVoucher`, `flashcardPackGiftRedeem`, `flashcardPackGiftSyncState`, `flashcardPackGiftGrantGlobalBroadcast`, экспорт index.ts:~602–605) и их клиентские вызовы; полученные наборы в библиотеке остаются. Квесты (`questClaimReward`, `functions/src/quests.ts`, клиент) и коллекции (`collectiblesClaimDrop` заглушка, `app/collectibles/*`) — удалить; уже выданные дни Plus не трогать.
4. Сторож `scripts/pm233_purchase_ledger_dry_run.mjs --check` обновить (маркеры ушли → строки реестра со статусом removed), без «непокрытых».
5. D137 (выдать Plus по denials) — ТОЛЬКО скрипт `scripts/pm233_grant_plus_for_denials.mjs` с сухим прогоном по эмулятору/фикстуре, без запуска в проде (исполнение — по команде владельца).

## Scope

functions/src (вебхук, квесты, подарки, «+10», admin voice minutes) + index.ts экспорты; app/ клиентские вызовы и UI-точки входа удаляемых фич; admin/v2/legacy.html (только удаление кнопок/вызовов удалённых функций; вход в админку не трогать — сторож guard_admin_login); Jarvis (`functions/src/jarvis/*_firestore_fetcher.ts`, `jarvis_data_contract_guard.test.ts`, `JF_DEPARTMENT_META`) — обновить, если читает удаляемое; тесты. Out of scope: удаление данных в Firestore, деплой, сторы, пломба MAX, `account_delete*` (группа удаления у координатора на выкладке — НЕ трогать), Арена-данные (чистка по D90 — отдельно после релиза).

## Architecture

Удаление по цепочке: UI-точка → клиент → callable → экспорт → тесты/сторожа; вебхук — явный отказ с логом вместо молчания. Деплой удалит функции (Firebase спросит подтверждение) — отметить в отчёте список удаляемых функций для координатора.

## Security and privacy

Меньше путей начисления — меньше поверхности атаки. Privacy policy: проверить упоминания MAX-минут/квестов/подарков (owner-rules) — если есть, предложить правку `legal/` + `legal:sync`.

## Technical debt

Accept temporarily: данные удалённых фич в Firestore остаются до отдельной чистки (OD20/D90).

## Verification

Сторожа (perf/layout/Babel, guard_admin_login, jarvis contract, d74/d83, max_section_sealed_contract — пломба MAX не снимается), затронутые тесты по одному, typecheck затронутых файлов, `pm233 --check`, независимое ревью. Массовое удаление — без обхода сторожа массового удаления (если блокирует — доложить).

## Rollback

git revert коммита; бэкап `.tmp_pm233_removal_backup/`.
