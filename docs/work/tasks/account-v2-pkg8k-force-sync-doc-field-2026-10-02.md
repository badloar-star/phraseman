# Task packet: Account V2 — Пакет 8K: forceSyncToCloud не кладёт список карточек в документ и уважает замок 8J

Governance-ID: TG-89806EDBBB32
Governance-ID: TG-82B1F45BF637
Governance-ID: TG-CEFFFD5DBF30
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

## Итог исполнителя (2026-10-02)

**Что сделано (пункты 1–4):**
1. Единый путь выгрузки карточек — новый модуль `app/flashcards_cloud_upload.ts`:
   `uploadFlashcardListsToPages({ uid, data, previousSnapshot, mode: 'sync'|'force', isCurrent })`
   (страницы 8H → `progress.<ключ> = null` по 8H-2 → замок 8J), плюс
   `buildDocProgressWithoutFlashcardLists` и `buildForceSyncSnapshot`. Логика 8H-2/8J из
   `doSyncToCloud` перенесена туда без изменений (те же логи `pages_write_skipped`,
   `doc_field_clear_skipped`, `offload failed`); `doSyncToCloud` зовёт его с `mode: 'sync'`.
2. `forceSyncToCloud` зовёт тот же путь с `mode: 'force'`: страницы пишутся всегда (снимку не
   верим), при успехе в документ уходит `null`, при сбое страниц — список в документ как раньше;
   запертый ключ не пишется ни в страницы, ни в документ и не запоминается в снимке. Снимок после
   force — по плану (маркер «поле обнулено» для очищенных ключей, без запертых).
3. Самопочинка замка (`app/flashcard_pages_read_result.ts`): битый `flashcard_pages_write_lock_v1`
   читается как «заперто всё» (как раньше); `lock` перезаписывает его замком одного ключа,
   `unlock` (после подтверждённого чтения) — пустым набором (removeItem). Лог
   `[FLASHCARD-PAGES] write_lock lock_value_repaired key=… via=lock|unlock`, плюс
   `write_lock value_unparsable len=…`.
4. Логи `[LEGACY-V2-SYNC] force_sync key=… decision=pages|doc_fallback|locked|absent`,
   `force_sync pages_write_skipped key=… reason=pages_unconfirmed local_len=…`,
   `force_sync aborted reason=stale_generation …` — без uid и текста карточек.

**Проверка.** RED→GREEN: новый `tests/flashcards_force_sync_pages.test.ts` (11: force пишет
страницы и null; сбой страниц → документ; запертый ключ не пишется; испорченный замок чинится
unlock'ом и запись идёт; force не доверяет снимку; sync сохраняет 8H-2; смена аккаунта → null;
restore после force на «другом устройстве» читает страницы; встройка в cloud_sync) и 3 новых в
`tests/flashcard_pages_read_result.test.ts`. Структурные сторожа 8H-2/8J/7A/8H переведены на общий
путь. По одному: read_result 22/22, force_sync_pages 11/11, doc_field_clear 12/12,
restore_lock 13/13, legacy_sync_switch 39/39, cloud_pages_guard 9/9,
cloud_sync_nested_progress_write_contract 4/4. Мутации M1–M9 (документ получает forceData,
замок игнорируется, нет null, force верит снимку, снимок помнит запертый, unlock/lock без
починки, doSync в режиме force, сбой страниц выкидывается) — каждая красная, файлы восстановлены
байт-в-байт (sha256). Полная проверка типов — 0 ошибок. Независимое ревью — за координатором.

**Все вызывающие forceSyncToCloud:** один боевой вызов — `app/auth_provider.ts`
(`signOutAndWipeForAccountSwitchReserved`, перед стиранием локального при смене аккаунта/выходе);
остальное — комментарии там же и мок в `tests/auth_provider_behavior.test.ts`.

**Кто ещё пишет flashcards_v1 целиком в документ:** на клиенте больше никто — оба писателя
документа (`doSyncToCloud`, `forceSyncToCloud`) идут через `writeUserDocWithNestedProgress` и общий
путь; `bisectDenyingField` переписывает только уже собранный патч; `sync_probe` пишет одно поле.
На сервере: `functions/src/auth_merge.ts` `mergeUserProgress` копирует progress проигравшего
аккаунта в победителя целиком — если у проигравшего лежит непустой `flashcards_v1`, а у
победителя ключа нет, список попадёт в документ победителя (вне Scope, кандидат в отдельный пакет).

