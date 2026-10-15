# Task packet: «Назад» хаба Карточек без голого router.back()

Governance-ID: TG-4DB6F81D0989
Status: In progress
Owner: 3 · МАКЕТЫ (по поручению координатора 15.10, ~23:15)
Related epic/enabler: c1_video3 (возврат с хаба на ролик), сторож navigation_back_underlay

## Outcome

Сторож `tests/navigation_back_underlay_contract.test.ts` снова зелёный. В хабе Карточек нет голого `router.back()` (было `app/flashcards/FlashcardsHubScreen.tsx:851` после 0dd04ee9f). Поведение c1_video3 сохраняется: «Назад» после тренировки с ролика возвращает к тому же ролику.

## Scope

В объёме: `handleHubBack` в `app/flashcards/FlashcardsHubScreen.tsx` и тип параметров хаба (`returnTo`).
Вне объёма: экран ролика, шторка режимов (da5862532), `app/navigation_back.ts`, сам сторож. Сторож не ослабляем.

## Architecture

После da5862532 ролик открывает окно режимов шторкой прямо на себе (`use_deck_train_sheet`). На хаб с `returnTo: 'video_watch'` его больше никто не ведёт: grep `returnTo` по app — единственное место, сам хаб. Ветка `returnTo === 'video_watch' → router.back()` мертва.
Решение: убрать мёртвую ветку и параметр. «Назад» хаба всегда идёт через `safeRouterBack(router, '/(tabs)/home')`, как до 0dd04ee9f.
Возврат к ролику держится тем, что ролик хаб не открывает. Если кто-то снова откроет хаб из ролика, вернуть ветку можно только через `safeRouterBack` с маршрутом ролика.

## Security and privacy

Не затрагивает: навигация внутри приложения, данных и доступа нет.

## Technical debt

- Pay now: мёртвая ветка с нативным back удалена.

## Verification

- `tests/navigation_back_underlay_contract.test.ts` — зелёный, «N passed».
- `tests/cards_hub_stable_props_contract.test.ts` (`handleHubBack`, `onBack={handleHubBack}`) — зелёный.
- `tests/train_intent_and_video_watch_pack.test.ts` — зелёный.
- Синтаксис .tsx: babel parse.
- Эмулятор, следующий заход Макетов: ролик → «Тренировать» → шторка на ролике → «Назад» = тот же ролик.

## Rollback

`git revert <хэш>`: вернёт ветку с `router.back()` и снова уронит сторож.
