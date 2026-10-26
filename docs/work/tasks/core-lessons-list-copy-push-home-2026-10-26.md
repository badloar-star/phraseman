# Ядро · тап по пушу и плитка «Уроки» — на саму вкладку, не на копию /lessons_list (координатор 26.10)

Status: In progress
Owner: 1 · ЯДРО

## Outcome
Ратчет `tests/lessons_list_copy_ratchet_2026_10_26.test.ts` (6a6ec5ddf) оставлял три места перехода на `/lessons_list` — вторую копию
вкладки «Уроки» поверх стека («назад» показывал список ещё раз). Теперь:
- **тап по пушу** `streak_at_risk` / `inactive_return` / `inactive_long` (`app/notification_tap_handler.ts` — рабочий обработчик из
  корня, и дубль в `app/notifications.ts`) → общий помощник `openLessonsTabFromPush` → `dismissToTabRoute('/(tabs)/lessons')`;
  нет `dismissTo` — `replace`, нет и его — `push` на вкладку. Журнал `[NAV-BACK] push_tap`: тип пуша, `canGoBack`, способ;
- **плитка «Уроки» на Главной при скрытом V2** (`app/(tabs)/home.tsx`, одна строка) → `goToTab(1)`, тем же механизмом, каким Главная
  открывает остальные вкладки (`TAB_IDX`). Без операций со стеком и без нового импорта: правка — ровно одна строка, как разрешил
  координатор.

Ратчет: допуск для трёх файлов — 0.

## Холодный старт с пуша
expo-router 6.0.24: `dismissTo` = событие `POP_TO`. На холодном старте стек = только вкладки, поэтому переход идёт внутри них, без
новой копии; на тёплом снимает экраны поверх вкладок. Это вывод из кода библиотеки, живого прогона в этой задаче нет. Проверка — первый
тап по пушу или dev-имитация `phraseman://dev_state?notif=streak_at_risk` (`simulateNotificationTapForDev`): строка
`[NAV-BACK] push_tap → вкладка «Уроки»` с `canGoBack` и `method`.

## Параметры пуша
В `/lessons_list` пуш параметров не передавал (`replace('/lessons_list')` без `params`) — сохранять нечего.

## Scope
In scope: `app/notification_tap_handler.ts`, `app/notifications.ts`, одна строка `app/(tabs)/home.tsx`, ратчет, перепин
`tests/home_learning_cta_contract.test.ts`, новый `tests/push_tap_lessons_tab_2026_10_26.test.ts`.
Out of scope: `navigation_back.ts` (роль раздела), `modules/today-tasks/today_tasks_view.ts` — остаются в ратчете.

## Architecture
Без изменений: общий `dismissToTabRoute` из `app/navigation_back`.

## Security and privacy
Не затрагивает данные.

## Technical debt
`app/notifications.ts` держит дубль обработчика тапа (рабочий — в `notification_tap_handler.ts`), убрать дубль — отдельно.

## Verification
Новый тест (холодный старт `canGoBack=false` → `dismissTo`; без `dismissTo` → `replace`; без `replace` → `push`; копии нет), ратчет,
перепин плитки, проверка типов приложения.

## Rollback
Откат коммита.
