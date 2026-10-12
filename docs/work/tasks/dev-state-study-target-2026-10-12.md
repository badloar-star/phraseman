# Task packet: dev_state?studyTarget=… — язык изучения гостя для кадра cards-v2-029 («Нет карточек»)

Governance-ID: TG-1AEBB311AF1E
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: app/dev_state_fixtures.ts, app/dev_fixture_upload_guard.ts, app/study_target.ts, DEV_LINKS_R1.md (cards-v2-029)

## Outcome

В настройке тренировки у гостя с языком изучения en всегда есть стартовая колода «Первые 50» (deck_options.ts), поэтому состояние «Нет карточек» (TrainingSetupV2, status 'empty') недостижимо. У es/de/fr колоды нет — состояние достижимо.
Добавляю dev-параметр `studyTarget=en|es|de|fr`: только dev-сборка и только одноразовый гость (assertDisposableGuest), запись локального ключа языка изучения и событие смены; ключ `study_target_v1` вырезается из выгрузки в облако, пока на госте применена фикстура (как карточки). В стор-сборке параметр отклоняется. Строка cards-v2-029 получает ссылку `studyTarget=es&cards=empty`.

## Scope

In scope: новый app/dev_state_study_target.ts, app/dev_state_fixtures.ts (параметр и шаг), app/dev_fixture_upload_guard.ts (ключ не выгружается), scripts/dev_links_r1_steps.py (cards-v2-029, cards-076), тесты.
Out of scope: пересборка ссылок других строк; изменение логики колод (Ядро).

## Architecture

No architecture change: ещё один шаг dev-фикстуры по образцу существующих, один дополнительный ключ в списке «не выгружать».

## Security and privacy

Только dev-сборка и одноразовый гость; на настоящем аккаунте — отказ (fail-closed). Язык изучения гостя не уходит в облако, пока применена фикстура. Данных пользователей не касается.

## Technical debt

Pay now: состояние недостижимо без подмены.

## Verification

Тест-сторож по исходникам (параметр, гард гостя, ключ не выгружается, строка в ссылках); существующие тесты фикстур и выгрузки; срез типов.

## Rollback

Откат коммита.
