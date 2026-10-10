# Task packet: два красных сторожа Ядра — scroll_inertia_contract (87 прокруток) и runes_check_showcase_contract

Governance-ID: TG-B52731EEDED4
Status: In progress
Owner: сессия «2 · Дизайн» (поручение координатора 10.10 05:30)

## Outcome

1. `scroll_inertia_contract` зелёный: правило «каждая обычная прокрутка приложения (кроме Learning V2) задаёт `decelerationRate="fast"`» применено механически, одним проходом по AST; либо, если правило не владельца/не применимо, сторож ослаблен с пояснением.
2. `runes_check_showcase_contract` (recall без строки и `devRunesSeed`) разобран: обновлён сторож или витрина.

## Scope

In scope: добавление одного атрибута на элементы прокрутки (ScrollView/FlatList/SectionList/FlashList/Animated.*/BouncyScrollView), тесты-сторожа. Out of scope: Learning V2, логика экранов, файлы Codex.

## Architecture

Начало правила: контракт из снимка 08.08 (в плане от 08.08 владелец сам правил `decelerationRate` в нескольких местах; документ «карта Learning V2» называет «быстрое» затухание «принятым в проекте приёмом»). В остальном приложении правило соблюдалось; нарушители — новый код 2.0. Правка — кодмод по AST (`C:/Temp/claude/colors/scroll_codemod.js`): вставка ` decelerationRate="fast"` сразу после имени тега, без переформатирования.

## Security and privacy

Не затрагивает данные.

## Technical debt

Contain: механическая правка 85 мест; поведение — только коэффициент затухания инерции.

## Verification

Сам сторож `tests/scroll_inertia_contract.test.ts`, синтаксис всех правленых файлов, узкие контракты по файлам (слот).

## Rollback

Отдельный коммит, `git revert`.

## Результат (10.10 ~23:15)

**1. scroll_inertia_contract.** Происхождение: контракт из снимка 08.08; в планах 08.08 владелец сам правил `decelerationRate` в ряде экранов, документ «карта Learning V2» называет «быстрое» затухание «принятым в проекте приёмом». Явной записи правила владельца нет, но в приложении оно соблюдалось везде, а 85 нарушителей — новые экраны/окна 2.0 (шторки, модалки, Spire, диалоги, карточки). Сторож не ослаблял. Применено кодмодом по AST (`C:/Temp/claude/colors/scroll_codemod.js`): `decelerationRate="fast"` добавлен в КОНЕЦ списка атрибутов 85 элементов в 83 файлах (в начало нельзя — часть сторожей читает исходник regex'ом вида `<ScrollView testID=…`). Общую обёртку не делал: сторож проверяет явный атрибут на каждом элементе, обёртка его не удовлетворяет. Файлы Learning V2 сторож исключает сам. 7 файлов имели чужие незакоммиченные правки — в коммит только мои строки.
Обновлены хэши трёх source-pin сторожей (`flashcards_deck_picker`, `flashcards_speaking`, `survey_unavailable`): изменилась только строка прокрутки (и, у опроса, моя ранняя замена заливки на `KitProgressFill`).
Проверено: `scroll_inertia_contract` (32), все 213 `.mjs`-сторожей прогнаны — красные остались только не мои (`settings_notifications`, `spire_tab_gate`, `theme_hardcoded_colors_ratchet` — чужие NotificationPermissionModalHybrid, `learning_v2_*`, `render_daily_phrase`, `visual_parity_gate`).

**2. runes_check_showcase_contract.** `flashcards_recall_session` зовёт `usePracticeRunes`, но в разделе «Проверка рун» DEV-хаба строки для него не было, а сам экран не умел `devRunesSeed`. Добавлено: строка `runes-check-recall` + подпись в `showcase_copy.ts`; на экране — `devRunesSeed` → `readDevPracticeRunesFakeState` → `devFakeStartRunes`, цифры итога подменяются как у блица. Проверено: `runes_check_showcase_contract`, `fc_recall_session_contract`, `practice_rune_screen_wiring_contract`, `interaction_responsiveness_contract`.
Порядок работы: тяжёлый прогон (5 наборов, 60 тестов) завершился до сообщения координатора про окно полной проверки типов Ядра; после него тяжёлого не запускал.