**Замечания.** `tests/cloud_sync_account_race_contract.test.ts` красный по `auth_provider.ts`
(чужие незакоммиченные правки, ожидает `withLocalStepDeadline`) — к 8K не относится.
`tests/admin_premium_delivery_contract.test.ts` ищет в forceSyncToCloud `firebaseAuthUidRow`,
которого нет и в HEAD — давно устаревший сторож. Остаточный риск самопочинки: если ключ в том же
проходе restore не читался (скрыт выключателем V2) и был заперт до порчи значения, unlock другого
ключа снимет и его замок — порча значения сама по себе крайне редка. Цена: force-синк теперь пишет
страницы (≈1 запись на страницу) при каждом переносе — событие редкое.
Бэкап исходников — `.tmp_pkg8k_backup/`. Git-операций не было.

### Доработка по ревью (C-1, C-2)

- **C-1 (потолок).** В `app/flashcards_cloud_upload.ts` добавлен `runForceFlashcardUpload({ uid, data,
  isCurrent, timeoutMs })`: общий путь в режиме force под таймером. `forceSyncToCloud` зовёт его с
  `timeoutMs: FORCE_SYNC_FIRESTORE_WRITE_MS` (35 с, тот же потолок, что у записи документа). Сработал →
  лог `[LEGACY-V2-SYNC] force_sync aborted reason=pages_timeout ms=… limit_ms=…`, затем
  `force_sync result=false reason=pages_timeout`, `return false`; документ не пишется. Начатая
  запись страниц может доехать в фоне (пишет текущий локальный список — безопасно); её поздний
  отказ ловится и логируется `force_sync late_upload_error`.
- **C-2 (замок = отказ).** Если в плане есть запертый ключ: лог `force_sync key=… decision=locked
  result=refuse` и `force_sync aborted reason=pages_locked keys=… result=refuse`, `return false`;
  список не пишется ни в страницы, ни в документ. Прочие отказы того же шага: `stale_generation`,
  `upload_error` (исключение выгрузки) — тоже `false` до записи документа.
- **auth_provider (только чтение).** `signOutAndWipeForAccountSwitchReserved`: при `false` от
  `forceSyncToCloud` вызывается `saveAccountSwitchEmergencyBackup('force_sync_failed_before_account_switch', …)`
  (копия всех локальных ключей аккаунта, `collectAccountLocalDataKeys`); не удалась копия →
  `{ ok:false, reason:'backup_failed' }`. Затем без `allowWipeWithoutSync` смена отменяется
  (`auth_signout_wipe_sync_failed_aborted`, `{ ok:false, reason:'sync_failed' }`), локальное не
  стирается. ⚠️ С `allowWipeWithoutSync: true` (кнопка «Сменить без сохранения» в
  `app/(tabs)/settings.tsx`, после явного подтверждения человека) после аварийной копии стирание
  продолжается — карточки под замком тогда живут только в аварийной копии; это прежний осознанный
  путь, 8K его не меняет.
- **Проверка.** `tests/flashcards_force_sync_pages.test.ts` 16/16: «запись страниц висит → отказ
  pages_timeout за < 1 с при потолке 40 мс», «запертый ключ → отказ pages_locked, страницы en не
  писались», ok-путь, upload_error, stale_generation; структурный сторож: в `forceSyncToCloud`
  потолок `FORCE_SYNC_FIRESTORE_WRITE_MS`, а ветка `if (!flashcardOutcome.ok)` возвращает `false`
  ДО `writeUserDocWithNestedProgress`. Сам `forceSyncToCloud` целиком в тестах не запускается
  (нужны Firestore, анонимный вход и проверка личности — таких тестов в репозитории нет); его
  поведение держит связка «поведенческие тесты runForceFlashcardUpload + сторож встройки».
  Мутации: потолок не срабатывает (C1a), force без потолка в cloud_sync (C1b), замок не
  отказывает (C2a), отказ возвращает true для замка (C2b) — все красные; восстановление
  байт-в-байт (sha256). Повторно по одному: legacy_sync_switch 39/39, restore_lock 13/13,
  doc_field_clear 12/12, cloud_pages_guard 9/9, read_result 22/22, nested_progress_write 4/4.
  Полная проверка типов — 0 ошибок.
