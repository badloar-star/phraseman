# Task packet: dev-подмена `dev_state?spireRankBy=coins` для кадров Сверки (D162) + предпроверка R1

Governance-ID: TG-4DF51FEAE1F5
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: E25 Пик, D162 (fdc33942b); координатор 14.10 18:05

## Outcome

1. Сверка снимает комнату Пика в режиме «по монетам недели» без сервера: `dev_state?spireRankBy=coins|steps|off`.
   Подмена только в памяти процесса и только в dev-сборке (`__DEV__ && !IS_STORE_RELEASE`); в стор-сборке — заглушка (`dev_spire_tier_stub`).
   Пока сервер не выложен (17.10), в комнатах нет снимка `weekCoins` — при подмене пустые суммы заполняются для показа формулой
   ботов (`spireBotWeekCoins`, ступени × 30), с журналом [DEV-STATE]; настоящие снимки не трогаются.
2. Предпроверка R1 на текущем HEAD (`release:precheck` и связанные гейты) — список красного по владельцам координатору.

## Scope

In scope: `app/dev_spire_tier.ts`, `store_release_stubs/dev_state/dev_spire_tier_stub.ts`, `app/dev_state_fixtures.ts` (разбор и
применение параметра), `modules/spire/room_rows.ts` (флаг заполнения сумм для показа), `app/spire/use_spire_game.ts` (подмена
рубильника), тест. Out of scope: сервер, конфиг в проде, макеты.

## Architecture

Тот же приём, что `spireTier`/`spireScroll`: флаг в памяти процесса, читается хуком игры при построении строк.
Рубильник на экране = `getDevSpireRankByOverride() ?? spireEffectiveRankBy(config, weekId)`.

## Security and privacy

Только dev; стор-заглушка возвращает null/false, сторож паритета заглушек и гейт [STORE-BUNDLE-DEV] это проверяют.

## Technical debt

Contain: заполнение пустых сумм для показа — только в dev-подмене (флаг `fillMissingWeekCoinsForPreview` не передаётся в боевом пути);
после выкладки сервера 17.10 снимки появятся сами, флаг можно убрать вместе с подменой после R1.

## Verification

Тест: разбор параметра, заглушка, заполнение сумм только при флаге; паритет заглушек (`store_release_stubs_gate`); сторож заглушек.

## Rollback

git revert; данные не меняются.
