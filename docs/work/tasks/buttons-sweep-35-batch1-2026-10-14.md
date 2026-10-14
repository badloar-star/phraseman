# Task packet: №35 батч 1 — кнопки со слабой заливкой контрола → buttonFill (проход по приложению)

Governance-ID: TG-CA1F95ECF5B4
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: R1_BACKLOG_13_16 №35; правило владельца «никакие кнопки вообще чтобы не сливались»

## Outcome

Все кнопки (Pressable / TouchableOpacity / DuoPressable / V2Pressable / PressableHybrid), у которых заливка задана токеном `opaqueControl` (отличие от шторки/карточки 1,2–1,3 : 1), получают токен `buttonFill` (>= 1,6 : 1 к фону, карточке и шторке; подпись text >= 4,6 : 1). Новые кнопки со слабой заливкой не появляются: сторож не даёт числу расти.

## Scope

In scope: атрибуты style/wrapStyle кнопочных тегов в app/** и components/** (58 файлов в первом проходе), экран итога диалога (DialogVerdictScreen), сторож tests/button_fill_sweep_guard.test.ts.

Out of scope: заливка карточек, строк и полей ввода (остаются на opaqueControl); кнопки, чей цвет вычисляется вне атрибута style (общие киты — отдельный батч); серверный код.

## Architecture

No architecture change: один токен кита подставляется вместо другого в стилях; логика, разметка и обработчики не меняются.

## Security and privacy

Данных, прав и сети не затрагивает.

## Technical debt

Contain: сторож с потолком числа кнопок на opaqueControl (только вниз); оставшиеся случаи — общие киты (FriendsGlassKit, LearningV2Glass, CardsGlassKit) — следующим батчем.

## Verification

Автозамена по AST (только `<ident>.opaqueControl` внутри style кнопочных тегов), проверка синтаксиса всего дерева, сторож кнопок × темы, соседние контракты через слот светофора.

## Rollback

git revert коммита батча; замена обратимая (buttonFill → opaqueControl).
Governance-ID: TG-4F3C45789EBD
Governance-ID: TG-4751E8C39895
Governance-ID: TG-E1A01EB5A061
