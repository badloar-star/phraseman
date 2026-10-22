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
