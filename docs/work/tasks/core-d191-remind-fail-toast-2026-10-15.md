# Task packet: «Напомнить вечером» — тихий тост, если напоминание не поставилось

Governance-ID: TG-5D03C9AE3D54
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: D191 m03, аудит Optimistic UI (Темы), координатор 14.10

## Outcome

Окно m03 закрывается сразу (оптимистично), напоминание ставится фоном. Если постановка вернула отказ или упала, человек
сейчас уверен, что напоминание есть, а его нет (только журнал [D191-REMIND]). Добавляем тихий тост «Не получилось поставить
напоминание» через общий action_toast (тип info). Оптимистичное закрытие остаётся.

## Scope

In scope: `app/spire/spire_week_remind.ts` (scheduleSpireWeekRemindWithFeedback), `app/spire/use_spire_week_moment.ts`
(хук зовёт её), тест `tests/spire_week_remind.test.ts`.
Out of scope: вид тоста (общий ActionToast), сама постановка.

## Architecture

Обёртка над scheduleSpireWeekRemind: false → emitAppEvent('action_toast', actionToastTri('info', …)) + строка
[D191-REMIND] fail_toast. Текст на 9 языках (тип требует; Пик — ru/uk).

## Security and privacy

Нет данных и разрешений; только локальный тост.

## Technical debt

Contain: текст тоста на 9 языках, хотя Пик пока только ru/uk — тип actionToastTri требует все; при расширении Пика на языки править не нужно.

## Verification

Тест: отказ → тост ровно один раз с ru/uk; успех → тоста нет.

## Rollback

Хук снова зовёт scheduleSpireWeekRemind напрямую.
