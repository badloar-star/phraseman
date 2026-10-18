# Task packet: закрытие пейвола = только шторка, экран под ней остаётся

Governance-ID: TG-088367E61247
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: владелец через координатора 09:58 — «закрывает ТОЛЬКО шторку paywall, а вместе с ней закрывается урок/диалог/тренировка — так не должно быть».

## Outcome

Крестик или «назад» на пейволе поверх урока Learning V2, сессии, свободного разговора, памяти или итога Диалогов закрывает только пейвол, экран под ним остаётся.

Факты до починки — временный зонд `tests/zz_paywall_close_probe.test.ts`, не коммитится. В 19 случаях из 132 (4 точки входа × 33 экрана) `dismissPaywallModal` шёл в `dismissTo('/(tabs)/home')`:
- `/learning-v2/session/*` — одноразовый экран вычищался из истории, `reason=no_candidate`;
- `/dialogue_v2_session`, `/dialogue_v2_freeform`, `/dialogue_v2_memory`, `/dialogue_v2_completion` — без раздела, `reason=leaving_no_section`.

## Scope

В работе:
- app/navigation_back.ts — `dismissPaywallModal` плюс лог `[PAYWALL-CLOSE]`;
- тест-сторож tests/paywall_close_keeps_underlying_screen.test.ts.

Вне работы:
- ветка `shouldReplace` (пейвол заменил экран);
- пейвол поверх вкладки — там ветки, найденные 14.10 по `[PAYWALL-CLOSE-FREEZE]`, не трогаются.

## Architecture

До `popBackCandidate` определяется экран ПОД пейволом: запись истории ниже верхней записи `/premium_modal`. Ветка `dismiss(1)` выбирается, если выполнено всё сразу:
- экран под пейволом есть;
- он не вкладка (role ≠ root);
- нет `shouldReplace`;
- `router.canDismiss() === true`.

В этой ветке из истории снимается только запись пейвола. Остальные случаи идут прежней логикой.

## Security and privacy

Не затрагивает.

## Technical debt

Contain: разделы для экранов Диалогов V2 в карте навигации не назначены. Проблему закрывает ветка «экран под пейволом», карта разделов остаётся как есть. Владелец карты — раздел Диалогов, пересмотр после релиза.

## Verification

- Зонд: плохих 0 из 132.
- Сторож на урок V2, сессию и свободный разговор Диалогов.
- Прежние тесты navigation_back*, paywall_navigation_smooth_contract, navigation_back_dialogs_briefing_paywall.

## Rollback

Ревертнуть коммит.
