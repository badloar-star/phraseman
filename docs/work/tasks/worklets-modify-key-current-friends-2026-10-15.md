# «Друзья»: `[Worklets] Tried to modify key current of an object which has been already passed to a worklet` ×2 каждые 0,5 с — источник найден (Макеты 15.10)

Governance-ID: TG-376251DB72F1

## Outcome
Журнал Макетов (full_check/c1_r70r60/r55_worklets_log.txt): после закрытия шторки «Добавить друга» на вкладке «Друзья» поток предупреждений Worklets (63 строки за ~20 с, по две каждые 0,5 с) — лишняя работа на каждый рендер и вывод в журнал. Причина: коллбэк завершения `withTiming(... , (finished) => { if (finished) runOnJS(handleCloseRef.current)(); })` — worklet. Выражение `handleCloseRef.current` вычисляется ВНУТРИ worklet, поэтому сам ref-объект попадает в worklet и становится неизменяемым; а в теле компонента на каждом рендере стоит `handleCloseRef.current = onClose` — после первого закрытия шторки каждое такое присваивание пишет предупреждение. «Друзья» перерисовываются дважды за 0,5 с (чужой тик) — отсюда частота.

## Scope
Тот же шаблон в 7 компонентах: `FriendsAddSheetShell`, `centered_dialog_shell`, `DialogHowToSaySheet`, `ExplainSheet`, `MistakeEli5Modal`, `referral_sheet_shell`, `RegistrationPromptModal` (`handleLaterRef`). Сторож `tests/no_ref_captured_by_worklet.test.ts`.

## Architecture
Рядом с присваиванием ref создаётся стабильная функция `const invokeHandleClose = useCallback(() => { handleCloseRef.current(); }, []);` и в worklet уходит она: `runOnJS(invokeHandleClose)()`. Ref остаётся обычным JS-объектом — присваивание в рендере больше не предупреждает; закрытие по-прежнему вызывает самый свежий `onClose`. Зависимости `useCallback` с `animateOut/dismissSheet` дополнены.

## Security and privacy
Данные не затрагиваются.

## Technical debt
Почему «Друзья» перерисовываются дважды за 0,5 с — отдельный вопрос (источник тика не искал); после этого фикса лишняя работа в журнале и UI-потоке на каждый такой рендер исчезает, но сами перерисовки остаются предметом замера (`[TABS-RENDER]`/`[HOME-RENDERS]`).

## Verification
Сторож: нет `runOnJS(xxxRef.current)` во всём коде; семь файлов зовут стабильную функцию. Тесты смежных компонентов (explain_sheet 42, регистрация 8+3) и типы. Живая проверка: открыть и закрыть «Добавить друга», смотреть журнал вкладки «Друзья» ~20 с — предупреждений Worklets нет.

## Rollback
Откат коммита.
