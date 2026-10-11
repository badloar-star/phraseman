# Task packet: PM-252 п.1 — удаление аккаунта стирает все ~12 оставшихся персональных коллекций

Governance-ID: TG-94EA8E61CB15
Status: Done — решение координатора 04.10; текст Privacy Policy публикует координатор
Owner: Ядро

## Outcome
Обзор PM-252 нашёл персональные данные, которые переживали удаление аккаунта. Теперь удаление:
- по полю (оба идентификатора): `user_warnings` (uid), `explain_report_entries`, `client_report_rate_limits`, `explain_report_rate_limits`, `premium_dialog_rate_limits`, `premium_dialog_quotas` (stableUid/authUid), `premium_dialog_billing` (uid/authUid), `spire_task_report_reservations` (stableUid), `friend_pairs` (uids array-contains);
- по id документа: `top_helpers/{uid}`, `users_dedup_archive/{uid}`;
- анонимизация на месте: `explain_reports` — убрать reporters.<uid> и lastReporter*; `spire_groups` — убрать members.<uid>, уменьшить liveMemberCount;
- `banned_users/{uid}` — заменить хешем идентификатора в `banned_identity_hashes/{sha256}` (без имени и текста), исходный документ удалить.
Лог каждого нового шага [ACCOUNT-DELETE] с числом документов.

## Scope
functions/src/account_delete.ts, functions/src/account_delete_coverage_gaps.test.ts.

## Architecture
Те же механизмы плана (FIELD_QUERY_SPECS / DIRECT_DOCUMENT_SPECS) и стадий `runDeleteStage` — идемпотентно, повтор задачи безопасен. Запросы по `reporters.<uid>` / `members.<uid>` — на коллекции (не группе), индекс по полю-ключу автоматический (как у friend_gift_daily_limits).

## Security and privacy
Право на удаление: личные данные больше не переживают удаление. Хеш бана — sha256 идентификатора без соли-секрета не нужен: хранится только факт бана для сверки, без имени/текста. Строка для Privacy Policy — координатору.

## Technical debt
id групп Шпиля содержат первые 12 символов stableUid (makeSpireGroupId) — псевдонимный фрагмент; переименование групп не делаем (ломает недельные комнаты), отмечено.

## Verification
Новый тест: план покрывает каждую коллекцию по обоим идентификаторам; анонимизация/хеш на заглушке Firestore; tsc functions; прежние тесты удаления.

## Rollback
Откат коммита (удалённые данные не вернуть — так и задумано).
