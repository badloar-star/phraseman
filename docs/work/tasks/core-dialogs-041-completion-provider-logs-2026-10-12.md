# Task packet: dialogs-041 — «Итог пока недоступен» через 20 с: причина отказа модели в журнал (сперва логи)

Governance-ID: TG-2F354A07279A
Status: In progress
Owner: сессия «1 · Ядро». Координатор 12.10: «Строки реестра a_code_defect в твоей зоне — разобрать и починить, „id → что сделал“».
dialogs-041: «completion:run → failed reason=dialogue_v2_completion_unavailable, ms 20054».

## Outcome
- functions/src/dialogue_v2_session_complete_callable.ts: немой catch генератора итога (`catch { throw … provider_failed }`)
  терял причину. Теперь `[DIALOGUE-V2-COMPLETE] provider_failed` печатает reason (completion_provider_deadline /
  completion_provider_failed / completion_context_expired / completion_provider_unavailable / сеть), elapsedMs, модель, HTTP-код,
  число реплик, max_tokens. Поведение не меняется (тот же отказ).
- Остальные части строк: серия после полуночи — уже 7930c1b25 (переснять); dialogs-038 обрыв на 2-й реплике — b7c1fd1e8 на
  сервере (выкладка DEPLOY_MORNING); тост поверх «Готово», клавиатура — вёрстка (Дизайн).

## Scope
In: один серверный файл (лог). Out: изменение срока/модели (после логов), деплой (владелец/координатор).

## Architecture
Переменные этапа внутри генератора; лог в catch перед прежним throw.

## Security and privacy
В лог не уходит ни текст реплик, ни ключ — только длины, коды и имя модели.

## Technical debt
Нет.

## Verification
Тесты functions dialogue_v2_session_complete*; babel_check.

## Rollback
`git revert`.
