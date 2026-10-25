# Ядро · скрытая вкладка Пика работает во время прокрутки Главной (25.10)

Governance-ID: TG-61C77C89EE0B
Governance-ID: TG-714B3F23E1A3
Governance-ID: TG-107F4924F9AF

## Outcome
Владелец: «скролл стал дёрганым, на главной». Сверка: [PEAK-PERF] home пишет строки, пока открыта Главная.
Когда вкладка Пика не в фокусе, замер кадров [PEAK-PERF] стоит на паузе и возобновляется при возврате, без размонтирования.
Журнал [PEAK-FOCUS] показывает фокус, вкладку-владельца и состояние замера.

## Scope
- app/spire/peak_perf_probe.ts: параметр `active` (по умолчанию true), лог [PEAK-FOCUS] на каждом переключении.
- app/spire/use_peak_perf_probe_on_tab.ts (новый): обёртка с фокусом вкладки, отдельно от замера — его тест не тянет навигацию.
- components/spire/SpireHomeScreen.tsx: active = вкладка 'spire' + экран в фокусе + приложение активно (useRuntimeActive).
- Проверено и НЕ меняется: в сцене Пика нет бесконечных анимаций, кадровых коллбэков и шейдера — только градиенты и таймер 60 с (use_spire_scene_top). В сцене Сезона — таймер 30 с.

## Architecture
Тот же шаблон, что SpireEnergyPill ownerActive / friends useRuntimeActive(runtimeOwnerId === ...).

## Security and privacy
Данных не касается.

## Technical debt
Замер — градусник: «средний кадр 92.8 мс» показывает загрузку JS-потока при прокрутке Главной. Причину на Главной ищем отдельно, логами.

## Verification
Точечные тесты Пика, node --test тестов Пика, проверка типов.

## Rollback
Revert коммита.
