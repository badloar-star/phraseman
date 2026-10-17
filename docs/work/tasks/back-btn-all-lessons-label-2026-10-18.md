# Task packet: [BACK-BTN] метка на круглой «назад» экрана «Все уроки»

Governance-ID: TG-E5DBFD70320B
Status: In progress
Owner: сессия «2 · ДИЗАЙН» (поручение координатора 18.10, находка Сверки)
Related epic/enabler: [BACK-BTN], `docs/work/tasks/back-button-unify-2026-10-17.md`

## Outcome

Сверка прошла путь «карта → Все уроки → назад»: возврат работает, но в журнале нет метки этого экрана (только запись карты). Цель: на «Все уроки» круглая «назад» пишет `tap → decision → interactions-free → frame → arrived`, как «Сегодня» и вкладка «Обучение». Это журнал, поведение не меняется.

## Scope

In scope: `components/learning-v2/LearningV2ChaptersCourse.tsx` — `noteBackTap` + `noteBackDecision` на нажатии стрелки, `noteBackArrived` эффектом при закрытии экрана «Все уроки»; сторож `tests/back_btn_all_lessons_label.test.mjs`.

Out of scope: сама навигация, стрелка классического списка (метка уже есть, 385 мс), другие экраны.

## Architecture

No architecture change: общая проба `app/back_tap_probe.ts` уже обслуживает вкладку «Обучение» и «Сегодня». Эффект «прибыли» объявлен до условного `return` компонента, чтобы порядок хуков не зависел от состояния; без нажатия проба ничего не пишет.

## Security and privacy

Данные пользователя не затрагиваются, пишутся имя экрана и миллисекунды.

## Technical debt

Contain: метки временные по назначению, лёгкую часть оставить после закрытия [BACK-BTN]; owner — Дизайн.

## Verification

Сторож по исходнику; сторожа главы курса V2 (`learning_v2_chapters_*`); заход Сверки: карта → «Все уроки» → «назад», `grep "[BACK-BTN]"`.

## Rollback

Откат коммита: три строки в одном компоненте, поведение не меняется.
