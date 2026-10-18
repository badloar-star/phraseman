# Task packet: красный navigation_back_underlay_contract — `router.dismissTo` в today_tasks.tsx

Governance-ID: TG-072A524F3C46
Status: In progress
Owner: сессия «2 · ДИЗАЙН» (поручение координатора 18.10 02:41)
Related epic/enabler: контракт «подложка при возврате» (`tests/navigation_back_underlay_contract.test.ts`)

## Outcome

Контракт `allows direct native dismiss only for audited deterministic targets` красный: в `app/today_tasks.tsx:127` прямой вызов `router.dismissTo(task.route)`, а такие вызовы разрешены только в проверенных файлах (`navigation_back.ts`, `flashcards_collection.tsx`, `lesson1.tsx`). Цель: контракт зелёный, журнал [BACK-BTN] остался, поведение «задача-вкладка на “Сегодня” открывает вкладку, а не грузит её под экраном» не изменилось.

## Диагноз

Вызов `router.dismissTo` в «Сегодня» добавлен коммитом e017d8ef7 (17.10 19:19, сессия «Моменты», «задача-вкладка на экране “Сегодня” открывает вкладку»), а не журналами [BACK-BTN] (304e5170e добавил только импорт, `useEffect` шага и `noteBackDecision`; строка сдвинулась до 127). Контракт тогда не гоняли, поэтому красный висел незамеченным.

## Scope

In scope: `app/navigation_back.ts` (новая функция `dismissToTabRoute`: цель всегда `/(tabs)/…`, `dismissTo`, запасной `replace`, журнал `[NAV-BACK] dismiss_to_tab`), `app/today_tasks.tsx` (вызов функции вместо `router.dismissTo`), сторож.

Out of scope: список разрешённых файлов контракта не расширяется, прочие `dismiss` не трогаются.

## Architecture

Прямой `dismissTo` живёт только в `navigation_back.ts` (уже в списке проверенных). `today_tasks` вызывает `dismissToTabRoute(router, route)`; для не-вкладочных маршрутов функция не вызывается (остаётся защищённый `nav.push`). Поведение на устройстве то же: закрыть «Сегодня» и открыть вкладку.

## Security and privacy

Не затрагивается.

## Technical debt

Pay now: прямой `dismissTo` убран из экрана, контракт остаётся строгим без правки списка разрешений.

## Verification

`navigation_back_underlay_contract` + `back_tap_probe_contract`, сторож источника на `dismissToTabRoute`; типы через слот.

## Rollback

Вернуть прямой `router.dismissTo` в `today_tasks.tsx` и добавить файл в список контракта (хуже) либо откатить коммит.
