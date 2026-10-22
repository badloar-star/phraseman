# Task packet: удаление функций Лиг 1.x и лишних функций (группы A и B) — подготовка

Governance-ID: TG-B1DEA24666A4
Status: Подготовка (без удаления в проде). Удаление — отдельным шагом по «да» владельца.
Owner: Ядро (сессия 1). Решения владельца 22.10 (через координатора): Лиги 1.x — «Да, удалить»; лишние функции — «Удалить, кроме инструментов поддержки».

## Outcome

Из `functions/src/index.ts` убраны экспорты удаляемых функций. Исходники каждой функции прода сохранены в резервную папку. Свежая проверка подтверждает «0 вызовов за 30 дней» на сегодня. Потом — `firebase functions:delete` по списку.

## Scope

- Лиги 1.x: `leagueJoinOrUpdateGroup`, `leagueUpdateMyMember`, `leagueFinalizeCron` + `league_groups.ts`, `league_finalize_cron.ts`, `league_residents*` (Ревизор 3.157: вызывают только 1.x, после окна обновления — 2 вызова).
- Группа A (6): `accountClaimMine`, `exchangeCoinsForStars`, `questClaimReward`, `reportUserIdea`, `updateUserIdea`, `vipRevokeMine`.
- Группа B (35) минус исключения:
  - НЕ удалять `adminSupportSendReply`, `adminRelinkProvider`, `adminRepairAuthLink` — инструменты поддержки;
  - НЕ удалять `adminSearchUsers` — её зовёт новая панель «Выдать Plus», 22.10.
- `adminEnglishTestAnalytics` — удалить, если 0 вызовов, и убрать кнопку в админке.
- Группы C и D (Learning V2, фабрика) — НЕ трогать.

## Architecture

Порядок из `functions-unused-candidates-2026-10-22.md`: экспорт из index.ts → коммит → архив исходников (`gs://gcf-v2-sources-…/<имя>/function-source.zip`) → свежая проверка вызовов → `functions:delete`. Ссылки в app/, admin/, knowly-www/, web/, src/ — повторный grep, 22.10.

## Security and privacy

Удаление снижает поверхность атаки. Данных не удаляет — только код функций.

## Technical debt

Файлы Лиг в functions/src удаляются вместе с экспортами. Сторожа `scripts/guard_league_*.mjs` проходят пусто.

## Verification

Проверка вызовов за 30 дней (Cloud Monitoring `run.googleapis.com/request_count`) — 0 по каждой. Сборка functions после правки index.ts — полная проверка типов.

## Rollback

Повторная выкладка из архива исходников или из git до коммита удаления.

## Перекрёстная проверка клиентов (22.10)

Governance-ID: TG-1F5A3758515A

Колонки: приложение HEAD · выпуск 2.0.0 (831d223cb) · admin/ (файлы) · прямой вызов в admin/v2/legacy.html · сайт (knowly-www, web, src) · скрипты. В скриптах — только справочные карты (pm221_server_domain_map, pm233_purchase_ledger_dry_run, identity README), не вызовы.

| Функция | app | 2.0.0 | admin | вызов | сайт | скрипты | Решение |
|---|---|---|---|---|---|---|---|
| leagueJoinOrUpdateGroup | 0 | 0 | 0 | 0 | 0 | 0 | удалить |
| leagueUpdateMyMember | 0 | 0 | 0 | 0 | 0 | 0 | удалить |
| leagueFinalizeCron | 0 | 0 | 0 | 0 | 0 | 0 | удалить |
| accountClaimMine | 0 | 0 | 0 | 0 | 0 | 3 | удалить |
| exchangeCoinsForStars | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| questClaimReward | 0 | 0 | 0 | 0 | 0 | 2 | удалить |
| reportUserIdea | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| updateUserIdea | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminActivateQuest | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminArchiveQuest | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminCreateAssetJob | 0 | 0 | 0 | 0 | 0 | 0 | удалить |
| adminCreatePlan | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminDeactivateGlobalBroadcasts | 0 | 0 | 0 | 0 | 0 | 0 | удалить |
| adminDeleteQuest | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminDeleteShardSurvey | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminExportReportDocuments | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminExportUnresolvedReports | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminGenerateDirectorDigestAudio | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminGetCoinExchangeCenter | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminGetCosmeticAssetArchive | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminGetDailyBriefing | 0 | 0 | 0 | 0 | 0 | 0 | удалить |
| adminGetDirectorDigest | 0 | 0 | 0 | 0 | 0 | 0 | удалить |
| adminGetPlan | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminListAppMessages | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminListAssetJobs | 0 | 0 | 0 | 0 | 0 | 0 | удалить |
| adminListAuditLog | 0 | 0 | 0 | 0 | 0 | 0 | удалить |
| adminListOpsLog | 0 | 0 | 0 | 0 | 0 | 0 | удалить |
| adminListPlans | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminListReferrals | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminListReportQueue | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminListUserIdeas | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminRunAssetJob | 0 | 0 | 0 | 0 | 0 | 0 | удалить |
| adminSetCoinExchangeRate | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminSetCosmeticAssetSaleStatus | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminSpinLogs | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminSpinStats | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminUpdateGiftCertificateRecipient | 0 | 0 | 0 | 0 | 0 | 1 | ОСТАВИТЬ (координатор: подарки только что запущены) |
| adminUpdateReportStatus | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminWriteQuest | 0 | 0 | 0 | 0 | 0 | 1 | удалить |
| adminEnglishTestAnalytics | 0 | 0 | 1 | 1 | 0 | 0 | удалить; кнопку в legacy.html убирает 9 · САЙТ |

Оставлены вне списка: vipRevokeMine (QA, сторож прав — решение координатора), adminSupportSendReply, adminRelinkProvider, adminRepairAuthLink, adminSearchUsers.
Итого к удалению: **39** функций.

## Коммит подготовки (22.10)

Governance-ID: TG-48356DD45120

index.ts (экспорты 39 функций), профили deploy:* в functions/package.json, сторожа, файлы Лиг (league_groups.ts, league_finalize_cron.ts, league_residents.ts + 2 теста). Без выкладки. Функции, которых уже нет в коде (квесты, обмен монет, архив косметики, adminEnglishTestAnalytics), — только functions:delete в проде.

## Сторожа под удаление (22.10)

Governance-ID: TG-7F965201361B

- `tests/admin_control_plane_deploy_contract.test.ts` — из ожидаемого списка убраны adminListReferrals, adminSpinStats, adminSpinLogs.
- `tests/admin_callable_export_parity_contract.test.ts` — убрано ожидание профиля `deploy:admin-audit-security`.
- `functions/src/admin_director_digest.test.ts`, `functions/src/admin_plans/callables_contract.test.ts` — модули остаются, ожидание экспорта из index.ts заменено на «экспорта нет».
