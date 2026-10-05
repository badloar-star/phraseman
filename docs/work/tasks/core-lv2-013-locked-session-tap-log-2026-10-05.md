# Task packet: learning-v2-013 — тап по закрытому занятию: лог ветки (шаг 1)

Governance-ID: TG-67966A1F0A2A
Status: In progress (Дизайн/координатор 05.10: «сперва лог тапа по закрытому занятию, потом подключи окно»)
Owner: сессия 1 · ЯДРО

## Outcome

Тап по закрытому занятию на вкладке «Уроки» не открывает окно «Закрытое занятие» (learning-v2.html 2.4 modal-locked:
«Занятие N», «Сначала заверши предыдущее занятие.», одна кнопка «Закрыть», без фактов). По коду
(app/(tabs)/lessons.tsx, обработчик тапа сессии): при state ∉ {current, completed} и без dev-разблокировки вызывается
showLearningV2DenialHint(…) и return — окно не ставится; у LearningV2SessionOutcomeSheet проп locked есть, но не
передаётся. Шаг 1 — release-лог этой ветки и соседней «сессия ещё в работе» с решающими значениями.

## Scope

app/(tabs)/lessons.tsx: console.warn [V2-TAP] locked/wip с courseSessionId, state, devUnlock, currentOrdinal. Вид не
меняется. Шаг 2 (подключение окна) — отдельный коммит.

## Architecture

Не меняется.

## Security and privacy

Только id занятия и состояние.

## Technical debt

Новый долг не вносится. Известный: три ранних выхода тапа (Plus, «в работе», закрыто) жили без release-лога — этот шаг
его закрывает; подсказка-тост вместо окна остаётся до шага 2.

## Verification

Сторожа lessons/learning_v2 по месту; синтаксис @babel/parser.

## Rollback

git revert коммита.
