# Task packet: крестик пейвола из брифинга диалога ведёт на Главную, а не обратно на брифинг (Сверка 14.10, evidence/no_energy_plus)

Governance-ID: TG-03E6814D0757
Governance-ID: TG-24320AACB1C6
Status: In progress — сторож написан; правка app/navigation_back.ts после окна эмулятора
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Факт (3 из 3, 20:05–20:09):
- тап «Получить Plus» → пейвол открылся ✓;
- крестик → журнал `[NAV-BACK] candidate:reset reason=leaving_no_section leaving=/premium_modal` → `chosen=/(tabs)/home branch=dismissTo`;
- человек оказывается на Главной, брифинг снят.

Причина (код `app/navigation_back.ts`):
- `/dialogue_v2_briefing` нет ни в корнях разделов, ни в дочерних, ни в порталах → роль `unknown`, раздел null;
- `rememberEntry` обнуляет историю на нём;
- пейвол-портал наследует пустой раздел;
- выход из пейвола сбрасывает историю и уходит на Главную через dismissTo, снимая брифинг.

Почему сторож underlay этого не поймал: он проверяет только экраны, записанные `<Stack.Screen>` в `_layout`, а брифинга там нет.

Починка: `fixedChildSection` → `/dialogue_v2_briefing` = раздел `dialogs`. Сессия, итог и память диалога не меняются: у них своя навигация, и прежнее «изолированное» поведение для них остаётся.

## Scope

In scope: одна ветка в `fixedChildSection` + сторож `tests/navigation_back_dialogs_briefing_paywall.test.ts`.
Out of scope: остальные экраны dialogue_v2_*.

## Architecture

Брифинг — дочерний экран раздела «Диалоги»:
- со списка диалогов история сохраняется, пейвол наследует раздел, крестик → `dismiss(1)` на брифинг;
- если брифинг открыт из другого раздела, дочерний экран чужого раздела начинает изолированный отрезок — как сейчас;
- «Позже» по-прежнему уходит на `/ai_dialog_home`.

## Security and privacy

Не касается.

## Technical debt

- `/dialogue_v2_session`, `_completion`, `_memory` тоже без роли. Оставлены намеренно: поведение «назад» внутри диалога — отдельный разговор.

## Verification

- Сторож: роль брифинга; крестик пейвола из брифинга → `dismiss(1)`; «Позже» → `/ai_dialog_home`.
- Соседние: `navigation_back.test.ts`, `navigation_back_underlay_contract`.
- Сверка: Диалоги → Plus → крестик → брифинг ×3.

## Rollback

`git revert`.
