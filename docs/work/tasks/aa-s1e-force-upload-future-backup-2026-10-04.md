# Task packet: Account Authority 2.0 — этап S1e: силовой перенос перед сменой аккаунта не теряет локальную правку при «облачной из будущего»

Governance-ID: TG-A6B9C3190FFA
Governance-ID: TG-071B666F4A30
Status: Planned (после PM-289)
Owner: Claude session (Account Authority 2.0)

## Outcome
Находка ревью S1d (Important): `runForceFlashcardUpload` (app/flashcards_cloud_upload.ts, withPagesPreWrite) при `remoteFutureKept > 0` возвращает успех, локальная версия карточки в облако не уходит, а затем смена аккаунта стирает локальные данные. Если спешат часы ДРУГОГО устройства — теряется реально более свежая правка этого телефона (до S1d было так же). Вариант Б (ревью, безопасная сторона): перенос проходит, но локальные версии этих карточек кладутся в аварийную копию владельца (`account_switch_emergency_backup`, тот же механизм S2d) до стирания; лог с числом карточек; копия доливается обратно по существующим правилам (тот же владелец / псевдоним после merge).

## Scope
app/flashcards_cloud_upload.ts, app/flashcard_pages_read_result.ts (сигнал remoteFutureKept наружу из force-пути), app/cloud_sync.ts (только свои хунки на пути смены аккаунта), их тесты.

## Architecture / Security and privacy
Без новых данных; копия остаётся на устройстве у того же владельца.

## Architecture
Второго механизма копий нет. Локальные версии оставленных карточек кладутся в ключ аккаунта
`flashcards_force_future_kept_local_v1` (модуль app/flashcards_future_kept_stash.ts): он в инвентаре
аккаунта → попадает в ту же аварийную копию того же владельца и стирается вместе с аккаунтом. При
возврате копия доливает ключ (его нет после облачного restore), шаг входа возвращает версии в список
только если на телефоне всё ещё та самая облачная версия. Прежняя копия того же владельца — ключ
объединяется, а не затирается.

## Security and privacy
Данные не покидают устройство (ключ не в SYNC_KEYS); записи несут владельца, чужие не применяются.
Логи — только числа, без id, текста карточек и владельца.

## Technical debt
Нет нового долга; путь presync входа (успешная выгрузка без копии) — вопрос координатору в итоге.

## Verification
Тест: другой девайс со спешащими часами + смена аккаунта → локальная правка в копии, восстанавливается при возврате в аккаунт. Мутации, тайпчек, независимое ревью.

## Rollback
git revert.

## Плюс хвосты security-ревью PM-289 (0c3c4708f), 2026-10-04
- L-1: тест «после стирания при удалении аккаунта остался любой посторонний ключ (в т.ч. pending_shard_grants_*) → local_wipe_unverified, удаление не продолжается» (мутация ослабления verifyPostDeleteLocalWipe обязана упасть).
- L-2: `catch { return false; }` в verifyPostDeleteLocalWipe (app/auth_provider.ts ~798) — лог причины ([AUTH-DELETE] wipe_verify_failed + код), поведение (закрыто) не менять; устаревший комментарий в app/pearl_retire_d70.ts:148 («его открывает loadShardsFromCloud») — обновить.

## Итог исполнителя S1e (2026-10-04)

**Сделано (вариант Б, без второго механизма копий).**
- app/flashcard_pages_read_result.ts — слияние отдаёт пары «локальная / оставленная облачная»
  (`remoteFutureKeptPairs`, `remoteFutureKept` = их длина); решение pre-write несёт их наружу.
- app/flashcards_cloud_upload.ts — план force-выгрузки получил `remoteFutureKept` (группы по ключу
  списка) — только когда страницы реально записаны (при doc_fallback локальные версии и так в облаке).
