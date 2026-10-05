# Task packet: (б) кто тянет вкладки «Уроки»/«Журнал» и Главную на старте — цепочки require в module_eval

Governance-ID: TG-B7324F0089B5
Status: In progress (координатор 05.10: (б) ленивые вкладки lessons/journal; «сперва логи»)
Owner: сессия 1 · ЯДРО

## Outcome

Пакет 07:26: layout.module_eval:total_top — lessons.tsx 321 мс, journal.tsx 321 мс (journal = `export { default } from
'./lessons'`), home.tsx вычислен вместе с импортами корня, хотя (tabs)/_layout держит lessons через ленивый require, а
Главную через import(). Гипотеза — expo-router на старте вычисляет файлы-маршруты; но гадать нельзя. Добавить в отчёт
трекера цепочки «модуль ← кто потребовал ← …» для самых дорогих модулей.

## Scope

app/cold_start_entry_mark.ts (только dev, только трассировка): запоминать первого требователя модуля; в
takeModuleEvalReport поле chains для top-8 по полному времени. Поведение приложения не меняется.

## Architecture

Тот же __SYSTRACE-перехватчик; Map name → parent при первом beginEvent; цепочка до 6 уровней.

## Security and privacy

Только имена модулей.

## Technical debt

Временная трассировка (dev).

## Verification

Синтаксис; строки layout.module_eval:total_top / home_paint.module_eval получают chains; замер 08:26.

## Rollback

git revert коммита.
