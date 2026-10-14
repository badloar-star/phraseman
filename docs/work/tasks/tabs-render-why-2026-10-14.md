# Task packet: [TABS-RENDER] — почему разметка вкладок перерисовывается 13–14 раз за один переход (координатор 14.10, [PAYWALL-CLOSE-JS])

Governance-ID: TG-E45EE38EA857
Status: In progress — журнал готов, внести в окно 22:00 вместе с пакетом
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Факт, TAP-LAT Сверки 14.10 (paywall_close_taplat2, pcf2/pcf3):
- переход `dev_state → (tabs)`: Profiler `layout:tabs` 14 рендеров, всего 4,3–5,0 с; отдельные рендеры по 575–665 мс (dev);
- `stack` — ровно столько же (это та же перерисовка, видимая сверху);
- переход `(tabs) → dev_state`: layout:tabs 13–14×, всего 4,6–6,3 с.

Значит, «подвисание» после переходов — каскад перерисовок разметки вкладок (`ReleasedTabLayout` в `app/(tabs)/_layout.tsx`), а не пейвол.

Шаг 1 — логи. На каждой перерисовке `ReleasedTabLayout` строка `[TABS-RENDER] #n t=… changed=…`: какие значения сменились с прошлой перерисовки (старое → новое):
- pathname, segments, studyTarget;
- ширина, ссылка на тему;
- activeIdx, visualIdx, physicalPageIdx, focusTick, devHubVisible;
- размеры visited/mounted, ссылка на router.

«changed=нет» → перерисовал родитель или контекст, которого нет в списке.

Только с флагом `EXPO_PUBLIC_TAP_LATENCY_TRACE=1`, без флага — ноль работы.

Шаг 2 — по фактам: убрать лишние setState / нестабильные ссылки. Цель — 1–2 рендера на переход, ответ < 200 мс.

## Scope

In scope: `app/(tabs)/_layout.tsx` — модульная функция трассировки + один вызов в теле компонента + расширение импорта.
Out of scope: починка до фактов.

## Architecture

Сравнение снимка значений с прошлым рендером. Объекты — по идентичности через WeakMap-счётчик (`#id`). Вывод — `traceLog` модуля TAP-LAT.

## Security and privacy

Только маршруты, индексы, флаги, без данных пользователя.

## Technical debt

- Временная трассировка — снять после починки.

## Verification

Сверка: переход на вкладки и крестик пейвола с флагом TAP-LAT → строки `[TABS-RENDER]`.

## Rollback

`git revert`.
