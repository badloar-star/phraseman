# errfix: dev_dialog_mood=happy для dialogs-041

Governance-ID: TG-5E51D15DAE32
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (мелкое поручение координатора по данным Ядра)

## Outcome
Ссылка строки `dialogs-041` несёт `dev_dialog_mood=happy`: настроение «Очень доволен» берётся из mood последнего хода, а подставной ход приходил с `mood: null`, поэтому состояние не показывалось.

## Scope
Только `scripts/dev_links_r1_steps_errfix.py` (моё): добавление параметра в существующую запись `dialogs-041`. Код приложения и чужие модули шагов не меняются; DEV_LINKS пересоберёт Авторизация.

## Architecture
Тот же приём, что у соседних строк: параметр вставляется в ссылку записи из `ENTRIES` перед `&next=` (`set_param`), идемпотентно.

## Security and privacy
Только dev-ссылка сборки разработчика.

## Technical debt
Нет новых: параметр `dev_dialog_mood` уже существует в коде (`dev_dialog_state`), строка лишь не несла его.

## Verification
Загрузка цепочки модулей шагов без исключений, контракты `dev_links_r1_selectors_exist` и `dev_links_r1_contract` по слоту светофора.

## Rollback
git revert коммита.
