# Task packet: кнопка «V2» во вкладке «Уроки» скрыта в стор-сборке

Governance-ID: TG-D4BAC4C806A1
Status: In progress
Owner: 1 · ЯДРО
Related epic/enabler: релизный пол Learning V2 (26e6d909d, router.ctx.js), координатор 23:25, practice-027

## Outcome

В магазинной сборке человек не может попасть в тупик «неизвестный маршрут»: кнопка «V2» в переключателе страниц
вкладки «Уроки» показывается только там, где курс можно открыть (`LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY =
!IS_STORE_RELEASE`). В дев/внутренних сборках — как прежде.

## Scope

In scope: `app/(tabs)/lessons.tsx` — условие вокруг `TabUnderlineButton label="V2"` (одна обёртка);
`tests/lessons_entry_opens_legacy_guard.test.ts` — сторож проверяет само условие у кнопки.

Out of scope: карта Learning V2, шторка занятия, маршруты, реестр сверки (practice-027 переводит координатор).

## Architecture

No architecture change: та же константа, что уже закрывает чип «Новые уроки» (26e6d909d). Причина дефекта —
1d70c8fc5 (19.09) снял `ENABLE_DEV_TOOLS` с кнопки, а релизный пол 10.10 закрыл только чип.

## Security and privacy

Нет влияния: видимость кнопки навигации, без данных.

## Technical debt

Pay now: сторож считал вызовы `setPage("v2")` и не видел снятого условия — теперь проверяет обёртку кнопки.

## Verification

babel_check, точечная проверка типов по lessons.tsx, сторож `lessons_entry_opens_legacy_guard` (jest, слот).

## Rollback

`git revert` — кнопка снова видна во всех сборках (возвращает дефект магазинной сборки).
