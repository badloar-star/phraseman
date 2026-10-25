# Task packet: «Перевод» у первой реплики сценарного диалога — таблица переводов вне пакета (5 · ВХОД)

Governance-ID: TG-131E20148562
Status: In progress
Owner: 5 · ВХОД И АККАУНТ (координатор 25.10: «Перевести» у каждого сообщения в сценарных — моя зона; только JS, OTA 2.0.2)

## Outcome

Кнопка «Перевод» появляется и у ПЕРВОЙ реплики собеседника в сценарном диалоге (ответы уже переводятся из разбора хода,
f106171a3). Перевод берётся из таблицы в приложении `shared/generated/dialogue_v2_opening_translations.<uiLang>.json`,
а не из пакета: пакеты на сервере закреплены хэшем, а проверка пакета в 2.0.0 требует ровно 2 поля в opening.
Перевод показывается, только если исходник в таблице совпадает с репликой пакета дословно; иначе кнопки нет и журнал
[DIALOG-BUBBLE] reason=no_translation source=opening_table_mismatch. Пока таблица пуста — поведение прежнее.

## Scope

- app/dialogue_v2_opening_translations.ts (новый): ленивая загрузка таблицы текущего языка интерфейса, сверка исходника, журнал.
- app/dialogue_v2_briefing_model.ts: openingOf → сперва content.opening.translations (если когда-то появятся), иначе таблица.
- scripts/dialogue_v2_opening_translations.mjs (новый): `--sources` — выгрузка 304 первых реплик для Переводчика;
  `--build` — сборка таблиц из content/dialogues-v2/ui-copy/opening-translations/<uiLang>.v1.json с проверками.
- tests: dialog_opening_translation_table.

## Architecture

Ключ записи — `<studyTarget>:<scenarioId>`; запись `{ source, text }`. source = текст content.opening.text пакета;
несовпадение = устаревший перевод → не показываем. Таблица — только данные бандла (без сети, без Firestore), файл
текущего языка интерфейса читается один раз за процесс. Язык интерфейса = язык изучения → перевода нет.

## Security and privacy

Только статичный контент приложения. Новых данных о человеке нет.

## Technical debt

Сами переводы (≈300 реплик × 8 языков) делает Переводчик через `--sources` → файлы переводов → `--build`.

## Verification

Тест: совпадение → перевод; несовпадение/нет языка/нет записи → null; модель брифинга отдаёт перевод из таблицы.
Разбор файлов. Сервер не трогается.

## Rollback

git revert.
