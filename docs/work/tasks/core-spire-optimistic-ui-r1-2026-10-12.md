# Task packet: Шпиль — мгновенный отклик по обзору Дизайна R1 (4 пункта)

Governance-ID: TG-F5490F05CEC7
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10; обзор docs/phraseman-2.0/SPIRE_OPTIMISTIC_UI_REVIEW_R1.md, 2e4ee89ec).

## Outcome
1. «Подняться» при непрогретом пакете недели: экран ступени открывается В ТОТ ЖЕ ТАП в состоянии «Готовим ступень…»
   (то же, что в макете spire-gaps-states, фаза списания), пакет догружается внутри. Сбой — экран закрывается, на
   кнопке прежняя подпись `pack_offline` / `pack_missing` с «Повторить». «Назад» во время загрузки — отмена, поздний
   ответ пакета её не переигрывает. Энергия не трогается до первого задания (как сейчас).
2. `canAnswer()` раннера — по ref (feedback/phase/exitOpen), второй тап в том же кадре после ВЕРНОГО ответа отклонён.
3. Жалоба на задание: если локальная очередь приняла жалобу, а сервер отказал — общий тост «Отправим позже» (видно
   даже если кнопка уже размонтирована). Немой `catch {}` в отправке жалобы — с причиной в журнале.
4. Запись в «Мои ошибки»: три итога (`saved` / `skipped` / `failed`); тихая строка «Не удалось сохранить…» — только
   при настоящем сбое записи, а не при штатном пропуске (пары, «найди лишнее», язык без журнала).

## Scope
In: `app/spire/use_spire_game.ts`, `app/spire/use_spire_step_runner.ts`, `app/spire/spire_mistake_capture.ts`,
`components/spire/SpireStepScreen.tsx`, `components/spire/SpireHomeScreen.tsx`, `components/spire/spire_game_strings.ts`,
`modules/spire/SpireTaskReportButton.tsx`, `modules/spire/spire_report_verdict.ts` (новый, логика тоста без React), `modules/spire/task_report_client.ts`, тест `tests/spire_optimistic_ui_r1.test.ts`.
Out: сервер, энергия, вёрстка задания, новые визуальные элементы сверх существующих стилей.

## Architecture
`useSpireGame` получает `pending` (ctx + оценка бюджета) — модалка ступени видна при `session ?? pending`; тело
`PendingStepBody` рисует `SpireStepLayout` с `preparing`. Отмена — токен `prepId`, поздний ответ сверяется с ним.
Раннер: `feedbackRef` пишется синхронно вместе с `setFeedback`. Ошибка: `spireCaptureMistakeOutcome`. Жалоба:
`actionToastTri('info', …)` через глобальный ActionToast. Логи `[SPIRE]` на каждом новом пути.

## Security and privacy
Новых данных нет; жалоба уже в очереди, тост не несёт текста задания.

## Technical debt
Тихая строка «не сохранилось» и показ «Готовим…» до пакета — нужны в макете spire-gaps-states (Дизайн).
Время на кольце до пакета — оценка; точное подставляется, когда пакет придёт (раскладка не меняется).

## Verification
Тест: `pending` в тот же тап → сессия после пакета; сбой → `startBlock`, модалка закрыта; отмена → поздний пакет
игнорирован; двойной тап после верного ответа; три итога ошибки; тост жалобы. Соседи: spire_game_source_contract,
spire_energy_charge_contract, spire_strings_completeness, spire_task_report_client_contract. Срез типов.

## Rollback
`git revert`.
