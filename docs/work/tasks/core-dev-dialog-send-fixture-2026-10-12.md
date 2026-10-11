# Task packet: dev-фикстура dev_dialog_send — ответ хода Диалога без ИИ и без Firestore

Governance-ID: TG-9B0529899F51
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10: Сверка не может проверить «N/30» из 076ab7aae — ход = реальный ИИ на проде).

## Outcome
`phraseman://dev_state?dev_dialog_send=ok|quota_exhausted|network|service|off` — флаг в памяти процесса. Пока он стоит:
старт сессии отдаёт подставной `d2s_dev…` без сети (иначе пишется документ сессии в прод), ход ждёт ~1,5 с и
возвращает подставной ответ: `ok` — одна реплика и остаток = зеркало − 1 (цифра «N/30» подтверждается без прыжка),
`quota_exhausted` / `network` / `service` — соответствующий отказ (откат пилюли / экран лимита). ИИ и Firestore не
вызываются. «Лимит исчерпан» из фикстуры не записывается в зеркало (иначе тестовый аккаунт застрял бы до конца месяца).
Только `__DEV__ && !IS_STORE_RELEASE`.

## Scope
In: `app/dev_dialog_state.ts` (флаг send), новый `app/dev_dialog_send.ts` (чистая логика итога), 
`app/dialogue_v2_turn_coaching_client.ts` (подмена хода), `app/dialogue_v2_turn_client.ts` (подмена старта),
`hooks/use_dialogue_v2_session_coaching.ts` (не писать «исчерпан» от фикстуры), `app/dev_state_fixtures.ts`
(разбор параметра — только мой кусок, чужие правки в файле не коммитятся), тест.
Out: сервер, DEV_LINKS (перегенерирует Дизайн).

## Architecture
`resolveDevDialogSend(mode, {readQuota, wait})` → `{kind:'reply', remaining, resetAtMs} | {kind:'fail', reason}`; клиент
хода строит ответ/ошибку сам (без кольцевого импорта). Логи `[DEV-STATE] dialogs: send=…`.

## Security and privacy
Без данных; в стор-сборке геттер всегда null.

## Technical debt
Завершение диалога (`dialogueV2SessionComplete`) с подставной сессией получит отказ сервера — для кадров «N/30» не нужно.

## Verification
Тест: старт без сети; ok → остаток зеркало−1 после задержки; отказы; стор-сборка выключена; «исчерпан» не пишется.

## Rollback
`git revert`.
