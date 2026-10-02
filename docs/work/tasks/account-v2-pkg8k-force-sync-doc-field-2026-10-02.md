# Task packet: Account V2 — Пакет 8K: forceSyncToCloud не кладёт список карточек в документ и уважает замок 8J

Governance-ID: TG-89806EDBBB32
Status: In progress
Owner: Claude session (Account V2, /loop); отмашка координатора §72 («8K сразу после 8J»)

## Outcome

1. `forceSyncToCloud` (app/cloud_sync.ts — перенос при смене устройства / принудительная выгрузка) сейчас пишет `progress.flashcards_v1` (и fr) ЦЕЛИКОМ в документ → заново создаёт затеняющую копию (8H/8H-2), которую restore на другом устройстве берёт вместо страниц. Сделать: карточки идут через `writeFlashcardPages` (как в doSyncToCloud), при успехе в документ — `progress.<ключ> = null` (как 8H-2); при сбое страниц — прежнее поведение (в документ), с логом.
2. Уважать замок 8J: запертый ключ (`readFlashcardPagesWriteLocks`) не пишется ни в страницы, ни в документ; лог `[LEGACY-V2-SYNC] force_sync pages_write_skipped`.
3. 🟡 из ревью 8J: испорченное значение `flashcard_pages_write_lock_v1` (JSON.parse бросает) сейчас запирает все ключи навсегда, а lock/unlock падают на том же разборе. Самопочинка: при ошибке разбора в unlock/lock перезаписать корректным значением (unlock после подтверждённого чтения → пустой набор/removeItem), лог `lock_value_repaired`; read продолжает запирать всё до починки.
4. Сперва логи: `[LEGACY-V2-SYNC] force_sync key=… decision=pages|doc_fallback|locked` без uid.
Проверить ВСЕХ вызывающих forceSyncToCloud и что ещё пишет flashcards_v1 в документ целиком (grep), перечислить в итоге.

## Scope
app/cloud_sync.ts (forceSyncToCloud), app/flashcard_pages_read_result.ts (самопочинка), тесты. Out of scope: прод, деплой.

## Architecture
Единый путь выгрузки карточек для обычной и принудительной синхронизации (общая функция, без дублирования логики 8H-2/8J).

## Security and privacy
Новых данных нет; логи без uid/текста.

## Technical debt
Accept temporarily: параллельный restore и синк без взаимной блокировки (было до 8J).

## Verification
RED→GREEN: «force sync пишет страницы и null в документ», «сбой страниц → документ как раньше», «запертый ключ не пишется», «испорченный замок чинится unlock'ом и после этого запись идёт», «restore после force sync на другом устройстве читает страницы». Мутации; затронутые тесты по одному (restore_lock, read_result, doc_field_clear, legacy_switch, cloud_pages_guard); независимое ревью.

## Rollback
git revert; бэкап `.tmp_pkg8k_backup/`.
