# Task packet: мягкий апселл на итоге урока вернулся на экран 2.0 (paywalls-009/010)

Governance-ID: TG-47DF698A3442
Status: In progress
Owner: Ядро (сессия 1)
Related: координатор 13.10 (контракт lesson_complete_soft_upsell_contract красный на HEAD); макет docs/design/v2-app/embedded-plus-states.html экраны 2–3

## Outcome

Факт: карточка «Первый урок — готово» / «Три урока — отличный старт» жила только в старом варианте итога урока, который выключен
(`legacyCompletionSurfacesEnabled = false`), а условие показа ждало `seqDone`, который ставит лишь старая секвенция. На экране 2.0
предложение Plus не показывалось никогда. Макет (приказ владельца 11.10) требует карточку на результате → потеряно случайно, возвращаем:
карточка — первой во вставке V2DoneScreen, решение по `sequenceShowing`, вставка с плавным переходом, логи [LESSON-SOFT-UPSELL].
Контракт обновлён: ищет рендер на экране 2.0, а не имя из старого варианта (переименование 7a79d3519, dev-подмена upsell=).

## Scope

In scope: app/lesson_complete.tsx (рендер, решение показа, логи), tests/lesson_complete_soft_upsell_contract.test.ts.
Out of scope: components/completion/V2DoneScreen.tsx (не трогаем — используем существующую вставку), сама карточка, кулдауны.

## Architecture

No architecture change: та же useSoftUpsellOpportunity, те же обработчики показа/закрытия/CTA.

## Security and privacy

Не касается данных: отметки показа/закрытия — прежние локальные.

## Technical debt

- Старый вариант итога (legacy) остаётся мёртвым кодом — вычистка отдельной задачей.

## Verification

Контракт + lesson_complete_soft_upsell_behavior; робот paywalls-009/010 (`upsell=first_lesson|three_lessons`).

## Rollback

Откат коммита.
