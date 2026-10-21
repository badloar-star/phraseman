# Task packet: dev-превью «Собери перевод» Пика в состояниях «заполнено» и «ошибка» для «Сверки»

Governance-ID: TG-66D4BC7C56AE
Status: In progress
Owner: сессия «2 · ДИЗАЙН»
Related epic/enabler: поручение координатора 21.10 («Собери перевод» с ячейками не выпадает на эмуляторе: ступень Пика случайная), эталон `docs/design/v2-app/peak-phrase-builder.html`, вариант A

## Outcome

«Сверка» открывает «Собери перевод» ссылкой в трёх состояниях без тапов и без случайной ступени: пусто (`step_build`, уже есть), заполнено («Проверить» активна) и ошибка (красная ячейка, «Правильно: …» + «Дальше»), и снимает кадры для сравнения с эталоном (`peak_build_*.png`).

## Scope

In scope: два новых dev-состояния `step_build_filled` и `step_build_wrong` в `components/spire/spire_preview_fixtures.ts`; чтение необязательного поля `previewPicked` в начальном состоянии `BuildTask` (`components/spire/SpireTaskView.tsx`) только при `__DEV__`; строка в описании маршрута `app/dev_spire_preview.tsx`.

Out of scope: боевое поведение «Собрать перевод», сервер, пакеты заданий, регенерация таблицы dev-ссылок `DEV_LINKS_R1.md`.

## Architecture

No architecture change: превью-маршрут `/dev_spire_preview?state=…` уже строит ступень из моков теми же компонентами, что в бою; добавляются два мок-состояния и необязательный начальный набор слов. В стор-сборке поле `previewPicked` не читается (условие `__DEV__`), поведение прежнее.

## Security and privacy

Новых данных и разрешений нет, в продакшене код не действует. Privacy Policy не затрагивается.

## Technical debt

Contain: `previewPicked` — dev-шов в боевом компоненте, ограничен `__DEV__` и закрыт тестом; условие выхода — заменить на отдельную обёртку превью, если появится больше состояний с предзаполнением.

## Verification

`tests/spire_preview_new_states.test.ts` и `tests/spire_preview_ready.test.ts` (список состояний), `tests/spire_build_cells.test.tsx`, `tsc` под светофором; скриншоты `peak_build_*.png` снимает «Сверка» или эмулятор по ссылке `/dev_spire_preview?state=step_build_filled` и `…step_build_wrong`.

## Rollback

Откат коммита удаляет два состояния и необязательное поле; боевой экран не затрагивается.
