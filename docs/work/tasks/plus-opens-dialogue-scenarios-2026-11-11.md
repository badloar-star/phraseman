# Task packet: Plus открывает все сценарии диалогов сразу

Governance-ID: TG-2618E8D371A9
Status: In progress (код и тесты написаны, прогон ждёт слот светофора)
Owner: сессия Claude «аудит мотивации к покупке Plus», 2026-11-11
Related epic/enabler: аудит мотивации к покупке Plus; пейвол «Два пути»

## Outcome

Подписчик Plus видит открытыми и может начать любой сценарий диалогов без нужного ранга монеты. Бесплатный аккаунт
по-прежнему открывает сценарии рангами. Обещание экрана покупки «Сценарии: по рангу / все сразу» и текст окна
`dialog_locked_level` («Plus откроет все сразу») становятся правдой.

Решение владельца 2026-11-11 (ответ «Открыть сценарии Плюсу» на вопрос сессии) — **D204**, отменяет часть «только
ранг» из D124 и строку «замков Plus в каталоге нет» в D185 для подписчиков. В `docs/phraseman-2.0/03_DECISIONS.md`
запись НЕ внесена: файл лежит в индексе git с правками другой сессии (D203). Внести строку D204, когда файл освободится.

## Scope

In scope:
- `shared/dialogue_v2_access_contract.ts` — единственное правило: ранг ИЛИ `hasPremiumAccess === true`.
- Обёртки: `app/dialogue_v2_local_rank_access.ts`, `app/ai_dialog_level_lock.ts` (третий аргумент `hasPremiumAccess`).
- Проекции и модель: `app/dialogue_v2_authorized_catalogue_projection.ts`,
  `app/dialogue_v2_released_catalogue_projection.ts`, `app/dialogue_v2_briefing_model.ts`.
- Экраны: `app/dialogue_v2_briefing.tsx`, `app/dialogue_v2_session.tsx`, `app/ai_dialog_briefing.tsx`,
  `components/DialogsTabContent.tsx`, `components/dialogs/DialogueV2CatalogueContainer.tsx`,
  `components/dialogs/hub/use_dialogue_v2_hub_catalogue.ts`, `components/dialogs/scene/use_dialogs_scene_hub.ts`.
- Тесты: `tests/dialogue_v2_access_contract.test.ts`, `tests/dialogue_v2_local_rank_access.test.ts`,
  `tests/free_daily_limits_contract.test.ts`, `tests/ai_dialog_briefing_contract.test.ts`.

Out of scope:
- Сервер: `functions/src/dialogue_v2_server_authorization.ts` ранг не проверяет (проверяет целостность релиза),
  правка не нужна.
- Нажатие бесплатного на закрытый сценарий по-прежнему показывает «Откроется на ранге N», а не окно Plus —
  смена поведения требует макета и слова владельца.
- Тексты `app/paywall_copy.ts` («Сценарий откроется на ранге монеты») не менялись: для бесплатного они верны.
- Покупки сценариев за руны по-прежнему ничего не открывают.

## Architecture

Правило доступа осталось в одном месте — `decideDialogueV2ScenarioAccess`. Признак подписки приходит от экрана
(`usePremium().hasPremiumAccess`) аргументом, чистые модули контекст не читают. Плитка каталога, нажатие, экран
подготовки и сама сессия получают один и тот же признак, поэтому не могут разойтись. Строгое `=== true`:
неразрешённый или мусорный признак сценарий не открывает. Строка с некорректным рангом каталога закрыта для всех.

## Security and privacy

Новых данных нет. Ранг и раньше проверялся только на телефоне; платные ограничения (месячная квота ответов,
разбор диалога) по-прежнему проверяет сервер. Подделка признака Plus на телефоне даёт только раньше открытый
сценарий, а не платные серверные функции.

## Technical debt

- Contain: запись D204 в журнал решений отложена до освобождения файла другой сессией; exit — строка D204 в
  `03_DECISIONS.md`. Номер зафиксирован в комментариях кода и в этом пакете.
- Accept temporarily: закрытая плитка у бесплатного не продаёт Plus (алерт с рангом). Владелец решения — владелец
  продукта; пересмотр вместе с макетами мотивации.

## Verification

`npm run test:one -- tests/dialogue_v2_access_contract.test.ts tests/dialogue_v2_local_rank_access.test.ts
tests/free_daily_limits_contract.test.ts tests/ai_dialog_briefing_contract.test.ts tests/ai_dialog_level_lock.test.ts
tests/dialogue_v2_unlock_rank_table.test.ts tests/dialogue_v2_new_user_one_dialog.test.ts tests/dialogue_rank_shift.test.ts
tests/ai_dialog_daily_limit_wiring_contract.test.ts tests/ai_dialog_lifetime_gate_contract.test.ts
tests/ai_dialog_entitlement_readiness_contract.test.ts tests/dialogue_v2_released_catalogue_projection.test.ts
tests/dialogs_hub_theme_screen_2026_10_22.test.ts` — смотреть ТЕКСТ вывода, не код возврата.

Вручную на устройстве: аккаунт с Plus и рангом 0 — все плитки без замка, сценарий ранга 19 запускается;
бесплатный с рангом 0 — открыт один сценарий, остальные «Откроется на ранге N». Журнал `[DIALOG-RANK-GATE]`
и `[DIALOG-GATE]` (в нём теперь есть `plus=`).

## Rollback

`git revert` коммита. Данных пользователя правка не трогает; после отката Plus снова открывает сценарии только рангом.
