# Task packet: расхождение «исходник md ≠ собранная копия курса» + отскок меню через safeRouterBack

Governance-ID: TG-28B9EFB14499
Status: In progress
Owner: Learning V2 session; координатор 29.10 (🔴 для 2.0.4 от Ревизора; замечание Дизайна по navigation_back_underlay_contract)

## Outcome

1. Только чтением: сколько сессий, каких уроков и какими коммитами расходятся content/learning-v2-course/sessions/en (md)
   и factory_native/generated_release/en + content/learning-v2-course/release/en. Таблица.
2. Как пересобирается копия: скрипт, по одной сессии или целиком, нужен ли Codex / внешний сервис, грязные ли нужные файлы.
3. Если можно пересобрать изменённые сессии, не трогая грязные файлы Codex и голос, — план, потом сборка; иначе — инструкция для Codex.
4. Отскок меню урока: шаг назад через safeRouterBack (общий сторож navigation_back_underlay_contract), а не прямой router.back().

## Scope

Чтение content/learning-v2-course и generated_release; app/lesson_menu.tsx (одна строка) и сторож отскока.

## Architecture

Приложение читает factory_native/generated_release (манифест + JSON по занятиям); исходник — final.*.md фабрики.

## Security and privacy

Не затрагивается.

## Technical debt

Ручные правки md без пересборки — повторяющийся класс поломки; сторож «md новее сборки» — отдельная задача.

## Verification

Сравнение исходника и сборки по каждой сессии; сторожа курса после пересборки; navigation_back_underlay_contract и сторож отскока.

## Rollback

Revert коммита.
