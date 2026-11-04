# Task packet: параметр маршрута ?focus=series для Статистики

Governance-ID: TG-FEE9E1D595F6
Status: In progress
Owner: сессия «Темы»
Related epic/enabler: TG-BF3C25346EA3 (раунд 2 UX)

## Outcome

Экран Статистики умеет открываться с раскрытым блоком «Серия»: маршрут `/streak_stats?focus=series`. Шапка Главной (сессия Моментов) ведёт в блок серии. Успех: по ссылке блок «Серия» раскрыт при первом кадре.

## Scope

In scope: app/streak_stats.tsx (новый параметр focus, эффект раскрытия блока), tests/streak_stats_focus_contract.test.ts.

Out of scope: сама шапка Главной (Моменты), прокрутка до блока (следующий шаг), остальные параметры.

## Architecture

Граница: expo-router useLocalSearchParams, уже используется для qa365. Раскрытие — существующее состояние seriesOpen, без новых перерисовок в кадре.

## Security and privacy

Не применимо: параметр не содержит персональных данных и не передаётся наружу.

## Technical debt

- Прокрутка к блоку не сделана: Contain — только раскрытие; выход — отдельный шаг, если Моменты попросят.

## Verification

- Тест-сторож: параметр focus объявлен, эффект ставит seriesOpen при focus === 'series'.
- Проверка типов по файлу, связанные тесты статистики зелёные.

## Rollback

git revert коммита; параметр перестанет действовать, экран работает как раньше.
