# Task packet: 7 языков Переводчика для строк Learning V2 с новым смыслом + подпись таймаута судьи

Governance-ID: TG-2FDA3F852587
Status: In progress
Owner: Learning V2 session; задача координатора 26.10 (Переводчик 73b9ec696, ff948e123)

## Outcome

Строки, у которых ru/uk поменяли смысл (4a04ededa), получают тот же смысл в en, es, pt-BR, vi, id, tr, pl. Подпись «Не успел разобрать»
(таймаут судьи на короткой фразе, retry) — живой текст на 9 языках вместо моего черновика.

## Scope

app/learning_v2_session_copy.ts (режимы ×3, introCheck, supportFades, captureFailed, audioOfflineHint, repeatedAloud, reportTask,
saveFirstEver, saveFailed, voiceUnavailable), components/speaking_no_speech_copy.ts (retry), modules/learning-v2/modes/mode_feedback_v1.tsx
(неверный вердикт), modules/learning-v2/modes/mode_copy_v1.ts (подсказка карточки), components/learning-v2/learning_v2_task_body_copy.ts
(answer), app/learning_v2_direct_session_player_v1.tsx («Твой ответ»). Отдельный коммит на файл; файлы, ещё стоящие в очереди коммитов,
правлю только после того, как их коммит ляжет.

## Architecture

Только строки; форматы подстановок прежние (introCheck — «3» как было).

## Security and privacy

Нет данных.

## Technical debt

Названия раздела «Карточки» в 7 языках взяты из таблицы Переводчика; сверить с подписью вкладки при следующей сверке текстов.

## Verification

Тесты файлов (session_copy, mode_feedback, speaking_honest), сторож запрещённых фраз голоса, проверка типов.

## Rollback

Revert коммитов по файлам.
