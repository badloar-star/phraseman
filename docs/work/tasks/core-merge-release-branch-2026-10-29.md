# Ядро · слияние release/community-2026-10-26 в рабочую ветку — «всё в одной ветке» (29.10)

Governance-ID: TG-2AF0CE521967
Governance-ID: TG-3A80C7A02DF2
Status: In progress
Owner: 1 · ЯДРО

## Outcome
Приказ владельца (через координатора, 29.10): «всё всегда в одной ветке, абсолютно всё должно попасть в приложение».
После слияния da0a435e3 (сборки 147/148) — предок HEAD; всё, что работает на бою, есть в ветке. Release-веток больше нет.

## Scope
Слияние 3 коммитов релизной ветки (a82a3b220 — весь бой, 5059 файлов против HEAD; 0a6fa48db; da0a435e3).
8 конфликтов → наша сторона (она новее): community_month_contest ×2, CommunityWinnerDialog + тест, legacy.html (HEAD == бой),
тест dialogue_v2, документ voice-night-queue, functions/index.ts (наш экспорт + экспорты релиза).
Вариант А (координатор/владелец): экспорты adminStaff* как в релизе — они на бою с 26.10. Удаления релиза (7 файлов) не берём.
Выполняется ПОСЛЕ выкладки бота и конкурса (их скрипт берёт HEAD на старте).

## Architecture
git merge-tree --write-tree → временный индекс с разрешёнными файлами → commit-tree с двумя родителями → атомарный
update-ref под общим замком коммитов. Общее рабочее дерево: обновляются только пути, где файл был чистым; чужие
незакоммиченные правки не трогаются, список путей — координатору.

## Security and privacy
Новых данных и функций не включает; функции выкладываются только поимённо.

## Technical debt
Снимает долг «две ветки» и «бой новее HEAD».

## Verification
Снимок нового HEAD: полная проверка типов приложения и functions, тесты Сообщества и конкурса (в слоте).

## Rollback
update-ref ветки обратно на старый HEAD (хэш в журнале /c/Temp/claude/merge_run.log); рабочее дерево — обратный checkout чистых путей.

## Уточнение 29.10 ~11:20
Живая сверка «бой vs HEAD» (сухой прогон выкладки): на бою из adminStaff* работает ТОЛЬКО adminStaffIsolatedSession;
7 функций membership/invitation никогда не выкладывались (есть лишь в исходниках a82a3b220). Поэтому в index.ts слияния
оставляем adminStaffIsolatedSession и adminGetProductStatistics (на бою), а 7 экспортов membership/invitation не берём —
файлы модулей входят в ветку («всё в ветке»), но функции не включаются («персонал и приглашения — не включать»).

Governance-ID: TG-5A1F3DE50078

## Итог 29.10 ≈11:35 (сообщения сессиям на паузе — отчёт здесь)
Status: Done — слияние 13f66f310 (родители 8fb602097 + da0a435e3), da0a435e3 предок HEAD.
- Выкладка бот + конкурс B — ✅. SHA на бою b053df5e8 (функции == aa29d5f29, проверенному Ревизором). 6/6 Successful:
  telegramPremiumWebhook, communityMonthGetRanking/GetRewards/ClaimReward/Finalize (update), communityMonthStandingsRefresh (create).
  INVOKER-CHECK: 4 вызываемые/HTTP, без публичного права 0. Журнал: старт 11:23, ERROR 0, трафика ещё не было.
  Telegram getWebhookInfo: ok, хост us-central1-phraseman-ea0b3.cloudfunctions.net, pending 0, last_error нет.
- Рабочее дерево после слияния: 2707 путей == слиянию; поправлены 3 файла со старой версией (app.json versionCode/buildNumber = 148,
  scripts/scan_untranslated_ui.mjs, docs/release/COMMUNITY_2026_10_26.md). Индекс синхронизирован (c70031f1e). 2.0.4 → сборка 149+.
- Сигналы: Сайту — бот и B выложены, слияние сделано (пересчитать сироты от нового HEAD; legacy.html до коммита C не трогать);
  Дизайну — коммитить 9 + 4 файла Сообщества поверх нового HEAD; всем — перестроить --patch от нового HEAD.

## 22 функции «на бою, без экспорта в HEAD» (сухой прогон до слияния, [LIVE-VS-HEAD]) — Ревизору
После слияния экспортируются 2 (adminGetProductStatistics, adminStaffIsolatedSession) → осталось 20. Полная выкладка
functions из HEAD предложит удалить их — поэтому только поимённо, пока владелец не решит по каждой:
adminGrantVoiceMinutes (MAX удалён 04.10 — выдача минут), adminListQuests, aiDialogBuyExtraReplies, aiDialogSyncPurchase,
authorizeLearningV2CourseUnlock, collectiblesClaimDrop, communityRedeemPackGiftVoucher, cosmeticAssetCatalogGet,
devRunesGrant, devShardsGrant, flashcardPackGiftGrantGlobalBroadcast, flashcardPackGiftRedeem, flashcardPackGiftSyncState,
leagueActivateGroupBoost (Лиги удалены D54/D74), questGetActive, recalcCoinExchangeRate, referralDevGrantSpin (удалена D78/D81),
resolveLearningV2CourseUnlockReceipt, shardsApplyDelta, videoWatchRunesClaim (доживает до min_app_version ≥ 2.0 — DEPLOY_NOW Шаг 2).
Часть — сознательно удалённые из кода функции, которые зовут старые сборки (их удаляет из облака только координатор по имени).
