# Task packet: трассировка Диалогов — [DIALOG-SUMMARY] (dialogs-041) и [DIALOG-END] (dialogs-038), без починки

Governance-ID: TG-71B8CF293B9E
Status: Done (33 теста, срез типов 0); починка — по журналу Сверки
Owner: сессия «1 · Ядро» (координатор 12.10, вставка «сперва логи»: «Не чини — поставь трассировку»).

## Outcome
Кандидаты в дефекты по макетам (1086eddc7, R1_CODE_DEFECTS_FROM_PARITY.md): dialogs-041 — итог диалога не грузится,
серия не выросла после полуночи; dialogs-038 — диалог завершился после 2-й реплики при невыполненных целях. Кадры
старые (05.10), Сверка переснимет. Трасса покажет:
- [DIALOG-SUMMARY]: вход экрана итога (id сессии, сценарий, endedBy, реплик, есть ли локальный разбор ходов), источник
  итога (сеть — кэша у итога нет; разбор ходов — память процесса), ответ (оценка, целей выполнено/всего, replayed),
  длительность, каждый return/catch; запрос серии за диалог — локальный ключ дня и решающее значение (learnerTurns>0).
  Дальше по цепочке уже пишут [TODAY-TASKS] → [STREAK-DAY] → [STREAK] (today, lastActive, relation, ветка).
- [DIALOG-END]: на каждом ходе — номер реплики ученика, dialogueEnded, activeObjectiveId и цели с состоянием
  (пройдена/текущая/впереди по позиции активной цели); при открытии итога — какое условие завершило (bot / manual /
  limit), нижняя панель, сколько целей не дошло.

## Scope
In: `app/dialogue_v2_completion.tsx`, `app/dialogue_v2_session.tsx` (только строки лога и ref счётчика реплик).
Out: `app/dialogue_v2_session_outcome_store.ts` и `dialogue_v2_authorized_catalogue_projection.ts` — в работе у
Дизайна (лог серии — рядом с вызовом, в session.tsx); сервер; любая починка.

## Architecture
console.log под `__DEV__` (dev-шум), catch — console.warn всегда. Номер реплики — ref от текущих сообщений (замыкание
appendReplies отстаёт на одну отрисовку).

## Security and privacy
В лог — id сессии (обрезанный), id сценария и целей, числа, статусы; без текста реплик и uid.

## Technical debt
После диагноза временные строки [DIALOG-END] на каждом ходе убрать, строки на ранних выходах и в catch оставить.

## Verification
babel_check; точечные тесты dialogue_v2_session_route, dialogue_v2_quota_optimistic, dialogue_completion*;
срез типов по двум файлам. Бой — журнал Сверки.

## Rollback
`git revert`.
