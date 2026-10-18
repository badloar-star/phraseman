# Task packet: ореол текста от живого блюра на Android — шторки и модалки

Governance-ID: TG-A668979DA167
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: координатор 09:02 (список Сайта, средний риск); прецедент — интро урока (владелец 18.10 08:36, «вот это свечение текста убери»), VideoGlassKit, FlashcardsFilterDropdown

## Outcome

На Android у шторок и модалок нет ореола вокруг текста: dimezis-BlurView без blurTarget снимал экран вместе с текстом панели и клал размытую копию под текст. Живой блюр на Android выключен, тон панели, вуаль, кромка и блик остаются — вид тот же. iOS без изменений.

## Scope

In scope: `components/modal_fx/HybridSheetShell.tsx` (все шторки liquid-glass), `ThemedChoiceModal`, `ThemedConfirmModal`, `NotificationPermissionModal`, `NotificationPermissionModalHybrid`, `ForceUpdateGate`, `OfflineBanner`, `UpdateModal`.

Out of scope: прочие BlurView (вкладки, плитки) — отдельным списком; токены темы не меняются.

## Architecture

No architecture change: BlurView обёрнут условием `Platform.OS !== 'android'`, как в `app/lesson_intro_screens.tsx` и `components/video/VideoGlassKit.tsx`.

## Security and privacy

Не затрагивает: только отрисовка.

## Technical debt

- Pay now: восемь мест с ореолом.
- Defer: если владелец захочет живой блюр на Android — нужен blurTarget (BlurTargetView) на корне экрана.

## Verification

Сторож-тест на исходники (на Android BlurView не рендерится в 8 файлах), прогон через слот; кадры до/после на эмуляторе (шторка, подтверждение).

## Rollback

`git revert` коммита; данных нет.
