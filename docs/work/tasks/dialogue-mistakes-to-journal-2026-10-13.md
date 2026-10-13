# Task packet: ошибки диалога попадают в «Мои ошибки» (вид 'dialogue')

Governance-ID: TG-2B412E06E396
Status: In progress
Owner: Ядро (сессия 1)
Related: владелец 13.10 10:45 через координатора — «Да, пусть попадают в Мои ошибки»; Дизайн рисует «Добить: Ещё учу (N)»

## Outcome

- Поправки «было → стало» с итога диалога V2 (разбор каждого хода, app/dialogue_v2_session_outcome_store.ts; без него —
  заметка итогового ревью) записываются в локальный журнал ошибок как вид 'dialogue':
  sourceId = sessionId:номер, задание = фраза ученика, ответ = исправленная фраза, грань 'form' →
  журнал сам выбирает «собери» (builder) и «напиши» (typing).
- Итог диалога получает mistakeIds записанных ошибок и обработчик «Добить» (переход на /mistake_practice_session с этими id),
  как у итога урока (lesson_complete.tsx finishMistakes). Кнопку рисует Дизайн.
- Журнал [DIALOG-MISTAKES]: вход, пропуски с причиной, каждый catch, итог.

## Scope

In scope: modules/mistake-practice/contracts.ts (вид 'dialogue'), app/mistake_practice_insights.ts (группа «другое»),
app/dialogue_v2_mistake_capture.ts (новый), hooks/useDialogueV2MistakeCapture.ts (новый), app/dialogue_v2_completion.tsx
(вызов хука), тест tests/dialogue_v2_mistake_capture.test.ts.
Out of scope: вёрстка кнопки (Дизайн), серверные функции (сервер вид ошибки не проверяет — синк примет как есть), деплой.

## Architecture

No architecture change: тот же журнал (mistake_practice_store), тот же синк progress_events, тот же экран отработки.

## Security and privacy

В журнал кладётся фраза ученика из диалога (given ≤ 200 знаков, как у остальных ошибок) — синкается в users/{uid}/progress_events
и стирается с аккаунтом. Политика уже описывает хранение ответов ученика в журнале ошибок (вариант А 04.10) — проверить
при сверке политики, что «ответы в упражнениях» покрывают и реплики диалога.

## Technical debt

- Пояснение поправки (почему так) в запись не кладётся: у разбора хода его нет; при желании — отдельное поле позже.

## Verification

Тест сборки попыток (пропуски, лимит, id, грань); babel-проверка синтаксиса; эмулятор — диалог с ошибкой → «Мои ошибки».

## Rollback

Откат коммитов: старые записи вида 'dialogue' остаются в журнале и группе «другое», отработка их не ломает.
