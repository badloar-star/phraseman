# Ядро · двойной тап по «назад»: одна защита внутри safeRouterBack (Моменты, Optimistic UI-аудит 26.10)

Governance-ID: TG-9C8B848FBD94
Status: In progress
Owner: 1 · ЯДРО

## Outcome
`safeRouterBack` снимает запись истории на каждый вызов, поэтому второй тап во время перехода уводил на два экрана назад
(V2DoneScreen, lesson_words, lesson_irregular_verbs, preposition_drill — `docs/work/moments-optimistic-ui-2026-10-26.md`).
Теперь повторный вызов, пока переход ещё не дошёл до нового экрана (и не дольше 1 с), пропускается с журналом
`[NAV-BACK] skip reason=double_tap`. Чинить каждый экран не нужно.

## Scope
In scope: `app/navigation_back.ts` (отметка перехода в `safeRouterBack`, снятие в `rememberNavigationPath`), тест.
Out of scope: локальные защиты Моментов (остаются, не мешают), `dismissToTabRoute`, пейволы.

## Architecture
`pendingBack = { at, from, chosen }` ставится перед навигацией. Сбрасывается при первом же `rememberNavigationPath` любого
не-transient маршрута (новый экран пришёл) или по окну 1 с (навигация не случилась — второй тап снова работает).
Законное «назад» с только что открытого экрана не блокируется: его приход уже снял отметку.

## Security and privacy
Не затрагивает данные.

## Technical debt
Нет новой. Локальные защиты от двойного тапа в экранах можно позже убрать (Моменты), но они безвредны.

## Verification
Новый тест: два вызова подряд до прихода — навигация одна; после прихода нового экрана — второй вызов идёт; через 1 с
без прихода — идёт. Все тесты, где зовётся `safeRouterBack`.

## Rollback
Откат коммита.