- app/flashcards_future_kept_stash.ts (новый) — ключ аккаунта `flashcards_force_future_kept_local_v1`:
  запись (объединение, проверка чтением, false при сбое), объединение с прежней копией, применение
  при возврате (замена только поверх той самой облачной версии — по времени правки; правка после
  возврата, «уже своя», «карточки нет» → запись решена; чужой владелец — не применяется, хранится).
  Лог `[FLASHCARD-FUTURE-STASH]` — только числа.
- app/cloud_sync.ts (только свои хунки, чужие не тронуты):
  1. импорт после `} from './flashcards_cloud_upload';`;
  2. ключ в `accountLocalDataKeysForToday` после `FLASHCARD_PAGES_WRITE_FINGERPRINT_KEY,` (перед
     `'cloud_migration_v1',`) → копия + стирание;
  3. `forceSyncToCloud` после `const flashcardUpload = flashcardOutcome.plan;`: сохранение версий,
     сбой → `refuse('flashcards_upload_failed')` (лог `future_kept_stash_failed`);
  4. новая `readOwnAccountSwitchBackupValue` перед `export async function saveAccountSwitchEmergencyBackup(`;
  5. в `saveAccountSwitchEmergencyBackup` после блока `shelveOtherOwnerAccountSwitchBackup(...)` —
     `carriedFutureKeptStash` (только прежняя копия ТОГО ЖЕ владельца);
  6. цикл страниц: `for (const [key, liveValue] of rows)` + объединение значения ключа S1e.
- app/auth_provider.ts — `tryRestoreAccountSwitchBackup`: после доливания копии
  `applyFutureKeptStashAfterReturn(peekStableId())`; L-2: `verifyPostDeleteLocalWipe` catch пишет
  `[AUTH-DELETE] wipe_verify_failed code=…`, поведение (false) прежнее.
- app/pearl_retire_d70.ts — комментарий про журнал обновлён под PM-289.

**Тесты.** Новый tests/aa_s1e_force_future_kept_backup.test.ts — 12/12 (RED до правок: не
компилировался). auth_provider_behavior 110/110 (+4 L-1, L-2 в «unreadable post-wipe storage»).
Регресс: flashcard_pages_read_result 51, flashcard_pages_pre_write_merge 23, flashcard_pages_restore_lock 15,
flashcards_force_sync_pages 16, flashcard_pages_fingerprint_wipe 2, aa_s2d_presync_cloud_sync 15,
aa_s2d_backup_merge_alias 9, account_switch_backup_restore 22 — все зелёные. typecheck — 0 ошибок.
PM-229 probe — PASS (silentCatch=5, не поднят).

**Мутации — 11/11 убиты** (каждая: набор запустился, N failed из total; восстановление cmp с
.tmp_aa_s1e_backup/after/, финальная сверка всех 8 файлов — OK): пары из решения pre-write; условие
«страницы записаны»; правило замены по времени; перенос ключа из прежней копии; вызов сохранения в
forceSyncToCloud; ключ в инвентаре аккаунта; вызов применения при входе; ослабление
verifyPostDeleteLocalWipe (pending_shard_grants) — 4 failed; лог L-2; фильтр владельца; false при сбое записи.

**Вопросы координатору.**
1. Presync входа (успешная выгрузка гостя → свап и стирание БЕЗ копии): версии S1e гостя стираются.
   Это путь merge гостя в B; закрывать отдельно (копия + метка-псевдоним) или принять?
2. Записи чужого владельца (псевдоним merge A→B) не применяются и живут в ключе B до потолка 1000 —
   применять ли их по метке псевдонима?
3. После возврата следующий синк: пока облачная правка «из будущего», страницы её держат (S1d);
   когда часы догонят — облачная станет «новее» и заменит вернувшуюся локальную. Это правило S1d, не S1e.

**Что проверить ревьюеру.** Сбой записи ключа = отказ переноса (безопасная сторона, блокирует смену
только при отказе хранилища); копия прежнего владельца читается без проверки хешей (только чтение
одного ключа для объединения); применение — через очередь записи хука (replaceSavedFlashcardsFromAccountsV2).
