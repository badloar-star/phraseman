# dev_state: составная ссылка без «&» и журнал полученных ключей (запрос Сверки 06.11)

Governance-ID: TG-35D0CBE79113
Status: В работе 06.11
Owner: «5 · ВХОД»

## Outcome

Ссылка `dev_state?newbie=1&onboarding=pending&plus=off&next=/` через `adb shell am start` применяла только первый ключ: остальные молча терялись (вероятно, `&` режется оболочкой устройства до приложения). Сначала журнал: что именно получил разбор. Затем способ задать несколько состояний одной ссылкой БЕЗ `&`: `dev_state?set=newbie:1,onboarding:pending,plus:off`.

## Scope

`app/dev_state_fixtures.ts` (`parseDevStateParams`: журнал ключей + раскрытие `set=`), тест `tests/dev_state_compound_link_2026_11_06.test.ts`.

## Architecture

`set` раскрывается в обычные пары до разбора; явные параметры сильнее. Разделители `,` и `:` безопасны для оболочки и URL. Только dev (`isDevStateAvailable`), стор-сборка не затронута.

## Security and privacy

Dev-only, данные не собираются.

## Technical debt

Если журнал покажет, что приложение получает все ключи, а теряет их разбор, — чинить разбор отдельно.

## Verification

Тест: `set=` раскрывается; явный ключ побеждает; обычная ссылка не меняется.

## Rollback

Убрать раскрытие `set` и строку журнала.
