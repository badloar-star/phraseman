# Task packet: курсор повтора завершений Learning V2 держит замок аккаунта 3,4 с на холодном старте

Governance-ID: TG-D9114F82BD06
Status: In progress (логи; правка — только после «ок» координатора)
Owner: сессия 1 · ЯДРО (координатор 05.10, пакет замеров 00:30)

## Outcome

Пакет 00:30: [ACCOUNT-LOCK] hold_exceeded 3394 мс — withExactActiveScope <- persistLearningV2CompletionRetryCursor
<- reserveAttempt; за ним 3,3–3,5 с ждут восстановление кошелька и др. Понять по фактам, что занимает время под
замком (вычисление scope-хеша, getItem/setItem/проверочный getItem, разбор), затем предложить правку.

## Scope

app/learning_v2_completion_retry_cursor.ts — только диагностика: [LV2-RETRY-CURSOR] slow {op, totalMs, stages}
внутри withExactActiveScope и шагов persist/load/clear, пишется только если дольше 300 мс. Поведение не меняется.

## Architecture

Автор файлов — сессии Claude (не Codex): 4792f3e59, 519de9ff0, 15ab53c96.

## Security and privacy

В логах только длительности и названия шагов; без scope-хеша и uid.

## Technical debt

Трассу убрать после правки; логи на выходах оставить.

## Verification

Тесты learning_v2_completion_*; холодный старт у координатора.

## Rollback

git revert.
