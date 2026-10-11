# Dev-состояния для съёмки R1: превью Шпиля и сид слота сообщений / опроса

Governance-ID: TG-EFF3D6437854
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора 14.10)
Related epic/enabler: R1_SHOT_LIST.md, раздел «Остаётся нет пути»

## Outcome
1) Шпиль: состояния превью `weekresult_stay`, `weekresult_down`, `passed`, `guard`, `step_gap`, `step_odd`, `step_listen_choose`, `step_listen_build`, `block_missing`, `block_offline` и параметр `&exit=1` открываются через `dev_spire_preview?state=…`. 2) Слот сообщений и опрос: dev-сид (локальная dev-кампания) для кадров. Строки «нет пути» в R1_SHOT_LIST обновлены.

## Scope
`components/spire/spire_preview_fixtures.ts`, `app/dev_spire_preview.tsx`, `app/app_messages.ts` (только dev-сид), `app/dev_state_fixtures.ts` (только разбор новых параметров), тесты, R1_SHOT_LIST. Всё строго за `__DEV__ && !IS_STORE_RELEASE`, без сетевых записей, лог `[DEV-STATE]` на каждой ветке. Кнопка жалобы на задание (`reportSlot`) в превью не рисуется: её нажатие отправляет жалобу в сеть.

## Architecture
Фикстуры — чистые данные, подключены только маршрутом превью (охраняет tests/spire_dev_preview_release_guard.test.mjs). Сид сообщений — экспортируемая функция в app_messages.ts, отказывающая вне dev; пишет только локальный кэш устройства.

## Security and privacy
Реальных людей и сетевых записей нет; имена выдуманные. В стор-сборке маршрута и функций сида нет (проверяет тест).

## Technical debt
Жалоба на задание и «время вышло» снимаются в настоящей игре.

## Verification
Точечные тесты под слотом светофора + node:test охранник релиза Шпиля.

## Rollback
git revert коммитов.
